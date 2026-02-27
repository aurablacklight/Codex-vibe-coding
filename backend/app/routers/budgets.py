from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models.user import User
from app.models.budget import Budget
from app.models.transaction import Transaction
from app.models.category import Category
from app.schemas.budget import BudgetCreate, BudgetUpdate, BudgetResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("/{month}", response_model=List[BudgetResponse])
def get_budgets_for_month(
    month: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budgets = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.month == month,
    ).all()

    # Calculate spent per category for the month
    year, mo = month.split("-")
    start_date = f"{year}-{mo}-01"
    if int(mo) == 12:
        end_date = f"{int(year)+1}-01-01"
    else:
        end_date = f"{year}-{int(mo)+1:02d}-01"

    spent_query = db.query(
        Transaction.category_id,
        func.coalesce(func.sum(Transaction.amount), 0).label("spent"),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start_date,
        Transaction.date < end_date,
        Transaction.amount < 0,
    ).group_by(Transaction.category_id).all()

    spent_map = {row.category_id: abs(float(row.spent)) for row in spent_query}

    result = []
    for b in budgets:
        cat = db.query(Category).filter(Category.id == b.category_id).first()
        spent = spent_map.get(b.category_id, 0.0)
        result.append(BudgetResponse(
            id=b.id,
            category_id=b.category_id,
            month=b.month,
            assigned=b.assigned,
            spent=round(spent, 2),
            remaining=round(b.assigned - spent, 2),
            category_name=cat.name if cat else None,
            category_color=cat.color if cat else None,
            category_icon=cat.icon if cat else None,
            created_at=b.created_at,
        ))

    return result


@router.post("", response_model=BudgetResponse)
def create_or_update_budget(
    data: BudgetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing = db.query(Budget).filter(
        Budget.user_id == current_user.id,
        Budget.category_id == data.category_id,
        Budget.month == data.month,
    ).first()

    if existing:
        existing.assigned = data.assigned
        db.commit()
        db.refresh(existing)
        budget = existing
    else:
        budget = Budget(user_id=current_user.id, **data.model_dump())
        db.add(budget)
        db.commit()
        db.refresh(budget)

    cat = db.query(Category).filter(Category.id == budget.category_id).first()
    return BudgetResponse(
        id=budget.id,
        category_id=budget.category_id,
        month=budget.month,
        assigned=budget.assigned,
        spent=0.0,
        remaining=budget.assigned,
        category_name=cat.name if cat else None,
        category_color=cat.color if cat else None,
        category_icon=cat.icon if cat else None,
        created_at=budget.created_at,
    )


@router.put("/{budget_id}", response_model=BudgetResponse)
def update_budget(
    budget_id: int,
    data: BudgetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    budget = db.query(Budget).filter(
        Budget.id == budget_id,
        Budget.user_id == current_user.id,
    ).first()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    if data.assigned is not None:
        budget.assigned = data.assigned

    db.commit()
    db.refresh(budget)

    cat = db.query(Category).filter(Category.id == budget.category_id).first()
    return BudgetResponse(
        id=budget.id,
        category_id=budget.category_id,
        month=budget.month,
        assigned=budget.assigned,
        spent=0.0,
        remaining=budget.assigned,
        category_name=cat.name if cat else None,
        category_color=cat.color if cat else None,
        category_icon=cat.icon if cat else None,
        created_at=budget.created_at,
    )
