from datetime import datetime

from pydantic import BaseModel, Field


class CategoryReviewerIn(BaseModel):
    kpi_category_id: int
    user_id: int


class CategoryReviewerOut(BaseModel):
    id: int
    kpi_category_id: int
    category_name: str
    user_id: int
    user_full_name: str


class CategoryHeadApproverIn(BaseModel):
    kpi_category_id: int
    kpi_indicator_id: int | None = None
    user_id: int


class CategoryHeadApproverOut(BaseModel):
    id: int
    kpi_category_id: int
    category_name: str
    kpi_indicator_id: int | None
    indicator_name: str | None
    user_id: int
    user_full_name: str


class CorrectionPlanCreate(BaseModel):
    user_id: int
    period: str = Field(min_length=1)
    stage: str
    reason: str = Field(min_length=1)
    load_reduction_percent: float | None = Field(default=None, ge=0, le=100)


class CorrectionPlanOut(BaseModel):
    id: int
    user_id: int
    user_full_name: str
    period: str
    stage: str
    reason: str
    load_reduction_percent: float | None
    status: str
    started_by_id: int
    started_at: datetime
    resolved_at: datetime | None


class ForceMajeureCreate(BaseModel):
    affected_user_id: int | None = None
    period: str = Field(min_length=1)
    category: str
    description: str = Field(min_length=1)
    extension_days: int = Field(default=0, ge=0)


class ForceMajeureOut(BaseModel):
    id: int
    declared_by_id: int
    affected_user_id: int | None
    period: str
    category: str
    description: str
    extension_days: int
    status: str
    started_at: datetime
    resolved_at: datetime | None


class IncentiveCreate(BaseModel):
    user_id: int
    period: str = Field(min_length=1)
    type: str
    title: str = Field(min_length=1)
    description: str | None = None
    amount: float | None = Field(default=None, ge=0)


class IncentiveRevoke(BaseModel):
    revoked_reason: str = Field(min_length=1)


class IncentiveOut(BaseModel):
    id: int
    user_id: int
    user_full_name: str
    period: str
    type: str
    title: str
    description: str | None
    amount: float | None
    decided_by_id: int
    decided_at: datetime
    status: str
    revoked_at: datetime | None
    revoked_reason: str | None
