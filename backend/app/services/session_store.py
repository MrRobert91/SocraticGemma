"""Thread-safe in-memory session store with TTL support."""

import threading
import time
from typing import Optional

from ..models import EvalScores, Session, Turn
from ..config import settings


class SessionStore:
    """Thread-safe in-memory store for Socratic dialogue sessions.
    
    Sessions expire after session_ttl_hours from their created_at timestamp.
    All operations are protected by a threading lock for thread safety.
    """

    def __init__(self, session_ttl_hours: int = None):
        """Initialize the session store.
        
        Args:
            session_ttl_hours: Time-to-live for sessions in hours. Default from settings.
        """
        if session_ttl_hours is None:
            session_ttl_hours = settings.session_ttl_hours
        self._sessions: dict[str, Session] = {}
        self._lock = threading.Lock()
        self._ttl_seconds = session_ttl_hours * 3600

    def _is_expired(self, session: Session) -> bool:
        """Check if a session has expired based on its created_at timestamp.
        
        Args:
            session: The session to check.
            
        Returns:
            True if the session has expired, False otherwise.
        """
        now = time.time()
        return session.created_at + self._ttl_seconds < now

    def create_session(self, session: Session) -> str:
        """Create a new session and return its ID.
        
        Args:
            session: The session object to store.
            
        Returns:
            The session_id of the created session.
        """
        with self._lock:
            self._sessions[session.session_id] = session
            return session.session_id

    def get_session(self, session_id: str) -> Optional[Session]:
        """Retrieve a session by ID.
        
        Returns None if the session doesn't exist or has expired.
        
        Args:
            session_id: The ID of the session to retrieve.
            
        Returns:
            The Session object if found and not expired, None otherwise.
        """
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return None
            if self._is_expired(session):
                # Clean up expired session
                del self._sessions[session_id]
                return None
            return session

    def append_turn(self, session_id: str, turn) -> bool:
        """Append a turn to an existing session.
        
        Args:
            session_id: The ID of the session to append to.
            turn: The Turn object to append.
            
        Returns:
            True if successful, False if session not found or expired.
        """
        with self._lock:
            session = self._sessions.get(session_id)
            if session is None:
                return False
            if self._is_expired(session):
                del self._sessions[session_id]
                return False
            session.turns.append(turn)
            return True

    def cleanup_expired_sessions(self) -> int:
        """Remove all expired sessions.
        
        Returns:
            The number of sessions removed.
        """
        with self._lock:
            now = time.time()
            expired_ids = [
                sid for sid, session in self._sessions.items()
                if session.created_at + self._ttl_seconds < now
            ]
            for sid in expired_ids:
                del self._sessions[sid]
            return len(expired_ids)

    def rebuild_and_register(self, data: dict, extra_turns: int = 5) -> Session:
        """Reconstruct an in-memory Session from a DB snapshot and register it.

        Used when the user reanudates a past conversation: rebuilds the
        Session dataclass with all its turns, bumps `total_turns` by
        `extra_turns`, and resets `created_at` so the TTL doesn't expire
        the session mid-continuation.

        If the session already exists in memory (and isn't expired), just
        bump its `total_turns` by `extra_turns` and return it.
        """
        session_id = data["session_id"]
        with self._lock:
            existing = self._sessions.get(session_id)
            if existing is not None and not self._is_expired(existing):
                existing.total_turns = (existing.total_turns or len(existing.turns)) + extra_turns
                # Reset created_at so the resumed session has a fresh TTL window
                existing.created_at = time.time()
                return existing

            turns: list[Turn] = []
            for td in data.get("turns", []):
                es = td.get("eval_scores") or {}
                scores = EvalScores(
                    socratism=es.get("socratism", 3.0),
                    age_fit=es.get("age_fit", 3.0),
                    builds_on=es.get("builds_on", 3.0),
                    openness=es.get("openness", 3.0),
                    advancement=es.get("advancement", 3.0),
                    overall=es.get("overall", 3.0),
                )
                turns.append(
                    Turn(
                        id=td.get("id", len(turns)),
                        content=td.get("content", ""),
                        question_type=td.get("question_type", "conceptual"),
                        child_input=td.get("child_input", ""),
                        thinking_trace=td.get("thinking_trace", ""),
                        eval_scores=scores,
                        forbidden_behaviors_detected=td.get("forbidden_behaviors_detected", []),
                        rag_moves_used=td.get("rag_moves_used", []),
                        timestamp=td.get("timestamp", 0.0),
                    )
                )

            session = Session(
                session_id=session_id,
                age_group=data.get("age_group", "9-12"),
                stimulus=data.get("stimulus", {}),
                model_size=data.get("model_size", "fast"),
                language=data.get("language", "es"),
                turns=turns,
                total_turns=len(turns) + extra_turns,
                created_at=time.time(),
            )
            # These two are attached dynamically by the create-session endpoint
            # too, so we mirror that here for consistency with the rest of the code.
            session.user_id = data.get("user_id")
            session.thinking_mode = data.get("thinking_mode", True)

            self._sessions[session_id] = session
            return session

    def get_all_sessions(self) -> list:
        """Get all non-expired sessions.
        
        Returns:
            A list of all valid Session objects.
        """
        with self._lock:
            now = time.time()
            valid_sessions = []
            expired_ids = []
            
            for sid, session in self._sessions.items():
                if session.created_at + self._ttl_seconds < now:
                    expired_ids.append(sid)
                else:
                    valid_sessions.append(session)
            
            # Clean up expired sessions
            for sid in expired_ids:
                del self._sessions[sid]
            
            return valid_sessions


# Global session store instance
session_store = SessionStore()
