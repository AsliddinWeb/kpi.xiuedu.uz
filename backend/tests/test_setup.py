import io

from app.api.v1 import setup as setup_api
from tests.conftest import TEST_PASSWORD


def _login(client, email):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert resp.status_code == 200


def _complete_setup(client):
    client.post(
        "/api/v1/setup/complete",
        json={
            "company_name": "Logo Co",
            "default_period_type": "monthly",
            "departments": [{"name": "IT", "positions": []}],
        },
    )


def test_status_false_initially(client, seed_users):
    resp = client.get("/api/v1/setup/status")
    assert resp.status_code == 200
    assert resp.json() == {"setup_completed": False}


def test_complete_requires_super_admin(client, seed_users):
    _login(client, "admin@test.com")
    resp = client.post(
        "/api/v1/setup/complete",
        json={
            "company_name": "Test Co",
            "default_period_type": "monthly",
            "departments": [{"name": "IT", "positions": [{"title": "Dev"}]}],
        },
    )
    assert resp.status_code == 403


def test_complete_creates_company_departments_and_admin(client, seed_users):
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/setup/complete",
        json={
            "company_name": "Test Co",
            "industry_label": "Tech",
            "default_period_type": "quarterly",
            "departments": [
                {"name": "IT", "positions": [{"title": "Dev"}, {"title": "QA"}]},
                {"name": "HR", "positions": []},
            ],
            "admin": {"email": "newadmin@test.com", "password": "somepassword", "full_name": "New Admin"},
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["company"]["name"] == "Test Co"
    assert body["company"]["default_period_type"] == "quarterly"
    assert body["company"]["setup_completed_at"] is not None

    status_resp = client.get("/api/v1/setup/status")
    assert status_resp.json() == {"setup_completed": True}

    login_resp = client.post(
        "/api/v1/auth/login", json={"email": "newadmin@test.com", "password": "somepassword"}
    )
    assert login_resp.status_code == 200
    me = client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["role"] == "admin"


def test_complete_blocked_when_already_done(client, seed_users):
    _login(client, "superadmin@test.com")
    payload = {
        "company_name": "Test Co",
        "default_period_type": "monthly",
        "departments": [{"name": "IT", "positions": []}],
    }
    first = client.post("/api/v1/setup/complete", json=payload)
    assert first.status_code == 200

    second = client.post("/api/v1/setup/complete", json=payload)
    assert second.status_code == 400


def test_company_get_allowed_for_any_authenticated_role(client, seed_users):
    _login(client, "superadmin@test.com")
    client.post(
        "/api/v1/setup/complete",
        json={
            "company_name": "Branding Co",
            "default_period_type": "monthly",
            "departments": [{"name": "IT", "positions": []}],
        },
    )

    # every role needs to read basic branding (name/logo) for the sidebar
    _login(client, "employee@test.com")
    resp = client.get("/api/v1/setup/company")
    assert resp.status_code == 200


def test_company_get_is_public_no_auth(client, seed_users):
    """The public homepage and the login page both render branding (name/logo/
    cover photo) before any session exists."""
    _login(client, "superadmin@test.com")
    _complete_setup(client)

    client.cookies.clear()
    resp = client.get("/api/v1/setup/company")
    assert resp.status_code == 200
    assert resp.json()["name"] == "Logo Co"


def test_company_patch_requires_admin_or_super_admin(client, seed_users):
    _login(client, "employee@test.com")
    resp = client.patch("/api/v1/setup/company", json={"industry_label": "Hacked"})
    assert resp.status_code == 403


def test_company_patch_updates_fields(client, seed_users):
    _login(client, "superadmin@test.com")
    client.post(
        "/api/v1/setup/complete",
        json={
            "company_name": "Original Name",
            "default_period_type": "monthly",
            "departments": [{"name": "IT", "positions": []}],
        },
    )

    resp = client.patch("/api/v1/setup/company", json={"industry_label": "Updated"})
    assert resp.status_code == 200
    assert resp.json()["industry_label"] == "Updated"
    assert resp.json()["name"] == "Original Name"


def test_setup_logo_upload_works_before_company_exists(client, seed_users, tmp_path, monkeypatch):
    """The wizard's logo step runs before /setup/complete, so before any
    CompanySettings row exists - /setup/logo must not depend on one."""
    monkeypatch.setattr(setup_api, "LOGO_DIR", tmp_path / "company-logo")

    _login(client, "superadmin@test.com")
    status_before = client.get("/api/v1/setup/status")
    assert status_before.json() == {"setup_completed": False}

    payload = b"\x89PNG\r\n\x1a\n wizard-time upload, no company row yet"
    upload = client.post(
        "/api/v1/setup/logo",
        files={"file": ("logo.png", io.BytesIO(payload), "image/png")},
    )
    assert upload.status_code == 200
    logo_url = upload.json()["logo_url"]
    assert logo_url.startswith("/api/v1/setup/company/logo-file")

    client.cookies.clear()
    fetched = client.get("/api/v1/setup/company/logo-file")
    assert fetched.status_code == 200
    assert fetched.content == payload


def test_setup_logo_requires_super_admin(client, seed_users):
    _login(client, "admin@test.com")
    resp = client.post(
        "/api/v1/setup/logo",
        files={"file": ("logo.png", io.BytesIO(b"\x89PNG fake bytes"), "image/png")},
    )
    assert resp.status_code == 403


def test_cover_image_upload_requires_existing_company(client, seed_users):
    _login(client, "superadmin@test.com")
    resp = client.post(
        "/api/v1/setup/company/cover-image",
        files={"file": ("cover.jpg", io.BytesIO(b"\xff\xd8\xff fake jpeg"), "image/jpeg")},
    )
    assert resp.status_code == 404


def test_cover_image_upload_then_public_fetch_and_remove(client, seed_users, tmp_path, monkeypatch):
    monkeypatch.setattr(setup_api, "COVER_DIR", tmp_path / "company-logo" / "cover")

    _login(client, "superadmin@test.com")
    _complete_setup(client)

    payload = b"\xff\xd8\xff\xe0 fake but good enough for a byte-identity check"
    upload = client.post(
        "/api/v1/setup/company/cover-image",
        files={"file": ("cover.jpg", io.BytesIO(payload), "image/jpeg")},
    )
    assert upload.status_code == 200
    cover_url = upload.json()["cover_image_url"]
    assert cover_url is not None and cover_url.startswith("/api/v1/setup/company/cover-file")

    # public homepage reads this without a session
    saved_cookies = dict(client.cookies)
    client.cookies.clear()
    fetched = client.get("/api/v1/setup/company/cover-file")
    assert fetched.status_code == 200
    assert fetched.content == payload
    client.cookies.update(saved_cookies)

    removed = client.delete("/api/v1/setup/company/cover-image")
    assert removed.status_code == 200
    assert removed.json()["cover_image_url"] is None

    client.cookies.clear()
    after_remove = client.get("/api/v1/setup/company/cover-file")
    assert after_remove.status_code == 404


def test_logo_upload_requires_admin_or_super_admin(client, seed_users):
    _login(client, "superadmin@test.com")
    _complete_setup(client)

    _login(client, "employee@test.com")
    resp = client.post(
        "/api/v1/setup/company/logo",
        files={"file": ("logo.png", io.BytesIO(b"\x89PNG fake bytes"), "image/png")},
    )
    assert resp.status_code == 403


def test_logo_upload_rejects_non_image_type(client, seed_users):
    _login(client, "superadmin@test.com")
    _complete_setup(client)

    resp = client.post(
        "/api/v1/setup/company/logo",
        files={"file": ("logo.txt", io.BytesIO(b"not an image"), "text/plain")},
    )
    assert resp.status_code == 400


def test_logo_upload_rejects_oversized_file(client, seed_users, monkeypatch):
    _login(client, "superadmin@test.com")
    _complete_setup(client)

    monkeypatch.setattr(setup_api, "MAX_LOGO_SIZE", 10)
    resp = client.post(
        "/api/v1/setup/company/logo",
        files={"file": ("logo.png", io.BytesIO(b"way more than ten bytes"), "image/png")},
    )
    assert resp.status_code == 400


def test_logo_upload_then_public_fetch_and_remove(client, seed_users, tmp_path, monkeypatch):
    monkeypatch.setattr(setup_api, "LOGO_DIR", tmp_path / "company-logo")

    _login(client, "superadmin@test.com")
    _complete_setup(client)

    payload = b"\x89PNG\r\n\x1a\n fake but good enough for a byte-identity check"
    upload = client.post(
        "/api/v1/setup/company/logo",
        files={"file": ("logo.png", io.BytesIO(payload), "image/png")},
    )
    assert upload.status_code == 200
    logo_url = upload.json()["logo_url"]
    assert logo_url is not None and logo_url.startswith("/api/v1/setup/company/logo-file")

    # the serving endpoint is public - no session cookie should be required
    saved_cookies = dict(client.cookies)
    client.cookies.clear()
    fetched = client.get("/api/v1/setup/company/logo-file")
    assert fetched.status_code == 200
    assert fetched.content == payload
    client.cookies.update(saved_cookies)

    removed = client.delete("/api/v1/setup/company/logo")
    assert removed.status_code == 200
    assert removed.json()["logo_url"] is None

    client.cookies.clear()
    after_remove = client.get("/api/v1/setup/company/logo-file")
    assert after_remove.status_code == 404
