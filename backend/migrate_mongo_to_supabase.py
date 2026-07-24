"""Migration non destructive de MongoDB vers Supabase.

Par défaut le script effectue uniquement un audit. Utiliser --apply pour écrire.
La clé service_role ne doit être utilisée que localement pour cette migration.
"""

import argparse
import os
from datetime import date, datetime
from typing import Any, Dict, Iterable, List

import requests
from dotenv import load_dotenv
from pymongo import MongoClient

load_dotenv()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
MONGO_URL = os.environ.get("MONGO_URL", "")
DB_NAME = os.environ.get("DB_NAME", "pipsevo")


def json_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: json_value(item) for key, item in value.items() if key != "_id"}
    if isinstance(value, list):
        return [json_value(item) for item in value]
    return value


def documents(collection) -> List[Dict[str, Any]]:
    return [json_value(item) for item in collection.find({}, {"_id": 0})]


def headers(prefer: str = "resolution=merge-duplicates,return=minimal") -> Dict[str, str]:
    return {
        "apikey": SERVICE_KEY,
        "Authorization": f"Bearer {SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": prefer,
    }


def upsert(table: str, rows: Iterable[Dict[str, Any]], chunk_size: int = 200) -> int:
    values = list(rows)
    for start in range(0, len(values), chunk_size):
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/{table}",
            headers=headers(),
            params={"on_conflict": "id" if table != "subscriptions" else "user_id"},
            json=values[start:start + chunk_size],
            timeout=60,
        )
        response.raise_for_status()
    return len(values)


def create_auth_user(user: Dict[str, Any]) -> None:
    payload = {
        "id": user["id"],
        "email": user["email"],
        "email_confirm": True,
        "user_metadata": {"name": user.get("name") or user["email"].split("@")[0]},
    }
    if user.get("password_hash"):
        payload["password_hash"] = user["password_hash"]
    response = requests.post(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        headers=headers("return=representation"),
        json=payload,
        timeout=30,
    )
    if response.status_code not in (200, 201, 409, 422):
        response.raise_for_status()


def normalize_trade(item: Dict[str, Any]) -> Dict[str, Any]:
    allowed = {
        "id", "user_id", "account_id", "date", "instrument", "direction", "entry", "stop",
        "take_profit", "exit_price", "pnl", "result_status", "market_type", "setup", "setups",
        "session", "emotion", "emotion_secondary", "emotion_intensity", "notes", "plan_respected",
        "screenshots", "r", "size", "duration", "duration_minutes", "entry_time", "exit_time",
        "point_value", "commission", "mistakes", "exit_reason", "plan_exception_reason", "tags",
        "checklist_results", "starred", "created_at", "updated_at",
    }
    row = {key: value for key, value in item.items() if key in allowed}
    status = row.get("result_status")
    if status in (None, "closed"):
        pnl = row.get("pnl")
        row["result_status"] = "winner" if pnl is not None and pnl > 0 else "loser" if pnl is not None and pnl < 0 else "breakeven"
    elif status == "canceled":
        row["result_status"] = "cancelled"
    row.setdefault("size", 1)
    row.setdefault("commission", 0)
    row.setdefault("setups", [row["setup"]] if row.get("setup") else [])
    row.setdefault("mistakes", [])
    row.setdefault("tags", [])
    row.setdefault("screenshots", [])
    row.setdefault("checklist_results", [])
    row.setdefault("plan_respected", True)
    return row


def main(apply: bool) -> None:
    if not MONGO_URL:
        raise SystemExit("MONGO_URL manque.")
    mongo = MongoClient(MONGO_URL)[DB_NAME]
    source = {name: documents(mongo[name]) for name in (
        "users", "accounts", "trades", "payouts", "ai_reports", "contact_messages"
    )}
    print("Audit MongoDB:", {name: len(rows) for name, rows in source.items()})
    if not apply:
        print("Aucune écriture. Relancer avec --apply après avoir vérifié les volumes.")
        return
    if not SUPABASE_URL or not SERVICE_KEY:
        raise SystemExit("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manque.")

    for user in source["users"]:
        create_auth_user(user)

    profiles = [{
        "id": user["id"], "email": user["email"], "name": user.get("name") or "Trader",
        "trader_type": user.get("trader_type"), "prop_firms": user.get("prop_firms", []),
        "num_accounts": user.get("num_accounts", 0), "onboarded": user.get("onboarded", False),
        "rules": user.get("rules", {}), "journal_preferences": user.get("journal_preferences", {}),
        "app_preferences": user.get("app_preferences", {}),
    } for user in source["users"]]
    subscriptions = [{
        "user_id": user["id"], "plan": user.get("plan", "free"),
        "status": user.get("subscription_status", "inactive"),
    } for user in source["users"]]
    upsert("profiles", profiles)
    upsert("subscriptions", subscriptions)

    account_fields = {"id", "user_id", "name", "firm", "market_type", "balance", "initial_balance", "profit_target", "max_drawdown", "daily_loss_limit", "current_drawdown", "status", "created_at", "updated_at"}
    accounts = [{key: value for key, value in item.items() if key in account_fields} for item in source["accounts"]]
    final_accounts = [dict(item) for item in accounts]
    for item in accounts:
        item["balance"] = item.get("initial_balance", item.get("balance", 0))
        item.setdefault("current_drawdown", 0)
    upsert("accounts", accounts)
    upsert("trades", [normalize_trade(item) for item in source["trades"]])
    upsert("accounts", final_accounts)

    payout_fields = {"id", "user_id", "account_id", "amount", "date", "note", "created_at", "updated_at"}
    report_fields = {"id", "user_id", "question", "answer", "tag", "model", "created_at"}
    contact_fields = {"id", "name", "email", "subject", "message", "status", "created_at"}
    upsert("payouts", [{key: value for key, value in item.items() if key in payout_fields} for item in source["payouts"]])
    upsert("ai_reports", [{key: value for key, value in item.items() if key in report_fields} for item in source["ai_reports"]])
    upsert("contact_messages", [{key: value for key, value in item.items() if key in contact_fields} for item in source["contact_messages"]])
    print("Migration terminée. Vérifier les volumes et tester un compte avant la bascule DNS.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Écrit réellement dans Supabase")
    main(parser.parse_args().apply)
