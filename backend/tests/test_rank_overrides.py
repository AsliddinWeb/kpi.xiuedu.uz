import io

from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def _submit(client, indicator_id, period="2026-07"):
    return client.post(
        "/api/v1/arizalar",
        data={"kpi_indicator_id": str(indicator_id), "period": period},
        files=[("files", ("cert.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf"))],
    )


def test_indicator_rank_override_requires_admin(client, seed_users, seed_kpi_template):
    _login(client, "manager@test.com")
    resp = client.post(
        "/api/v1/rank-overrides/indicators",
        json={"kpi_indicator_id": seed_kpi_template["quality"].id, "has_title": False, "max_score": 25},
    )
    assert resp.status_code == 403


def test_indicator_rank_override_caps_untitled_employee(
    client, seed_users, seed_employee_with_position, seed_kpi_template
):
    # employee has academic_degree=none by default (untitled)
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/rank-overrides/indicators",
        json={"kpi_indicator_id": seed_kpi_template["quality"].id, "has_title": False, "max_score": 25},
    )
    assert resp.status_code == 201

    _login(client, "employee@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()

    _login(client, "admin@test.com")
    over_cap = client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 30})
    assert over_cap.status_code == 400

    within_cap = client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 25})
    assert within_cap.status_code == 200
    assert within_cap.json()["max_score"] == 25

    _login(client, "employee@test.com")
    my_kpi = client.get("/api/v1/dashboard/my-kpi?period=2026-07").json()
    row = next(r for r in my_kpi if r["kpi_indicator_id"] == seed_kpi_template["quality"].id)
    assert row["max_score"] == 25
    assert row["awarded_total"] == 25


def test_titled_employee_unaffected_by_untitled_override(
    client, db_session, seed_users, seed_employee_with_position, seed_kpi_template
):
    # only an untitled (has_title=False) override exists; a titled employee falls back to raw max_score
    _login(client, "superadmin@test.com")
    client.post(
        "/api/v1/rank-overrides/indicators",
        json={"kpi_indicator_id": seed_kpi_template["quality"].id, "has_title": False, "max_score": 25},
    )

    other = seed_users["other_employee"]
    other.academic_degree = "phd"
    other.kpi_template_id = seed_kpi_template["template"].id
    db_session.commit()

    _login(client, "other@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()

    _login(client, "admin@test.com")
    resp = client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 40})
    assert resp.status_code == 200
    assert resp.json()["max_score"] == 40


def test_category_rank_override_caps_kpi_result_total(
    client, seed_users, seed_employee_with_position, seed_kpi_template
):
    # category-level cap (22 for untitled) should apply even though the indicator alone allows more
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/rank-overrides/categories",
        json={"kpi_category_id": seed_kpi_template["teaching_category"].id, "has_title": False, "max_score": 20},
    )
    assert resp.status_code == 201

    _login(client, "employee@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()

    _login(client, "admin@test.com")
    resp = client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 40})
    assert resp.status_code == 200

    resp = client.get(f"/api/v1/kpi-results?user_id={seed_employee_with_position.id}")
    assert resp.status_code == 200
    result = resp.json()[0]
    assert result["total_score"] == 20
    assert result["category_breakdown"][str(seed_kpi_template["teaching_category"].id)] == 20


def test_indicator_rank_override_duplicate_rejected(client, seed_users, seed_kpi_template):
    _login(client, "superadmin@test.com")
    payload = {"kpi_indicator_id": seed_kpi_template["quality"].id, "has_title": False, "max_score": 25}
    assert client.post("/api/v1/rank-overrides/indicators", json=payload).status_code == 201
    assert client.post("/api/v1/rank-overrides/indicators", json=payload).status_code == 400


def test_list_overrides_filtered_by_template(client, seed_users, seed_kpi_template):
    _login(client, "superadmin@test.com")
    client.post(
        "/api/v1/rank-overrides/indicators",
        json={"kpi_indicator_id": seed_kpi_template["quality"].id, "has_title": False, "max_score": 25},
    )
    client.post(
        "/api/v1/rank-overrides/categories",
        json={"kpi_category_id": seed_kpi_template["teaching_category"].id, "has_title": True, "max_score": 35},
    )

    template_id = seed_kpi_template["template"].id
    indicators = client.get(f"/api/v1/rank-overrides/indicators?kpi_template_id={template_id}").json()
    categories = client.get(f"/api/v1/rank-overrides/categories?kpi_template_id={template_id}").json()
    assert len(indicators) == 1
    assert indicators[0]["kpi_indicator_id"] == seed_kpi_template["quality"].id
    assert len(categories) == 1
    assert categories[0]["kpi_category_id"] == seed_kpi_template["teaching_category"].id

    assert client.get(f"/api/v1/rank-overrides/indicators?kpi_template_id=999999").json() == []


def test_update_indicator_rank_override_score(client, seed_users, seed_kpi_template):
    _login(client, "superadmin@test.com")
    created = client.post(
        "/api/v1/rank-overrides/indicators",
        json={"kpi_indicator_id": seed_kpi_template["quality"].id, "has_title": False, "max_score": 25},
    ).json()

    resp = client.patch(f"/api/v1/rank-overrides/indicators/{created['id']}", json={"max_score": 30})
    assert resp.status_code == 200
    assert resp.json()["max_score"] == 30


def test_delete_indicator_rank_override(client, seed_users, seed_kpi_template):
    _login(client, "superadmin@test.com")
    created = client.post(
        "/api/v1/rank-overrides/indicators",
        json={"kpi_indicator_id": seed_kpi_template["quality"].id, "has_title": False, "max_score": 25},
    ).json()

    resp = client.delete(f"/api/v1/rank-overrides/indicators/{created['id']}")
    assert resp.status_code == 204
    assert client.get("/api/v1/rank-overrides/indicators").json() == []
