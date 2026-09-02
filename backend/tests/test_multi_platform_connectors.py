import asyncio
from pydantic import SecretStr
from datetime import datetime, timezone
from decimal import Decimal

from integrations.config import IntegrationConfig
from integrations.connectors.ctrader import CTraderConnector
from integrations.connectors.metaapi import MetaApiConnector
from integrations.models import MetaApiLinkRequest
from integrations.models import ProviderTradeRecord
from integrations.normalization import json_safe_trade, normalize_trade
from integrations.repository import SupabaseIntegrationRepository


class RecordingCollection:
    def __init__(self):
        self.updates = []
        self.deletes = []

    async def update_one(self, query, update, **options):
        self.updates.append((query, update, options))

    async def delete_one(self, query):
        self.deletes.append(query)


class RecordingDatabase:
    def __init__(self):
        self.accounts = RecordingCollection()
        self.trades = RecordingCollection()


def test_provider_flags_require_complete_credentials(monkeypatch):
    monkeypatch.setenv("CTRADER_CLIENT_ID", "client")
    monkeypatch.delenv("CTRADER_CLIENT_SECRET", raising=False)
    monkeypatch.setenv("TRADELOCKER_ENABLED", "true")
    config = IntegrationConfig.from_env()
    assert "ctrader" not in config.enabled_providers
    assert "tradelocker" in config.enabled_providers


def test_default_integration_plans_match_current_subscription_catalog(monkeypatch):
    monkeypatch.delenv("MT5_ALLOWED_PLANS", raising=False)

    config = IntegrationConfig.from_env()

    assert config.allowed_plans == ("free", "beta", "essential", "pro")


def test_metaapi_password_uses_direct_connection_without_configuration_link(monkeypatch):
    requests = []

    async def fake_request(method, url, **kwargs):
        requests.append((method, url, kwargs))
        return {"id": "meta-account", "state": "DEPLOYED"}

    monkeypatch.setattr(
        "integrations.connectors.metaapi.request_json", fake_request
    )
    connector = MetaApiConnector("token")
    result = asyncio.run(
        connector.create_configuration_link(
            MetaApiLinkRequest(
                platform="mt5",
                name="Compte principal",
                login="12345678",
                server="Broker-Demo",
                password=SecretStr("investor-password"),
            )
        )
    )

    assert result["mode"] == "direct"
    assert result["configuration_link"] is None
    assert len(requests) == 1
    assert len(requests[0][2]["headers"]["transaction-id"]) == 32
    assert requests[0][2]["json"]["type"] == "cloud-g2"


def test_normalized_provider_trade_does_not_invent_plan_compliance():
    trade = normalize_trade(
        ProviderTradeRecord(
            provider_trade_id="position-1",
            symbol="NQ",
            direction="long",
            volume="1",
            open_time=datetime(2026, 8, 1, tzinfo=timezone.utc),
            close_time=datetime(2026, 8, 1, 1, tzinfo=timezone.utc),
            open_price="20000",
            close_price="20010",
            gross_profit="200",
            market_type="futures",
        ),
        account_id="account",
        connection_id="connection",
        integration_account_id="integration-account",
        provider="tradovate",
        external_account_id="external",
    )
    payload = json_safe_trade(trade)
    assert payload["source"] == "tradovate_api"
    assert payload["market_type"] == "futures"
    assert payload["plan_respected"] is None


def test_ctrader_partial_fills_are_grouped_as_one_position():
    rows = [
        {
            "dealId": 1,
            "orderId": 10,
            "positionId": 99,
            "symbolId": 4,
            "tradeSide": "BUY",
            "filledVolume": 100,
            "executionTimestamp": 1_785_500_000_000,
            "executionPrice": 1.1,
            "commission": -1,
        },
        {
            "dealId": 2,
            "orderId": 11,
            "positionId": 99,
            "symbolId": 4,
            "tradeSide": "SELL",
            "filledVolume": 100,
            "executionTimestamp": 1_785_500_100_000,
            "executionPrice": 1.2,
            "commission": -1,
            "closePositionDetail": {"grossProfit": 100, "swap": -2},
        },
    ]
    trade = CTraderConnector._group_trade("99", rows, {"4": "EURUSD"})
    assert trade.provider_trade_id == "99"
    assert trade.open_price == Decimal("1.1")
    assert trade.close_price == Decimal("1.2")
    assert trade.commission == Decimal("-0.02")


def test_metaapi_partial_fills_are_grouped_as_one_position():
    rows = [
        {
            "id": "deal-1",
            "orderId": "order-1",
            "positionId": "position-1",
            "type": "DEAL_TYPE_BUY",
            "entryType": "DEAL_ENTRY_IN",
            "symbol": "EURUSD",
            "volume": 0.5,
            "price": 1.1,
            "time": "2026-08-01T10:00:00.000Z",
            "commission": -1,
        },
        {
            "id": "deal-2",
            "orderId": "order-2",
            "positionId": "position-1",
            "type": "DEAL_TYPE_BUY",
            "entryType": "DEAL_ENTRY_IN",
            "symbol": "EURUSD",
            "volume": 0.5,
            "price": 1.2,
            "time": "2026-08-01T10:05:00.000Z",
            "commission": -1,
        },
        {
            "id": "deal-3",
            "orderId": "order-3",
            "positionId": "position-1",
            "type": "DEAL_TYPE_SELL",
            "entryType": "DEAL_ENTRY_OUT",
            "symbol": "EURUSD",
            "volume": 1,
            "price": 1.3,
            "time": "2026-08-01T11:00:00.000Z",
            "commission": -1,
            "profit": 150,
        },
    ]

    trade = MetaApiConnector._group_position("position-1", rows)

    assert trade is not None
    assert trade.volume == Decimal("1.0")
    assert trade.open_price == Decimal("1.15")
    assert trade.close_price == Decimal("1.3")
    assert trade.gross_profit == Decimal("150")
    assert trade.commission == Decimal("-3")


def test_config_startup_rejects_enabled_connectors_without_vault():
    config = IntegrationConfig(
        mt5_auto_sync_enabled=False,
        provider=None,
        encryption_keys=(),
        encryption_key_version=1,
        max_connection_attempts=5,
        connection_attempt_window_minutes=15,
        sync_retry_attempts=2,
        sync_backoff_seconds=0.01,
        sync_interval_minutes=5,
        allowed_plans=("beta", "pro"),
        enabled_providers=("tradelocker",),
    )
    try:
        config.validate_for_startup(False, True)
        assert False, "startup should reject an enabled provider without encryption keys"
    except RuntimeError as exc:
        assert "INTEGRATION_ENCRYPTION_KEYS" in str(exc)


def test_core_account_is_mirrored_with_the_same_id():
    async def scenario():
        mirror = RecordingDatabase()
        repository = SupabaseIntegrationRepository(
            "https://project.supabase.co", "publishable", "secret", mirror_db=mirror
        )
        account = {
            "id": "core-account-id",
            "user_id": "user-id",
            "name": "Compte synchronisé",
            "firm": "cTrader",
            "market_type": "cfd",
            "balance": 50_000,
            "initial_balance": 50_000,
            "profit_target": 0,
            "max_drawdown": 0,
            "daily_loss_limit": 0,
            "current_drawdown": 0,
            "status": "active",
        }

        async def request(method, path, **_kwargs):
            assert method == "POST"
            assert path == "/rest/v1/accounts"
            return [account]

        repository._request = request
        result = await repository.create_account(account)

        assert result["id"] == "core-account-id"
        query, update, options = mirror.accounts.updates[0]
        assert query == {"id": "core-account-id", "user_id": "user-id"}
        assert update["$setOnInsert"]["id"] == "core-account-id"
        assert options == {"upsert": True}

    asyncio.run(scenario())


def test_provider_update_is_idempotent_and_preserves_journal_enrichment():
    async def scenario():
        mirror = RecordingDatabase()
        repository = SupabaseIntegrationRepository(
            "https://project.supabase.co", "publishable", "secret", mirror_db=mirror
        )
        requests = []

        async def request(method, path, **kwargs):
            requests.append((method, path, kwargs))
            if method == "GET":
                return [{"id": "trade-id"}]
            return []

        repository._request = request
        payload = {
            "user_id": "user-id",
            "account_id": "core-account-id",
            "source_provider": "ctrader",
            "external_account_id": "external-account",
            "provider_trade_id": "position-42",
            "instrument": "EURUSD",
            "direction": "long",
            "pnl": 125.5,
            "notes": "Cette note locale doit rester intacte",
            "tags": ["discipline"],
            "plan_respected": True,
        }

        action = await repository.upsert_trade(payload)

        assert action == "updated"
        get_request = requests[0]
        assert get_request[2]["params"]["provider_trade_id"] == "eq.position-42"
        query, update, options = mirror.trades.updates[0]
        assert query == {
            "user_id": "user-id",
            "source_provider": "ctrader",
            "external_account_id": "external-account",
            "provider_trade_id": "position-42",
        }
        assert update["$set"]["id"] == "trade-id"
        assert "notes" not in update["$set"]
        assert "tags" not in update["$set"]
        assert "plan_respected" not in update["$set"]
        assert update["$setOnInsert"]["notes"] is None
        assert update["$setOnInsert"]["tags"] == []
        assert update["$setOnInsert"]["plan_respected"] is None
        assert options == {"upsert": True}

    asyncio.run(scenario())
