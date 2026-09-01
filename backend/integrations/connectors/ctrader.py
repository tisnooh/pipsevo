from __future__ import annotations

import asyncio
import hashlib
import json
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from urllib.parse import urlencode

from pydantic import SecretStr

from ..errors import IntegrationError
from ..models import (
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

try:
    import websockets
except ImportError:  # pragma: no cover - startup capability will remain unavailable
    websockets = None


class CTraderConnector(TradingConnector):
    provider_id = "ctrader"
    platforms = ("ctrader",)
    auth_type = "oauth2"

    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri

    async def start_auth(self, *, state: str, **_kwargs) -> dict:
        query = urlencode(
            {
                "client_id": self.client_id,
                "redirect_uri": self.redirect_uri,
                "scope": "accounts",
                "product": "web",
                "state": state,
            }
        )
        return {
            "authorization_url": f"https://id.ctrader.com/my/settings/openapi/grantingaccess/?{query}",
            "state": state,
        }

    async def complete_auth(self, *, code: str, **_kwargs) -> AuthenticationResult:
        data = await request_json(
            "GET",
            "https://openapi.ctrader.com/apps/token",
            params={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": self.redirect_uri,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
        )
        expires = datetime.now(timezone.utc) + timedelta(seconds=int(data.get("expiresIn", 0) or 0))
        access = {
            "access_token": data["accessToken"],
            "refresh_token": data.get("refreshToken"),
            "expires_at": expires.isoformat(),
        }
        accounts = await self.list_accounts(access)
        account_fingerprint = hashlib.sha256(
            ":".join(sorted(item.external_account_id for item in accounts)).encode("utf-8")
        ).hexdigest()[:32]
        return AuthenticationResult(
            tokens=AuthTokens(
                access_token=SecretStr(data["accessToken"]),
                refresh_token=SecretStr(data["refreshToken"]) if data.get("refreshToken") else None,
                expires_at=expires,
                scope="accounts",
            ),
            external_connection_id=f"accounts:{account_fingerprint}",
            accounts=accounts,
        )

    async def refresh_auth(self, access: dict) -> dict:
        refresh = access.get("refresh_token")
        if not refresh:
            raise IntegrationError("connection_expired", "Reconnecte cTrader pour continuer.", 401)
        data = await request_json(
            "GET",
            "https://openapi.ctrader.com/apps/token",
            params={
                "grant_type": "refresh_token",
                "refresh_token": refresh,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
        )
        expires = datetime.now(timezone.utc) + timedelta(seconds=int(data.get("expiresIn", 0) or 0))
        return {
            "access_token": data["accessToken"],
            "refresh_token": data.get("refreshToken") or refresh,
            "expires_at": expires.isoformat(),
        }

    async def list_accounts(self, access: dict) -> list[DetectedAccount]:
        payload = await self._session(
            access["access_token"],
            [(2149, {"accessToken": access["access_token"]}, 2150)],
        )
        rows = payload[-1].get("ctidTraderAccount", [])
        return [
            DetectedAccount(
                external_account_id=str(row["ctidTraderAccountId"]),
                broker_name=row.get("brokerTitle") or row.get("brokerName"),
                server_name="cTrader Live" if row.get("isLive") else "cTrader Demo",
                account_number_masked=f"•••• {str(row['ctidTraderAccountId'])[-4:]}",
                account_type="real" if row.get("isLive") else "demo",
                display_name=row.get("traderLogin") or f"cTrader {str(row['ctidTraderAccountId'])[-4:]}",
                provider_metadata={"is_live": bool(row.get("isLive"))},
            )
            for row in rows
        ]

    async def sync_historical(self, account: IntegrationAccount, access: dict) -> SyncBatch:
        start = datetime.now(timezone.utc) - timedelta(days=3650)
        return await self._sync(account, access, start)

    async def sync_recent(self, account: IntegrationAccount, access: dict, cursor: dict) -> SyncBatch:
        previous = cursor.get("last_execution_at")
        start = datetime.fromisoformat(previous.replace("Z", "+00:00")) - timedelta(minutes=5) if previous else datetime.now(timezone.utc) - timedelta(days=7)
        return await self._sync(account, access, start)

    async def _sync(self, account: IntegrationAccount, access: dict, start: datetime) -> SyncBatch:
        token = access["access_token"]
        account_id = int(account.external_account_id)
        end = datetime.now(timezone.utc)
        windows = []
        window_start = start
        while window_start < end and len(windows) < 80:
            window_end = min(window_start + timedelta(days=180), end)
            windows.append((window_start, window_end))
            window_start = window_end + timedelta(milliseconds=1)
        operations = [
            (2102, {"ctidTraderAccountId": account_id, "accessToken": token}, 2103),
            (2114, {"ctidTraderAccountId": account_id, "includeArchivedSymbols": True}, 2115),
            (2121, {"ctidTraderAccountId": account_id}, 2122),
        ]
        operations.extend(
            (
                2133,
                {
                    "ctidTraderAccountId": account_id,
                    "fromTimestamp": int(window_from.timestamp() * 1000),
                    "toTimestamp": int(window_to.timestamp() * 1000),
                },
                2134,
            )
            for window_from, window_to in windows
        )
        responses = await self._session(
            token,
            operations,
            live=account.account_type != "demo",
        )
        symbols = {
            str(row.get("symbolId")): row.get("symbolName") or str(row.get("symbolId"))
            for row in responses[1].get("symbol", [])
        }
        trader = responses[2].get("trader", {})
        deals = [deal for response in responses[3:] for deal in response.get("deal", [])]
        executions: list[ProviderExecutionRecord] = []
        grouped: dict[str, list[dict]] = defaultdict(list)
        for deal in deals:
            status = str(deal.get("dealStatus") or deal.get("status") or "").upper()
            if status and status not in {"FILLED", "2"}:
                continue
            position_id = str(deal.get("positionId") or deal.get("orderId") or deal.get("dealId"))
            grouped[position_id].append(deal)
            executed_at = datetime.fromtimestamp(int(deal.get("executionTimestamp", 0)) / 1000, timezone.utc)
            executions.append(
                ProviderExecutionRecord(
                    provider_execution_id=str(deal["dealId"]),
                    provider_order_id=str(deal.get("orderId")) if deal.get("orderId") is not None else None,
                    provider_position_id=position_id,
                    symbol=symbols.get(str(deal.get("symbolId")), str(deal.get("symbolId"))),
                    direction="long" if str(deal.get("tradeSide")).upper() in {"BUY", "1"} else "short",
                    quantity=Decimal(str(deal.get("filledVolume", 0))) / Decimal("100"),
                    price=Decimal(str(deal.get("executionPrice") or deal.get("price") or 0)),
                    executed_at=executed_at,
                    commission=self._money(deal, deal.get("commission")),
                    raw_payload=deal,
                )
            )
        trades = [self._group_trade(key, rows, symbols) for key, rows in grouped.items()]
        trades = [trade for trade in trades if trade is not None]
        latest = max((item.executed_at for item in executions), default=end)
        from ..models import AccountSnapshot
        snapshot = AccountSnapshot(
            balance=Decimal(str(trader.get("balance", 0))) / Decimal(10 ** int(trader.get("moneyDigits", 2))),
            equity=None,
            currency=str(trader.get("depositAssetId")) if trader.get("depositAssetId") else None,
            captured_at=end,
            raw_payload=trader,
        )
        return SyncBatch(
            trades=trades,
            executions=executions,
            snapshot=snapshot,
            next_cursor={"last_execution_at": latest.isoformat()},
            partial_error=window_start < end,
            warning_code="history_window_limit" if window_start < end else None,
        )

    @staticmethod
    def _group_trade(position_id: str, rows: list[dict], symbols: dict[str, str]):
        rows = sorted(rows, key=lambda row: int(row.get("executionTimestamp", 0)))
        if not rows:
            return None
        opened, closed = rows[0], rows[-1]
        open_side = "long" if str(opened.get("tradeSide")).upper() in {"BUY", "1"} else "short"
        same_fill = len(rows) == 1
        return ProviderTradeRecord(
            provider_trade_id=position_id,
            provider_order_id=str(opened.get("orderId")) if opened.get("orderId") is not None else None,
            provider_position_id=position_id,
            symbol=symbols.get(str(opened.get("symbolId")), str(opened.get("symbolId"))),
            direction=open_side,
            volume=Decimal(str(opened.get("filledVolume", 0))) / Decimal("100"),
            open_time=datetime.fromtimestamp(int(opened.get("executionTimestamp", 0)) / 1000, timezone.utc),
            close_time=None if same_fill else datetime.fromtimestamp(int(closed.get("executionTimestamp", 0)) / 1000, timezone.utc),
            open_price=Decimal(str(opened.get("executionPrice") or opened.get("price") or 0)),
            close_price=None if same_fill else Decimal(str(closed.get("executionPrice") or closed.get("price") or 0)),
            gross_profit=CTraderConnector._money(closed, (closed.get("closePositionDetail") or {}).get("grossProfit")),
            commission=sum(CTraderConnector._money(row, row.get("commission")) for row in rows),
            swap=CTraderConnector._money(closed, (closed.get("closePositionDetail") or {}).get("swap")),
            market_type="cfd",
            raw_payload={"deals": rows},
        )

    @staticmethod
    def _money(row: dict, value) -> Decimal:
        digits = int(row.get("moneyDigits") or (row.get("closePositionDetail") or {}).get("moneyDigits") or 2)
        return Decimal(str(value or 0)) / Decimal(10**digits)

    async def _session(self, token: str, operations: list[tuple[int, dict, int]], live: bool = True) -> list[dict]:
        if websockets is None:
            raise IntegrationError("provider_dependency_missing", "Le connecteur cTrader n’est pas installé sur ce serveur.", 503)
        host = "live.ctraderapi.com" if live else "demo.ctraderapi.com"
        url = f"wss://{host}:5036"
        responses: list[dict] = []
        async with websockets.connect(url, open_timeout=20, close_timeout=5) as socket:
            await self._send(socket, 2100, {"clientId": self.client_id, "clientSecret": self.client_secret}, 2101)
            for request_type, payload, response_type in operations:
                responses.append(await self._send(socket, request_type, payload, response_type))
        return responses

    @staticmethod
    async def _send(socket, payload_type: int, payload: dict, expected: int) -> dict:
        client_id = str(uuid.uuid4())
        await socket.send(json.dumps({"clientMsgId": client_id, "payloadType": payload_type, "payload": payload}))
        while True:
            raw = json.loads(await asyncio.wait_for(socket.recv(), timeout=30))
            if raw.get("payloadType") == 2142:
                raise IntegrationError("provider_error", "cTrader a refusé la requête de lecture.", 502)
            if raw.get("clientMsgId") == client_id or raw.get("payloadType") == expected:
                return raw.get("payload") or {}
