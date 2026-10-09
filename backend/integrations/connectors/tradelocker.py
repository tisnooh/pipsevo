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
    normalization_version = 5

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
        # A position can close days after its opening fill. Replaying only the
        # latest five minutes would overwrite it with a close-only "open" trade.
        # Retain the opening of every still-open / boundary position. Version 5
        # also repairs instrument pricing previously requested on a TRADE route.
        value = (
            cursor.get("replay_from")
            if cursor.get("normalization_version") == self.normalization_version
            else None
        )
        start = (
            self._time(value)
            if value
            else datetime.now(timezone.utc) - timedelta(days=3650)
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
        account_details: dict = {}
        try:
            account_payload = await request_json(
                "GET",
                f"{base}/trade/accounts",
                provider_name=self.provider_id,
                headers=headers,
            )
            account_details = self._selected_account_details(
                account_payload, account.external_account_id
            )
        except IntegrationError as exc:
            # Some white-label brokers expose history and state without
            # enabling the optional account-details route. Keep trades syncing
            # in that case, but never hide authentication/availability errors.
            if exc.code not in {
                "provider_request_rejected",
                "provider_invalid_response",
            }:
                raise
        instruments_payload = await request_json(
            "GET",
            f"{base}/trade/accounts/{account.external_account_id}/instruments",
            provider_name=self.provider_id,
            headers=headers,
        )
        order_columns = self._columns(config, "ordersHistoryConfig")
        instruments = self._unwrap(instruments_payload, "instruments")
        instrument_by_id = {
            str(row.get("tradableInstrumentId") or row.get("id")): row
            for row in instruments or []
            if isinstance(row, dict)
            and (
                row.get("tradableInstrumentId") is not None or row.get("id") is not None
            )
        }
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
        detail_routes: dict[str, str] = {}
        latest = start
        for raw in raw_rows or []:
            row = self._row(raw, order_columns)
            status = str(row.get("status") or "").strip().lower()
            if status and status not in {"filled", "executed", "completed"}:
                # ordersHistory also contains rejected and cancelled SL/TP
                # orders. They are not executions and must never influence a
                # position's closing quantity, price or trade count.
                continue
            filled_value = row.get("filledQty")
            filled = Decimal(
                str(
                    filled_value
                    if filled_value not in (None, "")
                    else row.get("qty") or row.get("quantity") or 0
                )
            )
            price = Decimal(str(row.get("avgPrice") or row.get("price") or 0))
            if not filled.is_finite() or not price.is_finite() or filled <= 0 or price <= 0:
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
            instrument_id = str(row.get("tradableInstrumentId") or "")
            # An order's routeId is a TRADE route. Instrument specifications
            # require the instrument's INFO route (as in the official client).
            route_id = self._info_route(instrument_by_id.get(instrument_id, {}))
            if instrument_id and route_id is not None:
                detail_routes[instrument_id] = str(route_id)
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
                    fees=abs(Decimal(str(row.get("fee") or row.get("fees") or 0))),
                    raw_payload=row,
                )
            )
        needs_derived_pnl = False
        for position_rows in positions.values():
            ordered = sorted(position_rows, key=lambda item: item["_executed_at"])
            closing = [item for item in ordered if item["_direction"] != ordered[0]["_direction"]]
            if closing and any(self._closing_profit(item) is None for item in closing):
                needs_derived_pnl = True
                break
        instrument_details = (
            await self._instrument_details(base, headers, detail_routes)
            if needs_derived_pnl
            else {}
        )
        trades = [
            trade
            for position_id, position_rows in positions.items()
            if (
                trade := self._group_position(
                    position_id,
                    position_rows,
                    symbol_by_id,
                    instrument_details,
                )
            )
            is not None
        ]
        trades_by_position = {
            str(trade.provider_position_id or trade.provider_trade_id): trade
            for trade in trades
        }
        closing_volume: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
        for execution in executions:
            position_id = str(execution.provider_position_id or "")
            trade = trades_by_position.get(position_id)
            if trade and execution.direction != trade.direction:
                closing_volume[position_id] += execution.quantity
        for execution in executions:
            position_id = str(execution.provider_position_id or "")
            trade = trades_by_position.get(position_id)
            if not trade:
                continue
            is_close = execution.direction != trade.direction
            execution.execution_type = "close" if is_close else "open"
            total = closing_volume[position_id]
            if is_close and trade.close_time and total > 0 and trade.raw_payload.get("pnl_source") != "unavailable":
                execution.realized_pnl = (
                    trade.gross_profit * execution.quantity / total
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
        risk_rules = account_details.get("riskRules")
        if not isinstance(risk_rules, dict):
            risk_rules = {}
        daily_loss_limit = self._rule_decimal(risk_rules.get("dailyLossLimit"))
        initial_balance = self._first_decimal(
            account_details,
            "initialBalance",
            "startingBalance",
            "accountSize",
        )
        # TradeLocker's standard dailyProfitTarget is a daily cap, not the
        # prop-firm challenge objective. Only map an explicit total target.
        profit_target = self._first_decimal(
            risk_rules,
            "profitTarget",
            "totalProfitTarget",
            "challengeProfitTarget",
            "targetProfit",
        )
        max_drawdown = self._first_decimal(
            risk_rules,
            "maxTrailingDrawdown",
            "maxDrawdown",
        )
        max_drawdown_level = self._first_decimal(
            risk_rules,
            "maxDrawdownLevel",
        )
        current_drawdown = self._first_decimal(
            state,
            "currentDrawdown",
            "drawdown",
            "drawdownAmount",
        )
        snapshot = AccountSnapshot(
            balance=self._decimal(state.get("balance")),
            equity=self._decimal(state.get("equity")),
            margin=self._decimal(state.get("usedMargin")),
            free_margin=self._first_decimal(state, "availableFunds", "freeMargin"),
            initial_balance=initial_balance,
            profit_target=profit_target,
            max_drawdown=max_drawdown,
            max_drawdown_level=max_drawdown_level,
            daily_loss_limit=daily_loss_limit,
            current_drawdown=current_drawdown,
            provider_status=(
                str(account_details.get("status"))
                if account_details.get("status") is not None
                else None
            ),
            risk_rules=risk_rules,
            currency=account_details.get("currency") or state.get("currency") or account.currency,
            captured_at=datetime.now(timezone.utc),
            raw_payload={"state": state, "account_details": account_details},
        )
        boundary = latest - timedelta(minutes=5)
        replay_from = boundary
        for trade in trades:
            if trade.close_time is None or trade.close_time >= boundary:
                replay_from = min(replay_from, trade.open_time)
        return SyncBatch(
            trades=trades,
            executions=executions,
            snapshot=snapshot,
            next_cursor={
                "last_execution_at": latest.isoformat(),
                "replay_from": replay_from.isoformat(),
                "normalization_version": self.normalization_version,
            },
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
        instrument_details: dict[str, dict] | None = None,
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
        close_price = weighted_price(closing) if fully_closed else None
        provider_results = [cls._closing_profit(item) for item in closing]
        provider_pnl_available = bool(closing) and all(value is not None for value in provider_results)
        gross_profit = sum(provider_results, Decimal("0")) if provider_pnl_available else Decimal("0")
        pnl_source = "provider" if provider_pnl_available else "unavailable"
        instrument_id = str(first.get("tradableInstrumentId") or "")
        pricing = (instrument_details or {}).get(instrument_id)
        if (
            fully_closed
            and not provider_pnl_available
            and close_price is not None
            and pricing
        ):
            calculated = cls._realized_pnl(
                open_side,
                open_price,
                close_price,
                opened_volume,
                pricing,
            )
            if calculated is not None:
                gross_profit = calculated
                pnl_source = "derived_tick_cost"
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
            close_price=close_price,
            gross_profit=gross_profit,
            commission=sum(
                (abs(Decimal(str(item.get("commission") or 0))) for item in rows),
                Decimal("0"),
            ),
            fees=sum(
                (
                    abs(Decimal(str(item.get("fee") or item.get("fees") or 0)))
                    for item in rows
                ),
                Decimal("0"),
            ),
            swap=sum((Decimal(str(item.get("swap") or 0)) for item in rows), Decimal("0")),
            market_type="cfd",
            raw_payload={
                "orders": rows,
                "pnl_source": pnl_source,
                "instrument_pricing": (
                    {
                        "tickSize": pricing.get("tickSize"),
                        "tickCost": pricing.get("tickCost"),
                        "lotSize": pricing.get("lotSize"),
                    }
                    if pricing
                    else None
                ),
            },
        )

    @classmethod
    def _closing_profit(cls, row: dict) -> Decimal | None:
        for key in ("profit", "realizedPnl"):
            value = cls._decimal_or_none(row.get(key))
            if value is not None:
                return value
        return None

    async def _instrument_details(
        self,
        base: str,
        headers: dict[str, str],
        routes: dict[str, str],
    ) -> dict[str, dict]:
        details: dict[str, dict] = {}
        for index, (instrument_id, route_id) in enumerate(sorted(routes.items())):
            if index:
                # The official GET_INSTRUMENT_DETAILS limit is two requests per
                # second. Keep historical imports below that provider limit.
                await asyncio.sleep(0.55)
            try:
                payload = await request_json(
                    "GET",
                    f"{base}/trade/instruments/{instrument_id}",
                    provider_name=self.provider_id,
                    headers=headers,
                    params={"routeId": route_id},
                )
            except IntegrationError as exc:
                if exc.code not in {
                    "provider_request_rejected",
                    "provider_invalid_response",
                }:
                    raise
                continue
            root = payload.get("d", payload.get("data", payload))
            if isinstance(root, dict):
                details[instrument_id] = root
        return details

    @staticmethod
    def _info_route(instrument: dict) -> str | int | None:
        routes = instrument.get("routes") if isinstance(instrument, dict) else None
        if not isinstance(routes, list):
            return None
        for route in routes:
            if isinstance(route, dict) and str(route.get("type") or "").upper() == "INFO":
                return route.get("id")
        return None

    @classmethod
    def _realized_pnl(
        cls,
        direction: str,
        open_price: Decimal,
        close_price: Decimal,
        volume: Decimal,
        instrument: dict,
    ) -> Decimal | None:
        tick_size = cls._tier_value(instrument.get("tickSize"), close_price, "tickSize")
        tick_cost = cls._tier_value(instrument.get("tickCost"), close_price, "tickCost")
        if (
            tick_size is None or tick_cost is None or tick_size <= 0 or tick_cost <= 0
            or direction not in {"long", "short"}
            or any(not value.is_finite() or value <= 0 for value in (open_price, close_price, volume))
        ):
            return None
        price_move = (
            close_price - open_price
            if direction == "long"
            else open_price - close_price
        )
        return price_move / tick_size * tick_cost * volume

    @staticmethod
    def _tier_value(values, price: Decimal, key: str) -> Decimal | None:
        if not isinstance(values, list):
            return None
        selected: Decimal | None = None
        selected_limit: Decimal | None = None
        for item in values:
            if not isinstance(item, dict) or item.get(key) in (None, ""):
                continue
            try:
                limit = Decimal(str(item.get("leftRangeLimit") or 0))
                value = Decimal(str(item[key]))
            except (ArithmeticError, ValueError):
                continue
            if not limit.is_finite() or not value.is_finite():
                continue
            if limit <= price and (selected_limit is None or limit >= selected_limit):
                selected = value
                selected_limit = limit
        return selected

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
            balance=TradeLockerConnector._first_decimal(row, "accountBalance", "aaccountBalance"),
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

    @classmethod
    def _selected_account_details(
        cls, payload: dict, external_account_id: str
    ) -> dict:
        rows = cls._unwrap(payload, "accounts")
        if isinstance(rows, dict):
            rows = rows.get("accounts") or rows.get("data") or [rows]
        if not isinstance(rows, list):
            return {}
        for row in rows:
            if not isinstance(row, dict):
                continue
            account_id = row.get("id") or row.get("accountId")
            if str(account_id) == str(external_account_id):
                return row
        # Never copy a different account's currency, objectives or risk limits.
        return {}

    @classmethod
    def _rule_decimal(cls, value) -> Decimal | None:
        if isinstance(value, dict):
            for key in ("value", "amount", "limit"):
                if key in value:
                    return cls._decimal_or_none(value.get(key))
            return None
        return cls._decimal_or_none(value)

    @classmethod
    def _first_decimal(cls, payload: dict, *keys: str) -> Decimal | None:
        for key in keys:
            if key in payload:
                value = cls._decimal_or_none(payload.get(key))
                if value is not None:
                    return value
        return None

    @staticmethod
    def _decimal_or_none(value) -> Decimal | None:
        if value is None or value == "":
            return None
        try:
            amount = Decimal(str(value))
            return amount if amount.is_finite() else None
        except (ArithmeticError, ValueError):
            return None

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
