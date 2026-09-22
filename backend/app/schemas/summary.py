from datetime import datetime
from typing import Any

from pydantic import BaseModel


class SemesterReviewRequest(BaseModel):
    period: str
    half: int


class YearEndRequest(BaseModel):
    academic_year: str


class EarlyWarningRequest(BaseModel):
    period: str


class SummaryOut(BaseModel):
    id: int
    type: str
    period: str
    half: int | None
    generated_by_id: int
    generated_by_name: str
    generated_at: datetime
    payload: dict[str, Any]
