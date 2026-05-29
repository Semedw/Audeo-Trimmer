import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'

type Props = {
  sourceUrl?: string
}

export function WaveformView({ sourceUrl }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const waveRef = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    if (!containerRef.current || !sourceUrl) return
    waveRef.current?.destroy()
    const wave = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#4f46e5',
      progressColor: '#22c55e',
      cursorColor: '#0f172a',
      barWidth: 2,
      barGap: 1,
      height: 84
    })
    wave.load(sourceUrl)
    waveRef.current = wave
    return () => wave.destroy()
  }, [sourceUrl])

  return <div className="waveform" ref={containerRef} />
}
