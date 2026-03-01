import pytest
from datetime import date


MONTH = "2025-03"


# --- Create / Upsert ---

def test_create_budget(client, auth_headers, test_category):
    r = client.post("/api/budgets", json={
        "category_id": test_category["id"],
        "month": MONTH,
        "assigned": 500.0,
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["assigned"] == 500.0
    assert data["month"] == MONTH
    assert data["category_id"] == test_category["id"]
    assert data["category_name"] == "Test Expense"
    assert data["spent"] == 0.0
    assert data["remaining"] == 500.0


def test_upsert_budget_updates_existing(client, auth_headers, test_category):
    client.post("/api/budgets", json={
        "category_id": test_category["id"],
        "month": MONTH,
        "assigned": 500.0,
    }, headers=auth_headers)

    # POST again — should update, not create duplicate
    r = client.post("/api/budgets", json={
        "category_id": test_category["id"],
        "month": MONTH,
        "assigned": 750.0,
    }, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["assigned"] == 750.0

    # Verify only one budget exists for this category/month
    r2 = client.get(f"/api/budgets/{MONTH}", headers=auth_headers)
    budgets = [b for b in r2.json() if b["category_id"] == test_category["id"]]
    assert len(budgets) == 1


def test_create_budget_unauthenticated(client, test_category):
    r = client.post("/api/budgets", json={
        "category_id": test_category["id"],
        "month": MONTH,
        "assigned": 100.0,
    })
    assert r.status_code == 401


# --- Get for month ---

def test_get_budgets_for_month(client, auth_headers, test_category):
    client.post("/api/budgets", json={
        "category_id": test_category["id"],
        "month": MONTH,
        "assigned": 300.0,
    }, headers=auth_headers)

    r = client.get(f"/api/budgets/{MONTH}", headers=auth_headers)
    assert r.status_code == 200
    budgets = r.json()
    assert len(budgets) == 1
    assert budgets[0]["assigned"] == 300.0


def test_get_budgets_empty_month(client, auth_headers):
    r = client.get("/api/budgets/2020-01", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_budgets_isolated_between_months(client, auth_headers, test_category):
    client.post("/api/budgets", json={
        "category_id": test_category["id"],
        "month": "2025-01",
        "assigned": 100.0,
    }, headers=auth_headers)

    r = client.get("/api/budgets/2025-02", headers=auth_headers)
    assert r.json() == []


# --- Spent calculation ---

def test_budget_spent_calculation(client, auth_headers, test_account, test_category):
    client.post("/api/budgets", json={
        "category_id": test_category["id"],
        "month": MONTH,
        "assigned": 200.0,
    }, headers=auth_headers)

    # Add expenses in the month
    client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "category_id": test_category["id"],
        "date": "2025-03-10",
        "payee": "Store A",
        "amount": -60.0,
    }, headers=auth_headers)
    client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "category_id": test_category["id"],
        "date": "2025-03-20",
        "payee": "Store B",
        "amount": -40.0,
    }, headers=auth_headers)

    r = client.get(f"/api/budgets/{MONTH}", headers=auth_headers)
    budget = r.json()[0]
    assert budget["spent"] == 100.0
    assert budget["remaining"] == 100.0


def test_budget_income_not_counted_as_spent(client, auth_headers, test_account, test_category):
    client.post("/api/budgets", json={
        "category_id": test_category["id"],
        "month": MONTH,
        "assigned": 200.0,
    }, headers=auth_headers)

    # Positive transaction (income) should not affect spent
    client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "category_id": test_category["id"],
        "date": "2025-03-01",
        "payee": "Refund",
        "amount": 50.0,
    }, headers=auth_headers)

    r = client.get(f"/api/budgets/{MONTH}", headers=auth_headers)
    budget = r.json()[0]
    assert budget["spent"] == 0.0


def test_budget_only_counts_transactions_in_month(client, auth_headers, test_account, test_category):
    client.post("/api/budgets", json={
        "category_id": test_category["id"],
        "month": MONTH,
        "assigned": 200.0,
    }, headers=auth_headers)

    # Transaction in different month — should not count
    client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "category_id": test_category["id"],
        "date": "2025-02-15",
        "payee": "Last Month",
        "amount": -100.0,
    }, headers=auth_headers)

    r = client.get(f"/api/budgets/{MONTH}", headers=auth_headers)
    assert r.json()[0]["spent"] == 0.0


# --- Update ---

def test_update_budget(client, auth_headers, test_category):
    r = client.post("/api/budgets", json={
        "category_id": test_category["id"],
        "month": MONTH,
        "assigned": 100.0,
    }, headers=auth_headers)
    budget_id = r.json()["id"]

    r2 = client.put(f"/api/budgets/{budget_id}", json={"assigned": 250.0}, headers=auth_headers)
    assert r2.status_code == 200
    assert r2.json()["assigned"] == 250.0


def test_update_nonexistent_budget(client, auth_headers):
    r = client.put("/api/budgets/99999", json={"assigned": 100.0}, headers=auth_headers)
    assert r.status_code == 404


def test_budgets_isolated_between_users(client, auth_headers, second_user_headers, test_category):
    client.post("/api/budgets", json={
        "category_id": test_category["id"],
        "month": MONTH,
        "assigned": 100.0,
    }, headers=auth_headers)

    r = client.get(f"/api/budgets/{MONTH}", headers=second_user_headers)
    assert r.json() == []
