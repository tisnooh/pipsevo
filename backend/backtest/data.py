"""Provider boundary and strict historical OHLCV ingestion (UTC minute opens)."""
import csv
import io
from datetime import datetime, timezone
from typing import Protocol

from .instruments import INSTRUMENTS, decimal as D, metadata

MAX_BARS = 100_000
MAX_UPLOAD_BYTES = 16 * 1024 * 1024


class MarketDataProvider(Protocol):
    async def get_available_markets(self): ...
    async def get_symbols(self): ...
    async def search_symbols(self, query): ...
    async def get_historical_bars(self, dataset_id, from_timestamp, to_timestamp, limit): ...
    async def get_bars_before(self, dataset_id, timestamp, limit): ...
    async def get_bars_after(self, dataset_id, timestamp, limit): ...
    async def get_session_info(self, dataset_id): ...
    async def get_instrument_metadata(self, symbol): ...


def parse_csv(raw, symbol):
    if len(raw) > MAX_UPLOAD_BYTES:
        raise ValueError("Fichier limité à 16 Mo.")
    if symbol not in INSTRUMENTS:
        raise ValueError("Instrument non pris en charge.")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("Le CSV doit être encodé en UTF-8.") from exc
    reader = csv.DictReader(io.StringIO(text))
    fields = set(reader.fieldnames or [])
    time_field = "timestamp" if "timestamp" in fields else "ts_event"
    if not {time_field, "open", "high", "low", "close"} <= fields:
        raise ValueError("Colonnes requises : timestamp (ou ts_event), open, high, low, close ; volume facultatif.")
    bars, previous, gaps = [], None, 0
    for index, row in enumerate(reader, 2):
        if len(bars) >= MAX_BARS:
            raise ValueError("Maximum 100 000 bougies par fichier.")
        try:
            stamp = datetime.fromisoformat(row[time_field].replace("Z", "+00:00"))
            if stamp.tzinfo is None or stamp.second or stamp.microsecond:
                raise ValueError("Date ISO avec fuseau, alignée à la minute, requise.")
            timestamp = int(stamp.timestamp())
            if stamp > datetime.now(timezone.utc):
                raise ValueError("Les bougies futures ne sont pas acceptées.")
            if previous is not None and timestamp <= previous:
                raise ValueError("Les dates doivent être strictement croissantes, sans doublons.")
            if row.get("symbol") and row["symbol"] not in (symbol, row.get("contract")):
                # A futures expiration may be present; root must match and is
                # subsequently checked against the declared contract by import.
                if INSTRUMENTS[symbol][0] != "futures" or not row["symbol"].startswith(symbol):
                    raise ValueError("Le fichier mélange des instruments.")
            prices = {key: D(row[key]) for key in ("open", "high", "low", "close")}
            if min(prices.values()) <= 0 or prices["high"] < max(prices.values()) or prices["low"] > min(prices.values()):
                raise ValueError("OHLC incohérent.")
            if any(price % D(INSTRUMENTS[symbol][1]) for price in prices.values()):
                raise ValueError("Les prix ne respectent pas le tick de l’instrument.")
            volume = D(row["volume"]) if row.get("volume") else None
            if volume is not None and volume < 0:
                raise ValueError("Volume négatif.")
        except (ValueError, KeyError, ArithmeticError) as exc:
            raise ValueError(f"Ligne {index} : {exc}") from exc
        if previous is not None and timestamp - previous > 60:
            gaps += 1
        bars.append({"timestamp": timestamp, **{key: str(value) for key, value in prices.items()},
                     "volume": str(volume) if volume is not None else None,
                     "symbol": symbol, "timeframe": "1m", "source": "private_csv",
                     "source_symbol": row.get("symbol", "")})
        previous = timestamp
    if len(bars) < 2:
        raise ValueError("Il faut au moins deux bougies historiques.")
    return bars, {"count": len(bars), "first": bars[0]["timestamp"], "last": bars[-1]["timestamp"],
                  "gaps": gaps, "volume_available": all(b["volume"] is not None for b in bars),
                  "warning": "Les intervalles sans données ne sont pas comblés. Ils peuvent correspondre à une fermeture ou à une lacune du fournisseur."}


class PrivateCsvProvider:
    """All retrievals include the authenticated owner; no global data cache."""
    def __init__(self, db, user_id):
        self.db, self.user_id = db, user_id

    async def get_available_markets(self):
        return sorted({value[0] for value in INSTRUMENTS.values()})

    async def get_symbols(self):
        return [metadata(symbol) for symbol in INSTRUMENTS]

    async def search_symbols(self, query):
        return [value for value in await self.get_symbols() if query.upper() in value["symbol"]]

    async def get_instrument_metadata(self, symbol):
        return metadata(symbol)

    async def get_session_info(self, dataset_id):
        return await self.db.backtest_datasets.find_one({"id": dataset_id, "user_id": self.user_id, "ready": True}, {"_id": 0})

    async def get_historical_bars(self, dataset_id, from_timestamp, to_timestamp, limit=2000):
        return await self.db.backtest_bars.find({"dataset_id": dataset_id, "user_id": self.user_id,
            "timestamp": {"$gte": from_timestamp, "$lte": to_timestamp}}, {"_id": 0, "user_id": 0, "dataset_id": 0}).sort("timestamp", 1).limit(min(limit, 2000)).to_list(min(limit, 2000))

    async def get_bars_before(self, dataset_id, timestamp, limit=2000):
        bars = await self.db.backtest_bars.find({"dataset_id": dataset_id, "user_id": self.user_id,
            "timestamp": {"$lte": timestamp}}, {"_id": 0, "user_id": 0, "dataset_id": 0}).sort("timestamp", -1).limit(min(limit, 2000)).to_list(min(limit, 2000))
        return list(reversed(bars))

    async def get_bars_after(self, dataset_id, timestamp, limit=1):
        return await self.db.backtest_bars.find({"dataset_id": dataset_id, "user_id": self.user_id,
            "timestamp": {"$gt": timestamp}}, {"_id": 0, "user_id": 0, "dataset_id": 0}).sort("timestamp", 1).limit(min(limit, 2000)).to_list(min(limit, 2000))
