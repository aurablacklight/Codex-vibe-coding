import pytest
from datetime import date, timedelta


# --- Create ---

def test_create_recurring(client, auth_headers, test_account, test_category):
    r = client.post("/api/recurring", json={
        "account_id": test_account["id"],
        "category_id": test_category["id"],
        "payee": "Netflix",
        "amount": -15.99,
        "frequency": "monthly",
        "start_date": "2025-01-01",
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["payee"] == "Netflix"
    assert data["amount"] == -15.99
    assert data["frequency"] == "monthly"
    assert data["is_active"] is True
    assert data["next_due"] == "2025-01-01"
    assert data["account_name"] == "Test Checking"
    assert data["category_name"] == "Test Expense"


@pytest.mark.parametrize("frequency", ["daily", "weekly", "biweekly", "monthly", "yearly"])
def test_create_recurring_all_frequencies(client, auth_headers, test_account, frequency):
    r = client.post("/api/recurring", json={
        "account_id": test_account["id"],
        "payee": "Test",
        "amount": -10.0,
        "frequency": frequency,
        "start_date": "2025-01-01",
    }, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["frequency"] == frequency


def test_create_recurring_with_end_date(client, auth_headers, test_account):
    r = client.post("/api/recurring", json={
        "account_id": test_account["id"],
        "payee": "Limited Sub",
        "amount": -9.99,
        "frequency": "monthly",
        "start_date": "2025-01-01",
        "end_date": "2025-12-31",
    }, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["end_date"] == "2025-12-31"


def test_create_recurring_unauthenticated(client, test_account):
    r = client.post("/api/recurring", json={
        "account_id": test_account["id"],
        "payee": "Test",
        "amount": -10.0,
        "frequency": "monthly",
        "start_date": "2025-01-01",
    })
    assert r.status_code == 401


# --- List ---

def test_list_recurring(client, auth_headers, test_account, test_category):
    client.post("/api/recurring", json={
        "account_id": test_account["id"],
        "payee": "Spotify",
        "amount": -9.99,
        "frequency": "monthly",
        "start_date": "2025-01-01",
    }, headers=auth_headers)

    r = client.get("/api/recurring", headers=auth_headers)
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    assert any(item["payee"] == "Spotify" for item in items)


def test_recurring_isolated_between_users(client, auth_headers, second_user_headers, test_account):
    client.post("/api/recurring", json={
        "account_id": test_account["id"],
        "payee": "Private Sub",
        "amount": -9.99,
        "frequency": "monthly",
        "start_date": "2025-01-01",
    }, headers=auth_headers)

    r = client.get("/api/recurring", headers=second_user_headers)
    payees = [item["payee"] for item in r.json()]
    assert "Private Sub" not in payees


# --- Update ---

def test_update_recurring(client, auth_headers, test_account):
    r = client.post("/api/recurring", json={
        "account_id": test_account["id"],
        "payee": "Old Name",
        "amount": -10.0,
        "frequency": "monthly",
        "start_date": "2025-01-01",
    }, headers=auth_headers)
    rec_id = r.json()["id"]

    r2 = client.put(f"/api/recurring/{rec_id}", json={
        "payee": "New Name",
        "amount": -15.0,
        "is_active": False,
    }, headers=auth_headers)
    assert r2.status_code == 200
    data = r2.json()
    assert data["payee"] == "New Name"
    assert data["amount"] == -15.0
    assert data["is_active"] is False


def test_update_nonexistent_recurring(client, auth_headers):
    r = client.put("/api/recurring/99999", json={"payee": "Ghost"}, headers=auth_headers)
    assert r.status_code == 404


# --- Delete ---

def test_delete_recurring(client, auth_headers, test_account):
    r = client.post("/api/recurring", json={
        "account_id": test_account["id"],
        "payee": "To Delete",
        "amount": -5.0,
        "frequency": "weekly",
        "start_date": "2025-01-01",
    }, headers=auth_headers)
    rec_id = r.json()["id"]

    r2 = client.delete(f"/api/recurring/{rec_id}", headers=auth_headers)
    assert r2.status_code == 200

    r3 = client.get("/api/recurring", headers=auth_headers)
    ids = [item["id"] for item in r3.json()]
    assert rec_id not in ids


def test_delete_nonexistent_recurring(client, auth_headers):
    r = client.delete("/api/recurring/99999", headers=auth_headers)
    assert r.status_code == 404


# --- Process ---

def test_process_recurring_creates_transactions(client, auth_headers, test_account):
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    client.post("/api/recurring", json={
        "account_id": test_account["id"],
        "payee": "Auto Bill",
        "amount": -29.99,
        "frequency": "monthly",
        "start_date": yesterday,
    }, headers=auth_headers)

    r = client.post("/api/recurring/process", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["created"] >= 1

    r2 = client.get("/api/transactions", headers=auth_headers)
    payees = [t["payee"] for t in r2.json()]
    assert "Auto Bill" in payees


def test_process_recurring_future_not_processed(client, auth_headers, test_account):
    future = (date.today() + timedelta(days=10)).isoformat()

    client.post("/api/recurring", json={
        "account_id": test_account["id"],
        "payee": "Future Bill",
        "amount": -10.0,
        "frequency": "monthly",
        "start_date": future,
    }, headers=auth_headers)

    r = client.post("/api/recurring/process", headers=auth_headers)
    assert r.json()["created"] == 0

    r2 = client.get("/api/transactions", headers=auth_headers)
    payees = [t["payee"] for t in r2.json()]
    assert "Future Bill" not in payees


def test_process_recurring_inactive_skipped(client, auth_headers, test_account):
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    r = client.post("/api/recurring", json={
        "account_id": test_account["id"],
        "payee": "Inactive Bill",
        "amount": -5.0,
        "frequency": "monthly",
        "start_date": yesterday,
    }, headers=auth_headers)
    rec_id = r.json()["id"]

    client.put(f"/api/recurring/{rec_id}", json={"is_active": False}, headers=auth_headers)

    r2 = client.post("/api/recurring/process", headers=auth_headers)
    assert r2.json()["created"] == 0


def test_process_recurring_updates_next_due(client, auth_headers, test_account):
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    r = client.post("/api/recurring", json={
        "account_id": test_account["id"],
        "payee": "Monthly Sub",
        "amount": -9.99,
        "frequency": "monthly",
        "start_date": yesterday,
    }, headers=auth_headers)
    rec_id = r.json()["id"]

    client.post("/api/recurring/process", headers=auth_headers)

    r2 = client.get("/api/recurring", headers=auth_headers)
    rec = next(item for item in r2.json() if item["id"] == rec_id)
    assert rec["next_due"] != yesterday  # next_due advanced
