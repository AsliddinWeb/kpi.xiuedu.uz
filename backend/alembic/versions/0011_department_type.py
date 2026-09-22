"""department_type

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-10

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


department_type = sa.Enum("faculty", "kafedra", "administrative", name="department_type")


def upgrade() -> None:
    department_type.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "departments",
        sa.Column("department_type", department_type, nullable=False, server_default="administrative"),
    )


def downgrade() -> None:
    op.drop_column("departments", "department_type")
    department_type.drop(op.get_bind(), checkfirst=True)
