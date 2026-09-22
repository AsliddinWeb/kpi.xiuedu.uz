from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.category_reviewer import CategoryReviewer
from app.models.kpi_category import KpiCategory
from app.models.user import User
from app.schemas.governance import CategoryReviewerIn, CategoryReviewerOut
from app.services.audit import log_action

router = APIRouter(prefix="/category-reviewers", tags=["category-reviewers"])


def _to_out(db: Session, reviewer: CategoryReviewer) -> CategoryReviewerOut:
    category = db.get(KpiCategory, reviewer.kpi_category_id)
    user = db.get(User, reviewer.user_id)
    return CategoryReviewerOut(
        id=reviewer.id,
        kpi_category_id=reviewer.kpi_category_id,
        category_name=category.name if category else "",
        user_id=reviewer.user_id,
        user_full_name=user.full_name if user else "",
    )


@router.get("", response_model=list[CategoryReviewerOut])
def list_category_reviewers(
    kpi_category_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> list[CategoryReviewerOut]:
    query = select(CategoryReviewer)
    if kpi_category_id is not None:
        query = query.where(CategoryReviewer.kpi_category_id == kpi_category_id)
    reviewers = db.scalars(query).all()
    return [_to_out(db, r) for r in reviewers]


@router.post("", response_model=CategoryReviewerOut, status_code=status.HTTP_201_CREATED)
def create_category_reviewer(
    payload: CategoryReviewerIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> CategoryReviewerOut:
    locale = get_locale(request)
    if db.get(KpiCategory, payload.kpi_category_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("kpi_category_not_found", locale))
    if db.get(User, payload.user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("user_not_found", locale))

    existing = db.scalar(
        select(CategoryReviewer).where(
            CategoryReviewer.kpi_category_id == payload.kpi_category_id, CategoryReviewer.user_id == payload.user_id
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("category_reviewer_duplicate", locale))

    reviewer = CategoryReviewer(kpi_category_id=payload.kpi_category_id, user_id=payload.user_id)
    db.add(reviewer)
    db.flush()

    log_action(db, current_user.id, "create", "category_reviewer", reviewer.id)
    db.commit()
    db.refresh(reviewer)
    return _to_out(db, reviewer)


@router.delete("/{reviewer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category_reviewer(
    reviewer_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> None:
    locale = get_locale(request)
    reviewer = db.get(CategoryReviewer, reviewer_id)
    if reviewer is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("category_reviewer_not_found", locale))

    log_action(db, current_user.id, "delete", "category_reviewer", reviewer.id)
    db.delete(reviewer)
    db.commit()
