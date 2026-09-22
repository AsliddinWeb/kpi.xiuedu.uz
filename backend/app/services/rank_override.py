from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.category_rank_override import CategoryRankOverride
from app.models.indicator_rank_override import IndicatorRankOverride
from app.models.kpi_category import KpiCategory
from app.models.kpi_indicator import KpiIndicator
from app.models.user import AcademicDegree, User


def has_title(user: User) -> bool:
    """Nizom 3.2: unvonli (has academic degree/title) vs unvonsiz professor-o'qituvchilar."""
    return user.academic_degree != AcademicDegree.none


def effective_indicator_max(db: Session, indicator: KpiIndicator, user: User) -> float:
    override = db.scalar(
        select(IndicatorRankOverride).where(
            IndicatorRankOverride.kpi_indicator_id == indicator.id,
            IndicatorRankOverride.has_title == has_title(user),
        )
    )
    return override.max_score if override is not None else indicator.max_score


def effective_category_max(db: Session, category: KpiCategory, user: User) -> float:
    override = db.scalar(
        select(CategoryRankOverride).where(
            CategoryRankOverride.kpi_category_id == category.id,
            CategoryRankOverride.has_title == has_title(user),
        )
    )
    return override.max_score if override is not None else category.max_score


def indicator_max_lookup(db: Session, indicator_ids: list[int], user: User) -> dict[int, float]:
    """Bulk variant of effective_indicator_max for a set of indicators (avoids N+1 queries)."""
    if not indicator_ids:
        return {}
    overrides = db.scalars(
        select(IndicatorRankOverride).where(
            IndicatorRankOverride.kpi_indicator_id.in_(indicator_ids),
            IndicatorRankOverride.has_title == has_title(user),
        )
    ).all()
    return {o.kpi_indicator_id: o.max_score for o in overrides}


def category_max_lookup(db: Session, category_ids: list[int], user: User) -> dict[int, float]:
    """Bulk variant of effective_category_max for a set of categories (avoids N+1 queries)."""
    if not category_ids:
        return {}
    overrides = db.scalars(
        select(CategoryRankOverride).where(
            CategoryRankOverride.kpi_category_id.in_(category_ids),
            CategoryRankOverride.has_title == has_title(user),
        )
    ).all()
    return {o.kpi_category_id: o.max_score for o in overrides}
