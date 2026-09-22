from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import OVERSIGHT_ROLES, require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.correction_plan import CorrectionPlan, CorrectionPlanStage, CorrectionPlanStatus
from app.models.user import User
from app.schemas.governance import CorrectionPlanCreate, CorrectionPlanOut
from app.services.audit import log_action

router = APIRouter(prefix="/correction-plans", tags=["correction-plans"])


def _to_out(db: Session, plan: CorrectionPlan) -> CorrectionPlanOut:
    user = db.get(User, plan.user_id)
    return CorrectionPlanOut(
        id=plan.id,
        user_id=plan.user_id,
        user_full_name=user.full_name if user else "",
        period=plan.period,
        stage=plan.stage.value,
        reason=plan.reason,
        load_reduction_percent=plan.load_reduction_percent,
        status=plan.status.value,
        started_by_id=plan.started_by_id,
        started_at=plan.started_at,
        resolved_at=plan.resolved_at,
    )


@router.get("", response_model=list[CorrectionPlanOut])
def list_correction_plans(
    user_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES, "manager")),
) -> list[CorrectionPlanOut]:
    query = select(CorrectionPlan)
    if user_id is not None:
        query = query.where(CorrectionPlan.user_id == user_id)
    plans = db.scalars(query.order_by(CorrectionPlan.started_at.desc())).all()
    return [_to_out(db, p) for p in plans]


@router.post("", response_model=CorrectionPlanOut, status_code=status.HTTP_201_CREATED)
def create_correction_plan(
    payload: CorrectionPlanCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> CorrectionPlanOut:
    locale = get_locale(request)
    if db.get(User, payload.user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("user_not_found", locale))
    try:
        stage = CorrectionPlanStage(payload.stage)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("invalid_status", locale))

    plan = CorrectionPlan(
        user_id=payload.user_id,
        period=payload.period,
        stage=stage,
        reason=payload.reason,
        load_reduction_percent=payload.load_reduction_percent,
        started_by_id=current_user.id,
    )
    db.add(plan)
    db.flush()

    log_action(db, current_user.id, "create", "correction_plan", plan.id)
    db.commit()
    db.refresh(plan)
    return _to_out(db, plan)


@router.patch("/{plan_id}/resolve", response_model=CorrectionPlanOut)
def resolve_correction_plan(
    plan_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> CorrectionPlanOut:
    locale = get_locale(request)
    plan = db.get(CorrectionPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("correction_plan_not_found", locale))

    plan.status = CorrectionPlanStatus.resolved
    plan.resolved_at = datetime.now(timezone.utc)

    log_action(db, current_user.id, "resolve", "correction_plan", plan.id)
    db.commit()
    db.refresh(plan)
    return _to_out(db, plan)
