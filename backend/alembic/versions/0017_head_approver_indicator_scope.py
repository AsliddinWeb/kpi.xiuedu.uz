"""category head approver indicator-level scoping

Revision ID: 0017
Revises: 0016
Create Date: 2026-09-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0017"
down_revision: Union[str, None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "category_head_approvers",
        sa.Column("kpi_indicator_id", sa.Integer(), sa.ForeignKey("kpi_indicators.id"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("category_head_approvers", "kpi_indicator_id")
