import re

_FORBIDDEN = re.compile(
    r"\b(insert|update|delete|merge|drop|alter|create|truncate|grant|revoke|"
    r"begin|declare|call|commit|rollback|savepoint|execute|exec|lock|analyze|"
    r"comment|rename|purge|flashback|into)\b",
    re.IGNORECASE,
)
_COMMENTS = re.compile(r"/\*.*?\*/|--[^\n]*", re.DOTALL)


class UnsafeSqlError(ValueError):
    pass


def validate_select(sql: str) -> str:
    cleaned = _COMMENTS.sub(" ", sql).strip().rstrip(";").strip()
    if not cleaned:
        raise UnsafeSqlError("Query is empty.")
    if ";" in cleaned:
        raise UnsafeSqlError("Only one statement is allowed.")
    if not re.match(r"^(select|with)\b", cleaned, re.IGNORECASE):
        raise UnsafeSqlError("Only SELECT queries are allowed.")
    if _FORBIDDEN.search(cleaned):
        raise UnsafeSqlError("Query contains a keyword that is not allowed.")
    return cleaned
