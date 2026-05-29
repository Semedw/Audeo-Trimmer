import { useRef, useState } from 'react'

const ACCEPTED = '.mp4,.mp3,.wav,.mov,.mkv'

type Props = {
  disabled?: boolean
  onFileSelect: (file: File) => void
}

export function UploadDropzone({ disabled, onFileSelect }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const pick = (file?: File | null) => {
    if (!file || disabled) return
    onFileSelect(file)
  }

  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''} ${disabled ? 'disabled' : ''}`}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        pick(event.dataTransfer.files?.[0])
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          inputRef.current?.click()
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        onChange={(event) => pick(event.target.files?.[0])}
        hidden
      />
      <p className="dropzone-title">Drop audio/video here</p>
      <p className="dropzone-subtitle">or click to choose (mp4, mp3, wav, mov, mkv)</p>
    </div>
  )
}
