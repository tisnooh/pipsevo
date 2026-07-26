from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from typing import Any

from .config import IntegrationConfig
from .errors import (
    ConnectionRateLimitError,
    FeatureDisabledError,
    IntegrationError,
    ProviderUnavailableError,
    public_provider_error,
)
from .models import IntegrationConnection, MT5Credentials, SyncResult
from .normalization import json_safe_trade, normalize_batch
from .providers import ProviderRegistry
from .security import CredentialVault, mask_account_number


class IntegrationService:
    """Coordinates providers without coupling PipsEvo to a specific vendor."""

    def __init__(
        self,
        config: IntegrationConfig,
        registry: ProviderRegistry,
        repository,
        vault: CredentialVault | None,
    ):
        self.config = config
        self.registry = registry
        self.repository = repository
        self.vault = vault

    def capabilities(self, plan: str = "beta") -> dict[str, Any]:
        provider_ready = bool(
            self.config.provider and self.registry.has(self.config.provider)
        )
        server_ready = bool(self.repository.secret_key and self.vault)
        plan_allowed = plan.lower() in self.config.allowed_plans
        available = (
            self.config.mt5_auto_sync_enabled
            and provider_ready
            and server_ready
            and plan_allowed
        )
        return {
            "platform": "mt5",
            "enabled": self.config.mt5_auto_sync_enabled,
            "available": available,
            "provider_configured": provider_ready,
            "plan_allowed": plan_allowed,
            "status": "available" if available else "coming_soon",
            "sync_interval_minutes": (
                self.config.sync_interval_minutes if available else None
            ),
        }

    def _provider(self):
        if not self.config.mt5_auto_sync_enabled:
            raise FeatureDisabledError()
        provider = self.registry.get(self.config.provider)
        if not provider or not self.repository.secret_key or not self.vault:
            raise ProviderUnavailableError()
        return provider

    def _ensure_plan(self, plan: str) -> None:
        if plan.lower() not in self.config.allowed_plans:
            raise IntegrationError(
                "plan_required",
                "La synchronisation MT5 nécessite une formule compatible.",
                403,
            )

    async def _ensure_attempt_allowed(self, user_id: str) -> None:
        attempts = await self.repository.count_recent_attempts(
            user_id, self.config.connection_attempt_window_minutes
        )
        if attempts >= self.config.max_connection_attempts:
            raise ConnectionRateLimitError()

    @staticmethod
    def _safe_error(error: Exception) -> IntegrationError:
        if isinstance(error, IntegrationError):
            return error
        code = getattr(error, "code", None) or "provider_unavailable"
        return IntegrationError(
            code,
            public_provider_error(code),
            400 if code != "provider_unavailable" else 503,
        )

    async def list_connections(self, user_id: str, user_token: str) -> list[dict]:
        return await self.repository.list_connections(user_id, user_token)

    async def test_connection(
        self, user_id: str, plan: str, credentials: MT5Credentials
    ) -> dict:
        self._ensure_plan(plan)
        provider = self._provider()
        await self._ensure_attempt_allowed(user_id)
        await self.repository.audit(user_id, "mt5_connection_started", "success")
        try:
            account = await provider.test_connection(credentials)
            await self.repository.record_attempt(user_id, True)
            return account.model_dump(mode="json", exclude={"balance", "equity"})
        except Exception as exc:
            safe = self._safe_error(exc)
            await self.repository.record_attempt(user_id, False, safe.code)
            await self.repository.audit(
                user_id,
                "mt5_connection_failed",
                "failure",
                metadata={"error_code": safe.code},
            )
            raise safe from None

    async def connect_account(
        self, user_id: str, plan: str, credentials: MT5Credentials
    ) -> dict:
        self._ensure_plan(plan)
        provider = self._provider()
        await self._ensure_attempt_allowed(user_id)
        account_row = None
        connection_row = None
        try:
            result = await provider.connect_account(credentials)
            detected = result.account
            balance = float(detected.balance or detected.equity or 0)
            account_row = await self.repository.create_account(
                {
                    "user_id": user_id,
                    "name": credentials.display_name
                    or detected.display_name
                    or f"MT5 {detected.account_number_masked}",
                    "firm": detected.broker_name or "MetaTrader 5",
                    "market_type": "cfd",
                    "balance": balance,
                    "initial_balance": max(balance, 0),
                    "status": "active",
                }
            )
            connection_row = await self.repository.create_connection(
                {
                    "user_id": user_id,
                    "account_id": account_row["id"],
                    "platform": "mt5",
                    "provider": provider.provider_id,
                    "external_account_id": detected.external_account_id,
                    "broker_name": detected.broker_name,
                    "server_name": detected.server_name,
                    "account_number_masked": mask_account_number(
                        credentials.account_number
                    ),
                    "account_type": detected.account_type,
                    "account_currency": detected.account_currency,
                    "display_name": credentials.display_name or detected.display_name,
                    "connection_status": "connected",
                    "sync_status": "idle",
                }
            )
            associated_data = f"{user_id}:{connection_row['id']}:{provider.provider_id}"
            credential_ciphertext = None
            provider_token_ciphertext = None
            if result.permanent_token:
                encrypted = self.vault.encrypt_json(
                    {"token": result.permanent_token.get_secret_value()},
                    associated_data,
                )
                provider_token_ciphertext = encrypted.ciphertext
            elif result.requires_credentials_for_sync:
                encrypted = self.vault.encrypt_json(
                    {
                        "account_number": credentials.account_number,
                        "server_name": credentials.server_name,
                        "investor_password": credentials.investor_password.get_secret_value(),
                    },
                    associated_data,
                )
                credential_ciphertext = encrypted.ciphertext
            else:
                raise IntegrationError(
                    "credential_contract_invalid",
                    "Le fournisseur n'a pas fourni d'accès durable.",
                    503,
                )
            await self.repository.store_credentials(
                connection_row["id"],
                user_id,
                provider.provider_id,
                credential_ciphertext,
                provider_token_ciphertext,
                encrypted.key_version,
            )
            await self.repository.record_attempt(user_id, True)
            await self.repository.audit(
                user_id,
                "mt5_connection_succeeded",
                "success",
                connection_row["id"],
                {"provider": provider.provider_id},
            )
            try:
                sync = await self.sync_connection(
                    user_id, connection_row["id"], "initial_import"
                )
                sync = {"status": "success", **sync}
            except IntegrationError as sync_error:
                # A provider can accept the connection while its history endpoint
                # is temporarily unavailable. Keep the encrypted connection so a
                # later manual/background retry can recover without asking again.
                sync = {
                    "status": "failed",
                    "error_code": sync_error.code,
                    "message": sync_error.public_message,
                }
            connection_row = await self.repository.get_connection(
                connection_row["id"], user_id
            )
            return {"connection": connection_row, "initial_sync": sync}
        except Exception as exc:
            safe = self._safe_error(exc)
            await self.repository.record_attempt(user_id, False, safe.code)
            if connection_row:
                try:
                    await self.repository.delete_credentials(
                        connection_row["id"], user_id
                    )
                    await self.repository.delete_connection(
                        connection_row["id"], user_id
                    )
                except Exception:
                    pass
            if account_row:
                try:
                    await self.repository.delete_account(account_row["id"], user_id)
                except Exception:
                    pass
            await self.repository.audit(
                user_id,
                "mt5_connection_failed",
                "failure",
                metadata={"error_code": safe.code},
            )
            raise safe from None

    async def _access(self, connection: IntegrationConnection) -> dict[str, Any]:
        stored = await self.repository.read_credentials(
            connection.id, connection.user_id
        )
        if not stored:
            raise IntegrationError(
                "connection_expired", public_provider_error("connection_expired"), 409
            )
        associated_data = f"{connection.user_id}:{connection.id}:{connection.provider}"
        ciphertext = stored.get("provider_token_ciphertext") or stored.get(
            "credential_ciphertext"
        )
        return self.vault.decrypt_json(ciphertext, associated_data)

    async def sync_connection(
        self, user_id: str, connection_id: str, trigger: str = "manual"
    ) -> dict:
        provider = self._provider()
        row = await self.repository.get_connection(connection_id, user_id)
        if not row:
            raise IntegrationError(
                "connection_not_found", "Connexion introuvable.", 404
            )
        connection = IntegrationConnection.model_validate(row)
        if connection.connection_status == "disconnected":
            raise IntegrationError(
                "connection_disconnected",
                "Reconnecte ce compte avant de le synchroniser.",
                409,
            )
        initial = trigger == "initial_import" or not connection.last_successful_sync_at
        sync_status = "importing_history" if initial else "syncing"
        now = datetime.now(timezone.utc).isoformat()
        await self.repository.update_connection(
            connection.id,
            user_id,
            {
                "sync_status": sync_status,
                "last_sync_attempt_at": now,
                "last_error_code": None,
                "last_error_message": None,
            },
        )
        run = await self.repository.create_sync_run(
            {
                "connection_id": connection.id,
                "user_id": user_id,
                "trigger_source": "initial_import" if initial else trigger,
                "status": "running",
                "cursor_before": connection.sync_cursor,
            }
        )
        try:
            access = await self._access(connection)
            batch = None
            for attempt in range(self.config.sync_retry_attempts):
                try:
                    batch = (
                        await provider.fetch_historical_trades(connection, access)
                        if initial
                        else await provider.fetch_recent_trades(
                            connection, access, connection.sync_cursor
                        )
                    )
                    break
                except Exception:
                    if attempt + 1 == self.config.sync_retry_attempts:
                        raise
                    await asyncio.sleep(self.config.sync_backoff_seconds * (2**attempt))
            normalized, skipped = normalize_batch(
                batch.trades,
                account_id=connection.account_id,
                connection_id=connection.id,
                provider=connection.provider,
                external_account_id=connection.external_account_id,
            )
            for record in batch.trades:
                await self.repository.upsert_trade_event(
                    {
                        "connection_id": connection.id,
                        "user_id": user_id,
                        "provider": connection.provider,
                        "external_account_id": connection.external_account_id,
                        "provider_transaction_id": record.provider_trade_id,
                        "provider_order_id": record.provider_order_id,
                        "provider_position_id": record.provider_position_id,
                        "event_type": record.transaction_type,
                        "normalized_payload": record.model_dump(mode="json"),
                        "occurred_at": (
                            record.close_time or record.open_time
                        ).isoformat(),
                    }
                )
            result = SyncResult(
                skipped_count=skipped,
                next_cursor=batch.next_cursor,
                partial_error=batch.partial_error,
            )
            for trade in normalized:
                action = await self.repository.upsert_trade(
                    {"user_id": user_id, **json_safe_trade(trade)}
                )
                if action == "inserted":
                    result.imported_count += 1
                else:
                    result.updated_count += 1
            final_status = "partial_error" if result.partial_error else "success"
            await self.repository.update_connection(
                connection.id,
                user_id,
                {
                    "connection_status": "connected",
                    "sync_status": final_status,
                    "sync_cursor": result.next_cursor,
                    "last_successful_sync_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            await self.repository.update_sync_run(
                run["id"],
                {
                    "status": final_status,
                    "imported_count": result.imported_count,
                    "updated_count": result.updated_count,
                    "skipped_count": result.skipped_count,
                    "error_count": result.error_count,
                    "cursor_after": result.next_cursor,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            event = "mt5_initial_import_completed" if initial else "mt5_sync_completed"
            await self.repository.audit(
                user_id,
                event,
                "success",
                connection.id,
                {
                    "imported_count": result.imported_count,
                    "updated_count": result.updated_count,
                },
            )
            return result.model_dump(mode="json")
        except Exception as exc:
            safe = self._safe_error(exc)
            await self.repository.update_connection(
                connection.id,
                user_id,
                {
                    "sync_status": "failed",
                    "last_error_code": safe.code,
                    "last_error_message": safe.public_message,
                },
            )
            await self.repository.update_sync_run(
                run["id"],
                {
                    "status": "failed",
                    "error_count": 1,
                    "error_code": safe.code,
                    "error_message": safe.public_message,
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            await self.repository.audit(
                user_id,
                "mt5_sync_failed",
                "failure",
                connection.id,
                {"error_code": safe.code},
            )
            raise safe from None

    async def disconnect(self, user_id: str, connection_id: str) -> dict:
        row = await self.repository.get_connection(connection_id, user_id)
        if not row:
            raise IntegrationError(
                "connection_not_found", "Connexion introuvable.", 404
            )
        connection = IntegrationConnection.model_validate(row)
        provider = self.registry.get(connection.provider)
        try:
            if provider:
                access = await self._access(connection)
                await provider.disconnect_account(connection, access)
        except Exception:
            # Revoking the provider session is best-effort. Local encrypted
            # secrets must still be deleted if the provider is unavailable.
            pass
        finally:
            await self.repository.delete_credentials(connection.id, user_id)
        updated = await self.repository.update_connection(
            connection.id,
            user_id,
            {
                "connection_status": "disconnected",
                "sync_status": "idle",
                "sync_cursor": {},
            },
        )
        await self.repository.audit(
            user_id, "mt5_disconnected", "success", connection.id
        )
        return updated

    async def reconnect(
        self, user_id: str, plan: str, connection_id: str, credentials: MT5Credentials
    ) -> dict:
        self._ensure_plan(plan)
        provider = self._provider()
        row = await self.repository.get_connection(connection_id, user_id)
        if not row:
            raise IntegrationError(
                "connection_not_found", "Connexion introuvable.", 404
            )
        connection = IntegrationConnection.model_validate(row)
        result = await provider.refresh_connection(connection, credentials)
        associated_data = f"{user_id}:{connection.id}:{provider.provider_id}"
        token_ciphertext = None
        credential_ciphertext = None
        if result.permanent_token:
            encrypted = self.vault.encrypt_json(
                {"token": result.permanent_token.get_secret_value()}, associated_data
            )
            token_ciphertext = encrypted.ciphertext
        else:
            encrypted = self.vault.encrypt_json(
                {
                    "account_number": credentials.account_number,
                    "server_name": credentials.server_name,
                    "investor_password": credentials.investor_password.get_secret_value(),
                },
                associated_data,
            )
            credential_ciphertext = encrypted.ciphertext
        await self.repository.store_credentials(
            connection.id,
            user_id,
            provider.provider_id,
            credential_ciphertext,
            token_ciphertext,
            encrypted.key_version,
        )
        await self.repository.update_connection(
            connection.id,
            user_id,
            {
                "connection_status": "connected",
                "sync_status": "idle",
                "last_error_code": None,
                "last_error_message": None,
            },
        )
        return await self.sync_connection(user_id, connection.id, "retry")
