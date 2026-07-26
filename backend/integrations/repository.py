from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
import requests


class SupabaseIntegrationRepository:
    def __init__(self, url: str, publishable_key: str, secret_key: str | None):
        self.url = url.rstrip("/")
        self.publishable_key = publishable_key
        self.secret_key = secret_key

    def _user_headers(self, token: str) -> dict[str, str]:
        return {
            "apikey": self.publishable_key,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }

    def _admin_headers(self, prefer: str | None = None) -> dict[str, str]:
        if not self.secret_key:
            raise RuntimeError(
                "SUPABASE_SECRET_KEY est requis pour les intégrations serveur"
            )
        headers = {
            "apikey": self.secret_key,
            "Authorization": f"Bearer {self.secret_key}",
            "Accept": "application/json",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer
        return headers

    async def _request(self, method: str, path: str, **kwargs):
        response = await asyncio.to_thread(
            requests.request,
            method,
            f"{self.url}{path}",
            timeout=20,
            **kwargs,
        )
        if response.status_code >= 400:
            raise RuntimeError(
                f"Supabase integration repository error ({response.status_code})"
            )
        if not response.content:
            return None
        return response.json()

    async def list_connections(self, user_id: str, user_token: str) -> list[dict]:
        return (
            await self._request(
                "GET",
                "/rest/v1/integration_connections",
                headers=self._user_headers(user_token),
                params={
                    "user_id": f"eq.{user_id}",
                    "select": "*",
                    "order": "created_at.desc",
                },
            )
            or []
        )

    async def get_connection(self, connection_id: str, user_id: str) -> dict | None:
        rows = (
            await self._request(
                "GET",
                "/rest/v1/integration_connections",
                headers=self._admin_headers(),
                params={
                    "id": f"eq.{connection_id}",
                    "user_id": f"eq.{user_id}",
                    "select": "*",
                },
            )
            or []
        )
        return rows[0] if rows else None

    async def create_account(self, payload: dict) -> dict:
        rows = (
            await self._request(
                "POST",
                "/rest/v1/accounts",
                headers=self._admin_headers("return=representation"),
                json=payload,
            )
            or []
        )
        return rows[0]

    async def create_connection(self, payload: dict) -> dict:
        rows = (
            await self._request(
                "POST",
                "/rest/v1/integration_connections",
                headers=self._admin_headers("return=representation"),
                json=payload,
            )
            or []
        )
        return rows[0]

    async def update_connection(
        self, connection_id: str, user_id: str, payload: dict
    ) -> dict:
        rows = (
            await self._request(
                "PATCH",
                "/rest/v1/integration_connections",
                headers=self._admin_headers("return=representation"),
                params={"id": f"eq.{connection_id}", "user_id": f"eq.{user_id}"},
                json=payload,
            )
            or []
        )
        if not rows:
            raise LookupError("Connection not found")
        return rows[0]

    async def delete_connection(self, connection_id: str, user_id: str) -> None:
        await self._request(
            "DELETE",
            "/rest/v1/integration_connections",
            headers=self._admin_headers(),
            params={"id": f"eq.{connection_id}", "user_id": f"eq.{user_id}"},
        )

    async def delete_account(self, account_id: str, user_id: str) -> None:
        await self._request(
            "DELETE",
            "/rest/v1/accounts",
            headers=self._admin_headers(),
            params={"id": f"eq.{account_id}", "user_id": f"eq.{user_id}"},
        )

    async def store_credentials(
        self,
        connection_id: str,
        user_id: str,
        provider: str,
        credential_ciphertext: str | None,
        provider_token_ciphertext: str | None,
        key_version: int,
    ) -> None:
        await self._request(
            "POST",
            "/rest/v1/rpc/integration_store_credentials",
            headers=self._admin_headers(),
            json={
                "p_connection_id": connection_id,
                "p_user_id": user_id,
                "p_provider": provider,
                "p_credential_ciphertext": credential_ciphertext,
                "p_provider_token_ciphertext": provider_token_ciphertext,
                "p_key_version": key_version,
            },
        )

    async def read_credentials(self, connection_id: str, user_id: str) -> dict | None:
        rows = (
            await self._request(
                "POST",
                "/rest/v1/rpc/integration_read_credentials",
                headers=self._admin_headers(),
                json={"p_connection_id": connection_id, "p_user_id": user_id},
            )
            or []
        )
        return rows[0] if rows else None

    async def delete_credentials(self, connection_id: str, user_id: str) -> None:
        await self._request(
            "POST",
            "/rest/v1/rpc/integration_delete_credentials",
            headers=self._admin_headers(),
            json={"p_connection_id": connection_id, "p_user_id": user_id},
        )

    async def upsert_trade_event(self, payload: dict) -> str:
        event_id = await self._request(
            "POST",
            "/rest/v1/rpc/integration_upsert_trade_event",
            headers=self._admin_headers(),
            json={
                "p_connection_id": payload["connection_id"],
                "p_user_id": payload["user_id"],
                "p_provider": payload["provider"],
                "p_external_account_id": payload["external_account_id"],
                "p_provider_transaction_id": payload["provider_transaction_id"],
                "p_provider_order_id": payload.get("provider_order_id"),
                "p_provider_position_id": payload.get("provider_position_id"),
                "p_event_type": payload["event_type"],
                "p_normalized_payload": payload["normalized_payload"],
                "p_occurred_at": payload.get("occurred_at"),
            },
        )
        return str(event_id)

    async def count_recent_attempts(self, user_id: str, minutes: int) -> int:
        since = (datetime.now(timezone.utc) - timedelta(minutes=minutes)).isoformat()
        rows = (
            await self._request(
                "GET",
                "/rest/v1/integration_connection_attempts",
                headers={**self._admin_headers(), "Prefer": "count=exact"},
                params={
                    "user_id": f"eq.{user_id}",
                    "attempted_at": f"gte.{since}",
                    "select": "id",
                },
            )
            or []
        )
        return len(rows)

    async def record_attempt(
        self, user_id: str, succeeded: bool, error_code: str | None = None
    ) -> None:
        await self._request(
            "POST",
            "/rest/v1/integration_connection_attempts",
            headers=self._admin_headers(),
            json={
                "user_id": user_id,
                "platform": "mt5",
                "succeeded": succeeded,
                "error_code": error_code,
            },
        )

    async def audit(
        self,
        user_id: str,
        action: str,
        outcome: str,
        connection_id: str | None = None,
        metadata: dict | None = None,
    ) -> None:
        await self._request(
            "POST",
            "/rest/v1/integration_security_audit",
            headers=self._admin_headers(),
            json={
                "user_id": user_id,
                "connection_id": connection_id,
                "action": action,
                "outcome": outcome,
                "safe_metadata": metadata or {},
            },
        )

    async def create_sync_run(self, payload: dict) -> dict:
        rows = (
            await self._request(
                "POST",
                "/rest/v1/integration_sync_runs",
                headers=self._admin_headers("return=representation"),
                json=payload,
            )
            or []
        )
        return rows[0]

    async def update_sync_run(self, run_id: str, payload: dict) -> None:
        await self._request(
            "PATCH",
            "/rest/v1/integration_sync_runs",
            headers=self._admin_headers(),
            params={"id": f"eq.{run_id}"},
            json=payload,
        )

    async def upsert_trade(self, payload: dict) -> str:
        identity = {
            "user_id": payload["user_id"],
            "source_provider": payload["source_provider"],
            "external_account_id": payload["external_account_id"],
            "provider_trade_id": payload["provider_trade_id"],
        }
        params = {key: f"eq.{value}" for key, value in identity.items()}
        params["select"] = "id"
        existing = (
            await self._request(
                "GET", "/rest/v1/trades", headers=self._admin_headers(), params=params
            )
            or []
        )
        if existing:
            await self._request(
                "PATCH",
                "/rest/v1/trades",
                headers=self._admin_headers(),
                params={"id": f"eq.{existing[0]['id']}"},
                json=payload,
            )
            return "updated"
        await self._request(
            "POST", "/rest/v1/trades", headers=self._admin_headers(), json=payload
        )
        return "inserted"
