from app.services import hemis_rest as hemis_rest_module
from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def test_hemis_sync_requires_admin_or_super_admin(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.post("/api/v1/users/1/hemis-sync")
    assert resp.status_code == 403


def test_hemis_sync_fails_without_hemis_identifier(client, seed_users):
    _login(client, "superadmin@test.com")
    employee_id = seed_users["employee"].id
    resp = client.post(f"/api/v1/users/{employee_id}/hemis-sync")
    assert resp.status_code == 400


def test_hemis_sync_applies_employee_meta(client, db_session, seed_users, monkeypatch):
    employee = seed_users["employee"]
    employee.hemis_employee_id_number = "12345"
    db_session.commit()

    def fake_fetch(employee_id_number):
        assert employee_id_number == "12345"
        return {
            "employee_id_number": 12345,
            "image_full": "https://hemis.example.uz/photo/12345.jpg",
            "academicDegree": {"code": "11", "name": "PhD"},
            "academicRank": {"code": "12", "name": "Dotsent"},
            "staffPosition": {"code": "13", "name": "Katta o'qituvchi"},
            "employeeStatus": {"code": "11", "name": "Faol"},
            "department": {"id": 5, "name": "Umumiy pedagogika kafedrasi"},
        }

    monkeypatch.setattr(hemis_rest_module, "fetch_employee_by_id_number", fake_fetch)

    _login(client, "superadmin@test.com")
    resp = client.post(f"/api/v1/users/{employee.id}/hemis-sync")
    assert resp.status_code == 200
    body = resp.json()
    assert body["hemis_image_url"] == "https://hemis.example.uz/photo/12345.jpg"
    assert body["hemis_academic_degree_name"] == "PhD"
    assert body["hemis_academic_rank_name"] == "Dotsent"
    assert body["hemis_staff_position_name"] == "Katta o'qituvchi"
    assert body["hemis_employment_status_name"] == "Faol"
    assert body["hemis_department_name"] == "Umumiy pedagogika kafedrasi"
    assert body["hemis_rest_synced_at"] is not None


def test_hemis_sync_not_found_in_hemis(client, db_session, seed_users, monkeypatch):
    employee = seed_users["employee"]
    employee.hemis_employee_id_number = "99999"
    db_session.commit()

    monkeypatch.setattr(hemis_rest_module, "fetch_employee_by_id_number", lambda employee_id_number: None)

    _login(client, "superadmin@test.com")
    resp = client.post(f"/api/v1/users/{employee.id}/hemis-sync")
    assert resp.status_code == 404


def test_hemis_sync_unconfigured_returns_503(client, db_session, seed_users, monkeypatch):
    employee = seed_users["employee"]
    employee.hemis_employee_id_number = "12345"
    db_session.commit()

    monkeypatch.setattr(hemis_rest_module.settings, "hemis_api_token", "")

    _login(client, "superadmin@test.com")
    resp = client.post(f"/api/v1/users/{employee.id}/hemis-sync")
    assert resp.status_code == 503


def test_login_sets_last_login_at(client, seed_users):
    resp = client.post("/api/v1/auth/login", json={"email": "employee@test.com", "password": TEST_PASSWORD})
    assert resp.status_code == 200
    assert resp.json()["user"]["last_login_at"] is not None
