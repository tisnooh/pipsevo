import asyncio

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

import account_export
from account_export import build_account_export_router, export_backtest_data


def test_export_contains_only_owner_lab_data_and_no_private_jobs_or_connections():
    async def scenario():
        db = AsyncMongoMockClient().portability
        for collection in account_export.COLLECTIONS:
            await db[collection].insert_many([{"id": "mine", "user_id": "u1", "value": 5}, {"id": "other", "user_id": "u2"}])
        await db.integration_connections.insert_one({"user_id": "u1", "secret": "not-for-export"})
        await db.account_deletion_jobs.insert_one({"user_id": "u1", "status": "private"})
        result = await export_backtest_data(db, "u1")
        assert set(result) == set(account_export.COLLECTIONS)
        assert all(rows == [{"id": "mine", "user_id": "u1", "value": 5}] for rows in result.values())
        assert "not-for-export" not in str(result)
    asyncio.run(scenario())


@pytest.mark.parametrize("limit", ["MAX_ROWS", "MAX_BYTES"])
def test_large_export_is_rejected_not_silently_truncated(monkeypatch, limit):
    monkeypatch.setattr(account_export, limit, 1)
    async def scenario():
        db = AsyncMongoMockClient().portability_limit
        await db.backtest_bars.insert_many([{"user_id": "u1", "close": 100}, {"user_id": "u1", "close": 101}])
        with pytest.raises(HTTPException) as caught:
            await export_backtest_data(db, "u1")
        assert caught.value.status_code == 413
        assert await db.backtest_bars.count_documents({}) == 2
    asyncio.run(scenario())


def test_route_requires_real_authenticated_owner_and_ignores_requested_user_id():
    db = AsyncMongoMockClient().portability_routes
    async def owner():
        return {"id": "u1", "_supabase_token": "test-session"}
    app = FastAPI()
    app.include_router(build_account_export_router(owner, db), prefix="/api")
    with TestClient(app) as client:
        result = client.get("/api/account/backtest-export?user_id=u2")
        assert result.status_code == 200
        assert all(not rows for rows in result.json().values())
    async def missing():
        return {"id": "u1"}
    app.dependency_overrides[owner] = missing
    with TestClient(app) as client:
        assert client.get("/api/account/backtest-export").status_code == 401
