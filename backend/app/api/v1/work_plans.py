from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import OVERSIGHT_ROLES, can_manage_employee, get_current_user
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.kpi_indicator import KpiIndicator
from app.models.user import User
from app.models.work_plan import WorkPlan, WorkPlanStatus
from app.models.work_plan_item import WorkPlanItem
from app.schemas.work_plan import WorkPlanCreate, WorkPlanItemFulfillment, WorkPlanOut
from app.services.audit import log_action
from app.services.work_plan import evaluate_item_fulfillment

router = APIRouter(prefix="/work-plans", tags=["work-plans"])


def _to_out(db: Session, plan: WorkPlan) -> WorkPlanOut:
    user = db.get(User, plan.user_id)
    items = db.scalars(select(WorkPlanItem).where(WorkPlanItem.work_plan_id == plan.id)).all()
    fulfillments = [
        WorkPlanItemFulfillment(**evaluate_item_fulfillment(db, item, plan.user_id, plan.period)) for item in items
    ]
    return WorkPlanOut(
        id=plan.id,
        user_id=plan.user_id,
        user_full_name=user.full_name if user else "",
        period=plan.period,
        status=plan.status.value,
        created_at=plan.created_at,
        items=fulfillments,
    )


def _can_view(current_user: User, target_user_id: int, db: Session) -> bool:
    if current_user.id == target_user_id:
        return True
    if current_user.role in OVERSIGHT_ROLES:
        return True
    target = db.get(User, target_user_id)
    return target is not None and can_manage_employee(current_user, target)


@router.post("", response_model=WorkPlanOut, status_code=status.HTTP_201_CREATED)
def create_work_plan(
    payload: WorkPlanCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkPlanOut:
    locale = get_locale(request)

    existing = db.scalar(
        select(WorkPlan).where(WorkPlan.user_id == current_user.id, WorkPlan.period == payload.period)
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("work_plan_already_exists", locale))

    for item_in in payload.items:
        if db.get(KpiIndicator, item_in.kpi_indicator_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("indicator_not_found", locale))

    plan = WorkPlan(user_id=current_user.id, period=payload.period, status=WorkPlanStatus.active)
    db.add(plan)
    db.flush()

    for item_in in payload.items:
        db.add(
            WorkPlanItem(
                work_plan_id=plan.id,
                kpi_indicator_id=item_in.kpi_indicator_id,
                planned_count=item_in.planned_count,
                planned_score=item_in.planned_score,
                notes=item_in.notes,
            )
        )

    log_action(db, current_user.id, "create", "work_plan", plan.id)
    db.commit()
    db.refresh(plan)
    return _to_out(db, plan)


@router.get("", response_model=list[WorkPlanOut])
def list_work_plans(
    request: Request,
    user_id: int | None = None,
    period: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[WorkPlanOut]:
    locale = get_locale(request)
    query = select(WorkPlan)

    if user_id is not None:
        if not _can_view(current_user, user_id, db):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))
        query = query.where(WorkPlan.user_id == user_id)
    elif current_user.role not in OVERSIGHT_ROLES:
        query = query.where(WorkPlan.user_id == current_user.id)

    if period:
        query = query.where(WorkPlan.period == period)

    plans = db.scalars(query.order_by(WorkPlan.created_at.desc())).all()
    return [_to_out(db, p) for p in plans]


@router.patch("/{plan_id}/close", response_model=WorkPlanOut)
def close_work_plan(
    plan_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> WorkPlanOut:
    locale = get_locale(request)
    plan = db.get(WorkPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("work_plan_not_found", locale))
    if current_user.id != plan.user_id and current_user.role not in OVERSIGHT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))

    plan.status = WorkPlanStatus.closed
    log_action(db, current_user.id, "close", "work_plan", plan.id)
    db.commit()
    db.refresh(plan)
    return _to_out(db, plan)
