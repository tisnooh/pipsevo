from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status

from .models import (
    AdminSettingIn,
    AnnouncementIn,
    FeatureFlagIn,
    IncidentIn,
    IncidentStatusIn,
    ProductEventIn,
    PropFirmIn,
    RoleChangeIn,
    SupportMessageIn,
    SupportUpdateIn,
    UserActionIn,
)
from .security import normalize_role, public_staff_user, require_permission, require_staff, sanitize
from .service import AdminService, iso


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _confirmed(value: bool) -> None:
    if not value:
        raise HTTPException(400, "Cette action sensible doit être confirmée explicitement.")


def _clean_payload(model, *excluded: str) -> dict[str, Any]:
    return model.model_dump(mode="json", exclude=set(excluded))


def _valid_uuid(value: str, label: str = "Identifiant") -> str:
    try:
        return str(UUID(value))
    except ValueError as exc:
        raise HTTPException(400, f"{label} invalide.") from exc


def build_admin_router(get_current_user, service: AdminService) -> APIRouter:
    router = APIRouter(tags=["Administration"])
    staff_user = require_staff(get_current_user)
    support_read = require_permission(get_current_user, "support.read")
    support_write = require_permission(get_current_user, "support.write")
    overview_read = require_permission(get_current_user, "overview.read")
    users_read = require_permission(get_current_user, "users.read")
    users_manage = require_permission(get_current_user, "users.manage")
    subscriptions_read = require_permission(get_current_user, "subscriptions.read")
    sync_read = require_permission(get_current_user, "sync.read")
    prop_firms_read = require_permission(get_current_user, "prop_firms.read")
    prop_firms_write = require_permission(get_current_user, "prop_firms.write")
    emails_read = require_permission(get_current_user, "emails.read")
    atlas_read = require_permission(get_current_user, "atlas.read")
    backtest_read = require_permission(get_current_user, "backtest.read")
    analytics_read = require_permission(get_current_user, "analytics.read")
    announcements_read = require_permission(get_current_user, "announcements.read")
    announcements_write = require_permission(get_current_user, "announcements.write")
    incidents_read = require_permission(get_current_user, "incidents.read")
    incidents_write = require_permission(get_current_user, "incidents.write")
    super_admin = require_permission(get_current_user, "*")

    async def limit_mutation(user: dict[str, Any]) -> None:
        await service.rate_limit(user["id"], "mutations", 60)

    @router.get("/admin/session")
    async def session(user=Depends(staff_user)):
        return public_staff_user(user)

    @router.get("/admin/overview")
    async def overview(days: int = Query(30, ge=1, le=365), user=Depends(overview_read)):
        await service.rate_limit(user["id"], "overview", 60)
        return await service.overview(days)

    @router.get("/admin/users")
    async def users(
        page: int = Query(1, ge=1), per_page: int = Query(25, ge=1, le=100),
        search: str = Query("", max_length=100), role: str | None = None,
        account_status: str | None = Query(None, alias="status"), plan: str | None = None,
        user=Depends(staff_user),
    ):
        if normalize_role(user.get("role")) == "support":
            role = status_value = plan = None
        else:
            status_value = account_status
        return await service.list_users(page, per_page, search, role, status_value, plan)

    @router.get("/admin/users/{user_id}")
    async def user_detail(user_id: str, user=Depends(staff_user)):
        item = await service.user_detail(_valid_uuid(user_id), support_view=normalize_role(user.get("role")) == "support")
        if not item:
            raise HTTPException(404, "Utilisateur introuvable.")
        return item

    @router.post("/admin/users/{user_id}/actions")
    async def user_action(user_id: str, body: UserActionIn, request: Request, user=Depends(users_manage)):
        await limit_mutation(user)
        target = _valid_uuid(user_id)
        _confirmed(body.confirmation)
        if target == user["id"] and body.action in {"suspend", "reset_onboarding"}:
            raise HTTPException(400, "Tu ne peux pas appliquer cette action à ton propre compte.")
        before = await service.user_detail(target)
        if not before:
            raise HTTPException(404, "Utilisateur introuvable.")
        if body.action == "suspend":
            await service.supabase.update_auth_user(target, {"ban_duration": "876000h"})
            result = await service.update_profile_admin(target, {"status": "suspended"})
        elif body.action == "reactivate":
            await service.supabase.update_auth_user(target, {"ban_duration": "none"})
            result = await service.update_profile_admin(target, {"status": "active"})
        elif body.action == "reset_onboarding":
            result = await service.update_profile_admin(target, {"onboarded": False, "onboarding_completed": False})
        else:
            email = before["identity"].get("email")
            if not email:
                raise HTTPException(409, "Cet utilisateur n’a pas d’adresse e-mail.")
            await service.supabase.resend_confirmation(email, f"{service.frontend_url}/auth/callback")
            result = {"resent": True}
        await service.audit(user, f"user.{body.action}", "user", target, old_value=before["identity"], new_value=result, request_id=_request_id(request))
        return {"ok": True, "result": sanitize(result)}

    @router.patch("/admin/users/{user_id}/role")
    async def change_role(user_id: str, body: RoleChangeIn, request: Request, user=Depends(super_admin)):
        await limit_mutation(user)
        target = _valid_uuid(user_id)
        _confirmed(body.confirmation)
        if target == user["id"]:
            raise HTTPException(400, "Le changement de ton propre rôle est bloqué pour éviter un verrouillage administratif.")
        before = await service.user_detail(target)
        if not before:
            raise HTTPException(404, "Utilisateur introuvable.")
        result = await service.update_role(target, body.role)
        await service.audit(user, "user.role_changed", "user", target, old_value={"role": before["identity"]["role"]}, new_value={"role": body.role}, request_id=_request_id(request))
        return sanitize(result)

    @router.get("/admin/subscriptions")
    async def subscriptions(
        page: int = Query(1, ge=1), per_page: int = Query(25, ge=1, le=100),
        plan: str | None = None, user=Depends(subscriptions_read),
    ):
        return await service.list_users(page, per_page, "", None, None, plan)

    @router.get("/admin/support")
    async def support(
        page: int = Query(1, ge=1), per_page: int = Query(25, ge=1, le=100),
        ticket_status: str | None = Query(None, alias="status"), priority: str | None = None,
        search: str = Query("", max_length=100), user=Depends(support_read),
    ):
        return await service.support_list(page, per_page, ticket_status, priority, search)

    @router.get("/admin/support/{ticket_id}")
    async def support_detail(ticket_id: str, user=Depends(support_read)):
        item = await service.support_detail(ticket_id[:120])
        if not item:
            raise HTTPException(404, "Demande introuvable.")
        return sanitize(item)

    @router.patch("/admin/support/{ticket_id}")
    async def support_update(ticket_id: str, body: SupportUpdateIn, request: Request, user=Depends(support_write)):
        await limit_mutation(user)
        ticket = await service.support_detail(ticket_id[:120])
        if not ticket:
            raise HTTPException(404, "Demande introuvable.")
        updates = body.model_dump(exclude_none=True)
        if not updates:
            raise HTTPException(400, "Aucune modification fournie.")
        updates["updated_at"] = datetime.now(timezone.utc)
        await service.db.contact_messages.update_one({"id": ticket_id[:120]}, {"$set": updates})
        await service.audit(user, "support.updated", "support_ticket", ticket_id[:120], old_value={k: ticket.get(k) for k in updates}, new_value=updates, request_id=_request_id(request))
        return await service.support_detail(ticket_id[:120])

    @router.post("/admin/support/{ticket_id}/messages")
    async def support_message(ticket_id: str, body: SupportMessageIn, request: Request, user=Depends(support_write)):
        await limit_mutation(user)
        ticket = await service.support_detail(ticket_id[:120])
        if not ticket:
            raise HTTPException(404, "Demande introuvable.")
        result = await service.add_support_message(ticket, user, body.kind, body.message)
        await service.audit(user, f"support.{body.kind}", "support_ticket", ticket_id[:120], new_value={"message_id": result["id"]}, request_id=_request_id(request))
        return sanitize(result)

    @router.get("/admin/trading-sync")
    async def trading_sync(
        page: int = Query(1, ge=1), per_page: int = Query(25, ge=1, le=100),
        provider: str | None = None, sync_status: str | None = Query(None, alias="status"),
        user=Depends(sync_read),
    ):
        return await service.sync_monitor(page, per_page, provider, sync_status)

    @router.get("/admin/trading-sync/{connection_id}/runs")
    async def trading_sync_runs(connection_id: str, user=Depends(sync_read)):
        return {"items": await service.sync_runs(_valid_uuid(connection_id, "Connexion"))}

    @router.get("/admin/prop-firms")
    async def prop_firms_admin(
        page: int = Query(1, ge=1), per_page: int = Query(100, ge=1, le=200),
        user=Depends(prop_firms_read),
    ):
        rows, total = await service.supabase.list_rows("prop_firms", params={"select": "*", "order": "name.asc"}, page=page, per_page=per_page)
        return {"items": rows, "page": page, "per_page": per_page, "total": total}

    @router.post("/admin/prop-firms", status_code=status.HTTP_201_CREATED)
    async def prop_firm_create(body: PropFirmIn, request: Request, user=Depends(prop_firms_write)):
        await limit_mutation(user)
        payload = _clean_payload(body)
        result = await service.supabase.insert("prop_firms", payload)
        await service.audit(user, "prop_firm.created", "prop_firm", result.get("id"), new_value=result, request_id=_request_id(request))
        return result

    @router.put("/admin/prop-firms/{firm_id}")
    async def prop_firm_update(firm_id: str, body: PropFirmIn, request: Request, user=Depends(prop_firms_write)):
        await limit_mutation(user)
        firm_id = _valid_uuid(firm_id, "Prop firm")
        before = await service.supabase.one("prop_firms", {"id": f"eq.{firm_id}"})
        if not before:
            raise HTTPException(404, "Prop firm introuvable.")
        result = await service.supabase.patch("prop_firms", {"id": f"eq.{firm_id}"}, _clean_payload(body))
        await service.audit(user, "prop_firm.updated", "prop_firm", firm_id, old_value=before, new_value=result, request_id=_request_id(request))
        return result

    @router.get("/admin/emails")
    async def emails(
        page: int = Query(1, ge=1), per_page: int = Query(25, ge=1, le=100),
        email_status: str | None = Query(None, alias="status"), user=Depends(emails_read),
    ):
        return await service.email_monitor(page, per_page, email_status)

    @router.get("/admin/atlas")
    async def atlas(days: int = Query(30, ge=1, le=365), user=Depends(atlas_read)):
        return await service.atlas_monitor(days)

    @router.get("/admin/backtesting")
    async def backtesting(days: int = Query(30, ge=1, le=365), user=Depends(backtest_read)):
        return await service.backtest_monitor(days)

    @router.get("/admin/analytics")
    async def analytics(days: int = Query(30, ge=1, le=365), user=Depends(analytics_read)):
        return await service.analytics(days)

    @router.get("/admin/announcements")
    async def announcements(user=Depends(announcements_read)):
        return {"items": await service.supabase.rows("announcements", {"select": "*", "order": "created_at.desc", "limit": "200"})}

    @router.post("/admin/announcements", status_code=status.HTTP_201_CREATED)
    async def announcement_create(body: AnnouncementIn, request: Request, user=Depends(announcements_write)):
        await limit_mutation(user)
        if body.type == "critical" and body.active:
            _confirmed(body.confirmation)
        payload = _clean_payload(body, "confirmation")
        payload["created_by"] = user["id"]
        result = await service.supabase.insert("announcements", payload)
        await service.audit(user, "announcement.created", "announcement", result.get("id"), new_value=result, request_id=_request_id(request))
        return result

    @router.put("/admin/announcements/{announcement_id}")
    async def announcement_update(announcement_id: str, body: AnnouncementIn, request: Request, user=Depends(announcements_write)):
        await limit_mutation(user)
        announcement_id = _valid_uuid(announcement_id, "Annonce")
        before = await service.supabase.one("announcements", {"id": f"eq.{announcement_id}"})
        if not before:
            raise HTTPException(404, "Annonce introuvable.")
        if body.type == "critical" and body.active:
            _confirmed(body.confirmation)
        result = await service.supabase.patch("announcements", {"id": f"eq.{announcement_id}"}, _clean_payload(body, "confirmation"))
        await service.audit(user, "announcement.updated", "announcement", announcement_id, old_value=before, new_value=result, request_id=_request_id(request))
        return result

    @router.get("/admin/feature-flags")
    async def feature_flags(user=Depends(super_admin)):
        return {"items": await service.supabase.rows("feature_flags", {"select": "*", "order": "key.asc", "limit": "200"})}

    @router.post("/admin/feature-flags", status_code=status.HTTP_201_CREATED)
    async def feature_flag_create(body: FeatureFlagIn, request: Request, user=Depends(super_admin)):
        await limit_mutation(user)
        if body.enabled:
            _confirmed(body.confirmation)
        result = await service.supabase.insert("feature_flags", _clean_payload(body, "confirmation"))
        await service.audit(user, "feature_flag.created", "feature_flag", result.get("id"), new_value=result, request_id=_request_id(request))
        return result

    @router.put("/admin/feature-flags/{flag_id}")
    async def feature_flag_update(flag_id: str, body: FeatureFlagIn, request: Request, user=Depends(super_admin)):
        await limit_mutation(user)
        flag_id = _valid_uuid(flag_id, "Feature flag")
        before = await service.supabase.one("feature_flags", {"id": f"eq.{flag_id}"})
        if not before:
            raise HTTPException(404, "Feature flag introuvable.")
        if body.enabled != bool(before.get("enabled")) or body.rollout_percentage != before.get("rollout_percentage"):
            _confirmed(body.confirmation)
        result = await service.supabase.patch("feature_flags", {"id": f"eq.{flag_id}"}, _clean_payload(body, "confirmation"))
        await service.audit(user, "feature_flag.updated", "feature_flag", flag_id, old_value=before, new_value=result, request_id=_request_id(request))
        return result

    @router.get("/admin/incidents")
    async def incidents(user=Depends(incidents_read)):
        return {"items": await service.supabase.rows("system_incidents", {"select": "*", "order": "last_seen_at.desc", "limit": "500"})}

    @router.post("/admin/incidents", status_code=status.HTTP_201_CREATED)
    async def incident_create(body: IncidentIn, request: Request, user=Depends(incidents_write)):
        await limit_mutation(user)
        payload = _clean_payload(body)
        if body.status == "resolved":
            payload.update({"resolved_at": iso(), "updated_by": user["id"]})
        result = await service.supabase.insert("system_incidents", payload)
        await service.audit(user, "incident.created", "incident", result.get("id"), new_value=result, request_id=_request_id(request))
        return result

    @router.patch("/admin/incidents/{incident_id}")
    async def incident_update(incident_id: str, body: IncidentStatusIn, request: Request, user=Depends(incidents_write)):
        await limit_mutation(user)
        incident_id = _valid_uuid(incident_id, "Incident")
        before = await service.supabase.one("system_incidents", {"id": f"eq.{incident_id}"})
        if not before:
            raise HTTPException(404, "Incident introuvable.")
        payload: dict[str, Any] = {"status": body.status}
        if body.status == "resolved":
            payload.update({"resolved_at": iso(), "updated_by": user["id"]})
        result = await service.supabase.patch("system_incidents", {"id": f"eq.{incident_id}"}, payload)
        await service.audit(user, "incident.status_changed", "incident", incident_id, old_value={"status": before.get("status")}, new_value=payload, request_id=_request_id(request))
        return result

    @router.get("/admin/audit-logs")
    async def audit_logs(
        page: int = Query(1, ge=1), per_page: int = Query(50, ge=1, le=100),
        actor_id: str | None = None, action: str | None = None, user=Depends(super_admin),
    ):
        params: dict[str, Any] = {"select": "*", "order": "created_at.desc"}
        if actor_id:
            params["actor_id"] = f"eq.{_valid_uuid(actor_id, 'Administrateur')}"
        if action:
            params["action"] = f"eq.{action[:120]}"
        rows, total = await service.supabase.list_rows("admin_audit_logs", params=params, page=page, per_page=per_page)
        return {"items": rows, "page": page, "per_page": per_page, "total": total}

    @router.get("/admin/settings")
    async def settings(user=Depends(super_admin)):
        return {"items": await service.supabase.rows("admin_settings", {"select": "*", "order": "key.asc"})}

    @router.patch("/admin/settings/{key}")
    async def setting_update(key: str, body: AdminSettingIn, request: Request, user=Depends(super_admin)):
        await limit_mutation(user)
        before = await service.supabase.one("admin_settings", {"key": f"eq.{key}"})
        if not before:
            raise HTTPException(404, "Réglage inconnu ou non modifiable.")
        if key == "maintenance_mode" and body.value is True:
            _confirmed(body.confirmation)
        result = await service.supabase.patch("admin_settings", {"key": f"eq.{key}"}, {"value": body.value, "updated_by": user["id"]})
        await service.audit(user, "setting.updated", "admin_setting", key, old_value={"value": before.get("value")}, new_value={"value": body.value}, request_id=_request_id(request))
        return result

    @router.get("/admin/search")
    async def global_search(q: str = Query(..., min_length=2, max_length=100), user=Depends(staff_user)):
        users_result, support_result = await service.list_users(1, 8, q, None, None, None), await service.support_list(1, 8, None, None, q)
        firms = []
        if normalize_role(user.get("role")) != "support":
            clean = q.replace("*", "")[:80]
            firms = await service.supabase.rows("prop_firms", {"select": "id,slug,name,active", "name": f"ilike.*{clean}*", "limit": "8"})
        return {"users": users_result["items"], "support": support_result["items"], "prop_firms": firms}

    @router.post("/product-events", status_code=status.HTTP_204_NO_CONTENT)
    async def product_event(body: ProductEventIn, response: Response, user=Depends(get_current_user)):
        await service.record_product_event(user, body.event_name, body.feature, body.metadata)
        return response

    @router.get("/announcements/active")
    async def active_announcements(user=Depends(get_current_user)):
        now = datetime.now(timezone.utc)
        rows = await service.supabase.rows("announcements", {
            "select": "id,title,message,type,dismissible,starts_at,ends_at,audience,audience_user_ids",
            "active": "eq.true", "order": "created_at.desc", "limit": "50",
        })
        plan_row = await service.supabase.one("subscriptions", {"user_id": f"eq.{user['id']}"}, "plan")
        plan = (plan_row or {}).get("plan", "free")
        role = normalize_role(user.get("role"))
        visible = []
        for row in rows:
            try:
                starts_at = datetime.fromisoformat(row["starts_at"].replace("Z", "+00:00")) if row.get("starts_at") else None
                ends_at = datetime.fromisoformat(row["ends_at"].replace("Z", "+00:00")) if row.get("ends_at") else None
            except (TypeError, ValueError):
                continue
            if (starts_at and starts_at > now) or (ends_at and ends_at <= now):
                continue
            audience = row.get("audience", "all")
            if audience == "all" or audience == plan or (audience == "admins" and role in {"support", "admin", "super_admin"}) or (audience == "specific_users" and user["id"] in (row.get("audience_user_ids") or [])):
                visible.append(row)
        return {"items": visible}

    @router.get("/features")
    async def enabled_features(user=Depends(get_current_user)):
        flags = await service.supabase.rows("feature_flags", {"select": "key", "limit": "200"})
        return {"features": {row["key"]: await service.feature_enabled(row["key"], user, False) for row in flags}}

    @router.get("/catalog/prop-firms")
    async def public_prop_firms():
        rows = await service.supabase.rows("prop_firms", {"select": "slug,name,logo_url,market_types,platforms,import_supported,auto_sync_supported,official_source,last_verified_at", "active": "eq.true", "order": "name.asc", "limit": "200"})
        return {"items": rows}

    @router.get("/settings/public")
    async def public_settings():
        registration, support, maintenance = await service.setting("registration_enabled", True), await service.setting("support_enabled", True), await service.setting("maintenance_mode", False)
        return {"registration_enabled": bool(registration), "support_enabled": bool(support), "maintenance_mode": bool(maintenance)}

    return router
