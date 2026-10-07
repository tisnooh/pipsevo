import asyncio
import base64
import os
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock

from pydantic import SecretStr

from integrations.config import IntegrationConfig
from integrations.connectors.ctrader import CTraderConnector
from integrations.errors import IntegrationError
from integrations.models import (
    DetectedAccount,
    IntegrationConnection,
    MT5Credentials,
    ProviderConnectionResult,
    ProviderTradeRecord,
    SyncBatch,
)
from integrations.providers import MT5IntegrationProvider, ProviderRegistry, TradingConnector
from integrations.security import CredentialVault
from integrations.service import IntegrationService


class FakeProvider(MT5IntegrationProvider):
    provider_id = "fake"

    def __init__(self):
        self.disconnected = False

    async def test_connection(self, credentials):
        return self.account(credentials)

    async def connect_account(self, credentials):
        return ProviderConnectionResult(
            account=self.account(credentials),
            permanent_token=SecretStr("provider-token"),
        )

    async def disconnect_account(self, connection, access):
        assert access == {"token": "provider-token"}
        self.disconnected = True

    async def fetch_account(self, connection, access):
        return DetectedAccount(**connection.model_dump())

    async def fetch_historical_trades(self, connection, access):
        return SyncBatch(
            trades=[self.trade("deal-1"), self.balance("balance-1")],
            next_cursor={"page": 1},
        )

    async def fetch_recent_trades(self, connection, access, cursor):
        return SyncBatch(trades=[self.trade("deal-1", "15")], next_cursor={"page": 2})

    async def refresh_connection(self, connection, credentials):
        return ProviderConnectionResult(
            account=self.account(credentials),
            permanent_token=SecretStr("provider-token"),
        )

    async def get_connection_status(self, connection, access):
        return "connected"

    @staticmethod
    def account(credentials):
        return DetectedAccount(
            external_account_id=f"ext-{credentials.account_number}",
            broker_name="Test Broker",
            server_name=credentials.server_name,
            account_number_masked="•••• 5678",
            account_type="demo",
            account_currency="USD",
            balance="10000",
        )

    @staticmethod
    def trade(trade_id, profit="10"):
        return ProviderTradeRecord(
            provider_trade_id=trade_id,
            symbol="EURUSD",
            direction="long",
            volume="0.10",
            open_time=datetime(2026, 7, 1, tzinfo=timezone.utc),
            close_time=datetime(2026, 7, 1, 1, tzinfo=timezone.utc),
            open_price="1.10",
            close_price="1.11",
            gross_profit=profit,
        )

    @staticmethod
    def balance(trade_id):
        return ProviderTradeRecord(
            provider_trade_id=trade_id,
            transaction_type="balance",
            symbol="BALANCE",
            direction="long",
            volume="1",
            open_time=datetime(2026, 7, 1, tzinfo=timezone.utc),
            open_price="0",
            gross_profit="100",
        )


class ExpiredConnector(TradingConnector):
    provider_id = "tradelocker"
    platforms = ("tradelocker",)
    auth_type = "credentials"

    async def list_accounts(self, _access):
        return []

    async def sync_historical(self, _account, _access):
        raise IntegrationError(
            "connection_expired", "Reconnecte TradeLocker pour continuer.", 401
        )

    async def sync_recent(self, _account, _access, _cursor):
        return await self.sync_historical(_account, _access)


class MemoryRepository:
    secret_key = "server-secret"

    def __init__(self):
        self.connections = {}
        self.credentials = {}
        self.trades = {}
        self.runs = {}
        self.audits = []
        self.events = {}

    async def count_recent_attempts(self, *_):
        return 0

    async def record_attempt(self, *_):
        return None

    async def audit(self, *args, **kwargs):
        self.audits.append((args, kwargs))

    async def list_connections(self, user_id, _):
        return [row for row in self.connections.values() if row["user_id"] == user_id]

    async def create_account(self, payload):
        return {"id": str(uuid.uuid4()), **payload}

    async def delete_account(self, *_):
        return None

    async def create_connection(self, payload):
        row = {
            "id": str(uuid.uuid4()),
            "sync_cursor": {},
            "last_successful_sync_at": None,
            "last_sync_attempt_at": None,
            "last_error_code": None,
            "last_error_message": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            **payload,
        }
        self.connections[row["id"]] = row
        return row

    async def get_connection(self, connection_id, user_id):
        row = self.connections.get(connection_id)
        return row if row and row["user_id"] == user_id else None

    async def update_connection(self, connection_id, user_id, payload):
        row = await self.get_connection(connection_id, user_id)
        row.update(payload)
        return row

    async def delete_connection(self, connection_id, _):
        self.connections.pop(connection_id, None)

    async def store_credentials(
        self, connection_id, user_id, provider, credential, token, key_version
    ):
        self.credentials[connection_id] = {
            "user_id": user_id,
            "provider": provider,
            "credential_ciphertext": credential,
            "provider_token_ciphertext": token,
            "key_version": key_version,
        }

    async def read_credentials(self, connection_id, user_id):
        row = self.credentials.get(connection_id)
        return row if row and row["user_id"] == user_id else None

    async def delete_credentials(self, connection_id, _):
        self.credentials.pop(connection_id, None)

    async def upsert_trade_event(self, payload):
        key = (
            payload["provider"],
            payload["external_account_id"],
            payload["provider_transaction_id"],
        )
        self.events[key] = payload
        return str(key)

    async def create_sync_run(self, payload):
        row = {"id": str(uuid.uuid4()), **payload}
        self.runs[row["id"]] = row
        return row

    async def update_sync_run(self, run_id, payload):
        self.runs[run_id].update(payload)

    async def upsert_trade(self, payload):
        key = (
            payload["source_provider"],
            payload["external_account_id"],
            payload["provider_trade_id"],
        )
        action = "updated" if key in self.trades else "inserted"
        self.trades[key] = payload
        return action


def build_service():
    config = IntegrationConfig(
        mt5_auto_sync_enabled=True,
        provider="fake",
        encryption_keys=(base64.urlsafe_b64encode(os.urandom(32)).decode("ascii"),),
        encryption_key_version=1,
        max_connection_attempts=5,
        connection_attempt_window_minutes=15,
        sync_retry_attempts=2,
        sync_backoff_seconds=0.01,
        sync_interval_minutes=5,
        allowed_plans=("beta", "pro"),
    )
    registry = ProviderRegistry()
    provider = FakeProvider()
    registry.register(provider)
    repository = MemoryRepository()
    return (
        IntegrationService(
            config, registry, repository, CredentialVault(config.encryption_keys)
        ),
        repository,
        provider,
    )


def test_oauth_diagnostic_does_not_log_credentials(caplog):
    async def scenario():
        service, repository, _ = build_service()
        connector = CTraderConnector("client", "private-secret", "https://example.test/callback")
        connector.complete_auth = AsyncMock(side_effect=ValueError("private-secret private-code private-token"))
        service.registry.register(connector)
        repository.consume_oauth_state = AsyncMock(return_value={"user_id": "user-1"})
        try:
            await service.complete_oauth("ctrader", "private-code", "private-state")
            assert False, "OAuth failure must be surfaced"
        except IntegrationError as exc:
            assert exc.code == "provider_unavailable"

    asyncio.run(scenario())
    assert "stage=provider_authentication" in caplog.text
    assert "error_type=ValueError" in caplog.text
    for secret in ("private-secret", "private-code", "private-token", "private-state"):
        assert secret not in caplog.text


def test_provider_read_diagnostic_keeps_type_without_secret_payload(caplog):
    async def scenario():
        service, repository, _ = build_service()
        connector = ExpiredConnector()
        connector.sync_historical = AsyncMock(
            side_effect=ValueError("private-token private-secret private-account-data")
        )
        service.registry.register(connector)
        connection = await repository.create_connection({
            "user_id": "user-1", "platform": "tradelocker", "provider": "tradelocker",
            "connection_status": "connected", "sync_status": "idle",
        })
        await service._store_access(connection, "user-1", "tradelocker", {"access_token": "private-token"})
        repository.get_integration_account = AsyncMock(return_value={
            "id": "integration-account-1", "connection_id": connection["id"],
            "user_id": "user-1", "account_id": "core-account-1", "provider": "tradelocker",
            "platform": "tradelocker", "external_account_id": "external-account-1",
        })
        repository.claim_sync_lock = AsyncMock(return_value=True)
        repository.release_sync_lock = AsyncMock()
        repository.update_integration_account = AsyncMock()
        try:
            await service.sync_integration_account("user-1", "integration-account-1")
            assert False, "The invalid provider data must fail safely"
        except IntegrationError as exc:
            assert exc.code == "provider_unavailable"

    asyncio.run(scenario())
    assert "trading_provider_read_failed provider=tradelocker error_type=ValueError" in caplog.text
    assert "private-token" not in caplog.text
    assert "private-secret" not in caplog.text
    assert "private-account-data" not in caplog.text


def test_connect_sync_reconnect_and_disconnect_flow():
    async def scenario():
        service, repository, provider = build_service()
        credentials = MT5Credentials(
            account_number="12345678",
            server_name="Broker-Demo",
            investor_password="read-only",
        )
        result = await service.connect_account("user-1", "beta", credentials)
        connection = result["connection"]
        assert result["initial_sync"]["imported_count"] == 1
        assert result["initial_sync"]["skipped_count"] == 1
        assert len(repository.events) == 2
        assert "read-only" not in str(repository.credentials)
        second = await service.sync_connection("user-1", connection["id"], "manual")
        assert second["updated_count"] == 1
        await service.reconnect("user-1", "beta", connection["id"], credentials)
        await service.disconnect("user-1", connection["id"])
        assert provider.disconnected is True
        assert connection["id"] not in repository.credentials
        assert (
            repository.connections[connection["id"]]["connection_status"]
            == "disconnected"
        )

    asyncio.run(scenario())


def test_user_cannot_read_another_users_connection():
    async def scenario():
        service, repository, _ = build_service()
        credentials = MT5Credentials(
            account_number="12345678",
            server_name="Broker-Demo",
            investor_password="read-only",
        )
        result = await service.connect_account("owner", "beta", credentials)
        assert (
            await repository.get_connection(result["connection"]["id"], "intruder")
            is None
        )

    asyncio.run(scenario())


def test_delete_inactive_provider_account_detaches_then_deletes():
    async def scenario():
        service, repository, _ = build_service()
        repository.list_integration_accounts_for_core_account = AsyncMock(
            return_value=[
                {
                    "id": "integration-account-1",
                    "account_id": "core-account-1",
                    "connection_id": "connection-1",
                    "status": "available",
                }
            ]
        )
        repository.update_integration_account = AsyncMock()
        repository.delete_account = AsyncMock()

        result = await service.delete_core_account("user-1", "core-account-1")

        assert result == {"ok": True, "detached_integration_accounts": 1}
        repository.update_integration_account.assert_awaited_once_with(
            "integration-account-1", "user-1", {"account_id": None}
        )
        repository.delete_account.assert_awaited_once_with(
            "core-account-1", "user-1"
        )

    asyncio.run(scenario())


def test_delete_active_provider_account_requires_disconnect():
    async def scenario():
        service, repository, _ = build_service()
        repository.list_integration_accounts_for_core_account = AsyncMock(
            return_value=[
                {
                    "id": "integration-account-1",
                    "account_id": "core-account-1",
                    "connection_id": "connection-1",
                    "status": "connected",
                }
            ]
        )
        repository.update_integration_account = AsyncMock()
        repository.delete_account = AsyncMock()

        try:
            await service.delete_core_account("user-1", "core-account-1")
        except IntegrationError as exc:
            assert exc.code == "account_still_connected"
        else:
            raise AssertionError("Active provider account deletion should be blocked")
        repository.update_integration_account.assert_not_awaited()
        repository.delete_account.assert_not_awaited()

    asyncio.run(scenario())


def test_single_account_authentication_runs_initial_import_immediately():
    async def scenario():
        service, repository, _ = build_service()
        repository.list_integration_accounts = AsyncMock(
            return_value=[
                {
                    "id": "integration-account-1",
                    "account_id": "core-account-1",
                    "status": "selected",
                }
            ]
        )
        service.sync_integration_account = AsyncMock(
            return_value={"imported_count": 4, "updated_count": 0}
        )

        result = await service._initial_sync_for_single_account(
            "user-1", "connection-1"
        )

        assert result == {
            "status": "success",
            "imported_count": 4,
            "updated_count": 0,
        }
        service.sync_integration_account.assert_awaited_once_with(
            "user-1", "integration-account-1", "initial_import"
        )

    asyncio.run(scenario())


def test_single_account_authentication_reports_initial_import_failure():
    async def scenario():
        service, repository, _ = build_service()
        repository.list_integration_accounts = AsyncMock(
            return_value=[
                {
                    "id": "integration-account-1",
                    "account_id": "core-account-1",
                    "status": "selected",
                }
            ]
        )
        service.sync_integration_account = AsyncMock(
            side_effect=IntegrationError(
                "provider_unavailable", "Historique indisponible.", 503
            )
        )

        result = await service._initial_sync_for_single_account(
            "user-1", "connection-1"
        )

        assert result == {
            "status": "failed",
            "error_code": "provider_unavailable",
            "message": "Historique indisponible.",
        }

    asyncio.run(scenario())


def test_orphaned_selected_account_is_recreated_for_full_history_recovery():
    async def scenario():
        service, repository, _ = build_service()
        repository.create_account = AsyncMock(
            return_value={"id": "replacement-core-account"}
        )
        repository.update_integration_account = AsyncMock(
            side_effect=lambda _id, _user_id, payload: {
                "id": "integration-account-1",
                "connection_id": "connection-1",
                "user_id": "user-1",
                "provider": "tradelocker",
                "platform": "tradelocker",
                "external_account_id": "2473950",
                "account_name": "ClickFunded",
                "broker_name": "click",
                "status": payload["status"],
                "account_id": payload["account_id"],
                "sync_cursor": payload["sync_cursor"],
                "last_successful_sync_at": payload["last_successful_sync_at"],
            }
        )
        orphan = {
            "id": "integration-account-1",
            "connection_id": "connection-1",
            "user_id": "user-1",
            "provider": "tradelocker",
            "platform": "tradelocker",
            "external_account_id": "2473950",
            "account_name": "ClickFunded",
            "broker_name": "click",
            "status": "connected",
            "account_id": None,
            "balance": "97608.84",
            "sync_cursor": {"last_execution_at": "2026-09-17T06:35:00Z"},
            "last_successful_sync_at": "2026-09-17T06:35:18Z",
        }

        repaired = await service._repair_orphaned_selected_account(
            orphan, "user-1", "tradelocker"
        )

        assert repaired["account_id"] == "replacement-core-account"
        assert repaired["sync_cursor"] == {}
        assert repaired["last_successful_sync_at"] is None
        repository.create_account.assert_awaited_once()
        repository.update_integration_account.assert_awaited_once()
        assert any(
            args[1] == "tradelocker_orphaned_account_repaired"
            for args, _kwargs in repository.audits
        )

    asyncio.run(scenario())


def test_expired_refresh_token_persists_reconnection_required_state():
    async def scenario():
        service, repository, _ = build_service()
        connection = await repository.create_connection(
            {
                "user_id": "user-1",
                "platform": "ctrader",
                "provider": "ctrader",
                "connection_status": "connected",
                "sync_status": "success",
            }
        )
        await service._store_access(
            connection,
            "user-1",
            "ctrader",
            {
                "access_token": "expired-token",
                "refresh_token": "expired-refresh-token",
                "expires_at": "2026-01-01T00:00:00+00:00",
            },
        )
        provider = AsyncMock()
        provider.refresh_auth.side_effect = IntegrationError(
            "connection_expired", "Reconnecte cTrader pour continuer.", 401
        )

        try:
            await service._fresh_access(
                IntegrationConnection.model_validate(connection), provider
            )
            assert False, "La connexion expirée doit interrompre la synchronisation"
        except IntegrationError as exc:
            assert exc.code == "connection_expired"

        persisted = repository.connections[connection["id"]]
        assert persisted["connection_status"] == "expired"
        assert persisted["sync_status"] == "failed"
        assert persisted["last_error_code"] == "connection_expired"
        assert any(
            args[1] == "ctrader_connection_expired"
            for args, _kwargs in repository.audits
        )

    asyncio.run(scenario())


def test_account_sync_failure_marks_parent_connection_expired():
    async def scenario():
        service, repository, _ = build_service()
        service.registry.register(ExpiredConnector())
        connection = await repository.create_connection(
            {
                "user_id": "user-1",
                "platform": "tradelocker",
                "provider": "tradelocker",
                "connection_status": "connected",
                "sync_status": "success",
            }
        )
        await service._store_access(
            connection,
            "user-1",
            "tradelocker",
            {"access_token": "provider-token"},
        )
        repository.get_integration_account = AsyncMock(
            return_value={
                "id": "integration-account-1",
                "connection_id": connection["id"],
                "user_id": "user-1",
                "account_id": "core-account-1",
                "provider": "tradelocker",
                "platform": "tradelocker",
                "external_account_id": "external-account-1",
                "status": "connected",
            }
        )
        repository.claim_sync_lock = AsyncMock(return_value=True)
        repository.release_sync_lock = AsyncMock()
        repository.update_integration_account = AsyncMock()

        try:
            await service.sync_integration_account(
                "user-1", "integration-account-1", "manual"
            )
            assert False, "La synchronisation expirée doit échouer"
        except IntegrationError as exc:
            assert exc.code == "connection_expired"

        persisted = repository.connections[connection["id"]]
        assert persisted["connection_status"] == "expired"
        assert persisted["sync_status"] == "failed"
        assert persisted["last_error_code"] == "connection_expired"
        repository.release_sync_lock.assert_awaited_once()

    asyncio.run(scenario())
