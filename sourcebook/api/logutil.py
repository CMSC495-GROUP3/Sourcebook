"""Sink-level sanitizer for values written into API logs.

`ChatRequest.session_id` is already constrained at the HTTP boundary
(`[A-Za-z0-9_-]{1,64}`). CodeQL's `py/log-injection` query does not treat a
Pydantic `Field(pattern=...)` as a sanitizer, so residual alerts stay open on
the four log sinks. This helper is the CodeQL-visible second line of defense
for those sinks and for direct `log_query` callers that skip the request model.

Pass the result into the log call as a normal ``%s`` argument. The API runs
under uvicorn's default log format, which prints only the message, so a value
tucked into ``extra=`` would never reach the log line and the session id would
vanish from exactly the lines it exists to identify.
"""

# Matches ChatRequest.session_id max_length. A log token must stay on one line.
MAX_LOG_TOKEN_LENGTH = 64

# Remaining C0 controls (0x00-0x1F) plus DEL after the explicit CR/LF replaces.
_CONTROL_TRANS = str.maketrans(dict.fromkeys([*range(0x20), 0x7F]))


def normalize_log_token(value: str | None, *, max_length: int = MAX_LOG_TOKEN_LENGTH) -> str:
    """Return a single-line token for structured logs. ``None`` becomes ``"-"``.

    CR and LF are replaced first because that is the shape CodeQL's
    ``ReplaceLineBreaksSanitizer`` recognises (a ``str.replace`` whose first
    argument is a newline literal). Other C0 controls and DEL are stripped
    afterwards; the result is length-bounded.
    """
    if value is None:
        return "-"
    # Keep these as literal replace calls. Folding them into the translate
    # table would still be correct and would reopen the CodeQL alerts.
    cleaned = value.replace("\r", "").replace("\n", "")
    cleaned = cleaned.translate(_CONTROL_TRANS)
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length]
    return cleaned or "-"
