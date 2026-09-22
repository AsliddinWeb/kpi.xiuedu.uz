from sqlalchemy import Boolean, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class KpiIndicator(Base):
    """A single scored line item within a category (e.g. "Darslik chop etish")."""

    __tablename__ = "kpi_indicators"

    id: Mapped[int] = mapped_column(primary_key=True)
    kpi_category_id: Mapped[int] = mapped_column(ForeignKey("kpi_categories.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    max_score: Mapped[float] = mapped_column(Float, nullable=False)
    allow_coauthors: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_file: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
