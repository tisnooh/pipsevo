"""Shared, atomic rolling quota, including requests still in flight."""
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from pymongo import ReturnDocument
from pymongo.errors import DuplicateKeyError


async def reserve_analysis(db, key_hash, historical_reports=(), *, now=None, limit=10):
    now = now or datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=24)
    history = []
    for report in historical_reports:
        try:
            stamp = report.get("created_at")
            stamp = datetime.fromisoformat(stamp.replace("Z", "+00:00")) if isinstance(stamp, str) else stamp
            if stamp.tzinfo is None:
                stamp = stamp.replace(tzinfo=timezone.utc)
            if stamp > cutoff:
                history.append(stamp)
        except (AttributeError, TypeError, ValueError):
            continue
    # Bootstrap historical reports only if the ledger does not yet exist.
    # Mongo serializes all reservations for this unique _id, across workers.
    update = [
        {"$set": {"requests": {"$filter": {
            "input": {"$ifNull": ["$requests", history[:limit]]},
            "as": "stamp", "cond": {"$gt": ["$$stamp", cutoff]},
        }}}},
        {"$set": {"allowed": {"$lt": [{"$size": "$requests"}, limit]}}},
        {"$set": {
            "requests": {"$cond": ["$allowed", {"$concatArrays": ["$requests", [now]]}, "$requests"]},
            "expires_at": now + timedelta(hours=48),
        }},
    ]
    try:
        try:
            bucket = await db.atlas_quotas.find_one_and_update(
                {"_id": key_hash}, update, upsert=True, return_document=ReturnDocument.AFTER,
            )
        except DuplicateKeyError:
            bucket = await db.atlas_quotas.find_one_and_update(
                {"_id": key_hash}, update, return_document=ReturnDocument.AFTER,
            )
    except Exception as exc:
        raise HTTPException(503, "Le quota Atlas ne peut pas être vérifié. Réessaie plus tard.") from exc
    if not bucket or not bucket.get("allowed"):
        raise HTTPException(429, "Atlas daily beta limit reached (10 analyses / 24h)")
    # Do not release a slot after a provider/persistence failure: expensive work
    # may already have happened and retry loops must remain bounded.
