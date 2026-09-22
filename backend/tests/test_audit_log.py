from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200
    return resp


def test_login_creates_audit_entry(client, seed_users):
    _login(client, "admin@test.com")
    resp = client.get("/api/v1/audit-log")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    entry = body["items"][0]
    assert entry["action"] == "login"
    assert entry["entity"] == "user"
    assert entry["user_full_name"] == "Admin"


def test_department_mutations_create_audit_entries(client, seed_users):
    _login(client, "admin@test.com")

    create_resp = client.post("/api/v1/departments", json={"name": "Marketing"})
    assert create_resp.status_code == 201
    department_id = create_resp.json()["id"]

    update_resp = client.patch(f"/api/v1/departments/{department_id}", json={"name": "Marketing & PR"})
    assert update_resp.status_code == 200

    delete_resp = client.delete(f"/api/v1/departments/{department_id}")
    assert delete_resp.status_code == 204

    log_resp = client.get("/api/v1/audit-log")
    assert log_resp.status_code == 200
    actions = [(e["action"], e["entity"], e["entity_id"]) for e in log_resp.json()["items"]]

    assert ("create", "department", department_id) in actions
    assert ("update", "department", department_id) in actions
    assert ("delete", "department", department_id) in actions


def test_audit_log_ordered_most_recent_first(client, seed_users):
    _login(client, "admin@test.com")
    client.post("/api/v1/departments", json={"name": "First"})
    client.post("/api/v1/departments", json={"name": "Second"})

    resp = client.get("/api/v1/audit-log")
    items = resp.json()["items"]
    timestamps = [item["created_at"] for item in items]
    assert timestamps == sorted(timestamps, reverse=True)


def test_audit_log_filter_by_action(client, seed_users):
    _login(client, "admin@test.com")
    client.post("/api/v1/departments", json={"name": "FilterDept"})

    resp = client.get("/api/v1/audit-log", params={"action": "create"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    assert all(item["action"] == "create" for item in body["items"])


def test_audit_log_filter_by_entity(client, seed_users):
    _login(client, "admin@test.com")
    client.post("/api/v1/departments", json={"name": "FilterDept2"})

    resp = client.get("/api/v1/audit-log", params={"entity": "department"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] >= 1
    assert all(item["entity"] == "department" for item in body["items"])


def test_audit_log_filter_combination_narrows_results(client, seed_users):
    _login(client, "admin@test.com")
    dept_id = client.post("/api/v1/departments", json={"name": "FilterDept3"}).json()["id"]
    client.patch(f"/api/v1/departments/{dept_id}", json={"name": "FilterDept3 renamed"})

    resp = client.get("/api/v1/audit-log", params={"action": "update", "entity": "department"})
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) >= 1
    assert all(item["action"] == "update" and item["entity"] == "department" for item in items)


def test_audit_log_pagination(client, seed_users):
    _login(client, "admin@test.com")
    for i in range(5):
        client.post("/api/v1/departments", json={"name": f"Dept {i}"})

    resp = client.get("/api/v1/audit-log", params={"limit": 2, "offset": 0})
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["items"]) == 2
    assert body["total"] >= 6  # 5 departments + 1 login
