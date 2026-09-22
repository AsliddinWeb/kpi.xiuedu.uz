from app.core.security import hash_password
from app.models.department import Department, DepartmentType
from app.models.user import User, UserRole
from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def test_employee_sees_only_self(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.get("/api/v1/users")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["email"] == "employee@test.com"


def test_rector_faculty_filter_includes_kafedra_employees(client, db_session, seed_users):
    faculty = Department(name="Pedagogika fakulteti", department_type=DepartmentType.faculty)
    db_session.add(faculty)
    db_session.flush()
    kafedra = Department(
        name="Psixologiya kafedrasi", department_type=DepartmentType.kafedra, parent_department_id=faculty.id
    )
    other_faculty = Department(name="Iqtisodiyot fakulteti", department_type=DepartmentType.faculty)
    db_session.add_all([kafedra, other_faculty])
    db_session.flush()

    in_faculty = User(
        email="in-faculty@test.com",
        password_hash=hash_password(TEST_PASSWORD),
        full_name="In Faculty",
        role=UserRole.employee,
        department_id=faculty.id,
    )
    in_kafedra = User(
        email="in-kafedra@test.com",
        password_hash=hash_password(TEST_PASSWORD),
        full_name="In Kafedra",
        role=UserRole.employee,
        department_id=kafedra.id,
    )
    elsewhere = User(
        email="elsewhere@test.com",
        password_hash=hash_password(TEST_PASSWORD),
        full_name="Elsewhere",
        role=UserRole.employee,
        department_id=other_faculty.id,
    )
    rector = User(
        email="rector@test.com", password_hash=hash_password(TEST_PASSWORD), full_name="Rector", role=UserRole.rector
    )
    db_session.add_all([in_faculty, in_kafedra, elsewhere, rector])
    db_session.commit()

    _login(client, "rector@test.com")
    resp = client.get(f"/api/v1/users?faculty_id={faculty.id}")
    assert resp.status_code == 200
    emails = {u["email"] for u in resp.json()}
    assert "in-faculty@test.com" in emails
    assert "in-kafedra@test.com" in emails
    assert "elsewhere@test.com" not in emails


def test_manager_sees_self_and_direct_reports(client, seed_users):
    _login(client, "manager@test.com")
    resp = client.get("/api/v1/users")
    emails = {u["email"] for u in resp.json()}
    assert emails == {"manager@test.com", "employee@test.com"}


def test_admin_sees_everyone(client, seed_users):
    _login(client, "admin@test.com")
    resp = client.get("/api/v1/users")
    emails = {u["email"] for u in resp.json()}
    assert emails == {
        "superadmin@test.com",
        "manager@test.com",
        "employee@test.com",
        "other@test.com",
        "admin@test.com",
        "inactive@test.com",
    }


def test_get_user_self(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.get(f"/api/v1/users/{seed_users['employee'].id}")
    assert resp.status_code == 200
    assert resp.json()["email"] == "employee@test.com"


def test_get_user_admin_sees_anyone(client, seed_users):
    _login(client, "admin@test.com")
    resp = client.get(f"/api/v1/users/{seed_users['employee'].id}")
    assert resp.status_code == 200


def test_get_user_manager_sees_own_report(client, seed_users):
    _login(client, "manager@test.com")
    resp = client.get(f"/api/v1/users/{seed_users['employee'].id}")
    assert resp.status_code == 200


def test_get_user_manager_forbidden_for_unrelated_user(client, seed_users):
    _login(client, "manager@test.com")
    resp = client.get(f"/api/v1/users/{seed_users['other_employee'].id}")
    assert resp.status_code == 403


def test_get_user_employee_forbidden_for_someone_else(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.get(f"/api/v1/users/{seed_users['other_employee'].id}")
    assert resp.status_code == 403


def test_get_user_not_found(client, seed_users):
    _login(client, "admin@test.com")
    resp = client.get("/api/v1/users/9999")
    assert resp.status_code == 404


def test_users_requires_auth(client, seed_users):
    resp = client.get("/api/v1/users")
    assert resp.status_code == 401


def test_update_own_full_name(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.patch("/api/v1/users/me", json={"full_name": "Renamed Self"})
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Renamed Self"


def test_change_own_password_success(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.patch(
        "/api/v1/users/me/password",
        json={"current_password": TEST_PASSWORD, "new_password": "brandNewPass1"},
    )
    assert resp.status_code == 204

    client.post("/api/v1/auth/logout")
    login_resp = client.post("/api/v1/auth/login", json={"email": "employee@test.com", "password": "brandNewPass1"})
    assert login_resp.status_code == 200


def test_change_own_password_wrong_current_password(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.patch(
        "/api/v1/users/me/password",
        json={"current_password": "wrong-password", "new_password": "brandNewPass1"},
    )
    assert resp.status_code == 400


def test_change_own_password_too_short(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.patch(
        "/api/v1/users/me/password",
        json={"current_password": TEST_PASSWORD, "new_password": "short"},
    )
    assert resp.status_code == 422
