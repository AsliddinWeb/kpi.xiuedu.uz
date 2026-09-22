from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.ariza import Ariza
from app.models.category_head_approver import CategoryHeadApprover
from app.models.category_rank_override import CategoryRankOverride
from app.models.category_reviewer import CategoryReviewer
from app.models.indicator_rank_override import IndicatorRankOverride
from app.models.kpi_category import KpiCategory
from app.models.kpi_indicator import KpiIndicator
from app.models.kpi_indicator_sub_item import KpiIndicatorSubItem
from app.models.kpi_result import KpiResult
from app.models.kpi_template import KpiTemplate
from app.models.user import User
from app.schemas.kpi import KpiCategoryIn, KpiCategoryOut, KpiIndicatorOut, KpiTemplateCreate, KpiTemplateOut, KpiTemplateUpdate
from app.services.audit import log_action

router = APIRouter(prefix="/kpi-templates", tags=["kpi-templates"])


def _validate_categories(categories_in: list[KpiCategoryIn], locale: str) -> None:
    base_total = sum(c.max_score for c in categories_in if not c.is_bonus_category)
    if base_total != 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("template_max_score_mismatch", locale))

    for category_in in categories_in:
        indicators_total = sum(i.max_score for i in category_in.indicators)
        if indicators_total != category_in.max_score:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=t("category_max_score_mismatch", locale)
            )


def _indicators_in_use(db: Session, kpi_category_ids: list[int]) -> bool:
    if not kpi_category_ids:
        return False
    indicator_ids = db.scalars(
        select(KpiIndicator.id).where(KpiIndicator.kpi_category_id.in_(kpi_category_ids))
    ).all()
    if not indicator_ids:
        return False
    return db.scalar(select(Ariza.id).where(Ariza.kpi_indicator_id.in_(indicator_ids))) is not None


def _replace_categories(db: Session, template: KpiTemplate, categories_in: list[KpiCategoryIn]) -> None:
    existing_categories = db.scalars(select(KpiCategory).where(KpiCategory.kpi_template_id == template.id)).all()
    existing_category_ids = [c.id for c in existing_categories]

    if existing_category_ids:
        existing_indicators = db.scalars(
            select(KpiIndicator).where(KpiIndicator.kpi_category_id.in_(existing_category_ids))
        ).all()
        indicator_ids = [i.id for i in existing_indicators]

        if indicator_ids:
            for sub_item in db.scalars(
                select(KpiIndicatorSubItem).where(KpiIndicatorSubItem.kpi_indicator_id.in_(indicator_ids))
            ).all():
                db.delete(sub_item)
            db.flush()

            for override in db.scalars(
                select(IndicatorRankOverride).where(IndicatorRankOverride.kpi_indicator_id.in_(indicator_ids))
            ).all():
                db.delete(override)
            db.flush()

            for indicator in existing_indicators:
                db.delete(indicator)
            db.flush()

        for reviewer in db.scalars(
            select(CategoryReviewer).where(CategoryReviewer.kpi_category_id.in_(existing_category_ids))
        ).all():
            db.delete(reviewer)
        db.flush()

        for approver in db.scalars(
            select(CategoryHeadApprover).where(CategoryHeadApprover.kpi_category_id.in_(existing_category_ids))
        ).all():
            db.delete(approver)
        db.flush()

        for override in db.scalars(
            select(CategoryRankOverride).where(CategoryRankOverride.kpi_category_id.in_(existing_category_ids))
        ).all():
            db.delete(override)
        db.flush()

        for category in existing_categories:
            db.delete(category)
        db.flush()

    for order_index, category_in in enumerate(categories_in):
        category = KpiCategory(
            kpi_template_id=template.id,
            name=category_in.name,
            max_score=category_in.max_score,
            is_bonus_category=category_in.is_bonus_category,
            requires_kafedra_endorsement=category_in.requires_kafedra_endorsement,
            requires_head_approval=category_in.requires_head_approval,
            order_index=order_index,
        )
        db.add(category)
        db.flush()

        for indicator_order, indicator_in in enumerate(category_in.indicators):
            indicator = KpiIndicator(
                kpi_category_id=category.id,
                name=indicator_in.name,
                description=indicator_in.description,
                max_score=indicator_in.max_score,
                allow_coauthors=indicator_in.allow_coauthors,
                requires_file=indicator_in.requires_file,
                order_index=indicator_order,
            )
            db.add(indicator)
            db.flush()

            for sub_order, sub_item_in in enumerate(indicator_in.sub_items):
                db.add(
                    KpiIndicatorSubItem(
                        kpi_indicator_id=indicator.id,
                        label=sub_item_in.label,
                        max_score=sub_item_in.max_score,
                        order_index=sub_order,
                    )
                )


def _to_out(db: Session, template: KpiTemplate) -> KpiTemplateOut:
    categories = db.scalars(
        select(KpiCategory).where(KpiCategory.kpi_template_id == template.id).order_by(KpiCategory.order_index)
    ).all()

    category_outs: list[KpiCategoryOut] = []
    total_max_score = 0.0
    for category in categories:
        indicators = db.scalars(
            select(KpiIndicator).where(KpiIndicator.kpi_category_id == category.id).order_by(KpiIndicator.order_index)
        ).all()
        indicator_outs: list[KpiIndicatorOut] = []
        for indicator in indicators:
            sub_items = db.scalars(
                select(KpiIndicatorSubItem)
                .where(KpiIndicatorSubItem.kpi_indicator_id == indicator.id)
                .order_by(KpiIndicatorSubItem.order_index)
            ).all()
            indicator_outs.append(
                KpiIndicatorOut(
                    id=indicator.id,
                    kpi_category_id=indicator.kpi_category_id,
                    name=indicator.name,
                    description=indicator.description,
                    max_score=indicator.max_score,
                    allow_coauthors=indicator.allow_coauthors,
                    requires_file=indicator.requires_file,
                    order_index=indicator.order_index,
                    sub_items=sub_items,
                )
            )
        category_outs.append(
            KpiCategoryOut(
                id=category.id,
                kpi_template_id=category.kpi_template_id,
                name=category.name,
                max_score=category.max_score,
                is_bonus_category=category.is_bonus_category,
                requires_kafedra_endorsement=category.requires_kafedra_endorsement,
                requires_head_approval=category.requires_head_approval,
                order_index=category.order_index,
                indicators=indicator_outs,
            )
        )
        total_max_score += category.max_score

    return KpiTemplateOut(
        id=template.id,
        name=template.name,
        annex_code=template.annex_code,
        academic_year=template.academic_year,
        period_type=template.period_type,
        is_active=template.is_active,
        total_max_score=total_max_score,
        categories=category_outs,
    )


@router.get("", response_model=list[KpiTemplateOut])
def list_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[KpiTemplateOut]:
    templates = db.scalars(select(KpiTemplate)).all()
    return [_to_out(db, template) for template in templates]


@router.get("/{template_id}", response_model=KpiTemplateOut)
def get_template(
    template_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> KpiTemplateOut:
    locale = get_locale(request)
    template = db.get(KpiTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("kpi_template_not_found", locale))
    return _to_out(db, template)


@router.post("", response_model=KpiTemplateOut, status_code=status.HTTP_201_CREATED)
def create_template(
    payload: KpiTemplateCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> KpiTemplateOut:
    locale = get_locale(request)
    _validate_categories(payload.categories, locale)

    template = KpiTemplate(
        name=payload.name,
        annex_code=payload.annex_code,
        academic_year=payload.academic_year,
        period_type=payload.period_type,
        is_active=True,
    )
    db.add(template)
    db.flush()

    _replace_categories(db, template, payload.categories)

    log_action(db, current_user.id, "create", "kpi_template", template.id)
    db.commit()
    db.refresh(template)
    return _to_out(db, template)


@router.patch("/{template_id}", response_model=KpiTemplateOut)
def update_template(
    template_id: int,
    payload: KpiTemplateUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> KpiTemplateOut:
    locale = get_locale(request)
    template = db.get(KpiTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("kpi_template_not_found", locale))

    if payload.categories is not None:
        _validate_categories(payload.categories, locale)
        existing_category_ids = db.scalars(
            select(KpiCategory.id).where(KpiCategory.kpi_template_id == template.id)
        ).all()
        if _indicators_in_use(db, existing_category_ids):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("kpi_template_in_use", locale))
        _replace_categories(db, template, payload.categories)

    if payload.name is not None:
        template.name = payload.name
    if payload.is_active is not None:
        template.is_active = payload.is_active

    log_action(db, current_user.id, "update", "kpi_template", template.id)
    db.commit()
    db.refresh(template)
    return _to_out(db, template)


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_template(
    template_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> None:
    locale = get_locale(request)
    template = db.get(KpiTemplate, template_id)
    if template is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("kpi_template_not_found", locale))

    existing_category_ids = db.scalars(select(KpiCategory.id).where(KpiCategory.kpi_template_id == template.id)).all()
    if _indicators_in_use(db, existing_category_ids):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("kpi_template_in_use", locale))
    if db.scalar(select(User.id).where(User.kpi_template_id == template.id)) is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("kpi_template_assigned", locale))

    _replace_categories(db, template, [])

    for result in db.scalars(select(KpiResult).where(KpiResult.kpi_template_id == template.id)).all():
        db.delete(result)
    db.flush()

    log_action(db, current_user.id, "delete", "kpi_template", template.id)
    db.delete(template)
    db.commit()
