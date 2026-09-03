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
