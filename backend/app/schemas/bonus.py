from pydantic import BaseModel, Field


class BonusRow(BaseModel):
    user_id: int
    full_name: str
    email: str
    bonus_fund: float | None
    final_kpi_percent: float
    bonus_amount: float | None


class BonusApprovalStatus(BaseModel):
    period: str
    approved: bool
    approved_at: str | None


class BonusApproveRequest(BaseModel):
    period: str = Field(pattern=r"^\d{4}-\d{2}$")
