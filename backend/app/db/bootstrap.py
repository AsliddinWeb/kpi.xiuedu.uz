import logging

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, OperationalError, ProgrammingError

from app.core.config import settings
from app.core.security import hash_password
from app.db.base import SessionLocal
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)


def bootstrap_super_admin() -> None:
    """Creates the first Super Admin from env vars if none exists yet.

    Idempotent: skips if a super_admin user already exists (e.g. seeded manually,
    or already bootstrapped on a previous startup).

    Runs on every app startup, before an operator necessarily had a chance to
    run `alembic upgrade head` (e.g. the very first boot against a brand new,
    empty database). If the `users` table - or a column this query/model
    expects - doesn't exist yet, log a warning and skip instead of crashing
    the whole app: a missing bootstrap admin is recoverable (run migrations,
    then restart), but every uvicorn worker crash-looping on startup is not.

    Also guards against the multi-worker race: production runs uvicorn with
    several worker processes that all call this at startup. On a genuinely
    empty `users` table, two workers can both pass the "does one exist yet?"
    check before either commits, and the loser hits a unique-constraint
    violation on `email` trying to insert the same bootstrap account -
    harmless (the winner's row is what we wanted anyway), so it's swallowed
    the same way instead of crashing that worker.
    """
    db = SessionLocal()
    try:
        existing = db.scalar(select(User).where(User.role == UserRole.super_admin))
        if existing is not None:
            return

        user = User(
            email=settings.super_admin_email,
            password_hash=hash_password(settings.super_admin_password),
            full_name="Super Admin",
            role=UserRole.super_admin,
        )
        db.add(user)
        db.commit()
    except (ProgrammingError, OperationalError):
        db.rollback()
        logger.warning(
            "bootstrap_super_admin: 'users' table/columns not ready yet (run "
            "`alembic upgrade head` first). Skipping bootstrap for this startup."
        )
    except IntegrityError:
        db.rollback()
        logger.info("bootstrap_super_admin: another worker already created the bootstrap admin, skipping.")
    finally:
        db.close()
