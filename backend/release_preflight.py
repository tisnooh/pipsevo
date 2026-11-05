"""Read-only startup checks for the existing Render service."""
import re

from http_policy import build_cors_origins


async def check_runtime(database, env, *, private_gateway_configured, allowed_origins):
    hosted = env.get("RENDER") == "true"
    if hosted:
        if not private_gateway_configured:
            raise RuntimeError("Account lifecycle gateway is not configured")
        frontend = build_cors_origins("", env.get("FRONTEND_URL", ""))[0]
        if frontend not in allowed_origins:
            raise RuntimeError("Public frontend origin is not allowed by CORS")

    # PyMongo performs its server wire-version check on server selection. With
    # the pinned driver, a successful ping requires a compatible server (4.4+).
    # This runs before index creation and does not require buildInfo privileges.
    await database.command("ping")
    if not hosted:
        return None
    revision = env.get("RENDER_GIT_COMMIT", "")
    # The only host metadata exposed publicly is a validated source revision.
    return {"startup_database_check": "passed", **(
        {"commit": revision} if re.fullmatch(r"[0-9a-f]{40}", revision) else {}
    )}
