"""Shared slowapi rate limiter instance.

Imported by both main.py (to register the exception handler) and any route
that needs a rate limit decorator.
"""

import logging

from fastapi import Request
from fastapi.responses import Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from policy_assistant.api.tokens import bearer_token, cred_claim, decode_claims

logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)


def _cred_claim(request: Request) -> str | None:
    """Return the JWT ``cred`` claim for logging, or None.

    Same decode as require_auth, via policy_assistant.api.tokens, so the log
    line and the auth check cannot disagree about who a token belongs to. None
    means the header is missing or malformed, the token does not verify, or
    the claim is not shaped like a variable name; a verified, well-shaped
    ``cred`` is logged as is, whether or not it names a configured hash. Does
    not log the token. Rate limits also cover unauthenticated routes.
    """
    token = bearer_token(request.headers.get("Authorization"))
    if token is None:
        return None
    return cred_claim(decode_claims(token))


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """Log cred + remote address on 429, then return slowapi's default body."""
    logger.warning(
        "Rate limit exceeded for cred=%s from %s on %s",
        _cred_claim(request) or "unknown",
        get_remote_address(request),
        request.url.path,
    )
    return _rate_limit_exceeded_handler(request, exc)
