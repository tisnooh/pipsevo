from __future__ import annotations

from copy import deepcopy
from typing import Any, Iterable

from fastapi import Depends, HTTPException


ROLES = ("user", "support", "admin", "super_admin")
STAFF_ROLES = frozenset({"support", "admin", "super_admin"})

ROLE_PERMISSIONS = {
    "user": frozenset(),
    "support": frozenset({"support.read", "support.write", "users.support_read"}),
    "admin": frozenset({
        "overview.read", "users.read", "users.manage", "subscriptions.read",
        "support.read", "support.write", "analytics.read", "sync.read",
        "trading_accounts.read", "integrations.read", "system.read",
        "prop_firms.read", "prop_firms.write", "emails.read", "backtest.read",
        "atlas.read", "announcements.read", "announcements.write",
        "incidents.read", "incidents.write",
    }),
    "super_admin": frozenset({"*"}),
}

_SENSITIVE_PARTS = (
    "password", "passwd", "token", "secret", "credential", "private_key",
    "access_key", "refresh_key", "authorization", "cookie", "ciphertext",
)


def normalize_role(value: Any) -> str:
    role = str(value or "user").strip().lower()
    return role if role in ROLES else "user"


def has_permission(user: dict[str, Any], permission: str) -> bool:
    permissions = ROLE_PERMISSIONS[normalize_role(user.get("role"))]
    return "*" in permissions or permission in permissions


def require_permission(get_current_user, permission: str):
    async def dependency(user=Depends(get_current_user)):
        if user.get("status", "active") != "active":
            raise HTTPException(403, "Ce compte est suspendu.")
        if not has_permission(user, permission):
            raise HTTPException(403, "Ton compte n’a pas les permissions nécessaires.")
        return user

    return dependency


def require_staff(get_current_user):
    async def dependency(user=Depends(get_current_user)):
        if user.get("status", "active") != "active" or normalize_role(user.get("role")) not in STAFF_ROLES:
            raise HTTPException(403, "Ton compte n’a pas les permissions nécessaires.")
        return user

    return dependency


def sanitize(value: Any, *, allowed_keys: Iterable[str] | None = None) -> Any:
    """Remove credentials and unusually large values from operational metadata."""
    allowed = set(allowed_keys or ())
    if isinstance(value, dict):
        clean: dict[str, Any] = {}
        for key, item in value.items():
            key_text = str(key)
            lowered = key_text.lower()
            if key_text not in allowed and any(part in lowered for part in _SENSITIVE_PARTS):
                continue
            clean[key_text] = sanitize(item)
        return clean
    if isinstance(value, list):
        return [sanitize(item) for item in value[:100]]
    if isinstance(value, str):
        return value[:2000]
    return deepcopy(value)


def public_staff_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user.get("id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "role": normalize_role(user.get("role")),
        "status": user.get("status", "active"),
        "permissions": sorted(ROLE_PERMISSIONS[normalize_role(user.get("role"))]),
    }
