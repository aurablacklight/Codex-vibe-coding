from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date
from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.category import Category
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("", response_model=List[TransactionResponse])
def list_transactions(
    account_id: Optional[int] = None,
    category_id: Optional[int] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    limit: int = Query(default=100, le=1000),
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction).filter(
        Transaction.user_id == current_user.id,
    )

    if account_id:
        query = query.filter(Transaction.account_id == account_id)
    if category_id:
        query = query.filter(Transaction.category_id == category_id)
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    if search:
        query = query.filter(Transaction.payee.ilike(f"%{search}%"))

    transactions = query.order_by(Transaction.date.desc(), Transaction.id.desc()).offset(offset).limit(limit).all()

    result = []
    for txn in transactions:
        resp = TransactionResponse.model_validate(txn)
        if txn.account:
            resp.account_name = txn.account.name
        if txn.category:
            resp.category_name = txn.category.name
        result.append(resp)

    return result


@router.post("", response_model=TransactionResponse)
def create_transaction(
    data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(
        Account.id == data.account_id,
        Account.user_id == current_user.id,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    txn = Transaction(user_id=current_user.id, **data.model_dump())
    db.add(txn)
    db.commit()
    db.refresh(txn)

    resp = TransactionResponse.model_validate(txn)
    if txn.account:
        resp.account_name = txn.account.name
    if txn.category:
        resp.category_name = txn.category.name
    return resp


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    data: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(txn, key, value)

    db.commit()
    db.refresh(txn)

    resp = TransactionResponse.model_validate(txn)
    if txn.account:
        resp.account_name = txn.account.name
    if txn.category:
        resp.category_name = txn.category.name
    return resp


@router.delete("/{transaction_id}")
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    txn = db.query(Transaction).filter(
        Transaction.id == transaction_id,
        Transaction.user_id == current_user.id,
    ).first()
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    db.delete(txn)
    db.commit()
    return {"message": "Transaction deleted"}
