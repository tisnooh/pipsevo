import asyncio
import os
import sys
import types

from starlette.requests import Request

sys.modules.setdefault("anthropic", types.SimpleNamespace(Anthropic=lambda **_kwargs: None))
os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "pipsevo_test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

import server


class FakeContactMessages:
    def __init__(self):
        self.inserted = None
        self.updates = []

    async def count_documents(self, _query):
        return 0

    async def insert_one(self, document):
        self.inserted = document

    async def update_one(self, query, update):
        self.updates.append((query, update))


class FakeDb:
    def __init__(self):
        self.contact_messages = FakeContactMessages()


def test_support_request_notifies_team_and_acknowledges_user(monkeypatch):
    fake_db = FakeDb()
    deliveries = []

    def fake_send_email(**kwargs):
        deliveries.append(kwargs)
        return f"message-{len(deliveries)}"

    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "send_email", fake_send_email)
    monkeypatch.setenv("SUPPORT_EMAIL", "tyachatfr@gmail.com")
    monkeypatch.setenv("SUPPORT_RATE_LIMIT_SECRET", "test-rate-limit-secret")

    body = server.ContactIn(
        name="Alex",
        email="alex@example.com",
        subject="Journal synchronization",
        category="journal",
        message="My imported trades are missing from the calendar.",
        locale="en",
    )
    request = Request({"type": "http", "method": "POST", "path": "/api/support", "headers": [], "client": ("192.0.2.1", 50000)})

    result = asyncio.run(server.contact(body, request))

    assert result["ok"] is True
    assert result["request_id"].startswith("PE-")
    assert fake_db.contact_messages.inserted["ip_hash"] != "192.0.2.1"
    assert deliveries[0]["to"] == "tyachatfr@gmail.com"
    assert deliveries[0]["reply_to"] == "alex@example.com"
    assert deliveries[1]["to"] == "alex@example.com"
    assert deliveries[1]["reply_to"] == "tyachatfr@gmail.com"
    assert "Your request has been received" in deliveries[1]["html"]
    assert fake_db.contact_messages.updates[-1][1]["$set"]["status"] == "delivered"


def test_support_honeypot_does_not_store_or_send(monkeypatch):
    fake_db = FakeDb()
    deliveries = []
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "send_email", lambda **kwargs: deliveries.append(kwargs))

    body = server.ContactIn(
        name="Robot",
        email="robot@example.com",
        subject="Spam message",
        message="This field should stop automated submissions.",
        website="https://spam.example",
    )
    request = Request({"type": "http", "method": "POST", "path": "/api/support", "headers": [], "client": ("192.0.2.2", 50000)})

    result = asyncio.run(server.contact(body, request))

    assert result == {"ok": True, "message": "Message received"}
    assert fake_db.contact_messages.inserted is None
    assert deliveries == []
