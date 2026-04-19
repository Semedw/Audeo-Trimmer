export const pad2 = (n: number): string => `${Math.floor(n)}`.padStart(2, '0')
export const pad3 = (n: number): string => `${Math.floor(n)}`.padStart(3, '0')

export function formatSeconds(value: number): string {
  const v = Number.isFinite(value) ? Math.max(0, value) : 0
  const h = Math.floor(v / 3600)
  const m = Math.floor((v % 3600) / 60)
  const s = v % 60
  if (h > 0) {
    return `${pad2(h)}:${pad2(m)}:${s.toFixed(2).padStart(5, '0')}`
  }
  return `${pad2(m)}:${s.toFixed(2).padStart(5, '0')}`
}

export function toBackendTime(value: number): string {
  const v = Number.isFinite(value) ? Math.max(0, value) : 0
  const h = Math.floor(v / 3600)
  const m = Math.floor((v % 3600) / 60)
  const s = (v % 60).toFixed(3).padStart(6, '0')
  return `${pad2(h)}:${pad2(m)}:${s}`
}

export function formatHhMmSsMmm(value: number): string {
  const v = Number.isFinite(value) ? Math.max(0, value) : 0
  const hours = Math.floor(v / 3600)
  const minutes = Math.floor((v % 3600) / 60)
  const seconds = Math.floor(v % 60)
  const milliseconds = Math.round((v - Math.floor(v)) * 1000)

  // Carry overflow when rounding creates 1000ms.
  const ms = milliseconds === 1000 ? 0 : milliseconds
  const secCarry = milliseconds === 1000 ? 1 : 0
  const secondsWithCarry = seconds + secCarry
  const minsCarry = secondsWithCarry >= 60 ? 1 : 0
  const finalSeconds = secondsWithCarry % 60
  const finalMinutesRaw = minutes + minsCarry
  const hoursCarry = finalMinutesRaw >= 60 ? 1 : 0
  const finalMinutes = finalMinutesRaw % 60
  const finalHours = hours + hoursCarry

  return `${pad2(finalHours)}:${pad2(finalMinutes)}:${pad2(finalSeconds)}.${pad3(ms)}`
}

export function parseHhMmSsMmm(raw: string): number | null {
  const value = raw.trim()
  const match = value.match(/^(\d{1,2}):([0-5]\d):([0-5]\d)\.(\d{3})$/)
  if (!match) return null

  const hours = Number(match[1])
  const minutes = Number(match[2])
  const seconds = Number(match[3])
  const milliseconds = Number(match[4])

  if ([hours, minutes, seconds, milliseconds].some((part) => Number.isNaN(part))) {
    return null
  }

  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000
}
