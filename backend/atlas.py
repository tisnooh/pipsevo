from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
import json
import math
from typing import Any


MIN_GROUP_SAMPLE = 2
MAX_EVIDENCE_TRADES = 30


def _number(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def measured_trade_pnl(trade: dict) -> float | None:
    """Return monetary P&L only when the value is actually measured.

    Older provider imports stored ``0`` when the upstream platform had not
    exposed a monetary result. Treating that placeholder as real data makes
    net P&L and daily performance look valid while they are not.
    """
    pnl = _number(trade.get("pnl"))
    if pnl is None:
        return None
    metadata = trade.get("provider_metadata")
    pnl_source = (
        str(metadata.get("pnl_source") or "").strip().lower()
        if isinstance(metadata, dict)
        else ""
    )
    provider_trade = bool(
        trade.get("integration_connection_id")
        or trade.get("integration_account_id")
        or trade.get("source_provider")
    )
    if provider_trade and (
        pnl_source == "unavailable" or (pnl == 0 and not pnl_source)
    ):
        return None
    return pnl


def _group_performance(trades: list[dict], field: str) -> list[dict]:
    groups: dict[str, list[float]] = defaultdict(list)
    for trade in trades:
        label = str(trade.get(field) or "").strip()
        pnl = measured_trade_pnl(trade)
        if label and pnl is not None:
            groups[label].append(pnl)
    return sorted(
        (
            {
                "name": name,
                "sample_size": len(values),
                "pnl": round(sum(values), 2),
                "average_pnl": round(sum(values) / len(values), 2),
                "eligible_for_comparison": len(values) >= MIN_GROUP_SAMPLE,
            }
            for name, values in groups.items()
        ),
        key=lambda row: (row["eligible_for_comparison"], row["pnl"]),
        reverse=True,
    )


def _date_key(value: Any) -> str:
    raw = str(value or "")
    if len(raw) >= 10:
        return raw[:10]
    return raw


def trade_outcome(trade: dict) -> int | None:
    """Return 1/-1/0 for win/loss/breakeven, or None when unmeasured.

    Provider trades normally use their net P&L. Legacy synchronized rows may
    contain a placeholder zero because their provider did not expose monetary
    P&L yet; for those rows only, the price movement still provides a reliable
    win/loss outcome.
    """
    status = str(trade.get("result_status") or "").strip().lower()
    if status in {"open", "cancelled", "canceled"}:
        return None
    raw_pnl = _number(trade.get("pnl"))
    pnl = measured_trade_pnl(trade)
    if pnl is not None and pnl != 0:
        return 1 if pnl > 0 else -1
    if pnl == 0:
        return 0
    entry = _number(trade.get("entry"))
    if entry is None:
        entry = _number(trade.get("open_price"))
    exit_price = _number(trade.get("exit_price"))
    if exit_price is None:
        exit_price = _number(trade.get("close_price"))
    if entry is None or exit_price is None:
        return 0 if raw_pnl == 0 and pnl is not None else None
    direction = str(trade.get("direction") or "").strip().lower()
    movement = exit_price - entry
    if direction in {"short", "sell", "vente"}:
        movement = -movement
    elif direction not in {"long", "buy", "achat"}:
        return 0 if movement == 0 and pnl is not None else None
    return 1 if movement > 0 else -1 if movement < 0 else 0


def build_atlas_context(
    user: dict,
    accounts: list[dict],
    trades: list[dict],
    payouts: list[dict] | None = None,
) -> tuple[dict, list[dict]]:
    payouts = payouts or []
    pnl_values = [measured_trade_pnl(trade) for trade in trades]
    measured_pnl = [value for value in pnl_values if value is not None]
    outcomes = [outcome for trade in trades if (outcome := trade_outcome(trade)) is not None]
    winning_outcomes = [outcome for outcome in outcomes if outcome > 0]
    losing_outcomes = [outcome for outcome in outcomes if outcome < 0]
    wins = [value for value in measured_pnl if value > 0]
    losses = [value for value in measured_pnl if value < 0]
    measured_plan: list[bool] = [
        value
        for trade in trades
        if isinstance((value := trade.get("plan_respected")), bool)
    ]
    r_values = [_number(trade.get("r")) for trade in trades]
    measured_r = [value for value in r_values if value is not None]
    gross_profit = sum(wins)
    gross_loss = abs(sum(losses))

    rules_value = user.get("rules")
    rules: dict[str, Any] = rules_value if isinstance(rules_value, dict) else {}
    max_trades = int(_number(rules.get("max_trades")) or 0)
    by_day: dict[str, list[dict]] = defaultdict(list)
    for trade in trades:
        if key := _date_key(trade.get("date")):
            by_day[key].append(trade)
    overtrading_days = [
        {"date": day, "trade_count": len(rows), "limit": max_trades}
        for day, rows in sorted(by_day.items())
        if max_trades > 0 and len(rows) > max_trades
    ]

    setup_performance = _group_performance(trades, "setup")
    session_performance = _group_performance(trades, "session")
    evidence: list[dict[str, Any]] = []
    for index, trade in enumerate(trades[:MAX_EVIDENCE_TRADES], start=1):
        evidence.append(
            {
                "alias": f"T{index}",
                "trade_id": trade.get("id"),
                "date": trade.get("date"),
                "instrument": trade.get("instrument"),
                "direction": trade.get("direction"),
                "pnl": measured_trade_pnl(trade),
                "r": _number(trade.get("r")),
                "setup": trade.get("setup"),
                "session": trade.get("session"),
                "emotion": trade.get("emotion"),
                "plan_respected": trade.get("plan_respected") if isinstance(trade.get("plan_respected"), bool) else None,
                "mistakes": trade.get("mistakes") if isinstance(trade.get("mistakes"), list) else [],
            }
        )

    context = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "trader": {
            "name": user.get("name"),
            "trader_type": user.get("trader_type"),
        },
        "data_quality": {
            "total_trades": len(trades),
            "trades_with_pnl": len(measured_pnl),
            "trades_with_outcome": len(outcomes),
            "trades_with_r": len(measured_r),
            "trades_with_plan_status": len(measured_plan),
            "minimum_group_sample": MIN_GROUP_SAMPLE,
        },
        "metrics": {
            "net_pnl": round(sum(measured_pnl), 2) if measured_pnl else None,
            "wins": len(winning_outcomes),
            "losses": len(losing_outcomes),
            "win_rate_percent": round(len(winning_outcomes) / len(outcomes) * 100, 1) if outcomes else None,
            "profit_factor": round(gross_profit / gross_loss, 2) if gross_loss else None,
            "average_win": round(gross_profit / len(wins), 2) if wins else None,
            "average_loss": round(sum(losses) / len(losses), 2) if losses else None,
            "average_r": round(sum(measured_r) / len(measured_r), 2) if measured_r else None,
            "plan_respect_percent": round(sum(measured_plan) / len(measured_plan) * 100, 1) if measured_plan else None,
        },
        "rules": {"max_trades_per_day": max_trades or None},
        "overtrading_days": overtrading_days,
        "setup_performance": setup_performance,
        "session_performance": session_performance,
        "accounts": [
            {
                "id": account.get("id"),
                "name": account.get("name"),
                "firm": account.get("firm"),
                "market_type": account.get("market_type"),
                "daily_loss_limit": _number(account.get("daily_loss_limit")),
                "max_drawdown": _number(account.get("max_drawdown")),
            }
            for account in accounts
        ],
        "payouts": {
            "count": len(payouts),
            "total_amount": round(sum(value for row in payouts if (value := _number(row.get("amount"))) is not None), 2),
            "records": [
                {
                    "date": row.get("date"),
                    "amount": _number(row.get("amount")),
                    "account_id": row.get("account_id"),
                    "status": row.get("status"),
                }
                for row in payouts[:20]
            ],
        },
        "evidence": evidence,
    }
    return context, evidence


def build_atlas_prompt(question: str, context_tag: str, context: dict) -> str:
    return (
        f"Question du trader : {question}\n"
        f"Angle demandé : {context_tag}\n\n"
        "Données PipsEvo fiables (JSON) :\n"
        f"{json.dumps(context, ensure_ascii=False, separators=(',', ':'))}\n\n"
        "Règles d'interprétation : une valeur null signifie non mesurée. "
        "Ne transforme jamais une donnée absente en zéro. Ne désigne un meilleur ou pire "
        "setup/session que parmi les groupes où eligible_for_comparison=true. "
        "Si l’échantillon ne permet pas la conclusion demandée, indique explicitement que les données sont insuffisantes. "
        "Pour chaque exemple de trade, cite son alias [Tn]."
    )
