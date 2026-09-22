from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.category_head_approver import CategoryHeadApprover
from app.models.kpi_category import KpiCategory
from app.models.kpi_indicator import KpiIndicator
from app.models.user import User
from app.schemas.governance import CategoryHeadApproverIn, CategoryHeadApproverOut
from app.services.audit import log_action

router = APIRouter(prefix="/category-head-approvers", tags=["category-head-approvers"])


def _to_out(db: Session, approver: CategoryHeadApprover) -> CategoryHeadApproverOut:
    category = db.get(KpiCategory, approver.kpi_category_id)
    indicator = db.get(KpiIndicator, approver.kpi_indicator_id) if approver.kpi_indicator_id else None
    user = db.get(User, approver.user_id)
    return CategoryHeadApproverOut(
        id=approver.id,
        kpi_category_id=approver.kpi_category_id,
        category_name=category.name if category else "",
        kpi_indicator_id=approver.kpi_indicator_id,
        indicator_name=indicator.name if indicator else None,
        user_id=approver.user_id,
        user_full_name=user.full_name if user else "",
    )


@router.get("", response_model=list[CategoryHeadApproverOut])
def list_category_head_approvers(
    kpi_category_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> list[CategoryHeadApproverOut]:
    query = select(CategoryHeadApprover)
    if kpi_category_id is not None:
        query = query.where(CategoryHeadApprover.kpi_category_id == kpi_category_id)
    approvers = db.scalars(query).all()
    return [_to_out(db, a) for a in approvers]


@router.post("", response_model=CategoryHeadApproverOut, status_code=status.HTTP_201_CREATED)
def create_category_head_approver(
    payload: CategoryHeadApproverIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> CategoryHeadApproverOut:
    locale = get_locale(request)
    if db.get(KpiCategory, payload.kpi_category_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("kpi_category_not_found", locale))
    if db.get(User, payload.user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("user_not_found", locale))
    if payload.kpi_indicator_id is not None:
        indicator = db.get(KpiIndicator, payload.kpi_indicator_id)
        if indicator is None or indicator.kpi_category_id != payload.kpi_category_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("indicator_not_found", locale))

    existing = db.scalar(
        select(CategoryHeadApprover).where(
            CategoryHeadApprover.kpi_category_id == payload.kpi_category_id,
            CategoryHeadApprover.kpi_indicator_id == payload.kpi_indicator_id,
            CategoryHeadApprover.user_id == payload.user_id,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("category_reviewer_duplicate", locale))

    approver = CategoryHeadApprover(
        kpi_category_id=payload.kpi_category_id,
        kpi_indicator_id=payload.kpi_indicator_id,
        user_id=payload.user_id,
    )
    db.add(approver)
    db.flush()

    log_action(db, current_user.id, "create", "category_head_approver", approver.id)
    db.commit()
    db.refresh(approver)
    return _to_out(db, approver)


@router.delete("/{approver_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category_head_approver(
    approver_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> None:
    locale = get_locale(request)
    approver = db.get(CategoryHeadApprover, approver_id)
    if approver is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("category_reviewer_not_found", locale))

    log_action(db, current_user.id, "delete", "category_head_approver", approver.id)
    db.delete(approver)
    db.commit()
