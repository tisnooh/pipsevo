"""The free-beta candidate must not manufacture or initiate payments."""
import os

import pytest
from fastapi.testclient import TestClient

os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "pipsevo_test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

import server


@pytest.fixture
def client():
    async def current_user():
        return {"id": "billing-test-owner", "status": "active"}

    previous = dict(server.app.dependency_overrides)
    server.app.dependency_overrides[server.get_current_user] = current_user
    # Without a lifespan context: no MongoDB startup or external provider calls.
    try:
        yield TestClient(server.app)
    finally:
        server.app.dependency_overrides.clear()
        server.app.dependency_overrides.update(previous)


@pytest.mark.parametrize("plan", ["essential", "pro"])
def test_beta_does_not_offer_a_fabricated_checkout(client, plan):
    response = client.post("/api/billing/checkout", params={"plan": plan})
    assert response.status_code == 503
    assert response.json() == {"detail": "La facturation sécurisée n’est pas encore disponible."}
    assert "location" not in response.headers


def test_unknown_plan_is_rejected(client):
    response = client.post("/api/billing/checkout", params={"plan": "invented-plan"})
    assert response.status_code == 400


def test_checkout_requires_authentication():
    response = TestClient(server.app).post("/api/billing/checkout", params={"plan": "pro"})
    assert response.status_code == 401
