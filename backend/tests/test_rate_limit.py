import pytest

from app.core.rate_limit import limiter
from tests.conftest import TEST_PASSWORD


@pytest.fixture()
def rate_limiting_enabled():
    previous = limiter.enabled
    limiter.enabled = True
    limiter._storage.reset()
    yield
    limiter.enabled = previous
    limiter._storage.reset()


def test_login_rate_limited_after_20_attempts(client, seed_users, rate_limiting_enabled):
    for _ in range(20):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "employee@test.com", "password": "wrong-password"},
        )
        assert resp.status_code == 401

    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "employee@test.com", "password": "wrong-password"},
    )
    assert resp.status_code == 429


def test_login_succeeds_within_limit(client, seed_users, rate_limiting_enabled):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "employee@test.com", "password": TEST_PASSWORD},
    )
    assert resp.status_code == 200


def test_login_not_rate_limited_when_disabled(client, seed_users):
    for _ in range(25):
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "employee@test.com", "password": "wrong-password"},
        )
        assert resp.status_code == 401
