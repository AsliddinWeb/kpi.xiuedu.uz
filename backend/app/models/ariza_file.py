from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ArizaFile(Base):
    __tablename__ = "ariza_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    ariza_id: Mapped[int] = mapped_column(ForeignKey("arizalar.id"), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
