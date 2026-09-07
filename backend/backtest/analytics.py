from decimal import Decimal
from .instruments import decimal as D


def summarize(state, capital):
    trades = state["trades"]
    values = [D(t["net"]) for t in trades]
    wins, losses = [v for v in values if v > 0], [v for v in values if v < 0]
    total, win_sum, loss_sum = sum(values, Decimal(0)), sum(wins, Decimal(0)), -sum(losses, Decimal(0))
    curve, balance, peak, drawdown = [], D(capital), D(capital), Decimal(0)
    win_streak = loss_streak = max_win_streak = max_loss_streak = 0
    groups = {}
    for trade in trades:
        value = D(trade["net"])
        balance += value
        peak = max(peak, balance)
        drawdown = max(drawdown, peak - balance)
        win_streak = win_streak + 1 if value > 0 else 0
        loss_streak = loss_streak + 1 if value < 0 else 0
        max_win_streak, max_loss_streak = max(max_win_streak, win_streak), max(max_loss_streak, loss_streak)
        curve.append({"timestamp": trade["closed_at"], "equity": str(balance), "drawdown": str(peak - balance)})
        strategy = (trade.get("strategy") or {}).get("name", "Sans stratégie")
        groups.setdefault(strategy, {"name": strategy, "trades": 0, "net": Decimal(0)})
        groups[strategy]["trades"] += 1
        groups[strategy]["net"] += value
    return {"trades": len(trades), "wins": len(wins), "losses": len(losses), "net": str(total),
            "total_r": str(sum((D(t["r"]) for t in trades if t.get("r") is not None), Decimal(0))),
            "win_rate": str(D(len(wins)) / len(trades) * 100) if trades else None,
            "profit_factor": str(win_sum / loss_sum) if loss_sum else None,
            "profit_factor_unbounded": bool(win_sum and not loss_sum),
            "expectancy": str(total / len(trades)) if trades else None,
            "average_win": str(win_sum / len(wins)) if wins else None,
            "average_loss": str(-loss_sum / len(losses)) if losses else None,
            "max_closed_drawdown": str(drawdown), "max_equity_drawdown": state["max_drawdown"],
            "max_win_streak": max_win_streak, "max_loss_streak": max_loss_streak,
            "curve": curve, "strategies": [{**g, "net": str(g["net"])} for g in groups.values()]}
