import asyncio
from datetime import datetime, timedelta, timezone

import pytest
from mongomock_motor import AsyncMongoMockClient

from admin.service import AdminService, visible_email_status
from email_service import email_configuration_status


@pytest.fixture
def smtp_configuration(monkeypatch):
    for name in (
        "EMAIL_PROVIDER", "RESEND_API_KEY", "EMAIL_FROM_ADDRESS", "AUTH_EMAIL_FROM",
        "NEWSLETTER_EMAIL_FROM", "SMTP_HOST", "SMTP_USERNAME", "SMTP_PASSWORD", "SMTP_PORT",
    ):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("EMAIL_PROVIDER", "smtp")
    monkeypatch.setenv("EMAIL_FROM_ADDRESS", "sender@gmail.com")
    monkeypatch.setenv("SMTP_USERNAME", "sender@gmail.com")
    monkeypatch.setenv("SMTP_PASSWORD", "fake-test-credential")


def test_configuration_presence_does_not_expose_secrets(smtp_configuration):
    assert email_configuration_status() == {"provider": "smtp", "configured": True}


@pytest.mark.parametrize("variable,value", [
    ("SMTP_USERNAME", ""), ("SMTP_PASSWORD", ""), ("SMTP_HOST", ""),
    ("SMTP_PORT", "bad"), ("SMTP_PORT", "0"), ("SMTP_PORT", "65536"),
    ("EMAIL_FROM_ADDRESS", "other@gmail.com"), ("EMAIL_PROVIDER", "unsupported"),
])
def test_selected_provider_requires_complete_configuration(smtp_configuration, monkeypatch, variable, value):
    monkeypatch.setenv(variable, value)
    # An unrelated Resend key must not hide a broken explicitly selected SMTP setup.
    monkeypatch.setenv("RESEND_API_KEY", "unrelated-test-key")
    assert email_configuration_status()["configured"] is False


def test_resend_is_checked_independently(smtp_configuration, monkeypatch):
    monkeypatch.setenv("EMAIL_PROVIDER", "resend")
    assert email_configuration_status() == {"provider": "resend", "configured": False}
    monkeypatch.setenv("RESEND_API_KEY", "test-key")
    assert email_configuration_status() == {"provider": "resend", "configured": True}


def test_interrupted_leases_are_not_displayed_as_active_sends():
    now = datetime.now(timezone.utc)
    assert visible_email_status({"status": "sending", "updated_at": now}, now) == "sending"
    assert visible_email_status({"status": "sending", "updated_at": now - timedelta(minutes=5)}, now) == "stalled"
    assert visible_email_status({"status": "sending", "updated_at": (now - timedelta(days=1)).replace(tzinfo=None)}, now) == "stalled"
    assert visible_email_status({"status": "sending", "created_at": now - timedelta(days=1)}, now) == "stalled"
    assert visible_email_status({"status": "sending", "updated_at": "invalid"}, now) == "stalled"
    assert visible_email_status({"status": "sending"}, now) == "stalled"
    assert visible_email_status({"status": "sent"}, now) == "sent"


def test_monitor_reports_lease_state_without_modifying_deliveries(smtp_configuration):
    database = AsyncMongoMockClient().email_monitor

    async def scenario():
        now = datetime.now(timezone.utc)
        await database.email_deliveries.insert_many([
            {"event": "account-welcome", "status": "sending", "updated_at": now - timedelta(days=1), "created_at": now},
            {"event": "account-welcome", "status": "sending", "updated_at": now, "created_at": now},
            {"event": "account-welcome", "status": "failed", "last_error": "provider_delivery_failed", "created_at": now},
            {"event": "account-welcome", "status": "delivered", "message_id": "private-id", "created_at": now},
        ])
        result = await AdminService(database, None, "https://pipsevo.example").email_monitor(1, 100, None)
        assert result["stalled_in_page"] == 1
        assert result["failed"] == 1
        assert result["provider_configured"] is True
        assert {item["status"] for item in result["items"]} == {"stalled", "sending", "failed", "sent"}
        assert all("message_id" not in item for item in result["items"])
        # Monitoring is read-only; the welcome endpoint alone owns retry claims.
        assert await database.email_deliveries.count_documents({"status": "sending"}) == 2
        assert await database.email_deliveries.count_documents({"status": "delivered"}) == 1

    asyncio.run(scenario())
