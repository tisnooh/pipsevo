from __future__ import annotations

import os
from dataclasses import dataclass


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

    @classmethod
    def from_env(cls) -> "IntegrationConfig":
        keys = tuple(
            item.strip()
            for item in os.environ.get("INTEGRATION_ENCRYPTION_KEYS", "").split(",")
            if item.strip()
        )
        provider = os.environ.get("MT5_PROVIDER", "").strip().lower() or None
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
                for plan in os.environ.get("MT5_ALLOWED_PLANS", "beta,pro").split(",")
                if plan.strip()
            ),
        )

    def validate_for_startup(
        self, provider_is_registered: bool, has_server_secret: bool
    ) -> None:
        if not self.mt5_auto_sync_enabled:
            return
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
