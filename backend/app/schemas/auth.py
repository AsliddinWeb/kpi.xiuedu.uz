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


class LoginResponse(BaseModel):
    user: UserOut


class UserPreferencesUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1)
    theme_preference: Literal["light", "dark"] | None = None
    sidebar_collapsed: bool | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
