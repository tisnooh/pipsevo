from fastapi import FastAPI
from fastapi.testclient import TestClient

from admin.client import SupabaseAdminClient
from admin.models import ProductEventIn, UserActionIn
from admin.routes import build_admin_router
from admin.security import has_permission, normalize_role, sanitize


class Service:
    pass


def client_for(user):
    async def current_user():
        return user

    app = FastAPI()
    app.include_router(build_admin_router(current_user, Service()), prefix="/api")
    return TestClient(app)


def test_admin_session_rejects_normal_users():
    response = client_for({"id": "user-1", "email": "user@example.com", "role": "user", "status": "active"}).get("/api/admin/session")
    assert response.status_code == 403


def test_admin_session_exposes_permissions_but_no_internal_fields():
    response = client_for({"id": "admin-1", "email": "admin@example.com", "name": "Admin", "role": "admin", "status": "active", "_supabase_token": "hidden"}).get("/api/admin/session")
    assert response.status_code == 200
    assert response.json()["role"] == "admin"
    assert "users.manage" in response.json()["permissions"]
    assert "_supabase_token" not in response.json()


def test_product_admin_endpoints_reject_normal_users_before_data_access():
    client = client_for({"id": "user-1", "email": "user@example.com", "role": "user", "status": "active"})
    for path in ("/api/admin/trading-accounts", "/api/admin/integrations", "/api/admin/system"):
        assert client.get(path).status_code == 403


def test_admin_role_contains_consolidated_platform_permissions():
    user = {"role": "admin"}
    assert has_permission(user, "trading_accounts.read")
    assert has_permission(user, "integrations.read")
    assert has_permission(user, "system.read")


def test_suspended_staff_is_rejected():
    response = client_for({"id": "admin-1", "email": "admin@example.com", "role": "super_admin", "status": "suspended"}).get("/api/admin/session")
    assert response.status_code == 403


def test_permissions_are_role_scoped():
    assert has_permission({"role": "support"}, "support.write")
    assert not has_permission({"role": "support"}, "users.manage")
    assert has_permission({"role": "super_admin"}, "anything.at.all")
    assert normalize_role("INVALID") == "user"


def test_sanitizer_removes_credentials_recursively():
    result = sanitize({"account": "masked", "access_token": "secret", "nested": {"password": "secret", "error_code": "timeout"}})
    assert result == {"account": "masked", "nested": {"error_code": "timeout"}}


def test_sensitive_models_are_strict_and_require_confirmation_field():
    assert UserActionIn(action="suspend", confirmation=True).confirmation is True
    event = ProductEventIn(event_name="page.viewed", feature="app.journal", metadata={"pathname": "/app/journal"})
    assert event.feature == "app.journal"


def test_supabase_secret_key_is_never_forced_into_bearer_header():
    client = SupabaseAdminClient("https://example.supabase.co", "sb_secret_server_key", "sb_publishable_client_key")
    headers = client._server_headers()
    assert headers["apikey"] == "sb_secret_server_key"
    assert "Authorization" not in headers


def test_legacy_service_role_jwt_uses_bearer_header():
    jwt = "header.payload.signature"
    client = SupabaseAdminClient("https://example.supabase.co", jwt, "publishable")
    headers = client._server_headers()
    assert headers["Authorization"] == f"Bearer {jwt}"
