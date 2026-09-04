from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
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


def _group_performance(trades: list[dict], field: str) -> list[dict]:
    groups: dict[str, list[float]] = defaultdict(list)
    for trade in trades:
        label = str(trade.get(field) or "").strip()
        pnl = _number(trade.get("pnl"))
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


def build_atlas_context(
    user: dict,
    accounts: list[dict],
    trades: list[dict],
    payouts: list[dict] | None = None,
) -> tuple[dict, list[dict]]:
    payouts = payouts or []
    pnl_values = [_number(trade.get("pnl")) for trade in trades]
    measured_pnl = [value for value in pnl_values if value is not None]
    wins = [value for value in measured_pnl if value > 0]
    losses = [value for value in measured_pnl if value < 0]
    measured_plan = [trade.get("plan_respected") for trade in trades if isinstance(trade.get("plan_respected"), bool)]
    r_values = [_number(trade.get("r")) for trade in trades]
    measured_r = [value for value in r_values if value is not None]
    gross_profit = sum(wins)
    gross_loss = abs(sum(losses))

    rules = user.get("rules") if isinstance(user.get("rules"), dict) else {}
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
    evidence = []
    for index, trade in enumerate(trades[:MAX_EVIDENCE_TRADES], start=1):
        evidence.append(
            {
                "alias": f"T{index}",
                "trade_id": trade.get("id"),
                "date": trade.get("date"),
                "instrument": trade.get("instrument"),
                "direction": trade.get("direction"),
                "pnl": _number(trade.get("pnl")),
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
            "trades_with_r": len(measured_r),
            "trades_with_plan_status": len(measured_plan),
            "minimum_group_sample": MIN_GROUP_SAMPLE,
        },
        "metrics": {
            "net_pnl": round(sum(measured_pnl), 2),
            "wins": len(wins),
            "losses": len(losses),
            "win_rate_percent": round(len(wins) / len(measured_pnl) * 100, 1) if measured_pnl else None,
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
