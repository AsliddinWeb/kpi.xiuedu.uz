"""kpi_templates, kpi_indicators

Revision ID: 0003
Revises: 0002
Create Date: 2026-07-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# period_type enum already exists (created in 0002) — reuse it, don't recreate.
period_type = postgresql.ENUM("monthly", "quarterly", "yearly", name="period_type", create_type=False)


def upgrade() -> None:
    op.create_table(
        "kpi_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("position_id", sa.Integer(), sa.ForeignKey("positions.id"), nullable=False),
        sa.Column("period_type", period_type, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "kpi_indicators",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kpi_template_id", sa.Integer(), sa.ForeignKey("kpi_templates.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("weight_percent", sa.Integer(), nullable=False),
        sa.Column("unit", sa.String(length=50), nullable=False),
        sa.CheckConstraint("weight_percent >= 0 AND weight_percent <= 100", name="ck_kpi_indicators_weight_range"),
    )


def downgrade() -> None:
    op.drop_table("kpi_indicators")
    op.drop_table("kpi_templates")
