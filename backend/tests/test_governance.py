from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def test_create_correction_plan_requires_admin(client, seed_users):
    _login(client, "manager@test.com")
    resp = client.post(
        "/api/v1/correction-plans",
        json={"user_id": seed_users["employee"].id, "period": "2026-07", "stage": "warning", "reason": "Past natija"},
    )
    assert resp.status_code == 403


def test_correction_plan_create_and_resolve(client, seed_users):
    _login(client, "admin@test.com")
    created = client.post(
        "/api/v1/correction-plans",
        json={"user_id": seed_users["employee"].id, "period": "2026-07", "stage": "warning", "reason": "Past natija"},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "active"

    resolved = client.patch(f"/api/v1/correction-plans/{body['id']}/resolve")
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"


def test_manager_can_list_but_not_create_correction_plans(client, seed_users):
    _login(client, "manager@test.com")
    resp = client.get("/api/v1/correction-plans")
    assert resp.status_code == 200


def test_declare_and_resolve_force_majeure(client, seed_users):
    _login(client, "manager@test.com")
    created = client.post(
        "/api/v1/force-majeure",
        json={
            "affected_user_id": seed_users["employee"].id,
            "period": "2026-07",
            "category": "system_outage",
            "description": "HEMIS ishlamadi",
            "extension_days": 5,
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "pending"

    _login(client, "admin@test.com")
    acknowledged = client.patch(f"/api/v1/force-majeure/{body['id']}/acknowledge")
    assert acknowledged.status_code == 200
    assert acknowledged.json()["status"] == "acknowledged"

    resolved = client.patch(f"/api/v1/force-majeure/{body['id']}/resolve")
    assert resolved.status_code == 200
    assert resolved.json()["status"] == "resolved"


def test_employee_cannot_declare_force_majeure(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.post(
        "/api/v1/force-majeure",
        json={"period": "2026-07", "category": "other", "description": "test"},
    )
    assert resp.status_code == 403


def test_employee_only_sees_own_or_org_wide_force_majeure(client, seed_users):
    _login(client, "manager@test.com")
    client.post(
        "/api/v1/force-majeure",
        json={
            "affected_user_id": seed_users["other_employee"].id,
            "period": "2026-07",
            "category": "other",
            "description": "boshqasi uchun",
        },
    )
    client.post(
        "/api/v1/force-majeure",
        json={"period": "2026-07", "category": "other", "description": "butun tashkilot uchun"},
    )

    _login(client, "employee@test.com")
    resp = client.get("/api/v1/force-majeure")
    assert resp.status_code == 200
    descriptions = {row["description"] for row in resp.json()}
    assert "boshqasi uchun" not in descriptions
    assert "butun tashkilot uchun" in descriptions


def test_incentive_create_and_revoke(client, seed_users):
    _login(client, "admin@test.com")
    created = client.post(
        "/api/v1/incentives",
        json={
            "user_id": seed_users["employee"].id,
            "period": "2026-07",
            "type": "certificate",
            "title": "Eng faol o'qituvchi",
        },
    )
    assert created.status_code == 201
    body = created.json()
    assert body["status"] == "active"

    revoked = client.patch(f"/api/v1/incentives/{body['id']}/revoke", json={"revoked_reason": "Xato ma'lumot"})
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "revoked"

    second_revoke = client.patch(f"/api/v1/incentives/{body['id']}/revoke", json={"revoked_reason": "Yana"})
    assert second_revoke.status_code == 400


def test_employee_sees_only_own_incentives(client, seed_users):
    _login(client, "admin@test.com")
    client.post(
        "/api/v1/incentives",
        json={"user_id": seed_users["employee"].id, "period": "2026-07", "type": "title", "title": "A"},
    )
    client.post(
        "/api/v1/incentives",
        json={"user_id": seed_users["other_employee"].id, "period": "2026-07", "type": "title", "title": "B"},
    )

    _login(client, "employee@test.com")
    resp = client.get("/api/v1/incentives")
    assert resp.status_code == 200
    titles = {row["title"] for row in resp.json()}
    assert titles == {"A"}


def test_restrict_and_restore_user(client, seed_users):
    _login(client, "admin@test.com")
    employee_id = seed_users["employee"].id

    restricted = client.patch(f"/api/v1/users/{employee_id}/restrict", json={"is_restricted": True})
    assert restricted.status_code == 200
    assert restricted.json()["is_restricted"] is True

    deactivated = client.patch(f"/api/v1/users/{employee_id}", json={"is_active": False})
    assert deactivated.status_code == 200

    removed = client.get("/api/v1/users/removed")
    assert removed.status_code == 200
    assert any(u["id"] == employee_id for u in removed.json())

    restored = client.patch(f"/api/v1/users/{employee_id}/restore")
    assert restored.status_code == 200
    assert restored.json()["is_active"] is True
