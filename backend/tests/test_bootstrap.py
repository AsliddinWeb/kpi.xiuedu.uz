from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db import bootstrap as bootstrap_module
from app.models.user import User, UserRole
from tests.conftest import TestingSessionLocal


def test_bootstrap_creates_super_admin_when_none_exists(monkeypatch, db_session):
    monkeypatch.setattr(bootstrap_module, "SessionLocal", TestingSessionLocal)

    bootstrap_module.bootstrap_super_admin()

    created = db_session.query(User).filter(User.role == UserRole.super_admin).first()
    assert created is not None
    assert created.email == bootstrap_module.settings.super_admin_email


def test_bootstrap_skips_when_super_admin_already_exists(monkeypatch, db_session):
    existing = User(
        email="already-here@test.com",
        password_hash=hash_password("x"),
        full_name="Existing Admin",
        role=UserRole.super_admin,
    )
    db_session.add(existing)
    db_session.commit()

    monkeypatch.setattr(bootstrap_module, "SessionLocal", TestingSessionLocal)
    bootstrap_module.bootstrap_super_admin()

    count = db_session.query(User).filter(User.role == UserRole.super_admin).count()
    assert count == 1


def test_bootstrap_survives_email_collision_race(monkeypatch, db_session):
    """Simulates the real multi-worker race: production runs several uvicorn
    workers that all call bootstrap_super_admin() at startup. On a genuinely
    empty table, two workers can both pass the "does a super_admin exist
    yet?" check before either commits - the loser then hits a unique
    constraint on `email` instead, which must be swallowed, not crash the
    worker."""
    colliding = User(
        email=bootstrap_module.settings.super_admin_email,
        password_hash=hash_password("x"),
        full_name="Raced In First",
        role=UserRole.admin,
    )
    db_session.add(colliding)
    db_session.commit()

    monkeypatch.setattr(bootstrap_module, "SessionLocal", TestingSessionLocal)
    bootstrap_module.bootstrap_super_admin()  # must not raise

    count = db_session.query(User).filter(User.email == bootstrap_module.settings.super_admin_email).count()
    assert count == 1


def test_bootstrap_skips_gracefully_when_table_missing(monkeypatch):
    """The very first boot against a brand new database, before an operator
    has had a chance to run `alembic upgrade head`, must not crash the app."""
    empty_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    empty_session_local = sessionmaker(autocommit=False, autoflush=False, bind=empty_engine)
    # Deliberately no Base.metadata.create_all() - no tables exist at all.

    monkeypatch.setattr(bootstrap_module, "SessionLocal", empty_session_local)
    bootstrap_module.bootstrap_super_admin()  # must not raise
