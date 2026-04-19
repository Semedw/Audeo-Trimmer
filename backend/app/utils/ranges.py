from __future__ import annotations

from dataclasses import dataclass

from app.utils.timecode import parse_timecode


@dataclass(frozen=True)
class RangeSeconds:
    start: float
    end: float


def normalize_remove_ranges(
    raw_ranges: list[dict[str, str]], duration: float
) -> list[RangeSeconds]:
    parsed: list[RangeSeconds] = []
    for item in raw_ranges:
        start = parse_timecode(item["start"])
        end = parse_timecode(item["end"])
        if end <= start:
            raise ValueError(f"Range end must be greater than start ({item})")
        if start >= duration:
            continue
        parsed.append(RangeSeconds(start=max(0.0, start), end=min(duration, end)))

    if not parsed:
        return []

    parsed.sort(key=lambda r: r.start)
    merged: list[RangeSeconds] = [parsed[0]]
    for current in parsed[1:]:
        last = merged[-1]
        if current.start <= last.end:
            merged[-1] = RangeSeconds(last.start, max(last.end, current.end))
        else:
            merged.append(current)
    return merged


def complement_ranges(
    remove_ranges: list[RangeSeconds], duration: float
) -> list[RangeSeconds]:
    if duration <= 0:
        return []
    if not remove_ranges:
        return [RangeSeconds(0.0, duration)]

    keep: list[RangeSeconds] = []
    cursor = 0.0
    for removed in remove_ranges:
        if removed.start > cursor:
            keep.append(RangeSeconds(cursor, removed.start))
        cursor = max(cursor, removed.end)
    if cursor < duration:
        keep.append(RangeSeconds(cursor, duration))
    return [segment for segment in keep if segment.end - segment.start >= 0.02]
