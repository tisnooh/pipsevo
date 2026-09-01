from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any

from .models import (
    AuthenticationResult,
    DetectedAccount,
    IntegrationAccount,
    IntegrationConnection,
    MT5Credentials,
    ProviderConnectionResult,
    SyncBatch,
)


class TradingConnector(ABC):
    """Read-only contract shared by all supported trading sources."""

    provider_id: str
    platforms: tuple[str, ...]
    auth_type: str
    read_only: bool = True

    def capability(self) -> dict[str, Any]:
        return {
            "provider": self.provider_id,
            "platforms": list(self.platforms),
            "auth_type": self.auth_type,
            "read_only": self.read_only,
        }

    async def start_auth(self, **_kwargs) -> dict[str, Any]:
        raise NotImplementedError

    async def complete_auth(self, **_kwargs) -> AuthenticationResult:
        raise NotImplementedError

    async def refresh_auth(self, access: dict[str, Any]) -> dict[str, Any]:
        return access

    @abstractmethod
    async def list_accounts(self, access: dict[str, Any]) -> list[DetectedAccount]: ...

    async def get_account(
        self, external_account_id: str, access: dict[str, Any]
    ) -> DetectedAccount | None:
        return next(
            (
                account
                for account in await self.list_accounts(access)
                if account.external_account_id == external_account_id
            ),
            None,
        )

    async def get_open_positions(
        self, _account: IntegrationAccount, _access: dict[str, Any]
    ) -> list[dict[str, Any]]:
        """Optional read-only capability; an empty list is never persisted as history."""
        return []

    @abstractmethod
    async def sync_historical(self, account: IntegrationAccount, access: dict[str, Any]) -> SyncBatch: ...

    @abstractmethod
    async def sync_recent(self, account: IntegrationAccount, access: dict[str, Any], cursor: dict[str, Any]) -> SyncBatch: ...

    async def disconnect(self, _connection: IntegrationConnection, _access: dict[str, Any]) -> None:
        return None

    async def get_connection_status(self, _connection: IntegrationConnection, _access: dict[str, Any]) -> str:
        return "connected"


class BrokerIntegrationProvider(ABC):
    """Legacy connector contract kept while old MT5 adapters migrate."""

    provider_id: str
    platform: str

    @abstractmethod
    async def test_connection(self, credentials: MT5Credentials) -> DetectedAccount: ...
    @abstractmethod
    async def connect_account(self, credentials: MT5Credentials) -> ProviderConnectionResult: ...
    @abstractmethod
    async def disconnect_account(self, connection: IntegrationConnection, access: dict[str, Any]) -> None: ...
    @abstractmethod
    async def fetch_account(self, connection: IntegrationConnection, access: dict[str, Any]) -> DetectedAccount: ...
    @abstractmethod
    async def fetch_historical_trades(self, connection: IntegrationConnection, access: dict[str, Any]) -> SyncBatch: ...
    @abstractmethod
    async def fetch_recent_trades(self, connection: IntegrationConnection, access: dict[str, Any], cursor: dict[str, Any]) -> SyncBatch: ...
    @abstractmethod
    async def refresh_connection(self, connection: IntegrationConnection, credentials: MT5Credentials) -> ProviderConnectionResult: ...
    @abstractmethod
    async def get_connection_status(self, connection: IntegrationConnection, access: dict[str, Any]) -> str: ...


class MT5IntegrationProvider(BrokerIntegrationProvider, ABC):
    platform = "mt5"


class MetaApiProvider(MT5IntegrationProvider, ABC):
    pass


class BrokerDirectProvider(MT5IntegrationProvider, ABC):
    pass


class HostedMT5Provider(MT5IntegrationProvider, ABC):
    pass


class ProviderRegistry:
    def __init__(self):
        self._providers: dict[str, Any] = {}

    def register(self, provider: Any) -> None:
        if not provider.provider_id:
            raise ValueError("Un provider_id est requis")
        self._providers[provider.provider_id] = provider

    def get(self, provider_id: str | None):
        return self._providers.get(provider_id or "")

    def has(self, provider_id: str | None) -> bool:
        return self.get(provider_id) is not None

    def has_legacy(self, provider_id: str | None) -> bool:
        return isinstance(self.get(provider_id), BrokerIntegrationProvider)

    def all(self) -> list[Any]:
        return list(self._providers.values())


provider_registry = ProviderRegistry()
