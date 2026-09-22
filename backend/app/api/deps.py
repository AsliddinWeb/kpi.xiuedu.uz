import jwt
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.i18n import get_locale, t
from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

ACCESS_COOKIE = "access_token"

CONFIG_ROLES = ("super_admin", "admin")
"""System-configuration roles: setup wizard, templates, structure, settings, user CRUD."""

RECTOR_ROLES = ("rector", "prorektor_birinchi", "prorektor_oquv", "prorektor_xalqaro")
"""Nizom 3.2/25-band: Rektor + 3 prorektor yo'nalishlari — KPI oversight, no configuration."""

OVERSIGHT_ROLES = CONFIG_ROLES + RECTOR_ROLES
"""Read access for "rector/prorektor sees everything" (Nizom-feedback band 10a) without granting config writes."""


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    locale = get_locale(request)
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("not_authenticated", locale))

    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("invalid_token", locale))

    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("invalid_token_type", locale))

    user = db.get(User, int(payload["sub"]))
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=t("user_not_found_or_inactive", locale))

    return user


def require_role(*roles: str):
    def dependency(request: Request, current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", get_locale(request))
            )
        return current_user

    return dependency


def can_manage_employee(current_user: User, target_user: User) -> bool:
    """Whether current_user may endorse/manage target_user: admins always can,
    a manager only for their own direct reports."""
    if current_user.role in ("super_admin", "admin"):
        return True
    return current_user.role == "manager" and target_user.manager_id == current_user.id


def can_review_category(db: Session, current_user: User, kpi_category_id: int) -> bool:
    """Whether current_user is authorized to score arizalar in this category: admins
    always can, otherwise the user must be an assigned CategoryReviewer for it."""
    from app.models.category_reviewer import CategoryReviewer

    if current_user.role in ("super_admin", "admin"):
        return True
    return (
        db.scalar(
            select(CategoryReviewer).where(
                CategoryReviewer.kpi_category_id == kpi_category_id, CategoryReviewer.user_id == current_user.id
            )
        )
        is not None
    )


def can_approve_category_head(db: Session, current_user: User, kpi_category_id: int, kpi_indicator_id: int) -> bool:
    """Whether current_user may give the second-stage (head) approval for this specific
    ariza's indicator: admins always can. Rector/prorektor roles do NOT get an automatic
    bypass here (unlike CONFIG_ROLES) - Nizom 3.2/25-band assigns each of them to a
    specific direction, so they must be an assigned CategoryHeadApprover. An assignment
    with kpi_indicator_id=None covers the whole category (CategoryReviewer-style); one
    with kpi_indicator_id set is scoped to only that indicator within the category (e.g.
    each of the 4 "Rahbar tavsiyasi" indicators has its own dedicated approver)."""
    from app.models.category_head_approver import CategoryHeadApprover

    if current_user.role in CONFIG_ROLES:
        return True
    return (
        db.scalar(
            select(CategoryHeadApprover).where(
                CategoryHeadApprover.kpi_category_id == kpi_category_id,
                CategoryHeadApprover.user_id == current_user.id,
                (CategoryHeadApprover.kpi_indicator_id.is_(None))
                | (CategoryHeadApprover.kpi_indicator_id == kpi_indicator_id),
            )
        )
        is not None
    )
