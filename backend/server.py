from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import bcrypt
import jwt as pyjwt
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import anthropic
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXP_HOURS = int(os.environ.get('JWT_EXPIRE_HOURS', '168'))
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY')
client_ai = anthropic.Anthropic(api_key=EMERGENT_LLM_KEY) if EMERGENT_LLM_KEY else None

app = FastAPI(title="PipsEvo API")
api = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)


def now_utc():
    return datetime.now(timezone.utc).isoformat()


def hash_pw(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_pw(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def make_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXP_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = pyjwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALG])
        user_id = payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ============= MODELS =============
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    trader_type: Optional[str] = None


class OnboardingIn(BaseModel):
    trader_type: str  # futures | cfd | both
    prop_firms: List[str]
    num_accounts: int
    rules: Dict[str, Any]


class PropAccountIn(BaseModel):
    name: str
    firm: str  # Topstep | Apex | FTMO | FundedNext | The5ers | TakeProfitTrader
    balance: float
    initial_balance: float
    profit_target: float
    max_drawdown: float
    daily_loss_limit: Optional[float] = 0
    status: Optional[str] = "active"


class PropAccountUpdate(BaseModel):
    name: Optional[str] = None
    firm: Optional[str] = None
    balance: Optional[float] = None
    initial_balance: Optional[float] = None
    profit_target: Optional[float] = None
    max_drawdown: Optional[float] = None
    daily_loss_limit: Optional[float] = None
    status: Optional[str] = None


class TradeIn(BaseModel):
    account_id: str
    date: str
    instrument: str
    direction: str  # long | short
    entry: float
    stop: Optional[float] = None
    take_profit: Optional[float] = None
    exit_price: Optional[float] = None
    pnl: float
    setup: Optional[str] = None
    session: Optional[str] = None  # London | NY | Asia
    emotion: Optional[str] = None
    notes: Optional[str] = None
    plan_respected: bool = True
    screenshots: List[str] = []
    r: float = 0
    size: float = 1
    duration: Optional[str] = None
    tags: List[str] = []


class TradeUpdate(BaseModel):
    account_id: Optional[str] = None
    date: Optional[str] = None
    instrument: Optional[str] = None
    direction: Optional[str] = None
    entry: Optional[float] = None
    stop: Optional[float] = None
    take_profit: Optional[float] = None
    exit_price: Optional[float] = None
    pnl: Optional[float] = None
    setup: Optional[str] = None
    session: Optional[str] = None
    emotion: Optional[str] = None
    notes: Optional[str] = None
    plan_respected: Optional[bool] = None
    screenshots: Optional[List[str]] = None
    r: Optional[float] = None
    size: Optional[float] = None
    duration: Optional[str] = None
    tags: Optional[List[str]] = None
    starred: Optional[bool] = None


class PayoutIn(BaseModel):
    account_id: str
    amount: float
    date: str
    note: Optional[str] = None


class CoachQuery(BaseModel):
    question: str
    context_tag: Optional[str] = "overall"


class ContactIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    subject: str = Field(min_length=3, max_length=120)
    message: str = Field(min_length=10, max_length=3000)


# ============= AUTH =============
@api.post("/contact")
async def contact(body: ContactIn):
    doc = body.model_dump()
    doc.update({"id": str(uuid.uuid4()), "status": "new", "created_at": now_utc()})
    await db.contact_messages.insert_one(doc)
    return {"ok": True, "message": "Message received"}


@api.post("/auth/register")
async def register(body: RegisterIn):
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": body.email.lower(),
        "name": body.name or body.email.split("@")[0],
        "password_hash": hash_pw(body.password),
        "created_at": now_utc(),
        "onboarded": False,
        "plan": "free",
        "trader_type": None,
        "prop_firms": [],
        "rules": {},
    }
    await db.users.insert_one(doc)
    token = make_token(user_id)
    return {"token": token, "user": {k: v for k, v in doc.items() if k not in ("password_hash", "_id")}}


@api.post("/auth/login")
async def login(body: LoginIn):
    user = await db.users.find_one({"email": body.email.lower()})
    if not user or not verify_pw(body.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid credentials")
    token = make_token(user["id"])
    user.pop("_id", None)
    user.pop("password_hash", None)
    return {"token": token, "user": user}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api.patch("/auth/me")
async def update_profile(body: ProfileIn, user=Depends(get_current_user)):
    updates = {"name": body.name.strip(), "trader_type": body.trader_type}
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    return await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})


@api.post("/auth/google")
async def google_mock():
    # Google OAuth via Emergent - to be wired in next iteration. Mocked path creates a demo user.
    raise HTTPException(501, "Google login is queued for next release")


# ============= ONBOARDING =============
@api.post("/onboarding")
async def save_onboarding(body: OnboardingIn, user=Depends(get_current_user)):
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {
            "trader_type": body.trader_type,
            "prop_firms": body.prop_firms,
            "num_accounts": body.num_accounts,
            "rules": body.rules,
            "onboarded": True,
        }},
    )
    return {"ok": True}


# ============= PROP ACCOUNTS =============
@api.get("/accounts")
async def list_accounts(user=Depends(get_current_user)):
    docs = await db.accounts.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    # Enrich with computed scores
    for d in docs:
        d["health_score"] = compute_health(d)
        d["survival_score"] = compute_survival(d)
    return docs


@api.post("/accounts")
async def create_account(body: PropAccountIn, user=Depends(get_current_user)):
    acc = body.model_dump()
    acc["id"] = str(uuid.uuid4())
    acc["user_id"] = user["id"]
    acc["created_at"] = now_utc()
    acc["current_drawdown"] = 0
    await db.accounts.insert_one(acc)
    acc.pop("_id", None)
    acc["health_score"] = compute_health(acc)
    acc["survival_score"] = compute_survival(acc)
    return acc


@api.delete("/accounts/{aid}")
async def delete_account(aid: str, user=Depends(get_current_user)):
    await db.accounts.delete_one({"id": aid, "user_id": user["id"]})
    await db.trades.delete_many({"account_id": aid, "user_id": user["id"]})
    return {"ok": True}


@api.patch("/accounts/{aid}")
async def update_account(aid: str, body: PropAccountUpdate, user=Depends(get_current_user)):
    account = await db.accounts.find_one({"id": aid, "user_id": user["id"]})
    if not account:
        raise HTTPException(404, "Account not found")
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No changes supplied")
    await db.accounts.update_one({"id": aid, "user_id": user["id"]}, {"$set": updates})
    updated = await db.accounts.find_one({"id": aid, "user_id": user["id"]}, {"_id": 0})
    updated["health_score"] = compute_health(updated)
    updated["survival_score"] = compute_survival(updated)
    return updated


def compute_health(acc: Dict[str, Any]) -> int:
    ib = max(acc.get("initial_balance", 1), 1)
    bal = acc.get("balance", ib)
    profit_pct = (bal - ib) / ib
    dd_pct = max(0, (ib - bal) / max(acc.get("max_drawdown", 1), 1))
    score = 70 + profit_pct * 100 - dd_pct * 60
    return max(0, min(100, int(score)))


def compute_survival(acc: Dict[str, Any]) -> int:
    ib = max(acc.get("initial_balance", 1), 1)
    bal = acc.get("balance", ib)
    md = max(acc.get("max_drawdown", 1), 1)
    dd_used = max(0, ib - bal) / md
    return max(5, min(99, int(95 - dd_used * 90)))


# ============= TRADES =============
@api.get("/trades")
async def list_trades(account_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"user_id": user["id"]}
    if account_id:
        q["account_id"] = account_id
    docs = await db.trades.find(q, {"_id": 0}).sort("date", -1).to_list(2000)
    return docs


@api.post("/trades")
async def create_trade(body: TradeIn, user=Depends(get_current_user)):
    account = await db.accounts.find_one({"id": body.account_id, "user_id": user["id"]})
    if not account:
        raise HTTPException(404, "Account not found")
    t = body.model_dump()
    t["id"] = str(uuid.uuid4())
    t["user_id"] = user["id"]
    t["created_at"] = now_utc()
    await db.trades.insert_one(t)
    # Update account balance
    await db.accounts.update_one(
        {"id": body.account_id, "user_id": user["id"]},
        {"$inc": {"balance": body.pnl}},
    )
    t.pop("_id", None)
    return t


@api.delete("/trades/{tid}")
async def delete_trade(tid: str, user=Depends(get_current_user)):
    trade = await db.trades.find_one({"id": tid, "user_id": user["id"]})
    if trade:
        await db.accounts.update_one(
            {"id": trade["account_id"], "user_id": user["id"]},
            {"$inc": {"balance": -trade.get("pnl", 0)}},
        )
        await db.trades.delete_one({"id": tid, "user_id": user["id"]})
    return {"ok": True}


@api.patch("/trades/{tid}")
async def update_trade(tid: str, body: TradeUpdate, user=Depends(get_current_user)):
    trade = await db.trades.find_one({"id": tid, "user_id": user["id"]})
    if not trade:
        raise HTTPException(404, "Trade not found")
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(400, "No changes supplied")
    new_account_id = updates.get("account_id", trade["account_id"])
    if new_account_id != trade["account_id"]:
        target = await db.accounts.find_one({"id": new_account_id, "user_id": user["id"]})
        if not target:
            raise HTTPException(404, "Target account not found")
    old_pnl = float(trade.get("pnl", 0))
    new_pnl = float(updates.get("pnl", old_pnl))
    if new_account_id == trade["account_id"]:
        delta = new_pnl - old_pnl
        if delta:
            await db.accounts.update_one({"id": trade["account_id"], "user_id": user["id"]}, {"$inc": {"balance": delta}})
    else:
        await db.accounts.update_one({"id": trade["account_id"], "user_id": user["id"]}, {"$inc": {"balance": -old_pnl}})
        await db.accounts.update_one({"id": new_account_id, "user_id": user["id"]}, {"$inc": {"balance": new_pnl}})
    await db.trades.update_one({"id": tid, "user_id": user["id"]}, {"$set": updates})
    return await db.trades.find_one({"id": tid, "user_id": user["id"]}, {"_id": 0})


# ============= ANALYTICS / DASHBOARD =============
@api.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    accounts = await db.accounts.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    trades = await db.trades.find({"user_id": user["id"]}, {"_id": 0}).to_list(5000)
    payouts = await db.payouts.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)

    total_funded = sum(a.get("initial_balance", 0) for a in accounts)
    total_balance = sum(a.get("balance", 0) for a in accounts)
    total_profit = total_balance - total_funded
    remaining_dd = sum(max(0, a.get("max_drawdown", 0) - max(0, a.get("initial_balance", 0) - a.get("balance", 0))) for a in accounts)
    total_payouts = sum(p.get("amount", 0) for p in payouts)
    estimated_payout = max(0, total_profit * 0.8)

    wins = [t for t in trades if t.get("pnl", 0) > 0]
    losses = [t for t in trades if t.get("pnl", 0) < 0]
    winrate = (len(wins) / len(trades) * 100) if trades else 0
    avg_win = (sum(t["pnl"] for t in wins) / len(wins)) if wins else 0
    avg_loss = (sum(t["pnl"] for t in losses) / len(losses)) if losses else 0
    profit_factor = (sum(t["pnl"] for t in wins) / abs(sum(t["pnl"] for t in losses))) if losses and sum(t["pnl"] for t in losses) < 0 else 0

    plan_respect = (sum(1 for t in trades if t.get("plan_respected")) / len(trades) * 100) if trades else 100
    discipline_score = int(plan_respect * 0.6 + (winrate * 0.2) + 20)
    discipline_score = max(0, min(100, discipline_score))

    survival_avg = int(sum(compute_survival(a) for a in accounts) / len(accounts)) if accounts else 100
    trader_score = int((discipline_score + survival_avg + min(100, max(0, winrate))) / 3)

    # Equity curve (running pnl by date)
    sorted_trades = sorted(trades, key=lambda t: t.get("date", ""))
    equity = []
    running = 0
    for t in sorted_trades:
        running += t.get("pnl", 0)
        equity.append({"date": t.get("date"), "equity": round(running, 2)})

    # By setup
    setups: Dict[str, Dict[str, Any]] = {}
    for t in trades:
        s = t.get("setup") or "Unspecified"
        setups.setdefault(s, {"trades": 0, "pnl": 0, "wins": 0})
        setups[s]["trades"] += 1
        setups[s]["pnl"] += t.get("pnl", 0)
        if t.get("pnl", 0) > 0:
            setups[s]["wins"] += 1
    for s in setups.values():
        s["winrate"] = round(s["wins"] / max(s["trades"], 1) * 100, 1)
    best_setup = max(setups.items(), key=lambda x: x[1]["pnl"])[0] if setups else None
    worst_setup = min(setups.items(), key=lambda x: x[1]["pnl"])[0] if setups else None

    # Session breakdown
    sessions: Dict[str, Dict[str, Any]] = {}
    for t in trades:
        s = t.get("session") or "Unspecified"
        sessions.setdefault(s, {"trades": 0, "pnl": 0, "wins": 0})
        sessions[s]["trades"] += 1
        sessions[s]["pnl"] += t.get("pnl", 0)
        if t.get("pnl", 0) > 0:
            sessions[s]["wins"] += 1
    for s in sessions.values():
        s["winrate"] = round(s["wins"] / max(s["trades"], 1) * 100, 1)

    return {
        "kpis": {
            "funded_capital": round(total_funded, 2),
            "total_profit": round(total_profit, 2),
            "remaining_drawdown": round(remaining_dd, 2),
            "estimated_payout": round(estimated_payout, 2),
            "discipline_score": discipline_score,
            "trader_score": trader_score,
            "survival_score": survival_avg,
            "total_payouts": round(total_payouts, 2),
            "active_accounts": len(accounts),
            "total_trades": len(trades),
        },
        "equity_curve": equity[-180:],
        "metrics": {
            "winrate": round(winrate, 1),
            "profit_factor": round(profit_factor, 2),
            "avg_win": round(avg_win, 2),
            "avg_loss": round(avg_loss, 2),
            "plan_respect_rate": round(plan_respect, 1),
        },
        "setups": setups,
        "sessions": sessions,
        "best_setup": best_setup,
        "worst_setup": worst_setup,
    }


# ============= PAYOUTS =============
@api.get("/payouts")
async def list_payouts(user=Depends(get_current_user)):
    docs = await db.payouts.find({"user_id": user["id"]}, {"_id": 0}).sort("date", -1).to_list(500)
    return docs


@api.post("/payouts")
async def create_payout(body: PayoutIn, user=Depends(get_current_user)):
    account = await db.accounts.find_one({"id": body.account_id, "user_id": user["id"]})
    if not account:
        raise HTTPException(404, "Account not found")
    p = body.model_dump()
    p["id"] = str(uuid.uuid4())
    p["user_id"] = user["id"]
    p["created_at"] = now_utc()
    await db.payouts.insert_one(p)
    p.pop("_id", None)
    return p


@api.delete("/payouts/{pid}")
async def delete_payout(pid: str, user=Depends(get_current_user)):
    result = await db.payouts.delete_one({"id": pid, "user_id": user["id"]})
    if not result.deleted_count:
        raise HTTPException(404, "Payout not found")
    return {"ok": True}


# ============= AI COACH (Claude Sonnet 4.5) =============
COACH_SYSTEM = (
    "You are PipsEvo's elite trading psychologist and performance coach for FUNDED traders. "
    "You analyze behavior, discipline, and decision-making only. "
    "You NEVER provide trading signals, market predictions, or specific entries/exits. "
    "Respond in clear sections: Summary, Discipline & Process, Emotional Patterns, "
    "Risk Management, and Concrete Action Plan. Be direct, specific, and use bullet points. "
    "Keep responses under 600 words."
)


@api.post("/coach/ask")
async def coach_ask(body: CoachQuery, user=Depends(get_current_user)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(503, "AI Coach unavailable: missing key")

    accounts = await db.accounts.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    trades = await db.trades.find({"user_id": user["id"]}, {"_id": 0}).sort("date", -1).to_list(100)

    # Build compact context
    ctx_lines = [f"Trader: {user.get('name')} ({user.get('trader_type') or 'unspecified'})"]
    ctx_lines.append(f"Accounts: {len(accounts)} | Total balance: {sum(a.get('balance',0) for a in accounts):.2f}")
    if trades:
        wins = [t for t in trades if t.get("pnl", 0) > 0]
        wr = len(wins) / len(trades) * 100
        plan_pct = sum(1 for t in trades if t.get("plan_respected")) / len(trades) * 100
        ctx_lines.append(f"Last {len(trades)} trades — winrate {wr:.1f}%, plan-respect {plan_pct:.1f}%")
        for t in trades[:20]:
            ctx_lines.append(
                f"- {t.get('date')} {t.get('instrument')} {t.get('direction')} pnl={t.get('pnl')} "
                f"setup={t.get('setup')} session={t.get('session')} emotion={t.get('emotion')} "
                f"plan={t.get('plan_respected')}"
            )
    else:
        ctx_lines.append("No trades logged yet.")

    user_prompt = f"Trader question: {body.question}\n\nContext (focus: {body.context_tag}):\n" + "\n".join(ctx_lines)

    try:
        message = await asyncio.to_thread(
            client_ai.messages.create,
            model="claude-sonnet-4-6",
            max_tokens=1024,
            system=COACH_SYSTEM,
            messages=[{"role": "user", "content": user_prompt}],
        )
        answer = message.content[0].text
    except Exception as e:
        logging.exception("Coach error")
        raise HTTPException(502, f"AI Coach error: {str(e)[:200]}")

    # Persist
    report = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "question": body.question,
        "answer": answer,
        "tag": body.context_tag,
        "created_at": now_utc(),
    }
    await db.ai_reports.insert_one(report)
    report.pop("_id", None)
    return report


@api.get("/coach/history")
async def coach_history(user=Depends(get_current_user)):
    docs = await db.ai_reports.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return docs


# ============= TRADING DNA =============
@api.get("/dna")
async def trading_dna(user=Depends(get_current_user)):
    trades = await db.trades.find({"user_id": user["id"]}, {"_id": 0}).to_list(5000)
    if not trades:
        return {"trader_type": "Untested", "best_session": None, "best_setup": None, "best_conditions": "Insufficient data"}
    by_session: Dict[str, float] = {}
    by_setup: Dict[str, float] = {}
    by_emotion: Dict[str, float] = {}
    for t in trades:
        by_session[t.get("session") or "?"] = by_session.get(t.get("session") or "?", 0) + t.get("pnl", 0)
        by_setup[t.get("setup") or "?"] = by_setup.get(t.get("setup") or "?", 0) + t.get("pnl", 0)
        by_emotion[t.get("emotion") or "?"] = by_emotion.get(t.get("emotion") or "?", 0) + t.get("pnl", 0)
    best_session = max(by_session.items(), key=lambda x: x[1])[0] if by_session else None
    best_setup = max(by_setup.items(), key=lambda x: x[1])[0] if by_setup else None
    best_emotion = max(by_emotion.items(), key=lambda x: x[1])[0] if by_emotion else None
    avg_pnl = sum(t.get("pnl", 0) for t in trades) / len(trades)
    trader_type = "Sniper" if len(trades) < 50 and avg_pnl > 0 else ("Volume Trader" if len(trades) >= 100 else "Developing")
    return {
        "trader_type": trader_type,
        "best_session": best_session,
        "best_setup": best_setup,
        "best_emotion": best_emotion,
        "trades_logged": len(trades),
    }


# ============= STRIPE (mock for now, full integration queued) =============
@api.post("/billing/checkout")
async def billing_checkout(plan: str, user=Depends(get_current_user)):
    # MOCK: Full Stripe integration queued for next iteration
    return {"checkout_url": None, "message": "Stripe checkout coming in next release", "plan": plan}


@api.get("/")
async def root():
    return {"app": "PipsEvo", "status": "ok"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO)


@app.on_event("shutdown")
async def shutdown_db():
    client.close()
