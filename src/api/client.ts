import type { ProcessResult, TrimRange, UploadResult } from '../types'
import { normalizeRemoveRanges, complementRanges } from '../services/ranges'
import { processMedia as ffmpegProcess } from '../services/processing'
import { assertSupportedExtension, getMediaMetadata } from '../services/metadata'

export async function uploadFile(file: File): Promise<UploadResult> {
  const extension = assertSupportedExtension(file.name)
  const metadata = await getMediaMetadata(file)

  const fileId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Math.random().toString(16).slice(2)}-${Date.now()}`

  return {
    file_id: fileId,
    original_filename: file.name,
    stored_filename: `${fileId}.${extension}`,
    extension,
    metadata: {
      duration_seconds: metadata.duration,
      format_name: extension,
      size_bytes: file.size,
      has_video: metadata.hasVideo,
      has_audio: metadata.hasAudio,
    },
  }
}

export async function processMedia(
  file: File,
  ranges: TrimRange[],
  duration: number,
  hasVideo: boolean,
  outputFormat?: string,
  onProgress?: (phase: string, pct: number) => void
): Promise<ProcessResult & { blob: Blob }> {
  const ext = outputFormat || file.name.split('.').pop()?.toLowerCase() || 'mp4'

  const rawRanges = ranges.map((r) => ({
    start: r.start,
    end: r.end,
  }))

  const removedRanges = normalizeRemoveRanges(rawRanges, duration)

  const keptRanges = complementRanges(removedRanges, duration)
  if (keptRanges.length === 0) {
    throw new Error('All media would be removed. Adjust trim ranges.')
  }

  const result = await ffmpegProcess(file, keptRanges, ext, hasVideo, onProgress)

  return {
    result_id: file.name,
    output_filename: result.filename,
    output_format: ext,
    processing_mode: result.mode,
    removed_ranges: removedRanges.map((r) => ({
      start: r.start,
      end: r.end,
    })),
    kept_ranges: keptRanges.map((r) => ({
      start: r.start,
      end: r.end,
    })),
    blob: result.blob,
  }
}

export function downloadUrl(blob: Blob): string {
  return URL.createObjectURL(blob)
}
