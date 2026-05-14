"""SQLite persistence layer for conversations."""

import json
import os
import time
from typing import Optional

import aiosqlite

DB_PATH = os.environ.get("DB_PATH", "conversations.db")


async def init_db() -> None:
    """Initialize the database schema (idempotent)."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                age_group TEXT NOT NULL,
                stimulus TEXT NOT NULL,
                model_size TEXT NOT NULL,
                language TEXT NOT NULL,
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS turns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL REFERENCES conversations(id),
                turn_index INTEGER NOT NULL,
                child_input TEXT NOT NULL DEFAULT '',
                content TEXT NOT NULL,
                question_type TEXT NOT NULL,
                thinking_trace TEXT NOT NULL DEFAULT '',
                eval_socratism REAL,
                eval_age_fit REAL,
                eval_builds_on REAL,
                eval_openness REAL,
                eval_advancement REAL,
                eval_overall REAL,
                eval_weighted REAL,
                forbidden_behaviors TEXT DEFAULT '[]',
                rag_moves_used TEXT DEFAULT '[]',
                timestamp REAL NOT NULL
            )
        """)
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_turns_session ON turns(session_id)"
        )
        await db.commit()


async def save_session(
    session_id: str,
    age_group: str,
    stimulus: dict,
    model_size: str,
    language: str,
    created_at: float,
) -> None:
    """Persist a new session. Ignores duplicates."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR IGNORE INTO conversations
               (id, age_group, stimulus, model_size, language, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                session_id,
                age_group,
                json.dumps(stimulus, ensure_ascii=False),
                model_size,
                language,
                created_at,
                created_at,
            ),
        )
        await db.commit()


async def save_turn(
    session_id: str,
    turn_index: int,
    child_input: str,
    content: str,
    question_type: str,
    thinking_trace: str,
    eval_socratism: float,
    eval_age_fit: float,
    eval_builds_on: float,
    eval_openness: float,
    eval_advancement: float,
    eval_overall: float,
    eval_weighted: float,
    forbidden_behaviors: list,
    rag_moves_used: list,
    timestamp: float,
) -> None:
    """Persist a completed turn and update session's updated_at."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO turns
               (session_id, turn_index, child_input, content, question_type,
                thinking_trace, eval_socratism, eval_age_fit, eval_builds_on,
                eval_openness, eval_advancement, eval_overall, eval_weighted,
                forbidden_behaviors, rag_moves_used, timestamp)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                session_id,
                turn_index,
                child_input,
                content,
                question_type,
                thinking_trace,
                eval_socratism,
                eval_age_fit,
                eval_builds_on,
                eval_openness,
                eval_advancement,
                eval_overall,
                eval_weighted,
                json.dumps(forbidden_behaviors, ensure_ascii=False),
                json.dumps(rag_moves_used, ensure_ascii=False),
                timestamp,
            ),
        )
        await db.execute(
            "UPDATE conversations SET updated_at = ? WHERE id = ?",
            (time.time(), session_id),
        )
        await db.commit()


async def get_conversations_page(page: int, per_page: int) -> dict:
    """Return a paginated list of conversations ordered by creation date desc."""
    offset = (page - 1) * per_page
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute("SELECT COUNT(*) FROM conversations") as cur:
            total = (await cur.fetchone())[0]

        async with db.execute(
            """SELECT c.id, c.age_group, c.stimulus, c.model_size, c.language,
                      c.created_at, c.updated_at,
                      COUNT(t.id) AS turn_count
               FROM conversations c
               LEFT JOIN turns t ON t.session_id = c.id
               GROUP BY c.id
               ORDER BY c.created_at DESC
               LIMIT ? OFFSET ?""",
            (per_page, offset),
        ) as cur:
            rows = await cur.fetchall()

    items = [
        {
            "id": row["id"],
            "age_group": row["age_group"],
            "stimulus": json.loads(row["stimulus"]),
            "model_size": row["model_size"],
            "language": row["language"],
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
            "turn_count": row["turn_count"],
        }
        for row in rows
    ]

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, (total + per_page - 1) // per_page),
        "items": items,
    }


async def get_conversation_detail(session_id: str) -> Optional[dict]:
    """Return a full conversation with all turns, or None if not found."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            "SELECT * FROM conversations WHERE id = ?", (session_id,)
        ) as cur:
            conv = await cur.fetchone()

        if conv is None:
            return None

        async with db.execute(
            "SELECT * FROM turns WHERE session_id = ? ORDER BY turn_index ASC",
            (session_id,),
        ) as cur:
            turn_rows = await cur.fetchall()

    turns = [
        {
            "id": t["id"],
            "turn_index": t["turn_index"],
            "child_input": t["child_input"],
            "content": t["content"],
            "question_type": t["question_type"],
            "thinking_trace": t["thinking_trace"],
            "eval_scores": {
                "socratism": t["eval_socratism"],
                "age_fit": t["eval_age_fit"],
                "builds_on": t["eval_builds_on"],
                "openness": t["eval_openness"],
                "advancement": t["eval_advancement"],
                "overall": t["eval_overall"],
                "weighted_overall": t["eval_weighted"],
            },
            "forbidden_behaviors_detected": json.loads(t["forbidden_behaviors"] or "[]"),
            "rag_moves_used": json.loads(t["rag_moves_used"] or "[]"),
            "timestamp": t["timestamp"],
        }
        for t in turn_rows
    ]

    return {
        "id": conv["id"],
        "age_group": conv["age_group"],
        "stimulus": json.loads(conv["stimulus"]),
        "model_size": conv["model_size"],
        "language": conv["language"],
        "created_at": conv["created_at"],
        "updated_at": conv["updated_at"],
        "turns": turns,
    }
