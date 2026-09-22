import io

import openpyxl

from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def _build_xlsx(header: list[str], rows: list[list]) -> io.BytesIO:
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.append(header)
    for row in rows:
        sheet.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)
    return buffer


def test_create_employee_requires_admin(client, seed_users, seed_departments):
    _login(client, "manager@test.com")
    resp = client.post(
        "/api/v1/users",
        json={"email": "new@test.com", "password": "somepassword", "full_name": "New", "role": "employee"},
    )
    assert resp.status_code == 403


def test_create_employee_success(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/users",
        json={
            "email": "new@test.com",
            "password": "somepassword",
            "full_name": "New Employee",
            "role": "employee",
            "department_id": seed_departments["it"].id,
            "position_id": seed_departments["dev_position"].id,
        },
    )
    assert resp.status_code == 201
    assert resp.json()["email"] == "new@test.com"


def test_create_employee_with_academic_degree(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/users",
        json={
            "email": "degreed@test.com",
            "password": "somepassword",
            "full_name": "Degreed Employee",
            "role": "employee",
            "academic_degree": "phd",
        },
    )
    assert resp.status_code == 201
    assert resp.json()["academic_degree"] == "phd"


def test_update_employee_academic_degree(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    employee_id = seed_users["employee"].id
    assert seed_users["employee"].academic_degree.value == "none"

    resp = client.patch(f"/api/v1/users/{employee_id}", json={"academic_degree": "dsc"})
    assert resp.status_code == 200
    assert resp.json()["academic_degree"] == "dsc"


def test_create_employee_duplicate_email(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/users",
        json={"email": "employee@test.com", "password": "somepassword", "full_name": "Dup", "role": "employee"},
    )
    assert resp.status_code == 400


def test_create_employee_position_department_mismatch(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/users",
        json={
            "email": "mismatch@test.com",
            "password": "somepassword",
            "full_name": "Mismatch",
            "role": "employee",
            "department_id": seed_departments["finance"].id,
            "position_id": seed_departments["dev_position"].id,
        },
    )
    assert resp.status_code == 400


def test_update_employee_reassigns_manager(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    employee_id = seed_users["other_employee"].id
    manager_id = seed_users["manager"].id

    resp = client.patch(f"/api/v1/users/{employee_id}", json={"manager_id": manager_id})
    assert resp.status_code == 200
    assert resp.json()["manager_id"] == manager_id


def test_update_employee_can_clear_manager_with_explicit_null(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    employee_id = seed_users["employee"].id
    assert seed_users["employee"].manager_id is not None

    resp = client.patch(f"/api/v1/users/{employee_id}", json={"manager_id": None})
    assert resp.status_code == 200
    assert resp.json()["manager_id"] is None


def test_update_employee_can_clear_department_and_bonus_override(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    employee_id = seed_users["other_employee"].id

    resp = client.patch(
        f"/api/v1/users/{employee_id}",
        json={"department_id": seed_departments["it"].id, "bonus_fund_override": 500},
    )
    assert resp.status_code == 200
    assert resp.json()["department_id"] == seed_departments["it"].id
    assert resp.json()["bonus_fund_override"] == 500

    resp = client.patch(
        f"/api/v1/users/{employee_id}",
        json={"department_id": None, "bonus_fund_override": None},
    )
    assert resp.status_code == 200
    assert resp.json()["department_id"] is None
    assert resp.json()["bonus_fund_override"] is None


def test_update_employee_omitted_fields_stay_unchanged(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    employee_id = seed_users["employee"].id
    manager_id = seed_users["employee"].manager_id

    resp = client.patch(f"/api/v1/users/{employee_id}", json={"full_name": "Renamed"})
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Renamed"
    assert resp.json()["manager_id"] == manager_id


def test_update_employee_not_found(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.patch("/api/v1/users/9999", json={"full_name": "Ghost"})
    assert resp.status_code == 404


def test_import_requires_admin(client, seed_users, seed_departments):
    _login(client, "manager@test.com")
    xlsx = _build_xlsx(["email", "full_name", "role"], [["a@test.com", "A", "employee"]])
    resp = client.post(
        "/api/v1/users/import",
        files={"file": ("employees.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert resp.status_code == 403


def test_import_missing_columns(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    xlsx = _build_xlsx(["email", "name"], [["a@test.com", "A"]])
    resp = client.post(
        "/api/v1/users/import",
        files={"file": ("employees.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert resp.status_code == 400


def test_import_unreadable_file(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/users/import",
        files={"file": ("employees.xlsx", io.BytesIO(b"not a real xlsx"), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert resp.status_code == 400


def test_download_import_template(client, seed_users):
    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/users/import-template")
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    workbook = openpyxl.load_workbook(io.BytesIO(resp.content))
    header = [cell.value for cell in workbook.active[1]]
    assert header == ["email", "full_name", "role", "department", "position", "manager_email"]


def test_import_creates_users_and_reports_errors(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    xlsx = _build_xlsx(
        ["email", "full_name", "role", "department", "position", "manager_email"],
        [
            ["lead@test.com", "Lead", "manager", "IT", "Developer", None],
            ["dev@test.com", "Dev", "employee", "IT", "Developer", "lead@test.com"],
            ["baddept@test.com", "Bad", "employee", "Nowhere", "Developer", None],
            ["badrole@test.com", "Bad", "ceo", "IT", "Developer", None],
            ["employee@test.com", "Dup", "employee", "IT", "Developer", None],
        ],
    )
    resp = client.post(
        "/api/v1/users/import",
        files={"file": ("employees.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 5
    assert body["created"] == 2
    assert body["failed"] == 3

    statuses = {row["email"]: row["status"] for row in body["results"]}
    assert statuses["lead@test.com"] == "created"
    assert statuses["dev@test.com"] == "created"
    assert statuses["baddept@test.com"] == "error"
    assert statuses["badrole@test.com"] == "error"
    assert statuses["employee@test.com"] == "error"

    me_resp = client.post("/api/v1/auth/login", json={"email": "dev@test.com", "password": "wrong"})
    assert me_resp.status_code == 401  # created with a random temp password, not TEST_PASSWORD
