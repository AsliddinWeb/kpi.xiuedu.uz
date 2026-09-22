from sqlalchemy import Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class WorkPlanItem(Base):
    """One indicator-targeted line within a WorkPlan, e.g. "4 articles" against a
    specific KpiIndicator."""

    __tablename__ = "work_plan_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    work_plan_id: Mapped[int] = mapped_column(ForeignKey("work_plans.id"), nullable=False)
    kpi_indicator_id: Mapped[int] = mapped_column(ForeignKey("kpi_indicators.id"), nullable=False)
    planned_count: Mapped[int] = mapped_column(Integer, nullable=False)
    planned_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
