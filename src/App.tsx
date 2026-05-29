import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { downloadUrl, processMedia, uploadFile } from './api/client'
import { TimelineEditor } from './components/TimelineEditor'
import { UploadDropzone } from './components/UploadDropzone'
import { WaveformView } from './components/WaveformView'
import { useHistory } from './hooks/useHistory'
import { isFFmpegReady, initFFmpeg } from './services/ffmpeg'
import type { MediaKind, ProcessResult, TrimRange, UploadResult } from './types'
import { formatSeconds } from './utils/time'

const OUTPUT_FORMATS = ['mp4', 'mp3', 'wav', 'mov', 'mkv']

function randomId() {
  return `${Math.random().toString(16).slice(2)}-${Date.now()}`
}

function App() {
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [upload, setUpload] = useState<UploadResult | null>(null)
  const [result, setResult] = useState<ProcessResult | null>(null)
  const [resultBlob, setResultBlob] = useState<Blob | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusText, setStatusText] = useState('')
  const [error, setError] = useState<string>()
  const [outputFormat, setOutputFormat] = useState<string>('')
  const [ffmpegLoading, setFFmpegLoading] = useState(!isFFmpegReady())
  const rangesHistory = useHistory<TrimRange[]>([])
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const duration = upload?.metadata.duration_seconds ?? 0
  const sourceUrl = useMemo(
    () => (sourceFile ? URL.createObjectURL(sourceFile) : undefined),
    [sourceFile]
  )
  const mediaKind: MediaKind | undefined = upload
    ? upload.metadata.has_video
      ? 'video'
      : 'audio'
    : undefined

  const resultUrl = useMemo(
    () => (resultBlob ? downloadUrl(resultBlob) : undefined),
    [resultBlob]
  )

  useEffect(() => {
    if (ffmpegLoading) {
      initFFmpeg()
        .then(() => setFFmpegLoading(false))
        .catch(() => {
          setError('Failed to load media processor. Check your connection and reload.')
          setFFmpegLoading(false)
        })
    }
  }, [ffmpegLoading])

  const addRange = useCallback(() => {
    if (!duration) return
    const player = videoRef.current ?? audioRef.current
    const start = Math.max(0, Math.min(duration - 1, player?.currentTime ?? 0))
    const end = Math.min(duration, start + 5)
    rangesHistory.set((current) => [...current, { id: randomId(), start, end }])
  }, [duration, rangesHistory])

  useEffect(() => {
    const keyHandler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) rangesHistory.redo()
        else rangesHistory.undo()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        rangesHistory.redo()
      }
      if (event.key.toLowerCase() === 'a' && duration > 0) {
        event.preventDefault()
        addRange()
      }
    }
    window.addEventListener('keydown', keyHandler)
    return () => window.removeEventListener('keydown', keyHandler)
  }, [addRange, duration, rangesHistory])

  useEffect(() => {
    return () => {
      if (sourceUrl) URL.revokeObjectURL(sourceUrl)
      if (resultUrl) URL.revokeObjectURL(resultUrl)
    }
  }, [sourceUrl, resultUrl])

  const onUpload = async (file: File) => {
    setError(undefined)
    setResult(null)
    setResultBlob(null)
    setUpload(null)
    rangesHistory.set([])
    setSourceFile(file)

    try {
      const uploaded = await uploadFile(file)
      setUpload(uploaded)
      setOutputFormat(uploaded.extension)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload failed')
    }
  }

  const updateRange = (id: string, key: 'start' | 'end', value: number) => {
    rangesHistory.set((current) =>
      current.map((item) => (item.id === id ? { ...item, [key]: value } : item))
    )
  }

  const removeRange = (id: string) => {
    rangesHistory.set((current) => current.filter((item) => item.id !== id))
  }

  const sortedRanges = useMemo(
    () => [...rangesHistory.value].sort((a, b) => a.start - b.start),
    [rangesHistory.value]
  )

  const process = async () => {
    if (!upload || !sourceFile) return
    setError(undefined)
    setResult(null)
    setResultBlob(null)
    setProcessing(true)
    setProgress(0)
    setStatusText('Starting...')

    try {
      const processed = await processMedia(
        sourceFile,
        sortedRanges,
        upload.metadata.duration_seconds,
        upload.metadata.has_video,
        outputFormat || undefined,
        (phase, pct) => {
          setStatusText(phase)
          setProgress(pct)
        }
      )
      setResult({
        result_id: processed.result_id,
        output_filename: processed.output_filename,
        output_format: processed.output_format,
        processing_mode: processed.processing_mode,
        removed_ranges: processed.removed_ranges,
        kept_ranges: processed.kept_ranges,
      })
      setResultBlob(processed.blob)
      setProgress(100)
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : 'Processing failed')
    } finally {
      window.setTimeout(() => {
        setProgress(0)
        setStatusText('')
      }, 1000)
      setProcessing(false)
    }
  }

  return (
    <main className="app">
      <header className="hero">
        <h1>Audeo Trimmer</h1>
        <p>Upload media, mark segments to remove, and export one clean merged file.</p>
      </header>

      {ffmpegLoading && (
        <section className="panel">
          <p>Loading media processor&hellip;</p>
        </section>
      )}

      <UploadDropzone disabled={processing || ffmpegLoading} onFileSelect={onUpload} />

      {upload && (
        <section className="panel meta-grid">
          <div>
            <span>File</span>
            <strong>{upload.original_filename}</strong>
          </div>
          <div>
            <span>Duration</span>
            <strong>{formatSeconds(upload.metadata.duration_seconds)}</strong>
          </div>
          <div>
            <span>Format</span>
            <strong>{upload.extension.toUpperCase()}</strong>
          </div>
          <div>
            <span>Size</span>
            <strong>{(upload.metadata.size_bytes / (1024 * 1024)).toFixed(2)} MB</strong>
          </div>
        </section>
      )}

      {sourceUrl && mediaKind === 'audio' && <WaveformView sourceUrl={sourceUrl} />}

      {sourceUrl && mediaKind === 'video' && (
        <section className="panel">
          <video ref={videoRef} src={sourceUrl} controls />
        </section>
      )}
      {sourceUrl && mediaKind === 'audio' && (
        <section className="panel">
          <audio ref={audioRef} src={sourceUrl} controls />
        </section>
      )}

      {upload && (
        <TimelineEditor
          duration={duration}
          ranges={rangesHistory.value}
          onAddRange={addRange}
          onUpdate={updateRange}
          onDelete={removeRange}
        />
      )}

      {upload && (
        <section className="panel controls">
          <div className="row gap-sm">
            <button onClick={rangesHistory.undo} disabled={!rangesHistory.canUndo}>
              Undo
            </button>
            <button onClick={rangesHistory.redo} disabled={!rangesHistory.canRedo}>
              Redo
            </button>
          </div>
          <div className="row gap-sm">
            <label>
              Output format
              <select
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value)}
              >
                {OUTPUT_FORMATS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            <button onClick={process} disabled={processing || ffmpegLoading}>
              {processing ? 'Processing...' : 'Process & Merge'}
            </button>
          </div>
          {progress > 0 && (
            <div className="progress">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
          {statusText && <p className="muted">{statusText}</p>}
        </section>
      )}

      {result && resultUrl && (
        <section className="panel">
          <h3>Preview & Export</h3>
          {mediaKind === 'video' ? (
            <video src={resultUrl} controls />
          ) : (
            <audio src={resultUrl} controls />
          )}
          <div className="row gap-sm">
            <a className="button-link" href={resultUrl} download={result.output_filename}>
              Download {result.output_filename}
            </a>
            <span className="badge">{result.processing_mode.toUpperCase()}</span>
          </div>
        </section>
      )}

      {error && <p className="error">{error}</p>}

      <footer className="footer">
        Format: <kbd>HH:MM:SS.mmm</kbd>. Shortcuts: <kbd>A</kbd> add range,{' '}
        <kbd>Ctrl/Cmd+Z</kbd> undo, <kbd>Ctrl/Cmd+Shift+Z</kbd> redo
      </footer>
    </main>
  )
}

export default App
