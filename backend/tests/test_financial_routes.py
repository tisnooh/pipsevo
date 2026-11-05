import asyncio
import os
import types

import pytest
import requests
from fastapi import HTTPException
from fastapi.testclient import TestClient

os.environ.setdefault("MONGO_URL", "mongodb://127.0.0.1:27017")
os.environ.setdefault("DB_NAME", "pipsevo_test")
os.environ.setdefault("JWT_SECRET", "test-jwt-secret")

import server
from financial_reporting import account_scores, build_financial_dashboard

USER = {"id": "user", "_supabase_token": "user-bearer"}
ACCOUNT_ID = "14b8c41a-a4ca-4d0b-b05a-6108b2eb48b3"


class NoMongoFinancialAccess:
    def __getattr__(self, name):
        raise AssertionError(f"Financial route must not access Mongo: {name}")


def test_financial_reads_use_full_owned_canonical_history_not_mongo(monkeypatch):
    source = [{"id": f"trade-{index}", "user_id": "user", "date": "2026-10-10", "pnl": 1} for index in range(1601)]
    offsets = []
    async def select(table, token, params):
        assert table == "trades"
        assert token == "user-bearer"
        assert params["user_id"] == "eq.user"
        assert params["order"] == "date.desc,id.desc"
        offset = int(params["offset"])
        offsets.append(offset)
        # Simulate a server configured with a lower cap than requested.
        return source[offset:offset + 500]
    monkeypatch.setattr(server, "supabase_select", select)
    monkeypatch.setattr(server, "db", NoMongoFinancialAccess())
    result = asyncio.run(server.list_trades(user=USER))
    assert len(result) == 1601
    assert offsets == [0, 500, 1000, 1500, 1601]


def test_financial_unavailable_store_and_invalid_pagination_fail_closed(monkeypatch):
    monkeypatch.setattr(server, "db", NoMongoFinancialAccess())
    with pytest.raises(HTTPException) as missing:
        asyncio.run(server.list_payouts({"id": "user"}))
    assert missing.value.status_code == 503
    async def foreign(*_args, **_kwargs):
        return [{"id": "foreign-trade", "user_id": "other"}]
    monkeypatch.setattr(server, "supabase_select", foreign)
    with pytest.raises(HTTPException) as unauthorized:
        asyncio.run(server.list_trades(user=USER))
    assert unauthorized.value.status_code == 502
    async def ignores_offset(*_args, **_kwargs):
        return [{"id": "trade", "user_id": "user"}]
    monkeypatch.setattr(server, "supabase_select", ignores_offset)
    with pytest.raises(HTTPException) as duplicate:
        asyncio.run(server.list_trades(user=USER))
    assert duplicate.value.status_code == 503


def test_financial_store_errors_are_explicit_service_errors(monkeypatch):
    def unavailable(*_args, **_kwargs):
        raise requests.ConnectionError("test outage")
    monkeypatch.setattr(server.requests, "get", unavailable)
    with pytest.raises(HTTPException) as failed:
        asyncio.run(server.supabase_select("trades", "user-bearer", {"user_id": "eq.user"}))
    assert failed.value.status_code == 503
    monkeypatch.setattr(server.requests, "get", lambda *_args, **_kwargs: types.SimpleNamespace(status_code=200, json=lambda: {"unexpected": True}))
    with pytest.raises(HTTPException) as malformed:
        asyncio.run(server.supabase_select("trades", "user-bearer", {"user_id": "eq.user"}))
    assert malformed.value.status_code == 502


def test_financial_reads_send_user_authority_and_owned_filter(monkeypatch):
    seen = {}
    def read(url, **kwargs):
        seen.update(url=url, **kwargs)
        return types.SimpleNamespace(status_code=200, json=lambda: [])
    monkeypatch.setattr(server.requests, "get", read)
    assert asyncio.run(server.list_payouts(USER)) == []
    assert seen["headers"]["Authorization"] == "Bearer user-bearer"
    assert seen["params"]["user_id"] == "eq.user"
    assert seen["url"].endswith("/rest/v1/payouts")


def test_account_currency_is_existing_metadata_not_an_external_sync(monkeypatch):
    records = {
        "accounts": [{"id": ACCOUNT_ID, "user_id": "user", "initial_balance": 50000, "balance": 50400, "max_drawdown": 2000, "status": "active"}],
        "integration_accounts": [{"id": "integration", "user_id": "user", "account_id": ACCOUNT_ID, "currency": "EUR"}],
    }
    async def select(table, _token, params):
        return records[table] if params["offset"] == "0" else []
    monkeypatch.setattr(server, "supabase_select", select)
    result = asyncio.run(server.list_accounts(USER))
    assert result[0]["currency"] == "EUR"
    assert result[0]["currency_available"] is True
    # No inferred static threshold for linked accounts without a current reference.
    assert result[0]["health_score"] is None
    assert result[0]["survival_score"] is None


def test_net_stats_exclude_open_unavailable_and_price_only_winners():
    trades = [
        {"id": "win", "pnl": 100, "commission": 5, "result_status": "closed", "date": "2026-10-09", "plan_respected": True},
        {"id": "loss-after-costs", "pnl": -10, "direction": "long", "entry": 10, "exit_price": 11, "result_status": "winner", "date": "2026-10-10", "plan_respected": False},
        {"id": "open", "pnl": 1000, "result_status": "open"},
        {"id": "unknown", "pnl": None, "result_status": "closed"},
        {"id": "unverified-import", "pnl": 50, "source_provider": "tradelocker", "result_status": "closed", "provider_metadata": {"net_pnl_available": False}},
    ]
    result = build_financial_dashboard([], trades, [])
    assert result["kpis"]["net_pnl"] == 90  # Stored manual P&L is already net; no double deduction.
    assert result["kpis"]["total_trades"] == 2
    assert result["metrics"]["winrate"] == 50
    assert result["metrics"]["profit_factor"] == 10
    assert result["metrics"]["avg_loss"] == -10
    assert result["kpis"]["estimated_payout"] is None
    assert result["data_quality"]["unmeasured_closed_trades"] == 2
    assert result["equity_curve"][-1]["equity"] == 90


def test_mixed_native_currencies_never_form_a_monetary_total_or_rank():
    accounts = [
        {"id": "usd", "currency": "USD", "initial_balance": 50000, "balance": 50100},
        {"id": "eur", "currency": "EUR", "initial_balance": 10000, "balance": 9990},
    ]
    trades = [
        {"pnl": 100, "provider_currency": "USD", "date": "2026-10-10", "setup": "FVG"},
        {"pnl": -10, "provider_currency": "EUR", "date": "2026-10-10", "setup": "FVG"},
    ]
    result = build_financial_dashboard(accounts, trades, [{"account_id": "eur", "amount": 30}])
    assert result["kpis"]["net_pnl"] is None
    assert result["kpis"]["funded_capital"] is None
    assert result["metrics"]["profit_factor"] is None
    assert result["metrics"]["winrate"] == 50
    assert result["amounts_by_currency"]["net_pnl"] == {"EUR": -10, "USD": 100}
    assert result["amounts_by_currency"]["total_payouts"] == {"EUR": 30}
    assert result["setups"]["FVG"]["pnl"] is None
    assert result["best_setup"] is None
    assert result["equity_curve"] == []
    assert set(result["equity_curves_by_currency"]) == {"EUR", "USD"}


def test_unknown_currency_or_drawdown_is_not_fabricated():
    account = {"id": "connected", "initial_balance": 10000, "balance": 10500, "max_drawdown": 1000, "integration_account_id": "integration", "currency": None, "currency_available": False}
    result = build_financial_dashboard([account], [], [{"account_id": "connected", "amount": 200}])
    assert result["kpis"]["funded_capital"] is None
    assert result["kpis"]["remaining_drawdown"] is None
    assert result["kpis"]["total_payouts"] is None
    assert result["data_quality"]["accounts_with_unknown_currency"] == 1
    assert result["data_quality"]["payouts_with_unknown_currency"] == 1
    assert account_scores(account) == (None, None)
    # Even a numeric drawdown reference cannot make an unknown unit reliable.
    assert account_scores({**account, "current_drawdown": 100}) == (None, None)
    assert build_financial_dashboard([{**account, "current_drawdown": 100}], [], [])["kpis"]["survival_score"] is None


def test_trades_inherit_native_account_currency_and_unknown_units_are_excluded():
    accounts = [{"id": "eur", "currency": "EUR"}, {"id": "unknown", "currency_available": False}]
    trades = [{"account_id": "eur", "pnl": 100, "date": "2026-10-10"},
              {"account_id": "unknown", "pnl": 500, "date": "2026-10-10"},
              {"source_provider": "ctrader", "pnl": -20, "date": "2026-10-10"}]
    result = build_financial_dashboard(accounts, trades, [])
    assert result["amounts_by_currency"]["net_pnl"] == {"EUR": 100}
    assert result["equity_curves_by_currency"]["EUR"][-1]["equity"] == 100
    assert "USD" not in result["equity_curves_by_currency"]
    assert result["data_quality"]["trades_with_unknown_currency"] == 2
    assert result["data_quality"]["unmeasured_closed_trades"] == 2


def test_empty_and_all_winning_stats_are_json_safe(monkeypatch):
    empty = build_financial_dashboard([], [], [])
    assert empty["metrics"]["winrate"] is None
    assert empty["kpis"]["discipline_score"] is None
    assert empty["kpis"]["net_pnl"] is None
    result = build_financial_dashboard([], [{"pnl": 10, "date": "2026-10-10"}], [])
    assert result["metrics"]["profit_factor"] is None
    assert result["metrics"]["profit_factor_unbounded"] is True
    async def canonical(*_args, **_kwargs):
        return result
    monkeypatch.setattr(server, "dashboard", canonical)
    server.app.dependency_overrides[server.get_current_user] = lambda: USER
    try:
        response = TestClient(server.app).get("/api/stats")
        assert response.status_code == 200
        assert response.json()["metrics"]["profit_factor_unbounded"] is True
    finally:
        server.app.dependency_overrides.clear()


def test_dashboard_and_stats_share_the_same_canonical_snapshot(monkeypatch):
    rows = {
        "accounts": [{"id": ACCOUNT_ID, "user_id": "user", "balance": 55000, "initial_balance": 50000, "max_drawdown": 2000, "current_drawdown": 0, "status": "active"}],
        "integration_accounts": [],
        "trades": [{"id": "manual", "user_id": "user", "account_id": ACCOUNT_ID, "pnl": 40, "date": "2026-10-10"}],
        "payouts": [],
    }
    async def select(table, _token, params):
        return rows[table] if params["offset"] == "0" else []
    monkeypatch.setattr(server, "supabase_select", select)
    monkeypatch.setattr(server, "db", NoMongoFinancialAccess())
    dashboard = asyncio.run(server.dashboard(USER))
    stats = asyncio.run(server.financial_stats(USER))
    assert dashboard == stats
    assert dashboard["kpis"]["net_pnl"] == 40  # Not balance minus capital (5000).
    assert dashboard["kpis"]["estimated_payout"] is None


@pytest.mark.parametrize("method,path,body", [
    ("post", "/api/accounts", {"name": "Account", "firm": "Firm", "balance": 50000, "initial_balance": 50000, "profit_target": 3000, "max_drawdown": 2000}),
    ("patch", "/api/accounts/account", {"balance": 90000}),
    ("delete", "/api/accounts/account", None),
    ("post", "/api/trades", {"account_id": ACCOUNT_ID, "date": "2026-10-10", "instrument": "NQ", "direction": "long", "pnl": 100}),
    ("patch", "/api/trades/trade", {"pnl": 500}),
    ("delete", "/api/trades/trade", None),
    ("post", "/api/payouts", {"account_id": ACCOUNT_ID, "date": "2026-10-10", "amount": 100}),
    ("delete", "/api/payouts/payout", None),
])
def test_legacy_mutations_are_explicitly_disabled_without_data_write(monkeypatch, method, path, body):
    monkeypatch.setattr(server, "db", NoMongoFinancialAccess())
    server.app.dependency_overrides[server.get_current_user] = lambda: USER
    try:
        response = TestClient(server.app).request(method, path, json=body)
        assert response.status_code == 410
        assert "Supabase" in response.json()["detail"]
    finally:
        server.app.dependency_overrides.clear()


def test_trade_account_filter_rejects_non_uuid_before_query(monkeypatch):
    monkeypatch.setattr(server, "db", NoMongoFinancialAccess())
    with pytest.raises(HTTPException) as invalid:
        asyncio.run(server.list_trades(account_id="bad,or=(user_id.eq.other)", user=USER))
    assert invalid.value.status_code == 422
