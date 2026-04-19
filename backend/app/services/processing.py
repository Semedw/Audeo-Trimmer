from __future__ import annotations

import shutil
import subprocess
import uuid
from pathlib import Path

from app.config import OUTPUTS_DIR, TEMP_DIR
from app.services.ffmpeg_runtime import ffmpeg_executable
from app.utils.ranges import RangeSeconds
from app.utils.timecode import format_timecode

VIDEO_CONTAINERS = {"mp4", "mov", "mkv"}


def _run_ffmpeg(args: list[str]) -> None:
    subprocess.run(
        [ffmpeg_executable(), "-hide_banner", "-loglevel", "error", "-y", *args],
        check=True,
        capture_output=True,
        text=True,
    )


def _segment_filename(index: int, ext: str) -> str:
    return f"segment_{index:04d}.{ext}"


def _build_reencode_args(ext: str, has_video: bool) -> list[str]:
    if has_video:
        if ext in VIDEO_CONTAINERS:
            return ["-c:v", "libx264", "-preset", "fast", "-crf", "18", "-c:a", "aac", "-b:a", "192k"]
        return ["-c:v", "libx264", "-preset", "fast", "-crf", "20", "-c:a", "aac", "-b:a", "160k"]

    if ext == "wav":
        return ["-c:a", "pcm_s16le"]
    if ext == "mp3":
        return ["-c:a", "libmp3lame", "-q:a", "2"]
    return ["-c:a", "aac", "-b:a", "192k"]


def _extract_segments(
    source_file: Path,
    keep_ranges: list[RangeSeconds],
    ext: str,
    work_dir: Path,
) -> list[Path]:
    segment_paths: list[Path] = []
    for index, segment in enumerate(keep_ranges):
        segment_path = work_dir / _segment_filename(index, ext)
        _run_ffmpeg(
            [
                "-ss",
                format_timecode(segment.start),
                "-to",
                format_timecode(segment.end),
                "-i",
                str(source_file),
                "-c",
                "copy",
                str(segment_path),
            ]
        )
        segment_paths.append(segment_path)
    return segment_paths


def _concat_segments(
    segment_paths: list[Path],
    output_path: Path,
    ext: str,
    has_video: bool,
    work_dir: Path,
) -> str:
    list_file = work_dir / "concat_list.txt"
    list_file.write_text(
        "\n".join(f"file '{path.as_posix()}'" for path in segment_paths),
        encoding="utf-8",
    )

    mode = "copy"
    try:
        _run_ffmpeg(
            [
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_file),
                "-c",
                "copy",
                str(output_path),
            ]
        )
    except subprocess.CalledProcessError:
        mode = "reencode"
        _run_ffmpeg(
            [
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                str(list_file),
                *_build_reencode_args(ext, has_video),
                str(output_path),
            ]
        )
    return mode


def process_media(
    *,
    source_file: Path,
    keep_ranges: list[RangeSeconds],
    output_ext: str,
    has_video: bool,
) -> dict:
    result_id = uuid.uuid4().hex
    output_path = OUTPUTS_DIR / f"{result_id}.{output_ext}"
    work_dir = TEMP_DIR / result_id
    work_dir.mkdir(parents=True, exist_ok=True)

    try:
        if len(keep_ranges) == 1:
            segment = keep_ranges[0]
            mode = "copy"
            try:
                _run_ffmpeg(
                    [
                        "-ss",
                        format_timecode(segment.start),
                        "-to",
                        format_timecode(segment.end),
                        "-i",
                        str(source_file),
                        "-c",
                        "copy",
                        str(output_path),
                    ]
                )
            except subprocess.CalledProcessError:
                mode = "reencode"
                _run_ffmpeg(
                    [
                        "-ss",
                        format_timecode(segment.start),
                        "-to",
                        format_timecode(segment.end),
                        "-i",
                        str(source_file),
                        *_build_reencode_args(output_ext, has_video),
                        str(output_path),
                    ]
                )
            return {"result_id": result_id, "filename": output_path.name, "mode": mode}

        segments = _extract_segments(source_file, keep_ranges, output_ext, work_dir)
        mode = _concat_segments(segments, output_path, output_ext, has_video, work_dir)
        return {"result_id": result_id, "filename": output_path.name, "mode": mode}
    finally:
        shutil.rmtree(work_dir, ignore_errors=True)
