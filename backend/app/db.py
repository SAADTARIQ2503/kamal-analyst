from typing import Any

import oracledb

from app.config import Settings
from app.sql_guard import validate_select

_pool: oracledb.ConnectionPool | None = None


def init_pool(settings: Settings) -> None:
    global _pool
    if _pool is not None:
        return
    _pool = oracledb.create_pool(
        user=settings.db_user,
        password=settings.db_password.get_secret_value(),
        dsn=settings.db_dsn,
        min=settings.db_pool_min,
        max=settings.db_pool_max,
        increment=1,
    )


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


def run_select(sql: str, binds: dict[str, Any] | None = None, *, row_limit: int, timeout_ms: int) -> tuple[list[str], list[tuple]]:
    safe_sql = validate_select(sql)
    if _pool is None:
        raise RuntimeError("Database pool is not initialised.")
    with _pool.acquire() as conn:
        conn.call_timeout = timeout_ms
        with conn.cursor() as cur:
            cur.execute("SET TRANSACTION READ ONLY")
            cur.execute(safe_sql, binds or {})
            columns = [d[0] for d in cur.description or []]
            rows = cur.fetchmany(row_limit + 1)
            conn.rollback()
    return columns, rows
