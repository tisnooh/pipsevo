import asyncio
import json
from datetime import datetime, timezone
from decimal import Decimal
from urllib.parse import parse_qs, urlsplit
from unittest.mock import AsyncMock

import pytest

from integrations.connectors.ctrader import CTraderConnector
from integrations.errors import IntegrationError
from integrations.models import IntegrationAccount


def test_ctrader_oauth_requests_read_only_scope():
    result = asyncio.run(CTraderConnector("client", "secret", "https://example.test/callback").start_auth(state="test-state"))
    assert parse_qs(urlsplit(result["authorization_url"]).query)["scope"] == ["accounts"]


def test_ctrader_numeric_login_is_a_display_string(monkeypatch):
    connector = CTraderConnector("client", "secret", "https://example.test/callback")
    monkeypatch.setattr(connector, "_session", AsyncMock(return_value=[{
        "ctidTraderAccount": [{"ctidTraderAccountId": 1234, "traderLogin": 5678, "isLive": True}]
    }]))
    accounts = asyncio.run(connector.list_accounts({"access_token": "test-token"}))
    assert accounts[0].display_name == "5678"
    assert accounts[0].external_account_id == "1234"


@pytest.mark.parametrize("data,code", [
    ({"errorCode": "invalid_client", "description": "secret-bearing-error"}, "provider_request_rejected"),
    ({"accessToken": None, "expiresIn": 123}, "provider_invalid_response"),
    ({"accessToken": "test-token", "expiresIn": "invalid"}, "provider_invalid_response"),
    ({"accessToken": "test-token", "expiresIn": 0}, "provider_invalid_response"),
    (None, "provider_invalid_response"),
])
def test_ctrader_token_errors_are_typed_and_do_not_expose_payload(data, code):
    with pytest.raises(IntegrationError) as caught:
        CTraderConnector._token_expiry(data)
    assert caught.value.code == code
    assert "secret-bearing-error" not in str(caught.value)
    assert "test-token" not in str(caught.value)


def test_ctrader_token_exchange_marks_server_authentication(monkeypatch):
    requests = []

    async def fake_request(*args, **kwargs):
        requests.append(kwargs)
        return {"accessToken": "test-token", "refreshToken": "test-refresh", "expiresIn": 3600}

    monkeypatch.setattr("integrations.connectors.ctrader.request_json", fake_request)
    connector = CTraderConnector("client", "secret", "https://example.test/callback")
    monkeypatch.setattr(connector, "list_accounts", AsyncMock(return_value=[]))
    result = asyncio.run(connector.complete_auth(code="test-code"))
    refreshed = asyncio.run(connector.refresh_auth({"refresh_token": "test-refresh"}))
    assert result.tokens.scope == "accounts"
    assert refreshed["access_token"] == "test-token"
    assert all(request["provider_authentication"] is True for request in requests)
    assert all(request["headers"]["Accept"] == "application/json" for request in requests)


def test_ctrader_protocol_error_logs_only_a_safe_identifier(caplog):
    socket = AsyncMock()
    socket.recv.return_value = json.dumps({"payloadType": 2142, "payload": {
        "errorCode": "INCORRECT_BOUNDARIES", "description": "private-token private-secret",
    }})
    with pytest.raises(IntegrationError):
        asyncio.run(CTraderConnector._send(socket, 2133, {"accessToken": "private-token"}, 2134))
    assert "request_type=2133 error_code=INCORRECT_BOUNDARIES" in caplog.text
    assert "private-token" not in caplog.text
    assert "private-secret" not in caplog.text


def test_ctrader_snapshot_resolves_currency_and_keeps_partial_fills(monkeypatch):
    connector = CTraderConnector("client", "secret", "https://example.test/callback")
    start = datetime.now(timezone.utc)
    deal = {"dealId": 1, "positionId": 2, "symbolId": 3, "dealStatus": "PARTIALLY_FILLED",
            "filledVolume": 100, "executionTimestamp": int(start.timestamp() * 1000),
            "executionPrice": 1.2, "tradeSide": "BUY", "commission": -2, "moneyDigits": 0}

    async def fake_session(_token, operations, live=True):
        assert operations[3][0] == 2112
        return [{}, {"symbol": [{"symbolId": 3, "symbolName": "EURUSD"}]},
                {"trader": {"balance": 7994149, "moneyDigits": 2, "depositAssetId": 9}},
                {"asset": [{"assetId": 9, "name": "EUR"}]},
                {"deal": [deal], "hasMore": False}]

    monkeypatch.setattr(connector, "_session", fake_session)
    account = IntegrationAccount(id="account", connection_id="connection", user_id="user",
                                 provider="ctrader", platform="ctrader", external_account_id="42")
    batch = asyncio.run(connector._sync(account, {"access_token": "test-token"}, start))
    assert batch.snapshot.currency == "EUR"
    assert batch.snapshot.balance == Decimal("79941.49")
    assert len(batch.executions) == 1
    assert batch.executions[0].commission == Decimal("-2")
    assert len(batch.trades) == 1


def test_ctrader_groups_protojson_int64_strings_without_losing_pnl():
    # ProtoJSON encodes int64 fields as decimal strings, including volumes.
    opened = {"dealId": "1", "positionId": "2", "orderId": "10", "symbolId": "3",
              "executionTimestamp": "1791360000000", "filledVolume": "1000000",
              "executionPrice": 1.1, "tradeSide": "BUY", "commission": "-350", "moneyDigits": 2}
    closed = {**opened, "dealId": "4", "orderId": "11", "executionTimestamp": "1791363600000",
              "executionPrice": 1.11, "tradeSide": "SELL",
              "closePositionDetail": {"grossProfit": "10000", "swap": "-50", "moneyDigits": 2}}
    trade = CTraderConnector._group_trade("2", [opened, closed], {"3": "EURUSD"})
    assert trade.volume == Decimal("10000")
    assert trade.close_time is not None
    assert trade.gross_profit == Decimal("100")
    assert trade.commission == Decimal("-7")
    assert trade.swap == Decimal("-0.5")
