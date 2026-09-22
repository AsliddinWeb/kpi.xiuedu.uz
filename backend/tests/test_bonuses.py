import io

from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def _submit_and_score(client, indicator_id, awarded_score, period="2026-07", filename="cert.pdf"):
    _login(client, "employee@test.com")
    ariza = client.post(
        "/api/v1/arizalar",
        data={"kpi_indicator_id": str(indicator_id), "period": period},
        files=[("files", (filename, io.BytesIO(b"%PDF-1.4 fake"), "application/pdf"))],
    ).json()

    _login(client, "admin@test.com")
    client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": awarded_score})
    return ariza


def _approved_kpi_result(client, seed_kpi_template, period="2026-07"):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30, period=period)
    _submit_and_score(client, seed_kpi_template["tasks"].id, 50, period=period, filename="paper.pdf")

    _login(client, "superadmin@test.com")
    results = client.get(f"/api/v1/kpi-results?period={period}").json()
    for result in results:
        client.patch(f"/api/v1/kpi-results/{result['id']}/approve")


def test_list_bonuses_requires_admin(client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position):
    _approved_kpi_result(client, seed_kpi_template)
    _login(client, "manager@test.com")
    resp = client.get("/api/v1/bonuses?period=2026-07")
    assert resp.status_code == 403


def test_bonus_uses_position_fund(client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position):
    seed_departments["dev_position"].bonus_fund = 1_000_000
    _approved_kpi_result(client, seed_kpi_template)

    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/bonuses?period=2026-07")
    assert resp.status_code == 200
    row = resp.json()[0]
    assert row["bonus_fund"] == 1_000_000
    assert row["final_kpi_percent"] == 80.0
    assert row["bonus_amount"] == 800_000.0


def test_bonus_employee_override_wins_over_position(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    seed_departments["dev_position"].bonus_fund = 1_000_000
    seed_employee_with_position.bonus_fund_override = 500_000
    _approved_kpi_result(client, seed_kpi_template)

    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/bonuses?period=2026-07")
    row = resp.json()[0]
    assert row["bonus_fund"] == 500_000
    assert row["bonus_amount"] == 400_000.0


def test_bonus_excludes_non_approved_kpi_results(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30)
    _submit_and_score(client, seed_kpi_template["tasks"].id, 50, filename="paper.pdf")

    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/bonuses?period=2026-07")
    assert resp.json() == []


def test_bonus_status_and_approve_flow(client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position):
    _approved_kpi_result(client, seed_kpi_template)

    _login(client, "superadmin@test.com")
    status_before = client.get("/api/v1/bonuses/status?period=2026-07").json()
    assert status_before["approved"] is False

    approve = client.post("/api/v1/bonuses/approve", json={"period": "2026-07"})
    assert approve.status_code == 200
    assert approve.json()["approved"] is True

    status_after = client.get("/api/v1/bonuses/status?period=2026-07").json()
    assert status_after["approved"] is True

    # idempotent
    second_approve = client.post("/api/v1/bonuses/approve", json={"period": "2026-07"})
    assert second_approve.status_code == 200


def test_export_blocked_until_bonus_approved(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _approved_kpi_result(client, seed_kpi_template)

    _login(client, "superadmin@test.com")
    blocked = client.post("/api/v1/exports", json={"period": "2026-07"})
    assert blocked.status_code == 400

    client.post("/api/v1/bonuses/approve", json={"period": "2026-07"})

    allowed = client.post("/api/v1/exports", json={"period": "2026-07"})
    assert allowed.status_code == 201


def test_load_reduction_correction_plan_cuts_bonus(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    seed_departments["dev_position"].bonus_fund = 1_000_000
    _approved_kpi_result(client, seed_kpi_template)

    _login(client, "superadmin@test.com")
    client.post(
        "/api/v1/correction-plans",
        json={
            "user_id": seed_employee_with_position.id,
            "period": "2026-07",
            "stage": "load_reduction",
            "reason": "Past natijalar",
            "load_reduction_percent": 25,
        },
    )

    resp = client.get("/api/v1/bonuses?period=2026-07")
    row = resp.json()[0]
    assert row["bonus_amount"] == 600_000.0
