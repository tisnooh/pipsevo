from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from admin.routes import build_admin_router
from integrations.errors import IntegrationError


OWNER = "5d5fce69-005f-4246-b1c0-dfcf062ff261"
CONNECTION = "b7aee019-4957-42e0-b14b-1e6c67e740f9"
PATH = f"/api/admin/users/{OWNER}/connections/{CONNECTION}/sync"


def fixture(role="super_admin", status="active"):
    async def current_user():
        return {"id": "staff-id", "role": role, "status": status}

    service = SimpleNamespace(rate_limit=AsyncMock(), audit=AsyncMock())
    integration = SimpleNamespace(
        repository=SimpleNamespace(get_connection=AsyncMock(return_value={
            "id": CONNECTION, "user_id": OWNER, "provider": "tradelocker",
            "connection_status": "connected", "access_token": "never-expose",
        })),
        sync_connection=AsyncMock(return_value={"accounts": [{"imported_count": 2, "partial_error": False}]}),
    )
    app = FastAPI()
    app.include_router(build_admin_router(current_user, service, integration), prefix="/api")
    return TestClient(app), service, integration


@pytest.mark.parametrize("role,status", [("user", "active"), ("support", "active"),
                                         ("admin", "active"), ("super_admin", "suspended")])
def test_sync_rejects_unauthorized_staff_before_access(role, status):
    client, service, integration = fixture(role, status)
    assert client.post(PATH, json={"confirmation": True}).status_code == 403
    integration.repository.get_connection.assert_not_awaited()
    integration.sync_connection.assert_not_awaited()


@pytest.mark.parametrize("body,status", [({"confirmation": False}, 400), ({}, 422),
                                         ({"confirmation": True, "access_token": "injected"}, 422)])
def test_sync_requires_explicit_confirmation_and_forbids_credentials(body, status):
    client, _, integration = fixture()
    assert client.post(PATH, json=body).status_code == status
    integration.repository.get_connection.assert_not_awaited()


def test_sync_uses_owner_boundary_and_audits_without_exposing_credentials():
    client, service, integration = fixture()
    response = client.post(PATH, json={"confirmation": True})
    assert response.status_code == 200
    assert response.json() == {"ok": True, "accounts_synced": 1, "partial_error": False, "trades_without_net_pnl": 0}
    integration.repository.get_connection.assert_awaited_once_with(CONNECTION, OWNER)
    integration.sync_connection.assert_awaited_once_with(OWNER, CONNECTION, "retry")
    service.rate_limit.assert_awaited_once_with("staff-id", "trading_sync", 5)
    assert [call.args[1] for call in service.audit.await_args_list] == ["trading_sync.requested", "trading_sync.completed"]
    assert "never-expose" not in str(service.audit.await_args_list)


def test_sync_does_not_cross_owner_or_restore_disconnected_connection():
    client, _, integration = fixture()
    for connection, expected in [(None, 404), ({"connection_status": "disconnected"}, 409)]:
        integration.repository.get_connection.return_value = connection
        assert client.post(PATH, json={"confirmation": True}).status_code == expected
    integration.sync_connection.assert_not_awaited()


def test_provider_failure_is_audited_and_returned_as_safe_actionable_error():
    client, service, integration = fixture()
    integration.sync_connection.side_effect = IntegrationError("connection_expired", "Reconnecte la plateforme.", 401)
    response = client.post(PATH, json={"confirmation": True})
    assert response.status_code == 401
    assert response.json()["detail"]["code"] == "connection_expired"
    assert service.audit.await_args.args[1] == "trading_sync.failed"


def test_partial_import_is_not_reported_as_complete():
    client, _, integration = fixture()
    integration.sync_connection.return_value = {"accounts": [{"partial_error": True}]}
    assert client.post(PATH, json={"confirmation": True}).json()["partial_error"] is True


def test_successful_trade_import_reports_missing_financial_data():
    client, _, integration = fixture()
    integration.sync_connection.return_value = {"accounts": [{"trades_without_net_pnl": 8}]}
    result = client.post(PATH, json={"confirmation": True}).json()
    assert result["trades_without_net_pnl"] == 8
    assert result["partial_error"] is False
