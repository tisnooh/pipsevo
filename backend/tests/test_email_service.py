from datetime import timedelta

import jwt
import pytest

import email_service


def configure(monkeypatch):
    monkeypatch.setenv("EMAIL_TOKEN_SECRET", "test-secret-that-is-long-enough-for-hs256")
    monkeypatch.setenv("FRONTEND_URL", "https://pipsevo.example")
    monkeypatch.setenv("PUBLIC_API_URL", "https://api.pipsevo.example/api")


def test_email_token_is_scoped_to_its_purpose(monkeypatch):
    configure(monkeypatch)
    token = email_service.issue_email_token(" Trader@Example.COM ", "newsletter-confirm", timedelta(minutes=5))
    assert email_service.decode_email_token(token, "newsletter-confirm") == "trader@example.com"
    with pytest.raises(jwt.InvalidTokenError):
        email_service.decode_email_token(token, "newsletter-unsubscribe")


def test_branded_template_escapes_user_visible_content():
    rendered = email_service.brand_email_html(
        preheader="hello",
        title="<script>alert(1)</script>",
        intro="safe",
        body="line 1\nline 2",
        cta_label="Open",
        cta_url="https://example.com/?a=1&b=2",
    )
    assert "<script>" not in rendered
    assert "&lt;script&gt;" in rendered
    assert "line 1<br>line 2" in rendered
    assert "a=1&amp;b=2" in rendered
    assert "pipsevo-logo.png" in rendered


def test_welcome_email_contains_unsubscribe_links(monkeypatch):
    configure(monkeypatch)
    message = email_service.welcome_email("trader@example.com")
    assert "/newsletter/unsubscribe?token=" in message["unsubscribe_url"]
    assert "/newsletter/one-click-unsubscribe?token=" in message["one_click_unsubscribe"]
    assert "Se désinscrire" in message["html"]


def test_send_email_uses_marketing_sender_and_list_headers(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test")
    monkeypatch.setenv("NEWSLETTER_EMAIL_FROM", "PipsEvo <news@example.com>")
    captured = {}

    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {"id": "email_123"}

    def fake_post(url, **kwargs):
        captured.update({"url": url, **kwargs})
        return FakeResponse()

    monkeypatch.setattr(email_service.requests, "post", fake_post)
    message_id = email_service.send_email(
        to="trader@example.com",
        subject="PipsEvo",
        html="<p>Hello</p>",
        text="Hello",
        category="marketing",
        idempotency_key="campaign-1",
        unsubscribe_url="https://example.com/unsubscribe",
        one_click_unsubscribe="https://api.example.com/unsubscribe",
    )
    assert message_id == "email_123"
    assert captured["json"]["from"] == "PipsEvo <news@example.com>"
    assert captured["json"]["headers"]["List-Unsubscribe-Post"] == "List-Unsubscribe=One-Click"
    assert captured["headers"]["Idempotency-Key"] == "campaign-1"


def test_english_support_receipt_does_not_mix_languages(monkeypatch):
    configure(monkeypatch)
    message = email_service.support_receipt_email(
        request_id="PE-20260906-ABC12345",
        name="Alex",
        subject="Import issue",
        locale="en",
    )
    assert "Your request has been received" in message["html"]
    assert "Ta demande" not in message["html"]
    assert 'lang="en"' in message["html"]


def test_smtp_sender_and_reply_to_are_centralized(monkeypatch):
    monkeypatch.setenv("EMAIL_PROVIDER", "smtp")
    monkeypatch.setenv("EMAIL_FROM_NAME", "PipsEvo")
    monkeypatch.setenv("EMAIL_FROM_ADDRESS", "tyachatfr@gmail.com")
    monkeypatch.setenv("SMTP_USERNAME", "tyachatfr@gmail.com")
    monkeypatch.setenv("SMTP_PASSWORD", "app-password")
    captured = {}

    class FakeSmtp:
        def __init__(self, host, port, timeout):
            captured.update(host=host, port=port, timeout=timeout)

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def ehlo(self):
            pass

        def starttls(self, context):
            captured["tls"] = context is not None

        def login(self, username, password):
            captured.update(username=username, password=password)

        def send_message(self, message):
            captured["message"] = message

    monkeypatch.setattr(email_service.smtplib, "SMTP", FakeSmtp)
    message_id = email_service.send_email(
        to="trader@example.com",
        subject="Support",
        html="<p>Hello</p>",
        text="Hello",
        reply_to="visitor@example.com",
        idempotency_key="support-123",
    )
    assert message_id.startswith("smtp:")
    assert captured["tls"] is True
    assert captured["message"]["From"] == "PipsEvo <tyachatfr@gmail.com>"
    assert captured["message"]["Reply-To"] == "visitor@example.com"


def test_gmail_smtp_rejects_an_unverified_from_address(monkeypatch):
    monkeypatch.setenv("EMAIL_PROVIDER", "smtp")
    monkeypatch.setenv("EMAIL_FROM_ADDRESS", "support@pipsevo.com")
    monkeypatch.setenv("SMTP_USERNAME", "tyachatfr@gmail.com")
    monkeypatch.setenv("SMTP_PASSWORD", "app-password")
    with pytest.raises(email_service.EmailConfigurationError, match="must match"):
        email_service.send_email(
            to="trader@example.com",
            subject="Support",
            html="<p>Hello</p>",
            text="Hello",
        )
