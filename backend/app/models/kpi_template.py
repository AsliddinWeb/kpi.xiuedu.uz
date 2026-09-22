from sqlalchemy import Boolean, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.company_settings import PeriodType


class KpiTemplate(Base):
    """A yearly evaluation form ("ilova"/annex) — e.g. "1-ilova: unvonli professor-o'qituvchilar"."""

    __tablename__ = "kpi_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    annex_code: Mapped[str] = mapped_column(String(20), nullable=False)
    academic_year: Mapped[str] = mapped_column(String(9), nullable=False)
    period_type: Mapped[PeriodType] = mapped_column(SAEnum(PeriodType, name="period_type"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
