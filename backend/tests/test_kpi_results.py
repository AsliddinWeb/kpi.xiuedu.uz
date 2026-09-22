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
    client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": awarded_score})


def test_employee_can_list_own_kpi_results(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30)

    _login(client, "employee@test.com")
    resp = client.get(f"/api/v1/kpi-results?user_id={seed_employee_with_position.id}")
    assert resp.status_code == 200
    assert resp.json()[0]["total_score"] == 30


def test_employee_cannot_list_others_kpi_results(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30)

    _login(client, "other@test.com")
    resp = client.get(f"/api/v1/kpi-results?user_id={seed_employee_with_position.id}")
    assert resp.status_code == 403


def test_employee_cannot_list_all_kpi_results(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.get("/api/v1/kpi-results")
    assert resp.status_code == 403


def test_admin_can_approve_kpi_result(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30)

    _login(client, "superadmin@test.com")
    results = client.get("/api/v1/kpi-results?period=2026-07").json()
    resp = client.patch(f"/api/v1/kpi-results/{results[0]['id']}/approve")
    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"
