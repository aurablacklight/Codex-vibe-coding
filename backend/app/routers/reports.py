from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, case
from typing import Optional
from datetime import date, timedelta
from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.category import Category
from app.models.account import Account
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/spending-by-category")
def spending_by_category(
    start: Optional[date] = None,
    end: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not start:
        start = date.today().replace(day=1)
    if not end:
        end = date.today()

    rows = db.query(
        Category.name,
        Category.color,
        Category.icon,
        func.sum(Transaction.amount).label("total"),
    ).join(Transaction, Transaction.category_id == Category.id).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start,
        Transaction.date <= end,
        Transaction.amount < 0,
    ).group_by(Category.id).all()

    return [
        {
            "category": row.name,
            "color": row.color,
            "icon": row.icon,
            "amount": round(abs(float(row.total)), 2),
        }
        for row in rows
    ]


@router.get("/income-vs-expense")
def income_vs_expense(
    months: int = Query(default=6, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    start = today.replace(day=1) - timedelta(days=30 * (months - 1))
    start = start.replace(day=1)

    rows = db.query(
        func.strftime("%Y-%m", Transaction.date).label("month"),
        func.sum(case((Transaction.amount > 0, Transaction.amount), else_=0)).label("income"),
        func.sum(case((Transaction.amount < 0, Transaction.amount), else_=0)).label("expense"),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start,
    ).group_by(func.strftime("%Y-%m", Transaction.date)).order_by("month").all()

    return [
        {
            "month": row.month,
            "income": round(float(row.income), 2),
            "expense": round(abs(float(row.expense)), 2),
        }
        for row in rows
    ]


@router.get("/net-worth")
def net_worth(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = db.query(
        func.strftime("%Y-%m", Transaction.date).label("month"),
        func.sum(Transaction.amount).label("net_change"),
    ).filter(
        Transaction.user_id == current_user.id,
    ).group_by(func.strftime("%Y-%m", Transaction.date)).order_by("month").all()

    result = []
    running_total = 0.0
    for row in rows:
        running_total += float(row.net_change)
        result.append({
            "month": row.month,
            "net_worth": round(running_total, 2),
        })

    return result


@router.get("/trends")
def spending_trends(
    category_id: Optional[int] = None,
    months: int = Query(default=6, le=24),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    today = date.today()
    start = today.replace(day=1) - timedelta(days=30 * (months - 1))
    start = start.replace(day=1)

    query = db.query(
        func.strftime("%Y-%m", Transaction.date).label("month"),
        func.sum(Transaction.amount).label("total"),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start,
        Transaction.amount < 0,
    )

    if category_id:
        query = query.filter(Transaction.category_id == category_id)

    rows = query.group_by(func.strftime("%Y-%m", Transaction.date)).order_by("month").all()

    return [
        {
            "month": row.month,
            "amount": round(abs(float(row.total)), 2),
        }
        for row in rows
    ]


@router.get("/top-payees")
def top_payees(
    start: Optional[date] = None,
    end: Optional[date] = None,
    limit: int = Query(default=10, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not start:
        start = date.today().replace(day=1)
    if not end:
        end = date.today()

    rows = db.query(
        Transaction.payee,
        func.sum(Transaction.amount).label("total"),
        func.count(Transaction.id).label("count"),
    ).filter(
        Transaction.user_id == current_user.id,
        Transaction.date >= start,
        Transaction.date <= end,
        Transaction.amount < 0,
    ).group_by(Transaction.payee).order_by(func.sum(Transaction.amount)).limit(limit).all()

    return [
        {
            "payee": row.payee,
            "amount": round(abs(float(row.total)), 2),
            "count": row.count,
        }
        for row in rows
    ]
