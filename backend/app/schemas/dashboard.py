from datetime import datetime

from pydantic import BaseModel


class TeamMemberSummary(BaseModel):
    user_id: int
    full_name: str
    email: str
    role: str
    latest_period: str | None
    latest_status: str | None
    latest_score: float | None


class OrganizationSummary(BaseModel):
    total_employees: int
    total_departments: int
    total_positions: int
    results_computed: int
    results_approved: int
    average_score: float | None


class DepartmentComparisonRow(BaseModel):
    department_id: int
    department_name: str
    employee_count: int
    average_score: float | None


class RectorSummary(BaseModel):
    pending_head_approvals: int
    active_correction_plans: int
    active_force_majeure: int
    total_employees: int
    organization_average_score: float | None


class LeaderboardRow(BaseModel):
    user_id: int
    full_name: str
    department_name: str | None
    position_title: str | None
    total_score: float
    template_max_score: float


class MyKpiSubmissionRow(BaseModel):
    ariza_id: int
    status: str
    awarded_score: float | None
    employee_comment: str | None
    reviewer_comment: str | None
    submitted_at: datetime


class MyKpiIndicatorRow(BaseModel):
    kpi_indicator_id: int
    indicator_name: str
    category_id: int
    category_name: str
    category_max_score: float
    max_score: float
    awarded_total: float
    remaining_capacity: float
    submissions: list[MyKpiSubmissionRow]
