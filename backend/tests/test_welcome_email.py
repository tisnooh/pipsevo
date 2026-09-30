import asyncio
import os
import sys
import types
from datetime import datetime, timedelta, timezone

from mongomock_motor import AsyncMongoMockClient

sys.modules.setdefault("anthropic", types.SimpleNamespace(Anthropic=lambda **_kwargs: None))
os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "pipsevo_test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

import server


def test_welcome_is_sent_once_for_an_authenticated_user(monkeypatch):
    fake_db = AsyncMongoMockClient().welcome_once
    deliveries = []

    def fake_send_email(**kwargs):
        deliveries.append(kwargs)
        return "message-1"

    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "send_email", fake_send_email)
    user = {"id": "user-1", "email": "trader@example.com"}
    body = server.WelcomeEmailIn(locale="fr")

    first = asyncio.run(server.send_account_welcome(body, user=user))
    second = asyncio.run(server.send_account_welcome(body, user=user))

    assert first == {"ok": True, "status": "sent"}
    assert second == {"ok": True, "status": "already_sent"}
    assert len(deliveries) == 1
    stored = asyncio.run(fake_db.email_deliveries.find_one({"user_id": "user-1"}))
    assert stored["status"] == "sent"
    assert stored["attempt_count"] == 1


def test_stale_sending_claim_is_retried(monkeypatch):
    fake_db = AsyncMongoMockClient().welcome_retry
    asyncio.run(fake_db.email_deliveries.insert_one({
        "event": "account-welcome",
        "user_id": "user-2",
        "status": "sending",
        "attempt_count": 1,
        "updated_at": datetime.now(timezone.utc) - timedelta(minutes=10),
    }))
    deliveries = []
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "send_email", lambda **kwargs: deliveries.append(kwargs) or "message-2")

    result = asyncio.run(server.send_account_welcome(
        server.WelcomeEmailIn(locale="en"),
        user={"id": "user-2", "email": "trader@example.com"},
    ))

    assert result == {"ok": True, "status": "sent"}
    assert len(deliveries) == 1
    stored = asyncio.run(fake_db.email_deliveries.find_one({"user_id": "user-2"}))
    assert stored["attempt_count"] == 2


def test_fresh_sending_claim_is_not_duplicated(monkeypatch):
    fake_db = AsyncMongoMockClient().welcome_in_flight
    asyncio.run(fake_db.email_deliveries.insert_one({
        "event": "account-welcome",
        "user_id": "user-3",
        "status": "sending",
        "updated_at": datetime.now(timezone.utc),
    }))
    deliveries = []
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "send_email", lambda **kwargs: deliveries.append(kwargs) or "message-3")

    result = asyncio.run(server.send_account_welcome(
        server.WelcomeEmailIn(locale="fr"),
        user={"id": "user-3", "email": "trader@example.com"},
    ))

    assert result == {"ok": True, "status": "already_sending"}
    assert deliveries == []
