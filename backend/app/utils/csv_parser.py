import csv
import io
from datetime import datetime


def parse_csv(file_content: str, column_mapping: dict) -> list[dict]:
    """Parse CSV content and map columns to transaction fields.

    column_mapping should look like:
    {
        "date": "Date",           # CSV column name for date
        "payee": "Description",   # CSV column name for payee
        "amount": "Amount",       # CSV column name for amount
        "notes": "Memo",          # Optional
    }
    """
    reader = csv.DictReader(io.StringIO(file_content))
    transactions = []

    for row in reader:
        try:
            date_str = row.get(column_mapping.get("date", ""), "").strip()
            payee = row.get(column_mapping.get("payee", ""), "").strip()
            amount_str = row.get(column_mapping.get("amount", ""), "0").strip()
            notes = row.get(column_mapping.get("notes", ""), "").strip()

            # Try common date formats
            parsed_date = None
            for fmt in ["%Y-%m-%d", "%m/%d/%Y", "%m/%d/%y", "%d/%m/%Y", "%Y/%m/%d"]:
                try:
                    parsed_date = datetime.strptime(date_str, fmt).date()
                    break
                except ValueError:
                    continue

            if not parsed_date or not payee:
                continue

            # Clean amount: remove currency symbols, commas
            amount_str = amount_str.replace("$", "").replace(",", "").replace(" ", "")
            amount = float(amount_str)

            transactions.append({
                "date": parsed_date,
                "payee": payee,
                "amount": amount,
                "notes": notes,
            })
        except (ValueError, KeyError):
            continue

    return transactions
