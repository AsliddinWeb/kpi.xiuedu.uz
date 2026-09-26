from pydantic import BaseModel


class PublicLeaderboardRow(BaseModel):
    full_name: str
    department_name: str | None
    total_score: float
    template_max_score: float


class PublicStats(BaseModel):
    total_employees: int
    total_departments: int
    average_score: float | None
    top_score: float | None
    academic_year: str | None
    arizalar_new: int
    arizalar_in_review: int
    arizalar_approved: int
    arizalar_rejected: int
