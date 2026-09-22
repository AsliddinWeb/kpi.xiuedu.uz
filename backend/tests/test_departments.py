from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def test_list_departments_requires_admin(client, seed_users, seed_departments):
    _login(client, "manager@test.com")
    resp = client.get("/api/v1/departments")
    assert resp.status_code == 403


def test_list_departments_includes_nested_positions(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/departments")
    assert resp.status_code == 200
    by_name = {d["name"]: d for d in resp.json()}
    assert [p["title"] for p in by_name["IT"]["positions"]] == ["Developer"]
    assert by_name["Finance"]["positions"] == []


def test_create_department(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.post("/api/v1/departments", json={"name": "Marketing"})
    assert resp.status_code == 201
    assert resp.json()["name"] == "Marketing"


def test_create_department_with_type(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.post("/api/v1/departments", json={"name": "Filologiya fakulteti", "department_type": "faculty"})
    assert resp.status_code == 201
    assert resp.json()["department_type"] == "faculty"


def test_create_department_defaults_to_administrative_type(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.post("/api/v1/departments", json={"name": "Marketing 2"})
    assert resp.status_code == 201
    assert resp.json()["department_type"] == "administrative"


def test_get_department_by_id(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    it_id = seed_departments["it"].id
    resp = client.get(f"/api/v1/departments/{it_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == it_id


def test_get_department_not_found(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/departments/9999")
    assert resp.status_code == 404


def test_create_department_with_unknown_parent(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.post("/api/v1/departments", json={"name": "Sub", "parent_department_id": 9999})
    assert resp.status_code == 404


def test_delete_department_blocked_when_has_positions(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    it_id = seed_departments["it"].id
    resp = client.delete(f"/api/v1/departments/{it_id}")
    assert resp.status_code == 400


def test_delete_empty_department_succeeds(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    finance_id = seed_departments["finance"].id
    resp = client.delete(f"/api/v1/departments/{finance_id}")
    assert resp.status_code == 204


def test_create_position(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    it_id = seed_departments["it"].id
    resp = client.post(f"/api/v1/departments/{it_id}/positions", json={"title": "QA Engineer"})
    assert resp.status_code == 201
    assert resp.json()["title"] == "QA Engineer"


def test_delete_position_blocked_when_assigned(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    position_id = seed_departments["dev_position"].id

    it_id = seed_departments["it"].id
    client.post(
        "/api/v1/users",
        json={
            "email": "assigned@test.com",
            "password": "somepassword",
            "full_name": "Assigned",
            "role": "employee",
            "department_id": it_id,
            "position_id": position_id,
        },
    )

    resp = client.delete(f"/api/v1/positions/{position_id}")
    assert resp.status_code == 400


def test_update_position_title(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    position_id = seed_departments["dev_position"].id
    resp = client.patch(f"/api/v1/positions/{position_id}", json={"title": "Senior Developer"})
    assert resp.status_code == 200
    assert resp.json()["title"] == "Senior Developer"


def test_create_position_with_minimal_score(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    it_id = seed_departments["it"].id
    resp = client.post(
        f"/api/v1/departments/{it_id}/positions", json={"title": "Katta o'qituvchi", "minimal_score": 60}
    )
    assert resp.status_code == 201
    assert resp.json()["minimal_score"] == 60


def test_update_position_minimal_score(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    position_id = seed_departments["dev_position"].id
    resp = client.patch(f"/api/v1/positions/{position_id}", json={"minimal_score": 70})
    assert resp.status_code == 200
    assert resp.json()["minimal_score"] == 70
