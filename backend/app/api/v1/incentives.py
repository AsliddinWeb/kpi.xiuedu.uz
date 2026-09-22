from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import OVERSIGHT_ROLES, get_current_user, require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.incentive import Incentive, IncentiveStatus, IncentiveType
from app.models.user import User
from app.schemas.governance import IncentiveCreate, IncentiveOut, IncentiveRevoke
from app.services.audit import log_action

router = APIRouter(prefix="/incentives", tags=["incentives"])


def _to_out(db: Session, incentive: Incentive) -> IncentiveOut:
    user = db.get(User, incentive.user_id)
    return IncentiveOut(
        id=incentive.id,
        user_id=incentive.user_id,
        user_full_name=user.full_name if user else "",
        period=incentive.period,
        type=incentive.type.value,
        title=incentive.title,
        description=incentive.description,
        amount=incentive.amount,
        decided_by_id=incentive.decided_by_id,
        decided_at=incentive.decided_at,
        status=incentive.status.value,
        revoked_at=incentive.revoked_at,
        revoked_reason=incentive.revoked_reason,
    )


@router.get("", response_model=list[IncentiveOut])
def list_incentives(
    request: Request,
    user_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[IncentiveOut]:
    locale = get_locale(request)
    query = select(Incentive)
    if user_id is not None:
        if current_user.id != user_id and current_user.role not in OVERSIGHT_ROLES:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))
        query = query.where(Incentive.user_id == user_id)
    elif current_user.role not in OVERSIGHT_ROLES:
        query = query.where(Incentive.user_id == current_user.id)

    incentives = db.scalars(query.order_by(Incentive.decided_at.desc())).all()
    return [_to_out(db, i) for i in incentives]


@router.post("", response_model=IncentiveOut, status_code=status.HTTP_201_CREATED)
def create_incentive(
    payload: IncentiveCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> IncentiveOut:
    locale = get_locale(request)
    if db.get(User, payload.user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("user_not_found", locale))
    try:
        incentive_type = IncentiveType(payload.type)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("invalid_status", locale))

    incentive = Incentive(
        user_id=payload.user_id,
        period=payload.period,
        type=incentive_type,
        title=payload.title,
        description=payload.description,
        amount=payload.amount,
        decided_by_id=current_user.id,
    )
    db.add(incentive)
    db.flush()

    log_action(db, current_user.id, "create", "incentive", incentive.id)
    db.commit()
    db.refresh(incentive)
    return _to_out(db, incentive)


@router.patch("/{incentive_id}/revoke", response_model=IncentiveOut)
def revoke_incentive(
    incentive_id: int,
    payload: IncentiveRevoke,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> IncentiveOut:
    locale = get_locale(request)
    incentive = db.get(Incentive, incentive_id)
    if incentive is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("incentive_not_found", locale))
    if incentive.status == IncentiveStatus.revoked:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("incentive_already_revoked", locale))

    incentive.status = IncentiveStatus.revoked
    incentive.revoked_reason = payload.revoked_reason
    incentive.revoked_at = datetime.now(timezone.utc)

    log_action(db, current_user.id, "revoke", "incentive", incentive.id)
    db.commit()
    db.refresh(incentive)
    return _to_out(db, incentive)
