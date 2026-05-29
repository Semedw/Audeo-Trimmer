import { initFFmpeg } from './ffmpeg'
import { formatTimecode } from './timecode'
import type { RangeSeconds } from './ranges'

const VIDEO_CONTAINERS = new Set(['mp4', 'mov', 'mkv'])

function buildReencodeArgs(ext: string, hasVideo: boolean): string[] {
  if (hasVideo) {
    if (VIDEO_CONTAINERS.has(ext)) {
      return [
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-crf',
        '18',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
      ]
    }
    return [
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '20',
      '-c:a',
      'aac',
      '-b:a',
      '160k',
    ]
  }

  if (ext === 'wav') return ['-c:a', 'pcm_s16le']
  if (ext === 'mp3') return ['-c:a', 'libmp3lame', '-q:a', '2']
  return ['-c:a', 'aac', '-b:a', '192k']
}

function segmentName(index: number, ext: string): string {
  return `seg_${String(index).padStart(4, '0')}.${ext}`
}

export interface ProcessResult {
  blob: Blob
  mode: string
  filename: string
}

export async function processMedia(
  file: File,
  keepRanges: RangeSeconds[],
  outputExt: string,
  hasVideo: boolean,
  onProgress?: (phase: string, pct: number) => void
): Promise<ProcessResult> {
  const ffmpeg = await initFFmpeg()
  const inputName = `input.${outputExt}`

  onProgress?.('Reading file', 0)
  const buffer = new Uint8Array(await file.arrayBuffer())
  await ffmpeg.writeFile(inputName, buffer)

  const outputName = `output.${outputExt}`
  let mode = 'copy'

  const filesToCleanup = [inputName, outputName, 'concat.txt']
  for (let i = 0; i < keepRanges.length; i++) {
    filesToCleanup.push(segmentName(i, outputExt))
  }

  const cleanup = async () => {
    for (const f of filesToCleanup) {
      try {
        await ffmpeg.deleteFile(f)
      } catch {
        /* virtual FS may auto-clean */
      }
    }
  }

  try {
    if (keepRanges.length === 1) {
      const seg = keepRanges[0]
      onProgress?.('Processing', 10)
      try {
        await ffmpeg.exec([
          '-ss',
          formatTimecode(seg.start),
          '-to',
          formatTimecode(seg.end),
          '-i',
          inputName,
          '-c',
          'copy',
          outputName,
        ])
      } catch {
        mode = 'reencode'
        onProgress?.('Re-encoding', 50)
        await ffmpeg.exec([
          '-ss',
          formatTimecode(seg.start),
          '-to',
          formatTimecode(seg.end),
          '-i',
          inputName,
          ...buildReencodeArgs(outputExt, hasVideo),
          outputName,
        ])
      }
    } else {
      for (let i = 0; i < keepRanges.length; i++) {
        const seg = keepRanges[i]
        onProgress?.(
          'Extracting segments',
          Math.round((i / keepRanges.length) * 50)
        )
        await ffmpeg.exec([
          '-ss',
          formatTimecode(seg.start),
          '-to',
          formatTimecode(seg.end),
          '-i',
          inputName,
          '-c',
          'copy',
          segmentName(i, outputExt),
        ])
      }

      onProgress?.('Merging', 60)
      const concatList = keepRanges
        .map((_, i) => `file '${segmentName(i, outputExt)}'`)
        .join('\n')
      await ffmpeg.writeFile('concat.txt', concatList)

      try {
        await ffmpeg.exec([
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          'concat.txt',
          '-c',
          'copy',
          outputName,
        ])
      } catch {
        mode = 'reencode'
        onProgress?.('Re-encoding', 70)
        await ffmpeg.exec([
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          'concat.txt',
          ...buildReencodeArgs(outputExt, hasVideo),
          outputName,
        ])
      }
    }

    onProgress?.('Finalizing', 90)
    const data = (await ffmpeg.readFile(outputName)) as BlobPart
    const blob = new Blob([data], { type: 'application/octet-stream' })

    await cleanup()

    onProgress?.('Done', 100)
    return {
      blob,
      mode,
      filename: `trimmed.${outputExt}`,
    }
  } catch (err) {
    await cleanup()
    throw err
  }
}
