import asyncio
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from integrations.connectors.metaapi import MetaApiConnector
from integrations.errors import IntegrationError
from integrations.models import IntegrationAccount
from integrations.normalization import normalize_trade


def deal(identifier, entry, volume, price, time, **values):
    return {
        "id": identifier,
        "positionId": "position-1",
        "orderId": f"order-{identifier}",
        "platform": "mt5",
        "type": "DEAL_TYPE_BUY" if entry == "DEAL_ENTRY_IN" else "DEAL_TYPE_SELL",
        "entryType": entry,
        "symbol": "EURUSD",
        "volume": volume,
        "price": price,
        "time": time,
        "profit": 0,
        "commission": 0,
        "swap": 0,
        **values,
    }


def account():
    return IntegrationAccount(
        id="integration-account", connection_id="connection", user_id="owner",
        account_id="core-account", provider="metaapi", platform="mt5",
        external_account_id="provider-account", currency="EUR",
        provider_metadata={"region": "london"},
    )


def normalized(record):
    return normalize_trade(
        record, account_id="core-account", connection_id="connection",
        integration_account_id="integration-account", provider="metaapi",
        external_account_id="provider-account",
    )


def test_partial_close_remains_open_and_keeps_realized_amount_separate():
    opening = deal("1", "DEAL_ENTRY_IN", 1, 1.1, "2026-09-01T10:00:00Z", commission=-2)
    closing = deal("2", "DEAL_ENTRY_OUT", 0.4, 1.2, "2026-09-02T10:00:00Z", profit=40, commission=-1)
    record = MetaApiConnector._group_position("position-1", [opening, closing])

    assert record.close_time is None
    assert record.close_price is None
    assert record.raw_payload["remaining_volume"] == "0.6"
    assert record.raw_payload["realized_gross_profit"] == "40"
    assert normalized(record).result_status == "open"
    assert normalized(record).pnl is None


def test_exit_only_does_not_invent_an_entry():
    closing = deal("2", "DEAL_ENTRY_OUT", 1, 1.2, "2026-09-02T10:00:00Z", profit=100)
    assert MetaApiConnector._group_position("position-1", [closing]) is None


def test_missing_costs_are_not_certified_as_zero():
    opening = deal("1", "DEAL_ENTRY_IN", 1, 1.1, "2026-09-01T10:00:00Z")
    closing = deal("2", "DEAL_ENTRY_OUT", 1, 1.2, "2026-09-02T10:00:00Z", profit=100)
    closing.pop("commission")
    record = MetaApiConnector._group_position("position-1", [opening, closing])

    assert record.raw_payload["gross_pnl_available"] is True
    assert record.raw_payload["net_pnl_available"] is False
    assert record.raw_payload["missing_cost_fields"] == ["commission"]
    assert normalized(record).gross_profit == Decimal("100")
    assert normalized(record).net_profit is None
    assert normalized(record).pnl is None


def test_complete_zero_result_and_signed_swap_are_measured():
    opening = deal("1", "DEAL_ENTRY_IN", 1, 1.1, "2026-09-01T10:00:00Z", commission=-2)
    closing = deal("2", "DEAL_ENTRY_OUT", 1, 1.2, "2026-09-02T10:00:00Z", profit=3, commission=-2, swap=1)
    record = MetaApiConnector._group_position("position-1", [opening, closing])

    assert record.raw_payload["net_pnl_available"] is True
    assert record.raw_payload["pnl_source"] == "provider"
    assert normalized(record).pnl == Decimal("0")


def test_delta_fetches_complete_position_and_preserves_opening_costs(monkeypatch):
    connector = MetaApiConnector("test-token")
    opening = deal("1", "DEAL_ENTRY_IN", 1, 1.1, "2026-09-01T10:00:00Z", commission=-2)
    closing = deal("2", "DEAL_ENTRY_OUT", 1, 1.2, "2026-09-02T10:00:00Z", profit=100, commission=-2, swap=-1)
    calls = []

    async def request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        assert method == "GET"
        if "/history-deals/time/" in url:
            return [closing]
        if url.endswith("/history-deals/position/position-1"):
            return [opening, closing]
        if url.endswith("/account-information"):
            return {"balance": 5095, "equity": 5095, "currency": "EUR"}
        raise AssertionError(url)

    monkeypatch.setattr(connector, "_request", request)
    result = asyncio.run(connector.sync_recent(account(), {"provider_account_id": "provider-account"}, {
        "last_close_time": "2026-09-02T09:59:00Z",
        "normalization_version": connector.normalization_version,
    }))

    assert len(result.trades) == 1
    assert len(result.executions) == 2
    record = result.trades[0]
    assert record.open_price == Decimal("1.1")
    assert record.open_time == datetime(2026, 9, 1, 10, tzinfo=timezone.utc)
    assert normalized(record).pnl == Decimal("95")
    assert all(url.startswith("https://mt-client-api-v1.london.agiliumtrade.ai/") for _, url, _ in calls)
    assert result.next_cursor["normalization_version"] == connector.normalization_version


def test_legacy_cursor_runs_one_full_repair(monkeypatch):
    connector = MetaApiConnector("test-token")
    marker = object()
    calls = []

    async def historical(selected, access):
        calls.append((selected, access))
        return marker

    monkeypatch.setattr(connector, "sync_historical", historical)
    async def no_network(*args, **kwargs):
        raise AssertionError("Legacy repair must not make a separate live request")
    monkeypatch.setattr(connector, "_request", no_network)
    result = asyncio.run(connector.sync_recent(account(), {}, {"last_close_time": "2026-09-02T09:59:00Z"}))
    assert result is marker
    assert len(calls) == 1


def test_regional_client_domain_and_custom_domain_are_distinct_from_provisioning():
    connector = MetaApiConnector("test-token")
    assert connector.provisioning_url == "https://mt-provisioning-api-v1.agiliumtrade.agiliumtrade.ai"
    assert connector._client_url("new-york") == "https://mt-client-api-v1.new-york.agiliumtrade.ai"
    assert MetaApiConnector("test-token", "private.example")._client_url("london") == "https://mt-client-api-v1.london.private.example"
    with pytest.raises(IntegrationError):
        connector._client_url("london.evil.test/path")


@pytest.mark.parametrize("state", ["DEPLOYED", "DEPLOYING"])
def test_finalize_poll_does_not_redeploy_active_terminal(monkeypatch, state):
    connector = MetaApiConnector("test-token")
    calls = []
    async def request(method, url, **kwargs):
        calls.append(method)
        assert method == "GET"
        return {"state": state}
    monkeypatch.setattr(connector, "_request", request)
    asyncio.run(connector.deploy("provider-account"))
    assert calls == ["GET"]


def test_duplicate_deals_do_not_double_count_fees_or_volume():
    opening = deal("1", "DEAL_ENTRY_IN", 1, 1.1, "2026-09-01T10:00:00Z", commission=-2)
    closing = deal("2", "DEAL_ENTRY_OUT", 1, 1.2, "2026-09-02T10:00:00Z", profit=100, commission=-2, swap=-1)
    record = MetaApiConnector._group_position("position-1", [opening, opening, closing, closing])
    assert record.volume == Decimal("1")
    assert normalized(record).pnl == Decimal("95")


def test_unresolved_history_is_partial_and_forces_a_repair(monkeypatch):
    connector = MetaApiConnector("test-token")
    closing = deal("2", "DEAL_ENTRY_OUT", 1, 1.2, "2026-09-02T10:00:00Z", profit=100)
    async def request(method, url, **kwargs):
        assert method == "GET"
        if "/history-deals/" in url:
            return [closing]
        return {"balance": 5100, "equity": 5100, "currency": "EUR"}
    monkeypatch.setattr(connector, "_request", request)
    result = asyncio.run(connector.sync_historical(account(), {}))
    assert result.trades == []
    assert len(result.executions) == 1
    assert result.partial_error is True
    assert result.warning_code == "history_incomplete"
    assert result.next_cursor["normalization_version"] != connector.normalization_version


def test_missing_entry_type_or_reversal_is_not_guessed():
    opening = deal("1", "DEAL_ENTRY_IN", 1, 1.1, "2026-09-01T10:00:00Z")
    closing = deal("2", "DEAL_ENTRY_INOUT", 2, 1.2, "2026-09-02T10:00:00Z", profit=100)
    assert MetaApiConnector._group_position("position-1", [opening, closing]) is None
    opening.pop("entryType")
    assert MetaApiConnector._group_position("position-1", [opening]) is None


def test_mt4_source_is_preserved_when_provider_supplies_complete_deals():
    opening = deal("1", "DEAL_ENTRY_IN", 1, 1.1, "2026-09-01T10:00:00Z", platform="mt4")
    closing = deal("2", "DEAL_ENTRY_OUT", 1, 1.2, "2026-09-02T10:00:00Z", profit=100, platform="mt4")
    assert normalized(MetaApiConnector._group_position("position-1", [opening, closing])).source == "mt4_api"


@pytest.mark.parametrize("payload", [{}, {"deals": None}, [{"type": "DEAL_TYPE_BUY"}], "bad-history"])
def test_invalid_history_is_not_reported_as_an_empty_success(payload):
    with pytest.raises(IntegrationError) as error:
        MetaApiConnector._deal_rows(payload)
    assert error.value.code == "provider_invalid_response"
