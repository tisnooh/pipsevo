from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, SecretStr, field_validator

ConnectionStatus = Literal["pending", "connected", "disconnected", "expired", "error"]
SyncStatus = Literal[
    "idle", "importing_history", "syncing", "success", "partial_error", "failed"
]


class MT5Credentials(BaseModel):
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


class DetectedAccount(BaseModel):
    external_account_id: str
    broker_name: str | None = None
    server_name: str
    account_number_masked: str
    account_type: Literal["real", "demo", "unknown"] = "unknown"
    account_currency: str | None = None
    display_name: str | None = None
    balance: Decimal | None = None
    equity: Decimal | None = None


class ProviderConnectionResult(BaseModel):
    account: DetectedAccount
    permanent_token: SecretStr | None = None
    requires_credentials_for_sync: bool = True


class IntegrationConnection(BaseModel):
    id: str
    user_id: str
    account_id: str | None = None
    platform: Literal["mt5"] = "mt5"
    provider: str
    external_account_id: str
    broker_name: str | None = None
    server_name: str
    account_number_masked: str
    account_type: Literal["real", "demo", "unknown"] = "unknown"
    account_currency: str | None = None
    display_name: str | None = None
    connection_status: ConnectionStatus
    sync_status: SyncStatus
    sync_cursor: dict[str, Any] = Field(default_factory=dict)
    last_successful_sync_at: datetime | None = None
    last_sync_attempt_at: datetime | None = None
    last_error_code: str | None = None
    last_error_message: str | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


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


class NormalizedTrade(BaseModel):
    provider_trade_id: str
    provider_order_id: str | None = None
    account_id: str
    integration_connection_id: str
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
    source: Literal["mt5_api"] = "mt5_api"
    result_status: Literal["open", "closed"]
    imported_at: datetime


class SyncBatch(BaseModel):
    trades: list[ProviderTradeRecord]
    next_cursor: dict[str, Any] = Field(default_factory=dict)
    partial_error: bool = False
    warning_code: str | None = None


class SyncResult(BaseModel):
    imported_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    error_count: int = 0
    next_cursor: dict[str, Any] = Field(default_factory=dict)
    partial_error: bool = False
