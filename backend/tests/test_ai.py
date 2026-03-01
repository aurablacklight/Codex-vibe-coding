"""AI endpoints — test status and graceful degradation when Ollama is unavailable."""


def test_ai_status_endpoint(client):
    r = client.get("/api/ai/status")
    assert r.status_code == 200
    data = r.json()
    assert "enabled" in data
    assert "status" in data


def test_ai_status_unauthenticated(client):
    # /ai/status is public (no auth required per router)
    r = client.get("/api/ai/status")
    assert r.status_code == 200


def test_ai_analyze_requires_auth(client):
    r = client.post("/api/ai/analyze")
    assert r.status_code == 401


def test_ai_forecast_requires_auth(client):
    r = client.post("/api/ai/forecast")
    assert r.status_code == 401


def test_ai_budget_advice_requires_auth(client):
    r = client.post("/api/ai/budget-advice")
    assert r.status_code == 401


def test_ai_ask_requires_auth(client):
    r = client.post("/api/ai/ask", json={"question": "How am I doing?"})
    assert r.status_code == 401


def test_ai_analyze_returns_error_when_ollama_unavailable(client, auth_headers):
    """With no Ollama running, should return 503. Uses short timeout via env override."""
    import os
    from unittest.mock import patch
    # Patch the timeout so the test doesn't wait 120s
    with patch("app.routers.ai_insights.settings") as mock_settings:
        mock_settings.AI_ENABLED = True
        mock_settings.AI_REQUEST_TIMEOUT = 2
        mock_settings.OLLAMA_BASE_URL = "http://localhost:19999"  # guaranteed unreachable
        mock_settings.OLLAMA_MODEL = "test"
        r = client.post("/api/ai/analyze", headers=auth_headers)
    assert r.status_code == 503
