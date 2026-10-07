from __future__ import annotations

import asyncio
import hashlib
import importlib
import json
import logging
import uuid
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from time import monotonic
from typing import Any, Literal
from urllib.parse import urlencode

from pydantic import SecretStr

from ..errors import IntegrationError, public_provider_error
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

logger = logging.getLogger("pipsevo.integrations.ctrader")

# Only fixed, documented error identifiers may appear in diagnostics.
READ_ERROR_CODES = {
    "OA_AUTH_TOKEN_EXPIRED", "ACCOUNT_NOT_AUTHORIZED", "RET_NO_SUCH_LOGIN",
    "ALREADY_LOGGED_IN", "INCORRECT_BOUNDARIES", "RET_ACCOUNT_DISABLED",
    "CONNECTIONS_LIMIT_EXCEEDED", "CH_CLIENT_AUTH_FAILURE",
    "CH_CLIENT_NOT_AUTHENTICATED", "CH_CLIENT_ALREADY_AUTHENTICATED",
    "CH_ACCESS_TOKEN_INVALID", "CH_SERVER_NOT_REACHABLE",
    "CH_CTID_TRADER_ACCOUNT_NOT_FOUND", "CH_OA_CLIENT_NOT_FOUND",
    "REQUEST_FREQUENCY_EXCEEDED", "SERVER_IS_UNDER_MAINTENANCE",
    "CHANNEL_IS_BLOCKED", "INVALID_REQUEST", "SYMBOL_NOT_FOUND",
}

try:
    websockets: Any = importlib.import_module("websockets")
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
            provider_name=self.provider_id,
            provider_authentication=True,
            headers={"Accept": "application/json"},
            params={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": self.redirect_uri,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
        )
        expires = self._token_expiry(data)
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
            provider_name=self.provider_id,
            provider_authentication=True,
            headers={"Accept": "application/json"},
            params={
                "grant_type": "refresh_token",
                "refresh_token": refresh,
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            },
        )
        expires = self._token_expiry(data)
        return {
            "access_token": data["accessToken"],
            "refresh_token": data.get("refreshToken") or refresh,
            "expires_at": expires.isoformat(),
        }

    @staticmethod
    def _token_expiry(data: Any) -> datetime:
        # cTrader can report an OAuth failure in a successful HTTP response.
        # Never expose its description: it may contain credentials or tokens.
        if isinstance(data, dict) and data.get("errorCode"):
            raise IntegrationError(
                "provider_request_rejected",
                "cTrader a refusé l’autorisation. Vérifie la configuration puis reconnecte le compte.",
                400,
            )
        if not isinstance(data, dict) or not isinstance(data.get("accessToken"), str) or not data["accessToken"].strip():
            raise IntegrationError("provider_invalid_response", "cTrader a renvoyé une autorisation inexploitable.", 502)
        try:
            seconds = int(data.get("expiresIn", 0))
            if seconds <= 0:
                raise ValueError("invalid expiry")
            return datetime.now(timezone.utc) + timedelta(seconds=seconds)
        except (TypeError, ValueError, OverflowError):
            raise IntegrationError("provider_invalid_response", "cTrader a renvoyé une autorisation inexploitable.", 502) from None

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
                display_name=str(row["traderLogin"]) if row.get("traderLogin") is not None else f"cTrader {str(row['ctidTraderAccountId'])[-4:]}",
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
        windows: list[tuple[datetime, datetime]] = []
        window_start = start
        while window_start < end and len(windows) < 80:
            window_end = min(window_start + timedelta(days=180), end)
            windows.append((window_start, window_end))
            window_start = window_end + timedelta(milliseconds=1)
        operations = [
            (2102, {"ctidTraderAccountId": account_id, "accessToken": token}, 2103),
            (2114, {"ctidTraderAccountId": account_id, "includeArchivedSymbols": True}, 2115),
            (2121, {"ctidTraderAccountId": account_id}, 2122),
            (2112, {"ctidTraderAccountId": account_id}, 2113),
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
        assets = {
            str(row.get("assetId")): row.get("name")
            for row in responses[3].get("asset", [])
        }
        deals, history_partial = await self._complete_deal_history(
            token,
            account_id,
            account.account_type != "demo",
            windows,
            responses[4:],
        )
        executions: list[ProviderExecutionRecord] = []
        grouped: dict[str, list[dict]] = defaultdict(list)
        for deal in deals:
            status = str(deal.get("dealStatus") or deal.get("status") or "").upper()
            if status and status not in {"FILLED", "2", "PARTIALLY_FILLED", "3"}:
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
            currency=assets.get(str(trader.get("depositAssetId"))) or account.currency,
            captured_at=end,
            raw_payload=trader,
        )
        window_partial = window_start < end
        return SyncBatch(
            trades=trades,
            executions=executions,
            snapshot=snapshot,
            next_cursor={"last_execution_at": latest.isoformat()},
            partial_error=window_partial or history_partial,
            warning_code=(
                "history_window_limit"
                if window_partial
                else "history_chunk_limit"
                if history_partial
                else None
            ),
        )

    async def _complete_deal_history(
        self,
        token: str,
        account_id: int,
        live: bool,
        windows: list[tuple[datetime, datetime]],
        responses: list[dict],
    ) -> tuple[list[dict], bool]:
        pending = [
            (window_from, window_to, response, 0)
            for (window_from, window_to), response in zip(windows, responses)
        ]
        completed: list[dict] = []
        partial = len(responses) != len(windows)
        processed_segments = len(pending)

        while pending:
            split_windows: list[tuple[datetime, datetime, int]] = []
            for window_from, window_to, response, depth in pending:
                rows = list(response.get("deal", []) or [])
                if not response.get("hasMore"):
                    completed.extend(rows)
                    continue
                span_ms = int((window_to - window_from).total_seconds() * 1000)
                if depth >= 24 or span_ms <= 1 or processed_segments >= 512:
                    completed.extend(rows)
                    partial = True
                    continue
                midpoint = window_from + (window_to - window_from) / 2
                split_windows.extend(
                    [
                        (window_from, midpoint, depth + 1),
                        (midpoint + timedelta(milliseconds=1), window_to, depth + 1),
                    ]
                )

            if not split_windows:
                break
            processed_segments += len(split_windows)
            operations = [
                (2102, {"ctidTraderAccountId": account_id, "accessToken": token}, 2103)
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
                for window_from, window_to, _depth in split_windows
            )
            split_responses = await self._session(token, operations, live=live)
            deal_responses = split_responses[1:]
            if len(deal_responses) != len(split_windows):
                partial = True
            pending = [
                (window_from, window_to, response, depth)
                for (window_from, window_to, depth), response in zip(
                    split_windows, deal_responses
                )
            ]

        unique = {
            str(row.get("dealId")): row
            for row in completed
            if row.get("dealId") is not None
        }
        return list(unique.values()), partial

    @staticmethod
    def _group_trade(position_id: str, rows: list[dict], symbols: dict[str, str]):
        rows = sorted(rows, key=lambda row: int(row.get("executionTimestamp", 0)))
        if not rows:
            return None
        opened = rows[0]
        open_side: Literal["long", "short"] = (
            "long"
            if str(opened.get("tradeSide")).upper() in {"BUY", "1"}
            else "short"
        )

        def direction(row: dict) -> str:
            return "long" if str(row.get("tradeSide")).upper() in {"BUY", "1"} else "short"

        def quantity(row: dict) -> Decimal:
            # int64 values may be strings in ProtoJSON. Convert before abs().
            return abs(Decimal(str(row.get("filledVolume") or 0))) / Decimal("100")

        opening = [
            row
            for row in rows
            if not row.get("closePositionDetail") and direction(row) == open_side
        ] or [opened]
        closing = [
            row
            for row in rows
            if row.get("closePositionDetail") or direction(row) != open_side
        ]

        def weighted_price(items: list[dict]) -> Decimal | None:
            total = sum((quantity(item) for item in items), Decimal("0"))
            if total <= 0:
                return None
            return sum(
                (
                    Decimal(str(item.get("executionPrice") or item.get("price") or 0))
                    * quantity(item)
                    for item in items
                ),
                Decimal("0"),
            ) / total

        open_price = weighted_price(opening)
        if open_price is None:
            return None
        opened_volume = sum((quantity(item) for item in opening), Decimal("0"))
        closed_volume = sum((quantity(item) for item in closing), Decimal("0"))
        fully_closed = bool(closing) and closed_volume >= opened_volume
        return ProviderTradeRecord(
            provider_trade_id=position_id,
            provider_order_id=str(opened.get("orderId")) if opened.get("orderId") is not None else None,
            provider_position_id=position_id,
            symbol=symbols.get(str(opened.get("symbolId")), str(opened.get("symbolId"))),
            direction=open_side,
            volume=opened_volume,
            open_time=datetime.fromtimestamp(int(opened.get("executionTimestamp", 0)) / 1000, timezone.utc),
            close_time=(
                datetime.fromtimestamp(
                    int(closing[-1].get("executionTimestamp", 0)) / 1000,
                    timezone.utc,
                )
                if fully_closed
                else None
            ),
            open_price=open_price,
            close_price=weighted_price(closing) if fully_closed else None,
            gross_profit=sum(
                (
                    CTraderConnector._money(
                        row, (row.get("closePositionDetail") or {}).get("grossProfit")
                    )
                    for row in closing
                ),
                Decimal("0"),
            ),
            commission=sum(
                (
                    CTraderConnector._money(row, row.get("commission"))
                    for row in rows
                ),
                Decimal("0"),
            ),
            swap=sum(
                (
                    CTraderConnector._money(
                        row, (row.get("closePositionDetail") or {}).get("swap")
                    )
                    for row in closing
                ),
                Decimal("0"),
            ),
            market_type="cfd",
            raw_payload={"deals": rows},
        )

    @staticmethod
    def _money(row: dict, value) -> Decimal:
        digits = row.get("moneyDigits")
        if digits is None:
            digits = (row.get("closePositionDetail") or {}).get("moneyDigits")
        digits = int(digits if digits is not None else 2)
        return Decimal(str(value or 0)) / Decimal(10**digits)

    async def _session(self, token: str, operations: list[tuple[int, dict, int]], live: bool = True) -> list[dict]:
        if websockets is None:
            raise IntegrationError("provider_dependency_missing", "Le connecteur cTrader n’est pas installé sur ce serveur.", 503)
        host = "live.ctraderapi.com" if live else "demo.ctraderapi.com"
        url = f"wss://{host}:5036"
        responses: list[dict] = []
        async with websockets.connect(url, open_timeout=20, close_timeout=5) as socket:
            await self._send(socket, 2100, {"clientId": self.client_id, "clientSecret": self.client_secret}, 2101)
            last_historical_request = 0.0
            for request_type, payload, response_type in operations:
                if request_type == 2133:
                    delay = 0.21 - (monotonic() - last_historical_request)
                    if delay > 0:
                        await asyncio.sleep(delay)
                    last_historical_request = monotonic()
                responses.append(await self._send(socket, request_type, payload, response_type))
        return responses

    @staticmethod
    async def _send(socket, payload_type: int, payload: dict, expected: int) -> dict:
        client_id = str(uuid.uuid4())
        await socket.send(json.dumps({"clientMsgId": client_id, "payloadType": payload_type, "payload": payload}))
        while True:
            raw = json.loads(await asyncio.wait_for(socket.recv(), timeout=30))
            if raw.get("payloadType") == 2142:
                provider_code = (raw.get("payload") or {}).get("errorCode")
                logger.warning(
                    "ctrader_read_request_failed request_type=%s error_code=%s",
                    payload_type,
                    provider_code if provider_code in READ_ERROR_CODES else "unknown",
                )
                if provider_code == "RET_ACCOUNT_DISABLED":
                    raise IntegrationError(
                        "provider_account_disabled",
                        public_provider_error("provider_account_disabled"),
                        409,
                    )
                raise IntegrationError("provider_error", "cTrader a refusé la requête de lecture.", 502)
            if raw.get("clientMsgId") == client_id or raw.get("payloadType") == expected:
                return raw.get("payload") or {}
