"""HEMIS OAuth2 (university SSO): auth_provider + hemis_* profile fields on users

Revision ID: 0021
Revises: 0020
Create Date: 2026-09-18

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0021"
down_revision: Union[str, None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

auth_provider = sa.Enum("local", "hemis", name="auth_provider")


def upgrade() -> None:
    auth_provider.create(op.get_bind(), checkfirst=True)
    op.add_column("users", sa.Column("auth_provider", auth_provider, nullable=False, server_default="local"))
    op.add_column("users", sa.Column("hemis_uuid", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("hemis_id", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("hemis_employee_id_number", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("hemis_login", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("hemis_type", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("hemis_roles", sa.String(length=500), nullable=True))
    op.add_column("users", sa.Column("hemis_first_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("hemis_surname", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("hemis_patronymic", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("hemis_birth_date", sa.Date(), nullable=True))
    op.add_column("users", sa.Column("hemis_university_id", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("hemis_phone", sa.String(length=64), nullable=True))
    op.add_column("users", sa.Column("hemis_email", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("hemis_picture_url", sa.String(length=500), nullable=True))
    op.add_column("users", sa.Column("hemis_last_synced_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_hemis_uuid", "users", ["hemis_uuid"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_hemis_uuid", table_name="users")
    op.drop_column("users", "hemis_last_synced_at")
    op.drop_column("users", "hemis_picture_url")
    op.drop_column("users", "hemis_email")
    op.drop_column("users", "hemis_phone")
    op.drop_column("users", "hemis_university_id")
    op.drop_column("users", "hemis_birth_date")
    op.drop_column("users", "hemis_patronymic")
    op.drop_column("users", "hemis_surname")
    op.drop_column("users", "hemis_first_name")
    op.drop_column("users", "hemis_roles")
    op.drop_column("users", "hemis_type")
    op.drop_column("users", "hemis_login")
    op.drop_column("users", "hemis_employee_id_number")
    op.drop_column("users", "hemis_id")
    op.drop_column("users", "hemis_uuid")
    op.drop_column("users", "auth_provider")
    auth_provider.drop(op.get_bind(), checkfirst=True)
