from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import OVERSIGHT_ROLES, get_current_user, require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.kpi_result import KpiResult, KpiResultStatus
from app.models.user import User
from app.schemas.kpi_result import KpiResultOut
from app.services.audit import log_action

router = APIRouter(prefix="/kpi-results", tags=["kpi-results"])


def _to_out(result: KpiResult) -> KpiResultOut:
    return KpiResultOut(
        id=result.id,
        user_id=result.user_id,
        kpi_template_id=result.kpi_template_id,
        period=result.period,
        total_score=result.total_score,
        category_breakdown=result.category_breakdown,
        status=result.status.value,
        approved_at=result.approved_at,
        computed_at=result.computed_at,
    )


@router.get("", response_model=list[KpiResultOut])
def list_kpi_results(
    request: Request,
    user_id: int | None = None,
    period: str | None = None,
    status_filter: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[KpiResultOut]:
    locale = get_locale(request)
    query = select(KpiResult)

    if user_id is not None:
        if current_user.id != user_id and current_user.role not in OVERSIGHT_ROLES:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))
        query = query.where(KpiResult.user_id == user_id)
    elif current_user.role not in OVERSIGHT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))

    if period:
        query = query.where(KpiResult.period == period)
    if status_filter:
        query = query.where(KpiResult.status == KpiResultStatus(status_filter))
    results = db.scalars(query).all()
    return [_to_out(r) for r in results]


@router.patch("/{result_id}/approve", response_model=KpiResultOut)
def approve_kpi_result(
    result_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> KpiResultOut:
    locale = get_locale(request)
    result = db.get(KpiResult, result_id)
    if result is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("kpi_result_not_found", locale))

    result.status = KpiResultStatus.approved
    result.approved_at = datetime.now(timezone.utc)

    log_action(db, current_user.id, "approve", "kpi_result", result.id)
    db.commit()
    db.refresh(result)
    return _to_out(result)
