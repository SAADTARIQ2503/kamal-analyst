import json
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.config import BACKEND_DIR

DB_PATH = BACKEND_DIR / "data" / "app.sqlite"
_lock = threading.Lock()

PAGES = {"grey", "processing", "cut_to_pack", "yarn", "knitting"}


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        "CREATE TABLE IF NOT EXISTS saved_views (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, page TEXT NOT NULL, "
        "name TEXT NOT NULL, filters TEXT NOT NULL, created_at TEXT NOT NULL)"
    )
    return conn


def list_views(username: str, page: str) -> list[dict[str, Any]]:
    with _lock, _connect() as conn:
        rows = conn.execute(
            "SELECT id, name, filters FROM saved_views WHERE username = ? AND page = ? ORDER BY name", (username, page)
        ).fetchall()
    return [{"id": r["id"], "name": r["name"], "filters": json.loads(r["filters"])} for r in rows]


def add_view(username: str, page: str, name: str, filters: dict[str, str]) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    with _lock, _connect() as conn:
        cur = conn.execute(
            "INSERT INTO saved_views (username, page, name, filters, created_at) VALUES (?, ?, ?, ?, ?)",
            (username, page, name, json.dumps(filters), now),
        )
        conn.commit()
        return {"id": cur.lastrowid, "name": name, "filters": filters}


def delete_view(username: str, view_id: int) -> bool:
    with _lock, _connect() as conn:
        cur = conn.execute("DELETE FROM saved_views WHERE id = ? AND username = ?", (view_id, username))
        conn.commit()
        return cur.rowcount > 0
