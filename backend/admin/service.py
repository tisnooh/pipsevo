from __future__ import annotations

import asyncio
import hashlib
import logging
import math
import os
import re
import uuid
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any

from email_service import EmailConfigurationError, EmailDeliveryError, brand_email_html, send_email
from atlas import build_atlas_context

from .client import AdminConfigurationError, AdminDataError, SupabaseAdminClient
from .security import STAFF_ROLES, normalize_role, sanitize


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def iso(value: datetime | None = None) -> str:
    return (value or utcnow()).isoformat()


def configured_env(name: str) -> bool:
    value = os.environ.get(name, "").strip()
    return bool(value and not re.search(r"replace|example|your_|_me$", value, re.I))


class AdminService:
    def __init__(self, db, supabase: SupabaseAdminClient, frontend_url: str):
        self.db = db
        self.supabase = supabase
        self.frontend_url = frontend_url.rstrip("/")

    async def ensure_indexes(self) -> None:
        await self.db.contact_messages.create_index([("status", 1), ("created_at", -1)], name="contact_status_created")
        await self.db.contact_messages.create_index([("priority", 1), ("created_at", -1)], name="contact_priority_created")
        await self.db.email_deliveries.create_index([("status", 1), ("created_at", -1)], name="email_status_created")
        await self.db.atlas_events.create_index([("created_at", -1)], name="atlas_events_created")
        await self.db.atlas_events.create_index([("status", 1), ("created_at", -1)], name="atlas_status_created")
        await self.db.admin_rate_limits.create_index("expires_at", expireAfterSeconds=0)

    async def rate_limit(self, actor_id: str, bucket_name: str, maximum: int = 30) -> None:
        minute = int(utcnow().timestamp() // 60)
        key = f"{actor_id}:{bucket_name}:{minute}"
        record = await self.db.admin_rate_limits.find_one_and_update(
            {"_id": key},
            {"$inc": {"count": 1}, "$setOnInsert": {"expires_at": utcnow() + timedelta(minutes=2)}},
            upsert=True,
            return_document=True,
        )
        if record["count"] > maximum:
            from fastapi import HTTPException
            raise HTTPException(429, "Trop d’actions administratives. Réessaie dans une minute.")

    async def audit(
        self,
        actor: dict[str, Any],
        action: str,
        target_type: str,
        target_id: str | None,
        *,
        old_value: Any = None,
        new_value: Any = None,
        metadata: dict[str, Any] | None = None,
        request_id: str | None = None,
    ) -> dict[str, Any]:
        payload = {
            "actor_id": actor.get("id"),
            "actor_email": actor.get("email"),
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "old_value": sanitize(old_value),
            "new_value": sanitize(new_value),
            "metadata": sanitize(metadata or {}),
            "request_id": request_id,
        }
        return await self.supabase.insert("admin_audit_logs", payload)

    async def incident(
        self,
        source: str,
        severity: str,
        message: str,
        error_code: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        try:
            filters = {"source": f"eq.{source}", "status": "in.(open,investigating)", "select": "*", "limit": "1"}
            if error_code:
                filters["error_code"] = f"eq.{error_code}"
            existing = (await self.supabase.rows("system_incidents", filters))
            if existing:
                current = existing[0]
                await self.supabase.patch(
                    "system_incidents", {"id": f"eq.{current['id']}"},
                    {"occurrences": int(current.get("occurrences", 1)) + 1, "last_seen_at": iso(), "safe_metadata": sanitize(metadata or {})},
                )
            else:
                await self.supabase.insert("system_incidents", {
                    "source": source, "severity": severity, "message": message[:1000],
                    "error_code": error_code, "safe_metadata": sanitize(metadata or {}),
                })
        except Exception:
            logging.exception("admin_incident_record_failed source=%s code=%s", source, error_code)

    async def overview(self, days: int) -> dict[str, Any]:
        now = utcnow()
        start = now - timedelta(days=days)
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        d7, d30 = now - timedelta(days=7), now - timedelta(days=30)

        async def count(table: str, **filters):
            return await self.supabase.count(table, filters)

        counts = await asyncio.gather(
            count("profiles"), count("profiles", created_at=f"gte.{today.isoformat()}"),
            count("profiles", created_at=f"gte.{d7.isoformat()}"), count("profiles", created_at=f"gte.{d30.isoformat()}"),
            count("accounts"), count("trades"), count("integration_connections"),
            count("integration_sync_runs", status="eq.success", started_at=f"gte.{start.isoformat()}"),
            count("integration_sync_runs", status="in.(failed,partial_error)", started_at=f"gte.{start.isoformat()}"),
            count("ai_reports", created_at=f"gte.{start.isoformat()}"),
            count("system_incidents", status="in.(open,investigating)"),
        )
        (
            total_users, new_today, new_7, new_30, accounts_count, trades_count,
            connection_count, sync_success, sync_failed, atlas_requests, active_incidents,
        ) = counts

        activity_rows = await self.supabase.rows("product_events", {
            "select": "user_id,occurred_at", "occurred_at": f"gte.{d30.isoformat()}",
            "order": "occurred_at.desc", "limit": "10000",
        })
        activity = {1: set(), 7: set(), 30: set()}
        for row in activity_rows:
            try:
                occurred = datetime.fromisoformat(str(row["occurred_at"]).replace("Z", "+00:00"))
            except (KeyError, ValueError):
                continue
            for period in activity:
                if occurred >= now - timedelta(days=period):
                    activity[period].add(row["user_id"])

        signup_rows = await self.supabase.rows("profiles", {
            "select": "created_at", "created_at": f"gte.{start.isoformat()}",
            "order": "created_at.asc", "limit": "10000",
        })
        monthly = days > 365
        signups_by_day: Counter[str] = Counter(str(row.get("created_at", ""))[:7 if monthly else 10] for row in signup_rows)
        series = []
        if monthly:
            cursor = start.date().replace(day=1)
            while cursor <= now.date():
                key = cursor.strftime("%Y-%m")
                series.append({"date": key, "value": signups_by_day[key]})
                cursor = cursor.replace(year=cursor.year + (cursor.month // 12), month=(cursor.month % 12) + 1)
        else:
            cursor = start.date()
            while cursor <= now.date():
                key = cursor.isoformat()
                series.append({"date": key, "value": signups_by_day[key]})
                cursor += timedelta(days=1)

        support_open, backtest_sessions, backtest_completed, email_errors, atlas_errors = await asyncio.gather(
            self.db.contact_messages.count_documents({"status": {"$nin": ["resolved", "closed"]}}),
            self.db.backtest_sessions.count_documents({"created_at": {"$gte": start.isoformat()}}),
            self.db.backtest_sessions.count_documents({"created_at": {"$gte": start.isoformat()}, "state.completed": True}),
            self.db.email_deliveries.count_documents({"status": {"$in": ["failed", "bounced", "rejected"]}, "created_at": {"$gte": start}}),
            self.db.atlas_events.count_documents({"status": "error", "created_at": {"$gte": start}}),
        )

        billing_configured = configured_env("STRIPE_SECRET_KEY") and configured_env("STRIPE_WEBHOOK_SECRET")
        billing: dict[str, Any] = {"configured": billing_configured}
        if billing_configured:
            rows = await self.supabase.rows("subscriptions", {"select": "plan,status,cancel_at_period_end", "limit": "10000"})
            plan_counts = Counter(row.get("plan", "free") for row in rows)
            status_counts = Counter(row.get("status", "inactive") for row in rows)
            billing.update({
                "plans": dict(plan_counts), "statuses": dict(status_counts),
                "cancellations": sum(1 for row in rows if row.get("cancel_at_period_end")),
                "mrr": None, "arr": None,
                "revenue_note": "Montants de facturation non stockés dans PipsEvo.",
            })
        else:
            billing["message"] = "Facturation non configurée"

        return {
            "range_days": days,
            "users": {"total": total_users, "today": new_today, "days_7": new_7, "days_30": new_30},
            "activity": {"hours_24": len(activity[1]), "days_7": len(activity[7]), "days_30": len(activity[30]), "tracking_rows_limited": len(activity_rows) == 10000},
            "billing": billing,
            "product": {"accounts": accounts_count, "trades": trades_count, "connections": connection_count, "backtest_sessions": backtest_sessions, "atlas_requests": atlas_requests, "support_open": support_open},
            "health": {"sync_success": sync_success, "sync_failed": sync_failed, "email_errors": email_errors, "atlas_errors": atlas_errors, "backtest_completed": backtest_completed, "active_incidents": active_incidents},
            "series": {"signups": series},
        }

    async def list_users(self, page: int, per_page: int, search: str, role: str | None, status: str | None, plan: str | None) -> dict[str, Any]:
        params: dict[str, Any] = {"select": "*", "order": "created_at.desc"}
        if search:
            clean = re.sub(r"[^\w@.+-]", "", search)[:100]
            if clean:
                terms = [f"name.ilike.*{clean}*", f"email.ilike.*{clean}*"]
                if re.fullmatch(r"[0-9a-fA-F-]{36}", clean):
                    terms.append(f"id.eq.{clean}")
                params["or"] = f"({','.join(terms)})"
        if role:
            params["role"] = f"eq.{role}"
        if status:
            params["status"] = f"eq.{status}"
        if plan:
            params["plan"] = f"eq.{plan}"
        rows, total = await self.supabase.list_rows("admin_user_metrics", params=params, page=page, per_page=per_page)
        return {"items": rows, "page": page, "per_page": per_page, "total": total, "pages": max(1, math.ceil(total / per_page))}

    async def user_detail(self, user_id: str, *, support_view: bool = False) -> dict[str, Any] | None:
        profile, auth_user, subscription = await asyncio.gather(
            self.supabase.one("profiles", {"id": f"eq.{user_id}"}),
            self.supabase.auth_user(user_id),
            self.supabase.one("subscriptions", {"user_id": f"eq.{user_id}"}),
        )
        if not profile:
            return None
        accounts, connections, trades, sync_runs = await asyncio.gather(
            self.supabase.rows("accounts", {"user_id": f"eq.{user_id}", "select": "id,name,firm,market_type,status,created_at", "order": "created_at.desc", "limit": "100"}),
            self.supabase.rows("integration_connections", {"user_id": f"eq.{user_id}", "select": "id,account_id,platform,provider,broker_name,account_number_masked,connection_status,sync_status,last_successful_sync_at,last_sync_attempt_at,last_error_code,last_error_message,created_at", "order": "created_at.desc", "limit": "100"}),
            self.supabase.rows("trades", {"user_id": f"eq.{user_id}", "select": "id,date,instrument,direction,pnl,r,setup,session,plan_respected,screenshots,created_at", "order": "date.desc", "limit": "10000"}),
            self.supabase.rows("integration_sync_runs", {"user_id": f"eq.{user_id}", "select": "connection_id,imported_count", "status": "in.(success,partial_error)", "limit": "10000"}),
        )
        trades_count, reports_count, backtest_count = await asyncio.gather(
            self.supabase.count("trades", {"user_id": f"eq.{user_id}"}),
            self.supabase.count("ai_reports", {"user_id": f"eq.{user_id}"}),
            self.db.backtest_sessions.count_documents({"user_id": user_id}),
        )
        context, _ = build_atlas_context(profile, accounts, trades)
        day_totals: defaultdict[str, float] = defaultdict(float)
        for trade in trades:
            if trade.get("date") and trade.get("pnl") is not None:
                day_totals[str(trade["date"])[:10]] += float(trade["pnl"])
        imported_by_connection: defaultdict[str, int] = defaultdict(int)
        for run in sync_runs:
            imported_by_connection[str(run.get("connection_id"))] += int(run.get("imported_count") or 0)
        safe_connections = [
            {**connection, "trades_imported": imported_by_connection.get(str(connection.get("id")), 0)}
            for connection in connections
        ]
        metrics = context["metrics"]
        base = {
            "identity": {
                "id": profile["id"], "name": profile.get("name"), "email": profile.get("email"),
                "created_at": profile.get("created_at"), "last_activity_at": profile.get("last_activity_at"),
                "role": normalize_role(profile.get("role")), "status": profile.get("status", "active"),
                "email_verified": bool(auth_user and auth_user.get("email_confirmed_at")),
                "last_sign_in_at": auth_user.get("last_sign_in_at") if auth_user else None,
                "language": (auth_user or {}).get("user_metadata", {}).get("language"),
                "onboarding_completed": bool(profile.get("onboarding_completed")),
            },
            "trading": {"accounts": accounts, "connections": safe_connections, "trades_count": trades_count},
            "trading_data": {
                **metrics,
                "best_day": max(day_totals.items(), key=lambda item: item[1], default=(None, None)),
                "worst_day": min(day_totals.items(), key=lambda item: item[1], default=(None, None)),
                "rows_limited": len(trades) == 10000,
            },
            "journal": {
                "trades_count": trades_count,
                "recent": [{"id": row.get("id"), "date": row.get("date"), "instrument": row.get("instrument"), "pnl": row.get("pnl"), "setup": row.get("setup"), "screenshots_count": len(row.get("screenshots") or [])} for row in trades[:10]],
            },
            "backtest": {"sessions_count": backtest_count},
            "atlas": {"requests_count": reports_count},
        }
        if not support_view:
            base["subscription"] = subscription or {"plan": "free", "status": "inactive"}
        return base

    async def update_profile_admin(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        updated = await self.supabase.patch("profiles", {"id": f"eq.{user_id}"}, payload)
        if not updated:
            raise AdminDataError("User profile not found")
        return updated

    async def subscriptions(self, page: int, per_page: int, plan: str | None, status: str | None) -> dict[str, Any]:
        params: dict[str, Any] = {
            "select": "user_id,plan,status,provider_customer_id,provider_subscription_id,current_period_end,subscription_started_at,cancel_at_period_end,created_at,updated_at",
            "order": "created_at.desc",
        }
        if plan:
            params["plan"] = f"eq.{plan[:40]}"
        if status:
            params["status"] = f"eq.{status[:40]}"
        rows, total = await self.supabase.list_rows("subscriptions", params=params, page=page, per_page=per_page)
        user_ids = sorted({str(row.get("user_id")) for row in rows if row.get("user_id")})
        profiles = await self.supabase.rows("profiles", {
            "select": "id,name,email", "id": f"in.({','.join(user_ids)})", "limit": str(len(user_ids)),
        }) if user_ids else []
        profile_by_id = {str(item.get("id")): item for item in profiles}
        items = []
        for row in rows:
            profile = profile_by_id.get(str(row.get("user_id")), {})
            items.append({**row, "name": profile.get("name"), "email": profile.get("email")})
        return {"items": items, "page": page, "per_page": per_page, "total": total, "pages": max(1, math.ceil(total / per_page))}

    async def update_role(self, user_id: str, role: str) -> dict[str, Any]:
        auth_user = await self.supabase.auth_user(user_id)
        if not auth_user:
            raise AdminDataError("Auth user not found")
        profile = await self.supabase.one("profiles", {"id": f"eq.{user_id}"}, "role")
        if not profile:
            raise AdminDataError("User profile not found")
        app_metadata = {**(auth_user.get("app_metadata") or {}), "pipsevo_role": role}
        result = await self.update_profile_admin(user_id, {"role": role})
        try:
            await self.supabase.update_auth_user(user_id, {"app_metadata": app_metadata})
        except Exception:
            await self.update_profile_admin(user_id, {"role": profile.get("role", "user")})
            raise
        return result

    async def support_list(self, page: int, per_page: int, status: str | None, priority: str | None, search: str) -> dict[str, Any]:
        query: dict[str, Any] = {}
        if status:
            if status == "open":
                query["status"] = {"$in": ["sending", "delivered", "receipt_pending", "open"]}
            else:
                query["status"] = status
        if priority:
            query["priority"] = priority
        if search:
            safe = re.escape(search.strip()[:100])
            query["$or"] = [{"email": {"$regex": safe, "$options": "i"}}, {"subject": {"$regex": safe, "$options": "i"}}, {"id": {"$regex": safe, "$options": "i"}}]
        total = await self.db.contact_messages.count_documents(query)
        docs = await self.db.contact_messages.find(query, {"_id": 0, "ip_hash": 0}).sort("created_at", -1).skip((page - 1) * per_page).limit(per_page).to_list(per_page)
        for doc in docs:
            if doc.get("status") in {"sending", "delivered", "receipt_pending"}:
                doc["status"] = "open"
            doc.setdefault("priority", "normal")
            doc["last_reply_at"] = (doc.get("messages") or [{}])[-1].get("created_at") if doc.get("messages") else None
        return {"items": docs, "page": page, "per_page": per_page, "total": total, "pages": max(1, math.ceil(total / per_page))}

    async def support_detail(self, ticket_id: str) -> dict[str, Any] | None:
        doc = await self.db.contact_messages.find_one({"id": ticket_id}, {"_id": 0, "ip_hash": 0})
        if doc and doc.get("status") in {"sending", "delivered", "receipt_pending"}:
            doc["status"] = "open"
        if doc:
            doc.setdefault("priority", "normal")
            doc.setdefault("messages", [])
        return doc

    async def add_support_message(self, ticket: dict[str, Any], actor: dict[str, Any], kind: str, message: str) -> dict[str, Any]:
        entry = {"id": str(uuid.uuid4()), "kind": kind, "message": message, "actor_id": actor["id"], "actor_email": actor.get("email"), "created_at": utcnow()}
        if kind == "user_message":
            rendered = brand_email_html(
                preheader=f"Réponse à ta demande {ticket['id']}", title="Réponse du support PipsEvo",
                intro=f"Bonjour {ticket.get('name') or 'Trader'},", body=message,
                cta_label=None, cta_url=None, unsubscribe_url=None, locale=ticket.get("locale", "fr"),
            )
            try:
                message_id = await asyncio.to_thread(
                    send_email, to=ticket["email"], subject=f"Re: {ticket['subject']} [{ticket['id']}]",
                    html=rendered, text=message, category="transactional",
                    idempotency_key=f"support-reply-{entry['id']}",
                )
            except (EmailConfigurationError, EmailDeliveryError) as exc:
                await self.incident("emails", "error", "Échec d’une réponse support", "support_reply_failed", {"ticket_id": ticket["id"]})
                raise AdminDataError("Support reply delivery failed") from exc
            entry["delivery_status"] = "sent"
            entry["provider_message_id"] = message_id
            await self.db.email_deliveries.insert_one({
                "event": "support-reply", "user_id": ticket.get("user_id"), "recipient": ticket["email"],
                "status": "sent", "provider": os.environ.get("EMAIL_PROVIDER", "smtp"),
                "message_id": message_id, "ticket_id": ticket["id"], "created_at": utcnow(), "sent_at": utcnow(),
            })
        await self.db.contact_messages.update_one(
            {"id": ticket["id"]},
            {"$push": {"messages": entry}, "$set": {"status": "waiting_user" if kind == "user_message" else ticket.get("status", "open"), "updated_at": utcnow()}},
        )
        entry.pop("provider_message_id", None)
        return entry

    async def email_monitor(self, page: int, per_page: int, status: str | None) -> dict[str, Any]:
        query = {"status": status} if status else {}
        total = await self.db.email_deliveries.count_documents(query)
        docs = await self.db.email_deliveries.find(query, {"_id": 0, "message_id": 0}).sort("created_at", -1).skip((page - 1) * per_page).limit(per_page).to_list(per_page)
        for doc in docs:
            # SMTP/Resend acceptance proves Sent, not final mailbox delivery.
            if doc.get("status") == "delivered" and not doc.get("provider_delivery_confirmed"):
                doc["status"] = "sent"
            doc.setdefault("provider", os.environ.get("EMAIL_PROVIDER", "smtp"))
            doc["type"] = doc.get("event", "transactional")
        failed = await self.db.email_deliveries.count_documents({"status": {"$in": ["failed", "bounced", "rejected"]}})
        return {"items": docs, "page": page, "per_page": per_page, "total": total, "failed": failed, "pages": max(1, math.ceil(total / per_page)), "provider_configured": configured_env("SMTP_PASSWORD") or configured_env("RESEND_API_KEY")}

    async def sync_monitor(self, page: int, per_page: int, provider: str | None, status: str | None) -> dict[str, Any]:
        params: dict[str, Any] = {
            "select": "id,user_id,account_id,platform,provider,broker_name,account_number_masked,connection_status,sync_status,last_successful_sync_at,last_sync_attempt_at,last_error_code,last_error_message,created_at",
            "order": "created_at.desc",
        }
        if provider:
            params["provider"] = f"eq.{provider}"
        if status:
            params["sync_status"] = f"eq.{status}"
        rows, total = await self.supabase.list_rows("integration_connections", params=params, page=page, per_page=per_page)
        return {"items": [sanitize(row) for row in rows], "page": page, "per_page": per_page, "total": total, "pages": max(1, math.ceil(total / per_page))}

    async def sync_runs(self, connection_id: str) -> list[dict[str, Any]]:
        rows = await self.supabase.rows("integration_sync_runs", {
            "connection_id": f"eq.{connection_id}",
            "select": "id,connection_id,integration_account_id,trigger_source,sync_type,status,trades_found,executions_found,imported_count,updated_count,skipped_count,error_count,error_code,error_message,duration_ms,started_at,completed_at",
            "order": "started_at.desc", "limit": "100",
        })
        return [sanitize(row) for row in rows]

    async def trading_accounts(
        self, page: int, per_page: int, search: str, provider: str | None, status: str | None,
    ) -> dict[str, Any]:
        params: dict[str, Any] = {
            "select": "id,connection_id,user_id,account_id,provider,platform,account_name,account_number_masked,broker_name,server_name,currency,account_type,status,last_successful_sync_at,last_sync_attempt_at,last_error_code,last_error_message,created_at,updated_at",
            "order": "created_at.desc",
        }
        if search:
            clean = re.sub(r"[^\w@.+ -]", "", search).strip()[:100]
            if clean:
                params["or"] = f"(account_name.ilike.*{clean}*,account_number_masked.ilike.*{clean}*,broker_name.ilike.*{clean}*,server_name.ilike.*{clean}*)"
        if provider:
            params["provider"] = f"eq.{provider[:80]}"
        if status:
            params["status"] = f"eq.{status[:40]}"
        rows, total = await self.supabase.list_rows("integration_accounts", params=params, page=page, per_page=per_page)
        user_ids = sorted({str(row.get("user_id")) for row in rows if row.get("user_id")})
        account_ids = sorted({str(row.get("id")) for row in rows if row.get("id")})
        profiles = []
        runs = []
        if user_ids:
            profiles = await self.supabase.rows("profiles", {
                "select": "id,name,email", "id": f"in.({','.join(user_ids)})", "limit": str(len(user_ids)),
            })
        if account_ids:
            runs = await self.supabase.rows("integration_sync_runs", {
                "select": "integration_account_id,imported_count", "integration_account_id": f"in.({','.join(account_ids)})",
                "status": "in.(success,partial_error)", "limit": "10000",
            })
        profile_by_id = {str(item.get("id")): item for item in profiles}
        imported_by_account: defaultdict[str, int] = defaultdict(int)
        for run in runs:
            imported_by_account[str(run.get("integration_account_id"))] += int(run.get("imported_count") or 0)
        items = []
        for row in rows:
            profile = profile_by_id.get(str(row.get("user_id")), {})
            items.append(sanitize({
                **row,
                "user": {"id": row.get("user_id"), "name": profile.get("name"), "email": profile.get("email")},
                "trades_imported": imported_by_account.get(str(row.get("id")), 0),
            }))
        return {
            "items": items, "page": page, "per_page": per_page, "total": total,
            "pages": max(1, math.ceil(total / per_page)), "sync_rows_limited": len(runs) == 10000,
        }

    async def integrations(self, days: int) -> dict[str, Any]:
        since = utcnow() - timedelta(days=days)
        connections, accounts, runs = await asyncio.gather(
            self.supabase.rows("integration_connections", {
                "select": "provider,platform,connection_status,sync_status,last_successful_sync_at,last_error_code,last_error_message", "limit": "10000",
            }),
            self.supabase.rows("integration_accounts", {"select": "provider,platform,status", "limit": "10000"}),
            self.supabase.rows("integration_sync_runs", {
                "select": "connection_id,status,error_code,error_message,started_at,completed_at", "started_at": f"gte.{since.isoformat()}",
                "order": "started_at.desc", "limit": "10000",
            }),
        )
        grouped: dict[str, dict[str, Any]] = {}
        for row in connections:
            key = str(row.get("provider") or row.get("platform") or "unknown")
            item = grouped.setdefault(key, {"provider": key, "platforms": set(), "connections": 0, "connected": 0, "accounts": 0, "sync_success": 0, "sync_errors": 0, "last_successful_sync_at": None})
            item["platforms"].add(row.get("platform"))
            item["connections"] += 1
            if row.get("connection_status") in {"connected", "active", "success"}:
                item["connected"] += 1
            last_sync = row.get("last_successful_sync_at")
            if last_sync and (not item["last_successful_sync_at"] or last_sync > item["last_successful_sync_at"]):
                item["last_successful_sync_at"] = last_sync
        for row in accounts:
            key = str(row.get("provider") or row.get("platform") or "unknown")
            item = grouped.setdefault(key, {"provider": key, "platforms": set(), "connections": 0, "connected": 0, "accounts": 0, "sync_success": 0, "sync_errors": 0, "last_successful_sync_at": None})
            item["platforms"].add(row.get("platform"))
            item["accounts"] += 1
        connection_provider = {
            str(row.get("id")): str(row.get("provider") or row.get("platform") or "unknown")
            for row in await self.supabase.rows("integration_connections", {"select": "id,provider,platform", "limit": "10000"})
        }
        for row in runs:
            key = connection_provider.get(str(row.get("connection_id")), "unknown")
            item = grouped.setdefault(key, {"provider": key, "platforms": set(), "connections": 0, "connected": 0, "accounts": 0, "sync_success": 0, "sync_errors": 0, "last_successful_sync_at": None})
            item["platforms"].add(row.get("platform"))
            if row.get("status") == "success":
                item["sync_success"] += 1
            elif row.get("status") in {"failed", "partial_error"}:
                item["sync_errors"] += 1
        items = []
        for item in grouped.values():
            attempts = item["sync_success"] + item["sync_errors"]
            item["error_rate"] = round(item["sync_errors"] * 100 / attempts, 1) if attempts else None
            item["platforms"] = sorted(value for value in item["platforms"] if value)
            items.append(item)
        recent_errors = [sanitize(row) for row in runs if row.get("status") in {"failed", "partial_error"}][:50]
        return {
            "range_days": days, "items": sorted(items, key=lambda value: value["provider"]), "recent_errors": recent_errors,
            "tracking_rows_limited": any(len(values) == 10000 for values in (connections, accounts, runs)),
        }

    async def system_status(self) -> dict[str, Any]:
        incidents, failed_runs = await asyncio.gather(
            self.supabase.rows("system_incidents", {"select": "id,source,severity,status,message,error_code,occurrences,last_seen_at", "status": "in.(open,investigating)", "order": "last_seen_at.desc", "limit": "100"}),
            self.supabase.rows("integration_sync_runs", {"select": "connection_id,status,error_code,error_message,started_at", "status": "in.(failed,partial_error)", "order": "started_at.desc", "limit": "50"}),
        )
        email_failures = await self.db.email_deliveries.find(
            {"status": {"$in": ["failed", "bounced", "rejected"]}}, {"_id": 0, "message_id": 0, "recipient": 0},
        ).sort("created_at", -1).limit(50).to_list(50)
        services = [
            {"name": "Base de données", "status": "operational" if self.supabase.configured else "not_configured", "detail": "Connexion serveur Supabase"},
            {"name": "Authentification", "status": "operational" if self.supabase.configured else "not_configured", "detail": "Supabase Auth"},
            {"name": "E-mails", "status": "configured" if configured_env("SMTP_PASSWORD") or configured_env("RESEND_API_KEY") else "not_configured", "detail": "SMTP ou Resend"},
            {"name": "Paiements", "status": "configured" if configured_env("STRIPE_SECRET_KEY") and configured_env("STRIPE_WEBHOOK_SECRET") else "not_configured", "detail": "Stripe"},
            {"name": "MetaTrader", "status": "configured" if configured_env("METAAPI_TOKEN") else "not_configured", "detail": "MetaApi"},
            {"name": "cTrader", "status": "configured" if configured_env("CTRADER_CLIENT_ID") and configured_env("CTRADER_CLIENT_SECRET") else "not_configured", "detail": "Open API"},
            {"name": "Tradovate", "status": "configured" if configured_env("TRADOVATE_CLIENT_ID") and configured_env("TRADOVATE_CLIENT_SECRET") else "not_configured", "detail": "OAuth/API"},
        ]
        return {"services": services, "incidents": incidents, "sync_errors": [sanitize(row) for row in failed_runs], "email_errors": [sanitize(row) for row in email_failures], "checked_at": iso()}

    async def atlas_monitor(self, days: int) -> dict[str, Any]:
        since = utcnow() - timedelta(days=days)
        events = await self.db.atlas_events.find({"created_at": {"$gte": since}}, {"_id": 0, "prompt": 0, "question": 0, "answer": 0}).sort("created_at", -1).limit(1000).to_list(1000)
        reports = await self.supabase.count("ai_reports", {"created_at": f"gte.{since.isoformat()}"})
        success = sum(1 for item in events if item.get("status") == "success")
        errors = sum(1 for item in events if item.get("status") == "error")
        latencies = [item.get("duration_ms") for item in events if isinstance(item.get("duration_ms"), (int, float))]
        return {
            "configured": configured_env("ATLAS_ANTHROPIC_API_KEY") or configured_env("EMERGENT_LLM_KEY"),
            "requests": max(reports, len(events)), "success": success, "errors": errors,
            "active_users": len({item.get("user_id") for item in events if item.get("user_id")}),
            "average_latency_ms": round(sum(latencies) / len(latencies)) if latencies else None,
            "model": os.environ.get("ATLAS_MODEL", "claude-sonnet-4-6"),
            "cost_estimate": None, "events": events[:100],
        }

    async def backtest_monitor(self, days: int) -> dict[str, Any]:
        since = (utcnow() - timedelta(days=days)).isoformat()
        sessions = await self.db.backtest_sessions.find({"created_at": {"$gte": since}}, {"_id": 0, "state": 1, "config": 1, "settings": 1, "user_id": 1, "created_at": 1, "dataset": 1}).sort("created_at", -1).limit(1000).to_list(1000)
        datasets = await self.db.backtest_datasets.find({"created_at": {"$gte": since}}, {"_id": 0, "quality": 1, "symbol": 1, "provider": 1, "ready": 1}).limit(1000).to_list(1000)
        markets = Counter(item.get("config", {}).get("symbol", "unknown") for item in sessions)
        timeframes = Counter(item.get("settings", {}).get("timeframe", "unknown") for item in sessions)
        bars = sum(int(item.get("quality", {}).get("rows", 0) or 0) for item in datasets)
        return {
            "sessions": len(sessions), "active_users": len({item.get("user_id") for item in sessions}),
            "completed": sum(1 for item in sessions if item.get("state", {}).get("completed")),
            "datasets": len(datasets), "market_data_rows": bars,
            "markets": dict(markets), "timeframes": dict(timeframes),
            "provider": "private_csv" if datasets else None,
            "automatic_market_data_configured": False,
            "recent": [{"user_id": x.get("user_id"), "created_at": x.get("created_at"), "symbol": x.get("config", {}).get("symbol"), "timeframe": x.get("settings", {}).get("timeframe"), "completed": x.get("state", {}).get("completed", False)} for x in sessions[:100]],
        }

    async def analytics(self, days: int) -> dict[str, Any]:
        since = utcnow() - timedelta(days=days)
        events = await self.supabase.rows("product_events", {"select": "user_id,event_name,feature,occurred_at", "occurred_at": f"gte.{since.isoformat()}", "order": "occurred_at.desc", "limit": "10000"})
        features = Counter(row.get("feature") for row in events)
        active_users = {row.get("user_id") for row in events if row.get("user_id")}
        total, onboarded, accounts_users, trade_users, atlas_users = await asyncio.gather(
            self.supabase.count("profiles"), self.supabase.count("profiles", {"onboarding_completed": "eq.true"}),
            self._unique_users("accounts"), self._unique_users("trades"), self._unique_users("ai_reports"),
        )
        return {
            "range_days": days, "events": len(events), "active_users": len(active_users),
            "feature_usage": [{"feature": key, "events": value} for key, value in features.most_common()],
            "funnel": [
                {"step": "signup", "users": total}, {"step": "onboarding", "users": onboarded},
                {"step": "first_account", "users": accounts_users}, {"step": "first_trade", "users": trade_users},
                {"step": "first_analysis", "users": atlas_users},
            ],
            "tracking_rows_limited": len(events) == 10000,
        }

    async def _unique_users(self, table: str) -> int:
        rows = await self.supabase.rows(table, {"select": "user_id", "limit": "10000"})
        return len({row.get("user_id") for row in rows if row.get("user_id")})

    async def record_product_event(self, user: dict[str, Any], event_name: str, feature: str, metadata: dict[str, Any]) -> None:
        await self.supabase.insert("product_events", {"user_id": user["id"], "event_name": event_name, "feature": feature, "safe_metadata": sanitize(metadata)})
        await self.supabase.patch("profiles", {"id": f"eq.{user['id']}"}, {"last_activity_at": iso()})

    async def feature_enabled(self, key: str, user: dict[str, Any], default: bool = True) -> bool:
        if not self.supabase.configured:
            return default
        try:
            flag = await self.supabase.one("feature_flags", {"key": f"eq.{key}"})
            if not flag:
                return default
            override = await self.supabase.one("feature_flag_overrides", {"flag_id": f"eq.{flag['id']}", "user_id": f"eq.{user['id']}"})
            if override:
                return bool(override["enabled"])
            if not flag.get("enabled"):
                return False
            audience = flag.get("audience", "all")
            values = flag.get("audience_values") or []
            if audience == "admin_only" and normalize_role(user.get("role")) not in STAFF_ROLES:
                return False
            if audience == "specific_users" and user["id"] not in values:
                return False
            if audience == "plan":
                plan = user.get("plan")
                if not plan:
                    subscription = await self.supabase.one("subscriptions", {"user_id": f"eq.{user['id']}"}, "plan")
                    plan = (subscription or {}).get("plan", "free")
                if plan not in values:
                    return False
            percentage = int(flag.get("rollout_percentage", 100))
            bucket = int(hashlib.sha256(f"{key}:{user['id']}".encode()).hexdigest()[:8], 16) % 100
            return bucket < percentage
        except (AdminConfigurationError, AdminDataError):
            logging.warning("feature_flag_check_failed key=%s", key)
            return default

    async def setting(self, key: str, default: Any) -> Any:
        if not self.supabase.configured:
            return default
        try:
            row = await self.supabase.one("admin_settings", {"key": f"eq.{key}"}, "value")
            return row.get("value", default) if row else default
        except (AdminConfigurationError, AdminDataError):
            logging.warning("admin_setting_read_failed key=%s", key)
            return default
