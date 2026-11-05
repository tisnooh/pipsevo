import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from release_preflight import check_runtime


SITE = "https://pipsevo.vercel.app"


def test_render_attests_only_reviewable_revision_after_readonly_ping():
    db = SimpleNamespace(command=AsyncMock(return_value={"ok": 1}))
    env = {"RENDER": "true", "RENDER_GIT_COMMIT": "a" * 40, "MONGO_URL": "must-not-be-exposed"}
    assert asyncio.run(check_runtime(db, env, private_gateway_configured=True, allowed_origins=[SITE])) == {
        "commit": "a" * 40, "startup_database_check": "passed",
    }
    db.command.assert_awaited_once_with("ping")
    env["RENDER_GIT_COMMIT"] = "invalid / private value"
    assert "commit" not in asyncio.run(check_runtime(db, env, private_gateway_configured=True, allowed_origins=[SITE]))


@pytest.mark.parametrize("gateway,origins", [(False, [SITE]), (True, ["https://other.example"])])
def test_incomplete_hosted_config_fails_before_any_database_action(gateway, origins):
    db = SimpleNamespace(command=AsyncMock())
    with pytest.raises(RuntimeError):
        asyncio.run(check_runtime(db, {"RENDER": "true"}, private_gateway_configured=gateway, allowed_origins=origins))
    db.command.assert_not_awaited()


def test_incompatible_or_unavailable_database_is_not_reported_ready():
    db = SimpleNamespace(command=AsyncMock(side_effect=RuntimeError("unavailable")))
    with pytest.raises(RuntimeError):
        asyncio.run(check_runtime(db, {"RENDER": "true"}, private_gateway_configured=True, allowed_origins=[SITE]))
