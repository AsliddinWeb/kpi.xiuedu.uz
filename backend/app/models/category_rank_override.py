from sqlalchemy import Boolean, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CategoryRankOverride(Base):
    """Nizom 3.2: per-category max_score override for unvonli (has_title) vs unvonsiz professor-o'qituvchilar
    (e.g. Ijtimoiy-tarbiyaviy faoliyat: 20 for titled, 22 for untitled)."""

    __tablename__ = "category_rank_overrides"

    id: Mapped[int] = mapped_column(primary_key=True)
    kpi_category_id: Mapped[int] = mapped_column(ForeignKey("kpi_categories.id"), nullable=False)
    has_title: Mapped[bool] = mapped_column(Boolean, nullable=False)
    max_score: Mapped[float] = mapped_column(Float, nullable=False)
