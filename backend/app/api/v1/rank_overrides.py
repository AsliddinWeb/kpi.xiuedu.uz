from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.category_rank_override import CategoryRankOverride
from app.models.indicator_rank_override import IndicatorRankOverride
from app.models.kpi_category import KpiCategory
from app.models.kpi_indicator import KpiIndicator
from app.models.user import User
from app.schemas.rank_override import (
    CategoryRankOverrideIn,
    CategoryRankOverrideOut,
    IndicatorRankOverrideIn,
    IndicatorRankOverrideOut,
    RankOverrideScoreUpdate,
)
from app.services.audit import log_action

router = APIRouter(prefix="/rank-overrides", tags=["rank-overrides"])


def _indicator_out(db: Session, override: IndicatorRankOverride) -> IndicatorRankOverrideOut:
    indicator = db.get(KpiIndicator, override.kpi_indicator_id)
    return IndicatorRankOverrideOut(
        id=override.id,
        kpi_indicator_id=override.kpi_indicator_id,
        indicator_name=indicator.name if indicator else "",
        has_title=override.has_title,
        max_score=override.max_score,
    )


def _category_out(db: Session, override: CategoryRankOverride) -> CategoryRankOverrideOut:
    category = db.get(KpiCategory, override.kpi_category_id)
    return CategoryRankOverrideOut(
        id=override.id,
        kpi_category_id=override.kpi_category_id,
        category_name=category.name if category else "",
        has_title=override.has_title,
        max_score=override.max_score,
    )


@router.get("/indicators", response_model=list[IndicatorRankOverrideOut])
def list_indicator_rank_overrides(
    kpi_indicator_id: int | None = None,
    kpi_template_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> list[IndicatorRankOverrideOut]:
    query = select(IndicatorRankOverride)
    if kpi_indicator_id is not None:
        query = query.where(IndicatorRankOverride.kpi_indicator_id == kpi_indicator_id)
    if kpi_template_id is not None:
        template_indicator_ids = db.scalars(
            select(KpiIndicator.id)
            .join(KpiCategory, KpiIndicator.kpi_category_id == KpiCategory.id)
            .where(KpiCategory.kpi_template_id == kpi_template_id)
        ).all()
        query = query.where(IndicatorRankOverride.kpi_indicator_id.in_(template_indicator_ids))
    overrides = db.scalars(query).all()
    return [_indicator_out(db, o) for o in overrides]


@router.post("/indicators", response_model=IndicatorRankOverrideOut, status_code=status.HTTP_201_CREATED)
def create_indicator_rank_override(
    payload: IndicatorRankOverrideIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> IndicatorRankOverrideOut:
    locale = get_locale(request)
    if db.get(KpiIndicator, payload.kpi_indicator_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("indicator_not_found", locale))

    existing = db.scalar(
        select(IndicatorRankOverride).where(
            IndicatorRankOverride.kpi_indicator_id == payload.kpi_indicator_id,
            IndicatorRankOverride.has_title == payload.has_title,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("rank_override_duplicate", locale))

    override = IndicatorRankOverride(
        kpi_indicator_id=payload.kpi_indicator_id, has_title=payload.has_title, max_score=payload.max_score
    )
    db.add(override)
    db.flush()
    log_action(db, current_user.id, "create", "indicator_rank_override", override.id)
    db.commit()
    db.refresh(override)
    return _indicator_out(db, override)


@router.patch("/indicators/{override_id}", response_model=IndicatorRankOverrideOut)
def update_indicator_rank_override(
    override_id: int,
    payload: RankOverrideScoreUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> IndicatorRankOverrideOut:
    locale = get_locale(request)
    override = db.get(IndicatorRankOverride, override_id)
    if override is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("rank_override_not_found", locale))

    override.max_score = payload.max_score
    log_action(db, current_user.id, "update", "indicator_rank_override", override.id)
    db.commit()
    db.refresh(override)
    return _indicator_out(db, override)


@router.delete("/indicators/{override_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_indicator_rank_override(
    override_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> None:
    locale = get_locale(request)
    override = db.get(IndicatorRankOverride, override_id)
    if override is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("rank_override_not_found", locale))

    log_action(db, current_user.id, "delete", "indicator_rank_override", override.id)
    db.delete(override)
    db.commit()


@router.get("/categories", response_model=list[CategoryRankOverrideOut])
def list_category_rank_overrides(
    kpi_category_id: int | None = None,
    kpi_template_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> list[CategoryRankOverrideOut]:
    query = select(CategoryRankOverride)
    if kpi_category_id is not None:
        query = query.where(CategoryRankOverride.kpi_category_id == kpi_category_id)
    if kpi_template_id is not None:
        template_category_ids = db.scalars(
            select(KpiCategory.id).where(KpiCategory.kpi_template_id == kpi_template_id)
        ).all()
        query = query.where(CategoryRankOverride.kpi_category_id.in_(template_category_ids))
    overrides = db.scalars(query).all()
    return [_category_out(db, o) for o in overrides]


@router.post("/categories", response_model=CategoryRankOverrideOut, status_code=status.HTTP_201_CREATED)
def create_category_rank_override(
    payload: CategoryRankOverrideIn,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> CategoryRankOverrideOut:
    locale = get_locale(request)
    if db.get(KpiCategory, payload.kpi_category_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("kpi_category_not_found", locale))

    existing = db.scalar(
        select(CategoryRankOverride).where(
            CategoryRankOverride.kpi_category_id == payload.kpi_category_id,
            CategoryRankOverride.has_title == payload.has_title,
        )
    )
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("rank_override_duplicate", locale))

    override = CategoryRankOverride(
        kpi_category_id=payload.kpi_category_id, has_title=payload.has_title, max_score=payload.max_score
    )
    db.add(override)
    db.flush()
    log_action(db, current_user.id, "create", "category_rank_override", override.id)
    db.commit()
    db.refresh(override)
    return _category_out(db, override)


@router.patch("/categories/{override_id}", response_model=CategoryRankOverrideOut)
def update_category_rank_override(
    override_id: int,
    payload: RankOverrideScoreUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> CategoryRankOverrideOut:
    locale = get_locale(request)
    override = db.get(CategoryRankOverride, override_id)
    if override is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("rank_override_not_found", locale))

    override.max_score = payload.max_score
    log_action(db, current_user.id, "update", "category_rank_override", override.id)
    db.commit()
    db.refresh(override)
    return _category_out(db, override)


@router.delete("/categories/{override_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category_rank_override(
    override_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> None:
    locale = get_locale(request)
    override = db.get(CategoryRankOverride, override_id)
    if override is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("rank_override_not_found", locale))

    log_action(db, current_user.id, "delete", "category_rank_override", override.id)
    db.delete(override)
    db.commit()
