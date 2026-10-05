import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from mongomock_motor import AsyncMongoMockClient

from atlas_quota import reserve_analysis


def test_atomic_quota_limits_concurrent_requests_and_isolates_users():
    db = AsyncMongoMockClient().atlas_quota
    async def scenario():
        async def attempt(key):
            try:
                await reserve_analysis(db, key)
                return 200
            except HTTPException as exc:
                return exc.status_code
        results = await asyncio.gather(*(attempt("hashed-user") for _ in range(30)))
        assert results.count(200) == 10
        assert results.count(429) == 20
        assert await attempt("another-user") == 200
        bucket = await db.atlas_quotas.find_one({"_id": "hashed-user"})
        assert len(bucket["requests"]) == 10
    asyncio.run(scenario())


def test_quota_bootstraps_history_once_and_replenishes_after_24_hours():
    db = AsyncMongoMockClient().atlas_history
    now = datetime.now(timezone.utc)
    history = [{"created_at": (now - timedelta(hours=1)).isoformat()} for _ in range(9)]
    async def scenario():
        await reserve_analysis(db, "user", history, now=now)
        with pytest.raises(HTTPException) as caught:
            await reserve_analysis(db, "user", history, now=now)
        assert caught.value.status_code == 429
        await reserve_analysis(db, "user", history, now=now + timedelta(hours=24, seconds=1))
        assert len((await db.atlas_quotas.find_one({"_id": "user"}))["requests"]) == 1
    asyncio.run(scenario())


def test_quota_storage_failure_fails_closed():
    class BrokenCollection:
        async def find_one_and_update(self, *_args, **_kwargs):
            raise RuntimeError("offline")
    class BrokenDb:
        atlas_quotas = BrokenCollection()
    with pytest.raises(HTTPException) as caught:
        asyncio.run(reserve_analysis(BrokenDb(), "user"))
    assert caught.value.status_code == 503
