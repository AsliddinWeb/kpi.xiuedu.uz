from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ariza import Ariza, ArizaStatus
from app.models.ariza_co_author import ArizaCoAuthor
from app.models.kpi_category import KpiCategory
from app.models.kpi_indicator import KpiIndicator
from app.models.kpi_result import KpiResult, KpiResultStatus
from app.models.user import User
from app.services.rank_override import category_max_lookup, indicator_max_lookup


def _own_share(ariza: Ariza, user_id: int, co_authors: list[ArizaCoAuthor]) -> float:
    """This user's slice of an ariza's awarded_score, accounting for co-author splits."""
    if ariza.awarded_score is None:
        return 0.0
    relevant = [c for c in co_authors if c.ariza_id == ariza.id]
    if not relevant:
        return ariza.awarded_score if ariza.user_id == user_id else 0.0

    submitter_share = next((c.share_percent for c in relevant if c.co_author_user_id == user_id), None)
    if submitter_share is not None:
        return ariza.awarded_score * submitter_share / 100
    if ariza.user_id == user_id:
        claimed = sum(c.share_percent for c in relevant)
        return ariza.awarded_score * max(0.0, 100 - claimed) / 100
    return 0.0


def recompute_kpi_result(db: Session, user_id: int, period: str) -> KpiResult | None:
    """Recompute and persist the cached aggregate for one user/period from their scored arizalar.

    Call this after any ariza tied to user_id (as submitter or co-author) is scored or rescored.
    """
    user = db.get(User, user_id)
    if user is None or user.kpi_template_id is None:
        return None

    categories = db.scalars(select(KpiCategory).where(KpiCategory.kpi_template_id == user.kpi_template_id)).all()
    if not categories:
        return None

    indicators = db.scalars(
        select(KpiIndicator).where(KpiIndicator.kpi_category_id.in_([c.id for c in categories]))
    ).all()
    indicator_ids = [i.id for i in indicators]

    finalized_statuses = [ArizaStatus.scored, ArizaStatus.approved]

    own_arizalar = (
        db.scalars(
            select(Ariza).where(
                Ariza.user_id == user_id,
                Ariza.period == period,
                Ariza.status.in_(finalized_statuses),
                Ariza.deleted_at.is_(None),
                Ariza.kpi_indicator_id.in_(indicator_ids),
            )
        ).all()
        if indicator_ids
        else []
    )

    coauthor_ariza_ids = db.scalars(
        select(ArizaCoAuthor.ariza_id).where(ArizaCoAuthor.co_author_user_id == user_id)
    ).all()
    coauthor_arizalar = (
        db.scalars(
            select(Ariza).where(
                Ariza.id.in_(coauthor_ariza_ids),
                Ariza.period == period,
                Ariza.status.in_(finalized_statuses),
                Ariza.deleted_at.is_(None),
                Ariza.kpi_indicator_id.in_(indicator_ids),
            )
        ).all()
        if coauthor_ariza_ids
        else []
    )

    relevant_arizalar = {a.id: a for a in [*own_arizalar, *coauthor_arizalar]}
    co_authors = (
        db.scalars(select(ArizaCoAuthor).where(ArizaCoAuthor.ariza_id.in_(list(relevant_arizalar.keys())))).all()
        if relevant_arizalar
        else []
    )

    # A category with requires_head_approval only counts arizalar that reached the final
    # "approved" state - a "scored" one is still awaiting the second-stage sign-off and
    # must not appear in the total yet (Nizom band 3: "darhol ko'rinib ketmasin").
    category_by_indicator_id = {i.id: c for c in categories for i in indicators if i.kpi_category_id == c.id}

    per_indicator_total: dict[int, float] = defaultdict(float)
    for ariza in relevant_arizalar.values():
        category = category_by_indicator_id.get(ariza.kpi_indicator_id)
        if category is None:
            continue
        expected_status = ArizaStatus.approved if category.requires_head_approval else ArizaStatus.scored
        if ariza.status != expected_status:
            continue
        per_indicator_total[ariza.kpi_indicator_id] += _own_share(ariza, user_id, co_authors)

    indicator_max_overrides = indicator_max_lookup(db, indicator_ids, user)
    category_max_overrides = category_max_lookup(db, [c.id for c in categories], user)

    category_breakdown: dict[str, float] = {}
    total_score = 0.0
    for category in categories:
        category_indicators = [i for i in indicators if i.kpi_category_id == category.id]
        category_total = sum(
            min(per_indicator_total.get(i.id, 0.0), indicator_max_overrides.get(i.id, i.max_score))
            for i in category_indicators
        )
        category_total = min(category_total, category_max_overrides.get(category.id, category.max_score))
        category_breakdown[str(category.id)] = round(category_total, 2)
        total_score += category_total

    result = db.scalar(
        select(KpiResult).where(
            KpiResult.user_id == user_id,
            KpiResult.period == period,
            KpiResult.kpi_template_id == user.kpi_template_id,
        )
    )
    if result is None:
        result = KpiResult(user_id=user_id, kpi_template_id=user.kpi_template_id, period=period)
        db.add(result)

    result.total_score = round(total_score, 2)
    result.category_breakdown = category_breakdown
    if result.status != KpiResultStatus.approved:
        result.status = KpiResultStatus.computed
    db.flush()
    return result
