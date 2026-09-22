import enum
from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PayrollExportStatus(str, enum.Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class PayrollExportFormat(str, enum.Enum):
    xlsx = "xlsx"
    pdf = "pdf"


class PayrollExport(Base):
    __tablename__ = "payroll_exports"

    id: Mapped[int] = mapped_column(primary_key=True)
    period: Mapped[str] = mapped_column(String(7), nullable=False)
    generated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[PayrollExportStatus] = mapped_column(
        SAEnum(PayrollExportStatus, name="payroll_export_status"),
        default=PayrollExportStatus.pending,
        nullable=False,
    )
    format: Mapped[PayrollExportFormat] = mapped_column(
        SAEnum(PayrollExportFormat, name="payroll_export_format"),
        default=PayrollExportFormat.xlsx,
        server_default=PayrollExportFormat.xlsx.value,
        nullable=False,
    )
