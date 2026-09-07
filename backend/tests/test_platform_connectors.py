import asyncio
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from integrations.connectors.tradelocker import TradeLockerConnector
from integrations.connectors.tradovate import TradovateConnector
from integrations.errors import IntegrationError
from integrations.models import IntegrationAccount


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
