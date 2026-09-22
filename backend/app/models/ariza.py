import enum
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ArizaStatus(str, enum.Enum):
    submitted = "submitted"
    kafedra_endorsed = "kafedra_endorsed"
    scored = "scored"
    pending_head_approval = "pending_head_approval"
    approved = "approved"
    rejected = "rejected"


class Ariza(Base):
    """A teacher's evidence-backed application for one indicator, for one period."""

    __tablename__ = "arizalar"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    kpi_indicator_id: Mapped[int] = mapped_column(ForeignKey("kpi_indicators.id"), nullable=False)
    period: Mapped[str] = mapped_column(String(9), nullable=False)
    status: Mapped[ArizaStatus] = mapped_column(
        SAEnum(ArizaStatus, name="ariza_status"), default=ArizaStatus.submitted, nullable=False
    )
    employee_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    awarded_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    reviewer_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewer_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    endorsed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    endorsed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    head_approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    head_approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
