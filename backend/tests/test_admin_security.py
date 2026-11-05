from fastapi import FastAPI
from fastapi.testclient import TestClient

from admin.client import SupabaseAdminClient
from admin.models import ProductEventIn, UserActionIn
from admin.routes import build_admin_router
from admin.security import has_permission, normalize_role, sanitize


class Service:
    pass


def test_support_directory_search_and_detail_only_return_identity():
    from types import SimpleNamespace
    from unittest.mock import AsyncMock
    from admin.service import AdminService
    owner = "10000000-aaaa-4aaa-8aaa-010111000001"
    row = {"id": owner, "name": "QA", "email": "qa@example.invalid", "plan": "pro", "net_pnl": 50}
    store = SimpleNamespace(one=AsyncMock(return_value=row), list_rows=AsyncMock(return_value=([row], 1)))
    service = AdminService(None, store, "https://example.invalid")
    service.support_list = AsyncMock(return_value={"items": []})
    async def support_user():
        return {"id": "support-id", "role": "support", "status": "active"}
    app = FastAPI()
    app.include_router(build_admin_router(support_user, service), prefix="/api")
    client = TestClient(app)
    for path, key in [("/api/admin/users?plan=pro", "items"), ("/api/admin/search?q=QA", "users")]:
        response = client.get(path)
        assert response.status_code == 200
        item = response.json()[key][0]
        assert item["id"] == owner and set(item) == {"id", "name", "email", "role", "status", "created_at"}
        assert store.list_rows.await_args.args[0] == "profiles"
    detail = client.get(f"/api/admin/users/{owner}")
    assert detail.status_code == 200 and set(detail.json()) == {"identity"}
    assert "plan" not in detail.json()["identity"]
    assert store.one.await_count == 1 and store.one.await_args.args[0] == "profiles"


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
