"""Replace the target/actual evaluation model with the rubric/ariza (application-evidence) model.

Drops employee_targets, evaluations, evaluation_scores and the old flat
kpi_templates/kpi_indicators shape; introduces kpi_categories, kpi_indicator_sub_items,
category_reviewers, arizalar (+ariza_files, ariza_co_authors), kpi_results, and the
governance layer (correction_plans, force_majeure_declarations, incentives).

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-09

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

period_type = postgresql.ENUM("monthly", "quarterly", "yearly", name="period_type", create_type=False)
evaluation_status = sa.Enum("pending", "submitted", "approved", name="evaluation_status")
ariza_status = sa.Enum("submitted", "kafedra_endorsed", "scored", "rejected", name="ariza_status")
kpi_result_status = sa.Enum("computed", "approved", name="kpi_result_status")
correction_plan_stage = sa.Enum("load_reduction", "warning", "termination", name="correction_plan_stage")
correction_plan_status = sa.Enum("active", "resolved", name="correction_plan_status")
force_majeure_category = sa.Enum(
    "natural_disaster",
    "war_or_unrest",
    "government_restriction",
    "system_outage",
    "utility_outage",
    "health_emergency",
    "other",
    name="force_majeure_category",
)
force_majeure_status = sa.Enum("pending", "acknowledged", "resolved", name="force_majeure_status")
incentive_type = sa.Enum("monetary", "title", "certificate", "training_trip", "other", name="incentive_type")
incentive_status = sa.Enum("active", "revoked", name="incentive_status")


def upgrade() -> None:
    op.drop_table("evaluation_scores")
    op.drop_table("employee_targets")
    op.drop_table("evaluations")
    evaluation_status.drop(op.get_bind(), checkfirst=True)

    op.drop_table("kpi_indicators")
    op.drop_table("kpi_templates")

    op.create_table(
        "kpi_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("annex_code", sa.String(length=20), nullable=False),
        sa.Column("academic_year", sa.String(length=9), nullable=False),
        sa.Column("period_type", period_type, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "kpi_categories",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kpi_template_id", sa.Integer(), sa.ForeignKey("kpi_templates.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("max_score", sa.Float(), nullable=False),
        sa.Column("is_bonus_category", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("requires_kafedra_endorsement", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "kpi_indicators",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kpi_category_id", sa.Integer(), sa.ForeignKey("kpi_categories.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("max_score", sa.Float(), nullable=False),
        sa.Column("allow_coauthors", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("requires_file", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "kpi_indicator_sub_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kpi_indicator_id", sa.Integer(), sa.ForeignKey("kpi_indicators.id"), nullable=False),
        sa.Column("label", sa.String(length=500), nullable=False),
        sa.Column("max_score", sa.Float(), nullable=False),
        sa.Column("order_index", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "category_reviewers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kpi_category_id", sa.Integer(), sa.ForeignKey("kpi_categories.id"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.UniqueConstraint("kpi_category_id", "user_id", name="uq_category_reviewers_category_user"),
    )

    op.create_table(
        "arizalar",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("kpi_indicator_id", sa.Integer(), sa.ForeignKey("kpi_indicators.id"), nullable=False),
        sa.Column("period", sa.String(length=9), nullable=False),
        sa.Column("status", ariza_status, nullable=False, server_default="submitted"),
        sa.Column("awarded_score", sa.Float(), nullable=True),
        sa.Column("reviewer_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewer_comment", sa.Text(), nullable=True),
        sa.Column("endorsed_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("endorsed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "ariza_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ariza_id", sa.Integer(), sa.ForeignKey("arizalar.id"), nullable=False),
        sa.Column("file_url", sa.String(length=500), nullable=False),
        sa.Column("original_filename", sa.String(length=255), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "ariza_co_authors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("ariza_id", sa.Integer(), sa.ForeignKey("arizalar.id"), nullable=False),
        sa.Column("co_author_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("co_author_name", sa.String(length=255), nullable=True),
        sa.Column("share_percent", sa.Float(), nullable=False),
    )

    op.create_table(
        "kpi_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("kpi_template_id", sa.Integer(), sa.ForeignKey("kpi_templates.id"), nullable=False),
        sa.Column("period", sa.String(length=9), nullable=False),
        sa.Column("total_score", sa.Float(), nullable=False, server_default="0"),
        sa.Column("category_breakdown", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("status", kpi_result_status, nullable=False, server_default="computed"),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("computed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "period", "kpi_template_id", name="uq_kpi_results_user_period_template"),
    )

    op.create_table(
        "correction_plans",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("period", sa.String(length=9), nullable=False),
        sa.Column("stage", correction_plan_stage, nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("load_reduction_percent", sa.Float(), nullable=True),
        sa.Column("status", correction_plan_status, nullable=False, server_default="active"),
        sa.Column("started_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "force_majeure_declarations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("declared_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("affected_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("period", sa.String(length=9), nullable=False),
        sa.Column("category", force_majeure_category, nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("extension_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", force_majeure_status, nullable=False, server_default="pending"),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "incentives",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("period", sa.String(length=9), nullable=False),
        sa.Column("type", incentive_type, nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount", sa.Float(), nullable=True),
        sa.Column("decided_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("decided_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("status", incentive_status, nullable=False, server_default="active"),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_reason", sa.Text(), nullable=True),
    )

    op.add_column("users", sa.Column("kpi_template_id", sa.Integer(), sa.ForeignKey("kpi_templates.id"), nullable=True))
    op.add_column("users", sa.Column("is_restricted", sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column("users", "is_restricted")
    op.drop_column("users", "kpi_template_id")

    op.drop_table("incentives")
    incentive_status.drop(op.get_bind(), checkfirst=True)
    incentive_type.drop(op.get_bind(), checkfirst=True)

    op.drop_table("force_majeure_declarations")
    force_majeure_status.drop(op.get_bind(), checkfirst=True)
    force_majeure_category.drop(op.get_bind(), checkfirst=True)

    op.drop_table("correction_plans")
    correction_plan_status.drop(op.get_bind(), checkfirst=True)
    correction_plan_stage.drop(op.get_bind(), checkfirst=True)

    op.drop_table("kpi_results")
    kpi_result_status.drop(op.get_bind(), checkfirst=True)

    op.drop_table("ariza_co_authors")
    op.drop_table("ariza_files")
    op.drop_table("arizalar")
    ariza_status.drop(op.get_bind(), checkfirst=True)

    op.drop_table("category_reviewers")
    op.drop_table("kpi_indicator_sub_items")
    op.drop_table("kpi_indicators")
    op.drop_table("kpi_categories")
    op.drop_table("kpi_templates")

    op.create_table(
        "kpi_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("position_id", sa.Integer(), sa.ForeignKey("positions.id"), nullable=False),
        sa.Column("period_type", period_type, nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )

    op.create_table(
        "kpi_indicators",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kpi_template_id", sa.Integer(), sa.ForeignKey("kpi_templates.id"), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("weight_percent", sa.Integer(), nullable=False),
        sa.Column("unit", sa.String(length=50), nullable=False),
        sa.CheckConstraint("weight_percent >= 0 AND weight_percent <= 100", name="ck_kpi_indicators_weight_range"),
    )

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
