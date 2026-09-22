from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.correction_plan import CorrectionPlan, CorrectionPlanStage, CorrectionPlanStatus
from app.models.kpi_result import KpiResult, KpiResultStatus
from app.models.position import Position
from app.models.user import User


def _active_load_reduction_percent(db: Session, user_id: int, period: str) -> float:
    plan = db.scalar(
        select(CorrectionPlan).where(
            CorrectionPlan.user_id == user_id,
            CorrectionPlan.period == period,
            CorrectionPlan.stage == CorrectionPlanStage.load_reduction,
            CorrectionPlan.status == CorrectionPlanStatus.active,
        )
    )
    return plan.load_reduction_percent or 0.0 if plan else 0.0


def compute_bonuses(db: Session, period: str) -> list[dict]:
    """Bonus rows for a period, computed from approved KPI results only.

    bonus_amount = bonus_fund * final_kpi_percent / 100, where bonus_fund is the
    employee's own override if set, otherwise their position's default. An active
    Nizom 3.3 load-reduction correction plan proportionally cuts the bonus.
    """
    results = db.scalars(
        select(KpiResult).where(KpiResult.period == period, KpiResult.status == KpiResultStatus.approved)
    ).all()

    user_ids = [r.user_id for r in results]
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}
    positions = {p.id: p for p in db.scalars(select(Position)).all()}

    rows: list[dict] = []
    for result in results:
        user = users.get(result.user_id)
        if user is None:
            continue

        position = positions.get(user.position_id) if user.position_id else None
        bonus_fund = (
            user.bonus_fund_override
            if user.bonus_fund_override is not None
            else (position.bonus_fund if position else None)
        )
        bonus_amount = round(bonus_fund * result.total_score / 100, 2) if bonus_fund is not None else None
        if bonus_amount is not None:
            reduction_percent = _active_load_reduction_percent(db, user.id, period)
            bonus_amount = round(bonus_amount * (100 - reduction_percent) / 100, 2)

        rows.append(
            {
                "user_id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "bonus_fund": bonus_fund,
                "final_kpi_percent": result.total_score,
                "bonus_amount": bonus_amount,
            }
        )

    return rows
