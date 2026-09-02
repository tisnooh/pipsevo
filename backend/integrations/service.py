from __future__ import annotations

import asyncio
import hashlib
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from .config import IntegrationConfig
from .errors import (
    ConnectionRateLimitError,
    FeatureDisabledError,
    IntegrationError,
    ProviderUnavailableError,
    public_provider_error,
)
from .models import (
    AuthenticationResult,
    IntegrationAccount,
    IntegrationConnection,
    MetaApiLinkRequest,
    MT5Credentials,
    SyncResult,
    TradeLockerCredentials,
)
from .normalization import json_safe_trade, normalize_batch
from .providers import ProviderRegistry, TradingConnector
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
        legacy = {
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
        server_ready = bool(self.repository.secret_key and self.vault)
        plan_allowed = plan.lower() in self.config.allowed_plans
        definitions = [
            ("ctrader", "cTrader", "oauth2", ["ctrader"]),
            ("metaapi", "MetaTrader 4 / 5", "provider_link", ["mt4", "mt5"]),
            ("tradelocker", "TradeLocker", "jwt", ["tradelocker"]),
            ("tradovate", "Tradovate", "oauth2", ["tradovate"]),
            ("ninjatrader", "NinjaTrader", "developer_access", ["ninjatrader"]),
        ]
        providers = []
        for provider_id, label, auth_type, platforms in definitions:
            registered = self.registry.has(provider_id)
            available = registered and server_ready and plan_allowed
            enabled_platforms = [
                platform
                for platform in platforms
                if platform in self.config.enabled_platforms
            ]
            providers.append(
                {
                    "provider": provider_id,
                    "label": label,
                    "platforms": platforms,
                    "enabled_platforms": enabled_platforms,
                    "auth_type": auth_type,
                    "available": available,
                    "status": "available" if available else (
                        "requires_developer_access" if provider_id == "ninjatrader" else "configuration_required"
                    ),
                    "read_only": True,
                    "automatic_sync": available,
                }
            )
        return {**legacy, "providers": providers, "file_import_available": True}

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
        rows = await self.repository.list_connections(user_id, user_token)
        if not hasattr(self.repository, "list_integration_accounts"):
            return rows
        for row in rows:
            row["integration_accounts"] = await self.repository.list_integration_accounts(
                row["id"], user_id
            )
        return rows

    def _generic_provider(self, provider_id: str, plan: str) -> TradingConnector:
        self._ensure_plan(plan)
        provider = self.registry.get(provider_id)
        if not isinstance(provider, TradingConnector) or not self.repository.secret_key or not self.vault:
            raise IntegrationError(
                "provider_not_configured",
                "Cette plateforme n’est pas encore configurée côté serveur.",
                503,
            )
        return provider

    async def search_metaapi_servers(
        self, plan: str, platform: str, query: str
    ) -> dict[str, Any]:
        provider = self._generic_provider("metaapi", plan)
        if not hasattr(provider, "search_servers"):
            raise ProviderUnavailableError()
        try:
            return {"servers": await provider.search_servers(platform, query)}
        except Exception as exc:
            raise self._safe_error(exc) from None

    async def _store_access(
        self, connection: dict | IntegrationConnection, user_id: str, provider_id: str, access: dict
    ) -> None:
        connection_id = connection["id"] if isinstance(connection, dict) else connection.id
        associated_data = f"{user_id}:{connection_id}:{provider_id}"
        encrypted = self.vault.encrypt_json(access, associated_data)
        await self.repository.store_credentials(
            connection_id,
            user_id,
            provider_id,
            None,
            encrypted.ciphertext,
            encrypted.key_version,
        )

    def _retry_delay(self, attempt: int) -> float:
        jitter = 0.8 + (secrets.randbelow(401) / 1000)
        return self.config.sync_backoff_seconds * (2**attempt) * jitter

    @staticmethod
    def _retryable(error: Exception) -> bool:
        return isinstance(error, IntegrationError) and error.code in {
            "provider_unavailable",
            "rate_limit",
        }

    async def start_oauth(
        self, user_id: str, plan: str, provider_id: str, return_path: str
    ) -> dict:
        provider = self._generic_provider(provider_id, plan)
        if provider.auth_type != "oauth2":
            raise IntegrationError("oauth_not_supported", "Cette plateforme n’utilise pas OAuth.", 400)
        raw_state = secrets.token_urlsafe(48)
        state_hash = hashlib.sha256(raw_state.encode("utf-8")).hexdigest()
        await self.repository.create_oauth_state(
            state_hash=state_hash,
            user_id=user_id,
            provider=provider_id,
            return_path=return_path if return_path.startswith("/") else "/app/settings",
            expires_at=(datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        )
        result = await provider.start_auth(state=raw_state)
        await self.repository.audit(
            user_id, f"{provider_id}_oauth_started", "success", metadata={"provider": provider_id}
        )
        return result

    async def complete_oauth(self, provider_id: str, code: str, state: str) -> dict:
        state_hash = hashlib.sha256(state.encode("utf-8")).hexdigest()
        state_row = await self.repository.consume_oauth_state(state_hash, provider_id)
        if not state_row:
            raise IntegrationError(
                "oauth_state_invalid",
                "Cette autorisation a expiré ou a déjà été utilisée.",
                400,
            )
        user_id = str(state_row["user_id"])
        provider = self._generic_provider(provider_id, "beta")
        try:
            result = await provider.complete_auth(code=code)
            connection = await self._persist_authentication(user_id, provider, result)
            await self.repository.audit(
                user_id,
                f"{provider_id}_oauth_completed",
                "success",
                connection["id"],
                {"accounts_found": len(result.accounts)},
            )
            return {
                "connection": connection,
                "accounts": [item.model_dump(mode="json") for item in result.accounts],
                "redirect_after": state_row.get("redirect_after") or "/app/settings",
            }
        except Exception as exc:
            safe = self._safe_error(exc)
            await self.repository.audit(
                user_id, f"{provider_id}_oauth_failed", "failure", metadata={"error_code": safe.code}
            )
            raise safe from None

    async def connect_tradelocker(
        self, user_id: str, plan: str, request: TradeLockerCredentials
    ) -> dict:
        provider = self._generic_provider("tradelocker", plan)
        await self._ensure_attempt_allowed(user_id)
        try:
            result = await provider.authenticate(request)
            connection = await self._persist_authentication(
                user_id, provider, result, request.environment
            )
            await self.repository.record_attempt(user_id, True, platform="tradelocker")
            await self.repository.audit(
                user_id,
                "tradelocker_connected",
                "success",
                connection["id"],
                {"accounts_found": len(result.accounts)},
            )
            return {
                "connection": connection,
                "accounts": [item.model_dump(mode="json") for item in result.accounts],
            }
        except Exception as exc:
            safe = self._safe_error(exc)
            await self.repository.record_attempt(user_id, False, safe.code, "tradelocker")
            raise safe from None

    async def start_metaapi(
        self, user_id: str, plan: str, request: MetaApiLinkRequest
    ) -> dict:
        provider = self._generic_provider("metaapi", plan)
        await self._ensure_attempt_allowed(user_id)
        try:
            link = await provider.create_configuration_link(request)
            direct = link.get("mode") == "direct"
            connection = await self.repository.create_connection(
                {
                    "user_id": user_id,
                    "platform": request.platform,
                    "provider": "metaapi",
                    "external_connection_id": link["provider_account_id"],
                    "external_account_id": link["provider_account_id"],
                    "server_name": request.server,
                    "account_number_masked": mask_account_number(request.login),
                    "display_name": request.name,
                    "auth_type": "credentials_exchange" if direct else "provider_link",
                    "permission_scope": "read",
                    "broker_name": request.broker_name,
                    "provider_metadata": {
                        "platform": request.platform,
                        "account_kind": request.account_kind,
                        "start_date": request.start_date.isoformat() if request.start_date else None,
                    },
                    "connection_status": "pending",
                    "sync_status": "idle",
                }
            )
            await self._store_access(
                connection,
                user_id,
                "metaapi",
                {"provider_account_id": link["provider_account_id"]},
            )
            await self.repository.record_attempt(user_id, True, platform=request.platform)
            await self.repository.audit(
                user_id,
                "metaapi_connection_started" if direct else "metaapi_configuration_link_created",
                "success",
                connection["id"],
            )
            # request.password is never copied into link, connection, audit, or encrypted storage.
            if direct and str(link.get("state") or "").upper() != "DEPLOYED":
                await provider.deploy(link["provider_account_id"])
            return {
                "connection": connection,
                "configuration_link": link["configuration_link"],
                "next_step": (
                    "wait_for_connection" if direct else "configure_provider_then_finalize"
                ),
            }
        except Exception as exc:
            safe = self._safe_error(exc)
            await self.repository.record_attempt(user_id, False, safe.code, request.platform)
            raise safe from None

    async def finalize_metaapi(
        self, user_id: str, plan: str, connection_id: str
    ) -> dict:
        provider = self._generic_provider("metaapi", plan)
        row = await self.repository.get_connection(connection_id, user_id)
        if not row or row.get("provider") != "metaapi":
            raise IntegrationError("connection_not_found", "Connexion MetaTrader introuvable.", 404)
        connection = IntegrationConnection.model_validate(row)
        access = await self._access(connection)
        await provider.deploy(access["provider_account_id"])
        accounts = await provider.list_accounts(access)
        if not accounts:
            raise IntegrationError(
                "provider_configuration_pending",
                "La connexion MetaTrader est encore en cours. Réessaie dans quelques instants.",
                409,
            )
        await self._persist_detected_accounts(connection, accounts)
        updated = await self.repository.update_connection(
            connection.id,
            user_id,
            {
                "connection_status": "connected",
                "authorized_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        if len(accounts) == 1:
            await self._select_account_rows(
                updated,
                user_id,
                [accounts[0].external_account_id],
            )
        return {"connection": updated, "accounts": [item.model_dump(mode="json") for item in accounts]}

    async def _persist_authentication(
        self,
        user_id: str,
        provider: TradingConnector,
        result: AuthenticationResult,
        environment: str | None = None,
    ) -> dict:
        first = result.accounts[0] if result.accounts else None
        platform = provider.platforms[0]
        payload = {
                "user_id": user_id,
                "platform": platform,
                "provider": provider.provider_id,
                "external_connection_id": result.external_connection_id,
                "external_account_id": first.external_account_id if len(result.accounts) == 1 else None,
                "broker_name": first.broker_name if first else None,
                "server_name": first.server_name if first else None,
                "account_number_masked": first.account_number_masked if first else None,
                "account_type": first.account_type if first else "unknown",
                "account_currency": first.account_currency if first else None,
                "display_name": first.display_name if len(result.accounts) == 1 else None,
                "auth_type": provider.auth_type,
                "permission_scope": result.tokens.scope or "read",
                "token_expires_at": result.tokens.expires_at.isoformat() if result.tokens.expires_at else None,
                "provider_environment": environment,
                "provider_metadata": result.provider_metadata,
                "authorized_at": datetime.now(timezone.utc).isoformat(),
                "connection_status": "connected",
                "sync_status": "idle",
            }
        existing = await self.repository.find_connection_by_external(
            user_id, provider.provider_id, result.external_connection_id
        )
        if existing:
            connection = await self.repository.update_connection(
                existing["id"],
                user_id,
                {key: value for key, value in payload.items() if key != "user_id"},
            )
        else:
            connection = await self.repository.create_connection(payload)
        access = {
            "access_token": result.tokens.access_token.get_secret_value(),
            "refresh_token": result.tokens.refresh_token.get_secret_value() if result.tokens.refresh_token else None,
            "expires_at": result.tokens.expires_at.isoformat() if result.tokens.expires_at else None,
            **result.provider_metadata,
        }
        await self._store_access(connection, user_id, provider.provider_id, access)
        await self._persist_detected_accounts(
            IntegrationConnection.model_validate(connection), result.accounts
        )
        if len(result.accounts) == 1:
            await self._select_account_rows(
                connection,
                user_id,
                [result.accounts[0].external_account_id],
            )
        return connection

    async def _persist_detected_accounts(
        self, connection: IntegrationConnection, accounts: list
    ) -> None:
        for account in accounts:
            await self.repository.create_integration_account(
                {
                    "connection_id": connection.id,
                    "user_id": connection.user_id,
                    "provider": connection.provider,
                    "platform": connection.platform,
                    "external_account_id": account.external_account_id,
                    "account_name": account.display_name,
                    "account_number_masked": account.account_number_masked,
                    "broker_name": account.broker_name,
                    "server_name": account.server_name,
                    "currency": account.account_currency,
                    "account_type": account.account_type,
                    "status": "available",
                    "balance": float(account.balance) if account.balance is not None else None,
                    "equity": float(account.equity) if account.equity is not None else None,
                    "provider_metadata": {
                        **(connection.provider_metadata or {}),
                        **(account.provider_metadata or {}),
                    },
                }
            )

    async def _select_account_rows(
        self,
        connection: dict | IntegrationConnection,
        user_id: str,
        external_account_ids: list[str],
    ) -> list[dict]:
        connection_id = (
            connection["id"] if isinstance(connection, dict) else connection.id
        )
        provider_id = (
            connection["provider"]
            if isinstance(connection, dict)
            else connection.provider
        )
        available = await self.repository.list_integration_accounts(
            connection_id, user_id
        )
        by_external = {item["external_account_id"]: item for item in available}
        unknown = set(external_account_ids) - set(by_external)
        if unknown:
            raise IntegrationError("account_not_authorized", "Un compte sélectionné n’est pas autorisé.", 403)
        selected_rows = []
        for external_id in external_account_ids:
            item = by_external[external_id]
            core_id = item.get("account_id")
            if not core_id:
                market_type = "futures" if provider_id == "tradovate" else "cfd"
                core = await self.repository.create_account(
                    {
                        "user_id": user_id,
                        "name": item.get("account_name") or f"{provider_id} {external_id[-4:]}",
                        "firm": item.get("broker_name") or provider_id.title(),
                        "market_type": market_type,
                        "balance": float(item.get("balance") or 0),
                        "initial_balance": max(float(item.get("balance") or 0), 0),
                        "status": "active",
                    }
                )
                core_id = core["id"]
            selected_rows.append(
                await self.repository.update_integration_account(
                    item["id"], user_id, {"account_id": core_id, "status": "selected"}
                )
            )
        for item in available:
            if item["external_account_id"] not in external_account_ids and item["status"] != "available":
                await self.repository.update_integration_account(
                    item["id"], user_id, {"status": "available"}
                )
        return selected_rows

    async def select_accounts(
        self, user_id: str, plan: str, connection_id: str, external_account_ids: list[str]
    ) -> dict:
        self._ensure_plan(plan)
        row = await self.repository.get_connection(connection_id, user_id)
        if not row:
            raise IntegrationError("connection_not_found", "Connexion introuvable.", 404)
        selected_rows = await self._select_account_rows(
            row, user_id, external_account_ids
        )
        results = []
        for item in selected_rows:
            try:
                results.append(await self.sync_integration_account(user_id, item["id"], "initial_import"))
            except IntegrationError as exc:
                results.append({"status": "failed", "error_code": exc.code, "message": exc.public_message})
        return {"accounts": selected_rows, "initial_sync": results}

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

    async def _fresh_access(
        self, connection: IntegrationConnection, provider: TradingConnector
    ) -> dict[str, Any]:
        access = await self._access(connection)
        expires_at = access.get("expires_at")
        if not expires_at:
            return access
        expires = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
        if expires > datetime.now(timezone.utc) + timedelta(minutes=2):
            return access
        try:
            refreshed = await provider.refresh_auth(access)
        except IntegrationError as exc:
            if exc.code == "invalid_credentials":
                await self.repository.update_connection(
                    connection.id,
                    connection.user_id,
                    {
                        "connection_status": "expired",
                        "sync_status": "failed",
                        "last_error_code": "connection_expired",
                        "last_error_message": public_provider_error("connection_expired"),
                    },
                )
                await self.repository.audit(
                    connection.user_id,
                    f"{connection.provider}_connection_expired",
                    "failure",
                    connection.id,
                )
                raise IntegrationError(
                    "connection_expired", public_provider_error("connection_expired"), 401
                ) from None
            raise
        await self._store_access(connection, connection.user_id, connection.provider, refreshed)
        await self.repository.update_connection(
            connection.id,
            connection.user_id,
            {
                "token_expires_at": refreshed.get("expires_at"),
                "connection_status": "connected",
                "last_error_code": None,
                "last_error_message": None,
            },
        )
        await self.repository.audit(
            connection.user_id,
            f"{connection.provider}_connection_refreshed",
            "success",
            connection.id,
        )
        return refreshed

    async def sync_integration_account(
        self, user_id: str, integration_account_id: str, trigger: str = "manual"
    ) -> dict:
        account_row = await self.repository.get_integration_account(
            integration_account_id, user_id
        )
        if not account_row:
            raise IntegrationError("account_not_found", "Compte d’intégration introuvable.", 404)
        account = IntegrationAccount.model_validate(account_row)
        connection_row = await self.repository.get_connection(account.connection_id, user_id)
        if not connection_row:
            raise IntegrationError("connection_not_found", "Connexion introuvable.", 404)
        connection = IntegrationConnection.model_validate(connection_row)
        provider = self.registry.get(connection.provider)
        if not isinstance(provider, TradingConnector):
            raise ProviderUnavailableError()
        if not account.account_id:
            raise IntegrationError(
                "account_not_selected", "Sélectionne ce compte avant de le synchroniser.", 409
            )
        lock_token = str(uuid.uuid4())
        if not await self.repository.claim_sync_lock(
            account.id, lock_token, self.config.sync_lock_minutes
        ):
            raise IntegrationError(
                "sync_already_running", "Une synchronisation est déjà en cours.", 409
            )
        initial = trigger == "initial_import" or not account.last_successful_sync_at
        started = time.monotonic()
        now = datetime.now(timezone.utc).isoformat()
        run = await self.repository.create_sync_run(
            {
                "connection_id": connection.id,
                "integration_account_id": account.id,
                "user_id": user_id,
                "trigger_source": "initial_import" if initial else trigger,
                "sync_type": "historical" if initial else "incremental",
                "status": "running",
                "cursor_before": account.sync_cursor,
            }
        )
        try:
            await self.repository.update_integration_account(
                account.id,
                user_id,
                {
                    "status": "syncing",
                    "last_sync_attempt_at": now,
                    "last_error_code": None,
                    "last_error_message": None,
                },
            )
            access = await self._fresh_access(connection, provider)
            batch = None
            for attempt in range(self.config.sync_retry_attempts):
                try:
                    batch = (
                        await provider.sync_historical(account, access)
                        if initial
                        else await provider.sync_recent(account, access, account.sync_cursor)
                    )
                    break
                except Exception as exc:
                    safe_retry = self._safe_error(exc)
                    if (
                        attempt + 1 == self.config.sync_retry_attempts
                        or not self._retryable(safe_retry)
                    ):
                        raise safe_retry from None
                    await asyncio.sleep(self._retry_delay(attempt))
            normalized, skipped = normalize_batch(
                batch.trades,
                account_id=account.account_id,
                connection_id=connection.id,
                integration_account_id=account.id,
                provider=connection.provider,
                external_account_id=account.external_account_id,
            )
            result = SyncResult(
                skipped_count=skipped,
                execution_count=len(batch.executions),
                next_cursor=batch.next_cursor,
                partial_error=batch.partial_error,
            )
            for record in batch.trades:
                await self.repository.upsert_trade_event(
                    {
                        "connection_id": connection.id,
                        "user_id": user_id,
                        "provider": connection.provider,
                        "external_account_id": account.external_account_id,
                        "provider_transaction_id": record.provider_trade_id,
                        "provider_order_id": record.provider_order_id,
                        "provider_position_id": record.provider_position_id,
                        "event_type": record.transaction_type,
                        "normalized_payload": record.model_dump(mode="json"),
                        "occurred_at": (record.close_time or record.open_time).isoformat(),
                    }
                )
            for trade in normalized:
                payload = {
                    "user_id": user_id,
                    "platform": connection.platform,
                    "provider_metadata": next(
                        (
                            item.raw_payload
                            for item in batch.trades
                            if item.provider_trade_id == trade.provider_trade_id
                        ),
                        {},
                    ),
                    "provider_updated_at": datetime.now(timezone.utc).isoformat(),
                    **json_safe_trade(trade),
                }
                action = await self.repository.upsert_trade(payload)
                if action == "inserted":
                    result.imported_count += 1
                else:
                    result.updated_count += 1
            for execution in batch.executions:
                await self.repository.upsert_execution(
                    {
                        "user_id": user_id,
                        "connection_id": connection.id,
                        "integration_account_id": account.id,
                        "account_id": account.account_id,
                        "provider": connection.provider,
                        "platform": connection.platform,
                        "external_account_id": account.external_account_id,
                        "external_execution_id": execution.provider_execution_id,
                        "external_order_id": execution.provider_order_id,
                        "external_position_id": execution.provider_position_id,
                        "symbol": execution.symbol,
                        "side": execution.direction,
                        "execution_type": (
                            execution.execution_type
                            if execution.execution_type in {"open", "close", "other"}
                            else "other"
                        ),
                        "quantity": str(execution.quantity),
                        "price": str(execution.price),
                        "gross_pnl": str(execution.realized_pnl),
                        "commission": str(abs(execution.commission)),
                        "fees": str(abs(execution.fees)),
                        "executed_at": execution.executed_at.isoformat(),
                        "raw_metadata": execution.raw_payload,
                    }
                )
            if batch.snapshot:
                await self.repository.create_snapshot(
                    {
                        "user_id": user_id,
                        "integration_account_id": account.id,
                        "account_id": account.account_id,
                        "balance": str(batch.snapshot.balance) if batch.snapshot.balance is not None else None,
                        "equity": str(batch.snapshot.equity) if batch.snapshot.equity is not None else None,
                        "currency": batch.snapshot.currency,
                        "recorded_at": batch.snapshot.captured_at.isoformat(),
                    }
                )
                if batch.snapshot.balance is not None and hasattr(
                    self.repository, "update_account_balance"
                ):
                    await self.repository.update_account_balance(
                        account.account_id,
                        user_id,
                        str(batch.snapshot.balance),
                    )
            completed = datetime.now(timezone.utc).isoformat()
            status = "partial_error" if batch.partial_error else "success"
            await self.repository.update_integration_account(
                account.id,
                user_id,
                {
                    "status": "connected",
                    "sync_cursor": batch.next_cursor,
                    "last_successful_sync_at": completed,
                    "balance": str(batch.snapshot.balance) if batch.snapshot and batch.snapshot.balance is not None else (str(account.balance) if account.balance is not None else None),
                    "equity": str(batch.snapshot.equity) if batch.snapshot and batch.snapshot.equity is not None else (str(account.equity) if account.equity is not None else None),
                },
            )
            await self.repository.update_connection(
                connection.id,
                user_id,
                {
                    "connection_status": "connected",
                    "sync_status": status,
                    "last_successful_sync_at": completed,
                    "last_sync_attempt_at": now,
                },
            )
            await self.repository.update_sync_run(
                run["id"],
                {
                    "status": status,
                    "trades_found": len(batch.trades),
                    "executions_found": len(batch.executions),
                    "imported_count": result.imported_count,
                    "updated_count": result.updated_count,
                    "skipped_count": result.skipped_count,
                    "cursor_after": result.next_cursor,
                    "duration_ms": round((time.monotonic() - started) * 1000),
                    "completed_at": completed,
                },
            )
            await self.repository.audit(
                user_id,
                f"{connection.provider}_sync_completed",
                "success",
                connection.id,
                {
                    "integration_account_id": account.id,
                    "imported_count": result.imported_count,
                    "updated_count": result.updated_count,
                },
            )
            return result.model_dump(mode="json")
        except Exception as exc:
            safe = self._safe_error(exc)
            await self.repository.update_integration_account(
                account.id,
                user_id,
                {
                    "status": "error",
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
                    "duration_ms": round((time.monotonic() - started) * 1000),
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                },
            )
            raise safe from None
        finally:
            await self.repository.release_sync_lock(account.id, lock_token)

    async def sync_due_accounts(self, limit: int = 100) -> dict:
        cutoff = (
            datetime.now(timezone.utc) - timedelta(minutes=self.config.sync_interval_minutes)
        ).isoformat()
        due = await self.repository.list_due_accounts(cutoff, limit)
        results = {"processed": 0, "succeeded": 0, "failed": 0, "errors": []}
        for account in due:
            results["processed"] += 1
            try:
                await self.sync_integration_account(
                    account["user_id"], account["id"], "scheduled"
                )
                results["succeeded"] += 1
            except IntegrationError as exc:
                results["failed"] += 1
                results["errors"].append({"account_id": account["id"], "code": exc.code})
        return results

    async def sync_connection(
        self, user_id: str, connection_id: str, trigger: str = "manual"
    ) -> dict:
        row = await self.repository.get_connection(connection_id, user_id)
        if not row:
            raise IntegrationError(
                "connection_not_found", "Connexion introuvable.", 404
            )
        connection = IntegrationConnection.model_validate(row)
        generic_provider = self.registry.get(connection.provider)
        if isinstance(generic_provider, TradingConnector):
            accounts = await self.repository.list_integration_accounts(
                connection.id, user_id, selected_only=True
            )
            if not accounts:
                raise IntegrationError(
                    "account_not_selected",
                    "Sélectionne au moins un compte avant de synchroniser.",
                    409,
                )
            results = []
            for account in accounts:
                results.append(
                    await self.sync_integration_account(user_id, account["id"], trigger)
                )
            return {"accounts": results}
        provider = self._provider()
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
                except Exception as exc:
                    safe_retry = self._safe_error(exc)
                    if (
                        attempt + 1 == self.config.sync_retry_attempts
                        or not self._retryable(safe_retry)
                    ):
                        raise safe_retry from None
                    await asyncio.sleep(self._retry_delay(attempt))
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
                if isinstance(provider, TradingConnector):
                    await provider.disconnect(connection, access)
                else:
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
                "disconnected_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        if hasattr(self.repository, "list_integration_accounts"):
            for account in await self.repository.list_integration_accounts(connection.id, user_id):
                await self.repository.update_integration_account(
                    account["id"], user_id, {"status": "disconnected"}
                )
        await self.repository.audit(
            user_id, f"{connection.provider}_disconnected", "success", connection.id
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
