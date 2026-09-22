from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import OVERSIGHT_ROLES, require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.summary import Summary, SummaryType
from app.models.user import User
from app.schemas.summary import EarlyWarningRequest, SemesterReviewRequest, SummaryOut, YearEndRequest
from app.services.audit import log_action
from app.services.summary import build_early_warning, build_semester_review, build_year_end

router = APIRouter(prefix="/summaries", tags=["summaries"])


def _to_out(db: Session, summary: Summary) -> SummaryOut:
    generator = db.get(User, summary.generated_by_id)
    return SummaryOut(
        id=summary.id,
        type=summary.type.value,
        period=summary.period,
        half=summary.half,
        generated_by_id=summary.generated_by_id,
        generated_by_name=generator.full_name if generator else "",
        generated_at=summary.generated_at,
        payload=summary.payload,
    )


@router.post("/semester-review", response_model=SummaryOut, status_code=status.HTTP_201_CREATED)
def generate_semester_review(
    payload: SemesterReviewRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> SummaryOut:
    locale = get_locale(request)
    if payload.half not in (1, 2):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("invalid_status", locale))

    result_payload = build_semester_review(db, payload.period, payload.half)
    summary = Summary(
        type=SummaryType.semester_review,
        period=payload.period,
        half=payload.half,
        generated_by_id=current_user.id,
        payload=result_payload,
    )
    db.add(summary)
    db.flush()
    log_action(db, current_user.id, "generate", "summary", summary.id)
    db.commit()
    db.refresh(summary)
    return _to_out(db, summary)


@router.post("/year-end", response_model=SummaryOut, status_code=status.HTTP_201_CREATED)
def generate_year_end(
    payload: YearEndRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> SummaryOut:
    result_payload = build_year_end(db, payload.academic_year)
    summary = Summary(
        type=SummaryType.year_end,
        period=payload.academic_year,
        half=None,
        generated_by_id=current_user.id,
        payload=result_payload,
    )
    db.add(summary)
    db.flush()
    log_action(db, current_user.id, "generate", "summary", summary.id)
    db.commit()
    db.refresh(summary)
    return _to_out(db, summary)


@router.post("/early-warning", response_model=SummaryOut, status_code=status.HTTP_201_CREATED)
def generate_early_warning(
    payload: EarlyWarningRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> SummaryOut:
    result_payload = build_early_warning(db, payload.period)
    summary = Summary(
        type=SummaryType.early_warning,
        period=payload.period,
        half=None,
        generated_by_id=current_user.id,
        payload=result_payload,
    )
    db.add(summary)
    db.flush()
    log_action(db, current_user.id, "generate", "summary", summary.id)
    db.commit()
    db.refresh(summary)
    return _to_out(db, summary)


@router.get("", response_model=list[SummaryOut])
def list_summaries(
    type: str | None = None,
    period: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> list[SummaryOut]:
    query = select(Summary)
    if type:
        try:
            query = query.where(Summary.type == SummaryType(type))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid type")
    if period:
        query = query.where(Summary.period == period)
    summaries = db.scalars(query.order_by(Summary.generated_at.desc())).all()
    return [_to_out(db, s) for s in summaries]


@router.get("/{summary_id}", response_model=SummaryOut)
def get_summary(
    summary_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> SummaryOut:
    locale = get_locale(request)
    summary = db.get(Summary, summary_id)
    if summary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("summary_not_found", locale))
    return _to_out(db, summary)
