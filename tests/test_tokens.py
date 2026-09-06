"""The shared JWT helper: require_auth and the 429 log line must agree on who a
token belongs to, for every shape a token can take (issue #146)."""

import os
from datetime import timedelta

import pytest
from starlette.requests import Request

from policy_assistant.api import tokens
from policy_assistant.api.limiter import _cred_claim
from policy_assistant.api.routes.auth import (
    PRIMARY_PASSWORD_HASH_VAR,
    create_access_token,
    credential_fingerprint,
)


def _token(**overrides) -> str:
    claims = {
        "sub": "user",
        "cred": PRIMARY_PASSWORD_HASH_VAR,
        "fingerprint": credential_fingerprint(os.environ["APP_PASSWORD_HASH"]),
    }
    claims.update(overrides)
    return create_access_token(claims, timedelta(hours=1))


def _request_with(authorization: str | None) -> Request:
    headers = [] if authorization is None else [(b"authorization", authorization.encode())]
    return Request({"type": "http", "method": "GET", "path": "/", "headers": headers})


def _tampered(token: str) -> str:
    # Flip the first character of the signature segment. Base64url, so the swap
    # stays in-alphabet and the token still parses; only the signature check
    # fails. The first character is the one to change: every one of its six
    # bits lands in the decoded bytes, whereas the last character carries
    # padding bits, so flipping it can decode to the very same signature.
    header, payload, signature = token.split(".")
    first = "A" if signature[0] != "A" else "B"
    return f"{header}.{payload}.{first}{signature[1:]}"


@pytest.mark.parametrize(
    ("make_token", "expected_cred", "expected_status"),
    [
        (_token, PRIMARY_PASSWORD_HASH_VAR, 200),
        (lambda: _tampered(_token()), None, 401),
        (
            lambda: create_access_token({"cred": PRIMARY_PASSWORD_HASH_VAR}, timedelta(-1)),
            None,
            401,
        ),
        (lambda: "not.a.jwt", None, 401),
        (lambda: _token(cred=["APP_PASSWORD_HASH"]), None, 401),
    ],
    ids=["valid", "tampered-signature", "expired", "garbage", "cred-not-a-string"],
)
def test_auth_dependency_and_rate_limit_log_agree(
    client, make_token, expected_cred, expected_status
):
    token = make_token()
    header = f"Bearer {token}"

    assert tokens.cred_claim(tokens.decode_claims(token)) == expected_cred
    assert _cred_claim(_request_with(header)) == expected_cred
    assert client.get("/api/conversations", headers={"Authorization": header}).status_code == (
        expected_status
    )


@pytest.mark.parametrize(
    "header",
    ["bearer {token}", "BEARER {token}", "Bearer  {token}", "Bearer {token} "],
    ids=["lowercase-scheme", "uppercase-scheme", "two-spaces", "trailing-space"],
)
def test_header_shapes_http_bearer_accepts_are_logged_with_the_same_cred(client, header):
    # HTTPBearer lowercases the scheme and strips the token; the log line must
    # not call a request "unknown" that the auth dependency let through.
    value = header.format(token=_token())
    assert client.get("/api/conversations", headers={"Authorization": value}).status_code == 200
    assert _cred_claim(_request_with(value)) == PRIMARY_PASSWORD_HASH_VAR


def test_missing_or_malformed_authorization_header_yields_no_cred():
    assert _cred_claim(_request_with(None)) is None
    assert _cred_claim(_request_with("Basic abc")) is None
    assert _cred_claim(_request_with("Bearer")) is None
    assert _cred_claim(_request_with("Bearer ")) is None


def test_secret_is_read_at_call_time(monkeypatch):
    token = _token()
    assert tokens.decode_claims(token) is not None

    monkeypatch.delenv("JWT_SECRET_KEY")
    assert tokens.decode_claims(token) is None
    with pytest.raises(RuntimeError, match="JWT_SECRET_KEY"):
        tokens.encode_token({"sub": "user"})

    monkeypatch.setenv("JWT_SECRET_KEY", "a-different-secret")
    assert tokens.decode_claims(token) is None, (
        "a token signed under the old secret must not verify"
    )
    assert tokens.cred_claim(tokens.decode_claims(tokens.encode_token({"cred": "x"}))) == "x"
