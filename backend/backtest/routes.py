import asyncio
import re
import time
import uuid
from datetime import datetime, timezone
from typing import Literal
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field, ConfigDict

from .analytics import summarize
from .data import MAX_UPLOAD_BYTES, PrivateCsvProvider, parse_csv
from .engine import advance, command, initial_state, finish_at_data_end
from .instruments import INSTRUMENTS, decimal as D, metadata
from .limits import BETA_LIMITS


class SessionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dataset_id: str = Field(max_length=64)
    name: str = Field(min_length=1, max_length=80)
    start: int = Field(ge=0)
    capital: str = "10000"
    commission: str = "0"
    slippage_ticks: int = Field(default=1, ge=0, le=100)
    strategy_id: str | None = None
    timezone: str = "Europe/Paris"


class CommandIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    revision: int = Field(ge=0)
    action: Literal["next", "previous", "order", "cancel", "close", "breakeven", "complete", "settings"]
    payload: dict = Field(default_factory=dict)


class StrategyIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=1, max_length=80)
    description: str = Field(default="", max_length=2000)
    rules: list[str] = Field(default_factory=list, max_length=20)


async def ensure_backtest_indexes(db):
    for name in ("backtest_sessions", "backtest_datasets", "backtest_strategies"):
        await db[name].create_index("id", unique=True)
        await db[name].create_index([("user_id", 1), ("created_at", -1)])
    await db.backtest_bars.create_index([("user_id", 1), ("dataset_id", 1), ("timestamp", 1)], unique=True)
    await db.backtest_usage.create_index("expires_at", expireAfterSeconds=0)


def build_backtest_router(get_current_user, db, feature_checker=None):
    router = APIRouter(prefix="/backtest", tags=["Backtest Lab"])

    async def authenticated(user=Depends(get_current_user)):
        if feature_checker and not await feature_checker("new_backtest_lab", user, True):
            raise HTTPException(403, "Le Backtest Lab n’est pas activé pour ce compte.")
        # Shared DB counter works across workers, with no raw IP or token stored.
        bucket = int(time.time() // 60)
        key = f"{user['id']}:{bucket}"
        record = await db.backtest_usage.find_one_and_update({"_id": key},
            {"$inc": {"count": 1}, "$setOnInsert": {"expires_at": datetime.fromtimestamp((bucket + 2) * 60, timezone.utc)}},
            upsert=True, return_document=True)
        if record["count"] > BETA_LIMITS["commands_per_minute"]:
            raise HTTPException(429, "Trop de requêtes de replay. Réessaie dans une minute.")
        return user

    async def owned(collection, item_id, user):
        item = await db[collection].find_one({"id": item_id, "user_id": user["id"]}, {"_id": 0})
        if not item:
            raise HTTPException(404, "Élément introuvable.")
        return item

    def public(session):
        return {**session, "analytics": summarize(session["state"], session["config"]["capital"]),
                "currentReplayTimestamp": session["cursor"] + 60}

    @router.get("/catalog")
    async def catalog(user=Depends(authenticated)):
        return {"instruments": [metadata(s) for s in INSTRUMENTS], "timeframes": ["1m", "5m", "15m", "1h", "4h"],
                "providers": [{"id": "private_csv", "name": "Historique CSV privé", "available": True},
                              {"id": "databento", "name": "Databento · Futures", "available": False,
                               "reason": "Connexion fournisseur et licence de diffusion SaaS à valider."}],
                "limits": BETA_LIMITS,
                "unsupported": ["USDJPY et GBPJPY : conversion historique vers USD à implémenter.", "Crypto : phase ultérieure."]}

    @router.delete("/account-data")
    async def delete_account_data(user=Depends(authenticated)):
        """Purge every Backtest Lab record before the Supabase user is deleted."""
        owner = {"user_id": user["id"]}
        deleted = {}
        for collection in ("backtest_sessions", "backtest_strategies", "backtest_bars", "backtest_datasets"):
            result = await db[collection].delete_many(owner)
            deleted[collection] = result.deleted_count
        usage = await db.backtest_usage.delete_many({"_id": {"$regex": f"^{re.escape(user['id'])}:"}})
        deleted["backtest_usage"] = usage.deleted_count
        return {"ok": True, "deleted": deleted}

    @router.get("/datasets")
    async def datasets(user=Depends(authenticated)):
        return await db.backtest_datasets.find({"user_id": user["id"], "ready": True}, {"_id": 0}).sort("created_at", -1).to_list(10)

    @router.post("/datasets")
    async def upload(symbol: str = Form(...), contract: str = Form(""), source: str = Form(...),
                     rights_confirmed: bool = Form(...), file: UploadFile = File(...), user=Depends(authenticated)):
        if not rights_confirmed:
            raise HTTPException(422, "Confirme ton droit d’utiliser cet historique.")
        if symbol not in INSTRUMENTS or not source.strip() or len(source) > 120:
            raise HTTPException(422, "Instrument ou source invalide.")
        if INSTRUMENTS[symbol][0] == "futures" and not re.fullmatch(re.escape(symbol) + r"[FGHJKMNQUVXZ]\d{1,4}", contract):
            raise HTTPException(422, "Indique le contrat daté exact, par exemple NQH5. Les contrats continus ne sont pas acceptés.")
        if await db.backtest_datasets.count_documents({"user_id": user["id"]}) >= BETA_LIMITS["datasets"]:
            raise HTTPException(409, "Limite bêta de 10 historiques atteinte.")
        raw = await file.read(MAX_UPLOAD_BYTES + 1)
        await file.close()
        try:
            bars, quality = await asyncio.to_thread(parse_csv, raw, symbol)
            if any(b["source_symbol"] and b["source_symbol"] not in (symbol, contract) for b in bars):
                raise ValueError("Le contrat du fichier ne correspond pas au contrat déclaré.")
        except ValueError as exc:
            raise HTTPException(422, str(exc)) from exc
        dataset_id = str(uuid.uuid4())
        item = {"id": dataset_id, "user_id": user["id"], "symbol": symbol, "contract": contract,
                "source": source.strip(), "provider": "private_csv", "timeframe": "1m", "quality": quality,
                "created_at": datetime.now(timezone.utc).isoformat(), "ready": False}
        await db.backtest_datasets.insert_one(dict(item))
        try:
            for offset in range(0, len(bars), 2000):
                await db.backtest_bars.insert_many([{**b, "user_id": user["id"], "dataset_id": dataset_id} for b in bars[offset:offset + 2000]])
            await db.backtest_datasets.update_one({"id": dataset_id, "user_id": user["id"]}, {"$set": {"ready": True}})
        except Exception:
            await db.backtest_bars.delete_many({"dataset_id": dataset_id, "user_id": user["id"]})
            await db.backtest_datasets.delete_one({"id": dataset_id, "user_id": user["id"]})
            raise
        return {**item, "ready": True}

    @router.delete("/datasets/{dataset_id}")
    async def delete_dataset(dataset_id: str, user=Depends(authenticated)):
        await owned("backtest_datasets", dataset_id, user)
        if await db.backtest_sessions.count_documents({"dataset_id": dataset_id, "user_id": user["id"]}):
            raise HTTPException(409, "Cet historique est utilisé par une session.")
        await db.backtest_bars.delete_many({"dataset_id": dataset_id, "user_id": user["id"]})
        await db.backtest_datasets.delete_one({"id": dataset_id, "user_id": user["id"]})
        return {"ok": True}

    @router.get("/strategies")
    async def strategies(user=Depends(authenticated)):
        return await db.backtest_strategies.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)

    @router.post("/strategies")
    async def create_strategy(body: StrategyIn, user=Depends(authenticated)):
        if any(not rule.strip() or len(rule) > 200 for rule in body.rules):
            raise HTTPException(422, "Chaque règle doit contenir entre 1 et 200 caractères.")
        if await db.backtest_strategies.count_documents({"user_id": user["id"]}) >= BETA_LIMITS["strategies"]:
            raise HTTPException(409, "Limite de 100 stratégies atteinte.")
        row = {**body.model_dump(), "id": str(uuid.uuid4()), "user_id": user["id"], "created_at": datetime.now(timezone.utc).isoformat()}
        await db.backtest_strategies.insert_one(dict(row))
        return row

    @router.get("/sessions")
    async def sessions(user=Depends(authenticated)):
        rows = await db.backtest_sessions.find({"user_id": user["id"]}, {"_id": 0, "state.orders": 0, "state.trades": 0}).sort("created_at", -1).to_list(100)
        return rows

    @router.post("/sessions")
    async def create(body: SessionIn, user=Depends(authenticated)):
        dataset = await owned("backtest_datasets", body.dataset_id, user)
        if not dataset["ready"]:
            raise HTTPException(409, "Historique encore en préparation.")
        try:
            if not (0 < D(body.capital) <= 100000000) or not (0 <= D(body.commission) <= 1000):
                raise ValueError("Capital ou commission invalide.")
            ZoneInfo(body.timezone)
        except (ValueError, ArithmeticError, ZoneInfoNotFoundError) as exc:
            raise HTTPException(422, "Capital, commission ou fuseau invalide.") from exc
        if await db.backtest_sessions.count_documents({"user_id": user["id"]}) >= BETA_LIMITS["sessions"]:
            raise HTTPException(409, "Limite bêta de 100 sessions atteinte.")
        if not dataset["quality"]["first"] <= body.start < dataset["quality"]["last"]:
            raise HTTPException(422, "Choisis un départ dans la période importée, avant sa dernière bougie.")
        provider = PrivateCsvProvider(db, user["id"])
        before = await provider.get_bars_before(body.dataset_id, body.start, 1)
        strategy = await owned("backtest_strategies", body.strategy_id, user) if body.strategy_id else None
        if strategy:
            strategy = {k: strategy[k] for k in ("id", "name", "description", "rules")}
        item = {"id": str(uuid.uuid4()), "user_id": user["id"], "dataset_id": body.dataset_id,
                "name": body.name.strip(), "created_at": datetime.now(timezone.utc).isoformat(),
                "config": {"symbol": dataset["symbol"], "capital": str(D(body.capital)), "commission": str(D(body.commission)),
                           "slippage_ticks": body.slippage_ticks, "strategy": strategy},
                "dataset": {k: dataset[k] for k in ("source", "contract", "quality", "timeframe")},
                "cursor": before[0]["timestamp"], "start_cursor": before[0]["timestamp"], "revision": 0,
                "settings": {"timeframe": "5m", "secondary": "1h", "dual": False, "timezone": body.timezone},
                "state": initial_state(body.capital)}
        await db.backtest_sessions.insert_one(dict(item))
        return public(item)

    @router.get("/sessions/{session_id}")
    async def get_session(session_id: str, user=Depends(authenticated)):
        return public(await owned("backtest_sessions", session_id, user))

    @router.get("/sessions/{session_id}/bars")
    async def visible_bars(session_id: str, before: int | None = None, user=Depends(authenticated)):
        session = await owned("backtest_sessions", session_id, user)
        end = min(before, session["cursor"]) if before is not None else session["cursor"]
        return await PrivateCsvProvider(db, user["id"]).get_bars_before(session["dataset_id"], end, 2000)

    @router.post("/sessions/{session_id}/commands")
    async def execute(session_id: str, body: CommandIn, user=Depends(authenticated)):
        session = await owned("backtest_sessions", session_id, user)
        if session["revision"] != body.revision:
            raise HTTPException(409, "Session modifiée dans un autre onglet. Recharge-la avant de continuer.")
        provider = PrivateCsvProvider(db, user["id"])
        changed_bars = []
        try:
            if body.action == "next":
                changed_bars = await provider.get_bars_after(session["dataset_id"], session["cursor"], 1)
                if not changed_bars:
                    raise HTTPException(409, "Fin de l’historique. Aucune bougie future n’est disponible.")
                session["state"] = advance(session["state"], session["config"], changed_bars[0])
                session["cursor"] = changed_bars[0]["timestamp"]
                if session["cursor"] >= session["dataset"]["quality"]["last"]:
                    session["state"] = finish_at_data_end(session["state"], session["config"], changed_bars[0])
            elif body.action == "previous":
                if session["state"]["orders"] or session["state"]["trades"] or session["state"]["completed"]:
                    raise ValueError("Recul désactivé après le premier ordre pour préserver l’intégrité des résultats. Crée une nouvelle session.")
                bars = await provider.get_bars_before(session["dataset_id"], session["cursor"] - 1, 1)
                if not bars:
                    raise ValueError("Début de l’historique atteint.")
                session["cursor"] = bars[0]["timestamp"]
            elif body.action == "settings":
                allowed = {"1m", "5m", "15m", "1h", "4h"}
                if body.payload.get("timeframe", "5m") not in allowed or body.payload.get("secondary", "1h") not in allowed:
                    raise ValueError("Unité de temps invalide.")
                zone = body.payload.get("timezone", session["settings"]["timezone"])
                ZoneInfo(zone)
                session["settings"] = {"timeframe": body.payload.get("timeframe", "5m"), "secondary": body.payload.get("secondary", "1h"),
                                       "dual": body.payload.get("dual") is True, "timezone": zone}
            else:
                bars = await provider.get_bars_before(session["dataset_id"], session["cursor"], 1)
                rules = (session["config"].get("strategy") or {}).get("rules", [])
                checklist = body.payload.get("checklist", {})
                if not isinstance(checklist, dict) or any(k not in rules or not isinstance(v, bool) for k, v in checklist.items()):
                    raise ValueError("Check-list invalide.")
                if body.action == "order" and session["cursor"] >= session["dataset"]["quality"]["last"]:
                    raise ValueError("Fin de l’historique : aucun nouvel ordre ne peut être exécuté.")
                session["state"] = command(session["state"], body.action, body.payload, session["config"], bars[0])
        except (ValueError, KeyError, ArithmeticError, TypeError, ZoneInfoNotFoundError) as exc:
            raise HTTPException(422, str(exc)) from exc
        updated = await db.backtest_sessions.update_one({"id": session_id, "user_id": user["id"], "revision": body.revision},
            {"$set": {"state": session["state"], "cursor": session["cursor"], "settings": session["settings"]}, "$inc": {"revision": 1}})
        if updated.modified_count != 1:
            raise HTTPException(409, "Conflit de sauvegarde. Recharge la session.")
        session["revision"] += 1
        return {"session": public(session), "bars": changed_bars}

    return router
