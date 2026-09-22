from pydantic import BaseModel, Field

from app.models.company_settings import PeriodType


class KpiIndicatorSubItemIn(BaseModel):
    label: str = Field(min_length=1)
    max_score: float = Field(ge=0)


class KpiIndicatorSubItemOut(BaseModel):
    id: int
    label: str
    max_score: float
    order_index: int


class KpiIndicatorIn(BaseModel):
    name: str = Field(min_length=1)
    description: str | None = None
    max_score: float = Field(ge=0)
    allow_coauthors: bool = False
    requires_file: bool = True
    sub_items: list[KpiIndicatorSubItemIn] = []


class KpiIndicatorOut(BaseModel):
    id: int
    kpi_category_id: int
    name: str
    description: str | None
    max_score: float
    allow_coauthors: bool
    requires_file: bool
    order_index: int
    sub_items: list[KpiIndicatorSubItemOut] = []


class KpiCategoryIn(BaseModel):
    name: str = Field(min_length=1)
    max_score: float = Field(ge=0)
    is_bonus_category: bool = False
    requires_kafedra_endorsement: bool = False
    requires_head_approval: bool = False
    indicators: list[KpiIndicatorIn] = Field(min_length=1)


class KpiCategoryOut(BaseModel):
    id: int
    kpi_template_id: int
    name: str
    max_score: float
    is_bonus_category: bool
    requires_kafedra_endorsement: bool
    requires_head_approval: bool
    order_index: int
    indicators: list[KpiIndicatorOut] = []


class KpiTemplateCreate(BaseModel):
    name: str = Field(min_length=1)
    annex_code: str = Field(min_length=1)
    academic_year: str = Field(min_length=1)
    period_type: PeriodType
    categories: list[KpiCategoryIn] = Field(min_length=1)


class KpiTemplateUpdate(BaseModel):
    name: str | None = None
    categories: list[KpiCategoryIn] | None = None
    is_active: bool | None = None


class KpiTemplateOut(BaseModel):
    id: int
    name: str
    annex_code: str
    academic_year: str
    period_type: PeriodType
    is_active: bool
    total_max_score: float
    categories: list[KpiCategoryOut] = []
