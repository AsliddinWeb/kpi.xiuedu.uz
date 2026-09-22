"""payroll_exports

Revision ID: 0005
Revises: 0004
Create Date: 2026-07-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

payroll_export_status = sa.Enum("pending", "completed", "failed", name="payroll_export_status")


def upgrade() -> None:
    op.create_table(
        "payroll_exports",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("period", sa.String(length=7), nullable=False),
        sa.Column("generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("file_url", sa.String(length=500), nullable=True),
        sa.Column("status", payroll_export_status, nullable=False, server_default="pending"),
    )


def downgrade() -> None:
    op.drop_table("payroll_exports")
    payroll_export_status.drop(op.get_bind(), checkfirst=True)
