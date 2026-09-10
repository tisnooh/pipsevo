from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from decimal import Decimal

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
    TradeLockerCredentials,
)
from ..providers import TradingConnector
from .http import request_json


class TradeLockerConnector(TradingConnector):
    provider_id = "tradelocker"
    platforms = ("tradelocker",)
    auth_type = "jwt"

    def __init__(
        self, demo_url: str, live_url: str, developer_api_key: str | None = None
    ):
        self.urls = {"demo": demo_url, "live": live_url}
        self.developer_api_key = developer_api_key

    async def authenticate(
        self, request: TradeLockerCredentials
    ) -> AuthenticationResult:
        base = self.urls[request.environment]
        try:
            data = await request_json(
                "POST",
                f"{base}/auth/jwt/token",
                expected=(200, 201),
                provider_name=self.provider_id,
                json={
                    "email": request.email,
                    "password": request.password.get_secret_value(),
                    "server": request.server,
                },
            )
        except IntegrationError as exc:
            if exc.code in {"invalid_credentials", "provider_request_rejected"}:
                raise IntegrationError(
                    "tradelocker_credentials_required",
                    "Utilise les identifiants fournis par ton broker ou ta prop firm. "
                    "La connexion Google ou Apple du profil TradeLocker n’est pas "
                    "acceptée par l’API publique.",
                    401,
                ) from None
            raise
        access_token = data.get("accessToken") or data.get("access_token")
        refresh_token = data.get("refreshToken") or data.get("refresh_token")
        if not access_token:
            raise IntegrationError(
                "provider_invalid_response",
                "TradeLocker n’a pas renvoyé de jeton d’accès.",
                502,
            )
        expires_at = self._expiry(data)
        access = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "expires_at": expires_at.isoformat(),
            "environment": request.environment,
            "server": request.server,
        }
        accounts = await self.list_accounts(access)
        return AuthenticationResult(
            tokens=AuthTokens(
                access_token=SecretStr(access_token),
                refresh_token=SecretStr(refresh_token) if refresh_token else None,
                expires_at=expires_at,
                scope="read",
            ),
            external_connection_id=f"{request.environment}:{request.server}:{request.email.lower()}",
            accounts=accounts,
            provider_metadata={
                "environment": request.environment,
                "server": request.server,
            },
        )

    async def refresh_auth(self, access: dict) -> dict:
        base = self.urls[access.get("environment", "demo")]
        refresh_token = access.get("refresh_token")
        if not refresh_token:
            raise IntegrationError(
                "connection_expired",
                "Reconnecte TradeLocker pour continuer.",
                401,
            )
        data = await request_json(
            "POST",
            f"{base}/auth/jwt/refresh",
            expected=(200, 201),
            provider_name=self.provider_id,
            json={"refreshToken": refresh_token},
        )
        access_token = data.get("accessToken") or data.get("access_token")
        if not access_token:
            raise IntegrationError(
                "connection_expired",
                "Reconnecte TradeLocker pour continuer.",
                401,
            )
        return {
            **access,
            "access_token": access_token,
            "refresh_token": data.get("refreshToken")
            or data.get("refresh_token")
            or access.get("refresh_token"),
            "expires_at": self._expiry(data).isoformat(),
        }

    async def list_accounts(self, access: dict) -> list[DetectedAccount]:
        base = self.urls[access.get("environment", "demo")]
        rows = await request_json(
            "GET",
            f"{base}/auth/jwt/all-accounts",
            provider_name=self.provider_id,
            headers=self._headers(access),
        )
        rows = self._unwrap(rows, "accounts")
        return [self._account(row, access) for row in rows or []]

    async def sync_historical(
        self, account: IntegrationAccount, access: dict
    ) -> SyncBatch:
        return await self._sync(
            account, access, datetime.now(timezone.utc) - timedelta(days=3650)
        )

    async def sync_recent(
        self, account: IntegrationAccount, access: dict, cursor: dict
    ) -> SyncBatch:
        value = cursor.get("last_execution_at")
        start = (
            datetime.fromisoformat(value.replace("Z", "+00:00")) - timedelta(minutes=5)
            if value
            else datetime.now(timezone.utc) - timedelta(days=7)
        )
        return await self._sync(account, access, start)

    async def _sync(
        self, account: IntegrationAccount, access: dict, start: datetime
    ) -> SyncBatch:
        base = self.urls[access.get("environment", "demo")]
        acc_num = account.provider_metadata.get("acc_num")
        if acc_num is None:
            raise IntegrationError(
                "provider_account_metadata_missing",
                "Reconnecte TradeLocker pour actualiser les identifiants du compte.",
                409,
            )
        headers = self._headers(access, str(acc_num))
        config = await request_json(
            "GET",
            f"{base}/trade/config",
            provider_name=self.provider_id,
            headers=headers,
        )
        end = datetime.now(timezone.utc)
        row_limit = self._orders_history_limit(config)
        raw_rows, history_partial = await self._order_history(
            base,
            account.external_account_id,
            headers,
            start,
            end,
            row_limit,
        )
        state = await request_json(
            "GET",
            f"{base}/trade/accounts/{account.external_account_id}/state",
            provider_name=self.provider_id,
            headers=headers,
        )
        instruments_payload = await request_json(
            "GET",
            f"{base}/trade/accounts/{account.external_account_id}/instruments",
            provider_name=self.provider_id,
            headers=headers,
        )
        order_columns = self._columns(config, "ordersHistoryConfig")
        instruments = self._unwrap(instruments_payload, "instruments")
        symbol_by_id = {
            str(row.get("tradableInstrumentId") or row.get("id")): str(
                row.get("name")
                or row.get("symbol")
                or row.get("tradableInstrumentId")
                or row.get("id")
            )
            for row in instruments or []
            if isinstance(row, dict)
            and (
                row.get("tradableInstrumentId") is not None or row.get("id") is not None
            )
        }
        executions: list[ProviderExecutionRecord] = []
        positions: dict[str, list[dict]] = defaultdict(list)
        latest = start
        for raw in raw_rows or []:
            row = self._row(raw, order_columns)
            filled = Decimal(
                str(row.get("filledQty") or row.get("qty") or row.get("quantity") or 0)
            )
            price = Decimal(str(row.get("avgPrice") or row.get("price") or 0))
            if filled <= 0 or price <= 0:
                continue
            executed = self._time(
                row.get("filledAt")
                or row.get("createdAt")
                or row.get("createdDate")
                or row.get("timestamp")
            )
            latest = max(latest, executed)
            side = str(row.get("side") or row.get("type") or "").lower()
            position_id = str(
                row.get("positionId") or row.get("orderId") or row.get("id")
            )
            symbol = symbol_by_id.get(
                str(row.get("tradableInstrumentId")),
                str(row.get("symbol") or row.get("tradableInstrumentId") or "UNKNOWN"),
            )
            row["_executed_at"] = executed.isoformat()
            row["_quantity"] = str(abs(filled))
            row["_price"] = str(price)
            row["_direction"] = "long" if side in {"buy", "long", "1"} else "short"
            positions[position_id].append(row)
            executions.append(
                ProviderExecutionRecord(
                    provider_execution_id=str(row.get("id") or row.get("orderId")),
                    provider_order_id=str(row.get("orderId") or row.get("id")),
                    provider_position_id=position_id,
                    symbol=symbol,
                    direction="long" if side in {"buy", "long", "1"} else "short",
                    quantity=abs(filled),
                    price=price,
                    executed_at=executed,
                    commission=Decimal(str(row.get("commission") or 0)),
                    raw_payload=row,
                )
            )
        trades = [
            trade
            for position_id, position_rows in positions.items()
            if (
                trade := self._group_position(
                    position_id, position_rows, symbol_by_id
                )
            )
            is not None
        ]
        state_root = (
            state.get("d", state.get("data", state)) if isinstance(state, dict) else {}
        )
        state_values = (
            state_root.get("accountDetailsData", state_root)
            if isinstance(state_root, dict)
            else state_root
        )
        if isinstance(state_values, list):
            state_columns = self._columns(config, "accountDetailsConfig")
            state = self._row(state_values, state_columns)
        elif isinstance(state_values, dict):
            state = state_values
        else:
            state = {}
        snapshot = AccountSnapshot(
            balance=self._decimal(state.get("balance")),
            equity=self._decimal(state.get("equity")),
            margin=self._decimal(state.get("usedMargin")),
            free_margin=self._decimal(
                state.get("availableFunds") or state.get("freeMargin")
            ),
            currency=account.currency,
            captured_at=datetime.now(timezone.utc),
            raw_payload=state,
        )
        return SyncBatch(
            trades=trades,
            executions=executions,
            snapshot=snapshot,
            next_cursor={"last_execution_at": latest.isoformat()},
            partial_error=history_partial,
            warning_code=(
                "history_row_limit" if history_partial else None
            ),
        )

    async def _order_history(
        self,
        base: str,
        external_account_id: str,
        headers: dict[str, str],
        start: datetime,
        end: datetime,
        row_limit: int | None,
        *,
        depth: int = 0,
    ) -> tuple[list, bool]:
        payload = await request_json(
            "GET",
            f"{base}/trade/accounts/{external_account_id}/ordersHistory",
            provider_name=self.provider_id,
            headers=headers,
            params={
                "from": int(start.timestamp() * 1000),
                "to": int(end.timestamp() * 1000),
            },
        )
        rows = list(self._unwrap(payload, "ordersHistory") or [])
        root = payload.get("d", payload.get("data", payload)) if isinstance(payload, dict) else {}
        has_more = bool(root.get("hasMore")) if isinstance(root, dict) else False
        saturated = has_more or bool(row_limit and len(rows) >= row_limit)
        if not saturated:
            return rows, False

        # TradeLocker caps this endpoint instead of exposing an offset cursor.
        # Split saturated time ranges until each response is below the limit.
        span_ms = int((end - start).total_seconds() * 1000)
        if depth >= 24 or span_ms <= 1:
            return rows, True
        midpoint = start + (end - start) / 2
        right_start = midpoint + timedelta(milliseconds=1)
        # GET_ORDERS_HISTORY is limited to one request per second by the
        # provider's current /trade/config response.
        await asyncio.sleep(1.05)
        left_rows, left_partial = await self._order_history(
            base,
            external_account_id,
            headers,
            start,
            midpoint,
            row_limit,
            depth=depth + 1,
        )
        await asyncio.sleep(1.05)
        right_rows, right_partial = await self._order_history(
            base,
            external_account_id,
            headers,
            right_start,
            end,
            row_limit,
            depth=depth + 1,
        )
        return left_rows + right_rows, left_partial or right_partial

    @classmethod
    def _group_position(
        cls,
        position_id: str,
        rows: list[dict],
        symbol_by_id: dict[str, str],
    ) -> ProviderTradeRecord | None:
        rows = sorted(rows, key=lambda item: item["_executed_at"])
        if not rows:
            return None
        first = rows[0]
        open_side = first["_direction"]
        opening = [row for row in rows if row["_direction"] == open_side]
        closing = [row for row in rows if row["_direction"] != open_side]

        def quantity(row: dict) -> Decimal:
            return Decimal(row["_quantity"])

        def weighted_price(items: list[dict]) -> Decimal | None:
            total = sum((quantity(item) for item in items), Decimal("0"))
            if total <= 0:
                return None
            return sum(
                (Decimal(item["_price"]) * quantity(item) for item in items),
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
            provider_order_id=str(first.get("orderId") or first.get("id")),
            provider_position_id=position_id,
            symbol=symbol_by_id.get(
                str(first.get("tradableInstrumentId")),
                str(
                    first.get("symbol")
                    or first.get("tradableInstrumentId")
                    or "UNKNOWN"
                ),
            ),
            direction=open_side,
            volume=opened_volume,
            open_time=cls._time(first["_executed_at"]),
            close_time=cls._time(closing[-1]["_executed_at"]) if fully_closed else None,
            open_price=open_price,
            close_price=weighted_price(closing) if fully_closed else None,
            gross_profit=sum(
                (
                    Decimal(str(item.get("profit") or item.get("realizedPnl") or 0))
                    for item in closing
                ),
                Decimal("0"),
            ),
            commission=sum(
                (Decimal(str(item.get("commission") or 0)) for item in rows),
                Decimal("0"),
            ),
            fees=sum(
                (
                    Decimal(str(item.get("fee") or item.get("fees") or 0))
                    for item in rows
                ),
                Decimal("0"),
            ),
            market_type="cfd",
            raw_payload={"orders": rows},
        )

    def _headers(self, access: dict, acc_num: str | None = None) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {access['access_token']}",
            "Content-Type": "application/json",
        }
        if acc_num is not None:
            headers["accNum"] = str(acc_num)
        if self.developer_api_key:
            # This is the header used by TradeLocker's official Python client.
            headers["developer-api-key"] = self.developer_api_key
        return headers

    @staticmethod
    def _account(row: dict, access: dict) -> DetectedAccount:
        account_id = str(row.get("id") or row.get("accountId") or "")
        acc_num = row.get("accNum")
        if not account_id or acc_num is None:
            raise IntegrationError(
                "provider_invalid_response",
                "TradeLocker a renvoyé un compte incomplet.",
                502,
            )
        return DetectedAccount(
            external_account_id=account_id,
            broker_name=row.get("broker") or access.get("server"),
            server_name=access.get("server"),
            account_number_masked=f"•••• {account_id[-4:]}",
            account_type="demo" if access.get("environment") == "demo" else "real",
            account_currency=row.get("currency"),
            balance=TradeLockerConnector._decimal(
                row.get("accountBalance") or row.get("aaccountBalance")
            ),
            display_name=row.get("name") or f"TradeLocker {account_id[-4:]}",
            provider_metadata={
                "environment": access.get("environment"),
                "acc_num": int(acc_num),
            },
        )

    @staticmethod
    def _columns(config: dict, section: str) -> list[str]:
        root = config.get("d", config) if isinstance(config, dict) else {}
        value = root.get(section) or root.get("config", {}).get(section) or []
        if isinstance(value, dict):
            value = value.get("columns") or []
        return [
            (
                str(item.get("id") or item.get("name"))
                if isinstance(item, dict)
                else str(item)
            )
            for item in value
            if not isinstance(item, dict) or item.get("id") or item.get("name")
        ]

    @staticmethod
    def _orders_history_limit(config: dict) -> int | None:
        root = config.get("d", config.get("data", config)) if isinstance(config, dict) else {}
        limits = root.get("limits", {}) if isinstance(root, dict) else {}
        if isinstance(limits, dict):
            for key, value in limits.items():
                if str(key).replace("_", "").replace("-", "").lower() != "ordershistory":
                    continue
                if isinstance(value, (int, float)) and int(value) > 0:
                    return int(value)
                if isinstance(value, dict):
                    for limit_key in ("maxRows", "max_rows", "rowLimit", "row_limit", "limit"):
                        limit = value.get(limit_key)
                        if isinstance(limit, (int, float)) and int(limit) > 0:
                            return int(limit)
        if isinstance(limits, list):
            for item in limits:
                if not isinstance(item, dict):
                    continue
                name = str(
                    item.get("route")
                    or item.get("endpoint")
                    or item.get("name")
                    or item.get("limitType")
                    or ""
                )
                compact_name = name.replace("_", "").replace("-", "").lower()
                if "ordershistory" not in compact_name and not (
                    "orders" in compact_name and "history" in compact_name
                ):
                    continue
                for limit_key in ("maxRows", "max_rows", "rowLimit", "row_limit", "limit"):
                    limit = item.get(limit_key)
                    if isinstance(limit, (int, float)) and int(limit) > 0:
                        return int(limit)
        return None

    @staticmethod
    def _unwrap(payload, key: str):
        if not isinstance(payload, dict):
            return payload
        root = payload.get("d", payload.get("data", payload))
        if isinstance(root, dict):
            return root.get(key, root.get("data", root))
        return root

    @staticmethod
    def _row(raw, columns: list[str]) -> dict:
        if isinstance(raw, dict):
            return raw
        return {
            columns[index]: value
            for index, value in enumerate(raw)
            if index < len(columns)
        }

    @staticmethod
    def _time(value) -> datetime:
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(
                value / 1000 if value > 10_000_000_000 else value, timezone.utc
            )
        if value:
            raw = str(value).strip()
            try:
                numeric = float(raw)
            except ValueError:
                numeric = None
            if numeric is not None:
                return datetime.fromtimestamp(
                    numeric / 1000 if numeric > 10_000_000_000 else numeric,
                    timezone.utc,
                )
            return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(
                timezone.utc
            )
        return datetime.now(timezone.utc)

    @staticmethod
    def _expiry(payload: dict) -> datetime:
        value = payload.get("expireDate") or payload.get("expires_at")
        if value:
            parsed = TradeLockerConnector._time(value)
            if parsed > datetime.now(timezone.utc):
                return parsed
        # Defensive fallback for legacy TradeLocker responses that omit
        # expireDate. Access tokens have historically been short lived.
        return datetime.now(timezone.utc) + timedelta(minutes=14)

    @staticmethod
    def _decimal(value):
        return Decimal(str(value)) if value is not None else None
