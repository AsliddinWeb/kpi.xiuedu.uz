from pydantic import BaseModel, ConfigDict, Field

from app.models.department import DepartmentType


class PositionCreate(BaseModel):
    title: str = Field(min_length=1)
    bonus_fund: float | None = Field(default=None, ge=0)
    minimal_score: float | None = Field(default=None, ge=0)


class PositionUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1)
    bonus_fund: float | None = Field(default=None, ge=0)
    minimal_score: float | None = Field(default=None, ge=0)


class PositionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    department_id: int
    title: str
    bonus_fund: float | None
    minimal_score: float | None
    # Set (to the parent department's id) when this row is included in a child
    # department's position list only because it was created on its parent
    # faculty and inherited down - None when the position belongs to the
    # department it's listed under.
    inherited_from_department_id: int | None = None


class DepartmentCreate(BaseModel):
    name: str = Field(min_length=1)
    department_type: DepartmentType = DepartmentType.administrative
    parent_department_id: int | None = None


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    department_type: DepartmentType | None = None
    parent_department_id: int | None = None


class DepartmentOut(BaseModel):
    id: int
    name: str
    department_type: DepartmentType
    parent_department_id: int | None
    positions: list[PositionOut] = []
