"""add rector and prorektor roles

Revision ID: 0015
Revises: 0014
Create Date: 2026-09-12

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

NEW_VALUES = ("rector", "prorektor_birinchi", "prorektor_oquv", "prorektor_xalqaro")


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction block in Postgres.
    with op.get_context().autocommit_block():
        for value in NEW_VALUES:
            op.execute(f"ALTER TYPE user_role ADD VALUE IF NOT EXISTS '{value}'")


def downgrade() -> None:
    # Postgres has no DROP VALUE for enums; downgrading would require recreating the type.
    # Not supported - this migration is intentionally one-way.
    pass
