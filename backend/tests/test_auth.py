from tests.conftest import TEST_PASSWORD


def test_login_success_sets_cookies(client, seed_users):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "employee@test.com", "password": TEST_PASSWORD},
    )
    assert resp.status_code == 200
    assert resp.json()["user"]["email"] == "employee@test.com"
    assert "access_token" in resp.cookies
    assert "refresh_token" in resp.cookies


def test_login_wrong_password(client, seed_users):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "employee@test.com", "password": "wrong-password"},
    )
    assert resp.status_code == 401


def test_login_unknown_email(client, seed_users):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@test.com", "password": TEST_PASSWORD},
    )
    assert resp.status_code == 401


def test_login_inactive_user_rejected(client, seed_users):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "inactive@test.com", "password": TEST_PASSWORD},
    )
    assert resp.status_code == 401


def test_me_requires_auth(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_me_returns_current_user(client, seed_users):
    client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": TEST_PASSWORD})
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    assert resp.json()["role"] == "admin"


def test_logout_clears_access(client, seed_users):
    client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": TEST_PASSWORD})
    client.post("/api/v1/auth/logout")
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_refresh_issues_new_access_token(client, seed_users):
    client.post("/api/v1/auth/login", json={"email": "admin@test.com", "password": TEST_PASSWORD})
    resp = client.post("/api/v1/auth/refresh")
    assert resp.status_code == 200
    assert "access_token" in resp.cookies
