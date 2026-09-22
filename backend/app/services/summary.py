from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.correction_plan import CorrectionPlan, CorrectionPlanStatus
from app.models.department import Department
from app.models.kpi_result import KpiResult
from app.models.position import Position
from app.models.user import User
from app.models.work_plan import WorkPlan
from app.models.work_plan_item import WorkPlanItem
from app.services.work_plan import evaluate_item_fulfillment


def _user_row(user: User, result: KpiResult | None) -> dict:
    return {
        "user_id": user.id,
        "full_name": user.full_name,
        "department_id": user.department_id,
        "total_score": result.total_score if result else None,
        "status": result.status.value if result else None,
    }


def build_semester_review(db: Session, period: str, half: int) -> dict:
    """Nizom-feedback band 6: biannual (chorak-juftlik) rollup for one period."""
    users = db.scalars(select(User).where(User.kpi_template_id.is_not(None))).all()
    results = {r.user_id: r for r in db.scalars(select(KpiResult).where(KpiResult.period == period)).all()}

    rows = [_user_row(u, results.get(u.id)) for u in users]
    scored = [r["total_score"] for r in rows if r["total_score"] is not None]

    departments = db.scalars(select(Department)).all()
    department_averages = []
    for dept in departments:
        dept_scores = [r["total_score"] for r in rows if r["department_id"] == dept.id and r["total_score"] is not None]
        if dept_scores:
            department_averages.append(
                {
                    "department_id": dept.id,
                    "department_name": dept.name,
                    "average_score": round(sum(dept_scores) / len(dept_scores), 2),
                    "employee_count": len(dept_scores),
                }
            )

    return {
        "period": period,
        "half": half,
        "total_employees_evaluated": len(scored),
        "organization_average_score": round(sum(scored) / len(scored), 2) if scored else None,
        "department_averages": department_averages,
        "users": rows,
    }


def build_year_end(db: Session, academic_year: str) -> dict:
    """Nizom-feedback band 7: the large May year-end rollup - full ranking, work-plan
    fulfillment across the year's work plans, and correction-plan outcomes."""
    users = db.scalars(select(User).where(User.kpi_template_id.is_not(None))).all()
    results = {r.user_id: r for r in db.scalars(select(KpiResult).where(KpiResult.period == academic_year)).all()}

    ranking = sorted(
        [_user_row(u, results.get(u.id)) for u in users],
        key=lambda r: r["total_score"] if r["total_score"] is not None else -1,
        reverse=True,
    )

    plans = db.scalars(select(WorkPlan).where(WorkPlan.period == academic_year)).all()
    fulfillment_counts = {"under": 0, "met": 0, "exceeded": 0}
    for plan in plans:
        items = db.scalars(select(WorkPlanItem).where(WorkPlanItem.work_plan_id == plan.id)).all()
        for item in items:
            classification = evaluate_item_fulfillment(db, item, plan.user_id, plan.period)["classification"]
            fulfillment_counts[classification] += 1

    year_correction_plans = db.scalars(
        select(CorrectionPlan).where(CorrectionPlan.period == academic_year)
    ).all()
    active_correction_plans_count = sum(1 for p in year_correction_plans if p.status == CorrectionPlanStatus.active)
    resolved_correction_plans = sum(1 for p in year_correction_plans if p.status == CorrectionPlanStatus.resolved)

    return {
        "academic_year": academic_year,
        "ranking": ranking,
        "work_plan_fulfillment": fulfillment_counts,
        "correction_plans_active": active_correction_plans_count,
        "correction_plans_resolved": resolved_correction_plans,
    }


def build_early_warning(db: Session, period: str) -> dict:
    """Nizom 3.3: flags users whose current-period score is below their position's
    minimal_score. Does NOT auto-create a CorrectionPlan - a human reviews and decides
    (see plan Faza 9)."""
    users = db.scalars(select(User).where(User.position_id.is_not(None), User.kpi_template_id.is_not(None))).all()
    positions = {p.id: p for p in db.scalars(select(Position)).all()}
    results = {r.user_id: r for r in db.scalars(select(KpiResult).where(KpiResult.period == period)).all()}

    flagged = []
    for user in users:
        position = positions.get(user.position_id)
        if position is None or position.minimal_score is None:
            continue
        result = results.get(user.id)
        current_score = result.total_score if result else 0.0
        if current_score < position.minimal_score:
            flagged.append(
                {
                    "user_id": user.id,
                    "full_name": user.full_name,
                    "position_title": position.title,
                    "minimal_score": position.minimal_score,
                    "current_score": current_score,
                }
            )

    return {
        "period": period,
        "threshold_source": "position.minimal_score",
        "flagged_count": len(flagged),
        "flagged": flagged,
    }
