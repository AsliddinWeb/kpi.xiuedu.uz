"""HEMIS REST API mirror fields + last_login_at

Revision ID: 0023
Revises: 0022
Create Date: 2026-09-30

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0023"
down_revision: Union[str, None] = "0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("hemis_image_url", sa.String(length=500), nullable=True))
    op.add_column("users", sa.Column("hemis_academic_degree_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("hemis_academic_rank_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("hemis_staff_position_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("hemis_employment_status_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("hemis_department_name", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("hemis_rest_synced_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "hemis_rest_synced_at")
    op.drop_column("users", "hemis_department_name")
    op.drop_column("users", "hemis_employment_status_name")
    op.drop_column("users", "hemis_staff_position_name")
    op.drop_column("users", "hemis_academic_rank_name")
    op.drop_column("users", "hemis_academic_degree_name")
    op.drop_column("users", "hemis_image_url")
