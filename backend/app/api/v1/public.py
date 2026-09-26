from fastapi import APIRouter, Depends, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.rate_limit import limiter
from app.db.session import get_db
from app.models.ariza import Ariza, ArizaStatus
from app.models.department import Department
from app.models.kpi_category import KpiCategory
from app.models.kpi_result import KpiResult
from app.models.kpi_template import KpiTemplate
from app.models.user import User
from app.schemas.public import PublicLeaderboardRow, PublicStats

IN_REVIEW_STATUSES = (ArizaStatus.kafedra_endorsed, ArizaStatus.scored, ArizaStatus.pending_head_approval)

router = APIRouter(prefix="/public", tags=["public"])

TOP_N = 10


def _active_template(db: Session) -> KpiTemplate | None:
    """The template shown on the public homepage: the active template with the
    most recent academic year. Mirrors the client-side default-template pick in
    frontend/app/dashboard/leaderboard/page.tsx, minus the logged-in-user bias
    (an anonymous visitor has no `kpi_template_id` to prefer)."""
    return db.scalar(
        select(KpiTemplate).where(KpiTemplate.is_active.is_(True)).order_by(KpiTemplate.academic_year.desc())
    )


@router.get("/leaderboard", response_model=list[PublicLeaderboardRow])
@limiter.limit("30/minute")
def public_leaderboard(request: Request, db: Session = Depends(get_db)) -> list[PublicLeaderboardRow]:
    template = _active_template(db)
    if template is None:
        return []

    period = template.academic_year
    template_users = db.scalars(select(User).where(User.kpi_template_id == template.id)).all()
    user_ids = [u.id for u in template_users]
    results = (
        db.scalars(
            select(KpiResult).where(
                KpiResult.kpi_template_id == template.id,
                KpiResult.period == period,
                KpiResult.user_id.in_(user_ids),
            )
        ).all()
        if user_ids
        else []
    )
    result_by_user = {r.user_id: r for r in results}
    categories = db.scalars(select(KpiCategory).where(KpiCategory.kpi_template_id == template.id)).all()
    template_max_score = sum(c.max_score for c in categories)
    departments = {d.id: d for d in db.scalars(select(Department)).all()}

    # Only employees with an actual computed result — a 0-score row padding
    # out a "top 10" would look broken on a public page with few participants.
    rows = [
        PublicLeaderboardRow(
            full_name=u.full_name,
            department_name=departments[u.department_id].name if u.department_id in departments else None,
            total_score=result_by_user[u.id].total_score,
            template_max_score=template_max_score,
        )
        for u in template_users
        if u.id in result_by_user
    ]
    rows.sort(key=lambda r: r.total_score, reverse=True)
    return rows[:TOP_N]


def _ariza_status_counts(db: Session) -> dict[str, int]:
    rows = db.execute(select(Ariza.status, func.count(Ariza.id)).group_by(Ariza.status)).all()
    counts = {status: 0 for status in ArizaStatus}
    for status, count in rows:
        counts[status] = count
    return {
        "new": counts[ArizaStatus.submitted],
        "in_review": sum(counts[s] for s in IN_REVIEW_STATUSES),
        "approved": counts[ArizaStatus.approved],
        "rejected": counts[ArizaStatus.rejected],
    }


@router.get("/stats", response_model=PublicStats)
@limiter.limit("30/minute")
def public_stats(request: Request, db: Session = Depends(get_db)) -> PublicStats:
    ariza_counts = _ariza_status_counts(db)
    template = _active_template(db)
    if template is None:
        return PublicStats(
            total_employees=0,
            total_departments=0,
            average_score=None,
            top_score=None,
            academic_year=None,
            arizalar_new=ariza_counts["new"],
            arizalar_in_review=ariza_counts["in_review"],
            arizalar_approved=ariza_counts["approved"],
            arizalar_rejected=ariza_counts["rejected"],
        )

    total_employees = db.scalar(select(func.count(User.id)).where(User.kpi_template_id == template.id)) or 0
    total_departments = db.scalar(select(func.count(Department.id))) or 0

    scores = db.scalars(
        select(KpiResult.total_score).where(
            KpiResult.kpi_template_id == template.id, KpiResult.period == template.academic_year
        )
    ).all()
    average_score = round(sum(scores) / len(scores), 1) if scores else None
    top_score = max(scores) if scores else None

    return PublicStats(
        total_employees=total_employees,
        total_departments=total_departments,
        average_score=average_score,
        top_score=top_score,
        academic_year=template.academic_year,
        arizalar_new=ariza_counts["new"],
        arizalar_in_review=ariza_counts["in_review"],
        arizalar_approved=ariza_counts["approved"],
        arizalar_rejected=ariza_counts["rejected"],
    )
