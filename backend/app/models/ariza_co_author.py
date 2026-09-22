from sqlalchemy import Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ArizaCoAuthor(Base):
    """A co-author's share of an ariza's awarded score. Either co_author_user_id or co_author_name is set."""

    __tablename__ = "ariza_co_authors"

    id: Mapped[int] = mapped_column(primary_key=True)
    ariza_id: Mapped[int] = mapped_column(ForeignKey("arizalar.id"), nullable=False)
    co_author_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    co_author_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    share_percent: Mapped[float] = mapped_column(Float, nullable=False)
