from __future__ import annotations

import re

TIME_RE = re.compile(
    r"^(?:(?P<h>\d{1,2}):)?(?P<m>[0-5]?\d):(?P<s>[0-5]?\d(?:\.\d{1,3})?)$"
)


def parse_timecode(raw: str) -> float:
    value = raw.strip()
    match = TIME_RE.match(value)
    if not match:
        raise ValueError(f"Invalid time format: {raw}")

    hours = int(match.group("h") or 0)
    minutes = int(match.group("m"))
    seconds = float(match.group("s"))
    total = hours * 3600 + minutes * 60 + seconds
    return round(total, 3)


def format_timecode(total_seconds: float) -> str:
    if total_seconds < 0:
        total_seconds = 0
    hours = int(total_seconds // 3600)
    minutes = int((total_seconds % 3600) // 60)
    seconds = total_seconds % 60
    return f"{hours:02}:{minutes:02}:{seconds:06.3f}"
