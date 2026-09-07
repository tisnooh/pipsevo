from decimal import Decimal, ROUND_FLOOR


def decimal(value):
    if len(str(value)) > 100:
        raise ValueError("Valeur numérique trop longue.")
    result = Decimal(str(value))
    if not result.is_finite() or (result and abs(result.adjusted()) > 15):
        raise ValueError("Valeur numérique non finie.")
    return result


# USD accounts only until historical cross-currency conversion is implemented.
# Futures refer to a specific expiration supplied in dataset.contract, not a
# silently stitched continuous contract. Forex quantities are standard lots.
INSTRUMENTS = {
    "ES": ("futures", "0.25", "50", "1"),
    "NQ": ("futures", "0.25", "20", "1"),
    "MES": ("futures", "0.25", "5", "1"),
    "MNQ": ("futures", "0.25", "2", "1"),
    "YM": ("futures", "1", "5", "1"),
    "RTY": ("futures", "0.1", "50", "1"),
    "CL": ("futures", "0.01", "1000", "1"),
    "GC": ("futures", "0.1", "100", "1"),
    "EURUSD": ("forex", "0.00001", "100000", "0.01"),
    "GBPUSD": ("forex", "0.00001", "100000", "0.01"),
}


def metadata(symbol):
    market, tick, multiplier, step = INSTRUMENTS[symbol]
    return {"symbol": symbol, "market": market, "tick_size": tick,
            "point_value": multiplier, "quantity_step": step, "currency": "USD",
            "timezone": "America/Chicago" if market == "futures" else "America/New_York"}


def pnl(symbol, side, entry, exit_price, quantity):
    direction = 1 if side == "buy" else -1
    return (decimal(exit_price) - decimal(entry)) * direction * decimal(INSTRUMENTS[symbol][2]) * decimal(quantity)


def size(symbol, budget, entry, stop, commission="0", slippage_ticks=0):
    _, tick, multiplier, step = INSTRUMENTS[symbol]
    per_unit = (abs(decimal(entry) - decimal(stop)) + 2 * decimal(tick) * slippage_ticks) * decimal(multiplier) + decimal(commission)
    if per_unit <= 0 or decimal(budget) <= 0:
        raise ValueError("Le risque et la distance du stop doivent être positifs.")
    return (decimal(budget) / per_unit / decimal(step)).to_integral_value(rounding=ROUND_FLOOR) * decimal(step)
