"""Reject oversized request bodies before FastAPI multipart parsing/spooling."""
from starlette.responses import JSONResponse

from .data import MAX_UPLOAD_BYTES


class BacktestBodyLimit:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or not scope["path"].startswith("/api/backtest") or scope["method"] not in ("POST", "PUT", "PATCH"):
            return await self.app(scope, receive, send)
        limit = MAX_UPLOAD_BYTES + 65536 if scope["path"] == "/api/backtest/datasets" else 16384
        # Buffer at most the bounded request before the parser can create files.
        chunks, size = [], 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            size += len(message.get("body", b""))
            if size > limit:
                response = JSONResponse({"detail": "Requête trop volumineuse."}, status_code=413)
                return await response(scope, receive, send)
            chunks.append(message)
            if not message.get("more_body", False):
                break
        index = 0

        async def bounded_receive():
            nonlocal index
            if index < len(chunks):
                result = chunks[index]
                index += 1
                return result
            return await receive()

        return await self.app(scope, bounded_receive, send)
