import asyncio
from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock

import pytest

from integrations.connectors.tradelocker import TradeLockerConnector
from integrations.errors import IntegrationError
from integrations.models import IntegrationAccount, TradeLockerCredentials
from integrations.normalization import normalize_trade


def account():
    return IntegrationAccount(
        id="integration-1", connection_id="connection-1", user_id="owner-1",
        account_id="account-1", provider="tradelocker", platform="tradelocker",
        external_account_id="123", currency="USD", provider_metadata={"acc_num": 2},
    )


def order(order_id, position_id, side, date, price, qty=1, **extra):
    return {
        "id": order_id, "positionId": position_id, "tradableInstrumentId": 42,
        "routeId": 7, "side": side, "status": "Filled", "filledQty": qty,
        "avgPrice": price, "createdDate": date, **extra,
    }


@pytest.fixture
def provider(monkeypatch):
    connector = TradeLockerConnector("https://demo.example", "https://live.example")
    fixture = {"orders": [], "details": [{"id": "123", "currency": "EUR"}], "requests": [],
               "routes": [{"id": 7, "type": "TRADE"}, {"id": 9, "type": "INFO"}]}

    async def request(method, url, **kwargs):
        fixture["requests"].append((url, kwargs))
        if url.endswith("/trade/config"):
            return {"d": {}}
        if url.endswith("/ordersHistory"):
            start = kwargs["params"]["from"]
            return {"d": {"ordersHistory": [
                row for row in fixture["orders"]
                if connector._time(row["createdDate"]).timestamp() * 1000 >= start
            ]}}
        if url.endswith("/state"):
            return {"d": {"balance": 0, "equity": 0, "availableFunds": 0, "freeMargin": 999}}
        if url.endswith("/trade/accounts"):
            return {"d": fixture["details"]}
        if url.endswith("/instruments"):
            return {"d": {"instruments": [{"tradableInstrumentId": 42, "name": "TEST", "routes": fixture["routes"]}]}}
        if url.endswith("/trade/instruments/42"):
            assert kwargs["params"] == {"routeId": "7"}
            return {"d": {"tickSize": [{"tickSize": "0.5"}], "tickCost": [{"tickCost": "2.5"}]}}
        raise AssertionError(url)

    monkeypatch.setattr("integrations.connectors.tradelocker.request_json", request)
    return connector, fixture


def run_sync(connector):
    return asyncio.run(connector.sync_historical(account(), {"access_token": "test", "environment": "demo"}))


def test_snapshot_uses_native_currency_and_preserves_zero_balances(provider):
    connector, fixture = provider
    fixture["details"][0].update({"initialBalance": 10000, "riskRules": {"profitTarget": 1500}})
    snapshot = run_sync(connector).snapshot
    assert snapshot.currency == "EUR"
    assert snapshot.balance == snapshot.equity == snapshot.free_margin == 0
    assert snapshot.initial_balance == Decimal("10000")
    assert snapshot.profit_target == Decimal("1500")
    detected = connector._account({"id": "123", "accNum": 2, "accountBalance": 0, "aaccountBalance": 999}, {})
    assert detected.balance == 0


def test_never_imports_another_accounts_currency_or_rules(provider):
    connector, fixture = provider
    fixture["details"] = [{"id": "999", "currency": "GBP", "initialBalance": 50000, "riskRules": {"profitTarget": 9999}}]
    snapshot = run_sync(connector).snapshot
    assert snapshot.currency == "USD"
    assert snapshot.initial_balance is snapshot.profit_target is snapshot.max_drawdown is None
    assert snapshot.risk_rules == {}


def test_opening_zero_does_not_hide_missing_closing_pnl(provider):
    connector, fixture = provider
    fixture["orders"] = [
        order(1, 99, "buy", "2026-09-01T10:00:00Z", 100, profit=0, commission=-2, fee=-1, swap=0),
        order(2, 99, "sell", "2026-09-01T11:00:00Z", 110, commission=3, fee=2, swap=-4),
    ]
    batch = run_sync(connector)
    trade = batch.trades[0]
    assert trade.raw_payload["pnl_source"] == "derived_tick_cost"
    assert trade.raw_payload["net_pnl_available"] is True
    assert trade.gross_profit == Decimal("50")
    assert trade.commission == 5 and trade.fees == 3 and trade.swap == -4
    normalized = normalize_trade(trade, account_id="account-1", connection_id="connection-1",
                                 provider="tradelocker", external_account_id="123")
    assert normalized.result_status == "closed"
    assert normalized.net_profit == Decimal("38")
    assert [execution.fees for execution in batch.executions] == [1, 2]


def test_partial_close_and_later_full_close_keep_original_opening(provider):
    connector, fixture = provider
    opening = order(1, 99, "buy", "2026-09-01T10:00:00Z", 100, qty=2)
    fixture["orders"] = [opening]
    first = run_sync(connector)
    assert first.trades[0].close_time is None
    assert first.next_cursor["replay_from"] <= opening["createdDate"]
    access = {"access_token": "test", "environment": "demo"}

    fixture["orders"].append(order(2, 99, "sell", "2026-09-02T10:00:00Z", 110, profit=50))
    partial = asyncio.run(connector.sync_recent(account(), access, first.next_cursor))
    assert partial.trades[0].close_time is None
    assert partial.trades[0].volume == 2

    fixture["orders"].append(order(3, 99, "sell", "2026-09-03T10:00:00Z", 120, profit=100))
    closed = asyncio.run(connector.sync_recent(account(), access, partial.next_cursor))
    assert closed.trades[0].direction == "long"
    assert closed.trades[0].open_price == 100
    assert closed.trades[0].close_price == 115
    assert closed.trades[0].gross_profit == 150
    assert closed.trades[0].close_time is not None

    # A subsequent overlap must not replace the closed position with its exit.
    repeated = asyncio.run(connector.sync_recent(account(), access, closed.next_cursor))
    assert repeated.trades[0].model_dump() == closed.trades[0].model_dump()


def test_boundary_replay_releases_old_closed_positions(provider):
    connector, fixture = provider
    fixture["orders"] = [
        order(1, 99, "buy", "2026-09-01T10:00:00Z", 100),
        order(2, 99, "sell", "2026-09-02T10:00:00Z", 110, profit=50),
        order(3, 100, "buy", "2026-09-03T10:00:00Z", 100),
    ]
    batch = run_sync(connector)
    assert connector._time(batch.next_cursor["replay_from"]) == datetime(2026, 9, 3, 9, 55, tzinfo=timezone.utc)


def test_old_accounts_and_incomplete_cursors_get_historical_repair():
    connector = TradeLockerConnector("https://demo.example", "https://live.example")
    connector._sync = AsyncMock()
    for cursor in ({"normalization_version": 3, "replay_from": "2026-10-01T10:00:00Z"},
                   {"normalization_version": 4, "replay_from": "2026-10-01T10:00:00Z"},
                   {"normalization_version": 5, "replay_from": "2026-10-01T10:00:00Z"},
                   {"normalization_version": 6, "replay_from": "2026-10-01T10:00:00Z"},
                   {"normalization_version": 6, "last_execution_at": "2026-10-01T10:00:00Z"}):
        asyncio.run(connector.sync_recent(account(), {}, cursor))
        assert connector._sync.call_args.args[2] < datetime(2020, 1, 1, tzinfo=timezone.utc)


def test_missing_advertised_routes_does_not_use_order_route_or_invent_pnl(provider):
    connector, fixture = provider
    fixture["routes"] = []
    fixture["orders"] = [
        order(1, 99, "buy", "2026-09-01T10:00:00Z", 100),
        order(2, 99, "sell", "2026-09-01T11:00:00Z", 110),
    ]
    batch = run_sync(connector)
    assert batch.trades[0].raw_payload["pnl_source"] == "unavailable"
    assert not any(url.endswith("/trade/instruments/42") for url, _ in fixture["requests"])


def test_invalid_numeric_results_fall_back_to_valid_values():
    connector = TradeLockerConnector("https://demo.example", "https://live.example")
    assert connector._closing_profit({"profit": "NaN", "realizedPnl": "0"}) == 0
    assert connector._first_decimal({"balance": "Infinity", "fallback": "0"}, "balance", "fallback") == 0
    assert connector._closing_profit({"profit": "NaN"}) is None


@pytest.mark.parametrize("result_fields", [{}, {"profit": 50}])
def test_gross_profit_is_not_net_profit_without_explicit_costs(provider, result_fields):
    connector, fixture = provider
    fixture["orders"] = [
        order(1, 99, "buy", "2026-09-01T10:00:00Z", 100),
        order(2, 99, "sell", "2026-09-01T11:00:00Z", 110, **result_fields),
    ]
    trade = run_sync(connector).trades[0]
    assert trade.gross_profit == 50
    assert trade.raw_payload["gross_pnl_available"] is True
    assert trade.raw_payload["net_pnl_available"] is False
    assert trade.raw_payload["missing_cost_fields"] == ["commission", "fees", "swap"]
    normalized = normalize_trade(trade, account_id="a", connection_id="c", provider="tradelocker", external_account_id="123")
    assert normalized.gross_profit == 50
    assert normalized.pnl is normalized.net_profit is None


def test_explicit_zero_costs_are_valid_but_a_missing_or_invalid_cost_is_unknown(provider):
    connector, fixture = provider
    fixture["orders"] = [
        order(1, 99, "buy", "2026-09-01T10:00:00Z", 100, commission=0, fee=0, swap=0),
        order(2, 99, "sell", "2026-09-01T11:00:00Z", 110, commission=0, fee=0, swap=0),
    ]
    assert run_sync(connector).trades[0].raw_payload["net_pnl_available"] is True
    fixture["orders"][1]["commission"] = "NaN"
    trade = run_sync(connector).trades[0]
    assert trade.raw_payload["missing_cost_fields"] == ["commission"]
    assert trade.raw_payload["net_pnl_available"] is False
    assert trade.commission == 0


def test_instrument_routes_prefer_documented_trade_and_deduplicate():
    assert TradeLockerConnector._instrument_routes({"routes": [
        {"id": 9, "type": "INFO"}, {"id": 7, "type": "TRADE"},
        {"id": 7, "type": "TRADE"}, {"id": None, "type": "INFO"},
        {"id": 99, "type": "UNKNOWN"},
    ]}) == ["7", "9"]
    assert TradeLockerConnector._instrument_routes({"routes": [{"id": 9, "type": "INFO"}]}) == ["9"]


@pytest.mark.parametrize("first_result", ["zero", "rejected", "invalid"])
def test_instrument_pricing_falls_back_to_legacy_info_only_when_needed(monkeypatch, first_result):
    calls = []
    pricing = {"tickSize": [{"tickSize": "0.5"}], "tickCost": [{"tickCost": "2.5"}]}

    async def request(method, url, **kwargs):
        calls.append(kwargs["params"]["routeId"])
        if calls[-1] == "7":
            if first_result == "rejected":
                raise IntegrationError("provider_request_rejected", "rejected")
            if first_result == "invalid":
                return None
            return {"d": {"tickSize": [{"tickSize": ".5"}], "tickCost": [{"tickCost": "0"}]}}
        return {"d": pricing}

    monkeypatch.setattr("integrations.connectors.tradelocker.request_json", request)
    sleep = AsyncMock()
    monkeypatch.setattr("integrations.connectors.tradelocker.asyncio.sleep", sleep)
    connector = TradeLockerConnector("https://demo.example", "https://live.example")
    details = asyncio.run(connector._instrument_details("https://demo.example", {}, {"42": ["7", "9"]}))
    assert details == {"42": pricing}
    assert calls == ["7", "9"]
    sleep.assert_awaited_once_with(0.55)


@pytest.mark.parametrize("code", ["invalid_credentials", "rate_limit", "provider_unavailable"])
def test_pricing_fallback_never_bypasses_denied_access_or_provider_limits(monkeypatch, code):
    request = AsyncMock(side_effect=IntegrationError(code, "safe message"))
    monkeypatch.setattr("integrations.connectors.tradelocker.request_json", request)
    connector = TradeLockerConnector("https://demo.example", "https://live.example")
    with pytest.raises(IntegrationError) as error:
        asyncio.run(connector._instrument_details("https://demo.example", {}, {"42": ["7", "9"]}))
    assert error.value.code == code
    assert request.await_count == 1


def test_no_route_returns_usable_pricing_and_no_net_result_is_invented(monkeypatch):
    request = AsyncMock(return_value={"d": {"tickSize": [{"tickSize": ".5"}], "tickCost": [{"tickCost": 0}]}})
    monkeypatch.setattr("integrations.connectors.tradelocker.request_json", request)
    monkeypatch.setattr("integrations.connectors.tradelocker.asyncio.sleep", AsyncMock())
    connector = TradeLockerConnector("https://demo.example", "https://live.example")
    details = asyncio.run(connector._instrument_details("https://demo.example", {}, {"42": ["7", "9"]}))
    assert connector._realized_pnl("long", Decimal(100), Decimal(110), Decimal(1), details["42"]) is None
    assert request.await_count == 2


def test_developer_key_is_attached_to_token_and_refresh_without_being_logged(monkeypatch, caplog):
    calls = []

    async def request(method, url, **kwargs):
        calls.append((url, kwargs))
        return {"accessToken": "access", "refreshToken": "refresh"}

    monkeypatch.setattr("integrations.connectors.tradelocker.request_json", request)
    connector = TradeLockerConnector("https://demo.example", "https://live.example", "private-developer-test-key")
    connector.list_accounts = AsyncMock(return_value=[])
    asyncio.run(connector.authenticate(TradeLockerCredentials(
        email="test@example.com", password="private-password", server="BROKER", environment="demo",
    )))
    asyncio.run(connector.refresh_auth({"environment": "demo", "refresh_token": "refresh"}))
    assert all(kwargs["headers"]["developer-api-key"] == "private-developer-test-key" for _, kwargs in calls)
    assert "private-developer-test-key" not in caplog.text
    assert "private-password" not in caplog.text


def test_financial_diagnostic_logs_only_coverage_not_private_payload(provider, caplog):
    connector, fixture = provider
    fixture["orders"] = [
        order(12345, 67890, "buy", "2026-09-01T10:00:00Z", 100, comment="private-trader-note"),
        order(12346, 67890, "sell", "2026-09-01T11:00:00Z", 110),
    ]
    with caplog.at_level("INFO", logger="pipsevo.integrations.tradelocker"):
        run_sync(connector)
    assert "closed=1 gross_verified=1 net_verified=0 missing_commission=1 missing_fees=1 missing_swap=1" in caplog.text
    assert "private-trader-note" not in caplog.text
    assert "12345" not in caplog.text and "67890" not in caplog.text
