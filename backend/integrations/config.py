from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any


def _enabled(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class IntegrationConfig:
    mt5_auto_sync_enabled: bool
    provider: str | None
    encryption_keys: tuple[str, ...]
    encryption_key_version: int
    max_connection_attempts: int
    connection_attempt_window_minutes: int
    sync_retry_attempts: int
    sync_backoff_seconds: float
    sync_interval_minutes: int
    allowed_plans: tuple[str, ...]
    public_api_url: str = ""
    frontend_url: str = ""
    provider_settings: dict[str, dict[str, Any]] = field(default_factory=dict)
    enabled_providers: tuple[str, ...] = ()
    enabled_platforms: tuple[str, ...] = ()
    sync_lock_minutes: int = 10

    @classmethod
    def from_env(cls) -> "IntegrationConfig":
        keys = tuple(
            item.strip()
            for item in os.environ.get("INTEGRATION_ENCRYPTION_KEYS", "").split(",")
            if item.strip()
        )
        provider = os.environ.get("MT5_PROVIDER", "").strip().lower() or None
        frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3100").rstrip("/")
        api_url = os.environ.get("PUBLIC_API_URL", "http://localhost:8000/api").rstrip("/")
        provider_settings = {
            "ctrader": {
                "client_id": os.environ.get("CTRADER_CLIENT_ID", "").strip(),
                "client_secret": os.environ.get("CTRADER_CLIENT_SECRET", "").strip(),
                "redirect_uri": os.environ.get(
                    "CTRADER_REDIRECT_URI", f"{api_url}/integrations/oauth/callback"
                ).strip(),
            },
            "metaapi": {
                "token": os.environ.get("METAAPI_TOKEN", "").strip(),
                "domain": os.environ.get("METAAPI_DOMAIN", "agiliumtrade.agiliumtrade.ai").strip(),
            },
            "tradelocker": {
                "demo_url": os.environ.get(
                    "TRADELOCKER_DEMO_URL", "https://demo.tradelocker.com/backend-api"
                ).rstrip("/"),
                "live_url": os.environ.get(
                    "TRADELOCKER_LIVE_URL", "https://live.tradelocker.com/backend-api"
                ).rstrip("/"),
            },
            "tradovate": {
                "client_id": os.environ.get("TRADOVATE_CLIENT_ID", "").strip(),
                "client_secret": os.environ.get("TRADOVATE_CLIENT_SECRET", "").strip(),
                "redirect_uri": os.environ.get(
                    "TRADOVATE_REDIRECT_URI", f"{api_url}/integrations/oauth/callback"
                ).strip(),
            },
        }
        credentials_ready = {
            "ctrader": all(provider_settings["ctrader"].values()),
            "metaapi": bool(provider_settings["metaapi"]["token"]),
            "tradelocker": True,
            "tradovate": all(provider_settings["tradovate"].values()),
        }
        platform_flags = {
            "ctrader": _enabled(os.environ.get("CTRADER_SYNC_ENABLED")),
            "mt4": _enabled(os.environ.get("MT4_SYNC_ENABLED")),
            "mt5": _enabled(os.environ.get("MT5_SYNC_ENABLED")),
            "tradelocker": _enabled(
                os.environ.get("TRADELOCKER_SYNC_ENABLED")
                or os.environ.get("TRADELOCKER_ENABLED")
            ),
            "tradovate": _enabled(os.environ.get("TRADOVATE_SYNC_ENABLED")),
            "ninjatrader": _enabled(os.environ.get("NINJATRADER_SYNC_ENABLED")),
        }
        provider_flags = {
            "ctrader": platform_flags["ctrader"],
            "metaapi": platform_flags["mt4"] or platform_flags["mt5"],
            "tradelocker": platform_flags["tradelocker"],
            "tradovate": platform_flags["tradovate"],
        }
        explicitly_enabled = {
            value.strip().lower()
            for value in os.environ.get("INTEGRATION_ENABLED_PROVIDERS", "").split(",")
            if value.strip()
        }
        enabled_providers = tuple(
            key
            for key, ready in credentials_ready.items()
            if ready
            and provider_flags[key]
            and (not explicitly_enabled or key in explicitly_enabled)
        )
        return cls(
            mt5_auto_sync_enabled=_enabled(os.environ.get("MT5_AUTO_SYNC_ENABLED")),
            provider=provider,
            encryption_keys=keys,
            encryption_key_version=int(
                os.environ.get("INTEGRATION_ENCRYPTION_KEY_VERSION", "1")
            ),
            max_connection_attempts=max(
                1, int(os.environ.get("MT5_MAX_CONNECTION_ATTEMPTS", "5"))
            ),
            connection_attempt_window_minutes=max(
                1, int(os.environ.get("MT5_CONNECTION_ATTEMPT_WINDOW_MINUTES", "15"))
            ),
            sync_retry_attempts=max(
                1, int(os.environ.get("MT5_SYNC_RETRY_ATTEMPTS", "3"))
            ),
            sync_backoff_seconds=max(
                0.1, float(os.environ.get("MT5_SYNC_BACKOFF_SECONDS", "1"))
            ),
            sync_interval_minutes=max(
                1, int(os.environ.get("MT5_SYNC_INTERVAL_MINUTES", "5"))
            ),
            allowed_plans=tuple(
                plan.strip().lower()
                for plan in os.environ.get(
                    "MT5_ALLOWED_PLANS", "free,beta,essential,pro"
                ).split(",")
                if plan.strip()
            ),
            public_api_url=api_url,
            frontend_url=frontend_url,
            provider_settings=provider_settings,
            enabled_providers=enabled_providers,
            enabled_platforms=tuple(
                platform for platform, enabled in platform_flags.items() if enabled
            ),
            sync_lock_minutes=max(1, int(os.environ.get("INTEGRATION_SYNC_LOCK_MINUTES", "10"))),
        )

    def provider_enabled(self, provider: str) -> bool:
        return provider in self.enabled_providers

    def provider_config(self, provider: str) -> dict[str, Any]:
        return self.provider_settings.get(provider, {})

    def validate_for_startup(
        self, provider_is_registered: bool, has_server_secret: bool
    ) -> None:
        if self.mt5_auto_sync_enabled:
            missing = []
            if not self.provider:
                missing.append("MT5_PROVIDER")
            if not self.encryption_keys:
                missing.append("INTEGRATION_ENCRYPTION_KEYS")
            if not has_server_secret:
                missing.append("SUPABASE_SECRET_KEY")
            if self.provider and not provider_is_registered:
                missing.append(f"adaptateur réel pour MT5_PROVIDER={self.provider}")
            if missing:
                raise RuntimeError(
                    "MT5_AUTO_SYNC_ENABLED=true mais la configuration est incomplète : "
                    + ", ".join(missing)
                )

        # Generic providers are deliberately enabled only when their complete
        # credential set is present. This prevents a UI from claiming a source
        # is connected while its server-side adapter cannot authenticate.
        if self.enabled_providers and (not self.encryption_keys or not has_server_secret):
            generic_missing = []
            if not self.encryption_keys:
                generic_missing.append("INTEGRATION_ENCRYPTION_KEYS")
            if not has_server_secret:
                generic_missing.append("SUPABASE_SECRET_KEY")
            raise RuntimeError(
                "Connecteurs de trading activés mais configuration serveur incomplète : "
                + ", ".join(generic_missing)
            )
