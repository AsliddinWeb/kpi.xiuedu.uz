from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import OVERSIGHT_ROLES, require_role
from app.core.i18n import get_locale, t
from app.db.session import get_db
from app.models.department import Department
from app.models.position import Position
from app.models.user import User
from app.schemas.organization import DepartmentCreate, DepartmentOut, DepartmentUpdate, PositionCreate, PositionOut
from app.services.audit import log_action

router = APIRouter(prefix="/departments", tags=["departments"])


def _to_department_out(db: Session, department: Department) -> DepartmentOut:
    positions = db.scalars(select(Position).where(Position.department_id == department.id)).all()
    return DepartmentOut(
        id=department.id,
        name=department.name,
        department_type=department.department_type,
        parent_department_id=department.parent_department_id,
        positions=[PositionOut.model_validate(p) for p in positions],
    )


@router.get("", response_model=list[DepartmentOut])
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> list[DepartmentOut]:
    departments = db.scalars(select(Department)).all()
    positions = db.scalars(select(Position)).all()

    positions_by_department: dict[int, list[Position]] = {}
    for position in positions:
        positions_by_department.setdefault(position.department_id, []).append(position)

    return [
        DepartmentOut(
            id=d.id,
            name=d.name,
            department_type=d.department_type,
            parent_department_id=d.parent_department_id,
            positions=[PositionOut.model_validate(p) for p in positions_by_department.get(d.id, [])],
        )
        for d in departments
    ]


@router.get("/{department_id}", response_model=DepartmentOut)
def get_department(
    department_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(*OVERSIGHT_ROLES)),
) -> DepartmentOut:
    locale = get_locale(request)
    department = db.get(Department, department_id)
    if department is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("department_not_found", locale))
    return _to_department_out(db, department)


@router.post("", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
def create_department(
    payload: DepartmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> DepartmentOut:
    locale = get_locale(request)
    if payload.parent_department_id is not None and db.get(Department, payload.parent_department_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("department_not_found", locale))

    department = Department(
        name=payload.name,
        department_type=payload.department_type,
        parent_department_id=payload.parent_department_id,
    )
    db.add(department)
    db.flush()
    log_action(db, current_user.id, "create", "department", department.id)
    db.commit()
    db.refresh(department)
    return _to_department_out(db, department)


@router.patch("/{department_id}", response_model=DepartmentOut)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> DepartmentOut:
    locale = get_locale(request)
    department = db.get(Department, department_id)
    if department is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("department_not_found", locale))

    if payload.name is not None:
        department.name = payload.name

    if payload.department_type is not None:
        department.department_type = payload.department_type

    if payload.parent_department_id is not None:
        if payload.parent_department_id == department_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("department_invalid_parent", locale))
        if db.get(Department, payload.parent_department_id) is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("department_not_found", locale))
        department.parent_department_id = payload.parent_department_id

    log_action(db, current_user.id, "update", "department", department.id)
    db.commit()
    db.refresh(department)
    return _to_department_out(db, department)


@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_department(
    department_id: int,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> None:
    locale = get_locale(request)
    department = db.get(Department, department_id)
    if department is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("department_not_found", locale))

    has_children = db.scalar(select(Department).where(Department.parent_department_id == department_id)) is not None
    has_positions = db.scalar(select(Position).where(Position.department_id == department_id)) is not None
    has_users = db.scalar(select(User).where(User.department_id == department_id)) is not None
    if has_children or has_positions or has_users:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=t("department_in_use", locale))

    log_action(db, current_user.id, "delete", "department", department.id)
    db.delete(department)
    db.commit()


@router.post("/{department_id}/positions", response_model=PositionOut, status_code=status.HTTP_201_CREATED)
def create_position(
    department_id: int,
    payload: PositionCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("super_admin", "admin")),
) -> PositionOut:
    locale = get_locale(request)
    if db.get(Department, department_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=t("department_not_found", locale))

    position = Position(
        department_id=department_id,
        title=payload.title,
        bonus_fund=payload.bonus_fund,
        minimal_score=payload.minimal_score,
    )
    db.add(position)
    db.flush()
    log_action(db, current_user.id, "create", "position", position.id)
    db.commit()
    db.refresh(position)
    return PositionOut.model_validate(position)
