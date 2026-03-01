from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BudgetCreate(BaseModel):
    category_id: int
    month: str  # "YYYY-MM"
    assigned: float


class BudgetUpdate(BaseModel):
    assigned: Optional[float] = None


class BudgetResponse(BaseModel):
    id: int
    category_id: int
    month: str
    assigned: float
    spent: float = 0.0
    remaining: float = 0.0
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
