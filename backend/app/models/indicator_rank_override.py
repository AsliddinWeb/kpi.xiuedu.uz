from sqlalchemy import Boolean, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IndicatorRankOverride(Base):
    """Nizom 3.2: per-indicator max_score override for unvonli (has_title) vs unvonsiz professor-o'qituvchilar."""

    __tablename__ = "indicator_rank_overrides"

    id: Mapped[int] = mapped_column(primary_key=True)
    kpi_indicator_id: Mapped[int] = mapped_column(ForeignKey("kpi_indicators.id"), nullable=False)
    has_title: Mapped[bool] = mapped_column(Boolean, nullable=False)
    max_score: Mapped[float] = mapped_column(Float, nullable=False)
