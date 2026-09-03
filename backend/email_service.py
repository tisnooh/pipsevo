"""PipsEvo transactional and newsletter email primitives.

This module deliberately has no FastAPI or database dependency so templates,
signed links and provider calls can be tested independently.
"""

from __future__ import annotations

import html as html_lib
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

import jwt
import requests


RESEND_API_URL = "https://api.resend.com/emails"


class EmailConfigurationError(RuntimeError):
    """Raised when email delivery has not been configured on the server."""


class EmailDeliveryError(RuntimeError):
    """Raised when the provider rejects or cannot deliver an email request."""


def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def _token_secret() -> str:
    secret = os.environ.get("EMAIL_TOKEN_SECRET") or os.environ.get("JWT_SECRET")
    if not secret:
        raise EmailConfigurationError("EMAIL_TOKEN_SECRET is not configured")
    return secret


def issue_email_token(email: str, purpose: str, lifetime: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": email.strip().lower(),
        "purpose": purpose,
        "iat": now,
        "exp": now + lifetime,
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, _token_secret(), algorithm="HS256")


def decode_email_token(token: str, expected_purpose: str) -> str:
    payload = jwt.decode(token, _token_secret(), algorithms=["HS256"])
    if payload.get("purpose") != expected_purpose:
        raise jwt.InvalidTokenError("Unexpected email token purpose")
    email = str(payload.get("sub") or "").strip().lower()
    if not email or "@" not in email:
        raise jwt.InvalidTokenError("Email token has no valid subject")
    return email


def newsletter_links(email: str) -> Dict[str, str]:
    confirm_token = issue_email_token(email, "newsletter-confirm", timedelta(hours=24))
    # Keep unsubscribe links usable for the practical lifetime of archived mail.
    unsubscribe_token = issue_email_token(email, "newsletter-unsubscribe", timedelta(days=3650))
    return {
        "confirm": f"{_frontend_url()}/newsletter/confirm?token={confirm_token}",
        "unsubscribe": f"{_frontend_url()}/newsletter/unsubscribe?token={unsubscribe_token}",
        "one_click_unsubscribe": f"{os.environ.get('PUBLIC_API_URL', _frontend_url() + '/api').rstrip('/')}/newsletter/one-click-unsubscribe?token={unsubscribe_token}",
    }


def brand_email_html(
    *,
    preheader: str,
    title: str,
    intro: str,
    body: str,
    cta_label: Optional[str] = None,
    cta_url: Optional[str] = None,
    footer_note: Optional[str] = None,
    unsubscribe_url: Optional[str] = None,
) -> str:
    safe_preheader = html_lib.escape(preheader)
    safe_title = html_lib.escape(title)
    safe_intro = html_lib.escape(intro)
    safe_body = html_lib.escape(body).replace("\n", "<br>")
    cta = ""
    if cta_label and cta_url:
        cta = (
            '<tr><td style="padding:8px 32px 30px">'
            f'<a href="{html_lib.escape(cta_url, quote=True)}" '
            'style="display:inline-block;background:linear-gradient(135deg,#7C4DFF,#4F8CFF);'
            'color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">'
            f'{html_lib.escape(cta_label)}</a></td></tr>'
        )
    unsubscribe = ""
    if unsubscribe_url:
        unsubscribe = (
            '<br><a style="color:#818A9B" '
            f'href="{html_lib.escape(unsubscribe_url, quote=True)}">Se désinscrire</a>'
        )
    note = html_lib.escape(footer_note or "Message envoyé par PipsEvo.")
    return f"""<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>{safe_title}</title></head>
<body style="margin:0;background:#05070D;color:#F7F7FB;font-family:Inter,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">{safe_preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#05070D;padding:32px 14px">
<tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#0D1120;border:1px solid #242B46;border-radius:20px;overflow:hidden">
<tr><td style="padding:27px 32px;border-bottom:1px solid #20263D"><div style="font-size:24px;font-weight:800;letter-spacing:-.5px">Pips<span style="color:#6B72FF">Evo.</span></div></td></tr>
<tr><td style="padding:34px 32px 12px"><div style="color:#9E83FF;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">PipsEvo · Message officiel</div><h1 style="font-size:28px;line-height:1.2;margin:13px 0 14px">{safe_title}</h1><p style="font-size:16px;line-height:1.65;color:#C8CEDA;margin:0">{safe_intro}</p></td></tr>
<tr><td style="padding:12px 32px 24px"><p style="font-size:14px;line-height:1.7;color:#929BAC;margin:0">{safe_body}</p></td></tr>
{cta}
<tr><td style="padding:23px 32px;background:#090C16;border-top:1px solid #20263D"><p style="font-size:12px;line-height:1.65;color:#697284;margin:0">{note}{unsubscribe}</p></td></tr>
</table></td></tr></table></body></html>"""


def confirmation_email(email: str) -> Dict[str, object]:
    links = newsletter_links(email)
    return {
        "subject": "Confirme ton inscription à la newsletter PipsEvo",
        "html": brand_email_html(
            preheader="Une dernière étape pour recevoir les nouvelles PipsEvo.",
            title="Confirme ton adresse e-mail",
            intro="Tu as demandé à recevoir les analyses, guides et nouveautés PipsEvo.",
            body="Ce lien est personnel et valable pendant 24 heures. Si tu n’es pas à l’origine de cette demande, ignore simplement ce message.",
            cta_label="Confirmer mon inscription",
            cta_url=links["confirm"],
            footer_note="Tu ne seras abonné qu’après cette confirmation.",
        ),
        "text": f"Confirme ton inscription PipsEvo : {links['confirm']}\n\nCe lien expire dans 24 heures.",
    }


def welcome_email(email: str) -> Dict[str, object]:
    links = newsletter_links(email)
    return {
        "subject": "Bienvenue dans la newsletter PipsEvo",
        "html": brand_email_html(
            preheader="Ton abonnement PipsEvo est maintenant actif.",
            title="Bienvenue chez PipsEvo",
            intro="Ton adresse est confirmée. Tu recevras désormais nos contenus utiles pour mieux piloter tes comptes financés.",
            body="Pas de bruit inutile : uniquement des guides, des améliorations produit et des contenus liés à la discipline et au risque.",
            cta_label="Ouvrir PipsEvo",
            cta_url=_frontend_url(),
            unsubscribe_url=links["unsubscribe"],
        ),
        "text": f"Bienvenue chez PipsEvo. Ton abonnement est actif.\n\nSe désinscrire : {links['unsubscribe']}",
        "unsubscribe_url": links["unsubscribe"],
        "one_click_unsubscribe": links["one_click_unsubscribe"],
    }


def send_email(
    *,
    to: str,
    subject: str,
    html: str,
    text: str,
    category: str = "transactional",
    idempotency_key: Optional[str] = None,
    unsubscribe_url: Optional[str] = None,
    one_click_unsubscribe: Optional[str] = None,
) -> str:
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        raise EmailConfigurationError("RESEND_API_KEY is not configured")

    sender_key = "NEWSLETTER_EMAIL_FROM" if category == "marketing" else "AUTH_EMAIL_FROM"
    sender = os.environ.get(sender_key)
    if not sender:
        raise EmailConfigurationError(f"{sender_key} is not configured")

    provider_headers = {}
    if unsubscribe_url:
        provider_headers["List-Unsubscribe"] = f"<{unsubscribe_url}>"
    if one_click_unsubscribe:
        provider_headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"

    payload = {
        "from": sender,
        "to": [to],
        "subject": subject,
        "html": html,
        "text": text,
    }
    reply_to = os.environ.get("EMAIL_REPLY_TO")
    if reply_to:
        payload["reply_to"] = reply_to
    if provider_headers:
        payload["headers"] = provider_headers

    request_headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if idempotency_key:
        request_headers["Idempotency-Key"] = idempotency_key[:256]

    try:
        response = requests.post(
            RESEND_API_URL,
            headers=request_headers,
            json=payload,
            timeout=15,
        )
    except requests.RequestException as exc:
        raise EmailDeliveryError("Email provider is unreachable") from exc
    if response.status_code >= 400:
        raise EmailDeliveryError(f"Email provider rejected the request ({response.status_code})")
    message_id = response.json().get("id")
    if not message_id:
        raise EmailDeliveryError("Email provider returned no message id")
    return str(message_id)
