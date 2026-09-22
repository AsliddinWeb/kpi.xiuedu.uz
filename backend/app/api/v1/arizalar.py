import json
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import (
    OVERSIGHT_ROLES,
    can_approve_category_head,
    can_manage_employee,
    can_review_category,
    get_current_user,
)
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.ariza import Ariza, ArizaStatus
from app.models.ariza_co_author import ArizaCoAuthor
from app.models.ariza_file import ArizaFile
from app.models.category_head_approver import CategoryHeadApprover
from app.models.category_reviewer import CategoryReviewer
from app.models.kpi_category import KpiCategory
from app.models.kpi_indicator import KpiIndicator
from app.models.user import User
from app.schemas.ariza import ArizaCoAuthorIn, ArizaOut, HeadRejectRequest, RejectArizaRequest, ScoreArizaRequest
from app.services.audit import log_action
from app.services.kpi_result import recompute_kpi_result
from app.services.rank_override import effective_indicator_max

router = APIRouter(prefix="/arizalar", tags=["arizalar"])

FILES_DIR = Path("/data/ariza-files")


def _to_out(db: Session, ariza: Ariza) -> ArizaOut:
    indicator = db.get(KpiIndicator, ariza.kpi_indicator_id)
    category = db.get(KpiCategory, indicator.kpi_category_id)
    submitter = db.get(User, ariza.user_id)
    files = db.scalars(select(ArizaFile).where(ArizaFile.ariza_id == ariza.id)).all()
    co_authors = db.scalars(select(ArizaCoAuthor).where(ArizaCoAuthor.ariza_id == ariza.id)).all()

    return ArizaOut(
        id=ariza.id,
        user_id=ariza.user_id,
        user_full_name=submitter.full_name if submitter else "",
        kpi_indicator_id=indicator.id,
        indicator_name=indicator.name,
        kpi_category_id=category.id,
        category_name=category.name,
        requires_kafedra_endorsement=category.requires_kafedra_endorsement,
        requires_head_approval=category.requires_head_approval,
        max_score=effective_indicator_max(db, indicator, submitter) if submitter else indicator.max_score,
        period=ariza.period,
        status=ariza.status.value,
        employee_comment=ariza.employee_comment,
        awarded_score=ariza.awarded_score,
        reviewer_id=ariza.reviewer_id,
        reviewer_comment=ariza.reviewer_comment,
        head_approved_by_id=ariza.head_approved_by_id,
        head_approved_at=ariza.head_approved_at,
        submitted_at=ariza.submitted_at,
        reviewed_at=ariza.reviewed_at,
        files=files,
        co_authors=co_authors,
    )


@router.post("", response_model=ArizaOut, status_code=status.HTTP_201_CREATED)
async def submit_ariza(
    request: Request,
    kpi_indicator_id: int = Form(...),
    period: str = Form(...),
    employee_comment: str | None = Form(None),
    co_authors_json: str | None = Form(None),
    files: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArizaOut:
    locale = get_locale(request)
    if current_user.is_restricted:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("user_restricted", locale))

    indicator = db.get(KpiIndicator, kpi_indicator_id)
    if indicator is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("indicator_not_found", locale))

    uploaded_files = [f for f in files if f.filename]
    if indicator.requires_file and not uploaded_files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("ariza_file_required", locale))

    co_authors_in: list[ArizaCoAuthorIn] = []
    if co_authors_json:
        try:
            co_authors_in = [ArizaCoAuthorIn(**item) for item in json.loads(co_authors_json)]
        except (json.JSONDecodeError, TypeError, ValueError):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("invalid_co_authors", locale))
    if co_authors_in and not indicator.allow_coauthors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("coauthors_not_allowed", locale))
    if sum(c.share_percent for c in co_authors_in) > 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("coauthor_share_invalid", locale))

    ariza = Ariza(
        user_id=current_user.id,
        kpi_indicator_id=kpi_indicator_id,
        period=period,
        status=ArizaStatus.submitted,
        employee_comment=employee_comment,
    )
    db.add(ariza)
    db.flush()

    ariza_dir = FILES_DIR / str(ariza.id)
    ariza_dir.mkdir(parents=True, exist_ok=True)
    for upload in uploaded_files:
        stored_name = f"{uuid.uuid4().hex}_{upload.filename}"
        filepath = ariza_dir / stored_name
        filepath.write_bytes(await upload.read())
        db.add(ArizaFile(ariza_id=ariza.id, file_url=str(filepath), original_filename=upload.filename))

    for co_author in co_authors_in:
        db.add(
            ArizaCoAuthor(
                ariza_id=ariza.id,
                co_author_user_id=co_author.co_author_user_id,
                co_author_name=co_author.co_author_name,
                share_percent=co_author.share_percent,
            )
        )

    log_action(db, current_user.id, "submit", "ariza", ariza.id)
    db.commit()
    db.refresh(ariza)
    return _to_out(db, ariza)


@router.get("", response_model=list[ArizaOut])
def list_arizalar(
    request: Request,
    user_id: int | None = None,
    status_filter: str | None = None,
    period: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ArizaOut]:
    locale = get_locale(request)
    query = select(Ariza).where(Ariza.deleted_at.is_(None))

    if user_id is not None:
        target_user = db.get(User, user_id)
        if target_user is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("user_not_found", locale))
        if current_user.id != user_id and current_user.role not in OVERSIGHT_ROLES:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))
        query = query.where(Ariza.user_id == user_id)
    elif current_user.role not in OVERSIGHT_ROLES:
        reviewer_category_ids = db.scalars(
            select(CategoryReviewer.kpi_category_id).where(CategoryReviewer.user_id == current_user.id)
        ).all()
        approver_category_ids = db.scalars(
            select(CategoryHeadApprover.kpi_category_id).where(CategoryHeadApprover.user_id == current_user.id)
        ).all()
        reviewable_category_ids = list({*reviewer_category_ids, *approver_category_ids})
        if not reviewable_category_ids:
            return []
        indicator_ids = db.scalars(
            select(KpiIndicator.id).where(KpiIndicator.kpi_category_id.in_(reviewable_category_ids))
        ).all()
        query = query.where(Ariza.kpi_indicator_id.in_(indicator_ids))

    if status_filter:
        try:
            query = query.where(Ariza.status == ArizaStatus(status_filter))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("invalid_status", locale))
    if period:
        query = query.where(Ariza.period == period)

    arizalar = db.scalars(query.order_by(Ariza.submitted_at.desc())).all()
    return [_to_out(db, a) for a in arizalar]


@router.get("/{ariza_id}", response_model=ArizaOut)
def get_ariza(
    ariza_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArizaOut:
    locale = get_locale(request)
    ariza = db.get(Ariza, ariza_id)
    if ariza is None or ariza.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("ariza_not_found", locale))

    indicator = db.get(KpiIndicator, ariza.kpi_indicator_id)
    if (
        current_user.id != ariza.user_id
        and not can_review_category(db, current_user, indicator.kpi_category_id)
        and not can_approve_category_head(db, current_user, indicator.kpi_category_id, indicator.id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))

    return _to_out(db, ariza)


@router.patch("/{ariza_id}/score", response_model=ArizaOut)
def score_ariza(
    ariza_id: int,
    payload: ScoreArizaRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArizaOut:
    locale = get_locale(request)
    ariza = db.get(Ariza, ariza_id)
    if ariza is None or ariza.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("ariza_not_found", locale))

    indicator = db.get(KpiIndicator, ariza.kpi_indicator_id)
    if not can_review_category(db, current_user, indicator.kpi_category_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))
    if ariza.status not in (ArizaStatus.submitted, ArizaStatus.kafedra_endorsed):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("ariza_not_scoreable", locale))

    submitter = db.get(User, ariza.user_id)
    indicator_max = effective_indicator_max(db, indicator, submitter)
    if payload.awarded_score > indicator_max:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("score_exceeds_max", locale))

    already_scored_total = db.scalar(
        select(func.coalesce(func.sum(Ariza.awarded_score), 0.0)).where(
            Ariza.user_id == ariza.user_id,
            Ariza.kpi_indicator_id == ariza.kpi_indicator_id,
            Ariza.period == ariza.period,
            Ariza.status.in_([ArizaStatus.scored, ArizaStatus.pending_head_approval, ArizaStatus.approved]),
            Ariza.deleted_at.is_(None),
            Ariza.id != ariza.id,
        )
    ) or 0.0
    if already_scored_total + payload.awarded_score > indicator_max:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("score_exceeds_remaining", locale))

    category = db.get(KpiCategory, indicator.kpi_category_id)
    ariza.awarded_score = payload.awarded_score
    ariza.reviewer_comment = payload.reviewer_comment
    ariza.reviewer_id = current_user.id
    ariza.status = ArizaStatus.pending_head_approval if category.requires_head_approval else ArizaStatus.scored
    ariza.reviewed_at = datetime.now(timezone.utc)

    affected_user_ids = {ariza.user_id}
    for co_author in db.scalars(select(ArizaCoAuthor).where(ArizaCoAuthor.ariza_id == ariza.id)).all():
        if co_author.co_author_user_id is not None:
            affected_user_ids.add(co_author.co_author_user_id)

    log_action(db, current_user.id, "score", "ariza", ariza.id)
    db.flush()
    for uid in affected_user_ids:
        recompute_kpi_result(db, uid, ariza.period)
    db.commit()
    db.refresh(ariza)
    return _to_out(db, ariza)


@router.patch("/{ariza_id}/head-approve", response_model=ArizaOut)
def head_approve_ariza(
    ariza_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArizaOut:
    locale = get_locale(request)
    ariza = db.get(Ariza, ariza_id)
    if ariza is None or ariza.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("ariza_not_found", locale))

    indicator = db.get(KpiIndicator, ariza.kpi_indicator_id)
    if not can_approve_category_head(db, current_user, indicator.kpi_category_id, indicator.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))
    if ariza.status != ArizaStatus.pending_head_approval:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("ariza_not_pending_head_approval", locale))

    ariza.status = ArizaStatus.approved
    ariza.head_approved_by_id = current_user.id
    ariza.head_approved_at = datetime.now(timezone.utc)

    affected_user_ids = {ariza.user_id}
    for co_author in db.scalars(select(ArizaCoAuthor).where(ArizaCoAuthor.ariza_id == ariza.id)).all():
        if co_author.co_author_user_id is not None:
            affected_user_ids.add(co_author.co_author_user_id)

    log_action(db, current_user.id, "head_approve", "ariza", ariza.id)
    db.flush()
    for uid in affected_user_ids:
        recompute_kpi_result(db, uid, ariza.period)
    db.commit()
    db.refresh(ariza)
    return _to_out(db, ariza)


@router.patch("/{ariza_id}/head-reject", response_model=ArizaOut)
def head_reject_ariza(
    ariza_id: int,
    payload: HeadRejectRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArizaOut:
    locale = get_locale(request)
    ariza = db.get(Ariza, ariza_id)
    if ariza is None or ariza.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("ariza_not_found", locale))

    indicator = db.get(KpiIndicator, ariza.kpi_indicator_id)
    if not can_approve_category_head(db, current_user, indicator.kpi_category_id, indicator.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))
    if ariza.status != ArizaStatus.pending_head_approval:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("ariza_not_pending_head_approval", locale))

    ariza.status = ArizaStatus.rejected
    ariza.reviewer_comment = payload.reviewer_comment
    ariza.head_approved_by_id = current_user.id
    ariza.head_approved_at = datetime.now(timezone.utc)

    affected_user_ids = {ariza.user_id}
    for co_author in db.scalars(select(ArizaCoAuthor).where(ArizaCoAuthor.ariza_id == ariza.id)).all():
        if co_author.co_author_user_id is not None:
            affected_user_ids.add(co_author.co_author_user_id)

    log_action(db, current_user.id, "head_reject", "ariza", ariza.id)
    db.flush()
    for uid in affected_user_ids:
        recompute_kpi_result(db, uid, ariza.period)
    db.commit()
    db.refresh(ariza)
    return _to_out(db, ariza)


@router.patch("/{ariza_id}/reject", response_model=ArizaOut)
def reject_ariza(
    ariza_id: int,
    payload: RejectArizaRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArizaOut:
    locale = get_locale(request)
    ariza = db.get(Ariza, ariza_id)
    if ariza is None or ariza.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("ariza_not_found", locale))

    indicator = db.get(KpiIndicator, ariza.kpi_indicator_id)
    if not can_review_category(db, current_user, indicator.kpi_category_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))

    ariza.status = ArizaStatus.rejected
    ariza.reviewer_comment = payload.reviewer_comment
    ariza.reviewer_id = current_user.id
    ariza.reviewed_at = datetime.now(timezone.utc)

    log_action(db, current_user.id, "reject", "ariza", ariza.id)
    db.commit()
    db.refresh(ariza)
    return _to_out(db, ariza)


@router.patch("/{ariza_id}/endorse", response_model=ArizaOut)
def endorse_ariza(
    ariza_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ArizaOut:
    locale = get_locale(request)
    ariza = db.get(Ariza, ariza_id)
    if ariza is None or ariza.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("ariza_not_found", locale))

    submitter = db.get(User, ariza.user_id)
    if not can_manage_employee(current_user, submitter):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_manager_of_user", locale))
    if ariza.status != ArizaStatus.submitted:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("ariza_not_submitted", locale))

    ariza.status = ArizaStatus.kafedra_endorsed
    ariza.endorsed_by_id = current_user.id
    ariza.endorsed_at = datetime.now(timezone.utc)

    log_action(db, current_user.id, "endorse", "ariza", ariza.id)
    db.commit()
    db.refresh(ariza)
    return _to_out(db, ariza)


@router.delete("/{ariza_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ariza(
    ariza_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    locale = get_locale(request)
    ariza = db.get(Ariza, ariza_id)
    if ariza is None or ariza.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("ariza_not_found", locale))

    is_owner = current_user.id == ariza.user_id
    is_admin = current_user.role in ("admin", "super_admin")
    if not is_owner and not is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))
    finalized_statuses = (ArizaStatus.scored, ArizaStatus.pending_head_approval, ArizaStatus.approved)
    if is_owner and not is_admin and ariza.status in finalized_statuses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("ariza_already_scored", locale))

    ariza.deleted_at = datetime.now(timezone.utc)
    log_action(db, current_user.id, "delete", "ariza", ariza.id)
    db.commit()


@router.get("/{ariza_id}/files/{file_id}/download")
def download_ariza_file(
    ariza_id: int,
    file_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    locale = get_locale(request)
    ariza = db.get(Ariza, ariza_id)
    if ariza is None or ariza.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("ariza_not_found", locale))

    indicator = db.get(KpiIndicator, ariza.kpi_indicator_id)
    if (
        current_user.id != ariza.user_id
        and not can_review_category(db, current_user, indicator.kpi_category_id)
        and not can_approve_category_head(db, current_user, indicator.kpi_category_id, indicator.id)
    ):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=t("not_enough_permissions", locale))

    ariza_file = db.get(ArizaFile, file_id)
    if ariza_file is None or ariza_file.ariza_id != ariza_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("file_not_found", locale))

    return FileResponse(path=ariza_file.file_url, filename=ariza_file.original_filename)
