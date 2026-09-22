from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200
    return resp


SQLI_PAYLOADS = [
    "' OR '1'='1",
    "' OR '1'='1' --",
    "admin@test.com' --",
    "'; DROP TABLE users; --",
    "' UNION SELECT 1,2,3--",
]


def test_login_sql_injection_payloads_rejected(client, seed_users):
    for payload in SQLI_PAYLOADS:
        resp = client.post("/api/v1/auth/login", json={"email": payload, "password": payload})
        # EmailStr validation rejects most of these before they reach the DB (422);
        # anything that is a syntactically valid email must still fail auth (401).
        assert resp.status_code in (401, 422), f"payload should not bypass auth: {payload}"
        assert resp.status_code != 200


def test_login_sql_injection_does_not_break_table(client, seed_users):
    client.post(
        "/api/v1/auth/login",
        json={"email": "'; DROP TABLE users; --", "password": "x"},
    )
    # users table must still be intact and usable after the injection attempt
    resp = _login(client, "admin@test.com")
    assert resp.status_code == 200


def test_employee_cannot_list_all_users(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.get("/api/v1/users")
    assert resp.status_code == 200
    emails = {u["email"] for u in resp.json()}
    assert emails == {"employee@test.com"}


def test_manager_only_sees_own_team(client, seed_users):
    _login(client, "manager@test.com")
    resp = client.get("/api/v1/users")
    assert resp.status_code == 200
    emails = {u["email"] for u in resp.json()}
    assert "other@test.com" not in emails
    assert "employee@test.com" in emails


def test_employee_cannot_create_department(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.post("/api/v1/departments", json={"name": "Hack Dept"})
    assert resp.status_code == 403


def test_employee_cannot_access_audit_log(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.get("/api/v1/audit-log")
    assert resp.status_code == 403


def test_manager_cannot_access_audit_log(client, seed_users):
    _login(client, "manager@test.com")
    resp = client.get("/api/v1/audit-log")
    assert resp.status_code == 403


def test_admin_can_access_audit_log(client, seed_users):
    _login(client, "admin@test.com")
    resp = client.get("/api/v1/audit-log")
    assert resp.status_code == 200
    assert "items" in resp.json()


def test_employee_cannot_manage_category_reviewers(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.get("/api/v1/category-reviewers")
    assert resp.status_code == 403


def test_unauthenticated_requests_rejected(client):
    for path in ("/api/v1/users", "/api/v1/departments", "/api/v1/audit-log", "/api/v1/bonuses?period=2026-01"):
        resp = client.get(path)
        assert resp.status_code == 401, f"{path} should require auth"
