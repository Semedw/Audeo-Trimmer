from __future__ import annotations

from pydantic import BaseModel, Field


class TrimRange(BaseModel):
    start: str = Field(description="Start timestamp. Example: 00:30 or 00:00:30.500")
    end: str = Field(description="End timestamp. Example: 01:30 or 00:01:30.200")


class ProcessRequest(BaseModel):
    file_id: str
    trim_ranges: list[TrimRange]
    output_format: str | None = None


class UploadResponse(BaseModel):
    file_id: str
    original_filename: str
    stored_filename: str
    extension: str
    metadata: dict


class ProcessResponse(BaseModel):
    result_id: str
    output_filename: str
    output_format: str
    processing_mode: str
    removed_ranges: list[dict]
    kept_ranges: list[dict]
