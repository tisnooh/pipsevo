"""Explicit browser origins; CORS does not replace bearer authentication."""

import ipaddress
import re
from urllib.parse import urlsplit

DEFAULT_FRONTEND_ORIGIN = "https://pipsevo.vercel.app"


def _origin(value: str):
    value = value.strip()
    if not value or "*" in value or any(char.isspace() for char in value):
        return None
    try:
        parsed = urlsplit(value)
        host = parsed.hostname
        port = parsed.port
        if (
            parsed.scheme not in {"http", "https"}
            or not host
            or parsed.username is not None
            or parsed.password is not None
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
            or port == 0
        ):
            return None
        try:
            ipaddress.ip_address(host)
        except ValueError:
            if not re.fullmatch(r"[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?", host):
                return None
        if parsed.scheme == "http" and host not in {"localhost", "127.0.0.1", "::1"}:
            return None
        normalized_host = f"[{host}]" if ":" in host else host
        default_port = 443 if parsed.scheme == "https" else 80
        suffix = f":{port}" if port is not None and port != default_port else ""
        return f"{parsed.scheme}://{normalized_host}{suffix}"
    except (TypeError, ValueError):
        return None


def build_cors_origins(configured: str = "", frontend_url: str = ""):
    """Drop wildcard/malformed origins; fall back to the legitimate frontend.

    Local development origins require an explicit CORS_ORIGINS entry. A missing
    or legacy '*' setting never makes every website an authorized browser origin.
    """
    origins = []
    for value in configured.split(","):
        candidate = _origin(value)
        if candidate and candidate not in origins:
            origins.append(candidate)
    return origins or [_origin(frontend_url) or DEFAULT_FRONTEND_ORIGIN]
