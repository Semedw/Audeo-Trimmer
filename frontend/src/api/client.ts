import type { ProcessResult, TrimRange, UploadResult } from '../types'
import { toBackendTime } from '../utils/time'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export async function uploadFile(file: File): Promise<UploadResult> {
  const body = new FormData()
  body.append('file', file)

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body
  })

  if (!response.ok) {
    throw new Error((await response.json()).detail ?? 'Upload failed')
  }

  return (await response.json()) as UploadResult
}

export async function processMedia(
  fileId: string,
  ranges: TrimRange[],
  outputFormat?: string
): Promise<ProcessResult> {
  const response = await fetch(`${API_BASE}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      file_id: fileId,
      trim_ranges: ranges.map((range) => ({
        start: toBackendTime(range.start),
        end: toBackendTime(range.end)
      })),
      output_format: outputFormat || undefined
    })
  })

  if (!response.ok) {
    throw new Error((await response.json()).detail ?? 'Processing failed')
  }

  return (await response.json()) as ProcessResult
}

export function downloadUrl(resultId: string): string {
  return `${API_BASE}/download/${resultId}`
}
