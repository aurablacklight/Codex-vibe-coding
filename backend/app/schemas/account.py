from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class AccountCreate(BaseModel):
    name: str
    type: str  # checking, savings, credit_card, cash, investment
    balance: float = 0.0
    currency: str = "USD"


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    balance: Optional[float] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None


class AccountResponse(BaseModel):
    id: int
    name: str
    type: str
    balance: float
    currency: str
    is_active: bool
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
