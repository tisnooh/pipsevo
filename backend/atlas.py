from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
import json
import math
import re
from typing import Any


MIN_GROUP_SAMPLE = 2
MAX_EVIDENCE_TRADES = 30
HIGH_RISK_EMOTIONS = {
    "fomo",
    "frustré",
    "frustre",
    "en colère",
    "en colere",
    "revenge trading",
    "surconfiant",
    "euphorique",
    "impatient",
    "fatigué",
    "fatigue",
    "distrait",
}
CONTEXT_GUIDANCE = {
    "overall": "Donne une synthèse équilibrée du processus, sans surpondérer le P&L.",
    "review": "Compare la période disponible et propose une revue structurée des habitudes mesurées.",
    "discipline": "Priorise le respect du plan, les checklists, l’overtrading et les règles personnelles.",
    "risk": "Priorise le risque par trade, les limites quotidiennes, les séries de pertes et la protection du compte.",
    "emotions": "Priorise les états émotionnels documentés. Ne prétends jamais à une causalité statistique.",
    "setups": "Compare uniquement les setups dont eligible_for_comparison=true et rappelle la taille des échantillons.",
    "mistakes": "Identifie uniquement les erreurs explicitement journalisées et leur fréquence observée.",
    "performance": "Sépare performance mesurée, qualité des données et discipline. Ne déduis pas de rendement futur.",
    "daily_briefing": "Explique le bilan quotidien déterministe, puis limite le plan d’action aux priorités déjà présentes dans coaching_briefing.",
    "weekly_review": "Transforme le bilan hebdomadaire déterministe en revue structurée. Ne remplace ni ne contredis ses alertes et priorités.",
    "post_trade": "Analyse uniquement le trade placé dans focus_trade. Sépare qualité du processus et résultat financier.",
}


def _number(value: Any) -> float | None:
    if value is None or value == "" or isinstance(value, bool):
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
    if trade.get("currency_available") is False:
        return None
    pnl = _number(trade.get("pnl"))
    if pnl is None:
        return None
    if str(trade.get("result_status") or "").lower() in {"open", "cancelled", "canceled"}:
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
    if isinstance(metadata, dict) and metadata.get("net_pnl_available") is False:
        return None
    if trade.get("source_provider") in {"tradelocker", "metaapi"} and (
        not isinstance(metadata, dict) or metadata.get("net_pnl_available") is not True
    ):
        # Legacy imports assumed that absent costs were zero.
        return None
    pricing = metadata.get("instrument_pricing") if isinstance(metadata, dict) else None
    if pnl_source == "derived_tick_cost" and isinstance(pricing, dict):
        costs = pricing.get("tickCost")
        if isinstance(costs, list) and not any(
            (_number(row.get("tickCost")) or 0) > 0 for row in costs if isinstance(row, dict)
        ):
            return None
    if provider_trade and (
        pnl_source == "unavailable" or (pnl == 0 and not pnl_source)
    ):
        return None
    return pnl


def _currency(row: dict) -> str:
    """Match the journal's native-currency handling, without FX conversion."""
    if row.get("currency_available") is False:
        return "UNKNOWN"
    return str(row.get("provider_currency") or row.get("currency") or "USD").strip().upper() or "USD"


def _monetary_total(rows: list[dict], field: str = "pnl") -> float | None:
    measured = [(row, measured_trade_pnl(row) if field == "pnl" else _number(row.get(field))) for row in rows]
    measured = [(row, value) for row, value in measured if value is not None and row.get("currency_available") is not False]
    if not measured or len({_currency(row) for row, _ in measured}) > 1:
        return None
    return round(sum(value for _, value in measured), 2)


def _remaining_drawdown(account: dict) -> float | None:
    """Use an explicit floor/reference; never invent a trailing high-water mark."""
    if account.get("currency_available") is False:
        return None
    balance = _number(account.get("balance"))
    limit = _number(account.get("max_drawdown"))
    basis = _number(account.get("equity")) if account.get("drawdown_basis") == "equity" else balance
    if balance is None or balance < 0 or basis is None or limit is None or limit <= 0:
        return None
    floor = _number(account.get("drawdown_floor") if account.get("drawdown_floor") is not None else account.get("max_drawdown_level"))
    reported_used = _number(account.get("current_drawdown"))
    mode = str(account.get("drawdown_mode") or account.get("drawdown_type") or "").lower()
    if floor is not None and floor >= 0:
        return max(0, basis - floor)
    initial = _number(account.get("initial_balance"))
    if mode in {"static", "fixed", "fixe"} and initial is not None and initial > 0:
        return max(0, basis - initial + limit)
    if reported_used is not None and reported_used >= 0:
        return max(0, limit - reported_used)
    if mode in {"trailing", "suiveur", "trailing_balance", "trailing_equity"}:
        high_water_mark = _number(account.get("high_water_mark"))
        return max(0, basis - high_water_mark + limit) if high_water_mark is not None and high_water_mark >= basis else None
    static_estimate_allowed = not mode and not account.get("source_provider") and not account.get("integration_account_id")
    if (static_estimate_allowed or mode in {"static", "fixed", "fixe"}) and initial is not None and initial > 0:
        return max(0, basis - initial + limit)
    return None


def _group_performance(trades: list[dict], field: str) -> list[dict]:
    groups: dict[str, list[float]] = defaultdict(list)
    currencies: dict[str, set[str]] = defaultdict(set)
    for trade in trades:
        label = str(trade.get(field) or "").strip()
        pnl = measured_trade_pnl(trade)
        if label and pnl is not None:
            groups[label].append(pnl)
            currencies[label].add(_currency(trade))
    comparable_currency = len(set().union(*currencies.values())) <= 1
    return sorted(
        (
            {
                "name": name,
                "sample_size": len(values),
                "pnl": round(sum(values), 2) if len(currencies[name]) == 1 else None,
                "average_pnl": round(sum(values) / len(values), 2) if len(currencies[name]) == 1 else None,
                "currencies": sorted(currencies[name]),
                "eligible_for_comparison": len(values) >= MIN_GROUP_SAMPLE and len(currencies[name]) == 1 and comparable_currency,
            }
            for name, values in groups.items()
        ),
        key=lambda row: (row["eligible_for_comparison"], row["pnl"] or 0),
        reverse=True,
    )


def _date_key(value: Any) -> str:
    raw = str(value or "")
    if len(raw) >= 10:
        return raw[:10]
    return raw


def _closure_order_key(trade: dict) -> str:
    closed, exit_time = str(trade.get("closed_at") or ""), str(trade.get("exit_time") or "")
    if re.match(r"^\d{4}-\d{2}-\d{2}[T ]", closed):
        timestamp = closed
    elif re.match(r"^\d{4}-\d{2}-\d{2}[T ]", exit_time):
        timestamp = exit_time
    else:
        clock = exit_time if re.match(r"^\d{2}:\d{2}", exit_time) else "00:00:00"
        timestamp = f"{_date_key(trade.get('exit_date') or trade.get('date'))}T{clock}"
    return f"{timestamp}|{trade.get('created_at') or ''}|{trade.get('id') or ''}"


def trade_outcome(trade: dict) -> int | None:
    """Classify the measured net result; prices alone do not include costs."""
    pnl = measured_trade_pnl(trade)
    return None if pnl is None else 1 if pnl > 0 else -1 if pnl < 0 else 0


def build_atlas_context(
    user: dict,
    accounts: list[dict],
    trades: list[dict],
    payouts: list[dict] | None = None,
) -> tuple[dict, list[dict]]:
    payouts = payouts or []
    active_trades = [row for row in trades if str(row.get("result_status") or "").lower() not in {"cancelled", "canceled"}]
    closed_trades = [row for row in active_trades if str(row.get("result_status") or "").lower() != "open"]
    pnl_values = [measured_trade_pnl(trade) for trade in trades]
    measured_pnl = [value for value in pnl_values if value is not None]
    currencies = sorted({_currency(trade) for trade in trades if measured_trade_pnl(trade) is not None})
    one_currency = len(currencies) <= 1
    outcomes = [outcome for trade in trades if (outcome := trade_outcome(trade)) is not None]
    winning_outcomes = [outcome for outcome in outcomes if outcome > 0]
    losing_outcomes = [outcome for outcome in outcomes if outcome < 0]
    wins = [value for value in measured_pnl if value > 0]
    losses = [value for value in measured_pnl if value < 0]
    measured_plan: list[bool] = [
        value
        for trade in active_trades
        if isinstance((value := trade.get("plan_respected")), bool)
    ]
    r_values = [_number(trade.get("r")) for trade in closed_trades if trade_outcome(trade) is not None]
    measured_r = [value for value in r_values if value is not None]
    gross_profit = sum(wins)
    gross_loss = abs(sum(losses))

    plan_groups: dict[bool, list[float]] = {True: [], False: []}
    for trade in trades:
        plan_value = trade.get("plan_respected")
        pnl_value = measured_trade_pnl(trade)
        if isinstance(plan_value, bool) and pnl_value is not None:
            plan_groups[plan_value].append(pnl_value)

    current_losing_streak = 0
    max_losing_streak = 0
    running_losing_streak = 0
    ordered_outcomes = [trade_outcome(row) for row in sorted(closed_trades, key=_closure_order_key)]
    for outcome in ordered_outcomes:
        if outcome is not None and outcome < 0:
            running_losing_streak += 1
            max_losing_streak = max(max_losing_streak, running_losing_streak)
        else:
            running_losing_streak = 0
    for outcome in reversed(ordered_outcomes):
        if outcome is not None and outcome < 0:
            current_losing_streak += 1
        else:
            break

    checklist_values: list[bool] = []
    mistake_counts: dict[str, int] = defaultdict(int)
    high_risk_emotion_rows: list[dict] = []
    for trade in active_trades:
        checklist = trade.get("checklist_results")
        if isinstance(checklist, list):
            checklist_values.extend(item.get("checked") is True for item in checklist if isinstance(item, dict))
        mistakes = trade.get("mistakes")
        if isinstance(mistakes, list):
            for mistake in mistakes:
                label = str(mistake or "").strip()
                if label:
                    mistake_counts[label] += 1
        if str(trade.get("emotion") or "").strip().lower() in HIGH_RISK_EMOTIONS:
            high_risk_emotion_rows.append(trade)

    def plan_summary(value: bool) -> dict[str, Any]:
        values = plan_groups[value]
        return {
            "sample_size": len(values),
            "net_pnl": round(sum(values), 2) if values and one_currency else None,
            "average_pnl": round(sum(values) / len(values), 2) if values and one_currency else None,
        }

    rules_value = user.get("rules")
    rules: dict[str, Any] = rules_value if isinstance(rules_value, dict) and rules_value.get("configured") is not False else {}
    max_trades = int(_number(rules.get("max_trades")) or 0)
    by_day: dict[str, list[dict]] = defaultdict(list)
    for trade in active_trades:
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
                "currency": _currency(trade),
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
            "currencies": currencies,
            "mixed_currencies": not one_currency,
        },
        "metrics": {
            "net_pnl": _monetary_total(trades),
            "currency": currencies[0] if len(currencies) == 1 else None,
            "net_pnl_by_currency": {currency: _monetary_total([trade for trade in trades if _currency(trade) == currency]) for currency in currencies},
            "wins": len(winning_outcomes),
            "losses": len(losing_outcomes),
            "win_rate_percent": round(len(winning_outcomes) / len(outcomes) * 100, 1) if outcomes else None,
            "profit_factor": round(gross_profit / gross_loss, 2) if gross_loss and one_currency else None,
            "average_win": round(gross_profit / len(wins), 2) if wins and one_currency else None,
            "average_loss": round(sum(losses) / len(losses), 2) if losses and one_currency else None,
            "average_r": round(sum(measured_r) / len(measured_r), 2) if measured_r else None,
            "plan_respect_percent": round(sum(measured_plan) / len(measured_plan) * 100, 1) if measured_plan else None,
        },
        "rules": {"max_trades_per_day": max_trades or None},
        "overtrading_days": overtrading_days,
        "setup_performance": setup_performance,
        "session_performance": session_performance,
        "emotion_performance": _group_performance(trades, "emotion"),
        "discipline": {
            "plan_respected": plan_summary(True),
            "plan_not_respected": plan_summary(False),
            "average_pnl_difference": (
                round(sum(plan_groups[True]) / len(plan_groups[True]) - sum(plan_groups[False]) / len(plan_groups[False]), 2)
                if plan_groups[True] and plan_groups[False] and one_currency
                else None
            ),
            "checklist_completion_percent": round(sum(checklist_values) / len(checklist_values) * 100, 1) if checklist_values else None,
            "current_losing_streak": current_losing_streak,
            "max_losing_streak": max_losing_streak,
            "high_risk_emotion_trade_count": len(high_risk_emotion_rows),
            "high_risk_emotion_measured_pnl": (
                round(sum(values), 2)
                if one_currency and (values := [value for row in high_risk_emotion_rows if (value := measured_trade_pnl(row)) is not None])
                else None
            ),
            "documented_mistakes": [
                {"name": name, "count": count}
                for name, count in sorted(mistake_counts.items(), key=lambda item: (-item[1], item[0]))[:10]
            ],
        },
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
            "total_amount": _monetary_total(payouts, "amount"),
            "amount_by_currency": {currency: _monetary_total([row for row in payouts if _currency(row) == currency], "amount") for currency in sorted({_currency(row) for row in payouts})},
            "records": [
                {
                    "date": row.get("date"),
                    "amount": _number(row.get("amount")),
                    "currency": _currency(row),
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
    guidance = CONTEXT_GUIDANCE.get(context_tag, CONTEXT_GUIDANCE["overall"])
    provider_context = _provider_safe_context(context)
    return (
        f"Question du trader : {question[:1000]}\n"
        f"Angle demandé : {context_tag[:64]}\n\n"
        f"Consigne pour cet angle : {guidance}\n\n"
        "Données PipsEvo fiables (JSON) :\n"
        f"{json.dumps(provider_context, ensure_ascii=False, separators=(',', ':'))}\n\n"
        "Règles d'interprétation : une valeur null signifie non mesurée. "
        "Si context_truncated=true, certaines données ont été omises pour limiter la taille : signale cette limite. "
        "Ne transforme jamais une donnée absente en zéro. "
        "Ne somme ni ne compare des montants de devises différentes. Aucune conversion FX n’est fournie. "
        "Ne désigne un meilleur ou pire "
        "setup/session que parmi les groupes où eligible_for_comparison=true. "
        "Une association observée entre émotion, discipline et P&L ne prouve jamais une causalité. "
        "Les alertes et priorités de coaching_briefing sont calculées par le moteur déterministe : "
        "tu peux les expliquer et les ordonner, mais jamais les supprimer, les contredire ou les transformer en signal. "
        "Si focus_trade est présent, limite la revue post-trade à ce trade et sépare explicitement processus, discipline et résultat. "
        "Si l’échantillon ne permet pas la conclusion demandée, indique explicitement que les données sont insuffisantes. "
        "Pour chaque exemple de trade, cite son alias [Tn]."
    )


def _provider_safe_context(context: dict) -> dict:
    """Remove direct identifiers before sending measured context to a provider."""
    safe = dict(context)
    trader = context.get("trader")
    if isinstance(trader, dict):
        safe["trader"] = {"trader_type": trader.get("trader_type")}
    accounts = context.get("accounts")
    if isinstance(accounts, list):
        safe["accounts"] = [
            {
                "alias": f"A{index}",
                "firm": row.get("firm"),
                "market_type": row.get("market_type"),
                "daily_loss_limit": row.get("daily_loss_limit"),
                "max_drawdown": row.get("max_drawdown"),
            }
            for index, row in enumerate(accounts, start=1)
            if isinstance(row, dict)
        ]
    evidence = context.get("evidence")
    if isinstance(evidence, list):
        safe["evidence"] = [
            {key: value for key, value in row.items() if key != "trade_id"}
            for row in evidence
            if isinstance(row, dict)
        ]
    focus = context.get("focus_trade")
    if isinstance(focus, dict):
        safe["focus_trade"] = {key: value for key, value in focus.items() if key != "trade_id"}
    payouts = context.get("payouts")
    if isinstance(payouts, dict):
        safe_payouts = dict(payouts)
        records = payouts.get("records")
        if isinstance(records, list):
            safe_payouts["records"] = [
                {key: value for key, value in row.items() if key != "account_id"}
                for row in records
                if isinstance(row, dict)
            ]
        safe["payouts"] = safe_payouts
    briefing = context.get("coaching_briefing")
    if isinstance(briefing, dict):
        safe_briefing = dict(briefing)
        queue = briefing.get("review_queue")
        if isinstance(queue, list):
            safe_briefing["review_queue"] = [
                {key: value for key, value in row.items() if key != "trade_id"}
                for row in queue
                if isinstance(row, dict)
            ]
        safe["coaching_briefing"] = safe_briefing
    return _bounded_provider_context(safe)


def _bounded_provider_context(context: dict) -> dict:
    """Bound stored user text and collections before JSON/provider processing."""
    budget = 16000
    nodes = 1200
    truncated = False

    def visit(value, depth=0):
        nonlocal budget, nodes, truncated
        nodes -= 1
        if nodes < 0 or depth > 8 or budget <= 0:
            truncated = True
            return None
        if isinstance(value, str):
            clipped = value[:min(2048, budget)]
            budget -= len(clipped)
            truncated |= len(clipped) < len(value)
            return clipped
        if isinstance(value, list):
            truncated |= len(value) > 50
            result = []
            for item in value[:50]:
                if nodes <= 0 or budget <= 0:
                    truncated = True
                    break
                result.append(visit(item, depth + 1))
            return result
        if isinstance(value, dict):
            truncated |= len(value) > 64
            result = {}
            for key, item in list(value.items())[:64]:
                if nodes <= 0 or budget <= 0:
                    truncated = True
                    break
                name = str(key)
                if len(name) > 128:
                    truncated = True
                    continue
                budget -= len(name)
                result[name] = visit(item, depth + 1)
            return result
        if isinstance(value, float) and not math.isfinite(value):
            return None
        return value

    result = visit(context)
    result["context_truncated"] = truncated
    return result


def _period_bounds(period: str, local_date: str | None) -> tuple[date, date]:
    try:
        end = date.fromisoformat(str(local_date or "")[:10])
    except ValueError:
        end = datetime.now(timezone.utc).date()
    if period == "daily":
        return end, end
    return end - timedelta(days=6), end


def _trade_review_gaps(trade: dict) -> list[str]:
    gaps: list[str] = []
    if not isinstance(trade.get("plan_respected"), bool):
        gaps.append("respect du plan")
    if not str(trade.get("notes") or "").strip():
        gaps.append("notes")
    if not str(trade.get("emotion") or "").strip():
        gaps.append("émotion")
    checklist = trade.get("checklist_results")
    if not isinstance(checklist, list) or not checklist:
        gaps.append("checklist")
    return gaps


def build_coaching_briefing(
    user: dict,
    accounts: list[dict],
    trades: list[dict],
    *,
    period: str = "weekly",
    local_date: str | None = None,
) -> dict:
    """Build an explainable daily/weekly coaching cycle from measured data.

    The output is intentionally deterministic. It can be handed to the language
    model for explanation, but model text cannot alter the alerts or priorities.
    """
    normalized_period = "daily" if period == "daily" else "weekly"
    start, end = _period_bounds(normalized_period, local_date)
    period_trades = [
        row for row in trades
        if start.isoformat() <= _date_key(row.get("date")) <= end.isoformat()
    ]
    context, _ = build_atlas_context(user, accounts, period_trades)
    data_quality = context["data_quality"]
    metrics = context["metrics"]
    discipline = context["discipline"]
    alerts: list[dict[str, Any]] = []

    def add_alert(
        alert_id: str,
        severity: str,
        title: str,
        detail: str,
        *,
        metric: Any = None,
        threshold: Any = None,
        source: str,
    ) -> None:
        alerts.append({
            "id": alert_id,
            "severity": severity,
            "title": title,
            "detail": detail,
            "metric": metric,
            "threshold": threshold,
            "source": source,
        })

    rules_value = user.get("rules")
    rules: dict[str, Any] = rules_value if isinstance(rules_value, dict) and rules_value.get("configured") is not False else {}
    stop_after = int(_number(rules.get("stop_after_loss")) or 0)
    losing_streak = discipline["current_losing_streak"]
    if stop_after and losing_streak >= stop_after:
        add_alert(
            "loss-streak",
            "critical",
            "Règle d’arrêt atteinte",
            f"La période se termine par {losing_streak} pertes consécutives, pour une limite personnelle de {stop_after}.",
            metric=losing_streak,
            threshold=stop_after,
            source="profile_rule_and_trades",
        )

    overtrading_days = context["overtrading_days"]
    if overtrading_days:
        worst_day = max(overtrading_days, key=lambda row: row["trade_count"] - row["limit"])
        add_alert(
            "overtrading",
            "critical",
            "Limite de trades dépassée",
            f"{len(overtrading_days)} jour(s) dépassent la limite. Le {worst_day['date']} compte {worst_day['trade_count']} trades pour une limite de {worst_day['limit']}.",
            metric=worst_day["trade_count"],
            threshold=worst_day["limit"],
            source="profile_rule_and_trades",
        )

    plan_sample = data_quality["trades_with_plan_status"]
    plan_rate = metrics["plan_respect_percent"]
    if plan_sample >= 3 and plan_rate is not None and plan_rate < 80:
        add_alert(
            "plan-respect",
            "warning" if plan_rate >= 60 else "critical",
            "Respect du plan à renforcer",
            f"Le plan est respecté sur {plan_rate:.1f}% des {plan_sample} trades renseignés.",
            metric=plan_rate,
            threshold=80,
            source="trade_reviews",
        )

    checklist_rate = discipline["checklist_completion_percent"]
    if checklist_rate is not None and checklist_rate < 80:
        add_alert(
            "checklist-completion",
            "warning",
            "Checklist incomplète",
            f"{checklist_rate:.1f}% des éléments de checklist documentés ont été validés.",
            metric=checklist_rate,
            threshold=80,
            source="trade_checklists",
        )

    emotional_count = discipline["high_risk_emotion_trade_count"]
    if emotional_count:
        add_alert(
            "high-risk-emotions",
            "warning",
            "États émotionnels à surveiller",
            f"{emotional_count} trade(s) ont été journalisés dans un état émotionnel à risque.",
            metric=emotional_count,
            source="trade_emotions",
        )

    total_trades = data_quality["total_trades"]
    measured_pnl_count = data_quality["trades_with_pnl"]
    if data_quality["mixed_currencies"]:
        add_alert(
            "mixed-currencies", "info", "Résultats séparés par devise",
            "Les montants sont exprimés dans plusieurs devises et ne sont pas additionnés. Aucune conversion automatique n’est appliquée.",
            source="native_trade_currencies",
        )
    if total_trades and measured_pnl_count < total_trades:
        add_alert(
            "pnl-coverage",
            "info",
            "P&L partiellement mesuré",
            f"Le P&L monétaire est disponible pour {measured_pnl_count} trade(s) sur {total_trades}. Les autres résultats ne sont pas convertis en zéro.",
            metric=measured_pnl_count,
            threshold=total_trades,
            source="data_quality",
        )

    review_queue = []
    for trade in sorted(period_trades, key=lambda row: f"{_date_key(row.get('date'))}|{row.get('created_at') or ''}", reverse=True):
        gaps = _trade_review_gaps(trade)
        if gaps:
            review_queue.append({
                "trade_id": trade.get("id"),
                "date": trade.get("date"),
                "instrument": trade.get("instrument"),
                "direction": trade.get("direction"),
                "pnl": measured_trade_pnl(trade),
                "missing": gaps,
            })
        if len(review_queue) >= 5:
            break
    if review_queue:
        add_alert(
            "review-completeness",
            "info",
            "Revues post-trade à compléter",
            f"{len(review_queue)} trade(s) récents nécessitent encore du contexte de discipline.",
            metric=len(review_queue),
            source="trade_reviews",
        )

    action_templates = {
        "loss-streak": ("Pause et revue", "Revoir les dernières pertes avant toute nouvelle prise de position.", "Aucune nouvelle position avant la revue des trades concernés."),
        "overtrading": ("Respecter la limite quotidienne", "Activer la règle d’arrêt dès que le nombre maximal de trades est atteint.", "Zéro dépassement sur la prochaine période."),
        "plan-respect": ("Renforcer le respect du plan", "Documenter avant chaque trade la règle qui autorise la position.", "Atteindre au moins 80% de respect du plan renseigné."),
        "checklist-completion": ("Compléter la checklist", "Valider chaque contrôle requis avant de considérer le processus prêt.", "Checklist complétée à au moins 80%."),
        "high-risk-emotions": ("Créer une règle de pause émotionnelle", "Reporter la décision lorsque l’état à risque est déclaré avec une intensité forte.", "Aucun trade pris sous émotion forte sans pause documentée."),
        "pnl-coverage": ("Améliorer la qualité des données", "Vérifier la synchronisation ou renseigner les résultats manquants sans les inventer.", "P&L réellement mesuré sur tous les trades disponibles."),
        "mixed-currencies": ("Relire chaque devise séparément", "Comparer les résultats uniquement dans leur devise native, sans additionner les montants.", "Aucun total monétaire mélangeant plusieurs devises."),
        "review-completeness": ("Finaliser les revues post-trade", "Ajouter plan, notes, émotion et checklist aux trades incomplets.", "Aucun trade récent sans contexte de revue."),
    }
    severity_rank = {"critical": 0, "warning": 1, "info": 2}
    prioritized = sorted(alerts, key=lambda row: (severity_rank[row["severity"]], row["id"]))[:3]
    action_plan = []
    for index, alert in enumerate(prioritized, start=1):
        title, description, measure = action_templates[alert["id"]]
        action_plan.append({
            "id": f"{normalized_period}:{alert['id']}",
            "priority": index,
            "title": title,
            "description": description,
            "success_measure": measure,
            "source_alert_id": alert["id"],
        })
    if not action_plan and period_trades:
        action_plan.append({
            "id": f"{normalized_period}:keep-reviewing",
            "priority": 1,
            "title": "Conserver la routine de revue",
            "description": "Relire la période et maintenir une seule priorité comportementale à la fois.",
            "success_measure": "Une revue complète et une décision de processus documentée.",
            "source_alert_id": None,
        })

    daily_rows: list[dict[str, Any]] = []
    grouped: dict[str, list[dict]] = defaultdict(list)
    for trade in period_trades:
        grouped[_date_key(trade.get("date"))].append(trade)
    for day_key, rows in sorted(grouped.items()):
        reviewed_plan = [row["plan_respected"] for row in rows if isinstance(row.get("plan_respected"), bool)]
        daily_rows.append({
            "date": day_key,
            "trade_count": len(rows),
            "measured_pnl": _monetary_total(rows),
            "currencies": sorted({_currency(row) for row in rows if measured_trade_pnl(row) is not None}),
            "plan_respect_percent": round(sum(reviewed_plan) / len(reviewed_plan) * 100, 1) if reviewed_plan else None,
        })

    return {
        "period": normalized_period,
        "range": {"start": start.isoformat(), "end": end.isoformat()},
        "overview": {
            "trade_count": total_trades,
            "measured_pnl": metrics["net_pnl"],
            "currency": metrics["currency"],
            "net_pnl_by_currency": metrics["net_pnl_by_currency"],
            "win_rate_percent": metrics["win_rate_percent"],
            "plan_respect_percent": plan_rate,
            "checklist_completion_percent": checklist_rate,
            "current_losing_streak": losing_streak,
        },
        "alerts": alerts,
        "action_plan": action_plan,
        "review_queue": review_queue,
        "daily": daily_rows,
        "explainability": {
            "engine": "deterministic-coaching-v1",
            "process_only": True,
            "data_quality": data_quality,
            "rules_applied": {
                "max_trades_per_day": context["rules"]["max_trades_per_day"],
                "stop_after_losses": stop_after or None,
                "minimum_plan_respect_percent": 80,
                "minimum_checklist_completion_percent": 80,
            },
            "notice": "Atlas explique les données observées. Il ne prédit pas le marché et ne garantit aucun résultat.",
        },
    }


def build_deterministic_coach_answer(question: str, context_tag: str, context: dict) -> str:
    """Return a useful, evidence-based answer without a paid language model."""
    briefing = context.get("coaching_briefing") or {}
    overview = briefing.get("overview") or {}
    alerts = briefing.get("alerts") or []
    actions = briefing.get("action_plan") or []
    quality = (briefing.get("explainability") or {}).get("data_quality") or {}
    focus = context.get("focus_trade")
    period_label = "aujourd’hui" if briefing.get("period") == "daily" else "sur les 7 derniers jours"

    lines = [
        "### Atlas — analyse gratuite",
        f"J’ai analysé ton processus {period_label} à partir des données réellement disponibles.",
    ]
    if question.strip():
        lines.append(f"**Question prise en compte :** {question.strip()}")

    if focus:
        pnl = focus.get("pnl")
        pnl_text = "non mesuré" if pnl is None else f"{pnl:+.2f} {_currency(focus)}"
        lines.extend([
            "",
            "#### Revue du trade",
            f"- Trade : {focus.get('instrument') or 'instrument non renseigné'} · {focus.get('date') or 'date non renseignée'} · résultat {pnl_text}",
            f"- Plan respecté : {_display_bool(focus.get('plan_respected'))}",
            f"- Émotion : {focus.get('emotion') or 'non renseignée'} ({focus.get('emotion_intensity') or 'intensité non renseignée'})",
            f"- Notes : {'présentes' if str(focus.get('notes') or '').strip() else 'à compléter'}",
            "Le résultat financier ne suffit pas à valider la qualité de la décision : vérifie d’abord le respect du plan, le risque et la checklist.",
        ])
    else:
        pnl = overview.get("measured_pnl")
        pnl_text = "non agrégé (plusieurs devises)" if quality.get("mixed_currencies") else "non mesuré" if pnl is None else f"{pnl:+.2f} {overview.get('currency') or 'USD'}"
        lines.extend([
            "",
            "#### Bilan mesuré",
            f"- Trades : {overview.get('trade_count', 0)}",
            f"- P&L disponible : {pnl_text}",
            f"- Win rate : {_display_percent(overview.get('win_rate_percent'))}",
            f"- Respect du plan : {_display_percent(overview.get('plan_respect_percent'))}",
            f"- Checklist : {_display_percent(overview.get('checklist_completion_percent'))}",
        ])

    lines.extend(["", "#### Priorités observées"])
    if alerts:
        for alert in alerts[:3]:
            lines.append(f"- **{alert.get('title')}** — {alert.get('detail')}")
    else:
        lines.append("- Aucune alerte déterministe sur cette période. Continue à documenter le processus.")

    lines.extend(["", "#### Prochaine action"])
    if actions:
        action = actions[0]
        lines.append(f"- **{action.get('title')}** : {action.get('description')}")
        lines.append(f"- Mesure de réussite : {action.get('success_measure')}")
    else:
        lines.append("- Complète au moins une revue de trade avant la prochaine analyse.")

    measured = quality.get("trades_with_pnl")
    total = quality.get("total_trades")
    if isinstance(measured, int) and isinstance(total, int):
        lines.extend([
            "",
            f"*Qualité des données : P&L disponible sur {measured}/{total} trade(s). Les valeurs absentes ne sont jamais transformées en zéro.*",
        ])
    lines.append("*Atlas évalue ton processus uniquement : ce contenu n’est ni un signal ni un conseil d’investissement.*")
    return "\n".join(lines)


def _display_bool(value: Any) -> str:
    if value is True:
        return "oui"
    if value is False:
        return "non"
    return "non renseigné"


def _display_percent(value: Any) -> str:
    number = _number(value)
    return "non mesuré" if number is None else f"{number:.1f}%"


def build_pretrade_readiness(
    user: dict,
    account: dict,
    trades: list[dict],
    proposal: dict,
) -> dict:
    """Evaluate process readiness without predicting the market.

    This gate is intentionally deterministic: the language model may explain
    the result later, but it cannot override a configured limit or create a
    trading signal.
    """
    rules_value = user.get("rules")
    rules: dict[str, Any] = rules_value if isinstance(rules_value, dict) and rules_value.get("configured") is not False else {}
    checks: list[dict[str, Any]] = []

    def add_check(
        check_id: str,
        label: str,
        status: str,
        detail: str,
        *,
        observed: Any = None,
        limit: Any = None,
        source: str = "pipsevo",
    ) -> None:
        checks.append({
            "id": check_id,
            "label": label,
            "status": status,
            "detail": detail,
            "observed": observed,
            "limit": limit,
            "source": source,
        })

    if not account:
        add_check("account", "Compte", "block", "Sélectionne un compte valide avant toute décision.")
    elif str(account.get("status") or "active").lower() not in {"active", "actif", "funded", "challenge", "demo"}:
        add_check("account", "Compte", "block", "Ce compte n’est pas actif.", observed=account.get("status"), source="account")
    else:
        add_check("account", "Compte", "pass", "Le compte sélectionné est actif.", observed=account.get("name"), source="account")

    local_date = str(proposal.get("local_date") or "")[:10]
    account_id = str(account.get("id") or "") if account else ""
    account_trades = [row for row in trades if (not account_id or str(row.get("account_id") or "") == account_id) and str(row.get("result_status") or "").lower() not in {"cancelled", "canceled"}]
    today_trades = [row for row in account_trades if _date_key(row.get("date")) == local_date]
    today_closed = [row for row in today_trades if str(row.get("result_status") or "").lower() != "open"]
    today_pnl_values = [measured_trade_pnl(row) for row in today_closed]
    account_currency_known = account is not None and account.get("currency_available") is not False
    today_pnl_complete = account_currency_known and all(value is not None for value in today_pnl_values) and all(_currency(row) == _currency(account) for row in today_closed)
    today_pnl = round(sum(value for value in today_pnl_values if value is not None), 2) if today_pnl_complete else None
    open_positions = [row for row in account_trades if str(row.get("result_status") or "").lower() == "open"]
    if open_positions:
        add_check("open_positions", "Positions ouvertes", "warn", f"{len(open_positions)} position(s) ouverte(s) : leur P&L flottant est exclu du résultat clôturé. L’exposition et les règles fournisseur restent à vérifier.", observed=len(open_positions), source="account_and_trades")

    planned_risk_percent = _number(proposal.get("planned_risk_percent"))
    planned_risk_amount = _number(proposal.get("planned_risk_amount"))
    balance = _number(account.get("balance")) if account else None
    if not account_currency_known:
        add_check("currency", "Devise du compte", "warn", "La devise native n’est pas connue : les marges monétaires ne peuvent pas être validées.", source="account")
    amount_from_percent = planned_risk_percent / 100 * balance if planned_risk_percent is not None and balance and balance > 0 else None
    inconsistent_risk = (
        planned_risk_amount is not None and amount_from_percent is not None
        and not math.isclose(planned_risk_amount, amount_from_percent, abs_tol=0.01, rel_tol=0.001)
    )
    if planned_risk_amount is None:
        planned_risk_amount = amount_from_percent
    if planned_risk_percent is None and planned_risk_amount is not None and balance and balance > 0:
        planned_risk_percent = planned_risk_amount / balance * 100

    max_trades = int(_number(rules.get("max_trades")) or 0)
    if max_trades > 0:
        next_trade_number = len(today_trades) + 1
        add_check(
            "max_trades",
            "Nombre maximal de trades",
            "block" if len(today_trades) >= max_trades else "pass",
            f"{len(today_trades)} trade(s) déjà enregistré(s) aujourd’hui sur une limite de {max_trades}.",
            observed=next_trade_number,
            limit=max_trades,
            source="profile_rule",
        )
    else:
        add_check("max_trades", "Nombre maximal de trades", "warn", "Aucune limite quotidienne n’est configurée.", source="profile_rule")

    daily_limit = _number(account.get("daily_loss_limit")) if account else None
    daily_from_profile = daily_limit is None
    if daily_from_profile:
        daily_limit = _number(rules.get("daily_loss_limit"))
    daily_currency = str(rules.get("daily_loss_currency") or rules.get("currency") or "USD").upper() if daily_from_profile else _currency(account)
    compatible_daily_currency = daily_currency == _currency(account)
    if daily_limit and daily_limit > 0:
        remaining = round(daily_limit + today_pnl, 2) if today_pnl is not None and compatible_daily_currency else None
        status = (
            "warn" if remaining is None
            else "block" if remaining <= 0 or (planned_risk_amount is not None and planned_risk_amount > remaining)
            else "warn" if remaining <= daily_limit * 0.2 else "pass"
        )
        add_check(
            "daily_loss",
            "Perte journalière",
            status,
            f"La limite globale est en {daily_currency}, le compte en {_currency(account)}. Aucune conversion automatique : renseigne une limite dans la devise du compte."
            if not compatible_daily_currency else "La marge journalière ne peut pas être validée : des résultats ou leurs devises sont manquants ou incompatibles."
            if remaining is None else f"P&L mesuré du jour : {today_pnl:.2f}. Marge restante : {max(0, remaining):.2f}. Risque prévu : {planned_risk_amount if planned_risk_amount is not None else 'non renseigné'}.",
            observed=today_pnl if compatible_daily_currency else None,
            limit=-daily_limit,
            source="account_and_trades",
        )
    else:
        add_check("daily_loss", "Perte journalière", "warn", "Aucune limite de perte journalière n’est configurée.", source="profile_rule")

    max_drawdown = _number(account.get("max_drawdown")) if account else None
    if max_drawdown and max_drawdown > 0:
        drawdown_remaining = _remaining_drawdown(account)
        drawdown_status = (
            "warn" if drawdown_remaining is None
            else "block" if drawdown_remaining <= 0 or (planned_risk_amount is not None and planned_risk_amount > drawdown_remaining)
            else "warn" if drawdown_remaining <= max_drawdown * 0.2 else "pass"
        )
        add_check(
            "drawdown", "Marge de drawdown", drawdown_status,
            "Le drawdown ne peut pas être vérifié : renseigne le seuil courant ou sa référence."
            if drawdown_remaining is None else f"Marge de drawdown restante : {drawdown_remaining:.2f}, comparée au risque prévu renseigné.",
            observed=drawdown_remaining, limit=max_drawdown, source="account_and_proposal",
        )

    stop_after = int(_number(rules.get("stop_after_loss")) or 0)
    consecutive_losses = 0
    streak_complete = True
    closed_trades = [row for row in account_trades if str(row.get("result_status") or "").lower() != "open"]
    for row in sorted(closed_trades, key=_closure_order_key, reverse=True):
        outcome = trade_outcome(row)
        if outcome is not None and outcome < 0:
            consecutive_losses += 1
        else:
            if outcome is None:
                streak_complete = False
            break
    if stop_after > 0:
        add_check(
            "loss_streak",
            "Pertes consécutives",
            "block" if consecutive_losses >= stop_after else "pass" if streak_complete else "warn",
            f"{consecutive_losses} perte(s) consécutive(s) confirmée(s) pour une limite de {stop_after}." + (" Un résultat clôturé manque : la série complète n’est pas vérifiable." if not streak_complete else ""),
            observed=consecutive_losses,
            limit=stop_after,
            source="profile_rule_and_trades",
        )
    else:
        add_check("loss_streak", "Pertes consécutives", "warn", "Aucune règle d’arrêt après pertes n’est configurée.", source="profile_rule")

    max_risk_percent = _number(rules.get("max_risk_pct"))
    if inconsistent_risk:
        add_check("risk", "Risque prévu", "block", "Le montant de risque et son pourcentage sont incohérents avec le solde du compte.", source="proposal")
    elif planned_risk_percent is None:
        add_check("risk", "Risque prévu", "block", "Renseigne le risque prévu en pourcentage ou en montant.", source="proposal")
    elif planned_risk_percent <= 0:
        add_check("risk", "Risque prévu", "block", "Le risque prévu doit être supérieur à zéro.", observed=planned_risk_percent, source="proposal")
    elif max_risk_percent and planned_risk_percent > max_risk_percent:
        add_check("risk", "Risque prévu", "block", f"Le risque prévu dépasse ta limite de {max_risk_percent:g}%.", observed=round(planned_risk_percent, 3), limit=max_risk_percent, source="profile_rule")
    elif max_risk_percent:
        status = "warn" if planned_risk_percent >= max_risk_percent * 0.8 else "pass"
        add_check("risk", "Risque prévu", status, f"Risque prévu : {planned_risk_percent:.2f}% sur une limite de {max_risk_percent:g}%.", observed=round(planned_risk_percent, 3), limit=max_risk_percent, source="profile_rule")
    else:
        add_check("risk", "Risque prévu", "warn", f"Risque prévu : {planned_risk_percent:.2f}%, mais aucune limite personnelle n’est configurée.", observed=round(planned_risk_percent, 3), source="proposal")

    entry = _number(proposal.get("entry"))
    stop = _number(proposal.get("stop"))
    take_profit = _number(proposal.get("take_profit"))
    if stop is None:
        add_check("stop", "Stop loss", "block", "Définis un stop loss avant la prise de position.", source="proposal")
    elif entry is not None and stop == entry:
        add_check("stop", "Stop loss", "block", "Le stop loss ne peut pas être égal au prix d’entrée.", source="proposal")
    else:
        add_check("stop", "Stop loss", "pass", "Un stop loss est défini.", observed=stop, source="proposal")

    min_rr = _number(rules.get("min_rr"))
    planned_rr = None
    invalid_levels = entry is not None and stop is not None and take_profit is not None and (stop - entry) * (take_profit - entry) >= 0
    if entry is not None and stop is not None and take_profit is not None and entry != stop and not invalid_levels:
        planned_rr = abs(take_profit - entry) / abs(entry - stop)
    if invalid_levels:
        add_check("reward_risk", "Ratio risque/rendement", "block", "Le stop loss et l’objectif doivent être de part et d’autre du prix d’entrée.", source="proposal")
    elif planned_rr is None:
        add_check("reward_risk", "Ratio risque/rendement", "warn", "Renseigne entrée, stop et objectif pour mesurer le ratio prévu.", source="proposal")
    elif min_rr and planned_rr < min_rr:
        add_check("reward_risk", "Ratio risque/rendement", "block", f"Le ratio prévu {planned_rr:.2f}R est inférieur à ta règle de {min_rr:g}R.", observed=round(planned_rr, 2), limit=min_rr, source="profile_rule")
    else:
        add_check("reward_risk", "Ratio risque/rendement", "pass", f"Ratio prévu : {planned_rr:.2f}R.", observed=round(planned_rr, 2), limit=min_rr, source="profile_rule")

    checklist_rows = proposal.get("checklist_results") if isinstance(proposal.get("checklist_results"), list) else []
    checklist_map = {str(row.get("id")): row.get("checked") is True for row in checklist_rows if isinstance(row, dict)}
    configured_checklist = rules.get("pre_trade_checklist") if isinstance(rules.get("pre_trade_checklist"), list) else []
    if not configured_checklist:
        configured_checklist = [
            {"id": row.get("id"), "label": row.get("label"), "enabled": True, "required": True}
            for row in checklist_rows
            if isinstance(row, dict) and row.get("required") is True
        ]
    required = [row for row in configured_checklist if isinstance(row, dict) and row.get("enabled", True) and row.get("required", False)]
    missing_required = [str(row.get("label") or row.get("id") or "Vérification") for row in required if not checklist_map.get(str(row.get("id")))]
    if missing_required:
        add_check("checklist", "Checklist obligatoire", "block", "Vérifications manquantes : " + ", ".join(missing_required) + ".", observed=len(required) - len(missing_required), limit=len(required), source="profile_rule")
    elif required:
        add_check("checklist", "Checklist obligatoire", "pass", f"Les {len(required)} vérifications obligatoires sont validées.", observed=len(required), limit=len(required), source="profile_rule")
    else:
        add_check("checklist", "Checklist obligatoire", "warn", "Aucune vérification obligatoire n’est configurée.", source="profile_rule")

    emotion = str(proposal.get("emotion") or "").strip()
    intensity = str(proposal.get("emotion_intensity") or "").strip().lower()
    if not emotion:
        add_check("emotion", "État émotionnel", "warn", "Renseigne ton état émotionnel avant la décision.", source="proposal")
    elif emotion.lower() in HIGH_RISK_EMOTIONS:
        status = "block" if intensity == "high" else "warn"
        add_check("emotion", "État émotionnel", status, f"État déclaré : {emotion}{' (intensité forte)' if intensity == 'high' else ''}. Fais une pause et réévalue le processus.", observed=emotion, source="proposal")
    else:
        add_check("emotion", "État émotionnel", "pass", f"État déclaré : {emotion}.", observed=emotion, source="proposal")

    blocks = [row for row in checks if row["status"] == "block"]
    warnings = [row for row in checks if row["status"] == "warn"]
    score = max(0, 100 - len(blocks) * 25 - len(warnings) * 8)
    status = "blocked" if blocks else "caution" if warnings else "ready"
    return {
        "status": status,
        "score": score,
        "process_only": True,
        "summary": (
            "Processus bloqué : corrige les points obligatoires avant d’envisager la position."
            if status == "blocked"
            else "Prudence : le processus comporte encore des points à clarifier."
            if status == "caution"
            else "Tous les garde-fous configurés sont respectés. Cela ne prédit pas le résultat du trade."
        ),
        "checks": checks,
        "blockers": [row["id"] for row in blocks],
        "warnings": [row["id"] for row in warnings],
        "data": {
            "local_date": local_date,
            "today_trade_count": len(today_trades),
            "today_measured_pnl": today_pnl,
            "today_pnl_complete": today_pnl_complete,
            "consecutive_losses": consecutive_losses,
            "planned_risk_percent": round(planned_risk_percent, 3) if planned_risk_percent is not None else None,
            "planned_risk_amount": round(planned_risk_amount, 2) if planned_risk_amount is not None else None,
            "planned_rr": round(planned_rr, 2) if planned_rr is not None else None,
        },
        "disclaimer": "Atlas valide uniquement ton processus et tes limites enregistrées. Il ne valide pas la direction du marché et ne garantit aucun résultat.",
    }
