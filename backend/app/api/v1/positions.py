from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.position import Position
from app.models.user import User
from app.schemas.organization import PositionOut, PositionUpdate
from app.services.audit import log_action

router = APIRouter(prefix="/positions", tags=["positions"])


@router.patch("/{position_id}", response_model=PositionOut)
def update_position(
    position_id: int,
    payload: PositionUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> PositionOut:
    locale = get_locale(request)
    position = db.get(Position, position_id)
    if position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("position_not_found", locale))

    if payload.title is not None:
        position.title = payload.title
    if payload.bonus_fund is not None:
        position.bonus_fund = payload.bonus_fund
    if payload.minimal_score is not None:
        position.minimal_score = payload.minimal_score

    log_action(db, current_user.id, "update", "position", position.id)
    db.commit()
    db.refresh(position)
    return PositionOut.model_validate(position)


@router.delete("/{position_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_position(
    position_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> None:
    locale = get_locale(request)
    position = db.get(Position, position_id)
    if position is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("position_not_found", locale))

    has_users = db.scalar(select(User).where(User.position_id == position_id)) is not None
    if has_users:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("position_in_use", locale))

    log_action(db, current_user.id, "delete", "position", position.id)
    db.delete(position)
    db.commit()
