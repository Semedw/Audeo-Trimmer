import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

let ffmpeg: FFmpeg | null = null
let loadingPromise: Promise<FFmpeg> | null = null

export function getFFmpeg(): FFmpeg | null {
  return ffmpeg
}

export async function initFFmpeg(
  onLoadProgress?: (ratio: number) => void
): Promise<FFmpeg> {
  if (ffmpeg) return ffmpeg
  if (loadingPromise) return loadingPromise

  loadingPromise = (async () => {
    const instance = new FFmpeg()

    if (onLoadProgress) {
      instance.on('progress', ({ progress: ratio }) => {
        onLoadProgress(ratio)
      })
    } else {
      instance.on('progress', () => {})
    }

    const baseURL = '/ffmpeg'
    await instance.load({
      coreURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        'text/javascript'
      ),
      wasmURL: await toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        'application/wasm'
      ),
    })

    ffmpeg = instance
    return instance
  })()

  return loadingPromise
}

export function isFFmpegReady(): boolean {
  return ffmpeg !== null
}
