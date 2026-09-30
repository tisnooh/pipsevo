"""Provider abstraction for Atlas generated explanations.

The deterministic Atlas engine does not need an external provider.  When a
free Groq key is available, generated explanations use its OpenAI-compatible
API.  Anthropic remains supported for existing deployments, but is no longer
required for Atlas to answer.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
import os
from typing import Any

import requests


GROQ_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"


@dataclass(frozen=True)
class AtlasProviderConfig:
    provider: str
    api_key: str | None
    model: str
    timeout_seconds: int

    @classmethod
    def from_env(cls, environ: dict[str, str] | None = None) -> "AtlasProviderConfig":
        env = environ if environ is not None else os.environ
        requested = str(env.get("ATLAS_PROVIDER") or "auto").strip().lower()
        timeout = max(5, min(int(env.get("ATLAS_TIMEOUT_SECONDS") or "45"), 120))
        groq_key = str(env.get("ATLAS_GROQ_API_KEY") or "").strip() or None
        anthropic_key = str(
            env.get("ATLAS_ANTHROPIC_API_KEY") or env.get("EMERGENT_LLM_KEY") or ""
        ).strip() or None

        if requested == "groq":
            return cls(
                provider="groq" if groq_key else "deterministic",
                api_key=groq_key,
                model=str(env.get("ATLAS_GROQ_MODEL") or "openai/gpt-oss-20b").strip(),
                timeout_seconds=timeout,
            )
        if requested == "anthropic":
            return cls(
                provider="anthropic" if anthropic_key else "deterministic",
                api_key=anthropic_key,
                model=str(
                    env.get("ATLAS_ANTHROPIC_MODEL")
                    or env.get("ATLAS_MODEL")
                    or "claude-sonnet-4-6"
                ).strip(),
                timeout_seconds=timeout,
            )
        if groq_key:
            return cls(
                provider="groq",
                api_key=groq_key,
                model=str(env.get("ATLAS_GROQ_MODEL") or "openai/gpt-oss-20b").strip(),
                timeout_seconds=timeout,
            )
        if anthropic_key:
            return cls(
                provider="anthropic",
                api_key=anthropic_key,
                model=str(
                    env.get("ATLAS_ANTHROPIC_MODEL")
                    or env.get("ATLAS_MODEL")
                    or "claude-sonnet-4-6"
                ).strip(),
                timeout_seconds=timeout,
            )
        return cls(
            provider="deterministic",
            api_key=None,
            model="deterministic-coaching-v1",
            timeout_seconds=timeout,
        )


class AtlasProviderFailure(RuntimeError):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


def _groq_completion(config: AtlasProviderConfig, system: str, prompt: str) -> str:
    response = requests.post(
        GROQ_COMPLETIONS_URL,
        headers={
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": config.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_completion_tokens": 1200,
        },
        timeout=config.timeout_seconds,
    )
    if response.status_code in {401, 403}:
        raise AtlasProviderFailure("provider_auth", "La clé Groq a été refusée.")
    if response.status_code == 429:
        raise AtlasProviderFailure("rate_limit", "Le quota gratuit Groq est atteint.")
    if response.status_code >= 500:
        raise AtlasProviderFailure("unavailable", "Groq est temporairement indisponible.")
    if response.status_code >= 400:
        raise AtlasProviderFailure("provider_error", "Groq n'a pas pu traiter la demande.")
    try:
        payload: dict[str, Any] = response.json()
        answer = str(payload["choices"][0]["message"]["content"]).strip()
    except (KeyError, IndexError, TypeError, ValueError):
        answer = ""
    if not answer:
        raise AtlasProviderFailure("empty_response", "Groq a renvoyé une réponse vide.")
    return answer


def _anthropic_completion(config: AtlasProviderConfig, system: str, prompt: str) -> str:
    try:
        import anthropic
    except ImportError as exc:
        raise AtlasProviderFailure("not_configured", "Le SDK Anthropic n'est pas installé.") from exc
    client = anthropic.Anthropic(api_key=config.api_key)
    try:
        message = client.messages.create(
            model=config.model,
            max_tokens=1200,
            system=system,
            messages=[{"role": "user", "content": prompt}],
        )
    except anthropic.AuthenticationError as exc:
        raise AtlasProviderFailure("provider_auth", "La clé Anthropic a été refusée.") from exc
    except anthropic.RateLimitError as exc:
        raise AtlasProviderFailure("rate_limit", "Le quota Anthropic est atteint.") from exc
    except anthropic.APIConnectionError as exc:
        raise AtlasProviderFailure("unavailable", "Anthropic est temporairement indisponible.") from exc
    except anthropic.APIError as exc:
        raise AtlasProviderFailure("provider_error", "Anthropic n'a pas pu traiter la demande.") from exc
    answer = next(
        (block.text for block in message.content if getattr(block, "text", None)), ""
    ).strip()
    if not answer:
        raise AtlasProviderFailure("empty_response", "Anthropic a renvoyé une réponse vide.")
    return answer


async def generate_atlas_answer(
    config: AtlasProviderConfig,
    *,
    system: str,
    prompt: str,
) -> str:
    if config.provider == "groq":
        call = _groq_completion
    elif config.provider == "anthropic":
        call = _anthropic_completion
    else:
        raise AtlasProviderFailure("not_configured", "Aucun fournisseur génératif configuré.")
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(call, config, system, prompt),
            timeout=config.timeout_seconds + 2,
        )
    except asyncio.TimeoutError as exc:
        raise AtlasProviderFailure("unavailable", "Le fournisseur IA ne répond pas.") from exc
    except requests.RequestException as exc:
        raise AtlasProviderFailure("unavailable", "Le fournisseur IA ne répond pas.") from exc
