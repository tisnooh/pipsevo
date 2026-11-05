import os

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.cors import CORSMiddleware

from http_policy import DEFAULT_FRONTEND_ORIGIN, build_cors_origins


@pytest.mark.parametrize("configured", ["", "*", "null", "https://*.vercel.app"])
def test_legacy_or_missing_config_never_authorizes_all_websites(configured):
    assert build_cors_origins(configured) == [DEFAULT_FRONTEND_ORIGIN]


def test_reviewed_production_preview_and_local_origins_are_explicit_and_unique():
    assert build_cors_origins(
        " https://PipsEvo.vercel.app/,https://pipsevo.vercel.app:443,"
        "https://preview.example.test,http://127.0.0.1:4188,http://[::1]:4188"
    ) == [DEFAULT_FRONTEND_ORIGIN, "https://preview.example.test", "http://127.0.0.1:4188", "http://[::1]:4188"]


@pytest.mark.parametrize("invalid", [
    "https://user:secret@example.test", "https://example.test/path", "https://example.test?secret=value",
    "https://example.test#fragment", "http://remote.example.test", "javascript://example.test",
    "https://example.test:bad", "https://example.test:0", "https://example.test\r\nevil.test",
])
def test_invalid_origin_is_not_reflected_or_used_as_fallback(invalid):
    assert build_cors_origins(invalid, invalid) == [DEFAULT_FRONTEND_ORIGIN]


def test_explicit_origins_are_authoritative_and_fallback_frontend_is_validated():
    assert build_cors_origins("https://approved.example.test", "https://other.example.test") == ["https://approved.example.test"]
    assert build_cors_origins("*", "https://custom.example.test/") == ["https://custom.example.test"]


def test_preflight_allows_bearer_without_ambient_cookies_and_rejects_foreign_origin():
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=build_cors_origins("*"),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept-Language", "X-Request-ID"],
    )
    client = TestClient(app)
    headers = {"Origin": DEFAULT_FRONTEND_ORIGIN, "Access-Control-Request-Method": "POST",
               "Access-Control-Request-Headers": "authorization,content-type,x-request-id"}
    allowed = client.options("/api/test", headers=headers)
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == DEFAULT_FRONTEND_ORIGIN
    assert "access-control-allow-credentials" not in allowed.headers
    denied = client.options("/api/test", headers={**headers, "Origin": "https://foreign.example.test"})
    assert denied.status_code == 400
    assert "access-control-allow-origin" not in denied.headers
    invalid_method = client.options("/api/test", headers={**headers, "Access-Control-Request-Method": "TRACE"})
    assert invalid_method.status_code == 400


def test_server_uses_the_restrictive_policy_without_network_or_database_calls():
    os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
    os.environ.setdefault("DB_NAME", "pipsevo_test")
    os.environ.setdefault("JWT_SECRET", "test-jwt-secret")
    import server

    client = TestClient(server.app)  # no startup context, so no live database
    headers = {"Origin": server.cors_origins[0], "Access-Control-Request-Method": "POST",
               "Access-Control-Request-Headers": "authorization,content-type,x-request-id"}
    allowed = client.options("/api/accounts", headers=headers)
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == server.cors_origins[0]
    assert "access-control-allow-credentials" not in allowed.headers
    foreign = client.options("/api/accounts", headers={**headers, "Origin": "https://launch-check.invalid"})
    assert foreign.status_code == 400
    assert "access-control-allow-origin" not in foreign.headers
    unauthenticated = client.get("/api/accounts", headers={"Origin": server.cors_origins[0]})
    assert unauthenticated.status_code == 401
