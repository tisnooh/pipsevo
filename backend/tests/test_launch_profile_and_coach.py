import asyncio
import os
import types

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from mongomock_motor import AsyncMongoMockClient

os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "pipsevo_test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

import server


def test_profile_read_does_not_reflect_bearer_or_password_hash():
    result = asyncio.run(server.me({"id": "user", "name": "Alex", "_supabase_token": "private", "password_hash": "private-hash"}))
    assert result == {"id": "user", "name": "Alex"}


def test_profile_and_onboarding_write_canonical_owned_profile(monkeypatch):
    captured = []
    def patch(url, **kwargs):
        captured.append((url, kwargs))
        return types.SimpleNamespace(status_code=200, json=lambda: [{"id": "user", **kwargs["json"]}])
    monkeypatch.setattr(server.requests, "patch", patch)
    user = {"id": "user", "_supabase_token": "user-token"}
    result = asyncio.run(server.update_profile(server.ProfileIn(name="  Alex ", rules={"max_trades": 2}), user))
    assert result["name"] == "Alex"
    asyncio.run(server.save_onboarding(server.OnboardingIn(trader_type="futures", prop_firms=["Topstep"], num_accounts=1, rules={}), user))
    assert len(captured) == 2
    assert all(row[1]["params"] == {"id": "eq.user"} for row in captured)
    assert all(row[1]["headers"]["Authorization"] == "Bearer user-token" for row in captured)
    assert captured[1][1]["json"]["onboarding_completed"] is True
    assert "role" not in captured[0][1]["json"]


def test_failed_profile_save_never_returns_false_success(monkeypatch):
    monkeypatch.setattr(server.requests, "patch", lambda *_args, **_kwargs: types.SimpleNamespace(status_code=403))
    with pytest.raises(HTTPException) as caught:
        asyncio.run(server.update_profile(server.ProfileIn(name="Alex"), {"id": "user", "_supabase_token": "user-token"}))
    assert caught.value.status_code == 502


@pytest.mark.parametrize("rows", [[{"id": "other"}], [{"id": "user"}, {"id": "other"}], [None], {"id": "user"}, []])
def test_profile_save_rejects_foreign_multiple_or_empty_canonical_responses(monkeypatch, rows):
    monkeypatch.setattr(server.requests, "patch", lambda *_args, **_kwargs: types.SimpleNamespace(status_code=200, json=lambda: rows))
    with pytest.raises(HTTPException) as caught:
        asyncio.run(server.update_profile(server.ProfileIn(name="Alex"), {"id": "user", "_supabase_token": "user-token"}))
    assert caught.value.status_code == (404 if rows == [] else 502)


def test_coach_history_uses_same_canonical_store_as_analysis(monkeypatch):
    captured = {}
    async def select(table, token, params):
        captured.update(table=table, token=token, params=params)
        return [{"id": "report", "answer": "Measured process review"}]
    monkeypatch.setattr(server, "supabase_select", select)
    result = asyncio.run(server.coach_history({"id": "user", "_supabase_token": "user-token"}))
    assert result[0]["id"] == "report"
    assert captured["table"] == "ai_reports"
    assert captured["params"]["user_id"] == "eq.user"
    assert captured["params"]["order"] == "created_at.desc"


def test_profile_and_readiness_models_reject_invalid_inputs():
    with pytest.raises(ValidationError):
        server.ProfileIn(name="   ")
    for field in ("entry", "stop", "take_profit", "planned_risk_amount"):
        with pytest.raises(ValidationError):
            server.PreTradeReadinessIn(account_id="account", local_date="2026-10-10", **{field: float("nan")})
    with pytest.raises(ValidationError):
        server.OnboardingIn(trader_type="fake", prop_firms=[], num_accounts=-1, rules={})


def test_owned_trade_older_than_summary_window_is_reviewable(monkeypatch):
    database = AsyncMongoMockClient().old_trade_review
    monkeypatch.setattr(server, "db", database)
    async def enabled(*_args):
        return True
    async def select(table, _token, params):
        if table == "trades":
            return [{"id": "old-trade", "user_id": "user", "pnl": 20, "date": "2025-01-01", "instrument": "EURUSD"}] if "id" in params else [{"id": "recent-trade", "user_id": "user", "pnl": 10, "date": "2026-10-10"}] if params.get("offset") == "0" else []
        return []
    async def persist(_table, _token, report):
        return report
    async def reserve(*_args):
        pass
    monkeypatch.setattr(server.admin_service, "feature_enabled", enabled)
    monkeypatch.setattr(server, "supabase_select", select)
    monkeypatch.setattr(server, "supabase_insert", persist)
    monkeypatch.setattr(server, "reserve_analysis", reserve)
    monkeypatch.setattr(server, "ATLAS_PROVIDER_CONFIG", types.SimpleNamespace(provider="deterministic", model="deterministic-coaching-v1"))
    result = asyncio.run(server.coach_ask(server.CoachQuery(question="Relis ce trade", trade_id="old-trade"), {"id": "user", "_supabase_token": "token"}))
    assert result["evidence"][0]["trade_id"] == "old-trade"
    assert "EURUSD" in result["answer"]


def test_trading_dna_uses_canonical_measured_data_without_guessing_missing_profit(monkeypatch):
    async def select(table, _token, params):
        assert params["user_id"] == "eq.user"
        return [{"id": "unknown-result", "user_id": "user", "pnl": None, "setup": "FVG", "session": "NY"}] if table == "trades" and params.get("offset") == "0" else []
    monkeypatch.setattr(server, "supabase_select", select)
    result = asyncio.run(server.trading_dna({"id": "user", "_supabase_token": "token"}))
    assert result["trader_type"] == "Untested"
    assert result["best_setup"] is None
    assert result["best_session"] is None
    assert result["measured_trades"] == 0


def test_atlas_reads_complete_history_and_native_units_from_owned_metadata(monkeypatch):
    records = {
        "accounts": [{"id": "eur", "user_id": "user"}, {"id": "unknown", "user_id": "user"}],
        "integration_accounts": [{"id": "eur-link", "user_id": "user", "account_id": "eur", "currency": "EUR"}, {"id": "unknown-link", "user_id": "user", "account_id": "unknown", "currency": None}],
        "trades": [{"id": f"trade-{index}", "user_id": "user", "account_id": "eur", "pnl": 1, "date": "2026-10-10"} for index in range(1201)] + [{"id": "unavailable-unit", "user_id": "user", "account_id": "unknown", "pnl": 1000}],
        "payouts": [{"id": "payout", "user_id": "user", "account_id": "eur", "amount": 20}],
    }
    offsets = []

    async def select(table, _token, params):
        assert params["user_id"] == "eq.user"
        offset = int(params["offset"])
        if table == "trades":
            offsets.append(offset)
        return records[table][offset:offset + 500]

    monkeypatch.setattr(server, "supabase_select", select)
    accounts, trades, payouts = asyncio.run(server.load_atlas_data({"id": "user", "_supabase_token": "token"}, trade_limit=1))
    assert len(trades) == 1202
    assert offsets == [0, 500, 1000, 1202]
    assert trades[0]["provider_currency"] == "EUR"
    assert trades[-1]["currency_available"] is False
    assert payouts[0]["currency"] == "EUR"
    context, _ = server.build_atlas_context({}, accounts, trades, payouts)
    dashboard = server.build_financial_dashboard(accounts, trades, payouts)
    assert context["metrics"]["net_pnl"] == dashboard["kpis"]["net_pnl"] == 1201
    assert context["metrics"]["win_rate_percent"] == dashboard["metrics"]["winrate"] == 100
