from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator

Platform = Literal[
    "ctrader", "mt4", "mt5", "tradelocker", "tradovate", "ninjatrader"
]
ConnectionStatus = Literal["pending", "connected", "disconnected", "expired", "error"]
SyncStatus = Literal[
    "idle", "importing_history", "syncing", "success", "partial_error", "failed"
]
AccountStatus = Literal[
    "available", "selected", "syncing", "connected", "disconnected", "error"
]


class MT5Credentials(BaseModel):
    """Legacy direct MT5 form kept for backward compatibility."""

    model_config = ConfigDict(str_strip_whitespace=True)
    account_number: str = Field(min_length=3, max_length=32, pattern=r"^[0-9]+$")
    server_name: str = Field(min_length=2, max_length=160)
    investor_password: SecretStr
    display_name: str | None = Field(default=None, max_length=100)

    @field_validator("investor_password")
    @classmethod
    def validate_investor_password(cls, value: SecretStr) -> SecretStr:
        secret = value.get_secret_value()
        if not secret or len(secret) > 256:
            raise ValueError("Mot de passe investisseur invalide")
        return value


class MetaApiLinkRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    platform: Literal["mt4", "mt5"] = "mt5"
    name: str = Field(min_length=2, max_length=100)
    login: str = Field(min_length=3, max_length=32)
    server: str = Field(min_length=2, max_length=160)
    password: SecretStr | None = None


class TradeLockerCredentials(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)
    email: str = Field(min_length=3, max_length=254)
    password: SecretStr
    server: str = Field(min_length=2, max_length=160)
    environment: Literal["demo", "live"] = "demo"


class OAuthStartRequest(BaseModel):
    provider: Literal["ctrader", "tradovate"]
    return_path: str = Field(default="/app/settings", max_length=300)
    environment: Literal["demo", "live"] = "live"


class OAuthCallbackRequest(BaseModel):
    provider: Literal["ctrader", "tradovate"]
    code: str = Field(min_length=4, max_length=4096)
    state: str = Field(min_length=16, max_length=512)


class AccountSelectionRequest(BaseModel):
    account_ids: list[str] = Field(min_length=1, max_length=50)


class DetectedAccount(BaseModel):
    external_account_id: str
    broker_name: str | None = None
    server_name: str | None = None
    account_number_masked: str | None = None
    account_type: Literal["real", "demo", "unknown"] = "unknown"
    account_currency: str | None = None
    display_name: str | None = None
    balance: Decimal | None = None
    equity: Decimal | None = None
    provider_metadata: dict[str, Any] = Field(default_factory=dict)


class ProviderConnectionResult(BaseModel):
    account: DetectedAccount
    permanent_token: SecretStr | None = None
    requires_credentials_for_sync: bool = True


class AuthTokens(BaseModel):
    access_token: SecretStr
    refresh_token: SecretStr | None = None
    expires_at: datetime | None = None
    token_type: str = "Bearer"
    scope: str | None = None
    provider_subject: str | None = None


class AuthenticationResult(BaseModel):
    tokens: AuthTokens
    external_connection_id: str | None = None
    accounts: list[DetectedAccount] = Field(default_factory=list)
    provider_metadata: dict[str, Any] = Field(default_factory=dict)


class IntegrationConnection(BaseModel):
    id: str
    user_id: str
    account_id: str | None = None
    platform: Platform
    provider: str
    external_account_id: str | None = None
    external_connection_id: str | None = None
    broker_name: str | None = None
    server_name: str | None = None
    account_number_masked: str | None = None
    account_type: Literal["real", "demo", "unknown"] = "unknown"
    account_currency: str | None = None
    display_name: str | None = None
    auth_type: str = "credentials"
    permission_scope: str | None = None
    token_expires_at: datetime | None = None
    provider_environment: str | None = None
    provider_metadata: dict[str, Any] = Field(default_factory=dict)
    connection_status: ConnectionStatus
    sync_status: SyncStatus
    sync_cursor: dict[str, Any] = Field(default_factory=dict)
    last_successful_sync_at: datetime | None = None
    last_sync_attempt_at: datetime | None = None
    last_error_code: str | None = None
    last_error_message: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class IntegrationAccount(BaseModel):
    id: str
    connection_id: str
    user_id: str
    account_id: str | None = None
    provider: str
    platform: Platform
    external_account_id: str
    account_name: str | None = None
    account_number_masked: str | None = None
    broker_name: str | None = None
    server_name: str | None = None
    currency: str | None = None
    account_type: Literal["real", "demo", "unknown"] = "unknown"
    status: AccountStatus = "available"
    balance: Decimal | None = None
    equity: Decimal | None = None
    provider_metadata: dict[str, Any] = Field(default_factory=dict)
    sync_cursor: dict[str, Any] = Field(default_factory=dict)
    last_successful_sync_at: datetime | None = None
    last_sync_attempt_at: datetime | None = None


class ProviderExecutionRecord(BaseModel):
    provider_execution_id: str
    provider_order_id: str | None = None
    provider_position_id: str | None = None
    execution_type: str = "fill"
    symbol: str
    direction: Literal["long", "short"]
    quantity: Decimal = Field(gt=0)
    price: Decimal
    executed_at: datetime
    commission: Decimal = Decimal("0")
    fees: Decimal = Decimal("0")
    realized_pnl: Decimal = Decimal("0")
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class ProviderTradeRecord(BaseModel):
    provider_trade_id: str
    provider_order_id: str | None = None
    provider_position_id: str | None = None
    transaction_type: Literal[
        "trade", "balance", "credit", "commission", "swap", "other"
    ] = "trade"
    symbol: str
    direction: Literal["long", "short"]
    volume: Decimal = Field(gt=0)
    open_time: datetime
    close_time: datetime | None = None
    open_price: Decimal
    close_price: Decimal | None = None
    stop_loss: Decimal | None = None
    take_profit: Decimal | None = None
    gross_profit: Decimal = Decimal("0")
    commission: Decimal = Decimal("0")
    swap: Decimal = Decimal("0")
    fees: Decimal = Decimal("0")
    comment: str | None = None
    magic_number: int | None = None
    market_type: Literal["cfd", "forex", "futures", "crypto", "stocks"] = "cfd"
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class AccountSnapshot(BaseModel):
    balance: Decimal | None = None
    equity: Decimal | None = None
    margin: Decimal | None = None
    free_margin: Decimal | None = None
    currency: str | None = None
    captured_at: datetime
    raw_payload: dict[str, Any] = Field(default_factory=dict)


class NormalizedTrade(BaseModel):
    provider_trade_id: str
    provider_order_id: str | None = None
    provider_position_id: str | None = None
    account_id: str
    integration_connection_id: str
    integration_account_id: str | None = None
    source_provider: str
    external_account_id: str
    symbol: str
    instrument: str
    direction: Literal["long", "short"]
    volume: Decimal
    size: Decimal
    open_time: datetime
    close_time: datetime | None = None
    date: str
    open_price: Decimal
    close_price: Decimal | None = None
    entry: Decimal
    exit_price: Decimal | None = None
    stop_loss: Decimal | None = None
    stop: Decimal | None = None
    take_profit: Decimal | None = None
    gross_profit: Decimal
    commission: Decimal
    swap: Decimal
    fees: Decimal
    net_profit: Decimal
    pnl: Decimal
    provider_comment: str | None = None
    magic_number: int | None = None
    source: str
    market_type: str
    result_status: Literal["open", "closed"]
    imported_at: datetime


class SyncBatch(BaseModel):
    trades: list[ProviderTradeRecord] = Field(default_factory=list)
    executions: list[ProviderExecutionRecord] = Field(default_factory=list)
    snapshot: AccountSnapshot | None = None
    next_cursor: dict[str, Any] = Field(default_factory=dict)
    partial_error: bool = False
    warning_code: str | None = None


class SyncResult(BaseModel):
    imported_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    execution_count: int = 0
    error_count: int = 0
    next_cursor: dict[str, Any] = Field(default_factory=dict)
    partial_error: bool = False
