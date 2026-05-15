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
        await db.execute("""
            CREATE TABLE IF NOT EXISTS reports (
                session_id TEXT PRIMARY KEY REFERENCES conversations(id),
                content TEXT NOT NULL,
                created_at REAL NOT NULL
            )
        """)
        # ── Auth: users table ───────────────────────────────────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                created_at REAL NOT NULL
            )
        """)
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)"
        )
        # ── Migration: add user_id to conversations (idempotent) ─────────
        try:
            await db.execute(
                "ALTER TABLE conversations ADD COLUMN user_id TEXT REFERENCES users(id)"
            )
        except Exception:
            pass  # Column already exists
        # ── Migration: add preferred_language to users (idempotent) ──────
        try:
            await db.execute(
                "ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'es'"
            )
        except Exception:
            pass  # Column already exists

        # ── Wiki tables ──────────────────────────────────────────────────
        await db.execute("""
            CREATE TABLE IF NOT EXISTS wiki_pages (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                slug TEXT NOT NULL,
                title TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'topic',
                created_at REAL NOT NULL,
                updated_at REAL NOT NULL,
                UNIQUE(user_id, slug)
            )
        """)
        await db.execute(
            "CREATE INDEX IF NOT EXISTS idx_wiki_pages_user ON wiki_pages(user_id)"
        )
        await db.execute("""
            CREATE TABLE IF NOT EXISTS wiki_edges (
                source_id TEXT NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
                target_id TEXT NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
                relation TEXT NOT NULL DEFAULT 'related',
                weight REAL NOT NULL DEFAULT 1.0,
                PRIMARY KEY (source_id, target_id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS wiki_session_links (
                wiki_page_id TEXT NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
                session_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                PRIMARY KEY (wiki_page_id, session_id)
            )
        """)
        await db.commit()


async def save_session(
    session_id: str,
    age_group: str,
    stimulus: dict,
    model_size: str,
    language: str,
    created_at: float,
    user_id: Optional[str] = None,
) -> None:
    """Persist a new session. Ignores duplicates."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR IGNORE INTO conversations
               (id, age_group, stimulus, model_size, language, created_at, updated_at, user_id)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                session_id,
                age_group,
                json.dumps(stimulus, ensure_ascii=False),
                model_size,
                language,
                created_at,
                created_at,
                user_id,
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


async def get_conversations_page(page: int, per_page: int, user_id: str) -> dict:
    """Return a paginated list of conversations for a user ordered by creation date desc."""
    offset = (page - 1) * per_page
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            "SELECT COUNT(*) FROM conversations WHERE user_id = ?", (user_id,)
        ) as cur:
            total = (await cur.fetchone())[0]

        async with db.execute(
            """SELECT c.id, c.age_group, c.stimulus, c.model_size, c.language,
                      c.created_at, c.updated_at,
                      COUNT(t.id) AS turn_count
               FROM conversations c
               LEFT JOIN turns t ON t.session_id = c.id
               WHERE c.user_id = ?
               GROUP BY c.id
               ORDER BY c.created_at DESC
               LIMIT ? OFFSET ?""",
            (user_id, per_page, offset),
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


async def get_conversation_detail(session_id: str, user_id: str) -> Optional[dict]:
    """Return a full conversation with all turns, or None if not found or not owned by user."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row

        async with db.execute(
            "SELECT * FROM conversations WHERE id = ? AND user_id = ?",
            (session_id, user_id),
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


async def update_turn_eval(
    session_id: str,
    turn_index: int,
    eval_socratism: float,
    eval_age_fit: float,
    eval_builds_on: float,
    eval_openness: float,
    eval_advancement: float,
    eval_overall: float,
    eval_weighted: float,
    forbidden_behaviors: list,
) -> None:
    """Update evaluation scores for an existing turn."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """UPDATE turns
               SET eval_socratism = ?, eval_age_fit = ?, eval_builds_on = ?,
                   eval_openness = ?, eval_advancement = ?, eval_overall = ?,
                   eval_weighted = ?, forbidden_behaviors = ?
               WHERE session_id = ? AND turn_index = ?""",
            (
                eval_socratism, eval_age_fit, eval_builds_on,
                eval_openness, eval_advancement, eval_overall,
                eval_weighted, json.dumps(forbidden_behaviors, ensure_ascii=False),
                session_id, turn_index,
            ),
        )
        await db.commit()


async def save_report(session_id: str, content: str) -> None:
    """Persist a generated philosophical report (upsert)."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO reports (session_id, content, created_at)
               VALUES (?, ?, ?)
               ON CONFLICT(session_id) DO UPDATE SET content = excluded.content,
                   created_at = excluded.created_at""",
            (session_id, content, time.time()),
        )
        await db.commit()


async def get_report(session_id: str) -> Optional[str]:
    """Retrieve a saved report, or None if not generated yet."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT content FROM reports WHERE session_id = ?", (session_id,)
        ) as cur:
            row = await cur.fetchone()
    return row["content"] if row else None


async def delete_conversation(session_id: str, user_id: str) -> bool:
    """Delete a conversation and all its associated turns and report.

    Returns True if a row was deleted, False if not found or not owned by user.
    """
    async with aiosqlite.connect(DB_PATH) as db:
        # Verify ownership before deleting
        async with db.execute(
            "SELECT id FROM conversations WHERE id = ? AND user_id = ?",
            (session_id, user_id),
        ) as cur:
            if await cur.fetchone() is None:
                return False
        # Child tables first (foreign-key order)
        await db.execute("DELETE FROM reports WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM turns WHERE session_id = ?", (session_id,))
        await db.execute("DELETE FROM conversations WHERE id = ?", (session_id,))
        deleted = db.total_changes > 0
        await db.commit()
    return deleted


# ─── Wiki helpers ─────────────────────────────────────────────────────────────

async def upsert_wiki_page(
    page_id: str,
    user_id: str,
    slug: str,
    title: str,
    category: str,
    now: float,
) -> None:
    """Insert or update a wiki page record."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO wiki_pages (id, user_id, slug, title, category, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(user_id, slug) DO UPDATE SET
                   title = excluded.title,
                   category = excluded.category,
                   updated_at = excluded.updated_at""",
            (page_id, user_id, slug, title, category, now, now),
        )
        await db.commit()


async def get_wiki_page_id(user_id: str, slug: str) -> Optional[str]:
    """Return the page id for a given user+slug, or None."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id FROM wiki_pages WHERE user_id = ? AND slug = ?",
            (user_id, slug),
        ) as cur:
            row = await cur.fetchone()
    return row["id"] if row else None


async def list_wiki_pages(user_id: str) -> list[dict]:
    """Return all wiki page records for a user."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, slug, title, category, created_at, updated_at FROM wiki_pages WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,),
        ) as cur:
            rows = await cur.fetchall()
    return [dict(r) for r in rows]


async def upsert_wiki_edge(source_id: str, target_id: str, relation: str = "related", weight: float = 1.0) -> None:
    """Insert or update an edge between two wiki pages."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO wiki_edges (source_id, target_id, relation, weight)
               VALUES (?, ?, ?, ?)
               ON CONFLICT(source_id, target_id) DO UPDATE SET
                   relation = excluded.relation,
                   weight = wiki_edges.weight + 0.5""",
            (source_id, target_id, relation, weight),
        )
        await db.commit()


async def delete_wiki_edges_for_page(page_id: str) -> None:
    """Remove all edges involving a page (called before re-syncing links)."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "DELETE FROM wiki_edges WHERE source_id = ? OR target_id = ?",
            (page_id, page_id),
        )
        await db.commit()


async def get_wiki_graph(user_id: str) -> dict:
    """Return nodes and edges for the React Flow graph."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, slug, title, category, updated_at FROM wiki_pages WHERE user_id = ?",
            (user_id,),
        ) as cur:
            page_rows = await cur.fetchall()

        page_ids = [r["id"] for r in page_rows]
        if not page_ids:
            return {"nodes": [], "edges": []}

        placeholders = ",".join("?" * len(page_ids))
        async with db.execute(
            f"SELECT source_id, target_id, relation, weight FROM wiki_edges WHERE source_id IN ({placeholders})",
            page_ids,
        ) as cur:
            edge_rows = await cur.fetchall()

        # Count sessions per page
        async with db.execute(
            f"SELECT wiki_page_id, COUNT(*) as cnt FROM wiki_session_links WHERE wiki_page_id IN ({placeholders}) GROUP BY wiki_page_id",
            page_ids,
        ) as cur:
            link_rows = await cur.fetchall()

    session_counts = {r["wiki_page_id"]: r["cnt"] for r in link_rows}

    nodes = [
        {
            "id": r["id"],
            "slug": r["slug"],
            "title": r["title"],
            "category": r["category"],
            "session_count": session_counts.get(r["id"], 0),
            "updated_at": r["updated_at"],
        }
        for r in page_rows
    ]
    edges = [
        {
            "source": r["source_id"],
            "target": r["target_id"],
            "relation": r["relation"],
            "weight": r["weight"],
        }
        for r in edge_rows
    ]
    return {"nodes": nodes, "edges": edges}


async def link_wiki_page_to_session(wiki_page_id: str, session_id: str) -> None:
    """Associate a wiki page with a session (idempotent)."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT OR IGNORE INTO wiki_session_links (wiki_page_id, session_id) VALUES (?, ?)",
            (wiki_page_id, session_id),
        )
        await db.commit()


async def get_sessions_for_wiki_page(wiki_page_id: str) -> list[str]:
    """Return session IDs linked to a wiki page."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT session_id FROM wiki_session_links WHERE wiki_page_id = ?",
            (wiki_page_id,),
        ) as cur:
            rows = await cur.fetchall()
    return [r["session_id"] for r in rows]


async def get_full_session_for_wiki(session_id: str) -> Optional[dict]:
    """Return session + turns + report content for wiki synthesis (no user check)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM conversations WHERE id = ?", (session_id,)) as cur:
            conv = await cur.fetchone()
        if conv is None:
            return None
        async with db.execute(
            "SELECT child_input, content, question_type, eval_socratism, eval_age_fit, eval_builds_on, eval_openness, eval_advancement, eval_overall FROM turns WHERE session_id = ? ORDER BY turn_index ASC",
            (session_id,),
        ) as cur:
            turn_rows = await cur.fetchall()
        async with db.execute("SELECT content FROM reports WHERE session_id = ?", (session_id,)) as cur:
            report_row = await cur.fetchone()

    return {
        "session_id": session_id,
        "age_group": conv["age_group"],
        "stimulus": json.loads(conv["stimulus"]),
        "language": conv["language"],
        "turns": [
            {
                "child_input": t["child_input"],
                "content": t["content"],
                "question_type": t["question_type"],
                "scores": {
                    "socratism": t["eval_socratism"],
                    "age_fit": t["eval_age_fit"],
                    "builds_on": t["eval_builds_on"],
                    "openness": t["eval_openness"],
                    "advancement": t["eval_advancement"],
                    "overall": t["eval_overall"],
                },
            }
            for t in turn_rows
        ],
        "report": report_row["content"] if report_row else None,
    }


# ── User management ────────────────────────────────────────────────────────────

async def create_user(email: str, password_hash: str) -> dict:
    """Create a new user and return the created user dict."""
    import uuid as _uuid
    user_id = str(_uuid.uuid4())
    now = time.time()
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT INTO users (id, email, password_hash, created_at)
               VALUES (?, ?, ?, ?)""",
            (user_id, email, password_hash, now),
        )
        await db.commit()
    return {"id": user_id, "email": email, "password_hash": password_hash}


async def get_user_by_email(email: str) -> Optional[dict]:
    """Return a user dict by email, or None if not found."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, email, password_hash, preferred_language FROM users WHERE email = ?", (email,)
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def get_user_by_id(user_id: str) -> Optional[dict]:
    """Return a user dict by ID, or None if not found."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT id, email, preferred_language FROM users WHERE id = ?", (user_id,)
        ) as cur:
            row = await cur.fetchone()
    return dict(row) if row else None


async def update_user_language(user_id: str, language: str) -> None:
    """Persist the user's preferred language."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET preferred_language = ? WHERE id = ?",
            (language, user_id),
        )
        await db.commit()
