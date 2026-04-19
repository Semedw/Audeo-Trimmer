# Audeo Trimmer

A modern full-stack media trimmer that removes selected time ranges and automatically merges the remaining segments.

## Tech Stack

- **Backend:** FastAPI + FFmpeg (bundled via `imageio-ffmpeg` by default)
- **Frontend:** React + Vite + TypeScript + wavesurfer.js

## Project Structure

```text
backend/
  app/
    main.py
    config.py
    schemas.py
    services/
      media.py
      processing.py
    utils/
      timecode.py
      ranges.py
  storage/
    uploads/
    outputs/
    temp/
  requirements.txt

frontend/
  src/
    api/client.ts
    components/
      UploadDropzone.tsx
      TimelineEditor.tsx
      WaveformView.tsx
    hooks/useHistory.ts
    utils/time.ts
    types.ts
    App.tsx
    index.css
```

## Installation

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:8000`.

> Backend uses a bundled FFmpeg binary from `imageio-ffmpeg` unless `FFMPEG_BINARY` is set.

## API Usage

### Upload

`POST /upload` (multipart form-data: `file`)

Response:

```json
{
  "file_id": "abc123...",
  "original_filename": "sample.mp4",
  "stored_filename": "abc123....mp4",
  "extension": "mp4",
  "metadata": {
    "duration_seconds": 322.15,
    "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
    "size_bytes": 1024000,
    "has_video": true,
    "has_audio": true
  }
}
```

### Process

`POST /process`

```json
{
  "file_id": "abc123...",
  "trim_ranges": [
    { "start": "00:30", "end": "01:30" },
    { "start": "02:34", "end": "03:41" }
  ],
  "output_format": "mp4"
}
```

Behavior:

- remove selected ranges
- keep the complement
- merge kept segments into one output file
- prefer stream copy, fallback to re-encode only when needed

### Download

- `GET /download/{result_id}`
- or `GET /download?result_id=...`

## Implemented Features

- Drag-and-drop upload for mp4/mp3/wav/mov/mkv
- Clean light minimal UI theme
- Metadata view (duration, format, size)
- Visual timeline with green kept / red removed segments
- Multiple remove ranges (add/edit/delete)
- Manual range timestamp entry in `HH:MM:SS.mmm`
- Minimal fixed-scale timeline editor
- Undo/redo + keyboard shortcuts
- Audio waveform visualization
- Preview final output before download
- Output format selection (input format by default)
- Processing progress indicator
- Range validation and overlap merge
- Full-removal protection and clear API errors
