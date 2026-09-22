from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ArizaCoAuthorIn(BaseModel):
    co_author_user_id: int | None = None
    co_author_name: str | None = None
    share_percent: float = Field(gt=0, le=100)


class ArizaCoAuthorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    co_author_user_id: int | None
    co_author_name: str | None
    share_percent: float


class ArizaFileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    file_url: str
    original_filename: str
    uploaded_at: datetime


class SubmitArizaRequest(BaseModel):
    kpi_indicator_id: int
    period: str = Field(min_length=1)
    employee_comment: str | None = None
    co_authors: list[ArizaCoAuthorIn] = []


class ScoreArizaRequest(BaseModel):
    awarded_score: float = Field(ge=0)
    reviewer_comment: str | None = None


class RejectArizaRequest(BaseModel):
    reviewer_comment: str = Field(min_length=1)


class HeadRejectRequest(BaseModel):
    reviewer_comment: str = Field(min_length=1)


class ArizaOut(BaseModel):
    id: int
    user_id: int
    user_full_name: str
    kpi_indicator_id: int
    indicator_name: str
    kpi_category_id: int
    category_name: str
    requires_kafedra_endorsement: bool
    requires_head_approval: bool
    max_score: float
    period: str
    status: str
    employee_comment: str | None
    awarded_score: float | None
    reviewer_id: int | None
    reviewer_comment: str | None
    head_approved_by_id: int | None
    head_approved_at: datetime | None
    submitted_at: datetime
    reviewed_at: datetime | None
    files: list[ArizaFileOut] = []
    co_authors: list[ArizaCoAuthorOut] = []
