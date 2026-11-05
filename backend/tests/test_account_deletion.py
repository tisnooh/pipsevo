import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

from account_deletion import AccountDeletionRetryWorker, AccountDeletionService, DeletionGateway, build_account_deletion_router

USER = "00000000-0000-4000-8000-000000000001"
OTHER = "00000000-0000-4000-8000-000000000002"


class Gateway:
    configured = True
    def __init__(self, failure=""):
        self.state, self.failure, self.calls = "active", failure, []
    async def disable(self, user):
        self.calls.append("disable")
        if self.failure != "disable":
            self.state = "disabled"
        if self.failure in {"disable", "timeout_after_disable"}:
            raise RuntimeError("simulated provider failure")
    async def auth_state(self, user):
        return self.state
    async def purge_screenshots(self, user):
        self.calls.append("storage")
        if self.failure == "storage":
            raise RuntimeError("simulated storage failure")
    async def delete_auth(self, user):
        self.calls.append("hard_delete")
        if self.failure == "hard_delete":
            raise RuntimeError("simulated Auth failure")
        self.state = "absent"


async def fixture(failure=""):
    db = AsyncMongoMockClient().deletion
    for owner in (USER, OTHER):
        await db.backtest_sessions.insert_one({"id": owner, "user_id": owner})
        await db.trades.insert_one({"id": owner, "user_id": owner})
    gateway = Gateway(failure)
    return db, gateway, AccountDeletionService(db, gateway)


def test_failed_auth_deletion_keeps_all_lab_data_and_no_storage_is_removed():
    async def scenario():
        db, gateway, service = await fixture("disable")
        with pytest.raises(HTTPException) as caught:
            await service.start({"id": USER, "email": "person@example.test"})
        assert caught.value.status_code == 503
        assert await db.backtest_sessions.count_documents({"user_id": USER}) == 1
        assert gateway.calls == ["disable"]
        assert (await db.account_deletion_jobs.find_one({"_id": USER}))["status"] == "unconfirmed"
        assert await service.retry() == {"completed": 0, "pending": 1}
        assert gateway.calls == ["disable"]  # a job cannot authorize removal of active Auth
    asyncio.run(scenario())


@pytest.mark.parametrize("failure", ["storage", "hard_delete"])
def test_partial_cleanup_is_truthful_and_resumable_without_deleting_other_users(failure):
    async def scenario():
        db, gateway, service = await fixture(failure)
        result = await service.start({"id": USER, "email": "person@example.test", "_supabase_token": "not-stored"})
        assert result == {"ok": True, "cleanup_pending": True}
        assert await db.backtest_sessions.count_documents({"user_id": USER}) == 1
        job = await db.account_deletion_jobs.find_one({"_id": USER})
        assert "_supabase_token" not in job and "not-stored" not in str(job)
        gateway.failure = ""
        assert await service.retry() == {"completed": 1, "pending": 0}
        assert await db.backtest_sessions.count_documents({"user_id": USER}) == 0
        assert await db.trades.count_documents({"user_id": USER}) == 0
        assert await db.backtest_sessions.count_documents({"user_id": OTHER}) == 1
        assert "email" not in await db.account_deletion_jobs.find_one({"_id": USER})
    asyncio.run(scenario())


def test_successful_or_timed_out_confirmed_auth_revocation_is_safe():
    async def scenario():
        for failure in ("", "timeout_after_disable"):
            db, gateway, service = await fixture(failure)
            assert await service.start({"id": USER}) == {"ok": True, "cleanup_pending": False}
            assert gateway.calls == ["disable", "storage", "hard_delete"]
            assert await db.backtest_sessions.count_documents({"user_id": OTHER}) == 1
            assert await service.retry() == {"completed": 0, "pending": 0}
    asyncio.run(scenario())


def test_retry_checks_storage_when_auth_was_already_removed():
    async def scenario():
        db, gateway, service = await fixture()
        await db.account_deletion_jobs.insert_one({"_id": USER, "status": "cleanup_pending"})
        gateway.state = "absent"
        gateway.failure = "storage"
        assert await service.retry() == {"completed": 0, "pending": 1}
        assert await db.backtest_sessions.count_documents({"user_id": USER}) == 1
        gateway.failure = ""
        assert await service.retry() == {"completed": 1, "pending": 0}
        assert gateway.calls == ["storage", "storage"]
        assert await db.backtest_sessions.count_documents({"user_id": USER}) == 0
        assert await db.backtest_sessions.count_documents({"user_id": OTHER}) == 1
    asyncio.run(scenario())


def test_no_destructive_calls_without_configuration_or_database_job():
    async def scenario():
        db, gateway, service = await fixture()
        gateway.configured = False
        with pytest.raises(HTTPException):
            await service.start({"id": USER})
        assert not gateway.calls
        gateway.configured = True
        service.db = SimpleNamespace(account_deletion_jobs=SimpleNamespace(update_one=AsyncMock(side_effect=RuntimeError("DB unavailable"))))
        with pytest.raises(HTTPException) as caught:
            await service.start({"id": USER})
        assert caught.value.status_code == 503
        assert not gateway.calls
    asyncio.run(scenario())


def test_confirmation_and_internal_secret_fail_closed(monkeypatch):
    db = AsyncMongoMockClient().deletion_routes
    async def user():
        return {"id": USER, "_supabase_token": "test-user-token"}
    app = FastAPI()
    app.include_router(build_account_deletion_router(user, db, "https://example.test", "public", None), prefix="/api")
    with TestClient(app) as client:
        assert client.post("/api/account/delete", json={"confirmation": "wrong"}).status_code == 422
        assert client.post("/api/account/delete", json={"confirmation": "SUPPRIMER", "user_id": OTHER}).status_code == 422
        assert client.post("/api/account/delete", json={"confirmation": "SUPPRIMER"}).status_code == 503
        monkeypatch.setenv("CRON_SECRET", "test-internal")
        assert client.post("/api/internal/account-deletion/retry").status_code == 403
        assert client.post("/api/internal/account-deletion/retry", headers={"x-cron-secret": "wrong"}).status_code == 403


def test_storage_cleanup_is_scoped_and_paginated():
    async def scenario():
        gateway = DeletionGateway("https://example.test", "private-server-key")
        gateway.request = AsyncMock(side_effect=[
            [{"name": "trade-folder", "id": None}],
            [{"name": "shot.jpg", "id": "object"}], {},
        ])
        await gateway.purge_screenshots(USER)
        assert gateway.request.call_args_list[-1].args == (
            "DELETE", "/storage/v1/object/trade-screenshots", {"prefixes": [f"{USER}/trade-folder/shot.jpg"]},
        )
    asyncio.run(scenario())


def test_failed_jobs_do_not_starve_later_confirmed_accounts():
    async def scenario():
        db, gateway, service = await fixture()
        older = datetime.now(timezone.utc) - timedelta(days=1)
        for index in range(21):
            await db.account_deletion_jobs.insert_one({
                "_id": USER if index == 20 else f"unconfirmed-{index}",
                "status": "unconfirmed", "created_at": older + timedelta(seconds=index),
                "updated_at": older + timedelta(seconds=index),
            })
        gateway.auth_state = AsyncMock(side_effect=lambda owner: "absent" if owner == USER else "active")
        assert await service.retry() == {"completed": 0, "pending": 20}
        assert await db.backtest_sessions.count_documents({"user_id": USER}) == 1
        assert await service.retry() == {"completed": 1, "pending": 19}
        assert await db.backtest_sessions.count_documents({"user_id": USER}) == 0
        assert await db.backtest_sessions.count_documents({"user_id": OTHER}) == 1
    asyncio.run(scenario())


def test_locked_jobs_do_not_consume_the_entire_retry_batch():
    async def scenario():
        db, gateway, service = await fixture()
        now = datetime.now(timezone.utc)
        for index in range(20):
            await db.account_deletion_jobs.insert_one({
                "_id": f"locked-{index}", "status": "cleanup_pending",
                "created_at": now - timedelta(days=1), "updated_at": now - timedelta(days=1),
                "locked_until": now + timedelta(minutes=10),
            })
        await db.account_deletion_jobs.insert_one({"_id": USER, "status": "cleanup_pending", "created_at": now, "updated_at": now})
        gateway.state = "absent"
        assert await service.retry() == {"completed": 1, "pending": 0}
        assert await db.backtest_sessions.count_documents({"user_id": USER}) == 0
    asyncio.run(scenario())


@pytest.mark.parametrize("collection", ["newsletter_subscribers", "newsletter_deliveries", "contact_messages"])
def test_email_reuse_never_erases_new_or_foreign_records(collection):
    async def scenario():
        db, gateway, service = await fixture()
        cutoff = datetime.now(timezone.utc) - timedelta(hours=1)
        before, after = cutoff - timedelta(days=1), cutoff + timedelta(minutes=1)
        rows = [
            {"_id": "owned", "user_id": USER, "email": "old@example.test"},
            {"_id": "old-anonymous", "email": "reused@example.test", "created_at": before},
            {"_id": "foreign", "email": "reused@example.test", "user_id": OTHER, "created_at": before},
            {"_id": "new-anonymous", "email": "reused@example.test", "created_at": after},
            {"_id": "renewed-consent", "email": "reused@example.test", "created_at": before, "updated_at": after},
        ]
        await db[collection].insert_many(rows)
        job = {"_id": USER, "status": "cleanup_pending", "email": "reused@example.test", "created_at": cutoff}
        await db.account_deletion_jobs.insert_one(job)
        gateway.state = "absent"
        assert await service.retry() == {"completed": 1, "pending": 0}
        assert {row["_id"] async for row in db[collection].find({})} == {"foreign", "new-anonymous", "renewed-consent"}
    asyncio.run(scenario())


@pytest.mark.parametrize("dates", [{}, {"created_at": datetime(2020, 1, 1, tzinfo=timezone.utc), "updated_at": "invalid"}])
def test_undated_email_records_require_review_not_a_false_completed_erasure(dates):
    async def scenario():
        db, gateway, service = await fixture()
        await db.newsletter_subscribers.insert_one({"email": "person@example.test", **dates})
        assert await service.start({"id": USER, "email": "person@example.test"}) == {"ok": True, "cleanup_pending": True}
        job = await db.account_deletion_jobs.find_one({"_id": USER})
        assert job["status"] == "manual_review_required"
        assert "expires_at" not in job
        assert await db.newsletter_subscribers.count_documents({"email": "person@example.test"}) == 1
        assert await service.retry() == {"completed": 0, "pending": 1}
    asyncio.run(scenario())


def test_legacy_job_without_cutoff_cannot_delete_email_only_records():
    async def scenario():
        db, gateway, service = await fixture()
        await db.newsletter_subscribers.insert_one({"email": "person@example.test", "created_at": datetime.now(timezone.utc)})
        await db.account_deletion_jobs.insert_one({"_id": USER, "email": "person@example.test", "status": "cleanup_pending"})
        gateway.state = "absent"
        assert await service.retry() == {"completed": 0, "pending": 1}
        assert (await db.account_deletion_jobs.find_one({"_id": USER}))["status"] == "manual_review_required"
        assert await db.newsletter_subscribers.count_documents({"email": "person@example.test"}) == 1
    asyncio.run(scenario())


@pytest.mark.parametrize("payload", [None, [], {}, {"user": None}, {"id": OTHER, "deleted_at": "2026-10-11T10:00:00Z"},
                                     {"id": USER, "deleted_at": True}, {"id": USER, "deleted_at": "invalid"},
                                     {"id": USER, "deleted_at": "2026-10-11T10:00:00"}])
def test_auth_removal_confirmation_requires_matching_identity_and_valid_timestamp(payload):
    async def scenario():
        gateway = DeletionGateway("https://example.test", "private-server-key")
        gateway.request = AsyncMock(return_value=payload)
        with pytest.raises(RuntimeError, match="Invalid Auth erasure confirmation"):
            await gateway.auth_state(USER)
    asyncio.run(scenario())


@pytest.mark.parametrize("payload,state", [({"id": USER}, "active"),
                                          ({"user": {"id": USER, "deleted_at": "2026-10-11T10:00:00Z"}}, "disabled")])
def test_valid_auth_confirmation_states(payload, state):
    async def scenario():
        gateway = DeletionGateway("https://example.test", "private-server-key")
        gateway.request = AsyncMock(return_value=payload)
        assert await gateway.auth_state(USER) == state
    asyncio.run(scenario())


def test_retry_worker_starts_once_and_cancels_before_closing_database():
    async def scenario():
        service = SimpleNamespace(gateway=SimpleNamespace(configured=True), retry=AsyncMock())
        worker = AccountDeletionRetryWorker(service, 30)
        worker.start()
        first = worker.task
        worker.start()
        assert worker.task is first
        await asyncio.sleep(0)
        service.retry.assert_not_awaited()
        await worker.stop()
        assert first.cancelled() and worker.task is None
    asyncio.run(scenario())


def test_retry_worker_disabled_without_server_configuration():
    async def scenario():
        worker = AccountDeletionRetryWorker(SimpleNamespace(gateway=SimpleNamespace(configured=False)), 30)
        worker.start()
        assert worker.task is None
        await worker.stop()
    asyncio.run(scenario())


@pytest.mark.parametrize("interval", [0, 29, 86401, True, "600", 30.5])
def test_retry_worker_interval_is_bounded(interval):
    with pytest.raises(ValueError):
        AccountDeletionRetryWorker(None, interval)


def test_retry_worker_preserves_jobs_and_keeps_running_after_failure(monkeypatch, caplog):
    import account_deletion
    async def scenario():
        sleep_calls = 0
        async def wait(_seconds):
            nonlocal sleep_calls
            sleep_calls += 1
            if sleep_calls == 3:
                raise asyncio.CancelledError
        service = SimpleNamespace(gateway=SimpleNamespace(configured=True),
                                  retry=AsyncMock(side_effect=[RuntimeError("private@example.test secret"), {"completed": 1, "pending": 2}]))
        worker = AccountDeletionRetryWorker(service, 30)
        monkeypatch.setattr(account_deletion.asyncio, "sleep", wait)
        with pytest.raises(asyncio.CancelledError):
            await worker.run()
        assert service.retry.await_count == 2
        assert "private@example.test" not in caplog.text and "secret" not in caplog.text
        assert "persisted jobs retained" in caplog.text
    asyncio.run(scenario())


@pytest.mark.parametrize("payload", [{}, {"error_code": "validation_failed"}, {"message": "Not found"}, []])
def test_generic_404_is_not_auth_erasure_proof(monkeypatch, payload):
    import account_deletion
    async def scenario():
        monkeypatch.setattr(account_deletion.requests, "request", lambda *_args, **_kwargs:
                            SimpleNamespace(status_code=404, content=b"error", json=lambda: payload))
        gateway = DeletionGateway("https://example.test", "private-server-key")
        with pytest.raises(RuntimeError, match="provider request failed"):
            await gateway.auth_state(USER)
    asyncio.run(scenario())


def test_official_user_not_found_404_confirms_absence(monkeypatch):
    import account_deletion
    async def scenario():
        monkeypatch.setattr(account_deletion.requests, "request", lambda *_args, **_kwargs:
                            SimpleNamespace(status_code=404, content=b"error", json=lambda: {"error_code": "user_not_found"}))
        gateway = DeletionGateway("https://example.test", "private-server-key")
        assert await gateway.auth_state(USER) == "absent"
    asyncio.run(scenario())


@pytest.mark.parametrize("status_code", [200, 302])
def test_ambiguous_provider_reply_never_removes_storage_or_lab(monkeypatch, status_code):
    import account_deletion
    async def scenario():
        db, _, service = await fixture()
        service.gateway = DeletionGateway("https://example.test", "private-server-key")
        calls = []
        def reply(method, url, **kwargs):
            assert kwargs["allow_redirects"] is False
            calls.append(method)
            return SimpleNamespace(status_code=status_code, content=b"null", json=lambda: None)
        monkeypatch.setattr(account_deletion.requests, "request", reply)
        await db.account_deletion_jobs.insert_one({"_id": USER, "status": "cleanup_pending"})
        assert await service.retry() == {"completed": 0, "pending": 1}
        assert calls == ["GET"]
        assert await db.backtest_sessions.count_documents({"user_id": USER}) == 1
    asyncio.run(scenario())
