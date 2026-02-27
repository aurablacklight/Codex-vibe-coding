from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class TransactionCreate(BaseModel):
    account_id: int
    category_id: Optional[int] = None
    date: date
    payee: str
    amount: float
    notes: str = ""
    is_transfer: bool = False
    transfer_account_id: Optional[int] = None


class TransactionUpdate(BaseModel):
    account_id: Optional[int] = None
    category_id: Optional[int] = None
    date: Optional[date] = None
    payee: Optional[str] = None
    amount: Optional[float] = None
    notes: Optional[str] = None
    is_transfer: Optional[bool] = None
    transfer_account_id: Optional[int] = None


class TransactionResponse(BaseModel):
    id: int
    account_id: int
    category_id: Optional[int] = None
    date: date
    payee: str
    amount: float
    notes: str
    is_transfer: bool
    transfer_account_id: Optional[int] = None
    recurring_id: Optional[int] = None
    created_at: Optional[datetime] = None
    account_name: Optional[str] = None
    category_name: Optional[str] = None

    model_config = {"from_attributes": True}
