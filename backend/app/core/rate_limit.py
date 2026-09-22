import os

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Redis-backed storage: Dockerfile.prod runs uvicorn with --workers 4 (four
# separate OS processes). Plain in-memory storage would give each worker its
# own independent counter, silently multiplying every configured limit by
# ~4x and making enforcement inconsistent depending on which worker a
# request lands on. Redis shares counts across all workers (and any future
# horizontally-scaled replicas), so a limit like "20/minute" actually means
# 20/minute for the app as a whole, not per worker.
#
# RATE_LIMIT_ENABLED=false lets the test suite disable limiting, since a single
# pytest run legitimately fires far more requests from one "IP" than any real
# user would in the same window.
_enabled = os.getenv("RATE_LIMIT_ENABLED", "true").lower() != "false"

limiter = Limiter(key_func=get_remote_address, enabled=_enabled, storage_uri=settings.redis_url)
