"""seed the standard Nizom-based KPI template (idempotent)

Revision ID: 0020
Revises: 0019
Create Date: 2026-09-16

Without this, a fresh deployment (fresh DB + `alembic upgrade head`) has no
KPI template at all until an admin manually recreates the whole Nizom
structure by hand through the UI. This seeds the exact standard annex
(categories + indicators, matching the real signed Nizom document) so every
environment starts from the same baseline. Safe to re-run: it checks for an
existing template with the same name + annex code first and skips entirely
if found, so it never duplicates data in an environment (like this project's
own dev DB) where the template was already created by hand before this
migration existed.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0020"
down_revision: Union[str, None] = "0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TEMPLATE_NAME = "Professor-o'qituvchilar samaradorligi"
ANNEX_CODE = "1"
ACADEMIC_YEAR = "2026-2027"

# (name, max_score, is_bonus_category, requires_kafedra_endorsement, requires_head_approval, [
#     (indicator_name, max_score, allow_coauthors, requires_file), ...
# ])
CATEGORIES = [
    (
        "Ilmiy faoliyat",
        34,
        False,
        False,
        True,
        [
            ("Xalqaro nashrlarda maqola chop etish", 14, True, True),
            ("Respublika miqyosidagi nashrlarda maqola", 10, True, True),
            ("Ilmiy-amaliy konferensiyalarda ishtirok", 10, False, True),
        ],
    ),
    (
        "O'quv-uslubiy faoliyat",
        36,
        False,
        False,
        True,
        [
            ("Darslik yoki o'quv qo'llanma chop etish", 16, True, True),
            ("Ma'ruza matnlari va uslubiy majmualarni yangilash", 10, False, True),
            ("Talabalar bilimini nazorat qilish sifati", 10, False, False),
        ],
    ),
    (
        "Ma'naviy-ma'rifiy faoliyat",
        20,
        False,
        True,
        True,
        [
            ("Tarbiyaviy tadbirlarda ishtirok", 10, False, False),
            ("Kuratorlik faoliyati", 10, False, False),
        ],
    ),
    (
        "Xalqaro aloqalar",
        10,
        False,
        False,
        True,
        [
            ("Xalqaro dastur va loyihalarda ishtirok", 10, True, True),
        ],
    ),
    (
        "Rahbar tavsiyasi",
        10,
        True,
        False,
        True,
        [
            ("Rektor tavsiyasi", 2.5, False, False),
            ("Birinchi prorektor tavsiyasi", 2.5, False, False),
            ("O'quv ishlari bo'yicha prorektor tavsiyasi", 2.5, False, False),
            ("Xalqaro hamkorlik, ilmiy ishlar va innovatsiyalar bo'yicha prorektor tavsiyasi", 2.5, False, False),
        ],
    ),
]


def upgrade() -> None:
    bind = op.get_bind()

    existing = bind.execute(
        sa.text("SELECT id FROM kpi_templates WHERE name = :name AND annex_code = :annex_code"),
        {"name": TEMPLATE_NAME, "annex_code": ANNEX_CODE},
    ).scalar()
    if existing is not None:
        return

    template_id = bind.execute(
        sa.text(
            """
            INSERT INTO kpi_templates (name, annex_code, academic_year, period_type, is_active)
            VALUES (:name, :annex_code, :academic_year, CAST(:period_type AS period_type), true)
            RETURNING id
            """
        ),
        {
            "name": TEMPLATE_NAME,
            "annex_code": ANNEX_CODE,
            "academic_year": ACADEMIC_YEAR,
            "period_type": "yearly",
        },
    ).scalar_one()

    for order_index, (
        cat_name,
        cat_max_score,
        is_bonus,
        requires_kafedra_endorsement,
        requires_head_approval,
        indicators,
    ) in enumerate(CATEGORIES):
        category_id = bind.execute(
            sa.text(
                """
                INSERT INTO kpi_categories (
                    kpi_template_id, name, max_score, is_bonus_category,
                    requires_kafedra_endorsement, requires_head_approval, order_index
                )
                VALUES (
                    :template_id, :name, :max_score, :is_bonus,
                    :requires_kafedra_endorsement, :requires_head_approval, :order_index
                )
                RETURNING id
                """
            ),
            {
                "template_id": template_id,
                "name": cat_name,
                "max_score": cat_max_score,
                "is_bonus": is_bonus,
                "requires_kafedra_endorsement": requires_kafedra_endorsement,
                "requires_head_approval": requires_head_approval,
                "order_index": order_index,
            },
        ).scalar_one()

        for ind_order_index, (ind_name, ind_max_score, allow_coauthors, requires_file) in enumerate(indicators):
            bind.execute(
                sa.text(
                    """
                    INSERT INTO kpi_indicators (
                        kpi_category_id, name, max_score, allow_coauthors, requires_file, order_index
                    )
                    VALUES (:category_id, :name, :max_score, :allow_coauthors, :requires_file, :order_index)
                    """
                ),
                {
                    "category_id": category_id,
                    "name": ind_name,
                    "max_score": ind_max_score,
                    "allow_coauthors": allow_coauthors,
                    "requires_file": requires_file,
                    "order_index": ind_order_index,
                },
            )


def downgrade() -> None:
    # Intentionally left as a no-op: by the time anyone downgrades past this
    # revision, real arizalar/results may already reference this template,
    # and deleting it would violate the same in-use safety checks the app
    # itself enforces (see kpi_templates.py::delete_template).
    pass
