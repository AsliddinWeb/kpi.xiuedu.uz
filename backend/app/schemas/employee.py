from typing import Literal

from pydantic import BaseModel, EmailStr, Field


AcademicDegreeLiteral = Literal["none", "phd", "dsc", "dotsent", "professor"]

EmployeeRoleLiteral = Literal[
    "manager", "employee", "admin", "rector", "prorektor_birinchi", "prorektor_oquv", "prorektor_xalqaro"
]

# Roles only a super_admin ("Bosh administrator") may assign - see PRIVILEGED_ROLES check in users.py.
PRIVILEGED_ROLES = {"admin", "rector", "prorektor_birinchi", "prorektor_oquv", "prorektor_xalqaro"}


class EmployeeCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=1)
    role: EmployeeRoleLiteral
    department_id: int | None = None
    position_id: int | None = None
    manager_id: int | None = None
    kpi_template_id: int | None = None
    academic_degree: AcademicDegreeLiteral = "none"
    bonus_fund_override: float | None = Field(default=None, ge=0)


class EmployeeUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=1)
    role: EmployeeRoleLiteral | None = None
    department_id: int | None = None
    position_id: int | None = None
    manager_id: int | None = None
    kpi_template_id: int | None = None
    academic_degree: AcademicDegreeLiteral | None = None
    is_active: bool | None = None
    bonus_fund_override: float | None = Field(default=None, ge=0)


class RestrictRequest(BaseModel):
    is_restricted: bool


class ImportRowResult(BaseModel):
    row: int
    email: str
    status: Literal["created", "error"]
    error: str | None = None
    temporary_password: str | None = None


class ImportSummary(BaseModel):
    total: int
    created: int
    failed: int
    results: list[ImportRowResult]
