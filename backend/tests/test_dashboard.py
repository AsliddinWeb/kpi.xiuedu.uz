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


def test_team_summary_requires_manager_or_above(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.get("/api/v1/dashboard/team-summary")
    assert resp.status_code == 403


def test_team_summary_manager_sees_only_direct_reports(client, seed_users):
    _login(client, "manager@test.com")
    resp = client.get("/api/v1/dashboard/team-summary")
    assert resp.status_code == 200
    emails = {row["email"] for row in resp.json()}
    assert emails == {"employee@test.com"}


def test_team_summary_admin_sees_all_managers_and_employees(client, seed_users):
    _login(client, "admin@test.com")
    resp = client.get("/api/v1/dashboard/team-summary")
    assert resp.status_code == 200
    emails = {row["email"] for row in resp.json()}
    assert emails == {"manager@test.com", "employee@test.com", "other@test.com", "inactive@test.com"}


def test_organization_summary_requires_admin(client, seed_users):
    _login(client, "manager@test.com")
    resp = client.get("/api/v1/dashboard/organization-summary")
    assert resp.status_code == 403


def test_organization_summary_counts(client, seed_users, seed_departments):
    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/dashboard/organization-summary")
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_employees"] == len(seed_users)
    assert body["total_departments"] == 2
    assert body["results_computed"] == 0
    assert body["average_score"] is None


def test_department_comparison_requires_admin(client, seed_users, seed_departments):
    _login(client, "manager@test.com")
    resp = client.get("/api/v1/dashboard/department-comparison")
    assert resp.status_code == 403


def test_department_comparison_structure(client, seed_users, seed_departments, seed_employee_with_position):
    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/dashboard/department-comparison")
    assert resp.status_code == 200
    rows = {row["department_name"]: row for row in resp.json()}
    assert rows["IT"]["employee_count"] == 1
    assert rows["IT"]["average_score"] is None
    assert rows["Finance"]["employee_count"] == 0


def test_full_ariza_cycle_reflected_in_dashboards(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30)
    _submit_and_score(client, seed_kpi_template["tasks"].id, 50, filename="paper.pdf")

    _login(client, "manager@test.com")
    team = client.get("/api/v1/dashboard/team-summary").json()
    employee_row = next(row for row in team if row["email"] == "employee@test.com")
    assert employee_row["latest_status"] == "computed"
    assert employee_row["latest_score"] == 80.0

    _login(client, "superadmin@test.com")
    org = client.get("/api/v1/dashboard/organization-summary").json()
    assert org["results_computed"] == 1
    assert org["average_score"] == 80.0

    departments = {row["department_name"]: row for row in client.get("/api/v1/dashboard/department-comparison").json()}
    assert departments["IT"]["average_score"] == 80.0


def test_leaderboard_ranks_by_total_score(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30)
    _submit_and_score(client, seed_kpi_template["tasks"].id, 50, filename="paper.pdf")

    _login(client, "superadmin@test.com")
    resp = client.get(
        f"/api/v1/dashboard/leaderboard?kpi_template_id={seed_kpi_template['template'].id}&period=2026-07"
    )
    assert resp.status_code == 200
    rows = resp.json()
    assert rows[0]["user_id"] == seed_employee_with_position.id
    assert rows[0]["total_score"] == 80.0
    assert rows[0]["template_max_score"] == 100


def test_my_kpi_lists_own_indicators_with_status(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30)

    _login(client, "employee@test.com")
    resp = client.get("/api/v1/dashboard/my-kpi?period=2026-07")
    assert resp.status_code == 200
    rows = {r["kpi_indicator_id"]: r for r in resp.json()}
    assert rows[seed_kpi_template["quality"].id]["awarded_total"] == 30
    assert rows[seed_kpi_template["quality"].id]["submissions"][0]["status"] == "scored"
    assert rows[seed_kpi_template["tasks"].id]["awarded_total"] == 0
    assert rows[seed_kpi_template["tasks"].id]["submissions"] == []


def test_my_kpi_with_user_id_requires_oversight_or_manager(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30)
    target_id = seed_employee_with_position.id

    _login(client, "other@test.com")
    denied = client.get(f"/api/v1/dashboard/my-kpi?period=2026-07&user_id={target_id}")
    assert denied.status_code == 403

    _login(client, "superadmin@test.com")
    allowed_admin = client.get(f"/api/v1/dashboard/my-kpi?period=2026-07&user_id={target_id}")
    assert allowed_admin.status_code == 200
    rows = {r["kpi_indicator_id"]: r for r in allowed_admin.json()}
    assert rows[seed_kpi_template["quality"].id]["awarded_total"] == 30

    _login(client, "manager@test.com")
    allowed_manager = client.get(f"/api/v1/dashboard/my-kpi?period=2026-07&user_id={target_id}")
    assert allowed_manager.status_code == 200


def test_organization_summary_period_filter(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30, period="2026-07")

    _login(client, "superadmin@test.com")
    matching = client.get("/api/v1/dashboard/organization-summary?period=2026-07")
    assert matching.status_code == 200
    assert matching.json()["average_score"] == 30

    other_period = client.get("/api/v1/dashboard/organization-summary?period=2099-01")
    assert other_period.status_code == 200
    assert other_period.json()["average_score"] is None


def test_department_comparison_period_filter(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30, period="2026-07")

    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/dashboard/department-comparison?period=2026-07")
    assert resp.status_code == 200
    it_row = next(r for r in resp.json() if r["department_id"] == seed_departments["it"].id)
    assert it_row["average_score"] == 30

    resp_other = client.get("/api/v1/dashboard/department-comparison?period=2099-01")
    it_row_other = next(r for r in resp_other.json() if r["department_id"] == seed_departments["it"].id)
    assert it_row_other["average_score"] is None


def test_team_summary_period_filter(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _submit_and_score(client, seed_kpi_template["quality"].id, 30, period="2026-07")

    _login(client, "manager@test.com")
    resp = client.get("/api/v1/dashboard/team-summary?period=2026-07")
    assert resp.status_code == 200
    row = next(r for r in resp.json() if r["user_id"] == seed_employee_with_position.id)
    assert row["latest_score"] == 30

    resp_other = client.get("/api/v1/dashboard/team-summary?period=2099-01")
    row_other = next(r for r in resp_other.json() if r["user_id"] == seed_employee_with_position.id)
    assert row_other["latest_score"] is None


def test_rector_summary_counts_for_admin(
    client, seed_users, seed_departments, seed_kpi_template, seed_employee_with_position
):
    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/dashboard/rector-summary")
    assert resp.status_code == 200
    body = resp.json()
    assert "pending_head_approvals" in body
    assert "active_correction_plans" in body
    assert "active_force_majeure" in body
    assert body["total_employees"] >= 1


def test_rector_summary_requires_oversight(client, seed_users):
    _login(client, "manager@test.com")
    resp = client.get("/api/v1/dashboard/rector-summary")
    assert resp.status_code == 403


def test_rector_summary_scoped_to_own_pending_approvals(
    client, db_session, seed_users, seed_employee_with_position, seed_kpi_template
):
    category = seed_kpi_template["teaching_category"]
    category.requires_head_approval = True
    db_session.commit()

    _login(client, "superadmin@test.com")
    from app.core.security import hash_password
    from app.models.user import User, UserRole

    rector = User(
        email="rector-summary@test.com",
        password_hash=hash_password(TEST_PASSWORD),
        full_name="Rector",
        role=UserRole.rector,
    )
    db_session.add(rector)
    db_session.commit()
    db_session.refresh(rector)

    client.post(
        "/api/v1/category-head-approvers",
        json={
            "kpi_category_id": category.id,
            "kpi_indicator_id": seed_kpi_template["quality"].id,
            "user_id": rector.id,
        },
    )

    _submit_and_score(client, seed_kpi_template["quality"].id, 20, period="2026-07")

    _login(client, "rector-summary@test.com")
    resp = client.get("/api/v1/dashboard/rector-summary")
    assert resp.status_code == 200
    assert resp.json()["pending_head_approvals"] == 1
