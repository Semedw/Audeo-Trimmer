from __future__ import annotations

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOADS_DIR = STORAGE_DIR / "uploads"
OUTPUTS_DIR = STORAGE_DIR / "outputs"
TEMP_DIR = STORAGE_DIR / "temp"

ALLOWED_EXTENSIONS = {"mp4", "mp3", "wav", "mov", "mkv"}


def ensure_storage_dirs() -> None:
    for path in (UPLOADS_DIR, OUTPUTS_DIR, TEMP_DIR):
        path.mkdir(parents=True, exist_ok=True)
