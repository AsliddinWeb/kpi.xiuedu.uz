from sqlalchemy import ForeignKey, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Position(Base):
    __tablename__ = "positions"

    id: Mapped[int] = mapped_column(primary_key=True)
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    bonus_fund: Mapped[float | None] = mapped_column(Float, nullable=True)
    minimal_score: Mapped[float | None] = mapped_column(Float, nullable=True)
