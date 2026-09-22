"""periodic summaries (semester review, year-end, early warning)

Revision ID: 0019
Revises: 0018
Create Date: 2026-09-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    summary_type = sa.Enum("semester_review", "year_end", "early_warning", name="summary_type")
    op.create_table(
        "summaries",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", summary_type, nullable=False),
        sa.Column("period", sa.String(9), nullable=False),
        sa.Column("half", sa.Integer(), nullable=True),
        sa.Column("generated_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("payload", sa.JSON(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("summaries")
    sa.Enum(name="summary_type").drop(op.get_bind(), checkfirst=True)
