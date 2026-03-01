from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None
    icon: str = ""
    color: str = "#6366f1"
    is_income: bool = False


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_income: Optional[bool] = None


class CategoryResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int] = None
    icon: str
    color: str
    is_income: bool
    created_at: Optional[datetime] = None
    children: List["CategoryResponse"] = []

    model_config = {"from_attributes": True}
