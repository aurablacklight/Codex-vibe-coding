import pytest


# --- Create ---

def test_create_transaction(client, auth_headers, test_account):
    r = client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "date": "2025-03-15",
        "payee": "Grocery Store",
        "amount": -75.50,
        "notes": "Weekly shopping",
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["payee"] == "Grocery Store"
    assert data["amount"] == -75.50
    assert data["account_id"] == test_account["id"]
    assert data["account_name"] == "Test Checking"


def test_create_transaction_with_category(client, auth_headers, test_account, test_category):
    r = client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "category_id": test_category["id"],
        "date": "2025-03-15",
        "payee": "Starbucks",
        "amount": -5.75,
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["category_id"] == test_category["id"]
    assert data["category_name"] == "Test Expense"


def test_create_transaction_invalid_account(client, auth_headers):
    r = client.post("/api/transactions", json={
        "account_id": 99999,
        "date": "2025-03-15",
        "payee": "Test",
        "amount": -10.0,
    }, headers=auth_headers)
    assert r.status_code == 404


def test_create_transaction_other_users_account(client, auth_headers, second_user_headers):
    r = client.post("/api/accounts", json={"name": "Other Account", "type": "checking"},
                    headers=second_user_headers)
    other_account_id = r.json()["id"]

    r2 = client.post("/api/transactions", json={
        "account_id": other_account_id,
        "date": "2025-03-15",
        "payee": "Hack",
        "amount": -10.0,
    }, headers=auth_headers)
    assert r2.status_code == 404


def test_create_transaction_unauthenticated(client, test_account):
    r = client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "date": "2025-03-15",
        "payee": "Test",
        "amount": -10.0,
    })
    assert r.status_code == 401


# --- List ---

def test_list_transactions(client, auth_headers, test_transaction):
    r = client.get("/api/transactions", headers=auth_headers)
    assert r.status_code == 200
    txns = r.json()
    assert len(txns) >= 1
    assert any(t["id"] == test_transaction["id"] for t in txns)


def test_list_transactions_filter_by_account(client, auth_headers, test_account, test_transaction):
    # Create second account with its own transaction
    r2 = client.post("/api/accounts", json={"name": "Other", "type": "savings"},
                     headers=auth_headers)
    other_id = r2.json()["id"]
    client.post("/api/transactions", json={
        "account_id": other_id,
        "date": "2025-03-01",
        "payee": "Other Payee",
        "amount": -20.0,
    }, headers=auth_headers)

    r = client.get(f"/api/transactions?account_id={test_account['id']}", headers=auth_headers)
    txns = r.json()
    assert all(t["account_id"] == test_account["id"] for t in txns)


def test_list_transactions_filter_by_date_range(client, auth_headers, test_account):
    client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "date": "2025-01-10",
        "payee": "January",
        "amount": -10.0,
    }, headers=auth_headers)
    client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "date": "2025-06-10",
        "payee": "June",
        "amount": -20.0,
    }, headers=auth_headers)

    r = client.get("/api/transactions?start_date=2025-01-01&end_date=2025-03-31", headers=auth_headers)
    payees = [t["payee"] for t in r.json()]
    assert "January" in payees
    assert "June" not in payees


def test_list_transactions_filter_by_search(client, auth_headers, test_account):
    client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "date": "2025-03-01",
        "payee": "Starbucks Coffee",
        "amount": -5.0,
    }, headers=auth_headers)
    client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "date": "2025-03-02",
        "payee": "Shell Gas",
        "amount": -40.0,
    }, headers=auth_headers)

    r = client.get("/api/transactions?search=starbucks", headers=auth_headers)
    payees = [t["payee"] for t in r.json()]
    assert "Starbucks Coffee" in payees
    assert "Shell Gas" not in payees


def test_list_transactions_ordered_by_date_desc(client, auth_headers, test_account):
    for day in [5, 1, 10, 3]:
        client.post("/api/transactions", json={
            "account_id": test_account["id"],
            "date": f"2025-03-{day:02d}",
            "payee": f"Payee {day}",
            "amount": -10.0,
        }, headers=auth_headers)

    r = client.get("/api/transactions", headers=auth_headers)
    dates = [t["date"] for t in r.json()]
    assert dates == sorted(dates, reverse=True)


def test_transactions_isolated_between_users(client, auth_headers, second_user_headers, test_transaction):
    r = client.get("/api/transactions", headers=second_user_headers)
    ids = [t["id"] for t in r.json()]
    assert test_transaction["id"] not in ids


# --- Update ---

def test_update_transaction(client, auth_headers, test_transaction):
    r = client.put(f"/api/transactions/{test_transaction['id']}", json={
        "payee": "Updated Payee",
        "amount": -99.99,
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["payee"] == "Updated Payee"
    assert data["amount"] == -99.99


def test_update_nonexistent_transaction(client, auth_headers):
    r = client.put("/api/transactions/99999", json={"payee": "Ghost"}, headers=auth_headers)
    assert r.status_code == 404


def test_cannot_update_other_users_transaction(client, auth_headers, second_user_headers, test_transaction):
    r = client.put(f"/api/transactions/{test_transaction['id']}", json={"payee": "Stolen"},
                   headers=second_user_headers)
    assert r.status_code == 404


# --- Delete ---

def test_delete_transaction(client, auth_headers, test_transaction):
    r = client.delete(f"/api/transactions/{test_transaction['id']}", headers=auth_headers)
    assert r.status_code == 200

    r2 = client.get("/api/transactions", headers=auth_headers)
    ids = [t["id"] for t in r2.json()]
    assert test_transaction["id"] not in ids


def test_delete_nonexistent_transaction(client, auth_headers):
    r = client.delete("/api/transactions/99999", headers=auth_headers)
    assert r.status_code == 404


def test_cannot_delete_other_users_transaction(client, auth_headers, second_user_headers, test_transaction):
    r = client.delete(f"/api/transactions/{test_transaction['id']}", headers=second_user_headers)
    assert r.status_code == 404
