import asyncio

import pytest

from atlas_provider import (
    AtlasProviderConfig,
    AtlasProviderFailure,
    generate_atlas_answer,
)


class FakeResponse:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


def test_provider_prefers_free_groq_key_in_auto_mode():
    config = AtlasProviderConfig.from_env({
        "ATLAS_GROQ_API_KEY": "groq-test",
        "ATLAS_ANTHROPIC_API_KEY": "anthropic-test",
    })

    assert config.provider == "groq"
    assert config.model == "openai/gpt-oss-20b"


def test_provider_uses_free_deterministic_mode_without_any_key():
    config = AtlasProviderConfig.from_env({})

    assert config.provider == "deterministic"
    assert config.api_key is None
    assert config.model == "deterministic-coaching-v1"


def test_groq_generation_uses_openai_compatible_response(monkeypatch):
    captured = {}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured["json"] = kwargs["json"]
        captured["authorization"] = kwargs["headers"]["Authorization"]
        return FakeResponse(200, {"choices": [{"message": {"content": "Analyse gratuite prête"}}]})

    monkeypatch.setattr("atlas_provider.requests.post", fake_post)
    config = AtlasProviderConfig.from_env({"ATLAS_PROVIDER": "groq", "ATLAS_GROQ_API_KEY": "secret"})

    answer = asyncio.run(generate_atlas_answer(config, system="Règles", prompt="Analyse"))

    assert answer == "Analyse gratuite prête"
    assert captured["url"].endswith("/chat/completions")
    assert captured["authorization"] == "Bearer secret"
    assert captured["json"]["model"] == "openai/gpt-oss-20b"


def test_groq_rate_limit_is_normalized_for_deterministic_fallback(monkeypatch):
    monkeypatch.setattr(
        "atlas_provider.requests.post",
        lambda *args, **kwargs: FakeResponse(429),
    )
    config = AtlasProviderConfig.from_env({"ATLAS_PROVIDER": "groq", "ATLAS_GROQ_API_KEY": "secret"})

    with pytest.raises(AtlasProviderFailure) as caught:
        asyncio.run(generate_atlas_answer(config, system="Règles", prompt="Analyse"))

    assert caught.value.code == "rate_limit"
