"""Thread-safe in-memory session store with TTL support."""

import threading
import time
from typing import Optional

from ..models import Session
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
