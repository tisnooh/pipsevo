from __future__ import annotations

import os
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from fastapi.responses import RedirectResponse

from .errors import IntegrationError
from .models import (
    AccountSelectionRequest,
    MetaApiLinkRequest,
    MT5Credentials,
    OAuthCallbackRequest,
    OAuthStartRequest,
    TradeLockerCredentials,
)


def build_integration_router(get_current_user, service) -> APIRouter:
    router = APIRouter(prefix="/integrations", tags=["integrations"])

    def plan_for(user: dict) -> str:
        return str(user.get("plan") or "beta")

    async def invoke(operation):
        try:
            return await operation
        except IntegrationError as exc:
            raise HTTPException(
                status_code=exc.status_code,
                detail={"code": exc.code, "message": exc.public_message},
            ) from None

    @router.get("/capabilities")
    async def capabilities(user=Depends(get_current_user)):
        return service.capabilities(plan_for(user))

    @router.get("/connections")
    async def list_connections(user=Depends(get_current_user)):
        return await invoke(service.list_connections(user["id"], user["_supabase_token"]))

    @router.post("/oauth/start")
    async def start_oauth(body: OAuthStartRequest, user=Depends(get_current_user)):
        return await invoke(
            service.start_oauth(user["id"], plan_for(user), body.provider, body.return_path)
        )

    @router.post("/oauth/complete")
    async def complete_oauth(body: OAuthCallbackRequest, _user=Depends(get_current_user)):
        return await invoke(service.complete_oauth(body.provider, body.code, body.state))

    @router.get("/oauth/callback", include_in_schema=False)
    async def oauth_callback(
        code: str = Query(...),
        state: str = Query(...),
        provider: str | None = Query(default=None),
        error: str | None = Query(default=None),
    ):
        if error:
            target = f"{service.config.frontend_url}/app/settings?integration=error&{urlencode({'reason': error})}"
            return RedirectResponse(target, status_code=302)
        providers = [provider] if provider in {"ctrader", "tradovate"} else ["ctrader", "tradovate"]
        last_error = None
        for candidate in providers:
            try:
                result = await service.complete_oauth(candidate, code, state)
                query = urlencode(
                    {"integration": "connected", "provider": candidate, "connection": result["connection"]["id"]}
                )
                return RedirectResponse(
                    f"{service.config.frontend_url}{result['redirect_after']}?{query}", status_code=302
                )
            except IntegrationError as exc:
                last_error = exc
                if exc.code != "oauth_state_invalid":
                    break
        detail = last_error.public_message if last_error else "Autorisation impossible."
        return RedirectResponse(
            f"{service.config.frontend_url}/app/settings?{urlencode({'integration': 'error', 'reason': detail})}",
            status_code=302,
        )

    @router.post("/tradelocker/connect")
    async def connect_tradelocker(body: TradeLockerCredentials, user=Depends(get_current_user)):
        return await invoke(service.connect_tradelocker(user["id"], plan_for(user), body))

    @router.post("/metaapi/start")
    async def start_metaapi(body: MetaApiLinkRequest, user=Depends(get_current_user)):
        return await invoke(service.start_metaapi(user["id"], plan_for(user), body))

    @router.get("/metaapi/servers")
    async def search_metaapi_servers(
        platform: str = Query(default="mt5", pattern="^mt[45]$"),
        query: str = Query(..., min_length=2, max_length=80),
        user=Depends(get_current_user),
    ):
        return await invoke(service.search_metaapi_servers(plan_for(user), platform, query))

    @router.post("/metaapi/{connection_id}/finalize")
    async def finalize_metaapi(connection_id: str, user=Depends(get_current_user)):
        return await invoke(service.finalize_metaapi(user["id"], plan_for(user), connection_id))

    @router.post("/{connection_id}/accounts/select")
    async def select_accounts(
        connection_id: str, body: AccountSelectionRequest, user=Depends(get_current_user)
    ):
        return await invoke(
            service.select_accounts(user["id"], plan_for(user), connection_id, body.account_ids)
        )

    @router.post("/accounts/{integration_account_id}/sync")
    async def sync_account(integration_account_id: str, user=Depends(get_current_user)):
        return await invoke(
            service.sync_integration_account(user["id"], integration_account_id, "manual")
        )

    # Legacy MT5 endpoints stay available for an existing direct adapter.
    @router.post("/mt5/test")
    async def test_connection(body: MT5Credentials, user=Depends(get_current_user)):
        return await invoke(service.test_connection(user["id"], plan_for(user), body))

    @router.post("/mt5/connect")
    async def connect(body: MT5Credentials, user=Depends(get_current_user)):
        return await invoke(service.connect_account(user["id"], plan_for(user), body))

    @router.post("/{connection_id}/sync")
    async def sync(connection_id: str, user=Depends(get_current_user)):
        return await invoke(service.sync_connection(user["id"], connection_id, "manual"))

    @router.post("/{connection_id}/reconnect")
    async def reconnect(connection_id: str, body: MT5Credentials, user=Depends(get_current_user)):
        return await invoke(service.reconnect(user["id"], plan_for(user), connection_id, body))

    @router.delete("/{connection_id}")
    async def disconnect(connection_id: str, user=Depends(get_current_user)):
        return await invoke(service.disconnect(user["id"], connection_id))

    @router.post("/internal/sync-due", include_in_schema=False)
    async def sync_due(authorization: str | None = Header(default=None)):
        expected = os.environ.get("CRON_SECRET")
        if not expected or authorization != f"Bearer {expected}":
            raise HTTPException(status_code=401, detail="Unauthorized")
        return await invoke(service.sync_due_accounts())

    return router
