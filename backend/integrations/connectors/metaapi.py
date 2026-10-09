from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from collections import defaultdict
from decimal import Decimal, InvalidOperation
import re
import secrets
from typing import Any, Literal
from urllib.parse import quote

from ..errors import IntegrationError
from ..models import (
    AccountSnapshot,
    DetectedAccount,
    IntegrationAccount,
    MetaApiLinkRequest,
    ProviderExecutionRecord,
    ProviderTradeRecord,
    SyncBatch,
)
from ..providers import TradingConnector
from .http import request_json


class MetaApiConnector(TradingConnector):
    provider_id = "metaapi"
    platforms = ("mt4", "mt5")
    auth_type = "provider_link"
    normalization_version = 1

    def __init__(self, token: str, domain: str = "agiliumtrade.agiliumtrade.ai"):
        self.token = token
        self.domain = domain
        self.provisioning_url = f"https://mt-provisioning-api-v1.{domain}"

    def _client_url(self, region: str) -> str:
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", str(region)):
            raise IntegrationError("provider_invalid_response", "Région MetaApi invalide.", 502)
        # Provisioning and regional terminal REST APIs use different public
        # domains. Keep explicitly configured private domains unchanged.
        domain = "agiliumtrade.ai" if self.domain == "agiliumtrade.agiliumtrade.ai" else self.domain
        return f"https://mt-client-api-v1.{region}.{domain}"

    @property
    def headers(self) -> dict[str, str]:
        return {"auth-token": self.token, "Content-Type": "application/json"}

    async def _request(self, method: str, url: str, **kwargs):
        return await request_json(
            method,
            url,
            provider_authentication=True,
            provider_name=self.provider_id,
            **kwargs,
        )

    async def search_servers(self, platform: str, query: str) -> list[dict[str, str]]:
        version = 4 if platform == "mt4" else 5
        result = await self._request(
            "GET",
            f"{self.provisioning_url}/known-mt-servers/{version}/search",
            headers=self.headers,
            params={"query": query},
        )
        if not isinstance(result, dict):
            return []
        return [
            {"broker": str(broker), "server": str(server)}
            for broker, servers in result.items()
            for server in (servers if isinstance(servers, list) else [])
        ][:50]

    async def create_configuration_link(self, request: MetaApiLinkRequest) -> dict:
        body = {
            "name": request.name,
            "type": "cloud-g2",
            "server": request.server,
            "platform": request.platform,
            "magic": 0,
        }
        # The optional password is transmitted directly to MetaApi and discarded
        # after this request; it is never returned to the service or persisted.
        if request.password:
            body["login"] = request.login
            body["password"] = request.password.get_secret_value()
        transaction_id = secrets.token_hex(16)
        headers = {**self.headers, "transaction-id": transaction_id}
        created: dict[str, Any] = {}
        account_id = ""
        # MetaApi can answer 202 while broker settings are still being resolved.
        # Repeating the request with the same transaction id polls that exact
        # provisioning transaction instead of creating duplicate cloud accounts.
        for attempt in range(4):
            result = await self._request(
                "POST",
                f"{self.provisioning_url}/users/current/accounts",
                headers=headers,
                json=body,
                expected=(200, 201, 202),
            )
            created = result if isinstance(result, dict) else {}
            account_id = str(created.get("id") or created.get("_id") or "")
            if account_id:
                break
            if attempt < 3:
                await asyncio.sleep(1)
        if not account_id:
            if created.get("message"):
                raise IntegrationError(
                    "provider_processing",
                    "MetaApi vérifie le serveur de trading. "
                    "Réessaie la connexion dans une minute.",
                    409,
                )
            raise IntegrationError(
                "provider_invalid_response",
                "MetaApi n’a pas créé le compte.",
                502,
            )

        # When the password was supplied, MetaApi already has everything it
        # needs to start the terminal. A configuration link would ask the user
        # to enter the same credentials a second time.
        if request.password:
            return {
                "provider_account_id": account_id,
                "configuration_link": None,
                "mode": "direct",
                "state": created.get("state"),
                "platform": request.platform,
                "login": request.login,
                "server": request.server,
                "name": request.name,
            }

        link = await self._request(
            "PUT",
            f"{self.provisioning_url}/users/current/accounts/{account_id}/configuration-link",
            headers=self.headers,
            params={"ttlInDays": 7},
            json={},
        )
        return {
            "provider_account_id": account_id,
            "configuration_link": link.get("configurationLink") or link.get("url"),
            "mode": "configuration_link",
            "state": created.get("state"),
            "platform": request.platform,
            "login": request.login,
            "server": request.server,
            "name": request.name,
        }

    async def deploy(self, provider_account_id: str) -> None:
        row = await self._request(
            "GET",
            f"{self.provisioning_url}/users/current/accounts/{provider_account_id}",
            headers=self.headers,
        )
        if str(row.get("state") or "").upper() in {"DEPLOYED", "DEPLOYING"}:
            return
        await self._request(
            "POST",
            f"{self.provisioning_url}/users/current/accounts/{provider_account_id}/deploy",
            headers=self.headers,
            json={},
            expected=(200, 201, 204),
        )

    async def list_accounts(self, access: dict) -> list[DetectedAccount]:
        provider_id = access.get("provider_account_id")
        if not provider_id:
            return []
        row = await self._request(
            "GET",
            f"{self.provisioning_url}/users/current/accounts/{provider_id}",
            headers=self.headers,
        )
        deployment_state = str(row.get("state") or "").upper()
        connection_state = str(row.get("connectionStatus") or "").upper()
        if deployment_state not in {"DEPLOYED", ""} or connection_state not in {
            "CONNECTED",
            "",
        }:
            return []
        region = row.get("region") or "new-york"
        client_url = self._client_url(region)
        information = await self._request(
            "GET",
            f"{client_url}/users/current/accounts/{provider_id}/account-information",
            headers=self.headers,
        )
        account_type = self._account_type(information, row)
        return [
            DetectedAccount(
                external_account_id=provider_id,
                broker_name=row.get("broker") or "MetaTrader",
                server_name=row.get("server"),
                account_number_masked=f"•••• {str(row.get('login') or '')[-4:]}",
                account_type=account_type,
                account_currency=information.get("currency"),
                balance=self._decimal(information.get("balance")),
                equity=self._decimal(information.get("equity")),
                display_name=row.get("name"),
                provider_metadata={
                    "region": row.get("region"),
                    "state": deployment_state,
                    "connection_status": connection_state,
                    "platform": row.get("platform"),
                    "investor_mode": information.get("investorMode"),
                    "margin_mode": information.get("marginMode"),
                    "leverage": information.get("leverage"),
                },
            )
        ]

    async def sync_historical(self, account: IntegrationAccount, access: dict) -> SyncBatch:
        configured_start = (account.provider_metadata or {}).get("start_date")
        if configured_start:
            try:
                start = datetime.fromisoformat(str(configured_start)).replace(tzinfo=timezone.utc)
            except ValueError:
                start = datetime.now(timezone.utc) - timedelta(days=3650)
        else:
            start = datetime.now(timezone.utc) - timedelta(days=3650)
        return await self._sync(account, access, start, complete_positions=bool(configured_start))

    async def sync_recent(self, account: IntegrationAccount, access: dict, cursor: dict) -> SyncBatch:
        if cursor.get("normalization_version") != self.normalization_version:
            return await self.sync_historical(account, access)
        value = cursor.get("last_close_time")
        start = datetime.fromisoformat(value.replace("Z", "+00:00")) - timedelta(minutes=5) if value else datetime.now(timezone.utc) - timedelta(days=7)
        return await self._sync(account, access, start, complete_positions=True)

    async def _sync(
        self, account: IntegrationAccount, access: dict, start: datetime,
        *, complete_positions: bool = False,
    ) -> SyncBatch:
        provider_id = access.get("provider_account_id") or account.external_account_id
        metadata = account.provider_metadata or {}
        region = metadata.get("region") or access.get("region") or "new-york"
        client_url = self._client_url(region)
        end = datetime.now(timezone.utc)
        rows: list[dict[str, Any]] = []
        offset = 0
        page_limit = 1000
        start_value = self._api_time(start)
        end_value = self._api_time(end)
        while offset < 100_000:
            deals = await self._request(
                "GET",
                f"{client_url}/users/current/accounts/{provider_id}/history-deals/time/{start_value}/{end_value}",
                headers=self.headers,
                params={"offset": offset, "limit": page_limit},
            )
            page = self._deal_rows(deals)
            rows.extend(page)
            if len(page) < page_limit:
                break
            offset += page_limit
        information = await self._request(
            "GET",
            f"{client_url}/users/current/accounts/{provider_id}/account-information",
            headers=self.headers,
        )
        positions: dict[str, list[dict]] = defaultdict(list)
        latest = start
        incomplete = False
        for row in self._deduplicate_deals(rows):
            kind = str(row.get("type") or "").upper()
            if kind not in {"DEAL_TYPE_BUY", "DEAL_TYPE_SELL", "BUY", "SELL"}:
                continue
            executed_at = self._time(row.get("time") or row.get("brokerTime"))
            latest = max(latest, executed_at)
            position_id = str(row.get("positionId") or row.get("orderId") or row.get("id") or "")
            if not position_id:
                incomplete = True
                continue
            positions[position_id].append(row)
        # A delta can contain only the exit of an old position. Read its complete
        # history before replacing an existing journal trade or summing costs.
        for position_id, position_rows in list(positions.items()):
            if complete_positions or not any(self._entry_kind(row) == "in" for row in position_rows):
                history = await self._request(
                    "GET",
                    f"{client_url}/users/current/accounts/{provider_id}/history-deals/position/{quote(position_id, safe='')}",
                    headers=self.headers,
                )
                full_rows = self._deal_rows(history)
                positions[position_id] = self._deduplicate_deals([
                    *[row for row in full_rows if str(row.get("positionId") or row.get("orderId") or row.get("id") or "") == position_id],
                    *position_rows,
                ])
        executions: list[ProviderExecutionRecord] = []
        trades: list[ProviderTradeRecord] = []
        for position_id, position_rows in positions.items():
            trading_rows = [row for row in position_rows if str(row.get("type") or "").upper() in {
                "DEAL_TYPE_BUY", "DEAL_TYPE_SELL", "BUY", "SELL",
            }]
            trade = self._group_position(position_id, trading_rows)
            if trade is None:
                incomplete = True
            else:
                trades.append(trade)
            for row in trading_rows:
                quantity = self._decimal(row.get("volume"))
                price = self._decimal(row.get("price"))
                if not row.get("id") or quantity is None or quantity <= 0 or price is None:
                    incomplete = True
                    continue
                kind = str(row.get("type") or "").upper()
                executions.append(
                    ProviderExecutionRecord(
                        provider_execution_id=str(row.get("id")),
                        provider_order_id=(
                            str(row.get("orderId")) if row.get("orderId") else None
                        ),
                        provider_position_id=position_id,
                        symbol=str(row.get("symbol") or "UNKNOWN"),
                        direction="long" if "BUY" in kind else "short",
                        quantity=quantity,
                        price=price,
                        executed_at=self._time(row.get("time") or row.get("brokerTime")),
                        commission=self._decimal(row.get("commission")) or Decimal("0"),
                        realized_pnl=self._decimal(row.get("profit")) or Decimal("0"),
                        raw_payload=row,
                    )
                )
        snapshot = AccountSnapshot(
            balance=self._decimal(information.get("balance")),
            equity=self._decimal(information.get("equity")),
            margin=self._decimal(information.get("margin")),
            free_margin=self._decimal(information.get("freeMargin")),
            currency=information.get("currency"),
            captured_at=end,
            raw_payload=information,
        )
        partial = offset >= 100_000 or incomplete
        return SyncBatch(
            trades=trades,
            executions=executions,
            snapshot=snapshot,
            next_cursor={
                "last_close_time": latest.isoformat(),
                # Do not permanently skip incomplete positions on the next run.
                "normalization_version": 0 if partial else self.normalization_version,
            },
            partial_error=partial,
            warning_code="history_page_limit" if offset >= 100_000 else "history_incomplete" if incomplete else None,
        )

    @staticmethod
    def _deal_rows(payload: Any) -> list[dict]:
        rows = payload if isinstance(payload, list) else payload.get("deals") if isinstance(payload, dict) else None
        if not isinstance(rows, list) or any(
            not isinstance(row, dict) or row.get("id") is None for row in rows
        ):
            raise IntegrationError("provider_invalid_response", "L’historique MetaTrader est incomplet ou inexploitable.", 502)
        return rows

    @staticmethod
    def _deduplicate_deals(rows: list[dict]) -> list[dict]:
        unique: dict[str, dict] = {}
        for row in rows:
            if isinstance(row, dict) and row.get("id") is not None:
                unique[str(row["id"])] = row
        return list(unique.values())

    @staticmethod
    def _entry_kind(row: dict) -> str | None:
        value = str(row.get("entryType", "")).upper()
        if value in {"DEAL_ENTRY_IN", "IN", "0"}:
            return "in"
        if value in {"DEAL_ENTRY_OUT", "OUT", "1", "DEAL_ENTRY_OUT_BY", "OUT_BY", "3"}:
            return "out"
        # A netting reversal cannot be represented as a single long/short trade.
        # Missing entry types also do not prove that a first deal is an entry.
        return None

    @classmethod
    def _group_position(
        cls, position_id: str, rows: list[dict]
    ) -> ProviderTradeRecord | None:
        rows = sorted(
            cls._deduplicate_deals(rows),
            key=lambda row: cls._time(row.get("time") or row.get("brokerTime")),
        )
        if not rows:
            return None
        if any(cls._entry_kind(row) is None for row in rows):
            return None
        opening = [row for row in rows if cls._entry_kind(row) == "in"]
        closing = [row for row in rows if cls._entry_kind(row) == "out"]
        if not opening:
            return None
        first = opening[0]
        first_side: Literal["long", "short"] = (
            "long"
            if "BUY" in str(first.get("type") or "").upper()
            else "short"
        )

        def quantity(row: dict) -> Decimal:
            return cls._decimal(row.get("volume")) or Decimal("0")

        if any(quantity(row) <= 0 or cls._decimal(row.get("price")) is None for row in rows):
            return None
        opened_volume = sum((quantity(item) for item in opening), Decimal("0"))
        closed_volume = sum((quantity(item) for item in closing), Decimal("0"))
        if closed_volume > opened_volume + Decimal("0.00000001"):
            return None
        fully_closed = bool(closing) and abs(opened_volume - closed_volume) <= Decimal("0.00000001")

        def weighted_price(items: list[dict]) -> Decimal | None:
            total = sum((quantity(item) for item in items), Decimal("0"))
            if total <= 0:
                return None
            return sum(
                (
                    quantity(item) * cls._decimal(item["price"])
                    for item in items
                ),
                Decimal("0"),
            ) / total

        open_price = weighted_price(opening)
        if open_price is None:
            return None
        close_price = weighted_price(closing) if fully_closed else None
        gross = sum((cls._decimal(item.get("profit")) or Decimal("0") for item in rows), Decimal("0"))
        gross_available = fully_closed and all(cls._decimal(item.get("profit")) is not None for item in rows)
        missing_costs = [field for field in ("commission", "swap") if any(
            cls._decimal(item.get(field)) is None for item in rows
        )]
        return ProviderTradeRecord(
            provider_trade_id=position_id,
            provider_order_id=(
                str(first.get("orderId")) if first.get("orderId") else None
            ),
            provider_position_id=position_id,
            symbol=str(first.get("symbol") or "UNKNOWN"),
            direction=first_side,
            volume=opened_volume,
            open_time=cls._time(first.get("time") or first.get("brokerTime")),
            close_time=(
                cls._time(closing[-1].get("time") or closing[-1].get("brokerTime"))
                if fully_closed
                else None
            ),
            open_price=open_price,
            close_price=close_price,
            stop_loss=cls._decimal(first.get("stopLoss")),
            take_profit=cls._decimal(first.get("takeProfit")),
            gross_profit=gross,
            commission=sum(
                (cls._decimal(item.get("commission")) or Decimal("0") for item in rows),
                Decimal("0"),
            ),
            swap=sum(
                (cls._decimal(item.get("swap")) or Decimal("0") for item in rows),
                Decimal("0"),
            ),
            comment=next((item.get("comment") for item in reversed(rows) if item.get("comment")), None),
            market_type="cfd",
            raw_payload={
                "deals": rows,
                "platform": first.get("platform"),
                "opened_volume": str(opened_volume),
                "closed_volume": str(closed_volume),
                "remaining_volume": str(max(opened_volume - closed_volume, Decimal("0"))),
                "realized_gross_profit": str(gross),
                "gross_pnl_available": gross_available,
                "net_pnl_available": gross_available and not missing_costs,
                "pnl_source": "provider" if gross_available else "unavailable",
                "missing_cost_fields": missing_costs,
            },
        )

    @staticmethod
    def _api_time(value: datetime) -> str:
        return value.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"

    @staticmethod
    def _time(value) -> datetime:
        if isinstance(value, datetime):
            return value.astimezone(timezone.utc)
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value / 1000 if value > 10_000_000_000 else value, timezone.utc)
        if value:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc)
        return datetime.now(timezone.utc)

    @staticmethod
    def _decimal(value):
        try:
            number = Decimal(str(value)) if value is not None else None
            return number if number is not None and number.is_finite() else None
        except (InvalidOperation, ValueError, TypeError):
            return None

    @staticmethod
    def _account_type(
        information: dict, provisioning: dict
    ) -> Literal["real", "demo", "unknown"]:
        mode = str(information.get("type") or "").upper()
        if mode == "ACCOUNT_TRADE_MODE_REAL":
            return "real"
        if mode in {"ACCOUNT_TRADE_MODE_DEMO", "ACCOUNT_TRADE_MODE_CONTEST"}:
            return "demo"
        server = str(
            information.get("server") or provisioning.get("server") or ""
        ).upper()
        return "demo" if "DEMO" in server else "unknown"
