from typing import Literal

from pydantic import BaseModel, Field


class ExportCreate(BaseModel):
    period: str = Field(pattern=r"^\d{4}-\d{2}$")
    format: Literal["xlsx", "pdf"] = "xlsx"


class ExportOut(BaseModel):
    id: int
    period: str
    status: str
    format: str
    file_url: str | None
    generated_at: str | None
