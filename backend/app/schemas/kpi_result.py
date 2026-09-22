from datetime import datetime

from pydantic import BaseModel


class KpiResultOut(BaseModel):
    id: int
    user_id: int
    kpi_template_id: int
    period: str
    total_score: float
    category_breakdown: dict[str, float]
    status: str
    approved_at: datetime | None
    computed_at: datetime
