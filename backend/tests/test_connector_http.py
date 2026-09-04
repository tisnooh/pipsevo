import asyncio
import logging

import pytest
import requests

from integrations.connectors.http import request_json
from integrations.errors import IntegrationError


class FakeResponse:
    def __init__(self, status_code, payload=None):
        self.status_code = status_code
        self._payload = payload
        self.content = b"{}" if payload is not None else b""

    def json(self):
        return self._payload


def test_metaapi_provider_auth_error_identifies_server_configuration(monkeypatch, caplog):
    def fake_request(*args, **kwargs):
        return FakeResponse(401, {"message": "token=do-not-log"})

    monkeypatch.setattr(requests, "request", fake_request)
    with caplog.at_level(logging.WARNING), pytest.raises(IntegrationError) as caught:
        asyncio.run(
            request_json(
                "GET",
                "https://mt-provisioning-api-v1.example.test/accounts",
                headers={"auth-token": "super-secret"},
                provider_authentication=True,
                provider_name="metaapi",
            )
        )

    assert caught.value.code == "provider_not_configured"
    assert caught.value.status_code == 503
    assert "METAAPI_TOKEN" in caught.value.public_message
    assert "super-secret" not in caplog.text
    assert "do-not-log" not in caplog.text
    assert "provider=metaapi" in caplog.text


def test_user_credentials_remain_distinct_from_provider_credentials(monkeypatch):
    def fake_request(*args, **kwargs):
        return FakeResponse(403)

    monkeypatch.setattr(requests, "request", fake_request)
    with pytest.raises(IntegrationError) as caught:
        asyncio.run(request_json("POST", "https://broker.example.test/session"))

    assert caught.value.code == "invalid_credentials"
    assert caught.value.status_code == 401
    assert "METAAPI_TOKEN" not in caught.value.public_message
