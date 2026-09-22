"""indicator and category rank overrides

Revision ID: 0014
Revises: 0013
Create Date: 2026-09-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "indicator_rank_overrides",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kpi_indicator_id", sa.Integer(), sa.ForeignKey("kpi_indicators.id"), nullable=False),
        sa.Column("has_title", sa.Boolean(), nullable=False),
        sa.Column("max_score", sa.Float(), nullable=False),
    )
    op.create_unique_constraint(
        "uq_indicator_rank_override", "indicator_rank_overrides", ["kpi_indicator_id", "has_title"]
    )

    op.create_table(
        "category_rank_overrides",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kpi_category_id", sa.Integer(), sa.ForeignKey("kpi_categories.id"), nullable=False),
        sa.Column("has_title", sa.Boolean(), nullable=False),
        sa.Column("max_score", sa.Float(), nullable=False),
    )
    op.create_unique_constraint(
        "uq_category_rank_override", "category_rank_overrides", ["kpi_category_id", "has_title"]
    )


def downgrade() -> None:
    op.drop_table("category_rank_overrides")
    op.drop_table("indicator_rank_overrides")
