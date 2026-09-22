import secrets

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.i18n import get_locale, t
from app.core.rate_limit import limiter
from app.core.security import create_access_token, create_refresh_token, decode_token, verify_password
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse, UserOut
from app.services.audit import log_action
from app.services.hemis_oauth import (
    HemisOAuthError,
    build_authorize_url,
    exchange_code_for_token,
    fetch_hemis_profile,
    find_or_create_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
HEMIS_STATE_COOKIE = "hemis_oauth_state"


def _cookie_kwargs() -> dict:
    return dict(
        httponly=True,
        secure=settings.env == "production",
        samesite="lax",
        path="/",
    )


@router.post("/login", response_model=LoginResponse)
@limiter.limit("20/minute")
def login(payload: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)) -> LoginResponse:
    locale = get_locale(request)
    user = db.scalar(select(User).where(User.email == payload.email))
    if user is None or not user.is_active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("invalid_credentials", locale))

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    response.set_cookie(
        ACCESS_COOKIE, access_token, max_age=settings.jwt_access_expire_minutes * 60, **_cookie_kwargs()
    )
    response.set_cookie(
        REFRESH_COOKIE, refresh_token, max_age=settings.jwt_refresh_expire_days * 86400, **_cookie_kwargs()
    )

    log_action(db, user.id, "login", "user", user.id)
    db.commit()

    return LoginResponse(user=UserOut.model_validate(user))


@router.post("/refresh", response_model=LoginResponse)
def refresh(request: Request, response: Response, db: Session = Depends(get_db)) -> LoginResponse:
    locale = get_locale(request)
    token = request.cookies.get(REFRESH_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("refresh_token_missing", locale))

    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("refresh_token_invalid", locale))

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("invalid_token_type", locale))

    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("user_not_found_or_inactive", locale))

    access_token = create_access_token(user.id)
    response.set_cookie(
        ACCESS_COOKIE, access_token, max_age=settings.jwt_access_expire_minutes * 60, **_cookie_kwargs()
    )

    return LoginResponse(user=UserOut.model_validate(user))


@router.post("/logout")
def logout(response: Response) -> dict:
    response.delete_cookie(ACCESS_COOKIE, path="/")
    response.delete_cookie(REFRESH_COOKIE, path="/")
    return {"status": "ok"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)


@router.get("/hemis/login")
def hemis_login(request: Request) -> RedirectResponse:
    locale = get_locale(request)
    if not settings.hemis_client_id or not settings.hemis_redirect_uri:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=t("hemis_oauth_not_configured", locale))

    state = secrets.token_urlsafe(24)
    redirect = RedirectResponse(build_authorize_url(state))
    redirect.set_cookie(HEMIS_STATE_COOKIE, state, max_age=300, **_cookie_kwargs())
    return redirect


@router.get("/hemis/callback")
def hemis_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    login_url = f"{settings.frontend_base_url}/login"

    if error or not code:
        return RedirectResponse(f"{login_url}?error=hemis_denied")

    expected_state = request.cookies.get(HEMIS_STATE_COOKIE)
    if not expected_state or not state or state != expected_state:
        return RedirectResponse(f"{login_url}?error=hemis_state")

    try:
        access_token = exchange_code_for_token(code)
        profile = fetch_hemis_profile(access_token)
    except HemisOAuthError:
        return RedirectResponse(f"{login_url}?error=hemis_failed")

    user = find_or_create_user(db, profile)
    if not user.is_active:
        db.rollback()
        return RedirectResponse(f"{login_url}?error=hemis_inactive")

    log_action(db, user.id, "login", "user", user.id)
    db.commit()
    db.refresh(user)

    access = create_access_token(user.id)
    refresh = create_refresh_token(user.id)

    redirect = RedirectResponse(f"{settings.frontend_base_url}/dashboard")
    redirect.delete_cookie(HEMIS_STATE_COOKIE, path="/")
    redirect.set_cookie(ACCESS_COOKIE, access, max_age=settings.jwt_access_expire_minutes * 60, **_cookie_kwargs())
    redirect.set_cookie(REFRESH_COOKIE, refresh, max_age=settings.jwt_refresh_expire_days * 86400, **_cookie_kwargs())
    return redirect
