const TIME_RE =
  /^(?:(?<h>\d{1,2}):)?(?<m>[0-5]?\d):(?<s>[0-5]?\d(?:\.\d{1,3})?)$/

export function parseTimecode(raw: string): number {
  const value = raw.trim()
  const match = value.match(TIME_RE)
  if (!match || !match.groups) {
    throw new Error(`Invalid time format: ${raw}`)
  }
  const hours = parseInt(match.groups.h || '0', 10)
  const minutes = parseInt(match.groups.m, 10)
  const seconds = parseFloat(match.groups.s)
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000) / 1000
}

export function formatTimecode(totalSeconds: number): string {
  const t = Math.max(0, totalSeconds)
  const hours = Math.floor(t / 3600)
  const minutes = Math.floor((t % 3600) / 60)
  const seconds = t % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${seconds.toFixed(3).padStart(6, '0')}`
}
