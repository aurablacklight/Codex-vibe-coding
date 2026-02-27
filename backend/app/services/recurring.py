from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session
from app.models.recurring import RecurringTransaction
from app.models.transaction import Transaction


def calculate_next_due(current_due: date, frequency: str) -> date:
    if frequency == "daily":
        return current_due + timedelta(days=1)
    elif frequency == "weekly":
        return current_due + timedelta(weeks=1)
    elif frequency == "biweekly":
        return current_due + timedelta(weeks=2)
    elif frequency == "monthly":
        return current_due + relativedelta(months=1)
    elif frequency == "yearly":
        return current_due + relativedelta(years=1)
    return current_due + relativedelta(months=1)


def process_recurring_transactions(db: Session, user_id: int) -> list[Transaction]:
    today = date.today()
    recurring = db.query(RecurringTransaction).filter(
        RecurringTransaction.user_id == user_id,
        RecurringTransaction.is_active == True,
        RecurringTransaction.next_due <= today,
    ).all()

    created = []
    for rec in recurring:
        if rec.end_date and rec.next_due > rec.end_date:
            rec.is_active = False
            continue

        txn = Transaction(
            user_id=user_id,
            account_id=rec.account_id,
            category_id=rec.category_id,
            date=rec.next_due,
            payee=rec.payee,
            amount=rec.amount,
            notes=f"Auto-generated from recurring: {rec.payee}",
            recurring_id=rec.id,
        )
        db.add(txn)
        created.append(txn)

        rec.next_due = calculate_next_due(rec.next_due, rec.frequency)

    if created:
        db.commit()
    return created
