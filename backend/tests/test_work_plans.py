import io

from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def _submit_and_score(client, indicator_id, awarded_score, period="2026-07"):
    _login(client, "employee@test.com")
    ariza = client.post(
        "/api/v1/arizalar",
        data={"kpi_indicator_id": str(indicator_id), "period": period},
        files=[("files", ("cert.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf"))],
    ).json()

    _login(client, "admin@test.com")
    resp = client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": awarded_score})
    assert resp.status_code == 200
    return ariza


def test_create_work_plan(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    resp = client.post(
        "/api/v1/work-plans",
        json={
            "period": "2026-2027",
            "items": [{"kpi_indicator_id": seed_kpi_template["quality"].id, "planned_count": 4}],
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["period"] == "2026-2027"
    assert body["status"] == "active"
    assert body["items"][0]["planned_count"] == 4
    assert body["items"][0]["actual_count"] == 0
    assert body["items"][0]["classification"] == "under"


def test_create_duplicate_period_rejected(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    payload = {
        "period": "2026-2027",
        "items": [{"kpi_indicator_id": seed_kpi_template["quality"].id, "planned_count": 4}],
    }
    assert client.post("/api/v1/work-plans", json=payload).status_code == 201
    assert client.post("/api/v1/work-plans", json=payload).status_code == 400


def test_fulfillment_under_met_exceeded(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    client.post(
        "/api/v1/work-plans",
        json={
            "period": "2026-07",
            "items": [{"kpi_indicator_id": seed_kpi_template["quality"].id, "planned_count": 2}],
        },
    )

    # under: 0 scored yet
    resp = client.get(f"/api/v1/work-plans?user_id={seed_employee_with_position.id}&period=2026-07")
    assert resp.json()[0]["items"][0]["classification"] == "under"

    _submit_and_score(client, seed_kpi_template["quality"].id, 10, period="2026-07")
    _login(client, "employee@test.com")
    resp = client.get(f"/api/v1/work-plans?user_id={seed_employee_with_position.id}&period=2026-07")
    row = resp.json()[0]["items"][0]
    assert row["actual_count"] == 1
    assert row["classification"] == "under"

    _submit_and_score(client, seed_kpi_template["quality"].id, 10, period="2026-07")
    _login(client, "employee@test.com")
    resp = client.get(f"/api/v1/work-plans?user_id={seed_employee_with_position.id}&period=2026-07")
    row = resp.json()[0]["items"][0]
    assert row["actual_count"] == 2
    assert row["classification"] == "met"

    _submit_and_score(client, seed_kpi_template["quality"].id, 10, period="2026-07")
    _login(client, "employee@test.com")
    resp = client.get(f"/api/v1/work-plans?user_id={seed_employee_with_position.id}&period=2026-07")
    row = resp.json()[0]["items"][0]
    assert row["actual_count"] == 3
    assert row["classification"] == "exceeded"


def test_owner_sees_own_plan_others_forbidden(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    client.post(
        "/api/v1/work-plans",
        json={
            "period": "2026-2027",
            "items": [{"kpi_indicator_id": seed_kpi_template["quality"].id, "planned_count": 4}],
        },
    )

    resp = client.get("/api/v1/work-plans")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    _login(client, "other@test.com")
    denied = client.get(f"/api/v1/work-plans?user_id={seed_employee_with_position.id}")
    assert denied.status_code == 403


def test_admin_and_manager_can_view_employee_plan(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    client.post(
        "/api/v1/work-plans",
        json={
            "period": "2026-2027",
            "items": [{"kpi_indicator_id": seed_kpi_template["quality"].id, "planned_count": 4}],
        },
    )

    _login(client, "superadmin@test.com")
    resp = client.get(f"/api/v1/work-plans?user_id={seed_employee_with_position.id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    _login(client, "manager@test.com")
    resp2 = client.get(f"/api/v1/work-plans?user_id={seed_employee_with_position.id}")
    assert resp2.status_code == 200
    assert len(resp2.json()) == 1


def test_close_work_plan(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    created = client.post(
        "/api/v1/work-plans",
        json={
            "period": "2026-2027",
            "items": [{"kpi_indicator_id": seed_kpi_template["quality"].id, "planned_count": 4}],
        },
    ).json()

    resp = client.patch(f"/api/v1/work-plans/{created['id']}/close")
    assert resp.status_code == 200
    assert resp.json()["status"] == "closed"

    _login(client, "other@test.com")
    denied = client.patch(f"/api/v1/work-plans/{created['id']}/close")
    assert denied.status_code == 403
