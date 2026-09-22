from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def test_create_requires_admin(client, seed_users, seed_kpi_template):
    _login(client, "manager@test.com")
    resp = client.post(
        "/api/v1/category-head-approvers",
        json={"kpi_category_id": seed_kpi_template["teaching_category"].id, "user_id": seed_users["manager"].id},
    )
    assert resp.status_code == 403


def test_create_and_list(client, seed_users, seed_kpi_template):
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/category-head-approvers",
        json={
            "kpi_category_id": seed_kpi_template["teaching_category"].id,
            "user_id": seed_users["other_employee"].id,
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["category_name"] == seed_kpi_template["teaching_category"].name

    listed = client.get("/api/v1/category-head-approvers").json()
    assert len(listed) == 1


def test_create_duplicate_rejected(client, seed_users, seed_kpi_template):
    _login(client, "superadmin@test.com")
    payload = {
        "kpi_category_id": seed_kpi_template["teaching_category"].id,
        "user_id": seed_users["other_employee"].id,
    }
    assert client.post("/api/v1/category-head-approvers", json=payload).status_code == 201
    assert client.post("/api/v1/category-head-approvers", json=payload).status_code == 400


def test_create_scoped_to_indicator(client, seed_users, seed_kpi_template):
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/category-head-approvers",
        json={
            "kpi_category_id": seed_kpi_template["teaching_category"].id,
            "kpi_indicator_id": seed_kpi_template["quality"].id,
            "user_id": seed_users["other_employee"].id,
        },
    )
    assert resp.status_code == 201
    assert resp.json()["kpi_indicator_id"] == seed_kpi_template["quality"].id
    assert resp.json()["indicator_name"] == seed_kpi_template["quality"].name


def test_create_indicator_from_different_category_rejected(client, seed_users, seed_kpi_template):
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/category-head-approvers",
        json={
            "kpi_category_id": seed_kpi_template["teaching_category"].id,
            "kpi_indicator_id": seed_kpi_template["tasks"].id,  # belongs to science_category, not teaching_category
            "user_id": seed_users["other_employee"].id,
        },
    )
    assert resp.status_code == 404


def test_delete(client, seed_users, seed_kpi_template):
    _login(client, "superadmin@test.com")
    created = client.post(
        "/api/v1/category-head-approvers",
        json={
            "kpi_category_id": seed_kpi_template["teaching_category"].id,
            "user_id": seed_users["other_employee"].id,
        },
    ).json()

    resp = client.delete(f"/api/v1/category-head-approvers/{created['id']}")
    assert resp.status_code == 204
    assert client.get("/api/v1/category-head-approvers").json() == []
