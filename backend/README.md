# Backend (FastAPI + FFmpeg)

## Prerequisites

- Python 3.11+
- Optional: system FFmpeg installed in PATH.
  - By default, backend dependencies include `imageio-ffmpeg`, which provides a bundled FFmpeg binary.
  - You can override with `FFMPEG_BINARY=/path/to/ffmpeg`.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API

- `POST /upload` (multipart form `file`)
- `POST /process` (JSON: `file_id`, `trim_ranges`, optional `output_format`)
- `GET /download/{result_id}` or `GET /download?result_id=...`
