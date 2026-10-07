import asyncio
from urllib.parse import parse_qs, urlsplit
from unittest.mock import AsyncMock

import pytest

from integrations.connectors.ctrader import CTraderConnector
from integrations.errors import IntegrationError


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
