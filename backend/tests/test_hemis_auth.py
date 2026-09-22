from urllib.parse import parse_qs, urlparse

import pytest

from app.api.v1 import auth as auth_api
from app.models.user import User


@pytest.fixture(autouse=True)
def _configure_hemis(monkeypatch):
    monkeypatch.setattr(auth_api.settings, "hemis_client_id", "test-client-id")
    monkeypatch.setattr(auth_api.settings, "hemis_client_secret", "test-client-secret")
    monkeypatch.setattr(auth_api.settings, "hemis_base_url", "https://hemis.example.uz")
    monkeypatch.setattr(auth_api.settings, "hemis_redirect_uri", "http://testserver/api/v1/auth/hemis/callback")
    monkeypatch.setattr(auth_api.settings, "frontend_base_url", "http://testserver")


def test_hemis_login_unconfigured_returns_503(client, monkeypatch):
    monkeypatch.setattr(auth_api.settings, "hemis_client_id", "")
    resp = client.get("/api/v1/auth/hemis/login", follow_redirects=False)
    assert resp.status_code == 503


def test_hemis_login_redirects_to_authorize_url_with_state_cookie(client):
    resp = client.get("/api/v1/auth/hemis/login", follow_redirects=False)
    assert resp.status_code in (302, 307)

    location = resp.headers["location"]
    parsed = urlparse(location)
    assert f"{parsed.scheme}://{parsed.netloc}" == "https://hemis.example.uz"
    assert parsed.path == "/oauth/authorize"

    query = parse_qs(parsed.query)
    assert query["client_id"] == ["test-client-id"]
    assert query["redirect_uri"] == ["http://testserver/api/v1/auth/hemis/callback"]
    assert query["response_type"] == ["code"]
    assert "state" in query

    assert "hemis_oauth_state" in resp.cookies


def test_hemis_callback_denied_redirects_with_error(client):
    resp = client.get("/api/v1/auth/hemis/callback?error=access_denied", follow_redirects=False)
    assert resp.status_code in (302, 307)
    assert resp.headers["location"] == "http://testserver/login?error=hemis_denied"


def test_hemis_callback_state_mismatch_redirects_with_error(client):
    client.cookies.set("hemis_oauth_state", "expected-state")
    resp = client.get("/api/v1/auth/hemis/callback?code=abc&state=wrong-state", follow_redirects=False)
    assert resp.status_code in (302, 307)
    assert resp.headers["location"] == "http://testserver/login?error=hemis_state"


def test_hemis_callback_creates_new_user_and_sets_session(client, db_session, monkeypatch):
    monkeypatch.setattr(auth_api, "exchange_code_for_token", lambda code: "fake-access-token")
    monkeypatch.setattr(
        auth_api,
        "fetch_hemis_profile",
        lambda token: {
            "uuid": "hemis-uuid-1",
            "id": 501,
            "email": "new.hemis.user@xiuedu.uz",
            "firstname": "Aziz",
            "surname": "Yusupov",
            "patronymic": "Alisherovich",
            "login": "a.yusupov",
            "type": "employee",
            "roles": ["employee"],
            "phone": "+998901234567",
            "employee_id_number": "12345",
            "university_id": "1",
        },
    )

    client.cookies.set("hemis_oauth_state", "matching-state")
    resp = client.get("/api/v1/auth/hemis/callback?code=abc123&state=matching-state", follow_redirects=False)

    assert resp.status_code in (302, 307)
    assert resp.headers["location"] == "http://testserver/dashboard"
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies

    user = db_session.query(User).filter(User.hemis_uuid == "hemis-uuid-1").first()
    assert user is not None
    assert user.email == "new.hemis.user@xiuedu.uz"
    assert user.full_name == "Yusupov Aziz Alisherovich"
    assert user.role.value == "employee"
    assert user.auth_provider.value == "hemis"
    assert user.hemis_employee_id_number == "12345"
    assert user.hemis_phone == "+998901234567"


def test_hemis_callback_links_existing_user_by_email_without_changing_role(client, db_session, seed_users, monkeypatch):
    existing = seed_users["manager"]
    assert existing.role.value == "manager"

    monkeypatch.setattr(auth_api, "exchange_code_for_token", lambda code: "fake-access-token")
    monkeypatch.setattr(
        auth_api,
        "fetch_hemis_profile",
        lambda token: {
            "uuid": "hemis-uuid-manager",
            "id": 777,
            "email": existing.email,
            "firstname": "Test",
            "surname": "Manager",
        },
    )

    client.cookies.set("hemis_oauth_state", "state-x")
    resp = client.get("/api/v1/auth/hemis/callback?code=xyz&state=state-x", follow_redirects=False)
    assert resp.status_code in (302, 307)

    db_session.refresh(existing)
    assert existing.hemis_uuid == "hemis-uuid-manager"
    assert existing.auth_provider.value == "hemis"
    assert existing.role.value == "manager"

    total_users = db_session.query(User).count()
    assert db_session.query(User).filter(User.email == existing.email).count() == 1
    assert total_users == len(seed_users)


def test_hemis_callback_provider_error_redirects_without_creating_user(client, db_session, monkeypatch):
    def _boom(code):
        from app.services.hemis_oauth import HemisOAuthError

        raise HemisOAuthError("boom")

    monkeypatch.setattr(auth_api, "exchange_code_for_token", _boom)

    before = db_session.query(User).count()
    client.cookies.set("hemis_oauth_state", "state-y")
    resp = client.get("/api/v1/auth/hemis/callback?code=zzz&state=state-y", follow_redirects=False)

    assert resp.status_code in (302, 307)
    assert resp.headers["location"] == "http://testserver/login?error=hemis_failed"
    assert db_session.query(User).count() == before
