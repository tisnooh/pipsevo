from copy import deepcopy
from decimal import Decimal

import pytest

from backtest.engine import initial_state, command, advance, finish_at_data_end
from backtest.instruments import pnl, size
from backtest.analytics import summarize
from backtest.data import parse_csv


def bar(t=0, o="100", h="102", l="99", c="101"):
    return dict(timestamp=t, open=o, high=h, low=l, close=c, volume="10")


def config(symbol="ES", fee="0", slip=0):
    return dict(symbol=symbol, capital="10000", commission=fee, slippage_ticks=slip)


def order(state=None, cfg=None, **kwargs):
    return command(state or initial_state("10000"), "order", {"side": "buy", "kind": "market", "stop_loss": "95", "take_profit": "110", "risk_value": "2", **kwargs}, cfg or config(), bar())


@pytest.mark.parametrize("symbol,entry,exit_price,qty,expected", [
    ("ES", "5000", "5001", "2", "100"), ("NQ", "20000", "20010", "2", "400"),
    ("MNQ", "20000", "20010", "2", "40"), ("EURUSD", "1.10000", "1.10100", "1", "100"),
])
def test_contract_pnl(symbol, entry, exit_price, qty, expected):
    assert pnl(symbol, "buy", entry, exit_price, qty) == Decimal(expected)
    assert pnl(symbol, "sell", entry, exit_price, qty) == -Decimal(expected)


def test_market_order_never_fills_current_bar_and_is_pure():
    s = initial_state("10000")
    copy = deepcopy(s)
    queued = order(s)
    assert s == copy
    assert queued["position"] is None
    filled = advance(queued, config(), bar(60, "102", "103", "101", "102"))
    assert filled["position"]["entry"] == "102.00"
    assert queued["orders"][0]["status"] == "pending"


def test_stop_first_when_both_levels_touched():
    s = advance(order(), config(), bar(60, "101", "112", "94", "108"))
    t = s["trades"][0]
    assert t["exits"][0]["ambiguous"] is True
    assert Decimal(t["net"]) == -600
    assert t["exits"][0]["reason"] == "stop_loss"


def test_stop_gap_has_adverse_fill():
    s = advance(order(), config(), bar(60))
    s = advance(s, config(), bar(120, "90", "94", "88", "91"))
    assert Decimal(s["trades"][0]["exits"][0]["price"]) == 90


@pytest.mark.parametrize("kind,side,price,ohlc,fill", [
    ("limit", "buy", "100", ("102", "104", "99", "103"), "100"),
    ("limit", "sell", "102", ("100", "104", "99", "101"), "102"),
    ("stop", "buy", "103", ("102", "104", "100", "103"), "103"),
    ("stop", "sell", "99", ("102", "104", "98", "103"), "99"),
])
def test_order_types(kind, side, price, ohlc, fill):
    s = order(kind=kind, side=side, price=price, stop_loss="90" if side == "buy" else "120", take_profit="130" if side == "buy" else "80")
    s = advance(s, config(), bar(60, *ohlc))
    assert Decimal(s["position"]["entry"]) == Decimal(fill)


def test_pending_cancel_and_no_silent_position_defaults():
    s = order(kind="limit", price="96", stop_loss="90")
    s = advance(s, config(), bar(60))
    assert s["position"] is None
    s = command(s, "cancel", {"order_id": s["orders"][0]["id"]}, config(), bar(60))
    s = advance(s, config(), bar(120, "96", "97", "94", "96"))
    assert s["position"] is None


def test_fees_slippage_partials_balance_and_one_journal_trade():
    cfg = config(fee="4", slip=1)
    s = advance(order(cfg=cfg), cfg, bar(60, "100", "102", "99", "101"))
    assert Decimal(s["position"]["entry"]) == Decimal("100.25")
    assert Decimal(s["balance"]) == 9996
    s = command(s, "close", {"quantity": "1"}, cfg, bar(60))
    s = advance(s, cfg, bar(120, "103", "104", "102", "103"))
    assert not s["trades"]
    assert Decimal(s["balance"]) == 10119  # 9996 + 125 - 2
    s = command(s, "close", {"quantity": "1"}, cfg, bar(120))
    s = advance(s, cfg, bar(180, "104", "105", "103", "104"))
    assert len(s["trades"]) == 1
    assert Decimal(s["trades"][0]["net"]) == 292  # 125 + 175 - 8
    assert Decimal(s["balance"]) == 10292
    assert summarize(s, "10000")["trades"] == 1


def test_size_includes_fees_and_rounds_down():
    assert size("NQ", "500", "20000", "19990", "4", 1) == 2
    assert size("MNQ", "25", "20000", "19990", "4", 1) == 1
    assert size("ES", "10", "5000", "4990", "4", 1) == 0


def test_gap_can_reject_budget_risk_order():
    s = order(risk_mode="amount", risk_value="600")
    s = advance(s, config(), bar(60, "104", "105", "103", "104"))
    assert s["position"] is None
    assert s["orders"][0]["status"] == "rejected"


def test_breakeven_and_end_of_dataset_liquidation():
    s = advance(order(), config(), bar(60, "100", "105", "99", "104"))
    s = command(s, "breakeven", {}, config(), bar(60, c="104"))
    assert Decimal(s["position"]["stop_loss"]) == 100
    s = finish_at_data_end(s, config(), bar(120, "104", "105", "103", "104"))
    assert s["completed"] and s["position"] is None
    assert s["trades"][0]["exits"][0]["reason"] == "data_end"
    with pytest.raises(ValueError):
        advance(s, config(), bar(180))


def test_intrabar_limit_never_claims_optimistic_same_bar_tp():
    s = order(kind="limit", price="100", stop_loss="90", take_profit="105")
    s = advance(s, config(), bar(60, "103", "108", "99", "104"))
    assert s["position"] is not None and not s["trades"]


def test_snapshot_immutable_and_checklist_persisted():
    cfg = {**config(), "strategy": {"name": "Plan", "rules": ["Stop défini"]}}
    s = order(cfg=cfg, checklist={"Stop défini": True})
    cfg["strategy"]["name"] = "Modifié"
    assert s["orders"][0]["strategy"]["name"] == "Plan"


def test_analytics_empty_is_unknown_not_false_zero():
    a = summarize(initial_state("10000"), "10000")
    assert a["win_rate"] is None and a["profit_factor"] is None and a["expectancy"] is None


def test_csv_strict_validation_and_dst_offsets():
    raw = b"timestamp,open,high,low,close,volume\n2025-11-02T01:30:00-04:00,100,102,99,101,10\n2025-11-02T01:30:00-05:00,101,102,100,101,20\n"
    bars, q = parse_csv(raw, "ES")
    assert bars[1]["timestamp"] - bars[0]["timestamp"] == 3600
    assert q["gaps"] == 1
    for invalid in [raw.replace(b"-04:00", b""), raw.replace(b"100,102,99", b"100,98,99"), raw.replace(b"101,20", b"NaN,20")]:
        with pytest.raises(ValueError):
            parse_csv(invalid, "ES")
