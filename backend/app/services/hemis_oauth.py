import secrets
from datetime import date, datetime, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import AuthProvider, User, UserRole

# Field set requested from HEMIS's OAuth resource-owner endpoint
# (oauth/api/user) - matches the "employee" scope shown in HEMIS's own
# reference integration (github.com/homidjonov/hemis-oauth).
HEMIS_PROFILE_FIELDS = (
    "id,uuid,employee_id_number,type,roles,name,login,email,picture,"
    "firstname,surname,patronymic,birth_date,university_id,phone"
)


class HemisOAuthError(Exception):
    """Raised when the HEMIS authorize/token exchange or profile fetch fails."""


def build_authorize_url(state: str) -> str:
    params = {
        "client_id": settings.hemis_client_id,
        "redirect_uri": settings.hemis_redirect_uri,
        "response_type": "code",
        "state": state,
    }
    return f"{settings.hemis_base_url}/oauth/authorize?{urlencode(params)}"


def exchange_code_for_token(code: str) -> str:
    """POST the authorization code to HEMIS's token endpoint, return the access token."""
    response = httpx.post(
        f"{settings.hemis_base_url}/oauth/access-token",
        data={
            "grant_type": "authorization_code",
            "code": code,
            "client_id": settings.hemis_client_id,
            "client_secret": settings.hemis_client_secret,
            "redirect_uri": settings.hemis_redirect_uri,
        },
        headers={"Accept": "application/json"},
        timeout=15,
    )
    if response.status_code != 200:
        raise HemisOAuthError(f"token exchange failed: {response.status_code} {response.text[:300]}")
    body = response.json()
    access_token = body.get("access_token")
    if not access_token:
        raise HemisOAuthError("token exchange response missing access_token")
    return access_token


def fetch_hemis_profile(access_token: str) -> dict[str, Any]:
    response = httpx.get(
        f"{settings.hemis_base_url}/oauth/api/user",
        params={"fields": HEMIS_PROFILE_FIELDS},
        headers={"Authorization": f"Bearer {access_token}", "Accept": "application/json"},
        timeout=15,
    )
    if response.status_code != 200:
        raise HemisOAuthError(f"profile fetch failed: {response.status_code} {response.text[:300]}")
    body = response.json()
    # HEMIS's data endpoints commonly wrap the payload as {"success": true, "data": {...}}.
    return body.get("data", body) if isinstance(body, dict) else body


def _parse_birth_date(value: Any) -> date | None:
    if not value:
        return None
    try:
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value, tz=timezone.utc).date()
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
    except (ValueError, TypeError, OSError):
        return None


def _display_name(profile: dict[str, Any]) -> str:
    name = profile.get("name")
    if name:
        return str(name)
    parts = [profile.get("surname"), profile.get("firstname"), profile.get("patronymic")]
    joined = " ".join(str(p) for p in parts if p)
    return joined or str(profile.get("login") or profile.get("email") or "HEMIS foydalanuvchisi")


def find_or_create_user(db: Session, profile: dict[str, Any]) -> User:
    """Match an incoming HEMIS profile to a local User (by hemis_uuid, then by
    email), or provision a brand-new one. Never overwrites locally-managed
    fields (role, department, position, kpi_template) on an existing match -
    those stay under this app's own admin control; only the hemis_* mirror
    columns and auth_provider are kept in sync on every login.
    """
    hemis_uuid = str(profile.get("uuid") or "") or None
    email = (profile.get("email") or "").strip().lower() or None

    user = None
    if hemis_uuid:
        user = db.scalar(select(User).where(User.hemis_uuid == hemis_uuid))
    if user is None and email:
        user = db.scalar(select(User).where(User.email == email))

    if user is None:
        user = User(
            email=email or f"hemis-{hemis_uuid or secrets.token_hex(6)}@hemis.local",
            password_hash=hash_password(secrets.token_urlsafe(32)),
            full_name=_display_name(profile),
            role=UserRole.employee,
        )
        db.add(user)

    user.auth_provider = AuthProvider.hemis
    user.hemis_uuid = hemis_uuid or user.hemis_uuid
    user.hemis_id = str(profile.get("id")) if profile.get("id") is not None else user.hemis_id
    user.hemis_employee_id_number = profile.get("employee_id_number") or user.hemis_employee_id_number
    user.hemis_login = profile.get("login") or user.hemis_login
    user.hemis_type = profile.get("type") or user.hemis_type
    roles = profile.get("roles")
    if roles is not None:
        user.hemis_roles = ",".join(str(r) for r in roles) if isinstance(roles, list) else str(roles)
    user.hemis_first_name = profile.get("firstname") or user.hemis_first_name
    user.hemis_surname = profile.get("surname") or user.hemis_surname
    user.hemis_patronymic = profile.get("patronymic") or user.hemis_patronymic
    parsed_birth_date = _parse_birth_date(profile.get("birth_date"))
    if parsed_birth_date:
        user.hemis_birth_date = parsed_birth_date
    if profile.get("university_id") is not None:
        user.hemis_university_id = str(profile.get("university_id"))
    user.hemis_phone = profile.get("phone") or user.hemis_phone
    user.hemis_email = email or user.hemis_email
    user.hemis_picture_url = profile.get("picture") or user.hemis_picture_url
    user.hemis_last_synced_at = datetime.now(timezone.utc)

    db.flush()
    return user
