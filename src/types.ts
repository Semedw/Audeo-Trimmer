export type MediaKind = 'audio' | 'video'

export type TrimRange = {
  id: string
  start: number
  end: number
}

export type UploadMetadata = {
  duration_seconds: number
  format_name: string
  size_bytes: number
  has_video: boolean
  has_audio: boolean
}

export type UploadResult = {
  file_id: string
  original_filename: string
  stored_filename: string
  extension: string
  metadata: UploadMetadata
}

export type ProcessResult = {
  result_id: string
  output_filename: string
  output_format: string
  processing_mode: string
  removed_ranges: Array<{ start: number; end: number }>
  kept_ranges: Array<{ start: number; end: number }>
}
