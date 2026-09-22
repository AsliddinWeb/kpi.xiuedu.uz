import enum
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class IncentiveType(str, enum.Enum):
    monetary = "monetary"
    title = "title"
    certificate = "certificate"
    training_trip = "training_trip"
    other = "other"


class IncentiveStatus(str, enum.Enum):
    active = "active"
    revoked = "revoked"


class Incentive(Base):
    """Nizom 4-bo'lim: a financial or non-financial reward, separate from the payroll Bonus formula."""

    __tablename__ = "incentives"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    period: Mapped[str] = mapped_column(String(9), nullable=False)
    type: Mapped[IncentiveType] = mapped_column(SAEnum(IncentiveType, name="incentive_type"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    decided_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    decided_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    status: Mapped[IncentiveStatus] = mapped_column(
        SAEnum(IncentiveStatus, name="incentive_status"), default=IncentiveStatus.active, nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
