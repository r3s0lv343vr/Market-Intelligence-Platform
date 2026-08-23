"""SQLite-backed persistence for the user's watchlist."""

from __future__ import annotations

import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List

DB_PATH = Path(os.environ.get("MIP_DB_PATH", Path(__file__).resolve().parent.parent / "data" / "mip.db"))


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS watchlist (
                symbol   TEXT PRIMARY KEY,
                added_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def list_watchlist() -> List[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT symbol, added_at FROM watchlist ORDER BY added_at ASC"
        ).fetchall()
    return [dict(r) for r in rows]


def add_symbol(symbol: str) -> dict:
    symbol = symbol.upper()
    added_at = datetime.now(timezone.utc).isoformat()
    with _connect() as conn:
        conn.execute(
            "INSERT OR IGNORE INTO watchlist (symbol, added_at) VALUES (?, ?)",
            (symbol, added_at),
        )
        conn.commit()
        row = conn.execute(
            "SELECT symbol, added_at FROM watchlist WHERE symbol = ?", (symbol,)
        ).fetchone()
    return dict(row)


def remove_symbol(symbol: str) -> bool:
    symbol = symbol.upper()
    with _connect() as conn:
        cur = conn.execute("DELETE FROM watchlist WHERE symbol = ?", (symbol,))
        conn.commit()
        return cur.rowcount > 0
