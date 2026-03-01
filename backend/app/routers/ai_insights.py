"""AI-powered financial analysis via Ollama (OpenAI-compatible API).

Talks to any OpenAI-compatible endpoint — Ollama, LocalAI, vLLM, LM Studio, etc.
Uses the /v1/chat/completions spec so it's fully portable.
"""
import json
import urllib.request
import urllib.error
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case as sa_case
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.models.transaction import Transaction
from app.models.account import Account
from app.models.category import Category
from app.models.budget import Budget
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["ai"])


# --- Schemas ---

class AskRequest(BaseModel):
    question: str
    months: int = 3


class AnalysisResponse(BaseModel):
    analysis: str
    model: str
    data_summary: dict


# --- Helpers ---

def _gather_financial_context(db: Session, user_id: int, months: int = 3) -> dict:
    """Pull together the user's financial data for the LLM prompt."""
    today = date.today()
    start = today.replace(day=1) - timedelta(days=30 * (months - 1))
    start = start.replace(day=1)

    # Accounts
    accounts = db.query(Account).filter(
        Account.user_id == user_id, Account.is_active == True
    ).all()
    account_data = []
    for acc in accounts:
        bal = db.query(func.coalesce(func.sum(Transaction.amount), 0)).filter(
            Transaction.account_id == acc.id
        ).scalar()
        account_data.append({
            "name": acc.name, "type": acc.type,
            "balance": round(float(bal), 2), "currency": acc.currency,
        })

    # Monthly income vs expense
    monthly_rows = db.query(
        func.strftime("%Y-%m", Transaction.date).label("month"),
        func.sum(sa_case((Transaction.amount > 0, Transaction.amount), else_=0)).label("income"),
        func.sum(sa_case((Transaction.amount < 0, Transaction.amount), else_=0)).label("expense"),
    ).filter(
        Transaction.user_id == user_id,
        Transaction.date >= start,
    ).group_by(func.strftime("%Y-%m", Transaction.date)).order_by("month").all()

    monthly_data = [{
        "month": r.month,
        "income": round(float(r.income), 2),
        "expense": round(abs(float(r.expense)), 2),
    } for r in monthly_rows]

    # Spending by category
    cat_rows = db.query(
        Category.name,
        func.sum(Transaction.amount).label("total"),
    ).join(Transaction, Transaction.category_id == Category.id).filter(
        Transaction.user_id == user_id,
        Transaction.date >= start,
        Transaction.amount < 0,
    ).group_by(Category.id).order_by(func.sum(Transaction.amount)).all()

    category_spending = [{
        "category": r.name,
        "total_spent": round(abs(float(r.total)), 2),
    } for r in cat_rows]

    # Top payees
    payee_rows = db.query(
        Transaction.payee,
        func.sum(Transaction.amount).label("total"),
        func.count(Transaction.id).label("count"),
    ).filter(
        Transaction.user_id == user_id,
        Transaction.date >= start,
        Transaction.amount < 0,
    ).group_by(Transaction.payee).order_by(func.sum(Transaction.amount)).limit(10).all()

    top_payees = [{
        "payee": r.payee,
        "total_spent": round(abs(float(r.total)), 2),
        "transaction_count": r.count,
    } for r in payee_rows]

    # Current month budgets
    current_month = today.strftime("%Y-%m")
    budget_rows = db.query(Budget, Category.name).join(
        Category, Budget.category_id == Category.id
    ).filter(
        Budget.user_id == user_id,
        Budget.month == current_month,
    ).all()

    budget_data = []
    for b, cat_name in budget_rows:
        spent = abs(float(db.query(
            func.coalesce(func.sum(Transaction.amount), 0)
        ).filter(
            Transaction.user_id == user_id,
            Transaction.category_id == b.category_id,
            Transaction.date >= f"{current_month}-01",
            Transaction.amount < 0,
        ).scalar()))
        budget_data.append({
            "category": cat_name,
            "budgeted": b.assigned,
            "spent": round(spent, 2),
            "remaining": round(b.assigned - spent, 2),
        })

    # Net worth trend
    nw_rows = db.query(
        func.strftime("%Y-%m", Transaction.date).label("month"),
        func.sum(Transaction.amount).label("net_change"),
    ).filter(
        Transaction.user_id == user_id,
    ).group_by(func.strftime("%Y-%m", Transaction.date)).order_by("month").all()

    running = 0.0
    net_worth_trend = []
    for r in nw_rows:
        running += float(r.net_change)
        net_worth_trend.append({"month": r.month, "net_worth": round(running, 2)})

    total_balance = sum(a["balance"] for a in account_data)

    return {
        "date_range": f"{start.isoformat()} to {today.isoformat()}",
        "total_balance": round(total_balance, 2),
        "accounts": account_data,
        "monthly_income_expense": monthly_data,
        "spending_by_category": category_spending,
        "top_payees": top_payees,
        "current_month_budgets": budget_data,
        "net_worth_trend": net_worth_trend,
    }


def _call_ollama(messages: list[dict], stream: bool = False) -> dict | bytes:
    """Call Ollama's OpenAI-compatible chat completions endpoint."""
    url = f"{settings.OLLAMA_BASE_URL}/v1/chat/completions"
    payload = json.dumps({
        "model": settings.OLLAMA_MODEL,
        "messages": messages,
        "temperature": 0.4,
        "stream": stream,
    }).encode()

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        resp = urllib.request.urlopen(req, timeout=settings.AI_REQUEST_TIMEOUT)
        if stream:
            return resp
        data = json.loads(resp.read().decode())
        return data
    except urllib.error.URLError as e:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot reach Ollama at {settings.OLLAMA_BASE_URL}. "
                   f"Make sure Ollama is running. Error: {str(e.reason)}"
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ollama request failed: {str(e)}")


SYSTEM_PROMPT = """You are BudgetBolt AI, a personal finance analyst built into a self-hosted budgeting app.
You analyze the user's real financial data and provide actionable insights.

Guidelines:
- Be specific with numbers — reference actual amounts, categories, and trends from the data
- Format currency as $X,XXX.XX
- Use markdown formatting for readability (headers, bullet points, bold)
- Be concise but thorough
- When forecasting, clearly state your assumptions
- If the data is limited, acknowledge that and adjust confidence accordingly
- Never make up data — only reference what's provided
- Be encouraging but honest about areas for improvement"""


# --- Endpoints ---

@router.get("/status")
def ai_status():
    """Check if AI is enabled and Ollama is reachable."""
    if not settings.AI_ENABLED:
        return {"enabled": False, "status": "disabled", "model": None}

    try:
        url = f"{settings.OLLAMA_BASE_URL}/v1/models"
        req = urllib.request.Request(url, method="GET")
        resp = urllib.request.urlopen(req, timeout=5)
        models_data = json.loads(resp.read().decode())
        available_models = [m.get("id", m.get("name", "")) for m in models_data.get("data", [])]
        return {
            "enabled": True,
            "status": "connected",
            "base_url": settings.OLLAMA_BASE_URL,
            "model": settings.OLLAMA_MODEL,
            "available_models": available_models,
        }
    except Exception as e:
        return {
            "enabled": True,
            "status": "unreachable",
            "base_url": settings.OLLAMA_BASE_URL,
            "model": settings.OLLAMA_MODEL,
            "error": str(e),
        }


@router.post("/analyze", response_model=AnalysisResponse)
def analyze_finances(
    months: int = Query(default=3, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Full financial analysis: spending patterns, budget adherence, and recommendations."""
    if not settings.AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI analysis is disabled")

    ctx = _gather_financial_context(db, current_user.id, months)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"""Analyze my financial data from the last {months} months and provide a comprehensive report.

Include these sections:
1. **Overview** — Net worth, total balance, overall financial health
2. **Spending Analysis** — Where my money is going, biggest categories, notable patterns
3. **Budget Review** — How well I'm sticking to my budgets, categories over/under budget
4. **Anomalies & Alerts** — Unusual spending, sudden changes, areas of concern
5. **Recommendations** — 3-5 specific, actionable suggestions to improve my finances

Here is my financial data:
```json
{json.dumps(ctx, indent=2)}
```"""},
    ]

    result = _call_ollama(messages)
    content = result["choices"][0]["message"]["content"]
    model_used = result.get("model", settings.OLLAMA_MODEL)

    return AnalysisResponse(analysis=content, model=model_used, data_summary=ctx)


@router.post("/forecast", response_model=AnalysisResponse)
def forecast_spending(
    months: int = Query(default=3, le=12),
    forecast_months: int = Query(default=3, le=6),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Forecast future spending and income based on historical patterns."""
    if not settings.AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI analysis is disabled")

    ctx = _gather_financial_context(db, current_user.id, months)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"""Based on my last {months} months of financial data, forecast the next {forecast_months} months.

Provide:
1. **Projected Monthly Spending** — Estimated total spending per month for the next {forecast_months} months
2. **Category Forecasts** — Expected spending for my top categories
3. **Income Projection** — Expected income based on patterns
4. **Net Worth Trajectory** — Where my net worth is heading
5. **Savings Potential** — How much I could save if I optimized spending
6. **Risk Factors** — Things that could derail the forecast (seasonal spending, subscriptions renewing, etc.)

Be specific with numbers. State your assumptions clearly.

My financial data:
```json
{json.dumps(ctx, indent=2)}
```"""},
    ]

    result = _call_ollama(messages)
    content = result["choices"][0]["message"]["content"]
    model_used = result.get("model", settings.OLLAMA_MODEL)

    return AnalysisResponse(analysis=content, model=model_used, data_summary=ctx)


@router.post("/budget-advice", response_model=AnalysisResponse)
def budget_advice(
    months: int = Query(default=3, le=12),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get AI-generated budget optimization advice."""
    if not settings.AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI analysis is disabled")

    ctx = _gather_financial_context(db, current_user.id, months)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"""Review my spending patterns and current budget allocations, then suggest an optimized budget.

Provide:
1. **Current Budget Assessment** — How realistic are my current budget allocations?
2. **Suggested Budget** — A concrete monthly budget with specific dollar amounts for each category
3. **Savings Goals** — Recommended savings targets based on my income
4. **Quick Wins** — Easy changes that could save me money immediately
5. **Long-term Strategy** — Steps to improve financial health over the next 6-12 months

Use actual numbers from my data. Be specific about dollar amounts.

My financial data:
```json
{json.dumps(ctx, indent=2)}
```"""},
    ]

    result = _call_ollama(messages)
    content = result["choices"][0]["message"]["content"]
    model_used = result.get("model", settings.OLLAMA_MODEL)

    return AnalysisResponse(analysis=content, model=model_used, data_summary=ctx)


@router.post("/ask", response_model=AnalysisResponse)
def ask_question(
    body: AskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Ask any financial question about your data."""
    if not settings.AI_ENABLED:
        raise HTTPException(status_code=503, detail="AI analysis is disabled")

    ctx = _gather_financial_context(db, current_user.id, body.months)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"""Answer this question about my finances: {body.question}

Use the following financial data to inform your answer:
```json
{json.dumps(ctx, indent=2)}
```"""},
    ]

    result = _call_ollama(messages)
    content = result["choices"][0]["message"]["content"]
    model_used = result.get("model", settings.OLLAMA_MODEL)

    return AnalysisResponse(analysis=content, model=model_used, data_summary=ctx)
