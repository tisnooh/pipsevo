import asyncio
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from pydantic import SecretStr

from integrations.connectors.ctrader import CTraderConnector
from integrations.connectors.tradelocker import TradeLockerConnector
from integrations.connectors.tradovate import TradovateConnector
from integrations.errors import IntegrationError
from integrations.models import IntegrationAccount, TradeLockerCredentials


def integration_account(
    provider: str, external_id: str, **metadata
) -> IntegrationAccount:
    return IntegrationAccount(
        id=f"{provider}-account",
        connection_id=f"{provider}-connection",
        user_id="user-id",
        account_id="core-account-id",
        provider=provider,
        platform=provider,
        external_account_id=external_id,
        currency="USD",
        provider_metadata=metadata,
    )


def test_tradelocker_keeps_account_id_and_sequence_number_separate(monkeypatch):
    requests = []

    async def fake_request(method, url, **kwargs):
        requests.append((method, url, kwargs))
        return {
            "accounts": [
                {
                    "id": 123456789,
                    "accNum": 2,
                    "name": "Compte Futures",
                    "currency": "USD",
                }
            ]
        }

    monkeypatch.setattr(
        "integrations.connectors.tradelocker.request_json", fake_request
    )
    connector = TradeLockerConnector(
        "https://demo.example", "https://live.example", "developer-key"
    )

    accounts = asyncio.run(
        connector.list_accounts(
            {"access_token": "token", "environment": "demo", "server": "Demo"}
        )
    )

    assert accounts[0].external_account_id == "123456789"
    assert accounts[0].provider_metadata["acc_num"] == 2
    assert requests[0][2]["headers"]["developer-api-key"] == "developer-key"
    assert "tl-developer-api-key" not in requests[0][2]["headers"]


def test_tradelocker_auth_accepts_documented_created_response(monkeypatch):
    requests = []

    async def fake_request(method, url, **kwargs):
        requests.append((method, url, kwargs))
        if url.endswith("/auth/jwt/token"):
            return {
                "accessToken": "access",
                "refreshToken": "refresh",
                "expireDate": "2030-01-02T03:04:05.000Z",
            }
        if url.endswith("/auth/jwt/all-accounts"):
            return {"accounts": [{"id": 123, "accNum": 1, "currency": "USD"}]}
        raise AssertionError(f"Unexpected request: {method} {url}")

    monkeypatch.setattr(
        "integrations.connectors.tradelocker.request_json", fake_request
    )
    connector = TradeLockerConnector("https://demo.example", "https://live.example")

    result = asyncio.run(
        connector.authenticate(
            TradeLockerCredentials(
                environment="demo",
                email="trader@example.com",
                password=SecretStr("password"),
                server="TradeLocker Demo",
            )
        )
    )

    assert result.accounts[0].external_account_id == "123"
    assert requests[0][2]["expected"] == (200, 201)
    assert requests[0][2]["provider_name"] == "tradelocker"
    assert result.tokens.expires_at == datetime(
        2030, 1, 2, 3, 4, 5, tzinfo=timezone.utc
    )


def test_tradelocker_refresh_accepts_created_and_uses_provider_expiry(monkeypatch):
    requests = []

    async def fake_request(method, url, **kwargs):
        requests.append((method, url, kwargs))
        return {
            "accessToken": "new-access",
            "refreshToken": "new-refresh",
            "expireDate": "2030-01-02T03:04:05.000Z",
        }

    monkeypatch.setattr(
        "integrations.connectors.tradelocker.request_json", fake_request
    )
    connector = TradeLockerConnector("https://demo.example", "https://live.example")

    refreshed = asyncio.run(
        connector.refresh_auth(
            {
                "environment": "demo",
                "refresh_token": "old-refresh",
                "access_token": "old-access",
            }
        )
    )

    assert requests[0][2]["expected"] == (200, 201)
    assert requests[0][2]["json"] == {"refreshToken": "old-refresh"}
    assert refreshed["access_token"] == "new-access"
    assert refreshed["refresh_token"] == "new-refresh"
    assert refreshed["expires_at"] == "2030-01-02T03:04:05+00:00"


def test_tradelocker_translates_profile_login_rejection(monkeypatch):
    async def fake_request(method, url, **kwargs):
        raise IntegrationError(
            "provider_request_rejected", "Provider rejected request", 400
        )

    monkeypatch.setattr(
        "integrations.connectors.tradelocker.request_json", fake_request
    )
    connector = TradeLockerConnector("https://demo.example", "https://live.example")

    with pytest.raises(IntegrationError) as exc:
        asyncio.run(
            connector.authenticate(
                TradeLockerCredentials(
                    environment="demo",
                    email="profile@example.com",
                    password=SecretStr("password"),
                    server="TradeLocker Demo",
                )
            )
        )

    assert exc.value.code == "tradelocker_credentials_required"


def test_tradelocker_splits_saturated_history_ranges(monkeypatch):
    calls = []

    async def fake_request(method, url, **kwargs):
        calls.append(kwargs["params"])
        if len(calls) == 1:
            return {"d": {"ordersHistory": [["truncated-1"], ["truncated-2"]]}}
        marker = "left" if len(calls) == 2 else "right"
        return {"d": {"ordersHistory": [[marker]]}}

    monkeypatch.setattr(
        "integrations.connectors.tradelocker.request_json", fake_request
    )

    async def no_sleep(_seconds):
        return None

    monkeypatch.setattr("integrations.connectors.tradelocker.asyncio.sleep", no_sleep)
    connector = TradeLockerConnector("https://demo.example", "https://live.example")
    rows, partial = asyncio.run(
        connector._order_history(
            "https://demo.example",
            "123",
            {"Authorization": "Bearer token", "accNum": "1"},
            datetime(2026, 1, 1, tzinfo=timezone.utc),
            datetime(2026, 1, 1, 0, 0, 4, tzinfo=timezone.utc),
            2,
        )
    )

    assert rows == [["left"], ["right"]]
    assert partial is False
    assert len(calls) == 3
    assert TradeLockerConnector._orders_history_limit(
        {"d": {"limits": {"ordersHistory": {"maxRows": 500}}}}
    ) == 500
    assert TradeLockerConnector._orders_history_limit(
        {
            "d": {
                "limits": [
                    {"limitType": "MAX_ORDERS_COUNT_IN_HISTORY", "limit": 10_000}
                ]
            }
        }
    ) == 10_000


def test_tradelocker_splits_when_provider_reports_has_more(monkeypatch):
    calls = []

    async def fake_request(method, url, **kwargs):
        calls.append(kwargs["params"])
        if len(calls) == 1:
            return {"d": {"ordersHistory": [["truncated"]], "hasMore": True}}
        return {"d": {"ordersHistory": [[len(calls)]], "hasMore": False}}

    async def no_sleep(_seconds):
        return None

    monkeypatch.setattr(
        "integrations.connectors.tradelocker.request_json", fake_request
    )
    monkeypatch.setattr("integrations.connectors.tradelocker.asyncio.sleep", no_sleep)
    connector = TradeLockerConnector("https://demo.example", "https://live.example")

    rows, partial = asyncio.run(
        connector._order_history(
            "https://demo.example",
            "123",
            {"Authorization": "Bearer token", "accNum": "1"},
            datetime(2026, 1, 1, tzinfo=timezone.utc),
            datetime(2026, 1, 1, 0, 0, 4, tzinfo=timezone.utc),
            None,
        )
    )

    assert rows == [[2], [3]]
    assert partial is False
    assert len(calls) == 3


def test_tradelocker_parses_numeric_timestamp_strings_and_account_balance():
    timestamp = TradeLockerConnector._time("1767951992000")
    account = TradeLockerConnector._account(
        {
            "id": "7080",
            "accNum": "1",
            "name": "Broker demo",
            "currency": "USD",
            "aaccountBalance": 2024.75,
        },
        {"environment": "demo", "server": "SERVER"},
    )

    assert timestamp == datetime.fromtimestamp(1767951992, timezone.utc)
    assert account.balance == Decimal("2024.75")


def test_tradelocker_keeps_open_positions_and_aggregates_fills():
    connector = TradeLockerConnector("https://demo.example", "https://live.example")
    rows = [
        {
            "id": 1,
            "orderId": 10,
            "tradableInstrumentId": 42,
            "_executed_at": "2026-09-01T10:00:00+00:00",
            "_quantity": "1",
            "_price": "5000",
            "_direction": "long",
            "commission": "-1",
        },
        {
            "id": 2,
            "orderId": 11,
            "tradableInstrumentId": 42,
            "_executed_at": "2026-09-01T10:05:00+00:00",
            "_quantity": "1",
            "_price": "5010",
            "_direction": "long",
            "commission": "-1",
        },
    ]

    trade = connector._group_position("99", rows, {"42": "ES"})

    assert trade is not None
    assert trade.symbol == "ES"
    assert trade.volume == Decimal("2")
    assert trade.open_price == Decimal("5005")
    assert trade.close_time is None
    assert trade.close_price is None
    assert trade.commission == Decimal("-2")


def test_ctrader_splits_windows_when_provider_reports_has_more(monkeypatch):
    connector = CTraderConnector("client", "secret", "https://example.test/callback")
    recorded = []

    async def fake_session(token, operations, live=True):
        recorded.append((token, operations, live))
        return [
            {"authenticated": True},
            {"deal": [{"dealId": 1}], "hasMore": False},
            {"deal": [{"dealId": 2}], "hasMore": False},
        ]

    monkeypatch.setattr(connector, "_session", fake_session)
    start = datetime(2026, 1, 1, tzinfo=timezone.utc)
    end = datetime(2026, 1, 3, tzinfo=timezone.utc)
    rows, partial = asyncio.run(
        connector._complete_deal_history(
            "token",
            42,
            True,
            [(start, end)],
            [{"deal": [{"dealId": 999}], "hasMore": True}],
        )
    )

    assert {row["dealId"] for row in rows} == {1, 2}
    assert partial is False
    assert len(recorded) == 1
    assert len(recorded[0][1]) == 3


def test_tradelocker_sync_uses_official_response_shapes(monkeypatch):
    requests = []

    async def fake_request(method, url, **kwargs):
        requests.append((method, url, kwargs))
        if url.endswith("/trade/config"):
            return {
                "d": {
                    "ordersHistoryConfig": {
                        "columns": [
                            {"id": "id"},
                            {"id": "positionId"},
                            {"id": "tradableInstrumentId"},
                            {"id": "side"},
                            {"id": "filledQty"},
                            {"id": "avgPrice"},
                            {"id": "createdDate"},
                            {"id": "profit"},
                        ]
                    },
                    "accountDetailsConfig": {
                        "columns": [
                            {"id": "balance"},
                            {"id": "equity"},
                            {"id": "usedMargin"},
                            {"id": "availableFunds"},
                        ]
                    },
                }
            }
        if url.endswith("/ordersHistory"):
            return {
                "d": {
                    "ordersHistory": [
                        [
                            1,
                            99,
                            42,
                            "buy",
                            1,
                            5000,
                            "2026-09-01T10:00:00Z",
                            0,
                        ],
                        [
                            2,
                            99,
                            42,
                            "sell",
                            1,
                            5010,
                            "2026-09-01T11:00:00Z",
                            250,
                        ],
                    ]
                }
            }
        if url.endswith("/state"):
            return {"d": {"accountDetailsData": [50250, 50300, 100, 50150]}}
        if url.endswith("/trade/accounts"):
            return {
                "d": [
                    {
                        "id": "123456789",
                        "status": "ACTIVE",
                        "riskRules": {
                            "dailyLossLimit": {"value": 2500},
                            "dailyProfitTarget": 1000,
                            "maxTrailingDrawdown": 5000,
                            "maxDrawdownLevel": 45000,
                        },
                    }
                ]
            }
        if url.endswith("/instruments"):
            return {"d": {"instruments": [{"tradableInstrumentId": 42, "name": "ES"}]}}
        raise AssertionError(f"Unexpected request: {method} {url}")

    monkeypatch.setattr(
        "integrations.connectors.tradelocker.request_json", fake_request
    )
    connector = TradeLockerConnector(
        "https://demo.example", "https://live.example", "developer-key"
    )
    account = integration_account("tradelocker", "123456789", acc_num=2)

    batch = asyncio.run(
        connector._sync(
            account,
            {"access_token": "token", "environment": "demo"},
            datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
    )

    account_requests = [request for request in requests if "/accounts/" in request[1]]
    assert all("/accounts/123456789/" in request[1] for request in account_requests)
    assert all(request[2]["headers"]["accNum"] == "2" for request in requests)
    assert batch.trades[0].symbol == "ES"
    assert batch.trades[0].gross_profit == Decimal("250")
    assert batch.executions[0].symbol == "ES"
    assert batch.snapshot.balance == Decimal("50250")
    assert batch.snapshot.equity == Decimal("50300")
    assert batch.snapshot.daily_loss_limit == Decimal("2500")
    assert batch.snapshot.max_drawdown == Decimal("5000")
    assert batch.snapshot.max_drawdown_level == Decimal("45000")
    assert batch.snapshot.profit_target is None
    assert batch.snapshot.provider_status == "ACTIVE"
    assert batch.snapshot.risk_rules["dailyProfitTarget"] == 1000


def test_tradelocker_ignores_cancelled_orders_and_derives_realized_pnl(monkeypatch):
    async def fake_request(method, url, **kwargs):
        if url.endswith("/trade/config"):
            return {
                "d": {
                    "ordersHistoryConfig": {
                        "columns": [
                            {"id": "id"},
                            {"id": "positionId"},
                            {"id": "tradableInstrumentId"},
                            {"id": "routeId"},
                            {"id": "side"},
                            {"id": "status"},
                            {"id": "filledQty"},
                            {"id": "avgPrice"},
                            {"id": "createdDate"},
                        ]
                    },
                    "accountDetailsConfig": {
                        "columns": [{"id": "balance"}, {"id": "equity"}]
                    },
                }
            }
        if url.endswith("/ordersHistory"):
            return {
                "d": {
                    "ordersHistory": [
                        [1, 99, 42, 7, "buy", "Filled", 1, 100, "2026-09-01T10:00:00Z"],
                        [2, 99, 42, 7, "sell", "Cancelled", None, 80, "2026-09-01T10:30:00Z"],
                        [3, 99, 42, 7, "sell", "Filled", 1, 110, "2026-09-01T11:00:00Z"],
                    ]
                }
            }
        if url.endswith("/state"):
            return {"d": {"accountDetailsData": [10050, 10050]}}
        if url.endswith("/trade/accounts"):
            return {"d": [{"id": "123456789", "status": "ACTIVE"}]}
        if url.endswith("/instruments"):
            return {
                "d": {
                    "instruments": [
                        {
                            "tradableInstrumentId": 42,
                            "name": "ES",
                            "routes": [{"id": 7, "type": "TRADE"}],
                        }
                    ]
                }
            }
        if url.endswith("/trade/instruments/42"):
            assert kwargs["params"] == {"routeId": "7"}
            return {
                "d": {
                    "tickSize": [{"leftRangeLimit": 0, "tickSize": 0.5}],
                    "tickCost": [{"leftRangeLimit": 0, "tickCost": 2.5}],
                    "lotSize": 1,
                }
            }
        raise AssertionError(f"Unexpected request: {method} {url}")

    monkeypatch.setattr(
        "integrations.connectors.tradelocker.request_json", fake_request
    )
    connector = TradeLockerConnector(
        "https://demo.example", "https://live.example", "developer-key"
    )
    account = integration_account("tradelocker", "123456789", acc_num=2)

    batch = asyncio.run(
        connector._sync(
            account,
            {"access_token": "token", "environment": "demo"},
            datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
    )

    assert len(batch.trades) == 1
    assert len(batch.executions) == 2
    assert batch.trades[0].close_price == Decimal("110")
    assert batch.trades[0].gross_profit == Decimal("50")
    assert batch.trades[0].raw_payload["pnl_source"] == "derived_tick_cost"
    assert [item.execution_type for item in batch.executions] == ["open", "close"]
    assert batch.executions[1].realized_pnl == Decimal("50")
    assert batch.next_cursor["normalization_version"] == 3


@pytest.mark.parametrize("cost", ["0", "-2", "NaN", "Infinity"])
def test_tradelocker_rejects_unusable_tick_cost_instead_of_false_zero(cost):
    result = TradeLockerConnector._realized_pnl(
        "long", Decimal("100"), Decimal("101"), Decimal("2"),
        {"tickSize": [{"tickSize": "0.01"}], "tickCost": [{"tickCost": cost}]},
    )
    assert result is None


def test_tradelocker_valid_flat_trade_is_measured_zero():
    assert TradeLockerConnector._realized_pnl(
        "short", Decimal("100"), Decimal("100"), Decimal("2"),
        {"tickSize": [{"tickSize": "0.01"}], "tickCost": [{"tickCost": "1"}]},
    ) == 0


def test_tradelocker_syncs_explicit_total_objective_when_broker_exposes_it():
    connector = TradeLockerConnector(
        "https://demo.example", "https://live.example"
    )
    risk_rules = {"profitTarget": 10000, "dailyProfitTarget": 1200}

    assert connector._first_decimal(
        risk_rules, "profitTarget", "totalProfitTarget"
    ) == Decimal("10000")
    assert connector._first_decimal(risk_rules, "missingTarget") is None


def test_tradelocker_requires_acc_num_from_reconnected_account():
    connector = TradeLockerConnector("https://demo.example", "https://live.example")
    account = integration_account("tradelocker", "123456789")

    with pytest.raises(IntegrationError) as exc:
        asyncio.run(
            connector._sync(
                account,
                {"access_token": "token", "environment": "demo"},
                datetime(2026, 1, 1, tzinfo=timezone.utc),
            )
        )

    assert exc.value.code == "provider_account_metadata_missing"


def test_tradovate_maps_account_fills_contract_and_realized_pnl(monkeypatch):
    requests = []

    async def fake_request(method, url, **kwargs):
        requests.append((method, url, kwargs))
        if url.endswith("/fill/list"):
            return [
                {
                    "id": 1,
                    "orderId": 101,
                    "contractId": 50,
                    "action": "Buy",
                    "qty": 1,
                    "price": 5000,
                    "timestamp": "2026-09-01T10:00:00Z",
                },
                {
                    "id": 2,
                    "orderId": 102,
                    "contractId": 50,
                    "action": "Sell",
                    "qty": 1,
                    "price": 5010,
                    "timestamp": "2026-09-01T11:00:00Z",
                },
                {
                    "id": 3,
                    "orderId": 103,
                    "contractId": 51,
                    "action": "Buy",
                    "qty": 1,
                    "price": 100,
                    "timestamp": "2026-09-01T10:00:00Z",
                },
            ]
        if url.endswith("/fillPair/list"):
            return [
                {"id": 30, "positionId": 10, "buyFillId": 1, "sellFillId": 2, "qty": 1},
                {"id": 40, "positionId": 20, "buyFillId": 3, "sellFillId": 4, "qty": 1},
            ]
        if url.endswith("/position/list"):
            return [{"id": 10, "accountId": 123}, {"id": 20, "accountId": 999}]
        if url.endswith("/contract/list"):
            return [{"id": 50, "name": "ESM6"}, {"id": 51, "name": "NQM6"}]
        if url.endswith("/cashBalanceLog/list"):
            return [
                {"accountId": 123, "fillPairId": 30, "realizedPnL": 125.5},
                {"accountId": 999, "fillPairId": 40, "realizedPnL": 900},
            ]
        if url.endswith("/cashBalance/getcashbalancesnapshot"):
            return {"totalCashValue": 50125.5, "netLiq": 50150}
        raise AssertionError(f"Unexpected request: {method} {url}")

    monkeypatch.setattr("integrations.connectors.tradovate.request_json", fake_request)
    connector = TradovateConnector("client", "secret", "https://example/callback")
    account = integration_account("tradovate", "123")

    batch = asyncio.run(
        connector._sync(
            account,
            {"access_token": "token"},
            datetime(2026, 1, 1, tzinfo=timezone.utc),
        )
    )

    assert len(batch.trades) == 1
    assert len(batch.executions) == 2
    assert batch.trades[0].symbol == "ESM6"
    assert batch.trades[0].gross_profit == Decimal("125.5")
    assert batch.snapshot.balance == Decimal("50125.5")
    snapshot_request = next(
        request
        for request in requests
        if request[1].endswith("/cashBalance/getcashbalancesnapshot")
    )
    assert snapshot_request[0] == "POST"
    assert snapshot_request[2]["json"] == {"accountId": 123}


def test_tradovate_oauth_uses_current_json_endpoint(monkeypatch):
    request = {}

    async def fake_request(method, url, **kwargs):
        request.update({"method": method, "url": url, **kwargs})
        return {"access_token": "token", "refresh_token": "refresh", "userId": 7}

    monkeypatch.setattr("integrations.connectors.tradovate.request_json", fake_request)
    connector = TradovateConnector(
        "client",
        "secret",
        "https://example/callback",
        "https://live.tradovateapi.com/v1/auth/oauthtoken",
    )

    monkeypatch.setattr(
        connector, "list_accounts", lambda _access: asyncio.sleep(0, result=[])
    )
    asyncio.run(connector.complete_auth(code="oauth-code"))

    assert request["method"] == "POST"
    assert request["url"].endswith("/v1/auth/oauthtoken")
    assert request["headers"]["Content-Type"] == "application/json"
    assert request["json"]["code"] == "oauth-code"
