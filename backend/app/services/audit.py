from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog


def log_action(db: Session, user_id: int | None, action: str, entity: str, entity_id: int | None = None) -> None:
    """Queues an audit_log row on the given session; persists with the caller's own commit."""
    db.add(AuditLog(user_id=user_id, action=action, entity=entity, entity_id=entity_id))
