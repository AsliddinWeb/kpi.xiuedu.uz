from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.company_settings import PeriodType


class SetupStatus(BaseModel):
    setup_completed: bool


class LogoUploadResponse(BaseModel):
    logo_url: str


class CompanySettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    logo_url: str | None
    industry_label: str | None
    default_period_type: PeriodType
    setup_completed_at: datetime | None


class CompanySettingsUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    logo_url: str | None = None
    industry_label: str | None = None
    default_period_type: PeriodType | None = None


class PositionIn(BaseModel):
    title: str = Field(min_length=1)


class DepartmentIn(BaseModel):
    name: str = Field(min_length=1)
    positions: list[PositionIn] = Field(default_factory=list)


class AdminUserIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)


class SetupCompleteRequest(BaseModel):
    company_name: str = Field(min_length=1)
    logo_url: str | None = None
    industry_label: str | None = None
    default_period_type: PeriodType
    departments: list[DepartmentIn] = Field(min_length=1)
    admin: AdminUserIn | None = None


class SetupCompleteResponse(BaseModel):
    company: CompanySettingsOut
