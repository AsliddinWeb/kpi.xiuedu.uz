from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class WorkPlanItemIn(BaseModel):
    kpi_indicator_id: int
    planned_count: int = Field(ge=1)
    planned_score: float | None = Field(default=None, ge=0)
    notes: str | None = None


class WorkPlanCreate(BaseModel):
    period: str = Field(min_length=1)
    items: list[WorkPlanItemIn] = Field(min_length=1)


class WorkPlanItemFulfillment(BaseModel):
    kpi_indicator_id: int
    indicator_name: str
    planned_count: int
    planned_score: float | None
    notes: str | None
    actual_count: int
    actual_score: float
    classification: Literal["under", "met", "exceeded"]


class WorkPlanOut(BaseModel):
    id: int
    user_id: int
    user_full_name: str
    period: str
    status: str
    created_at: datetime
    items: list[WorkPlanItemFulfillment]
