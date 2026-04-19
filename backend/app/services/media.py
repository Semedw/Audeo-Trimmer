from __future__ import annotations

import re
import subprocess
from pathlib import Path

from app.config import ALLOWED_EXTENSIONS
from app.services.ffmpeg_runtime import ffmpeg_executable

DURATION_RE = re.compile(
    r"Duration:\s(?P<h>\d{2}):(?P<m>\d{2}):(?P<s>\d{2}(?:\.\d+)?)"
)
INPUT_RE = re.compile(r"Input #0,\s(?P<fmt>[^,]+(?:,[^,]+)*),\sfrom\s")


def assert_supported_extension(filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file extension: {ext or 'none'}. Allowed: {sorted(ALLOWED_EXTENSIONS)}"
        )
    return ext


def ffprobe_metadata(path: Path) -> dict:
    completed = subprocess.run(
        [ffmpeg_executable(), "-hide_banner", "-i", str(path)],
        check=False,
        capture_output=True,
        text=True,
    )
    output = (completed.stderr or "") + "\n" + (completed.stdout or "")

    duration_match = DURATION_RE.search(output)
    duration = 0.0
    if duration_match:
        hours = int(duration_match.group("h"))
        minutes = int(duration_match.group("m"))
        seconds = float(duration_match.group("s"))
        duration = hours * 3600 + minutes * 60 + seconds

    format_match = INPUT_RE.search(output)
    format_name = format_match.group("fmt") if format_match else "unknown"

    has_video = " Video:" in output
    has_audio = " Audio:" in output
    streams: list[dict[str, str]] = []
    if has_video:
        streams.append({"codec_type": "video"})
    if has_audio:
        streams.append({"codec_type": "audio"})

    return {
        "duration_seconds": round(duration, 3),
        "format_name": format_name,
        "size_bytes": path.stat().st_size,
        "has_video": has_video,
        "has_audio": has_audio,
        "streams": streams,
    }
