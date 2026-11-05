"""Canonical, read-only financial summaries; no FX or payout guesses."""
from __future__ import annotations

from collections import defaultdict
from typing import Any

from atlas import _currency, _number, _remaining_drawdown, measured_trade_pnl


def _round(value: float | None) -> float | None:
    return round(value, 2) if value is not None else None


def _money_by_currency(rows: list[dict], field: str) -> dict[str, float]:
    result: dict[str, float] = defaultdict(float)
    for row in rows:
        if row.get("currency_available") is False:
            continue
        value = measured_trade_pnl(row) if field == "pnl" else _number(row.get(field))
        if value is not None:
            result[_currency(row)] += value
    return {currency: round(value, 2) for currency, value in sorted(result.items())}


def _single_amount(values: dict[str, float]) -> float | None:
    return next(iter(values.values())) if len(values) == 1 else None


def account_scores(account: dict) -> tuple[int | None, int | None]:
    if account.get("currency_available") is False:
        return None, None
    initial = _number(account.get("initial_balance"))
    balance = _number(account.get("balance"))
    limit = _number(account.get("max_drawdown"))
    remaining = _remaining_drawdown(account)
    if initial is None or initial <= 0 or balance is None or limit is None or limit <= 0 or remaining is None:
        return None, None
    used_ratio = max(0.0, min(1.0, (limit - remaining) / limit))
    health = int(70 + (balance - initial) / initial * 100 - used_ratio * 60)
    # A process indicator, not a statistical probability of account survival.
    survival = int(95 - used_ratio * 90)
    return max(0, min(100, health)), max(5, min(99, survival))


def _groups(trades: list[dict], field: str) -> dict[str, dict]:
    groups: dict[str, list[dict]] = defaultdict(list)
    for trade in trades:
        groups[str(trade.get(field) or "Non renseigné")].append(trade)
    result = {}
    for name, rows in groups.items():
        by_currency = _money_by_currency(rows, "pnl")
        wins = sum(measured_trade_pnl(row) > 0 for row in rows)
        result[name] = {
            "trades": len(rows), "wins": wins,
            "pnl": _single_amount(by_currency), "pnl_by_currency": by_currency,
            "currencies": list(by_currency), "winrate": round(wins / len(rows) * 100, 1),
        }
    return result


def native_trade_currency(row: dict, account: dict) -> dict:
    explicit = row.get("provider_currency") or row.get("currency")
    native = explicit or account.get("currency")
    provider = bool(row.get("source_provider") or row.get("integration_account_id") or row.get("integration_connection_id"))
    available = row.get("currency_available") is not False and (
        bool(explicit) or account.get("currency_available") is not False and bool(native or not provider)
    )
    return {**row, "provider_currency": native, "currency_available": available}


def build_financial_dashboard(accounts: list[dict], trades: list[dict], payouts: list[dict]) -> dict[str, Any]:
    account_map = {row["id"]: row for row in accounts}
    trades = [native_trade_currency(row, account_map.get(row.get("account_id"), {})) for row in trades]
    measured = [row for row in trades if row.get("currency_available") is not False and measured_trade_pnl(row) is not None]
    wins = [row for row in measured if measured_trade_pnl(row) > 0]
    losses = [row for row in measured if measured_trade_pnl(row) < 0]
    net_by_currency = _money_by_currency(measured, "pnl")
    one_trade_currency = len(net_by_currency) == 1
    gross_profit = sum(measured_trade_pnl(row) for row in wins)
    gross_loss = abs(sum(measured_trade_pnl(row) for row in losses))
    # JSON cannot represent Infinity; the explicit unbounded flag retains its meaning.
    factor_unbounded = bool(one_trade_currency and not losses and wins)
    factor = gross_profit / gross_loss if one_trade_currency and gross_loss else 0.0 if one_trade_currency and not wins else None

    payout_rows = [{
        **row, "currency": row.get("currency") or account_map.get(row.get("account_id"), {}).get("currency") or "USD",
        "currency_available": bool(row.get("currency")) or account_map.get(row.get("account_id"), {}).get("currency_available", True),
    } for row in payouts]
    initial_by_currency = _money_by_currency(accounts, "initial_balance")
    balance_by_currency = _money_by_currency(accounts, "balance")
    payout_by_currency = _money_by_currency(payout_rows, "amount")
    remaining_by_currency: dict[str, float] = defaultdict(float)
    unknown_drawdown = 0
    for row in accounts:
        if row.get("currency_available") is False:
            unknown_drawdown += 1
            continue
        remaining = _remaining_drawdown(row)
        if remaining is None:
            unknown_drawdown += 1
        else:
            remaining_by_currency[_currency(row)] += remaining
    remaining_by_currency = {currency: round(value, 2) for currency, value in sorted(remaining_by_currency.items())}

    measured_plan = [row for row in trades if str(row.get("result_status") or "").lower() not in {"cancelled", "canceled"} and isinstance(row.get("plan_respected"), bool)]
    plan_rate = sum(row["plan_respected"] for row in measured_plan) / len(measured_plan) * 100 if measured_plan else None
    discipline = int(max(0, min(100, plan_rate * 0.7 + 30))) if plan_rate is not None else None
    survival_values = [score for account in accounts if (score := account_scores(account)[1]) is not None]
    survival = int(sum(survival_values) / len(survival_values)) if survival_values else None
    winrate = len(wins) / len(measured) * 100 if measured else None
    trader_score = int((discipline + survival + winrate) / 3) if all(value is not None for value in (discipline, survival, winrate)) else None

    date_pnl: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))
    for row in measured:
        date_pnl[str(row.get("date") or "")[:10]][_currency(row)] += measured_trade_pnl(row)
    running: dict[str, float] = defaultdict(float)
    curves: dict[str, list[dict]] = defaultdict(list)
    for day, currencies in sorted(date_pnl.items()):
        for currency, pnl in sorted(currencies.items()):
            running[currency] += pnl
            curves[currency].append({"date": day, "equity": round(running[currency], 2), "currency": currency})
    curves = {currency: rows[-180:] for currency, rows in sorted(curves.items())}

    setups = _groups(measured, "setup")
    sessions = _groups(measured, "session")
    comparable_setups = {name: row for name, row in setups.items() if row["trades"] >= 2 and row["pnl"] is not None}
    comparable_setups = comparable_setups if one_trade_currency else {}
    unknown = [row for row in trades if str(row.get("result_status") or "").lower() not in {"open", "cancelled", "canceled"} and (row.get("currency_available") is False or measured_trade_pnl(row) is None)]
    all_currencies = sorted(set(initial_by_currency) | set(balance_by_currency) | set(net_by_currency) | set(payout_by_currency))
    one_currency = len(all_currencies) == 1
    unknown_account_currency = sum(row.get("currency_available") is False for row in accounts)
    unknown_payout_currency = sum(row.get("currency_available") is False for row in payout_rows)
    return {
        "kpis": {
            "funded_capital": _single_amount(initial_by_currency) if one_currency and not unknown_account_currency else None,
            "total_balance": _single_amount(balance_by_currency) if one_currency and not unknown_account_currency else None,
            "total_profit": _single_amount(net_by_currency) if one_currency else None,
            "net_pnl": _single_amount(net_by_currency) if one_currency else None,
            "remaining_drawdown": _single_amount(remaining_by_currency) if one_currency and not unknown_drawdown else None,
            "estimated_payout": None,
            "discipline_score": discipline, "trader_score": trader_score, "survival_score": survival,
            "total_payouts": _single_amount(payout_by_currency) if one_currency and not unknown_payout_currency else None,
            "active_accounts": sum(row.get("status") == "active" for row in accounts),
            "total_trades": len(measured), "logged_trades": len(trades),
        },
        "metrics": {
            "winrate": round(winrate, 1) if winrate is not None else None,
            "profit_factor": _round(factor), "profit_factor_unbounded": factor_unbounded,
            "avg_win": _round(gross_profit / len(wins)) if one_trade_currency and wins else None,
            "avg_loss": _round(-gross_loss / len(losses)) if one_trade_currency and losses else None,
            "plan_respect_rate": round(plan_rate, 1) if plan_rate is not None else None,
        },
        "currency": all_currencies[0] if one_currency else None,
        "currencies": all_currencies,
        "amounts_by_currency": {
            "funded_capital": initial_by_currency, "total_balance": balance_by_currency,
            "net_pnl": net_by_currency, "remaining_drawdown": remaining_by_currency,
            "total_payouts": payout_by_currency,
        },
        "equity_curve": next(iter(curves.values())) if len(curves) == 1 else [],
        "equity_curves_by_currency": curves,
        "setups": setups, "sessions": sessions,
        "best_setup": max(comparable_setups, key=lambda name: comparable_setups[name]["pnl"]) if comparable_setups else None,
        "worst_setup": min(comparable_setups, key=lambda name: comparable_setups[name]["pnl"]) if comparable_setups else None,
        "data_quality": {
            "measured_trades": len(measured), "unmeasured_closed_trades": len(unknown),
            "trades_with_unknown_currency": sum(row.get("currency_available") is False for row in trades),
            "open_trades": sum(str(row.get("result_status") or "").lower() == "open" for row in trades),
            "accounts_with_unknown_drawdown": unknown_drawdown,
            "accounts_with_unknown_currency": unknown_account_currency,
            "payouts_with_unknown_currency": unknown_payout_currency,
            "mixed_currencies": len(all_currencies) > 1, "history_complete": True,
            "payout_estimate_available": False,
        },
    }
