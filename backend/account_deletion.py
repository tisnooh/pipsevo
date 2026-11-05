"""Confirmed, resumable cross-store erasure; no Lab purge before Auth succeeds.

Auth, Storage and Mongo do not share a transaction. Persist a private retry job
before revoking Auth, and report incomplete cleanup instead of claiming success.
Never store access tokens or keys in jobs.
"""
import asyncio
import hmac
import logging
import os
import re
from datetime import datetime, timedelta, timezone
from uuid import UUID

import requests
from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, ConfigDict
from pymongo import ReturnDocument


# Cannot be confused with JSON null from an upstream success/error response.
_AUTH_NOT_FOUND = object()


class DeleteAccountBody(BaseModel):
    model_config = ConfigDict(extra="forbid")
    confirmation: str


class ErasureReviewRequired(RuntimeError):
    """Legacy email-only records cannot safely be attributed to this owner."""


class DeletionGateway:
    def __init__(self, url, secret):
        self.url, self.secret = (url or "").rstrip("/"), secret or ""

    @property
    def configured(self):
        return self.url.startswith("https://") and bool(self.secret)

    async def request(self, method, path, payload=None):
        headers = {"apikey": self.secret, "Accept": "application/json"}
        if self.secret.count(".") == 2:
            headers["Authorization"] = f"Bearer {self.secret}"
        result = await asyncio.to_thread(requests.request, method, self.url + path,
                                        headers=headers, json=payload, timeout=15, allow_redirects=False)
        if result.status_code == 404 and path.startswith("/auth/v1/admin/users/"):
            # A missing route/proxy is not proof that Auth has been erased.
            try:
                error = result.json()
            except (ValueError, TypeError):
                error = None
            if isinstance(error, dict) and error.get("error_code") == "user_not_found":
                return _AUTH_NOT_FOUND
        if not 200 <= result.status_code < 300:
            # Provider bodies can contain PII. Never expose them.
            raise RuntimeError("Account erasure provider request failed")
        return result.json() if result.content else {}

    async def auth_state(self, user_id):
        data = await self.request("GET", f"/auth/v1/admin/users/{user_id}")
        if data is _AUTH_NOT_FOUND:
            return "absent"
        record = data.get("user", data) if isinstance(data, dict) else None
        try:
            matches = isinstance(record, dict) and UUID(str(record.get("id"))) == UUID(str(user_id))
        except (ValueError, TypeError, AttributeError):
            matches = False
        if not matches:
            raise RuntimeError("Invalid Auth erasure confirmation")
        deleted_at = record.get("deleted_at")
        if deleted_at is None:
            return "active"
        try:
            deleted = datetime.fromisoformat(deleted_at.replace("Z", "+00:00"))
            if deleted.tzinfo is None:
                raise ValueError("Missing timezone")
        except (ValueError, TypeError, AttributeError):
            raise RuntimeError("Invalid Auth erasure confirmation") from None
        return "disabled"

    async def disable(self, user_id):
        await self.request("DELETE", f"/auth/v1/admin/users/{user_id}", {"should_soft_delete": True})

    async def delete_auth(self, user_id):
        await self.request("DELETE", f"/auth/v1/admin/users/{user_id}", {"should_soft_delete": False})

    async def purge_screenshots(self, user_id):
        paths = []
        pages, seen = 0, set()
        async def visit(prefix, depth=0):
            nonlocal pages
            if depth > 8:
                raise RuntimeError("Storage traversal limit reached")
            offset = 0
            while True:
                pages += 1
                if pages > 500:
                    raise RuntimeError("Storage traversal limit reached")
                data = await self.request("POST", "/storage/v1/object/list/trade-screenshots", {
                    "prefix": prefix, "limit": 100, "offset": offset,
                    "sortBy": {"column": "name", "order": "asc"},
                })
                if not isinstance(data, list):
                    raise RuntimeError("Invalid Storage listing")
                for item in data:
                    name = item.get("name", "")
                    if not name or name in (".", "..") or "/" in name:
                        raise RuntimeError("Invalid Storage path")
                    path = f"{prefix}/{name}"
                    if path in seen:
                        raise RuntimeError("Repeated Storage path")
                    seen.add(path)
                    if item.get("id") or item.get("metadata"):
                        paths.append(path)
                    else:
                        await visit(path, depth + 1)
                if len(data) < 100:
                    break
                offset += len(data)
        await visit(user_id)
        for start in range(0, len(paths), 100):
            await self.request("DELETE", "/storage/v1/object/trade-screenshots", {"prefixes": paths[start:start + 100]})


class AccountDeletionService:
    def __init__(self, db, gateway):
        self.db, self.gateway = db, gateway

    async def purge_email_records(self, job):
        user_id, email = job["_id"], job.get("email")
        cutoff = job.get("created_at")
        for collection in ("newsletter_subscribers", "newsletter_deliveries", "contact_messages"):
            # An email can be reused after Auth deletion, while a retry is still
            # pending. An explicit owner is stronger evidence than that address.
            await self.db[collection].delete_many({"user_id": user_id})
            if not email:
                continue
            if not isinstance(cutoff, datetime):
                raise ErasureReviewRequired("Missing erasure request timestamp")
            anonymous = {"email": email, "$or": [
                {"user_id": {"$exists": False}}, {"user_id": None}, {"user_id": ""},
            ]}
            await self.db[collection].delete_many({"$and": [
                anonymous, {"created_at": {"$lte": cutoff}},
                {"$or": [{"updated_at": {"$exists": False}}, {"updated_at": {"$lte": cutoff}}]},
            ]})
            # Do not guess ownership of undated legacy records and do not mark
            # the erasure complete while these potential remnants need review.
            if await self.db[collection].find_one({"$and": [
                anonymous, {"$or": [
                    {"created_at": {"$not": {"$type": "date"}}},
                    {"created_at": {"$lte": cutoff}, "updated_at": {"$exists": True, "$not": {"$type": "date"}}},
                ]},
            ]}, {"_id": 1}):
                raise ErasureReviewRequired("Undated email-only records require review")

    async def complete(self, job):
        user_id = job["_id"]
        state = await self.gateway.auth_state(user_id)
        if state not in ("disabled", "absent"):
            raise RuntimeError("Auth removal is not confirmed")
        # A previous hard-delete response may have been lost. The owner prefix
        # must still be checked on retries, even when Auth is already absent.
        await self.gateway.purge_screenshots(user_id)
        if state != "absent":
            await self.gateway.delete_auth(user_id)
        if await self.gateway.auth_state(user_id) != "absent":
            raise RuntimeError("Auth erasure is not confirmed")
        for collection in ("accounts", "trades", "payouts", "ai_reports", "atlas_events", "atlas_quotas",
                           "email_preferences", "email_deliveries", "backtest_sessions", "backtest_strategies",
                           "backtest_bars", "backtest_datasets"):
            await self.db[collection].delete_many({"user_id": user_id})
        await self.db.backtest_usage.delete_many({"_id": {"$regex": f"^{re.escape(user_id)}:"}})
        await self.db.users.delete_many({"id": user_id})
        await self.purge_email_records(job)
        now = datetime.now(timezone.utc)
        await self.db.account_deletion_jobs.update_one({"_id": user_id}, {
            "$set": {"status": "completed", "updated_at": now, "expires_at": now + timedelta(days=2)},
            "$unset": {"email": "", "locked_until": ""},
        })

    async def start(self, user):
        if not self.gateway.configured:
            raise HTTPException(503, "La suppression sécurisée n’est pas configurée côté serveur.")
        try:
            user_id = str(UUID(str(user["id"])))
        except (ValueError, KeyError):
            raise HTTPException(400, "Identifiant de compte invalide.") from None
        now = datetime.now(timezone.utc)
        try:
            await self.db.account_deletion_jobs.update_one({"_id": user_id}, {"$setOnInsert": {
                "status": "prepared", "email": str(user.get("email", "")).strip().lower(), "created_at": now,
            }}, upsert=True)
            job = await self.claim(user_id, now)
        except Exception:
            raise HTTPException(503, "La demande n’a pas pu être enregistrée. Aucune donnée n’a été supprimée.") from None
        if not job:
            raise HTTPException(409, "Une suppression est déjà en cours.")
        try:
            await self.gateway.disable(user_id)
        except Exception:
            pass  # A timeout can follow a successful revocation; verify it.
        try:
            state = await self.gateway.auth_state(user_id)
        except Exception:
            state = "unknown"
        if state not in ("disabled", "absent"):
            await self.db.account_deletion_jobs.update_one({"_id": user_id}, {
                "$set": {"status": "unconfirmed"}, "$unset": {"locked_until": ""},
            })
            raise HTTPException(503, "Suppression non confirmée. Les données de backtest ont été conservées.")
        try:
            await self.complete(job)
            return {"ok": True, "cleanup_pending": False}
        except Exception as exc:
            await self.db.account_deletion_jobs.update_one({"_id": user_id}, {
                "$set": {"status": "manual_review_required" if isinstance(exc, ErasureReviewRequired) else "cleanup_pending",
                         "updated_at": datetime.now(timezone.utc)},
                "$unset": {"locked_until": ""},
            })
            return {"ok": True, "cleanup_pending": True}

    async def claim(self, user_id, now):
        return await self.db.account_deletion_jobs.find_one_and_update({"_id": user_id, "$or": [
            {"locked_until": {"$exists": False}}, {"locked_until": {"$lt": now}},
        ]}, {"$set": {"locked_until": now + timedelta(minutes=15), "updated_at": now}}, return_document=ReturnDocument.AFTER)

    async def retry(self):
        completed = pending = 0
        now = datetime.now(timezone.utc)
        # A claimed/failed job moves to the back of the queue. Otherwise the
        # same first 20 unconfirmed jobs can starve every later account forever.
        jobs = await self.db.account_deletion_jobs.find({"status": {"$ne": "completed"}, "$or": [
            {"locked_until": {"$exists": False}}, {"locked_until": {"$lt": now}},
        ]}).sort("updated_at", 1).limit(20).to_list(20)
        for previous in jobs:
            job = await self.claim(previous["_id"], datetime.now(timezone.utc))
            if not job:
                continue
            try:
                await self.complete(job)
                completed += 1
            except Exception as exc:
                pending += 1
                await self.db.account_deletion_jobs.update_one({"_id": job["_id"]}, {
                    "$set": {"status": "manual_review_required" if isinstance(exc, ErasureReviewRequired) else "cleanup_pending",
                             "updated_at": datetime.now(timezone.utc)},
                    "$unset": {"locked_until": ""},
                })
        return {"completed": completed, "pending": pending}


class AccountDeletionRetryWorker:
    """Resume persisted, user-requested erasures within the existing backend.

    No paid scheduler, provider synchronization or new deletion request is
    created. Mongo leases in AccountDeletionService prevent duplicate work
    across server processes. Manual review stays pending rather than expiring.
    """

    def __init__(self, service, interval_seconds=600):
        if not isinstance(interval_seconds, int) or isinstance(interval_seconds, bool) or not 30 <= interval_seconds <= 86400:
            raise ValueError("Erasure retry interval must be between 30 and 86400 seconds")
        self.service, self.interval_seconds = service, interval_seconds
        self.task = None

    def start(self):
        if self.service.gateway.configured and (self.task is None or self.task.done()):
            self.task = asyncio.create_task(self.run())

    async def run(self):
        while True:
            # Never delay application startup. A server restart does not
            # immediately re-run a batch before its existing leases expire.
            await asyncio.sleep(self.interval_seconds)
            try:
                result = await self.service.retry()
                if result["completed"] or result["pending"]:
                    logging.info("Account cleanup retry: completed=%s pending=%s",
                                 result["completed"], result["pending"])
            except Exception:
                # No exception body, request identity, email or secret in logs.
                logging.warning("Account cleanup retry unavailable; persisted jobs retained")

    async def stop(self):
        if self.task is not None:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
            self.task = None


def build_account_deletion_router(get_current_user, db, supabase_url, publishable_key, secret_key, *, service=None):
    router = APIRouter(tags=["Account erasure"])
    service = service or AccountDeletionService(db, DeletionGateway(supabase_url, secret_key))
    @router.post("/account/delete")
    async def remove(body: DeleteAccountBody, user=Depends(get_current_user)):
        if body.confirmation != "SUPPRIMER":
            raise HTTPException(422, "Saisis SUPPRIMER pour confirmer.")
        if not user.get("_supabase_token"):
            raise HTTPException(401, "Reconnecte-toi avant de supprimer ton compte.")
        return await service.start(user)
    @router.post("/internal/account-deletion/retry")
    async def retry(x_cron_secret: str = Header(default="")):
        expected = os.environ.get("CRON_SECRET", "")
        if not expected or not hmac.compare_digest(expected.encode(), x_cron_secret.encode()):
            raise HTTPException(403, "Accès interne requis.")
        if not service.gateway.configured:
            raise HTTPException(503, "Suppression non configurée.")
        return await service.retry()
    return router
