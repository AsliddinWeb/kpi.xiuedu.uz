import io

from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def _submit(client, indicator_id, period="2026-07", filename="cert.pdf"):
    return client.post(
        "/api/v1/arizalar",
        data={"kpi_indicator_id": str(indicator_id), "period": period},
        files=[("files", (filename, io.BytesIO(b"%PDF-1.4 fake"), "application/pdf"))],
    )


def test_submit_requires_file_when_indicator_needs_it(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    resp = client.post(
        "/api/v1/arizalar",
        data={"kpi_indicator_id": str(seed_kpi_template["quality"].id), "period": "2026-07"},
    )
    assert resp.status_code == 400


def test_submit_success_creates_files(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    resp = _submit(client, seed_kpi_template["quality"].id)
    assert resp.status_code == 201
    body = resp.json()
    assert body["status"] == "submitted"
    assert len(body["files"]) == 1
    assert body["files"][0]["original_filename"] == "cert.pdf"


def test_restricted_user_cannot_submit(client, db_session, seed_users, seed_employee_with_position, seed_kpi_template):
    seed_employee_with_position.is_restricted = True
    db_session.commit()

    _login(client, "employee@test.com")
    resp = _submit(client, seed_kpi_template["quality"].id)
    assert resp.status_code == 403


def test_owner_can_list_own_arizalar(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    _submit(client, seed_kpi_template["quality"].id)

    resp = client.get(f"/api/v1/arizalar?user_id={seed_employee_with_position.id}")
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_other_employee_cannot_list_someone_elses_arizalar(
    client, seed_users, seed_employee_with_position, seed_kpi_template
):
    _login(client, "employee@test.com")
    _submit(client, seed_kpi_template["quality"].id)

    _login(client, "other@test.com")
    resp = client.get(f"/api/v1/arizalar?user_id={seed_employee_with_position.id}")
    assert resp.status_code == 403


def test_admin_can_score_ariza_and_kpi_result_updates(
    client, seed_users, seed_employee_with_position, seed_kpi_template
):
    _login(client, "employee@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()

    _login(client, "admin@test.com")
    resp = client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 30})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "scored"
    assert body["awarded_score"] == 30

    _login(client, "employee@test.com")
    my_kpi = client.get("/api/v1/dashboard/my-kpi?period=2026-07").json()
    row = next(r for r in my_kpi if r["kpi_indicator_id"] == seed_kpi_template["quality"].id)
    assert row["awarded_total"] == 30
    assert len(row["submissions"]) == 1
    assert row["submissions"][0]["status"] == "scored"


def test_score_cannot_exceed_indicator_max(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()

    _login(client, "admin@test.com")
    resp = client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 999})
    assert resp.status_code == 400


def test_multiple_submissions_accumulate_and_are_capped(
    client, seed_users, seed_employee_with_position, seed_kpi_template
):
    # quality indicator has max_score=40; submit and score it twice (20 + 20 = 40), then a
    # third submission should be rejected once scored since it would exceed the cap.
    _login(client, "employee@test.com")
    first = _submit(client, seed_kpi_template["quality"].id).json()
    second = _submit(client, seed_kpi_template["quality"].id).json()
    third = _submit(client, seed_kpi_template["quality"].id).json()
    assert first["id"] != second["id"] != third["id"]

    _login(client, "admin@test.com")
    resp1 = client.patch(f"/api/v1/arizalar/{first['id']}/score", json={"awarded_score": 20})
    assert resp1.status_code == 200
    resp2 = client.patch(f"/api/v1/arizalar/{second['id']}/score", json={"awarded_score": 20})
    assert resp2.status_code == 200

    # cumulative total is already at the 40 cap - even 1 more point should be rejected
    resp3 = client.patch(f"/api/v1/arizalar/{third['id']}/score", json={"awarded_score": 1})
    assert resp3.status_code == 400

    _login(client, "employee@test.com")
    my_kpi = client.get("/api/v1/dashboard/my-kpi?period=2026-07").json()
    row = next(r for r in my_kpi if r["kpi_indicator_id"] == seed_kpi_template["quality"].id)
    assert row["awarded_total"] == 40
    assert row["remaining_capacity"] == 0
    assert len(row["submissions"]) == 3


def test_score_rejects_rescoring_already_scored_ariza(
    client, seed_users, seed_employee_with_position, seed_kpi_template
):
    _login(client, "employee@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()

    _login(client, "admin@test.com")
    resp = client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 10})
    assert resp.status_code == 200

    resp2 = client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 5})
    assert resp2.status_code == 400


def test_employee_comment_roundtrips(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    resp = client.post(
        "/api/v1/arizalar",
        data={
            "kpi_indicator_id": str(seed_kpi_template["quality"].id),
            "period": "2026-07",
            "employee_comment": "1-chorak uchun hisobot",
        },
        files=[("files", ("cert.pdf", io.BytesIO(b"%PDF-1.4 fake"), "application/pdf"))],
    )
    assert resp.status_code == 201
    assert resp.json()["employee_comment"] == "1-chorak uchun hisobot"


def test_category_reviewer_can_only_score_their_category(
    client, seed_users, seed_employee_with_position, seed_kpi_template
):
    _login(client, "employee@test.com")
    quality_ariza = _submit(client, seed_kpi_template["quality"].id).json()
    tasks_ariza = _submit(client, seed_kpi_template["tasks"].id, filename="paper.pdf").json()

    _login(client, "superadmin@test.com")
    reviewer_resp = client.post(
        "/api/v1/category-reviewers",
        json={"kpi_category_id": seed_kpi_template["science_category"].id, "user_id": seed_users["other_employee"].id},
    )
    assert reviewer_resp.status_code == 201

    _login(client, "other@test.com")
    blocked = client.patch(f"/api/v1/arizalar/{quality_ariza['id']}/score", json={"awarded_score": 10})
    assert blocked.status_code == 403

    allowed = client.patch(f"/api/v1/arizalar/{tasks_ariza['id']}/score", json={"awarded_score": 50})
    assert allowed.status_code == 200


def test_reject_ariza(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()

    _login(client, "admin@test.com")
    resp = client.patch(f"/api/v1/arizalar/{ariza['id']}/reject", json={"reviewer_comment": "Yetarli emas"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


def test_owner_can_delete_unscored_ariza(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()

    resp = client.delete(f"/api/v1/arizalar/{ariza['id']}")
    assert resp.status_code == 204
    assert client.get(f"/api/v1/arizalar?user_id={seed_employee_with_position.id}").json() == []


def test_owner_cannot_delete_scored_ariza(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()

    _login(client, "admin@test.com")
    client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 10})

    _login(client, "employee@test.com")
    resp = client.delete(f"/api/v1/arizalar/{ariza['id']}")
    assert resp.status_code == 400


def test_kafedra_endorsement_flow(client, seed_users, seed_employee_with_position, seed_departments):
    _login(client, "superadmin@test.com")
    template = client.post(
        "/api/v1/kpi-templates",
        json={
            "name": "Endorsement annex",
            "annex_code": "5",
            "academic_year": "2026-2027",
            "period_type": "monthly",
            "categories": [
                {
                    "name": "Needs endorsement",
                    "max_score": 100,
                    "requires_kafedra_endorsement": True,
                    "indicators": [{"name": "Indicator", "max_score": 100}],
                }
            ],
        },
    ).json()
    indicator_id = template["categories"][0]["indicators"][0]["id"]

    employee = seed_users["employee"]
    client.patch(f"/api/v1/users/{employee.id}", json={"kpi_template_id": template["id"]})

    _login(client, "employee@test.com")
    ariza = _submit(client, indicator_id).json()
    assert ariza["requires_kafedra_endorsement"] is True

    _login(client, "other@test.com")
    forbidden = client.patch(f"/api/v1/arizalar/{ariza['id']}/endorse")
    assert forbidden.status_code == 403

    _login(client, "manager@test.com")
    endorsed = client.patch(f"/api/v1/arizalar/{ariza['id']}/endorse")
    assert endorsed.status_code == 200
    assert endorsed.json()["status"] == "kafedra_endorsed"

    _login(client, "admin@test.com")
    scored = client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 90})
    assert scored.status_code == 200
    assert scored.json()["status"] == "scored"


def test_download_ariza_file(client, seed_users, seed_employee_with_position, seed_kpi_template):
    _login(client, "employee@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()
    file_id = ariza["files"][0]["id"]

    resp = client.get(f"/api/v1/arizalar/{ariza['id']}/files/{file_id}/download")
    assert resp.status_code == 200
    assert resp.content == b"%PDF-1.4 fake"


def test_head_approval_flow_two_stage(client, db_session, seed_users, seed_employee_with_position, seed_kpi_template):
    category = seed_kpi_template["teaching_category"]
    category.requires_head_approval = True
    db_session.commit()

    _login(client, "superadmin@test.com")
    approver = client.post(
        "/api/v1/category-head-approvers",
        json={"kpi_category_id": category.id, "user_id": seed_users["other_employee"].id},
    )
    assert approver.status_code == 201

    _login(client, "employee@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()

    _login(client, "admin@test.com")
    scored = client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 30})
    assert scored.status_code == 200
    assert scored.json()["status"] == "pending_head_approval"

    # score must not be visible/counted yet - only the head-approver's sign-off finalizes it
    _login(client, "employee@test.com")
    my_kpi = client.get("/api/v1/dashboard/my-kpi?period=2026-07").json()
    row = next(r for r in my_kpi if r["kpi_indicator_id"] == seed_kpi_template["quality"].id)
    assert row["awarded_total"] == 0
    results = client.get(f"/api/v1/kpi-results?user_id={seed_employee_with_position.id}").json()
    assert results[0]["total_score"] == 0

    # a plain admin/manager who isn't the assigned head-approver cannot approve it
    _login(client, "manager@test.com")
    denied = client.patch(f"/api/v1/arizalar/{ariza['id']}/head-approve")
    assert denied.status_code == 403

    _login(client, "other@test.com")
    approved = client.patch(f"/api/v1/arizalar/{ariza['id']}/head-approve")
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    _login(client, "employee@test.com")
    my_kpi = client.get("/api/v1/dashboard/my-kpi?period=2026-07").json()
    row = next(r for r in my_kpi if r["kpi_indicator_id"] == seed_kpi_template["quality"].id)
    assert row["awarded_total"] == 30
    results = client.get(f"/api/v1/kpi-results?user_id={seed_employee_with_position.id}").json()
    assert results[0]["total_score"] == 30


def test_head_reject_flow(client, db_session, seed_users, seed_employee_with_position, seed_kpi_template):
    category = seed_kpi_template["teaching_category"]
    category.requires_head_approval = True
    db_session.commit()

    _login(client, "superadmin@test.com")
    client.post(
        "/api/v1/category-head-approvers",
        json={"kpi_category_id": category.id, "user_id": seed_users["other_employee"].id},
    )

    _login(client, "employee@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()

    _login(client, "admin@test.com")
    client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 30})

    _login(client, "other@test.com")
    rejected = client.patch(f"/api/v1/arizalar/{ariza['id']}/head-reject", json={"reviewer_comment": "Yetarli emas"})
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"

    # cannot re-approve/re-reject an already-decided ariza
    resp = client.patch(f"/api/v1/arizalar/{ariza['id']}/head-approve")
    assert resp.status_code == 400


def test_head_approver_scoped_to_own_indicator_only(
    client, db_session, seed_users, seed_employee_with_position, seed_kpi_template
):
    from app.models.kpi_indicator import KpiIndicator

    category = seed_kpi_template["teaching_category"]
    category.requires_head_approval = True
    # a second indicator in the same category, so we can test indicator-level exclusivity
    other_indicator = KpiIndicator(kpi_category_id=category.id, name="Other indicator", max_score=10, requires_file=True)
    db_session.add(other_indicator)
    db_session.commit()
    db_session.refresh(other_indicator)

    _login(client, "superadmin@test.com")
    # "other_employee" may only approve the "quality" indicator, not "other_indicator"
    approver = client.post(
        "/api/v1/category-head-approvers",
        json={
            "kpi_category_id": category.id,
            "kpi_indicator_id": seed_kpi_template["quality"].id,
            "user_id": seed_users["other_employee"].id,
        },
    )
    assert approver.status_code == 201

    _login(client, "employee@test.com")
    ariza_on_other_indicator = _submit(client, other_indicator.id).json()

    _login(client, "admin@test.com")
    scored = client.patch(
        f"/api/v1/arizalar/{ariza_on_other_indicator['id']}/score", json={"awarded_score": 5}
    )
    assert scored.status_code == 200
    assert scored.json()["status"] == "pending_head_approval"

    # denied - this approver is scoped only to the "quality" indicator
    _login(client, "other@test.com")
    denied = client.patch(f"/api/v1/arizalar/{ariza_on_other_indicator['id']}/head-approve")
    assert denied.status_code == 403


def test_category_without_head_approval_flag_unaffected(
    client, seed_users, seed_employee_with_position, seed_kpi_template
):
    # regression: categories without the flag keep the old scored=final behavior
    _login(client, "employee@test.com")
    ariza = _submit(client, seed_kpi_template["quality"].id).json()

    _login(client, "admin@test.com")
    scored = client.patch(f"/api/v1/arizalar/{ariza['id']}/score", json={"awarded_score": 30})
    assert scored.status_code == 200
    assert scored.json()["status"] == "scored"

    _login(client, "employee@test.com")
    results = client.get(f"/api/v1/kpi-results?user_id={seed_employee_with_position.id}").json()
    assert results[0]["total_score"] == 30
