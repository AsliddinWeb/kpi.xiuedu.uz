from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import OVERSIGHT_ROLES, require_role
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogOut, AuditLogPage

router = APIRouter(prefix="/audit-log", tags=["audit-log"])


@router.get("", response_model=AuditLogPage)
def list_audit_log(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    action: str | None = Query(None),
    entity: str | None = Query(None),
    user_id: int | None = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> AuditLogPage:
    filters = []
    if action:
        filters.append(AuditLog.action == action)
    if entity:
        filters.append(AuditLog.entity == entity)
    if user_id:
        filters.append(AuditLog.user_id == user_id)

    total = db.scalar(select(func.count()).select_from(AuditLog).where(*filters))

    rows = db.execute(
        select(AuditLog, User.full_name)
        .join(User, User.id == AuditLog.user_id, isouter=True)
        .where(*filters)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    items = [
        AuditLogOut(
            id=entry.id,
            user_id=entry.user_id,
            user_full_name=full_name,
            action=entry.action,
            entity=entry.entity,
            entity_id=entry.entity_id,
            created_at=entry.created_at,
        )
        for entry, full_name in rows
    ]

    return AuditLogPage(total=total or 0, items=items)
