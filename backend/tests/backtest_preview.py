"""Local-only visual test server. Synthetic fixtures NEVER used by production.

Run: python backend/tests/backtest_preview.py
No real auth, provider, user data or external database. Binds loopback only.
"""
import asyncio
from pathlib import Path
import sys
from datetime import datetime, timezone

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mongomock_motor import AsyncMongoMockClient
import uvicorn

from backtest.routes import build_backtest_router, ensure_backtest_indexes


db = AsyncMongoMockClient().backtest_fixture


async def fixture_user():
    return {"id": "local-fixture-only"}


async def seed():
    await ensure_backtest_indexes(db)
    start = int(datetime(2025, 3, 12, 8, tzinfo=timezone.utc).timestamp())
    bars = []
    for i in range(600):
        opening = 20000 + i * .25 + (i % 20) * .5
        close = opening + (.75 if i % 3 else -.5)
        bars.append({"timestamp": start + i * 60, "symbol": "NQ", "open": str(opening),
                     "high": str(max(opening, close) + 1), "low": str(min(opening, close) - 1),
                     "close": str(close), "volume": str(100 + i % 50), "timeframe": "1m", "source": "TEST FIXTURE",
                     "user_id": "local-fixture-only", "dataset_id": "fixture-nq"})
    await db.backtest_bars.insert_many(bars)
    await db.backtest_datasets.insert_one({"id": "fixture-nq", "user_id": "local-fixture-only", "symbol": "NQ", "contract": "NQH5",
        "source": "TEST ONLY · données synthétiques de validation", "provider": "private_csv", "timeframe": "1m", "ready": True,
        "created_at": "2025-03-12T08:00:00Z", "quality": {"first": start, "last": start + 599 * 60, "count": 600, "gaps": 0,
        "volume_available": True, "warning": "Données synthétiques réservées à la validation locale, pas des cours de marché."}})


app = FastAPI()
app.include_router(build_backtest_router(fixture_user, db), prefix="/api")
app.add_middleware(CORSMiddleware, allow_origins=["http://127.0.0.1:4188", "http://localhost:4188"], allow_methods=["*"], allow_headers=["*"])

if __name__ == "__main__":
    asyncio.run(seed())
    uvicorn.run(app, host="127.0.0.1", port=8091, log_level="warning")
