import pytest

from app.core.security import hash_password
from app.models.user import User, UserRole
from tests.conftest import TEST_PASSWORD

RECTOR_ROLES = [
    UserRole.rector,
    UserRole.prorektor_birinchi,
    UserRole.prorektor_oquv,
    UserRole.prorektor_xalqaro,
]


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


@pytest.fixture()
def seed_rector_roles(db_session):
    users = {}
    for role in RECTOR_ROLES:
        user = User(
            email=f"{role.value}@test.com",
            password_hash=hash_password(TEST_PASSWORD),
            full_name=role.value,
            role=role,
        )
        db_session.add(user)
        users[role.value] = user
    db_session.commit()
    for user in users.values():
        db_session.refresh(user)
    return users


@pytest.mark.parametrize("role", RECTOR_ROLES)
def test_rector_roles_can_read_oversight_endpoints(client, seed_rector_roles, seed_departments, role):
    _login(client, f"{role.value}@test.com")

    assert client.get("/api/v1/dashboard/organization-summary").status_code == 200
    assert client.get("/api/v1/dashboard/department-comparison").status_code == 200
    assert client.get("/api/v1/departments").status_code == 200
    assert client.get("/api/v1/users").status_code == 200
    assert client.get("/api/v1/exports").status_code == 200
    assert client.get("/api/v1/audit-log").status_code == 200


@pytest.mark.parametrize("role", RECTOR_ROLES)
def test_rector_roles_cannot_write_config_endpoints(client, seed_rector_roles, seed_departments, role):
    _login(client, f"{role.value}@test.com")

    assert client.post("/api/v1/departments", json={"name": "New Dept"}).status_code == 403
    assert (
        client.post(
            "/api/v1/users",
            json={"email": "x@test.com", "password": "somepassword", "full_name": "X", "role": "employee"},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/kpi-templates",
            json={
                "name": "T",
                "annex_code": "9",
                "academic_year": "2026-2027",
                "period_type": "monthly",
                "categories": [],
            },
        ).status_code
        == 403
    )
    assert client.patch("/api/v1/setup/company", json={"name": "New Name"}).status_code == 403


def test_rector_role_sees_full_employee_list(client, seed_rector_roles, seed_users, seed_departments):
    _login(client, "rector@test.com")
    resp = client.get("/api/v1/users")
    assert resp.status_code == 200
    emails = {u["email"] for u in resp.json()}
    assert "employee@test.com" in emails
    assert "other@test.com" in emails


def test_manager_cannot_read_organization_summary(client, seed_users):
    _login(client, "manager@test.com")
    assert client.get("/api/v1/dashboard/organization-summary").status_code == 403


def test_super_admin_can_create_rector_account(client, seed_users):
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/users",
        json={
            "email": "new-rector@test.com",
            "password": "somepassword",
            "full_name": "New Rector",
            "role": "rector",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["role"] == "rector"


def test_admin_cannot_create_privileged_role_account(client, seed_users):
    _login(client, "admin@test.com")
    resp = client.post(
        "/api/v1/users",
        json={
            "email": "sneaky-admin@test.com",
            "password": "somepassword",
            "full_name": "Sneaky",
            "role": "admin",
        },
    )
    assert resp.status_code == 403


@pytest.mark.parametrize("role", ["admin", "rector", "prorektor_birinchi", "prorektor_oquv", "prorektor_xalqaro"])
def test_admin_cannot_create_any_privileged_role(client, seed_users, role):
    _login(client, "admin@test.com")
    resp = client.post(
        "/api/v1/users",
        json={"email": f"try-{role}@test.com", "password": "somepassword", "full_name": "Try", "role": role},
    )
    assert resp.status_code == 403


def test_admin_cannot_edit_super_admin_account(client, seed_users):
    _login(client, "admin@test.com")
    super_admin_id = seed_users["super_admin"].id
    resp = client.patch(f"/api/v1/users/{super_admin_id}", json={"full_name": "Hijacked"})
    assert resp.status_code == 403


def test_admin_cannot_promote_employee_to_admin(client, seed_users):
    _login(client, "admin@test.com")
    employee_id = seed_users["employee"].id
    resp = client.patch(f"/api/v1/users/{employee_id}", json={"role": "admin"})
    assert resp.status_code == 403


def test_super_admin_can_promote_employee_to_rector(client, seed_users):
    _login(client, "superadmin@test.com")
    employee_id = seed_users["employee"].id
    resp = client.patch(f"/api/v1/users/{employee_id}", json={"role": "rector"})
    assert resp.status_code == 200
    assert resp.json()["role"] == "rector"


def test_super_admin_can_edit_existing_admin_account(client, seed_users):
    _login(client, "superadmin@test.com")
    admin_id = seed_users["admin"].id
    resp = client.patch(f"/api/v1/users/{admin_id}", json={"full_name": "Renamed Admin"})
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Renamed Admin"
