from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class KpiIndicatorSubItem(Base):
    """An optional sub-criterion breakdown of an indicator's max_score (e.g. a/b/c/d bands)."""

    __tablename__ = "kpi_indicator_sub_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    kpi_indicator_id: Mapped[int] = mapped_column(ForeignKey("kpi_indicators.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(500), nullable=False)
    max_score: Mapped[float] = mapped_column(Float, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
