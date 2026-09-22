"""company_settings, departments, positions + users FK

Revision ID: 0002
Revises: 0001
Create Date: 2026-07-16

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

period_type = sa.Enum("monthly", "quarterly", "yearly", name="period_type")


def upgrade() -> None:
    op.create_table(
        "departments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("parent_department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=True),
    )

    op.create_table(
        "positions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("department_id", sa.Integer(), sa.ForeignKey("departments.id"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
    )

    op.create_table(
        "company_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("logo_url", sa.String(length=500), nullable=True),
        sa.Column("industry_label", sa.String(length=255), nullable=True),
        sa.Column("default_period_type", period_type, nullable=False),
        sa.Column("setup_completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_foreign_key(
        "fk_users_department_id", "users", "departments", ["department_id"], ["id"]
    )
    op.create_foreign_key("fk_users_position_id", "users", "positions", ["position_id"], ["id"])


def downgrade() -> None:
    op.drop_constraint("fk_users_position_id", "users", type_="foreignkey")
    op.drop_constraint("fk_users_department_id", "users", type_="foreignkey")
    op.drop_table("company_settings")
    op.drop_table("positions")
    op.drop_table("departments")
    period_type.drop(op.get_bind(), checkfirst=True)
