import { useState } from 'react'
import type { TrimRange } from '../types'
import { formatHhMmSsMmm, formatSeconds, parseHhMmSsMmm } from '../utils/time'

type Props = {
  duration: number
  ranges: TrimRange[]
  onAddRange: () => void
  onUpdate: (id: string, key: 'start' | 'end', value: number) => void
  onDelete: (id: string) => void
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max)

type TimestampInputProps = {
  valueSeconds: number
  onCommit: (valueSeconds: number) => void
}

function TimestampInput({ valueSeconds, onCommit }: TimestampInputProps) {
  const [text, setText] = useState(formatHhMmSsMmm(valueSeconds))

  const commit = () => {
    const parsed = parseHhMmSsMmm(text)
    if (parsed === null) {
      setText(formatHhMmSsMmm(valueSeconds))
      return
    }
    onCommit(parsed)
  }

  return (
    <input
      className="timestamp-input"
      type="text"
      inputMode="numeric"
      value={text}
      placeholder="HH:MM:SS.mmm"
      onChange={(event) => setText(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          commit()
        }
      }}
    />
  )
}

export function TimelineEditor({
  duration,
  ranges,
  onAddRange,
  onUpdate,
  onDelete
}: Props) {
  const safeDuration = Math.max(duration, 1)
  const sorted = [...ranges].sort((a, b) => a.start - b.start)
  const kept: Array<{ start: number; end: number }> = []
  let cursor = 0
  for (const range of sorted) {
    if (range.start > cursor) kept.push({ start: cursor, end: range.start })
    cursor = Math.max(cursor, range.end)
  }
  if (cursor < safeDuration) kept.push({ start: cursor, end: safeDuration })

  return (
    <section className="panel">
      <div className="panel-header">
        <h3>Timeline Editor</h3>
        <button onClick={onAddRange}>Add remove range</button>
      </div>

      <div className="timeline">
        {kept.map((item, index) => (
          <div
            key={`keep-${index}`}
            className="segment keep"
            style={{
              left: `${(item.start / safeDuration) * 100}%`,
              width: `${((item.end - item.start) / safeDuration) * 100}%`
            }}
          />
        ))}
        {ranges.map((item) => (
          <div
            key={item.id}
            className="segment remove"
            style={{
              left: `${(item.start / safeDuration) * 100}%`,
              width: `${((item.end - item.start) / safeDuration) * 100}%`
            }}
          />
        ))}
      </div>

      <div className="ranges">
        {ranges.length === 0 && <p className="muted">No remove ranges yet.</p>}
        {ranges.map((range, index) => (
          <div className="range-row" key={range.id}>
            <strong>#{index + 1}</strong>
            <label>
              Start
              <TimestampInput
                key={`${range.id}-start-${range.start}`}
                valueSeconds={range.start}
                onCommit={(next) =>
                  onUpdate(range.id, 'start', clamp(next, 0, Math.max(0, range.end - 0.01)))
                }
              />
            </label>
            <label>
              End
              <TimestampInput
                key={`${range.id}-end-${range.end}`}
                valueSeconds={range.end}
                onCommit={(next) =>
                  onUpdate(range.id, 'end', clamp(next, range.start + 0.01, safeDuration))
                }
              />
            </label>
            <span className="range-time">
              {formatSeconds(range.start)} – {formatSeconds(range.end)}
            </span>
            <button className="danger" onClick={() => onDelete(range.id)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
