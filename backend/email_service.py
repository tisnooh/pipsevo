"""PipsEvo transactional and newsletter email primitives."""

from __future__ import annotations

import hashlib
import html as html_lib
import os
import smtplib
import ssl
import uuid
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from typing import Any, Dict, Literal, Optional

import jwt
import requests

RESEND_API_URL = "https://api.resend.com/emails"
Locale = Literal["fr", "en"]


class EmailConfigurationError(RuntimeError):
    """Raised when email delivery has not been configured on the server."""


class EmailDeliveryError(RuntimeError):
    """Raised when the provider rejects or cannot deliver an email request."""


def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")


def _public_api_url() -> str:
    return os.environ.get("PUBLIC_API_URL", f"{_frontend_url()}/api").rstrip("/")


def _token_secret() -> str:
    secret = os.environ.get("EMAIL_TOKEN_SECRET") or os.environ.get("JWT_SECRET")
    if not secret:
        raise EmailConfigurationError("EMAIL_TOKEN_SECRET is not configured")
    return secret


def _locale(value: str | None) -> Locale:
    return "en" if value == "en" else "fr"


def _sender() -> tuple[str, str]:
    name = os.environ.get("EMAIL_FROM_NAME", "PipsEvo").strip() or "PipsEvo"
    address = os.environ.get("EMAIL_FROM_ADDRESS", "").strip()
    if not address:
        # Compatibility for an existing Resend setup during migration.
        legacy = os.environ.get("AUTH_EMAIL_FROM") or os.environ.get("NEWSLETTER_EMAIL_FROM") or ""
        if "<" in legacy and legacy.endswith(">"):
            legacy_name, legacy_address = legacy.rsplit("<", 1)
            name = legacy_name.strip() or name
            address = legacy_address[:-1].strip()
        else:
            address = legacy.strip()
    if not address or "@" not in address:
        raise EmailConfigurationError("EMAIL_FROM_ADDRESS is not configured")
    return name, address


def issue_email_token(email: str, purpose: str, lifetime: timedelta) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": email.strip().lower(), "purpose": purpose, "iat": now,
        "exp": now + lifetime, "jti": str(uuid.uuid4()),
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
    unsubscribe_token = issue_email_token(email, "newsletter-unsubscribe", timedelta(days=3650))
    return {
        "confirm": f"{_frontend_url()}/newsletter/confirm?token={confirm_token}",
        "unsubscribe": f"{_frontend_url()}/newsletter/unsubscribe?token={unsubscribe_token}",
        "one_click_unsubscribe": f"{_public_api_url()}/newsletter/one-click-unsubscribe?token={unsubscribe_token}",
    }


def brand_email_html(
    *, preheader: str, title: str, intro: str, body: str,
    cta_label: Optional[str] = None, cta_url: Optional[str] = None,
    footer_note: Optional[str] = None, unsubscribe_url: Optional[str] = None,
    locale: Locale = "fr",
) -> str:
    language = _locale(locale)
    safe_preheader = html_lib.escape(preheader)
    safe_title = html_lib.escape(title)
    safe_intro = html_lib.escape(intro)
    safe_body = html_lib.escape(body).replace("\n", "<br>")
    logo_url = html_lib.escape(os.environ.get("EMAIL_LOGO_URL", f"{_frontend_url()}/brand/pipsevo-logo.png"), quote=True)
    cta = ""
    fallback = ""
    if cta_label and cta_url:
        safe_url = html_lib.escape(cta_url, quote=True)
        fallback_label = "If the button does not work, copy this link:" if language == "en" else "Si le bouton ne fonctionne pas, copie ce lien :"
        cta = ('<tr><td style="padding:8px 32px 22px">'
               f'<a href="{safe_url}" style="display:inline-block;background:#7657FF;color:#fff;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">{html_lib.escape(cta_label)}</a></td></tr>')
        fallback = ('<tr><td style="padding:0 32px 28px">'
                    f'<p style="font-size:11px;line-height:1.6;color:#6F788A;margin:0">{fallback_label}<br><a href="{safe_url}" style="color:#9E83FF;word-break:break-all">{safe_url}</a></p></td></tr>')
    unsubscribe = ""
    if unsubscribe_url:
        label = "Unsubscribe" if language == "en" else "Se désinscrire"
        unsubscribe = f'<br><a style="color:#818A9B" href="{html_lib.escape(unsubscribe_url, quote=True)}">{label}</a>'
    note = html_lib.escape(footer_note or ("Official message sent by PipsEvo." if language == "en" else "Message officiel envoyé par PipsEvo."))
    eyebrow = "PipsEvo · Official message" if language == "en" else "PipsEvo · Message officiel"
    return f"""<!doctype html>
<html lang="{language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{safe_title}</title></head>
<body style="margin:0;background:#05070D;color:#F7F7FB;font-family:Inter,Arial,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">{safe_preheader}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#05070D;padding:32px 14px"><tr><td align="center">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#0D1120;border:1px solid #242B46;border-radius:20px;overflow:hidden">
<tr><td style="padding:25px 32px;border-bottom:1px solid #20263D"><img src="{logo_url}" width="160" alt="PipsEvo" style="display:block;width:160px;max-width:100%;height:auto;border:0"></td></tr>
<tr><td style="padding:34px 32px 12px"><div style="color:#9E83FF;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase">{eyebrow}</div><h1 style="font-size:28px;line-height:1.2;margin:13px 0 14px;color:#F7F7FB">{safe_title}</h1><p style="font-size:16px;line-height:1.65;color:#C8CEDA;margin:0">{safe_intro}</p></td></tr>
<tr><td style="padding:12px 32px 24px"><p style="font-size:14px;line-height:1.7;color:#929BAC;margin:0">{safe_body}</p></td></tr>
{cta}{fallback}
<tr><td style="padding:23px 32px;background:#090C16;border-top:1px solid #20263D"><p style="font-size:12px;line-height:1.65;color:#697284;margin:0">{note}{unsubscribe}</p></td></tr>
</table></td></tr></table></body></html>"""


def confirmation_email(email: str, locale: Locale = "fr") -> Dict[str, object]:
    language = _locale(locale)
    links = newsletter_links(email)
    copy = ({
        "subject": "Confirm your PipsEvo newsletter subscription", "preheader": "One last step to receive PipsEvo updates.",
        "title": "Confirm your email address", "intro": "You asked to receive PipsEvo analysis, guides, and product news.",
        "body": "This personal link is valid for 24 hours. If you did not make this request, simply ignore this message.",
        "cta": "Confirm my subscription", "footer": "You will only be subscribed after this confirmation.",
    } if language == "en" else {
        "subject": "Confirme ton inscription à la newsletter PipsEvo", "preheader": "Une dernière étape pour recevoir les nouvelles PipsEvo.",
        "title": "Confirme ton adresse e-mail", "intro": "Tu as demandé à recevoir les analyses, guides et nouveautés PipsEvo.",
        "body": "Ce lien est personnel et valable pendant 24 heures. Si tu n’es pas à l’origine de cette demande, ignore simplement ce message.",
        "cta": "Confirmer mon inscription", "footer": "Tu ne seras abonné qu’après cette confirmation.",
    })
    return {
        "subject": copy["subject"],
        "html": brand_email_html(preheader=copy["preheader"], title=copy["title"], intro=copy["intro"], body=copy["body"], cta_label=copy["cta"], cta_url=links["confirm"], footer_note=copy["footer"], locale=language),
        "text": f"{copy['title']}\n\n{copy['intro']}\n\n{copy['cta']}: {links['confirm']}",
    }


def welcome_email(email: str, locale: Locale = "fr", *, marketing: bool = True) -> Dict[str, object]:
    language = _locale(locale)
    links = newsletter_links(email) if marketing else {}
    if language == "en":
        title, intro = "Welcome to PipsEvo", "Your PipsEvo workspace is ready."
        body, cta = "You can now add your funded accounts, structure your trading journal, and review your discipline from one place.", "Open my workspace"
    else:
        title, intro = "Bienvenue chez PipsEvo", "Ton espace PipsEvo est prêt."
        body, cta = "Tu peux maintenant ajouter tes comptes financés, structurer ton journal et suivre ta discipline depuis un seul espace.", "Ouvrir mon espace"
    unsubscribe_url = links.get("unsubscribe")
    return {
        "subject": title,
        "html": brand_email_html(preheader=intro, title=title, intro=intro, body=body, cta_label=cta, cta_url=f"{_frontend_url()}/app/dashboard", unsubscribe_url=unsubscribe_url, locale=language),
        "text": f"{title}\n\n{body}\n\n{cta}: {_frontend_url()}/app/dashboard" + (f"\n\n{'Unsubscribe' if language == 'en' else 'Se désinscrire'}: {unsubscribe_url}" if unsubscribe_url else ""),
        "unsubscribe_url": unsubscribe_url,
        "one_click_unsubscribe": links.get("one_click_unsubscribe"),
    }


def support_notification_email(*, request_id: str, name: str, email: str, category: str, subject: str, message: str) -> Dict[str, str]:
    body = f"Référence : {request_id}\nNom : {name}\nE-mail : {email}\nCatégorie : {category}\n\nMessage :\n{message}"
    return {
        "subject": f"[Support PipsEvo] {category} · {subject}",
        "html": brand_email_html(preheader=f"Nouvelle demande support {request_id}", title="Nouvelle demande support", intro=f"{name} a envoyé une demande depuis PipsEvo.", body=body, footer_note="Réponds directement à cet e-mail pour contacter l’utilisateur.", locale="fr"),
        "text": body,
    }


def support_receipt_email(*, request_id: str, name: str, subject: str, locale: Locale = "fr") -> Dict[str, str]:
    language = _locale(locale)
    copy = ({
        "subject": f"We received your PipsEvo request · {request_id}", "title": "Your request has been received",
        "intro": f"Hello {name}, our support team has received your message.",
        "body": f"Subject: {subject}\nReference: {request_id}\n\nKeep this reference if you need to follow up. We usually reply within one to two business days.",
        "cta": "Open the Help Center",
    } if language == "en" else {
        "subject": f"Nous avons reçu ta demande PipsEvo · {request_id}", "title": "Ta demande a bien été reçue",
        "intro": f"Bonjour {name}, notre équipe support a reçu ton message.",
        "body": f"Sujet : {subject}\nRéférence : {request_id}\n\nConserve cette référence si tu dois nous recontacter. Nous répondons habituellement sous un à deux jours ouvrés.",
        "cta": "Ouvrir le centre d’aide",
    })
    return {
        "subject": copy["subject"],
        "html": brand_email_html(preheader=copy["title"], title=copy["title"], intro=copy["intro"], body=copy["body"], cta_label=copy["cta"], cta_url=f"{_frontend_url()}/help", locale=language),
        "text": f"{copy['title']}\n\n{copy['intro']}\n\n{copy['body']}",
    }


def _email_provider() -> str:
    provider = os.environ.get("EMAIL_PROVIDER", "").strip().lower()
    return provider or ("resend" if os.environ.get("RESEND_API_KEY") else "smtp")


def _send_with_smtp(*, to: str, subject: str, html: str, text: str, reply_to: Optional[str], provider_headers: Dict[str, str], idempotency_key: Optional[str]) -> str:
    host = os.environ.get("SMTP_HOST", "smtp.gmail.com").strip()
    try:
        port = int(os.environ.get("SMTP_PORT", "587"))
    except ValueError as exc:
        raise EmailConfigurationError("SMTP_PORT must be an integer") from exc
    username = os.environ.get("SMTP_USERNAME", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "")
    if not username or not password:
        raise EmailConfigurationError("SMTP_USERNAME and SMTP_PASSWORD are not configured")
    sender_name, sender_address = _sender()
    if host.lower() == "smtp.gmail.com" and sender_address.lower() != username.lower():
        raise EmailConfigurationError("Gmail SMTP sender must match SMTP_USERNAME")
    message = EmailMessage()
    message["From"] = formataddr((sender_name, sender_address))
    message["To"], message["Subject"] = to, subject
    message["Reply-To"] = reply_to or os.environ.get("EMAIL_REPLY_TO") or sender_address
    stable_id = hashlib.sha256((idempotency_key or str(uuid.uuid4())).encode()).hexdigest()[:32]
    message["Message-ID"] = make_msgid(idstring=stable_id, domain=sender_address.split("@", 1)[1])
    for key, value in provider_headers.items():
        message[key] = value
    message.set_content(text)
    message.add_alternative(html, subtype="html")
    try:
        with smtplib.SMTP(host, port, timeout=20) as smtp:
            smtp.ehlo()
            if os.environ.get("SMTP_USE_TLS", "true").lower() != "false":
                smtp.starttls(context=ssl.create_default_context())
                smtp.ehlo()
            smtp.login(username, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise EmailDeliveryError("SMTP provider rejected or could not deliver the email") from exc
    return f"smtp:{stable_id}"


def _send_with_resend(*, to: str, subject: str, html: str, text: str, reply_to: Optional[str], provider_headers: Dict[str, str], idempotency_key: Optional[str]) -> str:
    api_key = os.environ.get("RESEND_API_KEY")
    if not api_key:
        raise EmailConfigurationError("RESEND_API_KEY is not configured")
    sender_name, sender_address = _sender()
    payload: Dict[str, Any] = {"from": formataddr((sender_name, sender_address)), "to": [to], "subject": subject, "html": html, "text": text}
    effective_reply_to = reply_to or os.environ.get("EMAIL_REPLY_TO")
    if effective_reply_to:
        payload["reply_to"] = effective_reply_to
    if provider_headers:
        payload["headers"] = provider_headers
    request_headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    if idempotency_key:
        request_headers["Idempotency-Key"] = idempotency_key[:256]
    try:
        response = requests.post(RESEND_API_URL, headers=request_headers, json=payload, timeout=15)
    except requests.RequestException as exc:
        raise EmailDeliveryError("Email provider is unreachable") from exc
    if response.status_code >= 400:
        raise EmailDeliveryError(f"Email provider rejected the request ({response.status_code})")
    message_id = response.json().get("id")
    if not message_id:
        raise EmailDeliveryError("Email provider returned no message id")
    return str(message_id)


def send_email(*, to: str, subject: str, html: str, text: str, category: str = "transactional", idempotency_key: Optional[str] = None, unsubscribe_url: Optional[str] = None, one_click_unsubscribe: Optional[str] = None, reply_to: Optional[str] = None) -> str:
    del category  # Sender identity is centralized for the temporary Gmail setup.
    provider_headers: Dict[str, str] = {}
    if unsubscribe_url:
        provider_headers["List-Unsubscribe"] = f"<{unsubscribe_url}>"
    if one_click_unsubscribe:
        provider_headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click"
    provider = _email_provider()
    if provider == "smtp":
        return _send_with_smtp(to=to, subject=subject, html=html, text=text, reply_to=reply_to, provider_headers=provider_headers, idempotency_key=idempotency_key)
    if provider == "resend":
        return _send_with_resend(to=to, subject=subject, html=html, text=text, reply_to=reply_to, provider_headers=provider_headers, idempotency_key=idempotency_key)
    raise EmailConfigurationError(f"Unsupported EMAIL_PROVIDER: {provider}")
