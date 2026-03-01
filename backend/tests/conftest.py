import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db

SQLALCHEMY_TEST_URL = "sqlite:///:memory:"


@pytest.fixture(scope="function")
def client():
    engine = create_engine(
        SQLALCHEMY_TEST_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture
def registered_user(client):
    r = client.post("/api/auth/register", json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpass123",
    })
    assert r.status_code == 200
    return r.json()


@pytest.fixture
def auth_headers(client, registered_user):
    r = client.post("/api/auth/login", json={
        "username": "testuser",
        "password": "testpass123",
    })
    assert r.status_code == 200
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def second_user_headers(client):
    client.post("/api/auth/register", json={
        "username": "otheruser",
        "email": "other@example.com",
        "password": "otherpass123",
    })
    r = client.post("/api/auth/login", json={
        "username": "otheruser",
        "password": "otherpass123",
    })
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


@pytest.fixture
def test_account(client, auth_headers):
    r = client.post("/api/accounts", json={
        "name": "Test Checking",
        "type": "checking",
        "balance": 0.0,
    }, headers=auth_headers)
    assert r.status_code == 200
    return r.json()


@pytest.fixture
def test_category(client, auth_headers):
    r = client.post("/api/categories", json={
        "name": "Test Expense",
        "color": "#ef4444",
        "is_income": False,
    }, headers=auth_headers)
    assert r.status_code == 200
    return r.json()


@pytest.fixture
def income_category(client, auth_headers):
    r = client.post("/api/categories", json={
        "name": "Test Income",
        "color": "#10b981",
        "is_income": True,
    }, headers=auth_headers)
    assert r.status_code == 200
    return r.json()


@pytest.fixture
def test_transaction(client, auth_headers, test_account, test_category):
    r = client.post("/api/transactions", json={
        "account_id": test_account["id"],
        "category_id": test_category["id"],
        "date": "2025-01-15",
        "payee": "Test Payee",
        "amount": -50.00,
        "notes": "Test note",
    }, headers=auth_headers)
    assert r.status_code == 200
    return r.json()
