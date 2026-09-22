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


def test_semester_review_requires_oversight(client, seed_users):
    _login(client, "manager@test.com")
    resp = client.post("/api/v1/summaries/semester-review", json={"period": "2026-07", "half": 1})
    assert resp.status_code == 403


def test_semester_review_generates_and_persists(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30, period="2026-07")

    _login(client, "superadmin@test.com")
    resp = client.post("/api/v1/summaries/semester-review", json={"period": "2026-07", "half": 1})
    assert resp.status_code == 201
    body = resp.json()
    assert body["type"] == "semester_review"
    assert body["period"] == "2026-07"
    assert body["half"] == 1
    assert body["payload"]["organization_average_score"] == 30

    listed = client.get("/api/v1/summaries?type=semester_review").json()
    assert len(listed) == 1

    detail = client.get(f"/api/v1/summaries/{body['id']}").json()
    assert detail["id"] == body["id"]


def test_semester_review_invalid_half_rejected(client, seed_users):
    _login(client, "superadmin@test.com")
    resp = client.post("/api/v1/summaries/semester-review", json={"period": "2026-07", "half": 3})
    assert resp.status_code == 400


def test_year_end_includes_work_plan_fulfillment(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _login(client, "employee@test.com")
    client.post(
        "/api/v1/work-plans",
        json={
            "period": "2026-2027",
            "items": [{"kpi_indicator_id": seed_kpi_template["quality"].id, "planned_count": 1}],
        },
    )
    _submit_and_score(client, seed_kpi_template["quality"].id, 30, period="2026-2027")

    _login(client, "superadmin@test.com")
    resp = client.post("/api/v1/summaries/year-end", json={"academic_year": "2026-2027"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["type"] == "year_end"
    assert body["payload"]["work_plan_fulfillment"]["met"] == 1
    assert len(body["payload"]["ranking"]) >= 1


def test_early_warning_flags_below_minimal_score(
    client, db_session, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    seed_departments["dev_position"].minimal_score = 50
    db_session.commit()

    _submit_and_score(client, seed_kpi_template["quality"].id, 30, period="2026-07")

    _login(client, "superadmin@test.com")
    resp = client.post("/api/v1/summaries/early-warning", json={"period": "2026-07"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["type"] == "early_warning"
    flagged_ids = [f["user_id"] for f in body["payload"]["flagged"]]
    assert seed_employee_with_position.id in flagged_ids


def test_early_warning_does_not_flag_above_minimal_score(
    client, db_session, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    seed_departments["dev_position"].minimal_score = 10
    db_session.commit()

    _submit_and_score(client, seed_kpi_template["quality"].id, 30, period="2026-07")

    _login(client, "superadmin@test.com")
    resp = client.post("/api/v1/summaries/early-warning", json={"period": "2026-07"})
    assert resp.status_code == 201
    flagged_ids = [f["user_id"] for f in resp.json()["payload"]["flagged"]]
    assert seed_employee_with_position.id not in flagged_ids


def test_early_warning_does_not_create_correction_plan(
    client, db_session, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    seed_departments["dev_position"].minimal_score = 50
    db_session.commit()
    _submit_and_score(client, seed_kpi_template["quality"].id, 30, period="2026-07")

    _login(client, "superadmin@test.com")
    client.post("/api/v1/summaries/early-warning", json={"period": "2026-07"})

    plans = client.get("/api/v1/correction-plans").json()
    assert plans == []
