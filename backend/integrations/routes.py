from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from .errors import IntegrationError
from .models import MT5Credentials


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
        return await invoke(
            service.list_connections(user["id"], user["_supabase_token"])
        )

    @router.post("/mt5/test")
    async def test_connection(body: MT5Credentials, user=Depends(get_current_user)):
        return await invoke(service.test_connection(user["id"], plan_for(user), body))

    @router.post("/mt5/connect")
    async def connect(body: MT5Credentials, user=Depends(get_current_user)):
        return await invoke(service.connect_account(user["id"], plan_for(user), body))

    @router.post("/{connection_id}/sync")
    async def sync(connection_id: str, user=Depends(get_current_user)):
        return await invoke(
            service.sync_connection(user["id"], connection_id, "manual")
        )

    @router.post("/{connection_id}/reconnect")
    async def reconnect(
        connection_id: str, body: MT5Credentials, user=Depends(get_current_user)
    ):
        return await invoke(
            service.reconnect(user["id"], plan_for(user), connection_id, body)
        )

    @router.delete("/{connection_id}")
    async def disconnect(connection_id: str, user=Depends(get_current_user)):
        return await invoke(service.disconnect(user["id"], connection_id))

    return router
