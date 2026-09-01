from __future__ import annotations

from datetime import datetime, timezone
from typing import Iterable

from .models import NormalizedTrade, ProviderTradeRecord

NON_TRADE_OPERATIONS = {"balance", "credit", "commission", "swap", "other"}


def transaction_identity(
    provider: str, external_account_id: str, provider_trade_id: str
) -> tuple[str, str, str]:
    return provider, external_account_id, provider_trade_id


def normalize_trade(
    record: ProviderTradeRecord,
    *,
    account_id: str,
    connection_id: str,
    provider: str,
    external_account_id: str,
    integration_account_id: str | None = None,
    imported_at: datetime | None = None,
) -> NormalizedTrade | None:
    if record.transaction_type in NON_TRADE_OPERATIONS:
        return None
    commission_cost = abs(record.commission)
    swap_cost = record.swap
    fees_cost = abs(record.fees)
    net_profit = record.gross_profit - commission_cost + swap_cost - fees_cost
    closed = record.close_time is not None and record.close_price is not None
    return NormalizedTrade(
        provider_trade_id=record.provider_trade_id,
        provider_order_id=record.provider_order_id,
        provider_position_id=record.provider_position_id,
        account_id=account_id,
        integration_connection_id=connection_id,
        integration_account_id=integration_account_id,
        source_provider=provider,
        external_account_id=external_account_id,
        symbol=record.symbol,
        instrument=record.symbol,
        direction=record.direction,
        volume=record.volume,
        size=record.volume,
        open_time=record.open_time,
        close_time=record.close_time,
        date=record.open_time.date().isoformat(),
        open_price=record.open_price,
        close_price=record.close_price,
        entry=record.open_price,
        exit_price=record.close_price,
        stop_loss=record.stop_loss,
        stop=record.stop_loss,
        take_profit=record.take_profit,
        gross_profit=record.gross_profit,
        commission=commission_cost,
        swap=swap_cost,
        fees=fees_cost,
        net_profit=net_profit,
        pnl=net_profit,
        provider_comment=record.comment,
        magic_number=record.magic_number,
        source=(
            "mt5_api"
            if provider in {"fake", "mt5", "metaapi"}
            else f"{provider}_api"
        ),
        market_type="futures" if record.market_type == "futures" else "cfd",
        result_status="closed" if closed else "open",
        imported_at=imported_at or datetime.now(timezone.utc),
    )


def normalize_batch(
    records: Iterable[ProviderTradeRecord],
    *,
    account_id: str,
    connection_id: str,
    provider: str,
    external_account_id: str,
    integration_account_id: str | None = None,
) -> tuple[list[NormalizedTrade], int]:
    normalized: dict[tuple[str, str, str], NormalizedTrade] = {}
    skipped = 0
    for record in records:
        trade = normalize_trade(
            record,
            account_id=account_id,
            connection_id=connection_id,
            provider=provider,
            external_account_id=external_account_id,
            integration_account_id=integration_account_id,
        )
        if trade is None:
            skipped += 1
            continue
        identity = transaction_identity(
            provider, external_account_id, trade.provider_trade_id
        )
        normalized[identity] = trade
    return list(normalized.values()), skipped


def json_safe_trade(trade: NormalizedTrade) -> dict:
    payload = trade.model_dump(mode="json")
    payload["external_position_id"] = payload.pop("provider_position_id", None)
    # stop_loss is the provider model name; the journal schema stores it in stop.
    payload.pop("stop_loss", None)
    # An external provider cannot know whether the user's plan was respected.
    # Null means "not reviewed" and avoids inventing discipline data.
    payload["plan_respected"] = None
    return payload
