import pytest


# --- Create ---

def test_create_category(client, auth_headers):
    r = client.post("/api/categories", json={
        "name": "Food",
        "color": "#f59e0b",
        "is_income": False,
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Food"
    assert data["color"] == "#f59e0b"
    assert data["is_income"] is False
    assert data["parent_id"] is None


def test_create_income_category(client, auth_headers):
    r = client.post("/api/categories", json={
        "name": "Salary",
        "is_income": True,
    }, headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["is_income"] is True


def test_create_subcategory(client, auth_headers, test_category):
    r = client.post("/api/categories", json={
        "name": "Groceries",
        "parent_id": test_category["id"],
        "color": "#fbbf24",
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["parent_id"] == test_category["id"]


def test_create_category_unauthenticated(client):
    r = client.post("/api/categories", json={"name": "Hack"})
    assert r.status_code == 401


# --- List ---

def test_list_categories(client, auth_headers, test_category):
    r = client.get("/api/categories", headers=auth_headers)
    assert r.status_code == 200
    names = [c["name"] for c in r.json()]
    assert "Test Expense" in names


def test_list_categories_tree_structure(client, auth_headers, test_category):
    # Create a child
    client.post("/api/categories", json={
        "name": "Child Cat",
        "parent_id": test_category["id"],
    }, headers=auth_headers)

    r = client.get("/api/categories", headers=auth_headers)
    assert r.status_code == 200
    categories = r.json()
    parent = next(c for c in categories if c["id"] == test_category["id"])
    assert len(parent["children"]) == 1
    assert parent["children"][0]["name"] == "Child Cat"


def test_list_categories_flat(client, auth_headers, test_category):
    client.post("/api/categories", json={
        "name": "Child Cat",
        "parent_id": test_category["id"],
    }, headers=auth_headers)

    r = client.get("/api/categories?flat=true", headers=auth_headers)
    assert r.status_code == 200
    categories = r.json()
    # Flat mode returns all categories in a single list (no nesting by position)
    assert len(categories) == 2
    names = {c["name"] for c in categories}
    assert "Test Expense" in names
    assert "Child Cat" in names


def test_categories_isolated_between_users(client, auth_headers, second_user_headers, test_category):
    r = client.get("/api/categories", headers=second_user_headers)
    ids = [c["id"] for c in r.json()]
    assert test_category["id"] not in ids


# --- Update ---

def test_update_category(client, auth_headers, test_category):
    r = client.put(f"/api/categories/{test_category['id']}", json={
        "name": "Updated Name",
        "color": "#00ff00",
    }, headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Updated Name"
    assert data["color"] == "#00ff00"


def test_update_nonexistent_category(client, auth_headers):
    r = client.put("/api/categories/99999", json={"name": "Ghost"}, headers=auth_headers)
    assert r.status_code == 404


def test_cannot_update_other_users_category(client, auth_headers, second_user_headers, test_category):
    r = client.put(f"/api/categories/{test_category['id']}", json={"name": "Stolen"},
                   headers=second_user_headers)
    assert r.status_code == 404


# --- Delete ---

def test_delete_category(client, auth_headers, test_category):
    r = client.delete(f"/api/categories/{test_category['id']}", headers=auth_headers)
    assert r.status_code == 200

    r2 = client.get("/api/categories", headers=auth_headers)
    ids = [c["id"] for c in r2.json()]
    assert test_category["id"] not in ids


def test_delete_nonexistent_category(client, auth_headers):
    r = client.delete("/api/categories/99999", headers=auth_headers)
    assert r.status_code == 404
