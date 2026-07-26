import asyncio
import base64
import os
import uuid
from datetime import datetime, timezone

from pydantic import SecretStr

from integrations.config import IntegrationConfig
from integrations.models import (
    DetectedAccount,
    MT5Credentials,
    ProviderConnectionResult,
    ProviderTradeRecord,
    SyncBatch,
)
from integrations.providers import MT5IntegrationProvider, ProviderRegistry
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
