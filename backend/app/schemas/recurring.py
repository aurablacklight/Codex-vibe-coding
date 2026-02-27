from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class RecurringCreate(BaseModel):
    account_id: int
    category_id: Optional[int] = None
    payee: str
    amount: float
    frequency: str  # daily, weekly, biweekly, monthly, yearly
    start_date: date
    end_date: Optional[date] = None


class RecurringUpdate(BaseModel):
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    payee: Optional[str] = None
    amount: Optional[float] = None
    frequency: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class RecurringResponse(BaseModel):
    id: int
    account_id: int
    category_id: Optional[int] = None
    payee: str
    amount: float
    frequency: str
    start_date: date
    end_date: Optional[date] = None
    next_due: date
    is_active: bool
    created_at: Optional[datetime] = None
    account_name: Optional[str] = None
    category_name: Optional[str] = None

    model_config = {"from_attributes": True}
