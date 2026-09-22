from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CategoryReviewer(Base):
    """Authorizes a user to score arizalar for a specific KpiCategory (multi-department routing)."""

    __tablename__ = "category_reviewers"

    id: Mapped[int] = mapped_column(primary_key=True)
    kpi_category_id: Mapped[int] = mapped_column(ForeignKey("kpi_categories.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
