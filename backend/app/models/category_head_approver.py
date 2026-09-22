from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CategoryHeadApprover(Base):
    """Nizom band 3: a second-stage approver for a KpiCategory's already-scored arizalar
    (e.g. the rector/prorektor who finalizes a "Rahbar tavsiyasi" category).

    kpi_indicator_id is optional: null means the approver covers the whole category,
    matching the CategoryReviewer pattern; set means they're scoped to just that one
    indicator within the category (Nizom 3.2/25-band: each of the 4 rector/prorektor
    directions signs off on only its own indicator, not the whole "Rahbar tavsiyasi"
    category)."""

    __tablename__ = "category_head_approvers"

    id: Mapped[int] = mapped_column(primary_key=True)
    kpi_category_id: Mapped[int] = mapped_column(ForeignKey("kpi_categories.id"), nullable=False)
    kpi_indicator_id: Mapped[int | None] = mapped_column(ForeignKey("kpi_indicators.id"), nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
