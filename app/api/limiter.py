"""
Shared slowapi rate limiter instance.

Import `limiter` in any route module and decorate endpoints with:
    @limiter.limit("5/minute")
    async def my_endpoint(request: Request, ...):

Wire into FastAPI app in main.py:
    from app.api.limiter import limiter
    from slowapi import _rate_limit_exceeded_handler
    from slowapi.errors import RateLimitExceeded
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Key on caller's IP address — works behind Railway's reverse proxy
limiter = Limiter(key_func=get_remote_address)
