import io

from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def _submit_and_score(client, indicator_id, awarded_score, period, filename="cert.pdf"):
    _login(client, "employee@test.com")
    ariza = client.post(
        "/api/v1/arizalar",
        data={"kpi_indicator_id": str(indicator_id), "period": period},
        files=[("files", (filename, io.BytesIO(b"%PDF-1.4 fake"), "application/pdf"))],
    ).json()

    _login(client, "admin@test.com")
    client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": awarded_score})
    return ariza


def test_public_leaderboard_requires_no_auth_and_returns_top_scorers(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    period = seed_kpi_template["template"].academic_year
    _submit_and_score(client, seed_kpi_template["quality"].id, 30, period=period)
    _submit_and_score(client, seed_kpi_template["tasks"].id, 50, period=period, filename="paper.pdf")

    client.cookies.clear()  # no login at all — this must work anonymously
    resp = client.get("/api/v1/public/leaderboard")
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["full_name"] == seed_employee_with_position.full_name
    assert rows[0]["total_score"] == 80.0
    assert rows[0]["template_max_score"] == 100
    assert rows[0]["department_name"] == "IT"
    # no internal identifiers leaked to an anonymous caller
    assert "user_id" not in rows[0]


def test_public_leaderboard_excludes_employees_without_a_result(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    client.cookies.clear()
    resp = client.get("/api/v1/public/leaderboard")
    assert resp.status_code == 200
    assert resp.json() == []


def test_public_leaderboard_caps_at_top_ten(client, db_session, seed_departments, seed_kpi_template):
    from app.core.security import hash_password
    from app.models.kpi_result import KpiResult
    from app.models.user import User, UserRole

    template = seed_kpi_template["template"]
    for i in range(12):
        user = User(
            email=f"scorer{i}@test.com",
            password_hash=hash_password(TEST_PASSWORD),
            full_name=f"Scorer {i}",
            role=UserRole.employee,
            kpi_template_id=template.id,
        )
        db_session.add(user)
        db_session.flush()
        db_session.add(
            KpiResult(
                user_id=user.id,
                kpi_template_id=template.id,
                period=template.academic_year,
                total_score=float(i),
            )
        )
    db_session.commit()

    client.cookies.clear()
    resp = client.get("/api/v1/public/leaderboard")
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 10
    assert rows[0]["total_score"] == 11.0
    assert rows[-1]["total_score"] == 2.0


def test_public_stats_no_auth(client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position):
    period = seed_kpi_template["template"].academic_year
    _submit_and_score(client, seed_kpi_template["quality"].id, 30, period=period)

    client.cookies.clear()
    resp = client.get("/api/v1/public/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_employees"] == 1
    assert body["total_departments"] == 2
    assert body["average_score"] == 30.0
    assert body["top_score"] == 30.0
    assert body["academic_year"] == seed_kpi_template["template"].academic_year


def test_public_stats_ariza_status_buckets(client, db_session, seed_users, seed_employee_with_position, seed_kpi_template):
    from app.models.ariza import Ariza, ArizaStatus

    employee = seed_employee_with_position
    indicator_id = seed_kpi_template["quality"].id
    period = seed_kpi_template["template"].academic_year

    statuses = [
        ArizaStatus.submitted,
        ArizaStatus.kafedra_endorsed,
        ArizaStatus.scored,
        ArizaStatus.pending_head_approval,
        ArizaStatus.approved,
        ArizaStatus.approved,
        ArizaStatus.rejected,
    ]
    for st in statuses:
        db_session.add(Ariza(user_id=employee.id, kpi_indicator_id=indicator_id, period=period, status=st))
    db_session.commit()

    client.cookies.clear()
    resp = client.get("/api/v1/public/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["arizalar_new"] == 1
    assert body["arizalar_in_review"] == 3  # kafedra_endorsed + scored + pending_head_approval
    assert body["arizalar_approved"] == 2
    assert body["arizalar_rejected"] == 1


def test_public_stats_with_no_active_template(client):
    client.cookies.clear()
    resp = client.get("/api/v1/public/stats")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_employees"] == 0
    assert body["academic_year"] is None
