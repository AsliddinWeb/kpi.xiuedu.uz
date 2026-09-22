from pydantic import BaseModel, Field


class IndicatorRankOverrideIn(BaseModel):
    kpi_indicator_id: int
    has_title: bool
    max_score: float = Field(ge=0)


class RankOverrideScoreUpdate(BaseModel):
    max_score: float = Field(ge=0)


class IndicatorRankOverrideOut(BaseModel):
    id: int
    kpi_indicator_id: int
    indicator_name: str
    has_title: bool
    max_score: float


class CategoryRankOverrideIn(BaseModel):
    kpi_category_id: int
    has_title: bool
    max_score: float = Field(ge=0)


class CategoryRankOverrideOut(BaseModel):
    id: int
    kpi_category_id: int
    category_name: str
    has_title: bool
    max_score: float
