"""JWT signing and verification, shared by login, the auth dependency, and the
rate-limit log line.

One module knows the algorithm and where the secret comes from, so the three
callers cannot drift (issue #146). The secret is read on every call rather
than at import: main.py refuses to start without it, so the read never fails
in a running process, and reading late means a test or the load-test stub can
set the variable without re-importing the package.

This module imports nothing from the rest of the API package on purpose.
auth.py imports the limiter and deps.py imports auth.py, so anything they both
need has to sit below both of them.
"""

import os

from fastapi.security.utils import get_authorization_scheme_param
from jose import JWTError, jwt

_ALGORITHM = "HS256"


def _secret_key() -> str | None:
    """The signing secret as currently set in the environment, or None."""
    return os.getenv("JWT_SECRET_KEY")


def encode_token(claims: dict) -> str:
    secret = _secret_key()
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY is not set; cannot sign a token")
    return jwt.encode(claims, secret, algorithm=_ALGORITHM)


def decode_claims(token: str) -> dict | None:
    """Return the verified claims of a token, or None.

    None covers every way a token can fail: no secret configured, wrong
    signature, expired, or not a JWT at all. Callers decide what None means:
    require_auth answers 401, the 429 log line writes "unknown".
    """
    secret = _secret_key()
    if not secret:
        return None
    try:
        return jwt.decode(token, secret, algorithms=[_ALGORITHM])
    except JWTError:
        return None


def cred_claim(claims: dict | None) -> str | None:
    """The ``cred`` claim as a string, or None when absent or not a string."""
    if not claims:
        return None
    cred = claims.get("cred")
    return cred if isinstance(cred, str) else None


def bearer_token(authorization: str | None) -> str | None:
    """The token in an ``Authorization: Bearer ...`` header value, or None.

    Parsed with the same helper FastAPI's ``HTTPBearer`` uses, so a header
    that ``require_auth`` accepts (scheme in any case, surrounding whitespace
    stripped) yields the same token here. An empty token is None, not "".
    """
    scheme, token = get_authorization_scheme_param(authorization)
    if scheme.lower() != "bearer" or not token:
        return None
    return token
