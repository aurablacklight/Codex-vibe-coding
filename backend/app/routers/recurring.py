from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.recurring import RecurringTransaction
from app.schemas.recurring import RecurringCreate, RecurringUpdate, RecurringResponse
from app.services.auth import get_current_user
from app.services.recurring import process_recurring_transactions

router = APIRouter(prefix="/api/recurring", tags=["recurring"])


@router.get("", response_model=List[RecurringResponse])
def list_recurring(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    items = db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == current_user.id,
    ).order_by(RecurringTransaction.next_due).all()

    result = []
    for item in items:
        resp = RecurringResponse.model_validate(item)
        if item.account:
            resp.account_name = item.account.name
        if item.category:
            resp.category_name = item.category.name
        result.append(resp)
    return result


@router.post("", response_model=RecurringResponse)
def create_recurring(
    data: RecurringCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = RecurringTransaction(
        user_id=current_user.id,
        next_due=data.start_date,
        **data.model_dump(),
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)

    resp = RecurringResponse.model_validate(rec)
    if rec.account:
        resp.account_name = rec.account.name
    if rec.category:
        resp.category_name = rec.category.name
    return resp


@router.put("/{recurring_id}", response_model=RecurringResponse)
def update_recurring(
    recurring_id: int,
    data: RecurringUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == recurring_id,
        RecurringTransaction.user_id == current_user.id,
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(rec, key, value)

    db.commit()
    db.refresh(rec)

    resp = RecurringResponse.model_validate(rec)
    if rec.account:
        resp.account_name = rec.account.name
    if rec.category:
        resp.category_name = rec.category.name
    return resp


@router.delete("/{recurring_id}")
def delete_recurring(
    recurring_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rec = db.query(RecurringTransaction).filter(
        RecurringTransaction.id == recurring_id,
        RecurringTransaction.user_id == current_user.id,
    ).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recurring transaction not found")

    db.delete(rec)
    db.commit()
    return {"message": "Recurring transaction deleted"}


@router.post("/process")
def process_recurring(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    created = process_recurring_transactions(db, current_user.id)
    return {"created": len(created)}
