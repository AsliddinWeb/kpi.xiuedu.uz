from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: str
    auth_provider: str
    manager_id: int | None
    department_id: int | None
    position_id: int | None
    kpi_template_id: int | None
    academic_degree: str
    bonus_fund_override: float | None
    is_active: bool
    is_restricted: bool
    theme_preference: str
    sidebar_collapsed: bool
    last_login_at: datetime | None

    # HEMIS OAuth (per-login sync)
    hemis_login: str | None
    hemis_phone: str | None
    hemis_type: str | None
    hemis_birth_date: date | None
    hemis_picture_url: str | None
    hemis_last_synced_at: datetime | None

    # HEMIS REST API (admin-triggered resync) - see app/services/hemis_rest.py
    hemis_employee_id_number: str | None
    hemis_image_url: str | None
    hemis_academic_degree_name: str | None
    hemis_academic_rank_name: str | None
    hemis_staff_position_name: str | None
    hemis_employment_status_name: str | None
    hemis_department_name: str | None
    hemis_rest_synced_at: datetime | None


class LoginResponse(BaseModel):
    user: UserOut


class UserPreferencesUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1)
    theme_preference: Literal["light", "dark"] | None = None
    sidebar_collapsed: bool | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
