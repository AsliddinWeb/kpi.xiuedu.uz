import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WorkPlanStatus(str, enum.Enum):
    active = "active"
    closed = "closed"


class WorkPlan(Base):
    """An employee's voluntary annual/period commitment (e.g. "4 Scopus articles this
    year"), tracked against their actual scored arizalar - separate from and additive
    to the core rubric scoring, per stakeholder feedback band 5."""

    __tablename__ = "work_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    period: Mapped[str] = mapped_column(String(9), nullable=False)
    status: Mapped[WorkPlanStatus] = mapped_column(
        SAEnum(WorkPlanStatus, name="work_plan_status"), default=WorkPlanStatus.active, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
