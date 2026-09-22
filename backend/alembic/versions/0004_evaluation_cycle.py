"""employee_targets, evaluations, evaluation_scores

Revision ID: 0004
Revises: 0003
Create Date: 2026-07-17

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

evaluation_status = sa.Enum("pending", "submitted", "approved", name="evaluation_status")


def upgrade() -> None:
    op.create_table(
        "employee_targets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("kpi_indicator_id", sa.Integer(), sa.ForeignKey("kpi_indicators.id"), nullable=False),
        sa.Column("period", sa.String(length=7), nullable=False),
        sa.Column("target_value", sa.Float(), nullable=False),
        sa.UniqueConstraint("user_id", "kpi_indicator_id", "period", name="uq_employee_targets_user_indicator_period"),
    )

    op.create_table(
        "evaluations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("evaluator_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("period", sa.String(length=7), nullable=False),
        sa.Column("status", evaluation_status, nullable=False, server_default="pending"),
        sa.Column("total_score", sa.Float(), nullable=True),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("user_id", "period", name="uq_evaluations_user_period"),
    )

    op.create_table(
        "evaluation_scores",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("evaluation_id", sa.Integer(), sa.ForeignKey("evaluations.id"), nullable=False),
        sa.Column("kpi_indicator_id", sa.Integer(), sa.ForeignKey("kpi_indicators.id"), nullable=False),
        sa.Column("actual_value", sa.Float(), nullable=False),
        sa.Column("score_percent", sa.Float(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("evaluation_scores")
    op.drop_table("evaluations")
    op.drop_table("employee_targets")
    evaluation_status.drop(op.get_bind(), checkfirst=True)
