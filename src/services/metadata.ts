const ALLOWED_EXTENSIONS = new Set(['mp4', 'mp3', 'wav', 'mov', 'mkv'])

export interface MediaMetadata {
  duration: number
  hasVideo: boolean
  hasAudio: boolean
}

export function assertSupportedExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Unsupported file extension: ${ext || 'none'}. Allowed: ${[...ALLOWED_EXTENSIONS].sort().join(', ')}`
    )
  }
  return ext
}

export function getMediaMetadata(file: File): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)

    const video = document.createElement('video')
    video.preload = 'metadata'

    const onVideoMeta = () => {
      const hasVideo = video.videoWidth > 0 && video.videoHeight > 0
      let hasAudio = true

      if (hasVideo) {
        if ('audioTracks' in video && video.audioTracks) {
          hasAudio = (video.audioTracks as unknown as { length: number }).length > 0
        } else if ('mozHasAudio' in video) {
          hasAudio = Boolean((video as HTMLVideoElement & { mozHasAudio: boolean }).mozHasAudio)
        } else if ('webkitAudioDecodedByteCount' in video) {
          hasAudio =
            (video as HTMLVideoElement & { webkitAudioDecodedByteCount: number })
              .webkitAudioDecodedByteCount > 0
        }
      }

      URL.revokeObjectURL(url)
      video.remove()

      const duration = Number.isFinite(video.duration) ? video.duration : 0

      if (duration <= 0 && !hasVideo) {
        const msg = 'Unable to determine media duration. The file may be unsupported.'
        reject(new Error(msg))
        return
      }

      resolve({ duration, hasVideo, hasAudio })
    }

    const onError = () => {
      URL.revokeObjectURL(url)
      video.remove()

      const audio = document.createElement('audio')
      audio.preload = 'metadata'
      const audioUrl = URL.createObjectURL(file)

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(audioUrl)
        audio.remove()
        const duration = Number.isFinite(audio.duration) ? audio.duration : 0
        if (duration <= 0) {
          reject(new Error('Unable to determine audio duration. The file may be unsupported.'))
          return
        }
        resolve({ duration, hasVideo: false, hasAudio: true })
      }

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl)
        audio.remove()
        reject(new Error('Unable to read media file. It may be corrupted or unsupported.'))
      }

      audio.src = audioUrl
    }

    video.onloadedmetadata = onVideoMeta
    video.onerror = onError
    video.src = url
  })
}
