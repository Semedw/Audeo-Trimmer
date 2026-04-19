from __future__ import annotations

import os
from functools import lru_cache

import imageio_ffmpeg


@lru_cache(maxsize=1)
def ffmpeg_executable() -> str:
    # Allow explicit override when users want a system binary.
    configured = os.getenv("FFMPEG_BINARY", "").strip()
    if configured:
        return configured
    return imageio_ffmpeg.get_ffmpeg_exe()
