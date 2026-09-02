from __future__ import annotations

import asyncio
from typing import Any

import requests

from ..errors import IntegrationError


async def request_json(
    method: str,
    url: str,
    *,
    timeout: int = 30,
    expected: tuple[int, ...] = (200,),
    provider_authentication: bool = False,
    **kwargs: Any,
) -> Any:
    try:
        response = await asyncio.to_thread(
            requests.request, method, url, timeout=timeout, **kwargs
        )
    except requests.RequestException as exc:
        raise IntegrationError(
            "provider_unavailable",
            "Le fournisseur ne répond pas pour le moment.",
            503,
        ) from exc
    if response.status_code not in expected:
        if response.status_code in (401, 403):
            code, status = (
                ("provider_not_configured", 503)
                if provider_authentication
                else ("invalid_credentials", 401)
            )
        elif response.status_code == 429:
            code, status = "rate_limit", 429
        elif response.status_code >= 500:
            code, status = "provider_unavailable", 503
        else:
            code, status = "provider_request_rejected", 400
        raise IntegrationError(
            code,
            "La connexion automatique est temporairement indisponible côté serveur."
            if code == "provider_not_configured"
            else "L’autorisation a été refusée par la plateforme. Vérifie les accès puis réessaie."
            if code == "invalid_credentials"
            else (
                "La synchronisation est temporairement ralentie. PipsEvo réessaiera automatiquement."
                if code == "rate_limit"
                else "La plateforme a refusé la requête de synchronisation."
            ),
            status,
        )
    if not response.content:
        return None
    try:
        return response.json()
    except ValueError as exc:
        raise IntegrationError(
            "provider_invalid_response",
            "La plateforme a renvoyé une réponse inexploitable.",
            502,
        ) from exc
