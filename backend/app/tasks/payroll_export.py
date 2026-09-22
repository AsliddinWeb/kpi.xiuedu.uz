from datetime import datetime, timezone
from pathlib import Path

import openpyxl
from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle
from sqlalchemy import select

from app.db.base import SessionLocal
from app.models.department import Department
from app.models.kpi_result import KpiResult, KpiResultStatus
from app.models.payroll_export import PayrollExport, PayrollExportFormat, PayrollExportStatus
from app.models.position import Position
from app.models.user import User
from app.services.bonus import compute_bonuses
from app.worker import celery_app

EXPORTS_DIR = Path("/data/exports")

COLUMNS = [
    "Full name",
    "Email",
    "Department",
    "Position",
    "Period",
    "Status",
    "Total score (%)",
    "Bonus fund",
    "Bonus amount",
]


def _build_rows(db, export: PayrollExport) -> list[list]:
    results = db.scalars(
        select(KpiResult).where(KpiResult.period == export.period, KpiResult.status == KpiResultStatus.approved)
    ).all()

    user_ids = [r.user_id for r in results]
    users = {u.id: u for u in db.scalars(select(User).where(User.id.in_(user_ids))).all()} if user_ids else {}
    departments = {d.id: d for d in db.scalars(select(Department)).all()}
    positions = {p.id: p for p in db.scalars(select(Position)).all()}
    bonus_by_user = {row["user_id"]: row for row in compute_bonuses(db, export.period)}

    rows = []
    for result in results:
        user = users.get(result.user_id)
        if user is None:
            continue
        department_name = departments[user.department_id].name if user.department_id in departments else ""
        position_title = positions[user.position_id].title if user.position_id in positions else ""
        bonus_row = bonus_by_user.get(user.id)
        rows.append(
            [
                user.full_name,
                user.email,
                department_name,
                position_title,
                result.period,
                result.status.value,
                result.total_score,
                bonus_row["bonus_fund"] if bonus_row else None,
                bonus_row["bonus_amount"] if bonus_row else None,
            ]
        )
    return rows


def _write_xlsx(filepath: Path, period: str, rows: list[list]) -> None:
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = period
    sheet.append(COLUMNS)
    for row in rows:
        sheet.append(row)
    workbook.save(filepath)


def _write_pdf(filepath: Path, rows: list[list]) -> None:
    table_data = [COLUMNS] + [["" if cell is None else str(cell) for cell in row] for row in rows]
    document = SimpleDocTemplate(str(filepath), pagesize=landscape(A4))
    table = Table(table_data, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f3f4f6")]),
            ]
        )
    )
    document.build([table])


@celery_app.task(name="generate_payroll_export")
def generate_payroll_export(export_id: int) -> None:
    db = SessionLocal()
    try:
        export = db.get(PayrollExport, export_id)
        if export is None:
            return

        rows = _build_rows(db, export)

        EXPORTS_DIR.mkdir(parents=True, exist_ok=True)
        if export.format == PayrollExportFormat.pdf:
            filename = f"payroll_{export.period}_{export.id}.pdf"
            filepath = EXPORTS_DIR / filename
            _write_pdf(filepath, rows)
        else:
            filename = f"payroll_{export.period}_{export.id}.xlsx"
            filepath = EXPORTS_DIR / filename
            _write_xlsx(filepath, export.period, rows)

        export.file_url = str(filepath)
        export.status = PayrollExportStatus.completed
        export.generated_at = datetime.now(timezone.utc)
        db.commit()
    except Exception:
        db.rollback()
        failed_export = db.get(PayrollExport, export_id)
        if failed_export is not None:
            failed_export.status = PayrollExportStatus.failed
            db.commit()
        raise
    finally:
        db.close()
