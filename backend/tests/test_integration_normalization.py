from datetime import datetime, timezone
from decimal import Decimal

from integrations.models import ProviderTradeRecord
from integrations.normalization import normalize_batch, normalize_trade


def trade(**overrides):
    payload = {
        "provider_trade_id": "deal-1",
        "symbol": "EURUSD",
        "direction": "long",
        "volume": "0.20",
        "open_time": datetime(2026, 7, 1, tzinfo=timezone.utc),
        "close_time": datetime(2026, 7, 1, 1, tzinfo=timezone.utc),
        "open_price": "1.10",
        "close_price": "1.11",
        "gross_profit": "25",
        "commission": "-2",
        "swap": "-1",
        "fees": "0.50",
    }
    payload.update(overrides)
    return ProviderTradeRecord(**payload)


def test_normalizes_costs_and_net_profit():
    result = normalize_trade(
        trade(),
        account_id="account",
        connection_id="connection",
        provider="fake",
        external_account_id="external",
    )
    assert result.net_profit == Decimal("21.50")
    assert result.result_status == "closed"
    assert result.source == "mt5_api"


def test_ignores_balance_operations_and_deduplicates_batch():
    balance = trade(provider_trade_id="balance-1", transaction_type="balance")
    rows, skipped = normalize_batch(
        [trade(), trade(gross_profit="30"), balance],
        account_id="account",
        connection_id="connection",
        provider="fake",
        external_account_id="external",
    )
    assert len(rows) == 1
    assert rows[0].gross_profit == Decimal("30")
    assert skipped == 1
