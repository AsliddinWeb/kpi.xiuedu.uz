import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SummaryType(str, enum.Enum):
    semester_review = "semester_review"
    year_end = "year_end"
    early_warning = "early_warning"


class Summary(Base):
    """A persisted, admin/rector-triggered ("Generate now") snapshot report - stakeholder
    feedback bands 6-8: biannual sarhisob, May year-end sarhisob, Q1 early-warning flag.
    No Celery beat / automatic scheduling - generation is always a manual, reviewable
    action (see plan Faza 0(c))."""

    __tablename__ = "summaries"

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[SummaryType] = mapped_column(SAEnum(SummaryType, name="summary_type"), nullable=False)
    period: Mapped[str] = mapped_column(String(9), nullable=False)
    half: Mapped[int | None] = mapped_column(Integer, nullable=True)
    generated_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
