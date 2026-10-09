from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class UserActionIn(StrictModel):
    action: Literal["suspend", "reactivate", "reset_onboarding", "resend_confirmation"]
    confirmation: bool


class RoleChangeIn(StrictModel):
    role: Literal["user", "support", "admin", "super_admin"]
    confirmation: bool


class TradingSyncIn(StrictModel):
    confirmation: bool


class SupportUpdateIn(StrictModel):
    status: Literal["open", "in_progress", "waiting_user", "resolved", "closed"] | None = None
    priority: Literal["low", "normal", "high", "urgent"] | None = None
    assigned_to: str | None = Field(default=None, max_length=320)


class SupportMessageIn(StrictModel):
    kind: Literal["user_message", "internal_note"]
    message: str = Field(min_length=2, max_length=5000)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        return value.strip()


class PropFirmIn(StrictModel):
    slug: str = Field(min_length=2, max_length=80, pattern=r"^[a-z0-9][a-z0-9-]+$")
    name: str = Field(min_length=2, max_length=120)
    logo_url: str | None = Field(default=None, max_length=500)
    market_types: list[str] = Field(default_factory=list, max_length=10)
    platforms: list[str] = Field(default_factory=list, max_length=30)
    import_supported: bool = False
    auto_sync_supported: bool = False
    official_source: HttpUrl | None = None
    last_verified_at: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    active: bool = True


class AnnouncementIn(StrictModel):
    title: str = Field(min_length=2, max_length=140)
    message: str = Field(min_length=2, max_length=2000)
    type: Literal["info", "success", "warning", "critical"] = "info"
    audience: Literal["all", "free", "pro", "specific_users", "admins"] = "all"
    audience_user_ids: list[str] = Field(default_factory=list, max_length=500)
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    dismissible: bool = True
    active: bool = False
    confirmation: bool = False

    @field_validator("ends_at")
    @classmethod
    def validate_end(cls, value: datetime | None, info):
        start = info.data.get("starts_at")
        if value and start and value <= start:
            raise ValueError("La date de fin doit être postérieure au début.")
        return value


class FeatureFlagIn(StrictModel):
    key: str = Field(min_length=3, max_length=80, pattern=r"^[a-z][a-z0-9_]+$")
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=1000)
    enabled: bool = False
    rollout_percentage: int = Field(default=100, ge=0, le=100)
    audience: Literal["all", "admin_only", "specific_users", "plan"] = "all"
    audience_values: list[str] = Field(default_factory=list, max_length=500)
    confirmation: bool = False


class IncidentIn(StrictModel):
    severity: Literal["info", "warning", "error", "critical"]
    source: Literal["trading_sync", "emails", "atlas", "backtest", "api", "database", "auth"]
    message: str = Field(min_length=3, max_length=1000)
    error_code: str | None = Field(default=None, max_length=120)
    status: Literal["open", "investigating", "resolved", "ignored"] = "open"
    safe_metadata: dict[str, Any] = Field(default_factory=dict)


class IncidentStatusIn(StrictModel):
    status: Literal["open", "investigating", "resolved", "ignored"]


class AdminSettingIn(StrictModel):
    value: bool | int | str
    confirmation: bool = False


class ProductEventIn(StrictModel):
    event_name: str = Field(min_length=3, max_length=80, pattern=r"^[a-z][a-z0-9_.-]+$")
    feature: str = Field(min_length=2, max_length=80, pattern=r"^[a-z][a-z0-9_.-]+$")
    metadata: dict[str, Any] = Field(default_factory=dict)
