import pytest


# --- Create ---

def test_create_account(client, auth_headers):
    r = client.post("/api/accounts", json={
        "name": "My Checking",
        "type": "checking",
        "balance": 500.0,
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "My Checking"
    assert data["type"] == "checking"
    assert data["is_active"] is True
    assert "id" in data


@pytest.mark.parametrize("account_type", [
    "checking", "savings", "credit_card", "cash", "investment"
])
def test_create_all_account_types(client, auth_headers, account_type):
    r = client.post("/api/accounts", json={
        "name": f"My {account_type}",
        "type": account_type,
    }, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["type"] == account_type


def test_create_account_unauthenticated(client):
    r = client.post("/api/accounts", json={"name": "Hack", "type": "checking"})
    assert r.status_code == 401


# --- List ---

def test_list_accounts(client, auth_headers, test_account):
    r = client.get("/api/accounts", headers=auth_headers)
    assert r.status_code == 200
    accounts = r.json()
    assert len(accounts) >= 1
    assert any(a["id"] == test_account["id"] for a in accounts)


def test_list_accounts_unauthenticated(client):
    r = client.get("/api/accounts")
    assert r.status_code == 401


def test_accounts_isolated_between_users(client, auth_headers, second_user_headers, test_account):
    r = client.get("/api/accounts", headers=second_user_headers)
    assert r.status_code == 200
    ids = [a["id"] for a in r.json()]
    assert test_account["id"] not in ids


# --- Balance from transactions ---

def test_account_balance_reflects_transactions(client, auth_headers, test_account):
    account_id = test_account["id"]

    client.post("/api/transactions", json={
        "account_id": account_id,
        "date": "2025-01-01",
        "payee": "Salary",
        "amount": 3000.0,
    }, headers=auth_headers)
    client.post("/api/transactions", json={
        "account_id": account_id,
        "date": "2025-01-05",
        "payee": "Rent",
        "amount": -1200.0,
    }, headers=auth_headers)

    r = client.get("/api/accounts", headers=auth_headers)
    account = next(a for a in r.json() if a["id"] == account_id)
    assert account["balance"] == 1800.0


def test_new_account_has_zero_balance(client, auth_headers, test_account):
    r = client.get("/api/accounts", headers=auth_headers)
    account = next(a for a in r.json() if a["id"] == test_account["id"])
    assert account["balance"] == 0.0


# --- Update ---

def test_update_account(client, auth_headers, test_account):
    r = client.put(f"/api/accounts/{test_account['id']}", json={
        "name": "Renamed Account",
    }, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["name"] == "Renamed Account"


def test_update_nonexistent_account(client, auth_headers):
    r = client.put("/api/accounts/99999", json={"name": "Ghost"}, headers=auth_headers)
    assert r.status_code == 404


def test_cannot_update_other_users_account(client, auth_headers, second_user_headers):
    r = client.post("/api/accounts", json={"name": "Mine", "type": "checking"},
                    headers=auth_headers)
    account_id = r.json()["id"]

    r2 = client.put(f"/api/accounts/{account_id}", json={"name": "Stolen"},
                    headers=second_user_headers)
    assert r2.status_code == 404


# --- Delete (soft) ---

def test_delete_account(client, auth_headers, test_account):
    r = client.delete(f"/api/accounts/{test_account['id']}", headers=auth_headers)
    assert r.status_code == 200

    # Should not appear in list anymore
    r2 = client.get("/api/accounts", headers=auth_headers)
    ids = [a["id"] for a in r2.json()]
    assert test_account["id"] not in ids


def test_delete_nonexistent_account(client, auth_headers):
    r = client.delete("/api/accounts/99999", headers=auth_headers)
    assert r.status_code == 404


def test_cannot_delete_other_users_account(client, auth_headers, second_user_headers):
    r = client.post("/api/accounts", json={"name": "Mine", "type": "checking"},
                    headers=auth_headers)
    account_id = r.json()["id"]

    r2 = client.delete(f"/api/accounts/{account_id}", headers=second_user_headers)
    assert r2.status_code == 404
