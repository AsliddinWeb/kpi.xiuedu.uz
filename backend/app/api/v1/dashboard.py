from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import CONFIG_ROLES, OVERSIGHT_ROLES, RECTOR_ROLES, can_manage_employee, get_current_user, require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.ariza import Ariza, ArizaStatus
from app.models.category_head_approver import CategoryHeadApprover
from app.models.correction_plan import CorrectionPlan, CorrectionPlanStatus
from app.models.department import Department
from app.models.force_majeure import ForceMajeureDeclaration, ForceMajeureStatus
from app.models.kpi_category import KpiCategory
from app.models.kpi_indicator import KpiIndicator
from app.models.kpi_result import KpiResult, KpiResultStatus
from app.models.position import Position
from app.models.user import User, UserRole
from app.schemas.dashboard import (
    DepartmentComparisonRow,
    LeaderboardRow,
    MyKpiIndicatorRow,
    MyKpiSubmissionRow,
    OrganizationSummary,
    RectorSummary,
    TeamMemberSummary,
)
from app.services.rank_override import category_max_lookup, indicator_max_lookup

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _latest_result_by_user(results: list[KpiResult]) -> dict[int, KpiResult]:
    latest: dict[int, KpiResult] = {}
    for result in results:
        current = latest.get(result.user_id)
        if current is None or result.period > current.period:
            latest[result.user_id] = result
    return latest


@router.get("/team-summary", response_model=list[TeamMemberSummary])
def team_summary(
    period: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("manager", *OVERSIGHT_ROLES)),
) -> list[TeamMemberSummary]:
    if current_user.role == UserRole.manager:
        team = db.scalars(select(User).where(User.manager_id == current_user.id)).all()
    else:
        team = db.scalars(select(User).where(User.role.in_([UserRole.manager, UserRole.employee]))).all()

    user_ids = [u.id for u in team]
    query = select(KpiResult).where(KpiResult.user_id.in_(user_ids)) if user_ids else None
    if query is not None and period:
        query = query.where(KpiResult.period == period)
    results = db.scalars(query).all() if query is not None else []
    latest_by_user = _latest_result_by_user(results)

    return [
        TeamMemberSummary(
            user_id=u.id,
            full_name=u.full_name,
            email=u.email,
            role=u.role.value,
            latest_period=latest_by_user[u.id].period if u.id in latest_by_user else None,
            latest_status=latest_by_user[u.id].status.value if u.id in latest_by_user else None,
            latest_score=latest_by_user[u.id].total_score if u.id in latest_by_user else None,
        )
        for u in team
    ]


@router.get("/organization-summary", response_model=OrganizationSummary)
def organization_summary(
    period: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> OrganizationSummary:
    total_employees = db.scalar(select(func.count()).select_from(User)) or 0
    total_departments = db.scalar(select(func.count()).select_from(Department)) or 0
    total_positions = db.scalar(select(func.count()).select_from(Position)) or 0

    results_query = select(KpiResult)
    if period:
        results_query = results_query.where(KpiResult.period == period)
    results = db.scalars(results_query).all()
    computed = sum(1 for r in results if r.status == KpiResultStatus.computed)
    approved = sum(1 for r in results if r.status == KpiResultStatus.approved)

    scored = [r.total_score for r in results]
    average_score = round(sum(scored) / len(scored), 2) if scored else None

    return OrganizationSummary(
        total_employees=total_employees,
        total_departments=total_departments,
        total_positions=total_positions,
        results_computed=computed,
        results_approved=approved,
        average_score=average_score,
    )


@router.get("/department-comparison", response_model=list[DepartmentComparisonRow])
def department_comparison(
    period: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> list[DepartmentComparisonRow]:
    departments = db.scalars(select(Department)).all()
    users = db.scalars(select(User)).all()
    results_query = select(KpiResult)
    if period:
        results_query = results_query.where(KpiResult.period == period)
    results = db.scalars(results_query).all()
    latest_by_user = _latest_result_by_user(results)

    rows = []
    for dept in departments:
        dept_users = [u for u in users if u.department_id == dept.id]
        scores = [
            latest_by_user[u.id].total_score
            for u in dept_users
            if u.id in latest_by_user
        ]
        rows.append(
            DepartmentComparisonRow(
                department_id=dept.id,
                department_name=dept.name,
                employee_count=len(dept_users),
                average_score=round(sum(scores) / len(scores), 2) if scores else None,
            )
        )
    return rows


@router.get("/rector-summary", response_model=RectorSummary)
def rector_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> RectorSummary:
    if current_user.role in CONFIG_ROLES:
        pending_query = select(Ariza.id).where(Ariza.status == ArizaStatus.pending_head_approval)
    else:
        own_category_ids = db.scalars(
            select(CategoryHeadApprover.kpi_category_id).where(
                CategoryHeadApprover.user_id == current_user.id, CategoryHeadApprover.kpi_indicator_id.is_(None)
            )
        ).all()
        own_indicator_ids = db.scalars(
            select(CategoryHeadApprover.kpi_indicator_id).where(
                CategoryHeadApprover.user_id == current_user.id, CategoryHeadApprover.kpi_indicator_id.is_not(None)
            )
        ).all()
        eligible_indicator_ids = list(
            db.scalars(select(KpiIndicator.id).where(KpiIndicator.kpi_category_id.in_(own_category_ids))).all()
        ) + list(own_indicator_ids)
        pending_query = (
            select(Ariza.id).where(
                Ariza.status == ArizaStatus.pending_head_approval,
                Ariza.kpi_indicator_id.in_(eligible_indicator_ids),
            )
            if eligible_indicator_ids
            else None
        )
    pending_head_approvals = (
        (db.scalar(select(func.count()).select_from(pending_query.subquery())) or 0)
        if pending_query is not None
        else 0
    )

    active_correction_plans = (
        db.scalar(
            select(func.count())
            .select_from(CorrectionPlan)
            .where(CorrectionPlan.status == CorrectionPlanStatus.active)
        )
        or 0
    )
    active_force_majeure = (
        db.scalar(
            select(func.count())
            .select_from(ForceMajeureDeclaration)
            .where(ForceMajeureDeclaration.status != ForceMajeureStatus.resolved)
        )
        or 0
    )
    total_employees = db.scalar(select(func.count()).select_from(User)) or 0

    results = db.scalars(select(KpiResult)).all()
    scored = [r.total_score for r in results]
    organization_average_score = round(sum(scored) / len(scored), 2) if scored else None

    return RectorSummary(
        pending_head_approvals=pending_head_approvals,
        active_correction_plans=active_correction_plans,
        active_force_majeure=active_force_majeure,
        total_employees=total_employees,
        organization_average_score=organization_average_score,
    )


@router.get("/leaderboard", response_model=list[LeaderboardRow])
def leaderboard(
    kpi_template_id: int,
    period: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[LeaderboardRow]:
    template_users = db.scalars(select(User).where(User.kpi_template_id == kpi_template_id)).all()
    user_ids = [u.id for u in template_users]
    results = (
        db.scalars(
            select(KpiResult).where(
                KpiResult.kpi_template_id == kpi_template_id,
                KpiResult.period == period,
                KpiResult.user_id.in_(user_ids),
            )
        ).all()
        if user_ids
        else []
    )
    result_by_user = {r.user_id: r for r in results}

    categories = db.scalars(select(KpiCategory).where(KpiCategory.kpi_template_id == kpi_template_id)).all()
    template_max_score = sum(c.max_score for c in categories)

    departments = {d.id: d for d in db.scalars(select(Department)).all()}
    positions = {p.id: p for p in db.scalars(select(Position)).all()}

    rows = [
        LeaderboardRow(
            user_id=u.id,
            full_name=u.full_name,
            department_name=departments[u.department_id].name if u.department_id in departments else None,
            position_title=positions[u.position_id].title if u.position_id in positions else None,
            total_score=result_by_user[u.id].total_score if u.id in result_by_user else 0.0,
            template_max_score=template_max_score,
        )
        for u in template_users
    ]
    rows.sort(key=lambda r: r.total_score, reverse=True)
    return rows


@router.get("/my-kpi", response_model=list[MyKpiIndicatorRow])
def my_kpi(
    period: str,
    request: Request,
    user_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MyKpiIndicatorRow]:
    locale = get_locale(request)
    if user_id is None or user_id == current_user.id:
        target_user = current_user
    else:
        target_user = db.get(User, user_id)
        if target_user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("user_not_found", locale))
        if current_user.role not in OVERSIGHT_ROLES and not can_manage_employee(current_user, target_user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))

    if target_user.kpi_template_id is None:
        return []

    categories = db.scalars(
        select(KpiCategory)
        .where(KpiCategory.kpi_template_id == target_user.kpi_template_id)
        .order_by(KpiCategory.order_index)
    ).all()
    category_by_id = {c.id: c for c in categories}
    indicators = db.scalars(
        select(KpiIndicator)
        .where(KpiIndicator.kpi_category_id.in_(list(category_by_id.keys())))
        .order_by(KpiIndicator.order_index)
    ).all()
    indicators_by_category: dict[int, list[KpiIndicator]] = {}
    for indicator in indicators:
        indicators_by_category.setdefault(indicator.kpi_category_id, []).append(indicator)
    ordered_indicators = [ind for category in categories for ind in indicators_by_category.get(category.id, [])]

    arizalar = db.scalars(
        select(Ariza).where(
            Ariza.user_id == target_user.id,
            Ariza.period == period,
            Ariza.deleted_at.is_(None),
        )
    ).all()
    arizalar_by_indicator: dict[int, list[Ariza]] = {}
    for ariza in arizalar:
        arizalar_by_indicator.setdefault(ariza.kpi_indicator_id, []).append(ariza)

    indicator_max_overrides = indicator_max_lookup(db, [i.id for i in ordered_indicators], target_user)
    category_max_overrides = category_max_lookup(db, list(category_by_id.keys()), target_user)

    rows = []
    for indicator in ordered_indicators:
        indicator_arizalar = sorted(
            arizalar_by_indicator.get(indicator.id, []), key=lambda a: a.submitted_at, reverse=True
        )
        category = category_by_id[indicator.kpi_category_id]
        indicator_max = indicator_max_overrides.get(indicator.id, indicator.max_score)
        category_max = category_max_overrides.get(category.id, category.max_score)
        expected_status = ArizaStatus.approved if category.requires_head_approval else ArizaStatus.scored
        awarded_total = min(
            sum(a.awarded_score or 0.0 for a in indicator_arizalar if a.status == expected_status),
            indicator_max,
        )
        # remaining_capacity also excludes score already allocated to a pending head-approval
        # ariza, so the employee can't over-submit while a review is still in flight.
        allocated_total = min(
            sum(
                a.awarded_score or 0.0
                for a in indicator_arizalar
                if a.status in (ArizaStatus.scored, ArizaStatus.pending_head_approval, ArizaStatus.approved)
            ),
            indicator_max,
        )
        rows.append(
            MyKpiIndicatorRow(
                kpi_indicator_id=indicator.id,
                indicator_name=indicator.name,
                category_id=category.id,
                category_name=category.name,
                category_max_score=category_max,
                max_score=indicator_max,
                awarded_total=round(awarded_total, 2),
                remaining_capacity=round(max(indicator_max - allocated_total, 0.0), 2),
                submissions=[
                    MyKpiSubmissionRow(
                        ariza_id=a.id,
                        status=a.status.value,
                        awarded_score=a.awarded_score,
                        employee_comment=a.employee_comment,
                        reviewer_comment=a.reviewer_comment,
                        submitted_at=a.submitted_at,
                    )
                    for a in indicator_arizalar
                ],
            )
        )
    return rows
