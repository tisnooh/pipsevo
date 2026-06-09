"""PipsEvo backend API tests."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://trading-dna.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def user_ctx(session):
    email = f"TEST_{uuid.uuid4().hex[:10]}@pipsevo.com"
    r = session.post(f"{API}/auth/register", json={"email": email, "password": "test1234", "name": "Tester"})
    assert r.status_code == 200, r.text
    token = r.json()["token"]
    return {"email": email, "token": token, "headers": {"Authorization": f"Bearer {token}"}}


# ===== Auth =====
def test_register_duplicate(session, user_ctx):
    r = session.post(f"{API}/auth/register", json={"email": user_ctx["email"], "password": "x", "name": "x"})
    assert r.status_code == 400


def test_login_demo(session):
    r = session.post(f"{API}/auth/login", json={"email": "demo@pipsevo.com", "password": "demo123"})
    assert r.status_code == 200
    assert "token" in r.json()


def test_login_invalid(session):
    r = session.post(f"{API}/auth/login", json={"email": "demo@pipsevo.com", "password": "wrong"})
    assert r.status_code == 401


def test_me(session, user_ctx):
    r = session.get(f"{API}/auth/me", headers=user_ctx["headers"])
    assert r.status_code == 200
    assert r.json()["email"] == user_ctx["email"]


def test_me_no_token(session):
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_google_mocked(session):
    r = session.post(f"{API}/auth/google")
    assert r.status_code == 501


# ===== Onboarding =====
def test_onboarding(session, user_ctx):
    r = session.post(f"{API}/onboarding", headers=user_ctx["headers"], json={
        "trader_type": "futures",
        "prop_firms": ["Topstep"],
        "num_accounts": 1,
        "rules": {"max_trades_per_day": 3},
    })
    assert r.status_code == 200
    assert r.json()["ok"] is True
    me = session.get(f"{API}/auth/me", headers=user_ctx["headers"]).json()
    assert me["onboarded"] is True


# ===== Accounts =====
def test_account_crud(session, user_ctx):
    payload = {
        "name": "TEST_Acc1", "firm": "Topstep", "balance": 50000,
        "initial_balance": 50000, "profit_target": 53000, "max_drawdown": 2000,
    }
    r = session.post(f"{API}/accounts", headers=user_ctx["headers"], json=payload)
    assert r.status_code == 200
    acc = r.json()
    assert acc["name"] == "TEST_Acc1"
    assert "health_score" in acc and "survival_score" in acc
    user_ctx["account_id"] = acc["id"]

    r = session.get(f"{API}/accounts", headers=user_ctx["headers"])
    assert r.status_code == 200
    assert any(a["id"] == acc["id"] for a in r.json())


# ===== Trades =====
def test_trade_create_updates_balance(session, user_ctx):
    aid = user_ctx["account_id"]
    r = session.post(f"{API}/trades", headers=user_ctx["headers"], json={
        "account_id": aid, "date": "2026-01-15", "instrument": "ES",
        "direction": "long", "entry": 4500, "pnl": 250,
        "setup": "Breakout", "session": "NY", "emotion": "calm", "plan_respected": True,
    })
    assert r.status_code == 200
    accs = session.get(f"{API}/accounts", headers=user_ctx["headers"]).json()
    acc = next(a for a in accs if a["id"] == aid)
    assert acc["balance"] == 50250


def test_trades_list(session, user_ctx):
    r = session.get(f"{API}/trades", headers=user_ctx["headers"])
    assert r.status_code == 200
    assert len(r.json()) >= 1


# ===== Dashboard =====
def test_dashboard(session, user_ctx):
    r = session.get(f"{API}/dashboard", headers=user_ctx["headers"])
    assert r.status_code == 200
    data = r.json()
    assert "kpis" in data
    assert data["kpis"]["active_accounts"] >= 1
    assert data["kpis"]["total_trades"] >= 1


# ===== Payouts =====
def test_payouts(session, user_ctx):
    r = session.post(f"{API}/payouts", headers=user_ctx["headers"], json={
        "account_id": user_ctx["account_id"], "amount": 500, "date": "2026-01-16", "note": "TEST",
    })
    assert r.status_code == 200
    r = session.get(f"{API}/payouts", headers=user_ctx["headers"])
    assert r.status_code == 200
    assert len(r.json()) >= 1


# ===== Trading DNA =====
def test_dna(session, user_ctx):
    r = session.get(f"{API}/dna", headers=user_ctx["headers"])
    assert r.status_code == 200
    assert "trader_type" in r.json()


# ===== AI Coach (real LLM call) =====
def test_coach_ask(session, user_ctx):
    r = session.post(f"{API}/coach/ask", headers=user_ctx["headers"], json={
        "question": "How is my discipline?", "context_tag": "discipline",
    }, timeout=90)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "answer" in data and len(data["answer"]) > 20


# ===== Billing mock =====
def test_billing_mock(session, user_ctx):
    r = session.post(f"{API}/billing/checkout?plan=pro", headers=user_ctx["headers"])
    assert r.status_code == 200
    assert r.json()["checkout_url"] is None
