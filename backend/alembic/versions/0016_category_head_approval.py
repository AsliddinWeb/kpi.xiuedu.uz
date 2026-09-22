"""category head approval (two-stage approval)

Revision ID: 0016
Revises: 0015
Create Date: 2026-09-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "kpi_categories",
        sa.Column("requires_head_approval", sa.Boolean(), nullable=False, server_default="false"),
    )

    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block in Postgres.
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE ariza_status ADD VALUE IF NOT EXISTS 'pending_head_approval'")
        op.execute("ALTER TYPE ariza_status ADD VALUE IF NOT EXISTS 'approved'")

    op.add_column("arizalar", sa.Column("head_approved_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True))
    op.add_column("arizalar", sa.Column("head_approved_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "category_head_approvers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kpi_category_id", sa.Integer(), sa.ForeignKey("kpi_categories.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("category_head_approvers")
    op.drop_column("arizalar", "head_approved_at")
    op.drop_column("arizalar", "head_approved_by_id")
    op.drop_column("kpi_categories", "requires_head_approval")
    # Postgres has no DROP VALUE for enums; downgrading the ariza_status values is not supported.
