import io

from app.models.kpi_result import KpiResult
from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def _valid_payload():
    return {
        "name": "1-ilova",
        "annex_code": "1",
        "academic_year": "2026-2027",
        "period_type": "quarterly",
        "categories": [
            {
                "name": "O'quv-uslubiy faoliyat",
                "max_score": 40,
                "indicators": [
                    {"name": "Darslik", "max_score": 30},
                    {"name": "Uslubiy qo'llanma", "max_score": 10},
                ],
            },
            {
                "name": "Ilmiy faoliyat",
                "max_score": 60,
                "indicators": [{"name": "Maqolalar", "max_score": 60, "allow_coauthors": True}],
            },
        ],
    }


def test_create_requires_admin(client, seed_users, seed_departments):
    _login(client, "manager@test.com")
    resp = client.post("/api/v1/kpi-templates", json=_valid_payload())
    assert resp.status_code == 403


def test_create_category_max_score_mismatch_blocked(client, seed_users):
    _login(client, "superadmin@test.com")
    payload = _valid_payload()
    payload["categories"][0]["indicators"][0]["max_score"] = 5
    resp = client.post("/api/v1/kpi-templates", json=payload)
    assert resp.status_code == 400


def test_create_template_total_not_100_blocked(client, seed_users):
    _login(client, "superadmin@test.com")
    payload = _valid_payload()
    payload["categories"][0]["max_score"] = 30
    payload["categories"][0]["indicators"][0]["max_score"] = 20
    resp = client.post("/api/v1/kpi-templates", json=payload)
    assert resp.status_code == 400


def test_create_success(client, seed_users):
    _login(client, "superadmin@test.com")
    resp = client.post("/api/v1/kpi-templates", json=_valid_payload())
    assert resp.status_code == 201
    body = resp.json()
    assert body["total_max_score"] == 100
    assert body["is_active"] is True
    assert len(body["categories"]) == 2
    assert len(body["categories"][0]["indicators"]) == 2


def test_get_template_by_id(client, seed_users):
    _login(client, "superadmin@test.com")
    created = client.post("/api/v1/kpi-templates", json=_valid_payload()).json()

    resp = client.get(f"/api/v1/kpi-templates/{created['id']}")
    assert resp.status_code == 200
    assert resp.json()["id"] == created["id"]


def test_get_template_not_found(client, seed_users):
    _login(client, "superadmin@test.com")
    resp = client.get("/api/v1/kpi-templates/9999")
    assert resp.status_code == 404


def test_bonus_category_adds_on_top_of_100(client, seed_users):
    _login(client, "superadmin@test.com")
    payload = _valid_payload()
    payload["categories"].append(
        {
            "name": "Rahbar tavsiyasi",
            "max_score": 10,
            "is_bonus_category": True,
            "indicators": [{"name": "Rahbar bahosi", "max_score": 10, "requires_file": False}],
        }
    )
    resp = client.post("/api/v1/kpi-templates", json=payload)
    assert resp.status_code == 201
    assert resp.json()["total_max_score"] == 110


def test_list_templates_readable_by_manager(client, seed_users):
    _login(client, "superadmin@test.com")
    client.post("/api/v1/kpi-templates", json=_valid_payload())

    _login(client, "manager@test.com")
    resp = client.get("/api/v1/kpi-templates")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_update_replaces_categories_when_valid(client, seed_users):
    _login(client, "superadmin@test.com")
    created = client.post("/api/v1/kpi-templates", json=_valid_payload()).json()

    resp = client.patch(
        f"/api/v1/kpi-templates/{created['id']}",
        json={"categories": [{"name": "Solo", "max_score": 100, "indicators": [{"name": "Metric", "max_score": 100}]}]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert len(body["categories"]) == 1
    assert body["categories"][0]["name"] == "Solo"


def test_update_rejects_invalid_total_and_keeps_old_categories(client, seed_users):
    _login(client, "superadmin@test.com")
    created = client.post("/api/v1/kpi-templates", json=_valid_payload()).json()

    resp = client.patch(
        f"/api/v1/kpi-templates/{created['id']}",
        json={"categories": [{"name": "Bad", "max_score": 30, "indicators": [{"name": "X", "max_score": 30}]}]},
    )
    assert resp.status_code == 400

    unchanged = client.get("/api/v1/kpi-templates").json()[0]
    assert len(unchanged["categories"]) == 2
    assert unchanged["total_max_score"] == 100


def test_update_toggle_is_active(client, seed_users):
    _login(client, "superadmin@test.com")
    created = client.post("/api/v1/kpi-templates", json=_valid_payload()).json()

    resp = client.patch(f"/api/v1/kpi-templates/{created['id']}", json={"is_active": False})
    assert resp.status_code == 200
    assert resp.json()["is_active"] is False
    assert len(resp.json()["categories"]) == 2


def test_update_not_found(client, seed_users):
    _login(client, "superadmin@test.com")
    resp = client.patch("/api/v1/kpi-templates/9999", json={"is_active": False})
    assert resp.status_code == 404


def test_delete_template(client, seed_users):
    _login(client, "superadmin@test.com")
    created = client.post("/api/v1/kpi-templates", json=_valid_payload()).json()

    resp = client.delete(f"/api/v1/kpi-templates/{created['id']}")
    assert resp.status_code == 204
    assert client.get("/api/v1/kpi-templates").json() == []


def test_delete_template_with_category_reviewer_assigned_succeeds(client, seed_users):
    _login(client, "superadmin@test.com")
    created = client.post("/api/v1/kpi-templates", json=_valid_payload()).json()
    category_id = created["categories"][0]["id"]

    reviewer = client.post(
        "/api/v1/category-reviewers",
        json={"kpi_category_id": category_id, "user_id": seed_users["other_employee"].id},
    )
    assert reviewer.status_code == 201

    resp = client.delete(f"/api/v1/kpi-templates/{created['id']}")
    assert resp.status_code == 204


def test_update_categories_with_reviewer_assigned_succeeds(client, seed_users):
    _login(client, "superadmin@test.com")
    created = client.post("/api/v1/kpi-templates", json=_valid_payload()).json()
    category_id = created["categories"][0]["id"]

    client.post(
        "/api/v1/category-reviewers",
        json={"kpi_category_id": category_id, "user_id": seed_users["other_employee"].id},
    )

    resp = client.patch(
        f"/api/v1/kpi-templates/{created['id']}",
        json={"categories": [{"name": "Solo", "max_score": 100, "indicators": [{"name": "X", "max_score": 100}]}]},
    )
    assert resp.status_code == 200


def test_update_categories_with_rank_override_assigned_succeeds(client, seed_users):
    _login(client, "superadmin@test.com")
    created = client.post("/api/v1/kpi-templates", json=_valid_payload()).json()
    category_id = created["categories"][0]["id"]
    indicator_id = created["categories"][0]["indicators"][0]["id"]

    client.post(
        "/api/v1/rank-overrides/categories", json={"kpi_category_id": category_id, "has_title": False, "max_score": 90}
    )
    client.post(
        "/api/v1/rank-overrides/indicators",
        json={"kpi_indicator_id": indicator_id, "has_title": False, "max_score": 90},
    )

    resp = client.patch(
        f"/api/v1/kpi-templates/{created['id']}",
        json={"categories": [{"name": "Solo", "max_score": 100, "indicators": [{"name": "X", "max_score": 100}]}]},
    )
    assert resp.status_code == 200

    # the old overrides pointed at the now-deleted category/indicator ids and must not linger orphaned
    assert client.get(f"/api/v1/rank-overrides/categories?kpi_category_id={category_id}").json() == []
    assert client.get(f"/api/v1/rank-overrides/indicators?kpi_indicator_id={indicator_id}").json() == []


def test_delete_template_blocked_when_assigned_to_user(client, seed_users):
    _login(client, "superadmin@test.com")
    created = client.post("/api/v1/kpi-templates", json=_valid_payload()).json()

    resp = client.patch(
        f"/api/v1/users/{seed_users['other_employee'].id}",
        json={"kpi_template_id": created["id"]},
    )
    assert resp.status_code == 200

    resp = client.delete(f"/api/v1/kpi-templates/{created['id']}")
    assert resp.status_code == 400


def test_delete_template_with_leftover_kpi_result_succeeds(client, db_session, seed_users):
    _login(client, "superadmin@test.com")
    created = client.post("/api/v1/kpi-templates", json=_valid_payload()).json()

    db_session.add(
        KpiResult(
            user_id=seed_users["other_employee"].id,
            kpi_template_id=created["id"],
            period="2026-07",
            total_score=42,
            category_breakdown={},
        )
    )
    db_session.commit()

    resp = client.delete(f"/api/v1/kpi-templates/{created['id']}")
    assert resp.status_code == 204


def test_delete_template_blocked_when_arizalar_exist(
    client, seed_users, seed_employee_with_position, seed_kpi_template
):
    _login(client, "employee@test.com")
    client.post(
        "/api/v1/arizalar",
        data={"kpi_indicator_id": str(seed_kpi_template["quality"].id), "period": "2026-07"},
        files=[("files", ("cert.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf"))],
    )

    _login(client, "superadmin@test.com")
    resp = client.delete(f"/api/v1/kpi-templates/{seed_kpi_template['template'].id}")
    assert resp.status_code == 400


def test_update_categories_blocked_when_arizalar_exist(
    client, seed_users, seed_employee_with_position, seed_kpi_template
):
    _login(client, "employee@test.com")
    client.post(
        "/api/v1/arizalar",
        data={"kpi_indicator_id": str(seed_kpi_template["quality"].id), "period": "2026-07"},
        files=[("files", ("cert.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf"))],
    )

    _login(client, "superadmin@test.com")
    resp = client.patch(
        f"/api/v1/kpi-templates/{seed_kpi_template['template'].id}",
        json={"categories": [{"name": "Solo", "max_score": 100, "indicators": [{"name": "X", "max_score": 100}]}]},
    )
    assert resp.status_code == 400
