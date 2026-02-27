from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
import json
from app.database import get_db
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionResponse
from app.services.auth import get_current_user
from app.utils.csv_parser import parse_csv

router = APIRouter(prefix="/api/transactions", tags=["import"])


@router.post("/import")
async def import_csv(
    file: UploadFile = File(...),
    account_id: int = Form(...),
    column_mapping: str = Form(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.query(Account).filter(
        Account.id == account_id,
        Account.user_id == current_user.id,
    ).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    try:
        mapping = json.loads(column_mapping)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid column mapping JSON")

    parsed = parse_csv(text, mapping)

    created = 0
    for item in parsed:
        txn = Transaction(
            user_id=current_user.id,
            account_id=account_id,
            date=item["date"],
            payee=item["payee"],
            amount=item["amount"],
            notes=item.get("notes", ""),
        )
        db.add(txn)
        created += 1

    db.commit()
    return {"imported": created, "total_parsed": len(parsed)}


@router.post("/import/preview")
async def preview_csv(
    file: UploadFile = File(...),
):
    content = await file.read()
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    import csv
    import io
    reader = csv.reader(io.StringIO(text))
    headers = next(reader, [])
    rows = []
    for i, row in enumerate(reader):
        if i >= 5:
            break
        rows.append(row)

    return {"headers": headers, "preview_rows": rows}
