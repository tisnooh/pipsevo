from __future__ import annotations

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
        data = await request_json(
            "POST",
            f"{base}/auth/jwt/token",
            json={
                "email": request.email,
                "password": request.password.get_secret_value(),
                "server": request.server,
            },
        )
        access_token = data.get("accessToken") or data.get("access_token")
        refresh_token = data.get("refreshToken") or data.get("refresh_token")
        if not access_token:
            raise IntegrationError(
                "provider_invalid_response",
                "TradeLocker n’a pas renvoyé de jeton d’accès.",
                502,
            )
        access = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "environment": request.environment,
            "server": request.server,
        }
        accounts = await self.list_accounts(access)
        return AuthenticationResult(
            tokens=AuthTokens(
                access_token=SecretStr(access_token),
                refresh_token=SecretStr(refresh_token) if refresh_token else None,
                expires_at=datetime.now(timezone.utc) + timedelta(minutes=14),
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
        data = await request_json(
            "POST",
            f"{base}/auth/jwt/refresh",
            json={"refreshToken": access["refresh_token"]},
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
            "expires_at": (
                datetime.now(timezone.utc) + timedelta(minutes=14)
            ).isoformat(),
        }

    async def list_accounts(self, access: dict) -> list[DetectedAccount]:
        base = self.urls[access.get("environment", "demo")]
        rows = await request_json(
            "GET",
            f"{base}/auth/jwt/all-accounts",
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
        config = await request_json("GET", f"{base}/trade/config", headers=headers)
        rows = await request_json(
            "GET",
            f"{base}/trade/accounts/{account.external_account_id}/ordersHistory",
            headers=headers,
            params={
                "from": int(start.timestamp() * 1000),
                "to": int(datetime.now(timezone.utc).timestamp() * 1000),
            },
        )
        state = await request_json(
            "GET",
            f"{base}/trade/accounts/{account.external_account_id}/state",
            headers=headers,
        )
        instruments_payload = await request_json(
            "GET",
            f"{base}/trade/accounts/{account.external_account_id}/instruments",
            headers=headers,
        )
        order_columns = self._columns(config, "ordersHistoryConfig")
        raw_rows = self._unwrap(rows, "ordersHistory")
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
        trades = []
        for position_id, position_rows in positions.items():
            position_rows.sort(key=lambda item: item["_executed_at"])
            first, last = position_rows[0], position_rows[-1]
            if len(position_rows) < 2 or first["_direction"] == last["_direction"]:
                continue
            trades.append(
                ProviderTradeRecord(
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
                    direction=first["_direction"],
                    volume=Decimal(first["_quantity"]),
                    open_time=self._time(first["_executed_at"]),
                    close_time=self._time(last["_executed_at"]),
                    open_price=Decimal(first["_price"]),
                    close_price=Decimal(last["_price"]),
                    gross_profit=Decimal(
                        str(last.get("profit") or last.get("realizedPnl") or 0)
                    ),
                    commission=sum(
                        (
                            Decimal(str(item.get("commission") or 0))
                            for item in position_rows
                        ),
                        Decimal("0"),
                    ),
                    fees=sum(
                        (
                            Decimal(str(item.get("fee") or item.get("fees") or 0))
                            for item in position_rows
                        ),
                        Decimal("0"),
                    ),
                    market_type="cfd",
                    raw_payload={"orders": position_rows},
                )
            )
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
        )

    def _headers(self, access: dict, acc_num: str | None = None) -> dict[str, str]:
        headers = {
            "Authorization": f"Bearer {access['access_token']}",
            "Content-Type": "application/json",
        }
        if acc_num is not None:
            headers["accNum"] = str(acc_num)
        if self.developer_api_key:
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
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(
                timezone.utc
            )
        return datetime.now(timezone.utc)

    @staticmethod
    def _decimal(value):
        return Decimal(str(value)) if value is not None else None
