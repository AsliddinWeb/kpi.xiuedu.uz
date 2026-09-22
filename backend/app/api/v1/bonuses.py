from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import OVERSIGHT_ROLES, require_role
from app.db.session import get_db
from app.models.bonus_approval import BonusApproval
from app.models.user import User
from app.schemas.bonus import BonusApprovalStatus, BonusApproveRequest, BonusRow
from app.services.audit import log_action
from app.services.bonus import compute_bonuses

router = APIRouter(prefix="/bonuses", tags=["bonuses"])


@router.get("", response_model=list[BonusRow])
def list_bonuses(
    period: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> list[BonusRow]:
    return [BonusRow(**row) for row in compute_bonuses(db, period)]


@router.get("/status", response_model=BonusApprovalStatus)
def bonus_status(
    period: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> BonusApprovalStatus:
    approval = db.scalar(select(BonusApproval).where(BonusApproval.period == period))
    return BonusApprovalStatus(
        period=period,
        approved=approval is not None,
        approved_at=approval.approved_at.isoformat() if approval else None,
    )


@router.post("/approve", response_model=BonusApprovalStatus)
def approve_bonuses(
    payload: BonusApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "super_admin")),
) -> BonusApprovalStatus:
    approval = db.scalar(select(BonusApproval).where(BonusApproval.period == payload.period))
    if approval is None:
        approval = BonusApproval(
            period=payload.period,
            approved_by_id=current_user.id,
            approved_at=datetime.now(timezone.utc),
        )
        db.add(approval)
        db.flush()
        log_action(db, current_user.id, "approve_bonus", "bonus_approval", approval.id)
        db.commit()
        db.refresh(approval)

    return BonusApprovalStatus(period=approval.period, approved=True, approved_at=approval.approved_at.isoformat())
