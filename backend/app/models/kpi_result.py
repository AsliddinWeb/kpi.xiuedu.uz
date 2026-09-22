import enum
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy import JSON, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class KpiResultStatus(str, enum.Enum):
    computed = "computed"
    approved = "approved"


class KpiResult(Base):
    """Cached per-user-per-period aggregate, recomputed whenever one of the user's arizalar is scored."""

    __tablename__ = "kpi_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    kpi_template_id: Mapped[int] = mapped_column(ForeignKey("kpi_templates.id"), nullable=False)
    period: Mapped[str] = mapped_column(String(9), nullable=False)
    total_score: Mapped[float] = mapped_column(Float, default=0, nullable=False)
    category_breakdown: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    status: Mapped[KpiResultStatus] = mapped_column(
        SAEnum(KpiResultStatus, name="kpi_result_status"), default=KpiResultStatus.computed, nullable=False
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
