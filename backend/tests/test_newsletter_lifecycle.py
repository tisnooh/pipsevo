import asyncio
import os
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi import HTTPException
from mongomock_motor import AsyncMongoMockClient
from starlette.requests import Request

os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "pipsevo_test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

import server
import email_service


def test_newsletter_confirmation_is_single_use_and_cannot_undo_unsubscribe(monkeypatch):
    database = AsyncMongoMockClient().newsletter_lifecycle
    messages = []
    monkeypatch.setattr(server, "db", database)
    monkeypatch.setenv("EMAIL_TOKEN_SECRET", "newsletter-test-secret-long-enough-for-hs256")
    monkeypatch.setattr(server, "send_email", lambda **kwargs: messages.append(kwargs) or f"message-{len(messages)}")
    async def allowed(**_kwargs):
        pass
    monkeypatch.setattr(server, "_enforce_public_rate_limit", allowed)
    request = Request({"type": "http", "method": "POST", "path": "/", "headers": [], "client": ("192.0.2.1", 50000)})

    async def scenario():
        await server.newsletter_subscribe(server.NewsletterSubscribeIn(email="reader@example.com"), request)
        url = messages[0]["text"].split("Confirmer mon inscription: ", 1)[1]
        token = parse_qs(urlsplit(url).query)["token"][0]
        body = server.NewsletterTokenIn(token=token)
        assert await server.newsletter_confirm(body) == {"ok": True, "status": "active"}
        assert await server.newsletter_confirm(body) == {"ok": True, "status": "active"}
        assert len(messages) == 2
        unsubscribe = email_service.issue_email_token("reader@example.com", "newsletter-unsubscribe", timedelta(days=1))
        await server._unsubscribe_newsletter_token(unsubscribe)
        with pytest.raises(HTTPException) as caught:
            await server.newsletter_confirm(body)
        assert caught.value.status_code == 400
        assert (await database.newsletter_subscribers.find_one({"email": "reader@example.com"}))["status"] == "unsubscribed"
        assert len(messages) == 2

    asyncio.run(scenario())


def test_replaced_pending_confirmation_token_cannot_activate_new_request(monkeypatch):
    database = AsyncMongoMockClient().newsletter_old_token
    monkeypatch.setattr(server, "db", database)
    monkeypatch.setenv("EMAIL_TOKEN_SECRET", "newsletter-test-secret-long-enough-for-hs256")
    old_token = email_service.issue_email_token("reader@example.com", "newsletter-confirm", timedelta(hours=24))
    asyncio.run(database.newsletter_subscribers.insert_one({
        "email": "reader@example.com", "status": "pending", "confirmation_token_hash": "hash-of-new-token",
    }))
    with pytest.raises(HTTPException) as caught:
        asyncio.run(server.newsletter_confirm(server.NewsletterTokenIn(token=old_token)))
    assert caught.value.status_code == 400


def test_campaign_recipient_reservation_is_atomic_and_retryable(monkeypatch):
    database = AsyncMongoMockClient().newsletter_claims
    monkeypatch.setattr(server, "db", database)

    async def scenario():
        claims = await asyncio.gather(*(server._claim_newsletter_delivery("campaign", "reader@example.com") for _ in range(20)))
        assert sum(claim is not None for claim in claims) == 1
        claim = next(claim for claim in claims if claim)
        await database.newsletter_deliveries.update_one(claim, {"$set": {"status": "sent"}})
        assert await server._claim_newsletter_delivery("campaign", "reader@example.com") is None
        # Pre-release failed rows with generated Mongo IDs remain retryable.
        await database.newsletter_deliveries.insert_one({"campaign_key": "legacy", "email": "legacy@example.com", "status": "failed", "attempts": 1})
        assert await server._claim_newsletter_delivery("legacy", "legacy@example.com") is not None
        row = await database.newsletter_deliveries.find_one({"campaign_key": "legacy"})
        assert row["attempts"] == 2
        await database.newsletter_deliveries.update_one({"_id": row["_id"]}, {"$set": {"updated_at": datetime.now(timezone.utc) - timedelta(minutes=10)}})
        assert await server._claim_newsletter_delivery("legacy", "legacy@example.com") is not None

    asyncio.run(scenario())


def test_concurrent_campaign_batches_send_once_and_enforce_content_identity(monkeypatch):
    database = AsyncMongoMockClient().newsletter_campaign_batches
    monkeypatch.setattr(server, "db", database)
    monkeypatch.setenv("EMAIL_TOKEN_SECRET", "newsletter-test-secret-long-enough-for-hs256")
    monkeypatch.setenv("NEWSLETTER_ADMIN_KEY", "server-only-test")
    messages = []
    monkeypatch.setattr(server, "send_email", lambda **kwargs: messages.append(kwargs) or f"message-{len(messages)}")
    payload = {
        "campaign_key": "launch-guide", "subject": "Guide français", "subject_en": "English guide",
        "preheader": "À lire", "preheader_en": "Read now", "title": "Le guide", "title_en": "The guide",
        "intro": "Introduction française", "intro_en": "English introduction", "body": "Le contenu", "body_en": "English content",
    }
    body = server.NewsletterCampaignIn(**payload)

    async def scenario():
        await database.newsletter_campaigns.create_index("campaign_key", unique=True)
        await database.newsletter_deliveries.create_index([("campaign_key", 1), ("email", 1)], unique=True)
        await database.newsletter_subscribers.insert_many([
            {"email": "french@example.com", "status": "active", "product_updates": True, "locale": "fr"},
            {"email": "english@example.com", "status": "active", "product_updates": True, "locale": "en"},
            {"email": "unsubscribed@example.com", "status": "unsubscribed", "product_updates": False},
        ])
        await asyncio.gather(*(server.send_newsletter_campaign(body, "server-only-test") for _ in range(3)))
        assert len(messages) == 2
        assert {message["subject"] for message in messages} == {"Guide français", "English guide"}
        assert await database.newsletter_deliveries.count_documents({"status": "sent"}) == 2
        assert all(message["one_click_unsubscribe"] for message in messages)
        await server.send_newsletter_campaign(body, "server-only-test")
        assert len(messages) == 2
        with pytest.raises(HTTPException) as caught:
            await server.send_newsletter_campaign(server.NewsletterCampaignIn(**{**payload, "subject": "Un autre sujet"}), "server-only-test")
        assert caught.value.status_code == 409

    asyncio.run(scenario())
