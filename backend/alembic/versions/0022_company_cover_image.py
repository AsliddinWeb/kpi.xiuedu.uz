"""company_settings.cover_image_url (public homepage hero background)

Revision ID: 0022
Revises: 0021
Create Date: 2026-09-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0022"
down_revision: Union[str, None] = "0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("company_settings", sa.Column("cover_image_url", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("company_settings", "cover_image_url")
