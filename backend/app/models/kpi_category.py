from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class KpiCategory(Base):
    """A top-level scoring group within a template (Ilmiy faoliyat, O'quv-uslubiy faoliyat, ...)."""

    __tablename__ = "kpi_categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    kpi_template_id: Mapped[int] = mapped_column(ForeignKey("kpi_templates.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    max_score: Mapped[float] = mapped_column(Float, nullable=False)
    is_bonus_category: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_kafedra_endorsement: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    requires_head_approval: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    order_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
