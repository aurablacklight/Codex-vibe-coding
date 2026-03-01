import pytest


# --- Registration ---

def test_register_success(client):
    r = client.post("/api/auth/register", json={
        "username": "newuser",
        "email": "new@example.com",
        "password": "password123",
    })
    assert r.status_code == 200
    data = r.json()
    assert data["username"] == "newuser"
    assert data["email"] == "new@example.com"
    assert "id" in data
    assert "password" not in data
    assert "hashed_password" not in data


def test_register_duplicate_username(client, registered_user):
    r = client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "different@example.com",
        "password": "password123",
    })
    assert r.status_code == 400


def test_register_duplicate_email(client, registered_user):
    r = client.post("/api/auth/register", json={
        "username": "differentuser",
        "email": "test@example.com",
        "password": "password123",
    })
    assert r.status_code == 400


def test_register_missing_fields(client):
    r = client.post("/api/auth/register", json={"username": "incomplete"})
    assert r.status_code == 422


# --- Login ---

def test_login_success(client, registered_user):
    r = client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "testpass123",
    })
    assert r.status_code == 200
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 0


def test_login_wrong_password(client, registered_user):
    r = client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "wrongpassword",
    })
    assert r.status_code == 401


def test_login_nonexistent_user(client):
    r = client.post("/api/auth/login", json={
        "username": "nobody",
        "password": "password123",
    })
    assert r.status_code == 401


# --- /me ---

def test_get_me_authenticated(client, auth_headers, registered_user):
    r = client.get("/api/auth/me", headers=auth_headers)
    assert r.status_code == 200
    data = r.json()
    assert data["username"] == "testuser"
    assert data["email"] == "test@example.com"


def test_get_me_unauthenticated(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_get_me_invalid_token(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert r.status_code == 401


# --- Setup Required ---

def test_setup_required_no_users(client):
    r = client.get("/api/auth/setup-required")
    assert r.status_code == 200
    assert r.json()["setup_required"] is True


def test_setup_required_with_users(client, registered_user):
    r = client.get("/api/auth/setup-required")
    assert r.status_code == 200
    assert r.json()["setup_required"] is False
