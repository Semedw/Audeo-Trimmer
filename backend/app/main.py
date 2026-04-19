from __future__ import annotations

import shutil
import uuid
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import ALLOWED_EXTENSIONS, OUTPUTS_DIR, UPLOADS_DIR, ensure_storage_dirs
from app.schemas import ProcessRequest, ProcessResponse, UploadResponse
from app.services.media import assert_supported_extension, ffprobe_metadata
from app.services.processing import process_media
from app.utils.ranges import complement_ranges, normalize_remove_ranges

app = FastAPI(title="Audeo Trimmer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ensure_storage_dirs()


def _input_file_path(file_id: str) -> Path:
    matches = list(UPLOADS_DIR.glob(f"{file_id}.*"))
    if not matches:
        raise HTTPException(status_code=404, detail="Uploaded file not found")
    return matches[0]


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/upload", response_model=UploadResponse)
async def upload(file: UploadFile = File(...)) -> UploadResponse:
    if not file.filename:
        raise HTTPException(status_code=400, detail="File name is required")

    try:
        extension = assert_supported_extension(file.filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    file_id = uuid.uuid4().hex
    stored_filename = f"{file_id}.{extension}"
    destination = UPLOADS_DIR / stored_filename

    with destination.open("wb") as handle:
        shutil.copyfileobj(file.file, handle)

    try:
        metadata = ffprobe_metadata(destination)
    except Exception as exc:  # noqa: BLE001
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=(
                "Failed to read media metadata. Ensure FFmpeg is available or install backend "
                "dependencies (imageio-ffmpeg provides a bundled binary). "
                f"Error: {exc}"
            ),
        ) from exc

    return UploadResponse(
        file_id=file_id,
        original_filename=file.filename,
        stored_filename=stored_filename,
        extension=extension,
        metadata=metadata,
    )


@app.post("/process", response_model=ProcessResponse)
def process(request: ProcessRequest) -> ProcessResponse:
    source_file = _input_file_path(request.file_id)
    source_extension = source_file.suffix.replace(".", "").lower()

    output_format = (request.output_format or source_extension).lower()
    if output_format not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported output format: {output_format}. Allowed: {sorted(ALLOWED_EXTENSIONS)}",
        )

    try:
        metadata = ffprobe_metadata(source_file)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=400, detail=f"Unable to inspect source media: {exc}") from exc

    duration = float(metadata.get("duration_seconds") or 0)
    if duration <= 0:
        raise HTTPException(status_code=400, detail="Source media duration is invalid")

    raw_ranges = [item.model_dump() for item in request.trim_ranges]
    try:
        removed_ranges = normalize_remove_ranges(raw_ranges, duration)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    kept_ranges = complement_ranges(removed_ranges, duration)
    if not kept_ranges:
        raise HTTPException(status_code=400, detail="All media would be removed. Adjust trim ranges.")

    try:
        output = process_media(
            source_file=source_file,
            keep_ranges=kept_ranges,
            output_ext=output_format,
            has_video=bool(metadata.get("has_video")),
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=f"Media processing failed: {exc}") from exc

    return ProcessResponse(
        result_id=output["result_id"],
        output_filename=output["filename"],
        output_format=output_format,
        processing_mode=output["mode"],
        removed_ranges=[{"start": r.start, "end": r.end} for r in removed_ranges],
        kept_ranges=[{"start": r.start, "end": r.end} for r in kept_ranges],
    )


@app.get("/download")
def download(result_id: str = Query(..., description="Result ID from /process")) -> FileResponse:
    candidates = [path for ext in ALLOWED_EXTENSIONS for path in OUTPUTS_DIR.glob(f"{result_id}.{ext}")]
    if not candidates:
        raise HTTPException(status_code=404, detail="Output file not found")
    file_path = candidates[0]
    return FileResponse(path=file_path, filename=file_path.name, media_type="application/octet-stream")


@app.get("/download/{result_id}")
def download_by_path(result_id: str) -> FileResponse:
    return download(result_id=result_id)
