import pytest
from datetime import date as dt


def current_month_date(day: int) -> str:
    """Return a date string in the current month for report default range."""
    today = dt.today()
    return today.replace(day=day).isoformat()


@pytest.fixture
def seeded_data(client, auth_headers, test_account, test_category, income_category):
    """Create a consistent set of transactions in the current month for report testing."""
    for payee, amount, day in [
        ("Grocery Store", -80.0, 5),
        ("Grocery Store", -60.0, 15),
        ("Shell Gas", -45.0, 10),
        ("Netflix", -15.99, 1),
    ]:
        client.post("/api/transactions", json={
            "account_id": test_account["id"],
            "category_id": test_category["id"],
            "date": current_month_date(day),
            "payee": payee,
            "amount": amount,
        }, headers=auth_headers)

    client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "category_id": income_category["id"],
        "date": current_month_date(1),
        "payee": "Employer",
        "amount": 3000.0,
    }, headers=auth_headers)


# --- Spending by Category ---

def test_spending_by_category(client, auth_headers, seeded_data):
    r = client.get("/api/reports/spending-by-category", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert len(data) >= 1
    # Should only include expenses (negative amounts)
    assert all(item["amount"] >= 0 for item in data)
    categories = [item["category"] for item in data]
    assert "Test Expense" in categories


def test_spending_by_category_date_filter(client, auth_headers, test_account, test_category):
    client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "category_id": test_category["id"],
        "date": "2025-01-10",
        "payee": "January Expense",
        "amount": -100.0,
    }, headers=auth_headers)
    client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "category_id": test_category["id"],
        "date": "2025-06-10",
        "payee": "June Expense",
        "amount": -200.0,
    }, headers=auth_headers)

    r = client.get("/api/reports/spending-by-category?start=2025-01-01&end=2025-03-31",
                   headers=auth_headers)
    assert r.status_code == 200
    total = sum(item["amount"] for item in r.json())
    assert total == 100.0


def test_spending_by_category_empty(client, auth_headers):
    r = client.get("/api/reports/spending-by-category", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_spending_by_category_unauthenticated(client):
    r = client.get("/api/reports/spending-by-category")
    assert r.status_code == 401


# --- Income vs Expense ---

def test_income_vs_expense(client, auth_headers, seeded_data):
    r = client.get("/api/reports/income-vs-expense", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        item = data[0]
        assert "month" in item
        assert "income" in item
        assert "expense" in item
        assert item["income"] >= 0
        assert item["expense"] >= 0


def test_income_vs_expense_months_param(client, auth_headers):
    r = client.get("/api/reports/income-vs-expense?months=3", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) <= 3


def test_income_vs_expense_max_months(client, auth_headers):
    r = client.get("/api/reports/income-vs-expense?months=24", headers=auth_headers)
    assert r.status_code == 200


def test_income_vs_expense_unauthenticated(client):
    r = client.get("/api/reports/income-vs-expense")
    assert r.status_code == 401


# --- Net Worth ---

def test_net_worth(client, auth_headers, seeded_data):
    r = client.get("/api/reports/net-worth", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        item = data[0]
        assert "month" in item
        assert "net_worth" in item


def test_net_worth_empty(client, auth_headers):
    r = client.get("/api/reports/net-worth", headers=auth_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_net_worth_unauthenticated(client):
    r = client.get("/api/reports/net-worth")
    assert r.status_code == 401


# --- Trends ---

def test_trends(client, auth_headers, seeded_data):
    r = client.get("/api/reports/trends", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        assert "month" in data[0]
        assert "amount" in data[0]


def test_trends_with_category_filter(client, auth_headers, test_category, seeded_data):
    r = client.get(f"/api/reports/trends?category_id={test_category['id']}", headers=auth_headers)
    assert r.status_code == 200


def test_trends_unauthenticated(client):
    r = client.get("/api/reports/trends")
    assert r.status_code == 401


# --- Top Payees ---

def test_top_payees(client, auth_headers, seeded_data):
    r = client.get("/api/reports/top-payees", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    if data:
        item = data[0]
        assert "payee" in item
        assert "amount" in item
        assert "count" in item


def test_top_payees_date_filter(client, auth_headers, test_account):
    client.post("/api/auth/register", json={
        "username": "u2", "email": "u2@x.com", "password": "pass"})
    for i in range(3):
        client.post("/api/transactions", json={
            "account_id": test_account["id"],
            "date": "2025-03-10",
            "payee": "Frequent Payee",
            "amount": -10.0,
        }, headers=auth_headers)

    r = client.get("/api/reports/top-payees?start=2025-03-01&end=2025-03-31",
                   headers=auth_headers)
    assert r.status_code == 200
    payees = [item["payee"] for item in r.json()]
    assert "Frequent Payee" in payees


def test_top_payees_limit(client, auth_headers):
    r = client.get("/api/reports/top-payees?limit=5", headers=auth_headers)
    assert r.status_code == 200
    assert len(r.json()) <= 5


def test_top_payees_unauthenticated(client):
    r = client.get("/api/reports/top-payees")
    assert r.status_code == 401
