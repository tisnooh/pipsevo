"""Pure, decimal, deterministic bar execution. No network or wall-clock calls.

Commands occur AFTER the current candle closes. Market actions fill on the next
available candle's open. OHLC ambiguity uses the adverse (stop first) outcome.
"""
from copy import deepcopy
from decimal import Decimal

from .instruments import decimal as D, INSTRUMENTS, pnl, size
from .limits import BETA_LIMITS


def initial_state(capital):
    return {"version": 1, "balance": str(D(capital)), "equity": str(D(capital)),
            "peak_equity": str(D(capital)), "max_drawdown": "0", "orders": [],
            "position": None, "trades": [], "completed": False, "sequence": 0}


def identifier(state, prefix):
    state["sequence"] += 1
    return f"{prefix}-{state['sequence']}"


def validate_price(symbol, value):
    price = D(value)
    if price <= 0 or price % D(INSTRUMENTS[symbol][1]) != 0:
        raise ValueError("Prix positif requis, aligné sur le tick de l’instrument.")
    return price


def command(state, action, payload, config, current_bar):
    s = deepcopy(state)
    symbol = config["symbol"]
    if s["completed"]:
        raise ValueError("Cette session est terminée.")
    if action == "order":
        if s["position"] or any(o["status"] == "pending" for o in s["orders"]):
            raise ValueError("Une seule position ou entrée en attente à la fois dans cette version.")
        if len(s["orders"]) >= BETA_LIMITS["orders_per_session"]:
            raise ValueError("Limite de 500 ordres par session atteinte.")
        side, kind = payload["side"], payload["kind"]
        if side not in ("buy", "sell") or kind not in ("market", "limit", "stop"):
            raise ValueError("Type d’ordre invalide.")
        entry = D(current_bar["close"]) if kind == "market" else validate_price(symbol, payload["price"])
        stop = validate_price(symbol, payload["stop_loss"])
        target = validate_price(symbol, payload["take_profit"]) if payload.get("take_profit") else None
        sign = 1 if side == "buy" else -1
        if (entry - stop) * sign <= 0 or (target is not None and (target - entry) * sign <= 0):
            raise ValueError("Le stop et l’objectif doivent encadrer l’entrée dans le bon sens.")
        mode = payload.get("risk_mode", "quantity")
        value = D(payload.get("risk_value", "1"))
        if mode not in ("quantity", "amount", "percent") or value <= 0:
            raise ValueError("Modèle de risque invalide.")
        if mode == "percent" and value > 10:
            raise ValueError("Le risque doit rester inférieur ou égal à 10 %.")
        budget = D(s["balance"]) * value / 100 if mode == "percent" else value
        qty = value if mode == "quantity" else size(symbol, budget, entry, stop, config["commission"], config["slippage_ticks"])
        step = D(INSTRUMENTS[symbol][3])
        if qty < step or qty % step or qty > 10000:
            raise ValueError("Quantité invalide ou budget insuffisant pour la quantité minimale.")
        if D(s["balance"]) <= 0:
            raise ValueError("Le capital disponible est épuisé.")
        s["orders"].append({"id": identifier(s, "order"), "kind": kind, "side": side,
                            "price": str(entry), "stop_loss": str(stop), "take_profit": str(target) if target else None,
                            "quantity": str(qty), "status": "pending", "created_at": current_bar["timestamp"] + 60,
                            "strategy": deepcopy(config.get("strategy")), "checklist": deepcopy(payload.get("checklist", {})),
                            "risk_budget": str(budget) if mode != "quantity" else None})
    elif action == "cancel":
        order = next((o for o in s["orders"] if o["id"] == payload.get("order_id") and o["status"] == "pending"), None)
        if not order:
            raise ValueError("Ordre en attente introuvable.")
        order["status"] = "cancelled"
    elif action == "close":
        p = s["position"]
        if not p or p.get("close_requested"):
            raise ValueError("Aucune position disponible pour cette clôture.")
        quantity = D(payload.get("quantity", p["quantity"]))
        if quantity <= 0 or quantity > D(p["quantity"]) or quantity % D(INSTRUMENTS[symbol][3]):
            raise ValueError("Quantité de clôture invalide.")
        p["close_requested"] = str(quantity)
    elif action == "breakeven":
        p = s["position"]
        if not p:
            raise ValueError("Aucune position ouverte.")
        entry = D(p["entry"])
        if (D(current_bar["close"]) - entry) * (1 if p["side"] == "buy" else -1) <= 0:
            raise ValueError("Le prix n’a pas encore dépassé l’entrée.")
        p["stop_loss"] = str(entry)
    elif action == "complete":
        if s["position"] or any(o["status"] == "pending" for o in s["orders"]):
            raise ValueError("Clôture la position et annule les ordres avant de terminer.")
        s["completed"] = True
    else:
        raise ValueError("Commande inconnue.")
    return mark(s, config, current_bar)


def slipped(price, side, config, entry=True):
    sign = 1 if side == "buy" else -1
    return D(price) + D(INSTRUMENTS[config["symbol"]][1]) * config["slippage_ticks"] * sign * (1 if entry else -1)


def close_position(s, config, bar, price, quantity, reason, ambiguous=False):
    p = s["position"]
    qty = D(quantity)
    gross = pnl(config["symbol"], p["side"], p["entry"], price, qty)
    fees = qty * D(config["commission"])
    s["balance"] = str(D(s["balance"]) + gross - fees / 2)
    p["exits"].append({"timestamp": bar["timestamp"], "price": str(price), "quantity": str(qty),
                       "gross": str(gross), "fees": str(fees), "net": str(gross - fees),
                       "reason": reason, "ambiguous": ambiguous})
    p["quantity"] = str(D(p["quantity"]) - qty)
    if D(p["quantity"]) == 0:
        total = sum((D(e["net"]) for e in p["exits"]), Decimal(0))
        s["trades"].append({**p, "closed_at": bar["timestamp"], "net": str(total),
                             "r": str(total / D(p["initial_risk"])) if D(p["initial_risk"]) else None})
        s["position"] = None


def advance(state, config, bar):
    s = deepcopy(state)
    if s["completed"]:
        raise ValueError("Cette session est terminée.")
    # Requested exits are market orders, executed before protective intrabar tests.
    if s["position"] and s["position"].get("close_requested"):
        p = s["position"]
        close_position(s, config, bar, slipped(bar["open"], p["side"], config, False),
                       p.pop("close_requested"), "manual")
    intrabar_entry = False
    for o in s["orders"]:
        if o["status"] != "pending" or s["position"]:
            continue
        price, opening, high, low = (D(v) for v in (o["price"], bar["open"], bar["high"], bar["low"]))
        buy = o["side"] == "buy"
        if o["kind"] == "market":
            fill = slipped(opening, o["side"], config)
        elif o["kind"] == "limit":
            if (buy and low > price) or (not buy and high < price):
                continue
            fill = min(opening, price) if buy else max(opening, price)
            intrabar_entry = opening > price if buy else opening < price
        else:
            if (buy and high < price) or (not buy and low > price):
                continue
            fill = slipped(max(opening, price) if buy else min(opening, price), o["side"], config)
            intrabar_entry = opening < price if buy else opening > price
        stop = D(o["stop_loss"])
        target = D(o["take_profit"]) if o["take_profit"] else None
        sign = 1 if buy else -1
        if (fill - stop) * sign <= 0 or (target is not None and (target - fill) * sign <= 0):
            o.update(status="rejected", reason="Gap au-delà du stop ou de l’objectif.")
            continue
        risk = abs(pnl(config["symbol"], o["side"], fill, slipped(stop, o["side"], config, False), o["quantity"])) + D(o["quantity"]) * D(config["commission"])
        if o["risk_budget"] and risk > D(o["risk_budget"]):
            o.update(status="rejected", reason="Gap : risque réel supérieur au budget autorisé.")
            continue
        o.update(status="filled", filled_at=bar["timestamp"], fill_price=str(fill))
        s["position"] = {"id": identifier(s, "position"), "order_id": o["id"], "side": o["side"],
                         "entry": str(fill), "opened_at": bar["timestamp"], "quantity": o["quantity"],
                         "initial_quantity": o["quantity"], "initial_risk": str(risk), "stop_loss": o["stop_loss"],
                         "take_profit": o["take_profit"], "strategy": o["strategy"], "checklist": o["checklist"], "exits": []}
        s["balance"] = str(D(s["balance"]) - D(o["quantity"]) * D(config["commission"]) / 2)
    p = s["position"]
    if p:
        buy = p["side"] == "buy"
        stop, opening = D(p["stop_loss"]), D(bar["open"])
        target = D(p["take_profit"]) if p["take_profit"] else None
        stop_hit = D(bar["low"]) <= stop if buy else D(bar["high"]) >= stop
        target_hit = target is not None and (D(bar["high"]) >= target if buy else D(bar["low"]) <= target)
        # A gap past the stop executes at the worse open; limit TP fills at its
        # exact price (no optimistic improvement). No favorable entry-bar TP if
        # the entry happened intrabar: OHLC does not establish that ordering.
        if stop_hit:
            base = min(opening, stop) if buy else max(opening, stop)
            close_position(s, config, bar, slipped(base, p["side"], config, False), p["quantity"], "stop_loss", bool(target_hit or intrabar_entry))
        elif target_hit and not intrabar_entry:
            close_position(s, config, bar, target, p["quantity"], "take_profit")
    return mark(s, config, bar)


def mark(s, config, bar):
    floating = Decimal(0)
    if s["position"]:
        p = s["position"]
        floating = pnl(config["symbol"], p["side"], p["entry"], bar["close"], p["quantity"])
    equity = D(s["balance"]) + floating
    peak = max(D(s["peak_equity"]), equity)
    s.update(equity=str(equity), peak_equity=str(peak),
             max_drawdown=str(max(D(s["max_drawdown"]), peak - equity)))
    return s


def finish_at_data_end(state, config, bar):
    """No stuck positions at EOF. Explicit final-close liquidation convention."""
    s = deepcopy(state)
    if s["position"]:
        p = s["position"]
        close_position(s, config, bar, slipped(bar["close"], p["side"], config, False),
                       p["quantity"], "data_end")
    for order in s["orders"]:
        if order["status"] == "pending":
            order.update(status="cancelled", reason="Fin de l’historique.")
    s["completed"] = True
    return mark(s, config, bar)
