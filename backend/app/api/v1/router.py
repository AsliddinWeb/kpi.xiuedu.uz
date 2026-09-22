from fastapi import APIRouter

from app.api.v1 import (
    arizalar,
    audit_log,
    auth,
    bonuses,
    category_head_approvers,
    category_reviewers,
    correction_plans,
    dashboard,
    departments,
    exports,
    force_majeure,
    incentives,
    kpi_results,
    kpi_templates,
    positions,
    rank_overrides,
    setup,
    summaries,
    users,
    work_plans,
)

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(setup.router)
api_router.include_router(departments.router)
api_router.include_router(positions.router)
api_router.include_router(kpi_templates.router)
api_router.include_router(kpi_results.router)
api_router.include_router(arizalar.router)
api_router.include_router(category_reviewers.router)
api_router.include_router(category_head_approvers.router)
api_router.include_router(rank_overrides.router)
api_router.include_router(dashboard.router)
api_router.include_router(exports.router)
api_router.include_router(bonuses.router)
api_router.include_router(audit_log.router)
api_router.include_router(correction_plans.router)
api_router.include_router(force_majeure.router)
api_router.include_router(incentives.router)
api_router.include_router(work_plans.router)
api_router.include_router(summaries.router)
