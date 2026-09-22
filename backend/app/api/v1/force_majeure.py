from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import OVERSIGHT_ROLES, get_current_user, require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.force_majeure import ForceMajeureCategory, ForceMajeureDeclaration, ForceMajeureStatus
from app.models.user import User
from app.schemas.governance import ForceMajeureCreate, ForceMajeureOut
from app.services.audit import log_action

router = APIRouter(prefix="/force-majeure", tags=["force-majeure"])


def _to_out(declaration: ForceMajeureDeclaration) -> ForceMajeureOut:
    return ForceMajeureOut(
        id=declaration.id,
        declared_by_id=declaration.declared_by_id,
        affected_user_id=declaration.affected_user_id,
        period=declaration.period,
        category=declaration.category.value,
        description=declaration.description,
        extension_days=declaration.extension_days,
        status=declaration.status.value,
        started_at=declaration.started_at,
        resolved_at=declaration.resolved_at,
    )


@router.get("", response_model=list[ForceMajeureOut])
def list_force_majeure(
    period: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ForceMajeureOut]:
    query = select(ForceMajeureDeclaration)
    if period:
        query = query.where(ForceMajeureDeclaration.period == period)
    if current_user.role not in OVERSIGHT_ROLES:
        query = query.where(
            (ForceMajeureDeclaration.affected_user_id == current_user.id)
            | (ForceMajeureDeclaration.affected_user_id.is_(None))
        )
    declarations = db.scalars(query.order_by(ForceMajeureDeclaration.started_at.desc())).all()
    return [_to_out(d) for d in declarations]


@router.post("", response_model=ForceMajeureOut, status_code=status.HTTP_201_CREATED)
def declare_force_majeure(
    payload: ForceMajeureCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin", "manager")),
) -> ForceMajeureOut:
    locale = get_locale(request)
    if payload.affected_user_id is not None and db.get(User, payload.affected_user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("user_not_found", locale))
    try:
        category = ForceMajeureCategory(payload.category)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("invalid_status", locale))

    declaration = ForceMajeureDeclaration(
        declared_by_id=current_user.id,
        affected_user_id=payload.affected_user_id,
        period=payload.period,
        category=category,
        description=payload.description,
        extension_days=payload.extension_days,
    )
    db.add(declaration)
    db.flush()

    log_action(db, current_user.id, "declare", "force_majeure", declaration.id)
    db.commit()
    db.refresh(declaration)
    return _to_out(declaration)


@router.patch("/{declaration_id}/acknowledge", response_model=ForceMajeureOut)
def acknowledge_force_majeure(
    declaration_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> ForceMajeureOut:
    locale = get_locale(request)
    declaration = db.get(ForceMajeureDeclaration, declaration_id)
    if declaration is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("force_majeure_not_found", locale))

    declaration.status = ForceMajeureStatus.acknowledged
    log_action(db, current_user.id, "acknowledge", "force_majeure", declaration.id)
    db.commit()
    db.refresh(declaration)
    return _to_out(declaration)


@router.patch("/{declaration_id}/resolve", response_model=ForceMajeureOut)
def resolve_force_majeure(
    declaration_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> ForceMajeureOut:
    locale = get_locale(request)
    declaration = db.get(ForceMajeureDeclaration, declaration_id)
    if declaration is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("force_majeure_not_found", locale))

    declaration.status = ForceMajeureStatus.resolved
    declaration.resolved_at = datetime.now(timezone.utc)
    log_action(db, current_user.id, "resolve", "force_majeure", declaration.id)
    db.commit()
    db.refresh(declaration)
    return _to_out(declaration)
