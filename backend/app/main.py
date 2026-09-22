from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.i18n import get_locale, t
from app.core.rate_limit import limiter
from app.db.bootstrap import bootstrap_super_admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    bootstrap_super_admin()
    yield


_is_production = settings.env == "production"
app = FastAPI(
    title="KPI Platform API",
    lifespan=lifespan,
    docs_url=None if _is_production else "/docs",
    redoc_url=None if _is_production else "/redoc",
    openapi_url=None if _is_production else "/openapi.json",
)
app.state.limiter = limiter
app.include_router(api_router)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    locale = get_locale(request)
    return JSONResponse(status_code=429, content={"detail": t("rate_limit_exceeded", locale)})


@app.get("/health")
def health():
    return {"status": "ok"}
