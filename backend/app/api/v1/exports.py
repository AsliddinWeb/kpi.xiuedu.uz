from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import OVERSIGHT_ROLES, require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.bonus_approval import BonusApproval
from app.models.payroll_export import PayrollExport, PayrollExportFormat, PayrollExportStatus
from app.models.user import User
from app.schemas.export import ExportCreate, ExportOut
from app.services.audit import log_action
from app.tasks.payroll_export import generate_payroll_export

router = APIRouter(prefix="/exports", tags=["exports"])


def _to_out(export: PayrollExport) -> ExportOut:
    return ExportOut(
        id=export.id,
        period=export.period,
        status=export.status.value,
        format=export.format.value,
        file_url=export.file_url,
        generated_at=export.generated_at.isoformat() if export.generated_at else None,
    )


@router.post("", response_model=ExportOut, status_code=status.HTTP_201_CREATED)
def create_export(
    payload: ExportCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin", "super_admin")),
) -> ExportOut:
    locale = get_locale(request)
    if db.scalar(select(BonusApproval).where(BonusApproval.period == payload.period)) is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("bonus_not_approved", locale))

    export = PayrollExport(
        period=payload.period,
        status=PayrollExportStatus.pending,
        format=PayrollExportFormat(payload.format),
    )
    db.add(export)
    db.flush()
    log_action(db, current_user.id, "create_export", "payroll_export", export.id)
    db.commit()
    db.refresh(export)

    generate_payroll_export.delay(export.id)

    return _to_out(export)


@router.get("", response_model=list[ExportOut])
def list_exports(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> list[ExportOut]:
    exports = db.scalars(select(PayrollExport).order_by(PayrollExport.id.desc())).all()
    return [_to_out(e) for e in exports]


@router.get("/{export_id}", response_model=ExportOut)
def get_export(
    export_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> ExportOut:
    locale = get_locale(request)
    export = db.get(PayrollExport, export_id)
    if export is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("export_not_found", locale))
    return _to_out(export)


@router.get("/{export_id}/download")
def download_export(
    export_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> FileResponse:
    locale = get_locale(request)
    export = db.get(PayrollExport, export_id)
    if export is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("export_not_found", locale))
    if export.status != PayrollExportStatus.completed or not export.file_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("export_not_ready", locale))

    if export.format == PayrollExportFormat.pdf:
        filename = f"payroll_{export.period}.pdf"
        media_type = "application/pdf"
    else:
        filename = f"payroll_{export.period}.xlsx"
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return FileResponse(path=export.file_url, filename=filename, media_type=media_type)
