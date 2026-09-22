import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy import func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class AuthProvider(str, enum.Enum):
    """How this user authenticates: a local email/password account, or HEMIS
    university SSO (OAuth2). HEMIS-provisioned accounts still get a random,
    unusable password_hash so the NOT NULL constraint holds - they must
    always sign in through HEMIS."""

    local = "local"
    hemis = "hemis"


class UserRole(str, enum.Enum):
    super_admin = "super_admin"
    admin = "admin"
    manager = "manager"
    employee = "employee"
    rector = "rector"
    prorektor_birinchi = "prorektor_birinchi"
    prorektor_oquv = "prorektor_oquv"
    prorektor_xalqaro = "prorektor_xalqaro"


class AcademicDegree(str, enum.Enum):
    """Nizom 3.2: unvonli (has_title) vs unvonsiz professor-o'qituvchilar."""

    none = "none"
    phd = "phd"
    dsc = "dsc"
    dotsent = "dotsent"
    professor = "professor"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(SAEnum(UserRole, name="user_role"), nullable=False)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)
    position_id: Mapped[int | None] = mapped_column(ForeignKey("positions.id"), nullable=True)
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    kpi_template_id: Mapped[int | None] = mapped_column(ForeignKey("kpi_templates.id"), nullable=True)
    academic_degree: Mapped[AcademicDegree] = mapped_column(
        SAEnum(AcademicDegree, name="academic_degree"), default=AcademicDegree.none, nullable=False
    )
    bonus_fund_override: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_restricted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    theme_preference: Mapped[str] = mapped_column(String(20), default="light", nullable=False)
    sidebar_collapsed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # HEMIS OAuth2 (university SSO) - populated on first HEMIS login, refreshed on each
    # subsequent one. See app/services/hemis_oauth.py.
    auth_provider: Mapped[AuthProvider] = mapped_column(
        SAEnum(AuthProvider, name="auth_provider"), default=AuthProvider.local, nullable=False
    )
    hemis_uuid: Mapped[str | None] = mapped_column(String(64), unique=True, index=True, nullable=True)
    hemis_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    hemis_employee_id_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    hemis_login: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hemis_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    hemis_roles: Mapped[str | None] = mapped_column(String(500), nullable=True)
    hemis_first_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hemis_surname: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hemis_patronymic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hemis_birth_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    hemis_university_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    hemis_phone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    hemis_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hemis_picture_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    hemis_last_synced_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    manager: Mapped["User | None"] = relationship("User", remote_side=[id])
