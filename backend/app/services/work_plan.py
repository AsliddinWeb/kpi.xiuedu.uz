from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.ariza import Ariza, ArizaStatus
from app.models.kpi_category import KpiCategory
from app.models.kpi_indicator import KpiIndicator
from app.models.work_plan_item import WorkPlanItem

Classification = Literal["under", "met", "exceeded"]


def _classify(planned: float, actual: float) -> Classification:
    if actual < planned:
        return "under"
    if actual > planned:
        return "exceeded"
    return "met"


def evaluate_item_fulfillment(db: Session, item: WorkPlanItem, user_id: int, period: str) -> dict:
    """Compares an employee's actual scored/approved arizalar for this item's indicator
    against their voluntary plan. Only arizalar that reached the indicator's category's
    final state count as "actual" (mirrors recompute_kpi_result's finalized-status rule -
    a still-pending head-approval score doesn't count toward fulfillment either)."""
    indicator = db.get(KpiIndicator, item.kpi_indicator_id)
    category = db.get(KpiCategory, indicator.kpi_category_id) if indicator else None
    expected_status = (
        ArizaStatus.approved if category and category.requires_head_approval else ArizaStatus.scored
    )

    matching_arizalar = db.scalars(
        select(Ariza).where(
            Ariza.user_id == user_id,
            Ariza.kpi_indicator_id == item.kpi_indicator_id,
            Ariza.period == period,
            Ariza.status == expected_status,
            Ariza.deleted_at.is_(None),
        )
    ).all()

    actual_count = len(matching_arizalar)
    actual_score = round(sum(a.awarded_score or 0.0 for a in matching_arizalar), 2)

    classification = (
        _classify(item.planned_score, actual_score)
        if item.planned_score is not None
        else _classify(item.planned_count, actual_count)
    )

    return {
        "kpi_indicator_id": item.kpi_indicator_id,
        "indicator_name": indicator.name if indicator else "",
        "planned_count": item.planned_count,
        "planned_score": item.planned_score,
        "notes": item.notes,
        "actual_count": actual_count,
        "actual_score": actual_score,
        "classification": classification,
    }
