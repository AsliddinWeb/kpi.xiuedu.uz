import enum

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DepartmentType(str, enum.Enum):
    faculty = "faculty"
    kafedra = "kafedra"
    administrative = "administrative"


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department_type: Mapped[DepartmentType] = mapped_column(
        SAEnum(DepartmentType, name="department_type"), nullable=False, default=DepartmentType.administrative
    )
    parent_department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)

    parent: Mapped["Department | None"] = relationship("Department", remote_side=[id])
