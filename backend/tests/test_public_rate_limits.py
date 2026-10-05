import asyncio
import os
import sys
import types

import pytest
from fastapi import HTTPException
from mongomock_motor import AsyncMongoMockClient
from starlette.requests import Request
from starlette.responses import Response

sys.modules.setdefault("anthropic", types.SimpleNamespace(Anthropic=lambda **_kwargs: None))
os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "pipsevo_test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

import server


def request_from(ip: str) -> Request:
    return Request({
        "type": "http",
        "method": "POST",
        "path": "/api/test",
        "headers": [],
        "client": (ip, 50000),
    })


def test_api_responses_include_baseline_security_headers():
    request = request_from("192.0.2.5")

    async def call_next(_request):
        return Response("ok")

    response = asyncio.run(server.request_context(request, call_next))

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert response.headers["permissions-policy"] == "camera=(), microphone=(), geolocation=()"
    assert response.headers["x-request-id"]


def test_public_rate_limit_is_atomic_and_does_not_store_identity(monkeypatch):
    fake_db = AsyncMongoMockClient().rate_limit_atomic
    monkeypatch.setattr(server, "db", fake_db)

    async def scenario():
        for _ in range(2):
            await server._enforce_public_rate_limit(
                scope="test-email",
                identity="private@example.com",
                max_requests=2,
                window_seconds=900,
            )
        with pytest.raises(HTTPException) as caught:
            await server._enforce_public_rate_limit(
                scope="test-email",
                identity="private@example.com",
                max_requests=2,
                window_seconds=900,
            )
        assert caught.value.status_code == 429
        bucket = await fake_db.public_rate_limits.find_one({"scope": "test-email"})
        assert bucket["count"] == 3
        assert "private@example.com" not in str(bucket)

    asyncio.run(scenario())


def test_legacy_auth_routes_are_retired_without_hashing_or_writes(monkeypatch):
    fake_db = AsyncMongoMockClient().rate_limit_login
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "hash_pw", lambda _value: pytest.fail("Retired registration must not hash"))
    body = server.LoginIn(email="trader@example.com", password="incorrect-password")
    request = request_from("192.0.2.10")

    async def scenario():
        for action in (server.login(body, request), server.register(server.RegisterIn(email=body.email, password=body.password))):
            with pytest.raises(HTTPException) as caught:
                await action
            assert caught.value.status_code == 410
        assert await fake_db.users.count_documents({}) == 0

    asyncio.run(scenario())


def test_retained_mongo_jwt_does_not_bypass_supabase(monkeypatch):
    fake_db = AsyncMongoMockClient().retired_token
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "SUPABASE_URL", "https://auth.example")
    monkeypatch.setattr(server, "SUPABASE_PUBLISHABLE_KEY", "public-test-key")
    monkeypatch.setattr(server.requests, "get", lambda *_args, **_kwargs: types.SimpleNamespace(status_code=401))

    async def scenario():
        await fake_db.users.insert_one({"id": "legacy-user", "role": "super_admin", "status": "active"})
        creds = server.HTTPAuthorizationCredentials(scheme="Bearer", credentials=server.make_token("legacy-user"))
        with pytest.raises(HTTPException) as caught:
            await server.get_current_user(creds)
        assert caught.value.status_code == 401

    asyncio.run(scenario())


def test_auth_service_failure_never_falls_back_to_retained_records(monkeypatch):
    monkeypatch.setattr(server, "SUPABASE_URL", "https://auth.example")
    monkeypatch.setattr(server, "SUPABASE_PUBLISHABLE_KEY", "public-test-key")
    def unavailable(*_args, **_kwargs):
        raise server.requests.Timeout("offline")
    monkeypatch.setattr(server.requests, "get", unavailable)
    creds = server.HTTPAuthorizationCredentials(scheme="Bearer", credentials="test-token")
    with pytest.raises(HTTPException) as caught:
        asyncio.run(server.get_current_user(creds))
    assert caught.value.status_code == 503


@pytest.mark.parametrize("trade_id,expected_status", [(None, 422), ("missing-trade", 404)])
def test_invalid_atlas_request_does_not_consume_a_slot(monkeypatch, trade_id, expected_status):
    fake_db = AsyncMongoMockClient().invalid_atlas_request
    monkeypatch.setattr(server, "db", fake_db)
    async def enabled(*_args):
        return True
    async def select(table, *_args):
        return [{"id": "existing-trade", "instrument": "EURUSD", "pnl": 25}] if table == "trades" and trade_id else []
    monkeypatch.setattr(server.admin_service, "feature_enabled", enabled)
    monkeypatch.setattr(server, "supabase_select", select)
    with pytest.raises(HTTPException) as caught:
        asyncio.run(server.coach_ask(server.CoachQuery(question="Analyse mon journal", trade_id=trade_id), {"id": "user", "_supabase_token": "test-token"}))
    assert caught.value.status_code == expected_status
    assert asyncio.run(fake_db.atlas_quotas.count_documents({})) == 0


def test_failed_atlas_work_keeps_its_reserved_slot(monkeypatch):
    fake_db = AsyncMongoMockClient().failed_atlas_request
    monkeypatch.setattr(server, "db", fake_db)
    async def enabled(*_args):
        return True
    async def select(table, *_args):
        return [{"id": "trade", "instrument": "EURUSD", "pnl": 25}] if table == "trades" else []
    def failed_answer(*_args):
        raise RuntimeError("generation failed")
    monkeypatch.setattr(server.admin_service, "feature_enabled", enabled)
    monkeypatch.setattr(server, "supabase_select", select)
    monkeypatch.setattr(server, "ATLAS_PROVIDER_CONFIG", types.SimpleNamespace(provider="deterministic", model="test"))
    monkeypatch.setattr(server, "build_deterministic_coach_answer", failed_answer)
    with pytest.raises(HTTPException) as caught:
        asyncio.run(server.coach_ask(server.CoachQuery(question="Analyse mon journal"), {"id": "user", "_supabase_token": "test-token"}))
    assert caught.value.status_code == 500
    bucket = asyncio.run(fake_db.atlas_quotas.find_one({}))
    assert len(bucket["requests"]) == 1


@pytest.mark.parametrize("profile,status", [({"status": "active"}, 200), ({"status": "suspended"}, 403), (None, 401)])
def test_canonical_supabase_identity_and_status(monkeypatch, profile, status):
    monkeypatch.setattr(server, "SUPABASE_URL", "https://auth.example")
    monkeypatch.setattr(server, "SUPABASE_PUBLISHABLE_KEY", "public-test-key")
    def get(url, **_kwargs):
        payload = {"id": "canonical-user", "email": "trader@example.com"} if url.endswith("/user") else ([{"id": "canonical-user", "role": "user", **profile}] if profile else [])
        return types.SimpleNamespace(status_code=200, json=lambda: payload, raise_for_status=lambda: None)
    monkeypatch.setattr(server.requests, "get", get)
    creds = server.HTTPAuthorizationCredentials(scheme="Bearer", credentials="supabase-token")
    if status == 200:
        user = asyncio.run(server.get_current_user(creds))
        assert user["_supabase_token"] == "supabase-token"
        assert user["id"] == "canonical-user"
    else:
        with pytest.raises(HTTPException) as caught:
            asyncio.run(server.get_current_user(creds))
        assert caught.value.status_code == status


def test_newsletter_limits_one_ip_across_different_addresses(monkeypatch):
    fake_db = AsyncMongoMockClient().rate_limit_newsletter
    deliveries = []
    monkeypatch.setattr(server, "db", fake_db)
    monkeypatch.setattr(server, "send_email", lambda **kwargs: deliveries.append(kwargs) or "message-id")
    monkeypatch.setenv("NEWSLETTER_RATE_LIMIT_IP_MAX", "2")
    monkeypatch.setenv("NEWSLETTER_RATE_LIMIT_EMAIL_MAX", "20")
    monkeypatch.setenv("NEWSLETTER_RATE_LIMIT_GLOBAL_MAX", "20")
    request = request_from("192.0.2.20")

    async def scenario():
        for index in range(2):
            result = await server.newsletter_subscribe(
                server.NewsletterSubscribeIn(email=f"reader{index}@example.com"),
                request,
            )
            assert result["status"] == "confirmation_required"
        with pytest.raises(HTTPException) as caught:
            await server.newsletter_subscribe(
                server.NewsletterSubscribeIn(email="reader3@example.com"),
                request,
            )
        assert caught.value.status_code == 429
        assert len(deliveries) == 2

    asyncio.run(scenario())
