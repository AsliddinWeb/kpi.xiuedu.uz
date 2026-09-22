"""academic degree and position minimal score

Revision ID: 0013
Revises: 0012
Create Date: 2026-09-11

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


academic_degree = sa.Enum("none", "phd", "dsc", "dotsent", "professor", name="academic_degree")


def upgrade() -> None:
    academic_degree.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "users",
        sa.Column("academic_degree", academic_degree, nullable=False, server_default="none"),
    )
    op.add_column("positions", sa.Column("minimal_score", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("positions", "minimal_score")
    op.drop_column("users", "academic_degree")
    academic_degree.drop(op.get_bind(), checkfirst=True)
