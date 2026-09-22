"""personal work plans

Revision ID: 0018
Revises: 0017
Create Date: 2026-09-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0018"
down_revision: Union[str, None] = "0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


work_plan_status = sa.Enum("active", "closed", name="work_plan_status")


def upgrade() -> None:
    # op.create_table auto-creates the enum type as part of CREATE TABLE - a manual
    # precreate here would double-CREATE TYPE and fail (unlike op.add_column, which
    # needs the type precreated separately since ALTER TABLE ADD COLUMN does not do it).
    op.create_table(
        "work_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("period", sa.String(9), nullable=False),
        sa.Column("status", work_plan_status, nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_unique_constraint("uq_work_plan_user_period", "work_plans", ["user_id", "period"])

    op.create_table(
        "work_plan_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("work_plan_id", sa.Integer(), sa.ForeignKey("work_plans.id"), nullable=False),
        sa.Column("kpi_indicator_id", sa.Integer(), sa.ForeignKey("kpi_indicators.id"), nullable=False),
        sa.Column("planned_count", sa.Integer(), nullable=False),
        sa.Column("planned_score", sa.Float(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("work_plan_items")
    op.drop_table("work_plans")
    work_plan_status.drop(op.get_bind(), checkfirst=True)
