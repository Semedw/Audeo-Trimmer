export interface RangeSeconds {
  start: number
  end: number
}

export function normalizeRemoveRanges(
  rawRanges: Array<{ start: number; end: number }>,
  duration: number
): RangeSeconds[] {
  const parsed: RangeSeconds[] = []
  for (const item of rawRanges) {
    if (item.end <= item.start) {
      throw new Error(
        `Range end must be greater than start (${item.start} - ${item.end})`
      )
    }
    if (item.start >= duration) continue
    parsed.push({
      start: Math.max(0, item.start),
      end: Math.min(duration, item.end),
    })
  }

  if (parsed.length === 0) return []

  parsed.sort((a, b) => a.start - b.start)
  const merged: RangeSeconds[] = [parsed[0]]
  for (let i = 1; i < parsed.length; i++) {
    const current = parsed[i]
    const last = merged[merged.length - 1]
    if (current.start <= last.end) {
      last.end = Math.max(last.end, current.end)
    } else {
      merged.push(current)
    }
  }
  return merged
}

export function complementRanges(
  removeRanges: RangeSeconds[],
  duration: number
): RangeSeconds[] {
  if (duration <= 0) return []
  if (removeRanges.length === 0) return [{ start: 0, end: duration }]

  const keep: RangeSeconds[] = []
  let cursor = 0
  for (const removed of removeRanges) {
    if (removed.start > cursor) {
      keep.push({ start: cursor, end: removed.start })
    }
    cursor = Math.max(cursor, removed.end)
  }
  if (cursor < duration) {
    keep.push({ start: cursor, end: duration })
  }
  return keep.filter((seg) => seg.end - seg.start >= 0.02)
}
