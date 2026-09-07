import asyncio

import pytest
from fastapi import FastAPI, Header, HTTPException
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

from backtest.routes import build_backtest_router, ensure_backtest_indexes
from backtest.body_limit import BacktestBodyLimit


CSV = """timestamp,open,high,low,close,volume
2025-03-12T13:30:00Z,20000,20002,19999,20001,10
2025-03-12T13:31:00Z,20001,20004,20000,20003,12
2025-03-12T13:32:00Z,20004,20010,20003,20008,15
2025-03-12T13:33:00Z,20008,20015,20007,20012,20
"""


@pytest.fixture
def client():
    db = AsyncMongoMockClient().test
    asyncio.run(ensure_backtest_indexes(db))
    async def user(x_test_user: str | None = Header(None)):
        if not x_test_user:
            raise HTTPException(401, "Authentication required")
        return {"id": x_test_user}
    app = FastAPI()
    app.include_router(build_backtest_router(user, db), prefix="/api")
    app.add_middleware(BacktestBodyLimit)
    with TestClient(app) as c:
        c.headers["x-test-user"] = "user-a"
        yield c


def setup_session(client):
    upload = client.post("/api/backtest/datasets", data={"symbol": "NQ", "contract": "NQH5", "source": "Test fixture ONLY", "rights_confirmed": "true"}, files={"file": ("fixture.csv", CSV, "text/csv")})
    assert upload.status_code == 200, upload.text
    data = upload.json()
    session = client.post("/api/backtest/sessions", json={"dataset_id": data["id"], "name": "Test replay", "start": data["quality"]["first"], "commission": "4", "slippage_ticks": 1})
    assert session.status_code == 200, session.text
    return session.json(), data


def test_replay_api_end_to_end_persistence_and_no_lookahead(client):
    session, data = setup_session(client)
    root = f"/api/backtest/sessions/{session['id']}"
    bars = client.get(root + "/bars", params={"before": data["quality"]["last"]}).json()
    assert len(bars) == 1  # arbitrary future query is clamped server-side
    response = client.post(root + "/commands", json={"revision": 0, "action": "order", "payload": {"side": "buy", "kind": "market", "stop_loss": "19990", "take_profit": "20010", "risk_value": "2"}})
    assert response.status_code == 200, response.text
    assert response.json()["session"]["state"]["position"] is None
    for revision in (1, 2, 3):
        response = client.post(root + "/commands", json={"revision": revision, "action": "next"})
        assert response.status_code == 200, response.text
        s = response.json()["session"]
        assert all(b["timestamp"] <= s["cursor"] for b in response.json()["bars"])
    saved = client.get(root).json()
    assert saved["state"]["completed"] is True
    assert saved["state"]["position"] is None
    assert saved["analytics"]["trades"] == 1
    assert float(saved["analytics"]["net"]) == 342  # (20010 - 20001.25)*20*2 - 8
    assert saved["revision"] == 4


def test_other_user_cannot_read_mutate_or_reuse_private_dataset(client):
    session, data = setup_session(client)
    root = f"/api/backtest/sessions/{session['id']}"
    client.headers["x-test-user"] = "user-b"
    assert client.get("/api/backtest/sessions").json() == []
    assert client.get("/api/backtest/datasets").json() == []
    assert client.get(root).status_code == 404
    assert client.get(root + "/bars").status_code == 404
    assert client.post(root + "/commands", json={"revision": 0, "action": "next"}).status_code == 404
    assert client.post("/api/backtest/sessions", json={"dataset_id": data["id"], "name": "Leak", "start": data["quality"]["first"]}).status_code == 404
    assert client.delete(f"/api/backtest/datasets/{data['id']}").status_code == 404


def test_stale_revision_cannot_double_execute_and_rewind_not_after_order(client):
    session, _ = setup_session(client)
    root = f"/api/backtest/sessions/{session['id']}/commands"
    body = {"revision": 0, "action": "next"}
    assert client.post(root, json=body).status_code == 200
    assert client.post(root, json=body).status_code == 409
    assert client.post(root, json={"revision": 1, "action": "order", "payload": {"side": "buy", "kind": "market", "stop_loss": "19990", "take_profit": "20010"}}).status_code == 200
    assert client.post(root, json={"revision": 2, "action": "previous"}).status_code == 422


def test_auth_required_and_invalid_data_rejected(client):
    assert client.post("/api/backtest/datasets", data={"symbol": "NQ", "contract": "NQ.c.0", "source": "Fixture", "rights_confirmed": "true"}, files={"file": ("fixture.csv", CSV)}).status_code == 422
    client.headers.pop("x-test-user")
    assert client.get("/api/backtest/catalog").status_code == 401


def test_settings_persist_and_do_not_change_replay_cursor(client):
    session, _ = setup_session(client)
    root = f"/api/backtest/sessions/{session['id']}"
    result = client.post(root + "/commands", json={"revision": 0, "action": "settings", "payload": {"timeframe": "15m", "secondary": "4h", "dual": True, "timezone": "America/New_York"}})
    assert result.status_code == 200, result.text
    saved = client.get(root).json()
    assert saved["settings"]["dual"] and saved["settings"]["timeframe"] == "15m"
    assert saved["cursor"] == session["cursor"]


def test_request_size_limited_before_parsing(client):
    result = client.post("/api/backtest/sessions", content="x" * 17000, headers={"content-type": "application/json"})
    assert result.status_code == 413


def test_account_purge_deletes_only_authenticated_users_lab_data(client):
    setup_session(client)
    client.headers["x-test-user"] = "user-b"
    session_b, _ = setup_session(client)

    client.headers["x-test-user"] = "user-a"
    result = client.delete("/api/backtest/account-data")
    assert result.status_code == 200, result.text
    assert result.json()["deleted"]["backtest_sessions"] == 1
    assert client.get("/api/backtest/sessions").json() == []
    assert client.get("/api/backtest/datasets").json() == []

    client.headers["x-test-user"] = "user-b"
    assert client.get(f"/api/backtest/sessions/{session_b['id']}").status_code == 200
    assert len(client.get("/api/backtest/datasets").json()) == 1
