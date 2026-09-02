from __future__ import annotations

from datetime import datetime, timedelta, timezone
from collections import defaultdict
from decimal import Decimal
import secrets

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

    def __init__(self, token: str, domain: str = "agiliumtrade.agiliumtrade.ai"):
        self.token = token
        self.domain = domain
        self.provisioning_url = f"https://mt-provisioning-api-v1.{domain}"

    @property
    def headers(self) -> dict[str, str]:
        return {"auth-token": self.token, "Content-Type": "application/json"}

    async def _request(self, method: str, url: str, **kwargs):
        return await request_json(
            method,
            url,
            provider_authentication=True,
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
            "login": request.login,
            "server": request.server,
            "platform": request.platform,
            "magic": 0,
        }
        # The optional password is transmitted directly to MetaApi and discarded
        # after this request; it is never returned to the service or persisted.
        if request.password:
            body["password"] = request.password.get_secret_value()
        headers = {**self.headers, "transaction-id": secrets.token_hex(16)}
        created = await self._request(
            "POST",
            f"{self.provisioning_url}/users/current/accounts",
            headers=headers,
            json=body,
            expected=(200, 201, 202),
        )
        account_id = str(created.get("id") or created.get("_id") or "")
        if not account_id:
            if created.get("message"):
                raise IntegrationError(
                    "provider_processing",
                    "MetaApi vérifie le serveur de trading. Réessaie la connexion dans une minute.",
                    409,
                )
            raise IntegrationError("provider_invalid_response", "MetaApi n’a pas créé le compte.", 502)

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
        client_url = f"https://mt-client-api-v1.{region}.{self.domain}"
        information = await self._request(
            "GET",
            f"{client_url}/users/current/accounts/{provider_id}/account-information",
            headers=self.headers,
        )
        return [
            DetectedAccount(
                external_account_id=provider_id,
                broker_name=row.get("broker") or "MetaTrader",
                server_name=row.get("server"),
                account_number_masked=f"•••• {str(row.get('login') or '')[-4:]}",
                account_type="demo" if "DEMO" in str(row.get("server", "")).upper() else "unknown",
                account_currency=information.get("currency"),
                balance=self._decimal(information.get("balance")),
                equity=self._decimal(information.get("equity")),
                display_name=row.get("name"),
                provider_metadata={
                    "region": row.get("region"),
                    "state": deployment_state,
                    "connection_status": connection_state,
                    "platform": row.get("platform"),
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
        return await self._sync(account, access, start)

    async def sync_recent(self, account: IntegrationAccount, access: dict, cursor: dict) -> SyncBatch:
        value = cursor.get("last_close_time")
        start = datetime.fromisoformat(value.replace("Z", "+00:00")) - timedelta(minutes=5) if value else datetime.now(timezone.utc) - timedelta(days=7)
        return await self._sync(account, access, start)

    async def _sync(self, account: IntegrationAccount, access: dict, start: datetime) -> SyncBatch:
        provider_id = access.get("provider_account_id") or account.external_account_id
        metadata = account.provider_metadata or {}
        region = metadata.get("region") or access.get("region") or "new-york"
        client_url = f"https://mt-client-api-v1.{region}.{self.domain}"
        end = datetime.now(timezone.utc)
        rows = []
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
            page = deals if isinstance(deals, list) else deals.get("deals", [])
            rows.extend(page)
            if len(page) < page_limit:
                break
            offset += page_limit
        information = await self._request(
            "GET",
            f"{client_url}/users/current/accounts/{provider_id}/account-information",
            headers=self.headers,
        )
        executions: list[ProviderExecutionRecord] = []
        positions: dict[str, list[dict]] = defaultdict(list)
        latest = start
        for row in rows:
            kind = str(row.get("type") or "").upper()
            if kind not in {"DEAL_TYPE_BUY", "DEAL_TYPE_SELL", "BUY", "SELL"}:
                continue
            executed_at = self._time(row.get("time") or row.get("brokerTime"))
            latest = max(latest, executed_at)
            position_id = str(row.get("positionId") or row.get("id"))
            positions[position_id].append(row)
            executions.append(
                ProviderExecutionRecord(
                    provider_execution_id=str(row.get("id")),
                    provider_order_id=(
                        str(row.get("orderId")) if row.get("orderId") else None
                    ),
                    provider_position_id=position_id,
                    symbol=str(row.get("symbol") or "UNKNOWN"),
                    direction="long" if "BUY" in kind else "short",
                    quantity=Decimal(str(abs(row.get("volume") or 0))),
                    price=Decimal(str(row.get("price") or 0)),
                    executed_at=executed_at,
                    commission=Decimal(str(row.get("commission") or 0)),
                    realized_pnl=Decimal(str(row.get("profit") or 0)),
                    raw_payload=row,
                )
            )
        trades = [
            trade
            for position_id, position_rows in positions.items()
            if (trade := self._group_position(position_id, position_rows)) is not None
        ]
        snapshot = AccountSnapshot(
            balance=self._decimal(information.get("balance")),
            equity=self._decimal(information.get("equity")),
            margin=self._decimal(information.get("margin")),
            free_margin=self._decimal(information.get("freeMargin")),
            currency=information.get("currency"),
            captured_at=end,
            raw_payload=information,
        )
        partial = offset >= 100_000
        return SyncBatch(
            trades=trades,
            executions=executions,
            snapshot=snapshot,
            next_cursor={"last_close_time": latest.isoformat()},
            partial_error=partial,
            warning_code="history_page_limit" if partial else None,
        )

    @classmethod
    def _group_position(
        cls, position_id: str, rows: list[dict]
    ) -> ProviderTradeRecord | None:
        rows = sorted(
            rows,
            key=lambda row: cls._time(row.get("time") or row.get("brokerTime")),
        )
        if not rows:
            return None
        first = rows[0]
        first_side = "long" if "BUY" in str(first.get("type") or "").upper() else "short"

        def is_opening(row: dict) -> bool:
            entry_type = str(row.get("entryType") or "").upper()
            if entry_type:
                return entry_type in {"DEAL_ENTRY_IN", "IN", "0"}
            side = "long" if "BUY" in str(row.get("type") or "").upper() else "short"
            return side == first_side

        opening = [row for row in rows if is_opening(row)] or [first]
        closing = [row for row in rows if row not in opening]

        def quantity(row: dict) -> Decimal:
            return Decimal(str(abs(row.get("volume") or 0)))

        def weighted_price(items: list[dict]) -> Decimal | None:
            total = sum((quantity(item) for item in items), Decimal("0"))
            if total <= 0:
                return None
            return sum(
                (
                    Decimal(str(item.get("price") or item.get("openPrice") or 0))
                    * quantity(item)
                    for item in items
                ),
                Decimal("0"),
            ) / total

        open_price = weighted_price(opening)
        if open_price is None:
            return None
        close_price = weighted_price(closing)
        return ProviderTradeRecord(
            provider_trade_id=position_id,
            provider_order_id=(
                str(first.get("orderId")) if first.get("orderId") else None
            ),
            provider_position_id=position_id,
            symbol=str(first.get("symbol") or "UNKNOWN"),
            direction=first_side,
            volume=sum((quantity(item) for item in opening), Decimal("0")),
            open_time=cls._time(first.get("time") or first.get("brokerTime")),
            close_time=(
                cls._time(closing[-1].get("time") or closing[-1].get("brokerTime"))
                if closing
                else None
            ),
            open_price=open_price,
            close_price=close_price,
            stop_loss=(
                Decimal(str(first["stopLoss"])) if first.get("stopLoss") else None
            ),
            take_profit=(
                Decimal(str(first["takeProfit"])) if first.get("takeProfit") else None
            ),
            gross_profit=sum(
                (Decimal(str(item.get("profit") or 0)) for item in rows),
                Decimal("0"),
            ),
            commission=sum(
                (Decimal(str(item.get("commission") or 0)) for item in rows),
                Decimal("0"),
            ),
            swap=sum(
                (Decimal(str(item.get("swap") or 0)) for item in rows),
                Decimal("0"),
            ),
            comment=next((item.get("comment") for item in reversed(rows) if item.get("comment")), None),
            market_type="cfd",
            raw_payload={"deals": rows},
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
        return Decimal(str(value)) if value is not None else None
