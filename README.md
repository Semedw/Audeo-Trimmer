# Audeo Trimmer

A browser-based media trimmer that removes selected time ranges and automatically merges the remaining segments. All processing happens locally — no server needed.

## Tech Stack

- **Frontend:** React + Vite + TypeScript + wavesurfer.js
- **Media processing:** ffmpeg.wasm (WebAssembly FFmpeg in the browser)

## Project Structure

```text
src/
  api/client.ts
  components/
    UploadDropzone.tsx
    TimelineEditor.tsx
    WaveformView.tsx
  hooks/useHistory.ts
  services/
    ffmpeg.ts
    metadata.ts
    processing.ts
    ranges.ts
    timecode.ts
  utils/time.ts
  types.ts
  App.tsx
  index.css
```

## Installation

```bash
npm install
npm run dev
```

Runs on `http://localhost:5173`.

## How It Works

1. Upload an audio/video file (mp4, mp3, wav, mov, mkv)
2. Mark time ranges to **remove** on the timeline
3. Click "Process & Merge" — ffmpeg.wasm cuts out the marked ranges and concatenates remaining segments
4. Preview and download the result

All processing uses `-c copy` (lossless, fast). Falls back to re-encode only when stream copy fails.

## Deploy

Push to Vercel — auto-detected as Vite. Zero config needed.

## Keyboard Shortcuts

- `A`: add remove-range at current playhead
- `Ctrl/Cmd + Z`: undo
- `Ctrl/Cmd + Shift + Z` or `Ctrl/Cmd + Y`: redo

## Range Format

Manual range input uses `HH:MM:SS.mmm` (example: `00:02:34.125`).


The URL: https://audeo-trimmer.vercel.app/
