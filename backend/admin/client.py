from __future__ import annotations

import asyncio
import logging
from typing import Any

import requests


class AdminConfigurationError(RuntimeError):
    pass


class AdminDataError(RuntimeError):
    pass


class SupabaseAdminClient:
    """Small server-only Supabase REST/Auth client.

    The caller must authenticate and authorize the administrator before using
    this client. User access tokens are deliberately never forwarded here.
    """

    def __init__(self, url: str, secret_key: str | None, publishable_key: str, timeout: int = 15):
        self.url = (url or "").rstrip("/")
        self.secret_key = secret_key
        self.publishable_key = publishable_key
        self.timeout = timeout

    @property
    def configured(self) -> bool:
        return bool(self.url and self.secret_key)

    def _server_headers(self, extra: dict[str, str] | None = None) -> dict[str, str]:
        if not self.configured:
            raise AdminConfigurationError("SUPABASE_SECRET_KEY is not configured on the server")
        headers = {
            "apikey": self.secret_key,
            "Accept": "application/json",
        }
        # Legacy service_role keys are JWTs. The newer sb_secret_* keys must
        # stay in the apikey header and are not valid Bearer JWTs.
        if self.secret_key.count(".") == 2:
            headers["Authorization"] = f"Bearer {self.secret_key}"
        return {**headers, **(extra or {})}

    async def request(
        self,
        method: str,
        path: str,
        *,
        params: dict[str, Any] | None = None,
        payload: Any = None,
        headers: dict[str, str] | None = None,
        use_publishable_key: bool = False,
    ) -> requests.Response:
        if use_publishable_key:
            request_headers = {
                "apikey": self.publishable_key,
                "Accept": "application/json",
                **(headers or {}),
            }
            if self.publishable_key.count(".") == 2:
                request_headers["Authorization"] = f"Bearer {self.publishable_key}"
        else:
            request_headers = self._server_headers(headers)
        response = await asyncio.to_thread(
            requests.request,
            method,
            f"{self.url}{path}",
            params=params,
            json=payload,
            headers=request_headers,
            timeout=self.timeout,
        )
        if response.status_code >= 400:
            logging.error(
                "admin_supabase_request_failed method=%s path=%s status=%s",
                method,
                path.split("?")[0],
                response.status_code,
            )
            raise AdminDataError(f"Supabase request failed ({response.status_code})")
        return response

    async def list_rows(
        self,
        table: str,
        *,
        params: dict[str, Any] | None = None,
        page: int = 1,
        per_page: int = 25,
    ) -> tuple[list[dict[str, Any]], int]:
        start = (page - 1) * per_page
        end = start + per_page - 1
        response = await self.request(
            "GET",
            f"/rest/v1/{table}",
            params=params,
            headers={"Prefer": "count=exact", "Range": f"{start}-{end}"},
        )
        content_range = response.headers.get("Content-Range", "")
        total_text = content_range.rsplit("/", 1)[-1] if "/" in content_range else "0"
        total = int(total_text) if total_text.isdigit() else len(response.json())
        return response.json(), total

    async def rows(self, table: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        response = await self.request("GET", f"/rest/v1/{table}", params=params)
        return response.json()

    async def count(self, table: str, filters: dict[str, Any] | None = None) -> int:
        response = await self.request(
            "HEAD",
            f"/rest/v1/{table}",
            params={"select": "*", **(filters or {})},
            headers={"Prefer": "count=exact", "Range": "0-0"},
        )
        content_range = response.headers.get("Content-Range", "")
        total_text = content_range.rsplit("/", 1)[-1] if "/" in content_range else "0"
        return int(total_text) if total_text.isdigit() else 0

    async def one(self, table: str, filters: dict[str, Any], select: str = "*") -> dict[str, Any] | None:
        rows = await self.rows(table, {"select": select, **filters, "limit": "1"})
        return rows[0] if rows else None

    async def insert(self, table: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = await self.request(
            "POST",
            f"/rest/v1/{table}",
            payload=payload,
            headers={"Content-Type": "application/json", "Prefer": "return=representation"},
        )
        rows = response.json()
        return rows[0] if rows else payload

    async def patch(self, table: str, filters: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any] | None:
        response = await self.request(
            "PATCH",
            f"/rest/v1/{table}",
            params=filters,
            payload=payload,
            headers={"Content-Type": "application/json", "Prefer": "return=representation"},
        )
        rows = response.json()
        return rows[0] if rows else None

    async def auth_user(self, user_id: str) -> dict[str, Any] | None:
        response = await self.request("GET", f"/auth/v1/admin/users/{user_id}")
        body = response.json()
        return body.get("user", body)

    async def update_auth_user(self, user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        response = await self.request(
            "PUT",
            f"/auth/v1/admin/users/{user_id}",
            payload=payload,
            headers={"Content-Type": "application/json"},
        )
        body = response.json()
        return body.get("user", body)

    async def resend_confirmation(self, email: str, redirect_to: str) -> None:
        await self.request(
            "POST",
            "/auth/v1/resend",
            params={"redirect_to": redirect_to},
            payload={"type": "signup", "email": email},
            headers={"Content-Type": "application/json"},
            use_publishable_key=True,
        )
