from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from .models import (
    DetectedAccount,
    IntegrationConnection,
    MT5Credentials,
    ProviderConnectionResult,
    SyncBatch,
)


class BrokerIntegrationProvider(ABC):
    """Common contract for every current or future broker connector."""

    provider_id: str
    platform: str

    @abstractmethod
    async def test_connection(self, credentials: MT5Credentials) -> DetectedAccount:
        raise NotImplementedError

    @abstractmethod
    async def connect_account(
        self, credentials: MT5Credentials
    ) -> ProviderConnectionResult:
        raise NotImplementedError

    @abstractmethod
    async def disconnect_account(
        self, connection: IntegrationConnection, access: dict[str, Any]
    ) -> None:
        raise NotImplementedError

    @abstractmethod
    async def fetch_account(
        self, connection: IntegrationConnection, access: dict[str, Any]
    ) -> DetectedAccount:
        raise NotImplementedError

    @abstractmethod
    async def fetch_historical_trades(
        self, connection: IntegrationConnection, access: dict[str, Any]
    ) -> SyncBatch:
        raise NotImplementedError

    @abstractmethod
    async def fetch_recent_trades(
        self,
        connection: IntegrationConnection,
        access: dict[str, Any],
        cursor: dict[str, Any],
    ) -> SyncBatch:
        raise NotImplementedError

    @abstractmethod
    async def refresh_connection(
        self,
        connection: IntegrationConnection,
        credentials: MT5Credentials,
    ) -> ProviderConnectionResult:
        raise NotImplementedError

    @abstractmethod
    async def get_connection_status(
        self, connection: IntegrationConnection, access: dict[str, Any]
    ) -> str:
        raise NotImplementedError

    async def verify_webhook(self, _headers: dict[str, str], _body: bytes) -> bool:
        return False


class MT5IntegrationProvider(BrokerIntegrationProvider, ABC):
    """Provider-independent MT5 contract.

    Concrete network adapters are intentionally absent until PipsEvo has a
    real provider contract and test credentials.
    """

    platform = "mt5"


class MetaApiProvider(MT5IntegrationProvider, ABC):
    """Reserved extension point; no MetaApi network integration is shipped."""


class BrokerDirectProvider(MT5IntegrationProvider, ABC):
    """Reserved extension point for an authorized broker/prop-firm API."""


class HostedMT5Provider(MT5IntegrationProvider, ABC):
    """Reserved extension point for PipsEvo-controlled MT5 infrastructure."""


class ProviderRegistry:
    def __init__(self):
        self._providers: dict[str, BrokerIntegrationProvider] = {}

    def register(self, provider: BrokerIntegrationProvider) -> None:
        if not provider.provider_id:
            raise ValueError("Un provider_id est requis")
        self._providers[provider.provider_id] = provider

    def get(self, provider_id: str | None) -> BrokerIntegrationProvider | None:
        return self._providers.get(provider_id or "")

    def has(self, provider_id: str | None) -> bool:
        return self.get(provider_id) is not None


provider_registry = ProviderRegistry()
