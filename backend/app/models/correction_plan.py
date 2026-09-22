import enum
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CorrectionPlanStage(str, enum.Enum):
    load_reduction = "load_reduction"
    warning = "warning"
    termination = "termination"


class CorrectionPlanStatus(str, enum.Enum):
    active = "active"
    resolved = "resolved"


class CorrectionPlan(Base):
    """Nizom 3.3 escalation ladder for a low-scoring period, started manually by admin/kafedra mudiri."""

    __tablename__ = "correction_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    period: Mapped[str] = mapped_column(String(9), nullable=False)
    stage: Mapped[CorrectionPlanStage] = mapped_column(
        SAEnum(CorrectionPlanStage, name="correction_plan_stage"), nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    load_reduction_percent: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[CorrectionPlanStatus] = mapped_column(
        SAEnum(CorrectionPlanStatus, name="correction_plan_status"), default=CorrectionPlanStatus.active, nullable=False
    )
    started_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
