import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ForceMajeureCategory(str, enum.Enum):
    natural_disaster = "natural_disaster"
    war_or_unrest = "war_or_unrest"
    government_restriction = "government_restriction"
    system_outage = "system_outage"
    utility_outage = "utility_outage"
    health_emergency = "health_emergency"
    other = "other"


class ForceMajeureStatus(str, enum.Enum):
    pending = "pending"
    acknowledged = "acknowledged"
    resolved = "resolved"


class ForceMajeureDeclaration(Base):
    """Nizom 5-bo'lim: a declared force-majeure condition that may extend deadlines for a user/period."""

    __tablename__ = "force_majeure_declarations"

    id: Mapped[int] = mapped_column(primary_key=True)
    declared_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    affected_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    period: Mapped[str] = mapped_column(String(9), nullable=False)
    category: Mapped[ForceMajeureCategory] = mapped_column(
        SAEnum(ForceMajeureCategory, name="force_majeure_category"), nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    extension_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    status: Mapped[ForceMajeureStatus] = mapped_column(
        SAEnum(ForceMajeureStatus, name="force_majeure_status"), default=ForceMajeureStatus.pending, nullable=False
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
