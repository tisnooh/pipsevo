from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
import requests


class SupabaseIntegrationRepository:
    def __init__(
        self,
        url: str,
        publishable_key: str,
        secret_key: str | None,
        mirror_db=None,
    ):
        self.url = url.rstrip("/")
        self.publishable_key = publishable_key
        self.secret_key = secret_key
        self.mirror_db = mirror_db

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
        account = rows[0]
        if self.mirror_db is not None:
            await self.mirror_db.accounts.update_one(
                {"id": account["id"], "user_id": account["user_id"]},
                {"$setOnInsert": account},
                upsert=True,
            )
        return account

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
        if self.mirror_db is not None:
            await self.mirror_db.accounts.delete_one(
                {"id": account_id, "user_id": user_id}
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
        self,
        user_id: str,
        succeeded: bool,
        error_code: str | None = None,
        platform: str = "mt5",
    ) -> None:
        await self._request(
            "POST",
            "/rest/v1/integration_connection_attempts",
            headers=self._admin_headers(),
            json={
                "user_id": user_id,
                "platform": platform,
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
            provider_fields = {
                "integration_connection_id",
                "integration_account_id",
                "source",
                "source_provider",
                "external_account_id",
                "provider_trade_id",
                "provider_order_id",
                "external_position_id",
                "platform",
                "symbol",
                "instrument",
                "direction",
                "volume",
                "size",
                "open_time",
                "close_time",
                "date",
                "open_price",
                "close_price",
                "entry",
                "exit_price",
                "stop_loss",
                "stop",
                "take_profit",
                "gross_profit",
                "commission",
                "swap",
                "fees",
                "net_profit",
                "pnl",
                "provider_comment",
                "magic_number",
                "market_type",
                "result_status",
                "imported_at",
                "provider_currency",
                "broker_timezone",
                "provider_metadata",
                "provider_updated_at",
            }
            await self._request(
                "PATCH",
                "/rest/v1/trades",
                headers=self._admin_headers(),
                params={"id": f"eq.{existing[0]['id']}"},
                json={key: value for key, value in payload.items() if key in provider_fields},
            )
            await self._mirror_trade(existing[0]["id"], payload, provider_fields)
            return "updated"
        created = await self._request(
            "POST",
            "/rest/v1/trades",
            headers=self._admin_headers("return=representation"),
            json=payload,
        ) or []
        provider_fields = set(payload) - {
            "setup",
            "setups",
            "session",
            "emotion",
            "emotion_secondary",
            "emotion_intensity",
            "notes",
            "screenshots",
            "tags",
            "mistakes",
            "checklist_results",
            "starred",
            "plan_respected",
        }
        await self._mirror_trade(created[0]["id"], payload, provider_fields)
        return "inserted"

    async def _mirror_trade(
        self,
        trade_id: str,
        payload: dict,
        provider_fields: set[str],
    ) -> None:
        """Mirror normalized trades into the app's existing Mongo read model.

        Only provider-owned fields are updated after insertion. Journal notes,
        tags, screenshots and discipline reviews therefore remain untouched.
        """
        if self.mirror_db is None:
            return
        provider_payload = {
            key: value for key, value in payload.items() if key in provider_fields
        }
        provider_payload.update(
            {
                "id": trade_id,
                "user_id": payload["user_id"],
                "account_id": payload["account_id"],
            }
        )
        update = {
            "$set": provider_payload,
            "$setOnInsert": {
                "setup": None,
                "setups": [],
                "session": None,
                "emotion": None,
                "notes": None,
                "screenshots": [],
                "tags": [],
                "mistakes": [],
                "checklist_results": [],
                "plan_respected": None,
                "starred": False,
            },
        }
        await self.mirror_db.trades.update_one(
            {
                "user_id": payload["user_id"],
                "source_provider": payload["source_provider"],
                "external_account_id": payload["external_account_id"],
                "provider_trade_id": payload["provider_trade_id"],
            },
            update,
            upsert=True,
        )

    async def update_account_balance(
        self, account_id: str, user_id: str, balance: str | float
    ) -> None:
        numeric_balance = float(balance)
        rows = await self._request(
            "GET",
            "/rest/v1/accounts",
            headers=self._admin_headers(),
            params={
                "id": f"eq.{account_id}",
                "user_id": f"eq.{user_id}",
                "select": "initial_balance",
            },
        ) or []
        updates = {"balance": balance}
        if rows and float(rows[0].get("initial_balance") or 0) <= 0 < numeric_balance:
            updates["initial_balance"] = balance
        await self._request(
            "PATCH",
            "/rest/v1/accounts",
            headers=self._admin_headers(),
            params={"id": f"eq.{account_id}", "user_id": f"eq.{user_id}"},
            json=updates,
        )
        if self.mirror_db is not None:
            await self.mirror_db.accounts.update_one(
                {"id": account_id, "user_id": user_id},
                {"$set": {key: float(value) for key, value in updates.items()}},
            )

    async def create_oauth_state(
        self,
        *,
        state_hash: str,
        user_id: str,
        provider: str,
        return_path: str,
        expires_at: str,
    ) -> None:
        await self._request(
            "POST",
            "/rest/v1/rpc/integration_create_oauth_state",
            headers=self._admin_headers(),
            json={
                "p_state_hash": state_hash,
                "p_user_id": user_id,
                "p_provider": provider,
                "p_redirect_after": return_path,
                "p_expires_at": expires_at,
                "p_code_verifier_ciphertext": None,
                "p_key_version": None,
            },
        )

    async def consume_oauth_state(self, state_hash: str, provider: str) -> dict | None:
        rows = await self._request(
            "POST",
            "/rest/v1/rpc/integration_consume_oauth_state",
            headers=self._admin_headers(),
            json={"p_state_hash": state_hash, "p_provider": provider},
        )
        return rows[0] if rows else None

    async def find_connection_by_external(
        self, user_id: str, provider: str, external_connection_id: str
    ) -> dict | None:
        rows = await self._request(
            "GET",
            "/rest/v1/integration_connections",
            headers=self._admin_headers(),
            params={
                "user_id": f"eq.{user_id}",
                "provider": f"eq.{provider}",
                "external_connection_id": f"eq.{external_connection_id}",
                "select": "*",
            },
        ) or []
        return rows[0] if rows else None

    async def create_integration_account(self, payload: dict) -> dict:
        rows = await self._request(
            "POST",
            "/rest/v1/integration_accounts",
            headers=self._admin_headers("resolution=merge-duplicates,return=representation"),
            params={"on_conflict": "user_id,provider,external_account_id"},
            json=payload,
        )
        return rows[0]

    async def list_integration_accounts(
        self, connection_id: str, user_id: str, selected_only: bool = False
    ) -> list[dict]:
        params = {
            "connection_id": f"eq.{connection_id}",
            "user_id": f"eq.{user_id}",
            "select": "*",
            "order": "created_at.asc",
        }
        if selected_only:
            params["status"] = "in.(selected,connected,error)"
        return await self._request(
            "GET",
            "/rest/v1/integration_accounts",
            headers=self._admin_headers(),
            params=params,
        ) or []

    async def get_integration_account(self, account_id: str, user_id: str) -> dict | None:
        rows = await self._request(
            "GET",
            "/rest/v1/integration_accounts",
            headers=self._admin_headers(),
            params={"id": f"eq.{account_id}", "user_id": f"eq.{user_id}", "select": "*"},
        ) or []
        return rows[0] if rows else None

    async def update_integration_account(self, account_id: str, user_id: str, payload: dict) -> dict:
        rows = await self._request(
            "PATCH",
            "/rest/v1/integration_accounts",
            headers=self._admin_headers("return=representation"),
            params={"id": f"eq.{account_id}", "user_id": f"eq.{user_id}"},
            json=payload,
        ) or []
        if not rows:
            raise LookupError("Integration account not found")
        return rows[0]

    async def select_integration_accounts(
        self, connection_id: str, user_id: str, account_ids: list[str]
    ) -> list[dict]:
        await self._request(
            "PATCH",
            "/rest/v1/integration_accounts",
            headers=self._admin_headers(),
            params={"connection_id": f"eq.{connection_id}", "user_id": f"eq.{user_id}"},
            json={"status": "available"},
        )
        await self._request(
            "PATCH",
            "/rest/v1/integration_accounts",
            headers=self._admin_headers(),
            params={
                "connection_id": f"eq.{connection_id}",
                "user_id": f"eq.{user_id}",
                "external_account_id": f"in.({','.join(account_ids)})",
            },
            json={"status": "selected"},
        )
        return await self.list_integration_accounts(connection_id, user_id)

    async def claim_sync_lock(self, account_id: str, owner: str, minutes: int) -> bool:
        value = await self._request(
            "POST",
            "/rest/v1/rpc/integration_claim_sync_lock",
            headers=self._admin_headers(),
            json={
                "p_integration_account_id": account_id,
                "p_lock_token": owner,
                "p_lock_seconds": minutes * 60,
            },
        )
        return bool(value)

    async def release_sync_lock(self, account_id: str, owner: str) -> None:
        await self._request(
            "POST",
            "/rest/v1/rpc/integration_release_sync_lock",
            headers=self._admin_headers(),
            json={"p_integration_account_id": account_id, "p_lock_token": owner},
        )

    async def upsert_execution(self, payload: dict) -> str:
        await self._request(
            "POST",
            "/rest/v1/trade_executions",
            headers=self._admin_headers("resolution=merge-duplicates"),
            params={"on_conflict": "user_id,provider,external_account_id,external_execution_id"},
            json=payload,
        )
        return "upserted"

    async def create_snapshot(self, payload: dict) -> None:
        await self._request(
            "POST",
            "/rest/v1/integration_account_snapshots",
            headers=self._admin_headers(),
            json=payload,
        )

    async def list_due_accounts(self, before: str, limit: int = 100) -> list[dict]:
        return await self._request(
            "GET",
            "/rest/v1/integration_accounts",
            headers=self._admin_headers(),
            params={
                "status": "in.(selected,connected,error)",
                "or": f"(last_successful_sync_at.is.null,last_successful_sync_at.lt.{before})",
                "select": "*",
                "order": "last_successful_sync_at.asc.nullsfirst",
                "limit": limit,
            },
        ) or []
