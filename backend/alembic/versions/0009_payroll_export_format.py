"""payroll_export_format

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


payroll_export_format = sa.Enum("xlsx", "pdf", name="payroll_export_format")


def upgrade() -> None:
    payroll_export_format.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "payroll_exports",
        sa.Column("format", payroll_export_format, nullable=False, server_default="xlsx"),
    )


def downgrade() -> None:
    op.drop_column("payroll_exports", "format")
    payroll_export_format.drop(op.get_bind(), checkfirst=True)
