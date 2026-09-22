import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.company_settings import PeriodType
from app.models.department import Department
from app.models.kpi_category import KpiCategory
from app.models.kpi_indicator import KpiIndicator
from app.models.kpi_template import KpiTemplate
from app.models.position import Position
from app.models.user import User, UserRole

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

TEST_PASSWORD = "pass1234"


@pytest.fixture()
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client(db_session):
    def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def seed_users(db_session):
    super_admin = User(
        email="superadmin@test.com",
        password_hash=hash_password(TEST_PASSWORD),
        full_name="Super Admin",
        role=UserRole.super_admin,
    )
    db_session.add(super_admin)

    manager = User(
        email="manager@test.com",
        password_hash=hash_password(TEST_PASSWORD),
        full_name="Manager",
        role=UserRole.manager,
    )
    db_session.add(manager)
    db_session.flush()

    employee = User(
        email="employee@test.com",
        password_hash=hash_password(TEST_PASSWORD),
        full_name="Employee",
        role=UserRole.employee,
        manager_id=manager.id,
    )
    other_employee = User(
        email="other@test.com",
        password_hash=hash_password(TEST_PASSWORD),
        full_name="Other Employee",
        role=UserRole.employee,
    )
    admin = User(
        email="admin@test.com",
        password_hash=hash_password(TEST_PASSWORD),
        full_name="Admin",
        role=UserRole.admin,
    )
    inactive = User(
        email="inactive@test.com",
        password_hash=hash_password(TEST_PASSWORD),
        full_name="Inactive User",
        role=UserRole.employee,
        is_active=False,
    )

    db_session.add_all([employee, other_employee, admin, inactive])
    db_session.commit()

    return {
        "super_admin": super_admin,
        "manager": manager,
        "employee": employee,
        "other_employee": other_employee,
        "admin": admin,
        "inactive": inactive,
    }


@pytest.fixture()
def seed_departments(db_session):
    it_department = Department(name="IT")
    db_session.add(it_department)
    db_session.flush()

    dev_position = Position(department_id=it_department.id, title="Developer")
    db_session.add(dev_position)

    finance_department = Department(name="Finance")
    db_session.add(finance_department)
    db_session.commit()

    db_session.refresh(it_department)
    db_session.refresh(dev_position)
    db_session.refresh(finance_department)

    return {
        "it": it_department,
        "dev_position": dev_position,
        "finance": finance_department,
    }


@pytest.fixture()
def seed_kpi_template(db_session, seed_departments):
    template = KpiTemplate(
        name="1-ilova: Professor-o'qituvchilar",
        annex_code="1",
        academic_year="2026-2027",
        period_type=PeriodType.monthly,
        is_active=True,
    )
    db_session.add(template)
    db_session.flush()

    teaching = KpiCategory(kpi_template_id=template.id, name="O'quv-uslubiy faoliyat", max_score=40, order_index=0)
    science = KpiCategory(kpi_template_id=template.id, name="Ilmiy faoliyat", max_score=60, order_index=1)
    db_session.add_all([teaching, science])
    db_session.flush()

    quality = KpiIndicator(kpi_category_id=teaching.id, name="Code quality", max_score=40, requires_file=True)
    tasks = KpiIndicator(kpi_category_id=science.id, name="Tasks done", max_score=60, requires_file=True)
    db_session.add_all([quality, tasks])
    db_session.commit()

    db_session.refresh(template)
    db_session.refresh(teaching)
    db_session.refresh(science)
    db_session.refresh(quality)
    db_session.refresh(tasks)

    return {
        "template": template,
        "teaching_category": teaching,
        "science_category": science,
        "quality": quality,
        "tasks": tasks,
    }


@pytest.fixture()
def seed_employee_with_position(db_session, seed_users, seed_departments, seed_kpi_template):
    employee = seed_users["employee"]
    employee.department_id = seed_departments["it"].id
    employee.position_id = seed_departments["dev_position"].id
    employee.kpi_template_id = seed_kpi_template["template"].id
    db_session.commit()
    db_session.refresh(employee)
    return employee
