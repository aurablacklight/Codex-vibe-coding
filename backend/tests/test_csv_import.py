import io
import pytest


def make_csv(content: str) -> dict:
    return {"file": ("transactions.csv", io.BytesIO(content.encode()), "text/csv")}


# --- Preview ---

def test_preview_csv(client, auth_headers):
    csv_content = "Date,Description,Amount\n2025-03-01,Grocery Store,-50.00\n2025-03-02,Gas Station,-30.00"
    r = client.post("/api/transactions/import/preview",
                    files=make_csv(csv_content),
                    headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert "headers" in data
    assert "preview_rows" in data
    assert "Date" in data["headers"]
    assert "Description" in data["headers"]
    assert "Amount" in data["headers"]
    assert len(data["preview_rows"]) == 2


def test_preview_csv_returns_max_5_rows(client, auth_headers):
    rows = "\n".join(f"2025-03-{i:02d},Payee {i},-{i}.00" for i in range(1, 11))
    csv_content = f"Date,Description,Amount\n{rows}"
    r = client.post("/api/transactions/import/preview",
                    files=make_csv(csv_content),
                    headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()["preview_rows"]) <= 5


def test_preview_csv_no_auth_needed(client):
    # Preview endpoint is public — no auth required by design
    csv_content = "Date,Description,Amount\n2025-03-01,Test,-10.00"
    r = client.post("/api/transactions/import/preview", files=make_csv(csv_content))
    assert r.status_code == 200


# --- Import ---

def test_import_csv_basic(client, auth_headers, test_account):
    csv_content = "Date,Description,Amount\n2025-03-01,Grocery Store,-50.00\n2025-03-02,Gas Station,-30.00"
    column_mapping = '{"date": "Date", "payee": "Description", "amount": "Amount"}'

    r = client.post("/api/transactions/import",
                    data={
                        "account_id": test_account["id"],
                        "column_mapping": column_mapping,
                    },
                    files=make_csv(csv_content),
                    headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["imported"] == 2
    assert data["total_parsed"] == 2


def test_import_csv_transactions_created(client, auth_headers, test_account):
    csv_content = "date,payee,amount\n2025-03-15,Test Import,-99.99"
    column_mapping = '{"date": "date", "payee": "payee", "amount": "amount"}'

    client.post("/api/transactions/import",
                data={"account_id": test_account["id"], "column_mapping": column_mapping},
                files=make_csv(csv_content),
                headers=auth_headers)

    r = client.get("/api/transactions", headers=auth_headers)
    payees = [t["payee"] for t in r.json()]
    assert "Test Import" in payees


def test_import_csv_multiple_date_formats(client, auth_headers, test_account):
    column_mapping = '{"date": "Date", "payee": "Payee", "amount": "Amount"}'

    for date_str in ["2025-03-15", "03/15/2025", "03/15/25", "15/03/2025"]:
        csv_content = f"Date,Payee,Amount\n{date_str},Test,-10.00"
        r = client.post("/api/transactions/import",
                        data={"account_id": test_account["id"], "column_mapping": column_mapping},
                        files=make_csv(csv_content),
                        headers=auth_headers)
        assert r.status_code == 200, f"Failed for date format: {date_str}"
        assert r.json()["imported"] == 1


def test_import_csv_dollar_sign_in_amount(client, auth_headers, test_account):
    csv_content = "Date,Payee,Amount\n2025-03-01,Store,$-45.99"
    column_mapping = '{"date": "Date", "payee": "Payee", "amount": "Amount"}'

    r = client.post("/api/transactions/import",
                    data={"account_id": test_account["id"], "column_mapping": column_mapping},
                    files=make_csv(csv_content),
                    headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["imported"] == 1

    txns = client.get("/api/transactions", headers=auth_headers).json()
    store_txn = next(t for t in txns if t["payee"] == "Store")
    assert store_txn["amount"] == -45.99


def test_import_csv_with_notes_column(client, auth_headers, test_account):
    csv_content = "Date,Payee,Amount,Note\n2025-03-01,Store,-20.00,Personal note"
    column_mapping = '{"date": "Date", "payee": "Payee", "amount": "Amount", "notes": "Note"}'

    r = client.post("/api/transactions/import",
                    data={"account_id": test_account["id"], "column_mapping": column_mapping},
                    files=make_csv(csv_content),
                    headers=auth_headers)
    assert r.status_code == 200

    txns = client.get("/api/transactions", headers=auth_headers).json()
    store_txn = next(t for t in txns if t["payee"] == "Store")
    assert store_txn["notes"] == "Personal note"


def test_import_csv_unauthenticated(client, test_account):
    csv_content = "Date,Payee,Amount\n2025-03-01,Test,-10.00"
    column_mapping = '{"date": "Date", "payee": "Payee", "amount": "Amount"}'
    r = client.post("/api/transactions/import",
                    data={"account_id": test_account["id"], "column_mapping": column_mapping},
                    files=make_csv(csv_content))
    assert r.status_code == 401


def test_import_csv_invalid_account(client, auth_headers):
    csv_content = "Date,Payee,Amount\n2025-03-01,Test,-10.00"
    column_mapping = '{"date": "Date", "payee": "Payee", "amount": "Amount"}'
    r = client.post("/api/transactions/import",
                    data={"account_id": 99999, "column_mapping": column_mapping},
                    files=make_csv(csv_content),
                    headers=auth_headers)
    assert r.status_code == 404
