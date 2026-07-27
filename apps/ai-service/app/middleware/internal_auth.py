from fastapi import Header, HTTPException, status

from app.core.config import settings


# Mirrors apps/api/src/auth/guards/internal-api-key.guard.ts — this service
# is only ever called server-to-server by the NestJS API, never by a
# browser, so a shared secret header stands in for a user JWT.
def require_internal_api_key(x_internal_api_key: str = Header(default="")) -> None:
    if not x_internal_api_key or x_internal_api_key != settings.internal_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid internal API key.",
        )
