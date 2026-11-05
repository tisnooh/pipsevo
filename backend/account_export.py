"""Owner-scoped Lab portability without paid-feature gates or provider secrets."""
import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder

COLLECTIONS = ("backtest_datasets", "backtest_bars", "backtest_sessions", "backtest_strategies")
MAX_ROWS = 200000
MAX_BYTES = 32 * 1024 * 1024


async def export_backtest_data(db, user_id):
    result, count, size = {}, 0, 0
    for collection in COLLECTIONS:
        rows = []
        async for row in db[collection].find({"user_id": user_id}, {"_id": 0}).sort("id", 1):
            if row.get("user_id") != user_id:
                raise HTTPException(503, "Impossible de confirmer le propriétaire des données.")
            count += 1
            if count > MAX_ROWS:
                raise HTTPException(413, "L’archive backtest dépasse la limite de lecture sécurisée. Contacte le support pour un export complet.")
            safe = jsonable_encoder(row)
            size += len(json.dumps(safe, ensure_ascii=False).encode("utf-8"))
            if size > MAX_BYTES:
                raise HTTPException(413, "L’archive backtest dépasse la taille autorisée. Contacte le support pour un export complet.")
            rows.append(safe)
        result[collection] = rows
    return result


def build_account_export_router(get_current_user, db):
    router = APIRouter(tags=["Data portability"])

    @router.get("/account/backtest-export")
    async def export(user=Depends(get_current_user)):
        if not user.get("_supabase_token") or not user.get("id"):
            raise HTTPException(401, "Reconnecte-toi pour exporter tes données.")
        return await export_backtest_data(db, user["id"])

    return router
