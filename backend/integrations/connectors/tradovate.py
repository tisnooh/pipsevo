from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from urllib.parse import urlencode

from pydantic import SecretStr

from ..errors import IntegrationError
from ..models import (
    AccountSnapshot,
    AuthenticationResult,
    AuthTokens,
    DetectedAccount,
    IntegrationAccount,
    ProviderExecutionRecord,
    ProviderTradeRecord,
    SyncBatch,
)
from ..providers import TradingConnector
from .http import request_json


class TradovateConnector(TradingConnector):
    provider_id = "tradovate"
    platforms = ("tradovate",)
    auth_type = "oauth2"

    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.live_url = "https://live.tradovateapi.com/v1"

    async def start_auth(self, *, state: str, **_kwargs) -> dict:
        return {
            "authorization_url": "https://trader.tradovate.com/oauth?"
            + urlencode(
                {
                    "response_type": "code",
                    "client_id": self.client_id,
                    "redirect_uri": self.redirect_uri,
                    "state": state,
                }
            ),
            "state": state,
        }

    async def complete_auth(self, *, code: str, **_kwargs) -> AuthenticationResult:
        data = await request_json(
            "POST",
            "https://live.tradovateapi.com/auth/oauthtoken",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "grant_type": "authorization_code",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "redirect_uri": self.redirect_uri,
                "code": code,
            },
        )
        token = data.get("access_token") or data.get("accessToken")
        if not token:
            raise IntegrationError("provider_invalid_response", "Tradovate n’a pas renvoyé de jeton.", 502)
        expires = datetime.now(timezone.utc) + timedelta(seconds=int(data.get("expires_in", 5400)))
        access = {
            "access_token": token,
            "refresh_token": data.get("refresh_token") or data.get("refreshToken"),
            "expires_at": expires.isoformat(),
        }
        accounts = await self.list_accounts(access)
        return AuthenticationResult(
            tokens=AuthTokens(
                access_token=SecretStr(token),
                refresh_token=SecretStr(access["refresh_token"]) if access.get("refresh_token") else None,
                expires_at=expires,
                scope="read",
            ),
            external_connection_id=str(data.get("userId") or f"tradovate:{uuid.uuid4()}"),
            accounts=accounts,
        )

    async def refresh_auth(self, access: dict) -> dict:
        refresh = access.get("refresh_token")
        if not refresh:
            raise IntegrationError("connection_expired", "Reconnecte Tradovate pour continuer.", 401)
        data = await request_json(
            "POST",
            "https://live.tradovateapi.com/auth/oauthtoken",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data={
                "grant_type": "refresh_token",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
                "refresh_token": refresh,
            },
        )
        expires = datetime.now(timezone.utc) + timedelta(seconds=int(data.get("expires_in", 5400)))
        return {
            "access_token": data.get("access_token") or data.get("accessToken"),
            "refresh_token": data.get("refresh_token") or data.get("refreshToken") or refresh,
            "expires_at": expires.isoformat(),
        }

    async def list_accounts(self, access: dict) -> list[DetectedAccount]:
        rows = await request_json("GET", f"{self.live_url}/account/list", headers=self._headers(access))
        return [
            DetectedAccount(
                external_account_id=str(row["id"]),
                broker_name="Tradovate",
                server_name="Tradovate Live" if row.get("active") else "Tradovate",
                account_number_masked=f"•••• {str(row.get('name') or row['id'])[-4:]}",
                account_type="real" if row.get("active") else "unknown",
                display_name=row.get("name"),
                provider_metadata={"user_id": row.get("userId")},
            )
            for row in rows or []
        ]

    async def sync_historical(self, account: IntegrationAccount, access: dict) -> SyncBatch:
        return await self._sync(account, access, datetime.now(timezone.utc) - timedelta(days=3650))

    async def sync_recent(self, account: IntegrationAccount, access: dict, cursor: dict) -> SyncBatch:
        value = cursor.get("last_execution_at")
        start = datetime.fromisoformat(value.replace("Z", "+00:00")) - timedelta(minutes=5) if value else datetime.now(timezone.utc) - timedelta(days=7)
        return await self._sync(account, access, start)

    async def _sync(self, account: IntegrationAccount, access: dict, start: datetime) -> SyncBatch:
        headers = self._headers(access)
        fills = await request_json("GET", f"{self.live_url}/fill/list", headers=headers)
        pairs = await request_json("GET", f"{self.live_url}/fillPair/list", headers=headers)
        snapshots = await request_json("GET", f"{self.live_url}/cashBalance/getcashbalancesnapshot", headers=headers, params={"accountId": account.external_account_id})
        by_id = {str(row["id"]): row for row in fills or [] if str(row.get("accountId")) == account.external_account_id}
        executions: list[ProviderExecutionRecord] = []
        latest = start
        for row in by_id.values():
            executed = self._time(row.get("timestamp") or row.get("tradeDate"))
            if executed < start:
                continue
            latest = max(latest, executed)
            action = str(row.get("action") or "").lower()
            executions.append(
                ProviderExecutionRecord(
                    provider_execution_id=str(row["id"]),
                    provider_order_id=str(row.get("orderId")) if row.get("orderId") else None,
                    symbol=str(row.get("contractId") or row.get("symbol") or "UNKNOWN"),
                    direction="long" if action in {"buy", "buytocover"} else "short",
                    quantity=Decimal(str(abs(row.get("qty") or 0))),
                    price=Decimal(str(row.get("price") or 0)),
                    executed_at=executed,
                    raw_payload=row,
                )
            )
        trades: list[ProviderTradeRecord] = []
        for pair in pairs or []:
            if str(pair.get("accountId")) != account.external_account_id:
                continue
            entry = by_id.get(str(pair.get("entryFillId") or pair.get("buyFillId")))
            exit_fill = by_id.get(str(pair.get("exitFillId") or pair.get("sellFillId")))
            if not entry or not exit_fill:
                continue
            opened = self._time(entry.get("timestamp"))
            closed = self._time(exit_fill.get("timestamp"))
            if closed < start:
                continue
            direction = "long" if str(entry.get("action", "")).lower() in {"buy", "buytocover"} else "short"
            trades.append(
                ProviderTradeRecord(
                    provider_trade_id=str(pair.get("id") or f"{entry['id']}:{exit_fill['id']}"),
                    provider_order_id=str(entry.get("orderId")) if entry.get("orderId") else None,
                    symbol=str(entry.get("contractId") or "UNKNOWN"),
                    direction=direction,
                    volume=Decimal(str(abs(pair.get("qty") or entry.get("qty") or 0))),
                    open_time=opened,
                    close_time=closed,
                    open_price=Decimal(str(entry.get("price") or 0)),
                    close_price=Decimal(str(exit_fill.get("price") or 0)),
                    gross_profit=Decimal(str(pair.get("profitLoss") or 0)),
                    market_type="futures",
                    raw_payload={"pair": pair, "entry": entry, "exit": exit_fill},
                )
            )
        snapshot_row = snapshots[-1] if isinstance(snapshots, list) and snapshots else snapshots or {}
        snapshot = AccountSnapshot(
            balance=self._decimal(snapshot_row.get("totalCashValue") or snapshot_row.get("amount")),
            equity=self._decimal(snapshot_row.get("netLiq") or snapshot_row.get("totalCashValue")),
            currency="USD",
            captured_at=datetime.now(timezone.utc),
            raw_payload=snapshot_row,
        )
        return SyncBatch(
            trades=trades,
            executions=executions,
            snapshot=snapshot,
            next_cursor={"last_execution_at": latest.isoformat()},
        )

    @staticmethod
    def _headers(access: dict) -> dict[str, str]:
        return {"Authorization": f"Bearer {access['access_token']}", "Content-Type": "application/json"}

    @staticmethod
    def _time(value) -> datetime:
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value / 1000 if value > 10_000_000_000 else value, timezone.utc)
        if value:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc)
        return datetime.now(timezone.utc)

    @staticmethod
    def _decimal(value):
        return Decimal(str(value)) if value is not None else None
