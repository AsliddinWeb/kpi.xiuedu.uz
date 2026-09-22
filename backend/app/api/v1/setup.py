from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_role
from app.core.i18n import get_locale, t
from app.core.security import hash_password
from app.db.session import get_db
from app.models.company_settings import CompanySettings
from app.models.department import Department
from app.models.position import Position
from app.models.user import User, UserRole
from app.schemas.setup import (
    CompanySettingsOut,
    CompanySettingsUpdate,
    SetupCompleteRequest,
    SetupCompleteResponse,
    SetupStatus,
)
from app.services.audit import log_action

router = APIRouter(prefix="/setup", tags=["setup"])

LOGO_DIR = Path("/data/company-logo")
LOGO_CONTENT_TYPES = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
}
MAX_LOGO_SIZE = 5 * 1024 * 1024


@router.get("/status", response_model=SetupStatus)
def get_status(db: Session = Depends(get_db)) -> SetupStatus:
    company = db.scalar(select(CompanySettings))
    return SetupStatus(setup_completed=bool(company and company.setup_completed_at))


@router.post("/complete", response_model=SetupCompleteResponse)
def complete_setup(
    payload: SetupCompleteRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin")),
) -> SetupCompleteResponse:
    locale = get_locale(request)
    company = db.scalar(select(CompanySettings))
    if company is not None and company.setup_completed_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("setup_already_completed", locale))

    if company is None:
        company = CompanySettings(name=payload.company_name, default_period_type=payload.default_period_type)
        db.add(company)
    else:
        company.name = payload.company_name

    company.logo_url = payload.logo_url
    company.industry_label = payload.industry_label
    company.default_period_type = payload.default_period_type
    company.setup_completed_at = datetime.now(timezone.utc)

    for dept_in in payload.departments:
        department = Department(name=dept_in.name)
        db.add(department)
        db.flush()
        for pos_in in dept_in.positions:
            db.add(Position(department_id=department.id, title=pos_in.title))

    if payload.admin is not None:
        existing_admin = db.scalar(select(User).where(User.email == payload.admin.email))
        if existing_admin is None:
            db.add(
                User(
                    email=payload.admin.email,
                    password_hash=hash_password(payload.admin.password),
                    full_name=payload.admin.full_name,
                    role=UserRole.admin,
                )
            )

    log_action(db, current_user.id, "complete_setup", "company_settings", company.id)
    db.commit()
    db.refresh(company)

    return SetupCompleteResponse(company=CompanySettingsOut.model_validate(company))


@router.get("/company", response_model=CompanySettingsOut)
def get_company(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompanySettingsOut:
    company = db.scalar(select(CompanySettings))
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return CompanySettingsOut.model_validate(company)


@router.patch("/company", response_model=CompanySettingsOut)
def update_company(
    payload: CompanySettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> CompanySettingsOut:
    company = db.scalar(select(CompanySettings))
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if payload.name is not None:
        company.name = payload.name
    if payload.logo_url is not None:
        company.logo_url = payload.logo_url
    if payload.industry_label is not None:
        company.industry_label = payload.industry_label
    if payload.default_period_type is not None:
        company.default_period_type = payload.default_period_type

    log_action(db, current_user.id, "update", "company_settings", company.id)
    db.commit()
    db.refresh(company)
    return CompanySettingsOut.model_validate(company)


@router.post("/company/logo", response_model=CompanySettingsOut)
async def upload_company_logo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> CompanySettingsOut:
    locale = get_locale(request)
    extension = LOGO_CONTENT_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("logo_invalid_type", locale))

    data = await file.read()
    if len(data) > MAX_LOGO_SIZE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("logo_too_large", locale))

    company = db.scalar(select(CompanySettings))
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    LOGO_DIR.mkdir(parents=True, exist_ok=True)
    for stale in LOGO_DIR.glob("logo.*"):
        stale.unlink(missing_ok=True)
    (LOGO_DIR / f"logo.{extension}").write_bytes(data)

    company.logo_url = f"/api/v1/setup/company/logo-file?v={int(datetime.now(timezone.utc).timestamp())}"

    log_action(db, current_user.id, "update", "company_settings", company.id)
    db.commit()
    db.refresh(company)
    return CompanySettingsOut.model_validate(company)


@router.delete("/company/logo", response_model=CompanySettingsOut)
def remove_company_logo(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> CompanySettingsOut:
    company = db.scalar(select(CompanySettings))
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)

    if LOGO_DIR.exists():
        for stale in LOGO_DIR.glob("logo.*"):
            stale.unlink(missing_ok=True)
    company.logo_url = None

    log_action(db, current_user.id, "update", "company_settings", company.id)
    db.commit()
    db.refresh(company)
    return CompanySettingsOut.model_validate(company)


@router.get("/company/logo-file")
def get_company_logo_file(request: Request) -> FileResponse:
    locale = get_locale(request)
    matches = sorted(LOGO_DIR.glob("logo.*")) if LOGO_DIR.exists() else []
    if not matches:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("logo_not_found", locale))
    return FileResponse(matches[0])
