"""bonus_fund, bonus_fund_override, bonus_approvals

Revision ID: 0006
Revises: 0005
Create Date: 2026-07-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("positions", sa.Column("bonus_fund", sa.Float(), nullable=True))
    op.add_column("users", sa.Column("bonus_fund_override", sa.Float(), nullable=True))

    op.create_table(
        "bonus_approvals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("period", sa.String(length=7), nullable=False, unique=True),
        sa.Column("approved_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("bonus_approvals")
    op.drop_column("users", "bonus_fund_override")
    op.drop_column("positions", "bonus_fund")
