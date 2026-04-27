"""Tests for the session store module."""

import time
import pytest

from app.models import Session, Turn, EvalScores
from app.services.session_store import SessionStore


@pytest.fixture
def session_store():
    """Create a session store with short TTL for testing."""
    return SessionStore(session_ttl_hours=1)


@pytest.fixture
def sample_session():
    """Create a sample session for testing."""
    return Session(
        session_id="test-session-123",
        age_group="9-12",
        stimulus={"text": "What is justice?", "source": "philosophy"},
        model_size="fast",
        language="en",
        turns=[],
        phases={"stimulus": True, "questions": False, "agenda": False, "inquiry": False, "synthesis": False},
        created_at=time.time()
    )


@pytest.fixture
def sample_turn():
    """Create a sample turn for testing."""
    return Turn(
        id=1,
        content="Why is stealing wrong?",
        question_type="conceptual",
        thinking_trace="The child seems to be exploring moral foundations",
        eval_scores=EvalScores(),
        forbidden_behaviors_detected=[],
        rag_moves_used=["probing"],
        timestamp=time.time()
    )


class TestSessionStoreCreateGet:
    """Tests for session creation and retrieval."""

    def test_create_session_returns_session_id(self, session_store, sample_session):
        """Test that create_session returns the correct session ID."""
        result = session_store.create_session(sample_session)
        assert result == "test-session-123"

    def test_get_session_returns_session(self, session_store, sample_session):
        """Test that get_session returns the session when it exists."""
        session_store.create_session(sample_session)
        retrieved = session_store.get_session("test-session-123")
        assert retrieved is not None
        assert retrieved.session_id == "test-session-123"
        assert retrieved.age_group == "9-12"

    def test_get_session_returns_none_for_nonexistent(self, session_store):
        """Test that get_session returns None for non-existent session."""
        result = session_store.get_session("nonexistent-id")
        assert result is None

    def test_get_session_returns_none_for_expired(self, session_store, sample_session):
        """Test that get_session returns None for expired session."""
        # Create a session with created_at in the past (expired)
        sample_session.created_at = time.time() - (2 * 3600)  # 2 hours ago
        session_store.create_session(sample_session)
        
        # Should return None because session is expired
        result = session_store.get_session("test-session-123")
        assert result is None


class TestAppendTurn:
    """Tests for appending turns to sessions."""

    def test_append_turn_returns_true(self, session_store, sample_session, sample_turn):
        """Test that append_turn returns True on success."""
        session_store.create_session(sample_session)
        result = session_store.append_turn("test-session-123", sample_turn)
        assert result is True

    def test_append_turn_adds_to_session(self, session_store, sample_session, sample_turn):
        """Test that append_turn actually adds the turn to the session."""
        session_store.create_session(sample_session)
        session_store.append_turn("test-session-123", sample_turn)
        
        session = session_store.get_session("test-session-123")
        assert len(session.turns) == 1
        assert session.turns[0].content == "Why is stealing wrong?"

    def test_append_turn_returns_false_for_nonexistent(self, session_store, sample_turn):
        """Test that append_turn returns False for non-existent session."""
        result = session_store.append_turn("nonexistent-id", sample_turn)
        assert result is False

    def test_append_turn_returns_false_for_expired(self, session_store, sample_session, sample_turn):
        """Test that append_turn returns False for expired session."""
        sample_session.created_at = time.time() - (2 * 3600)
        session_store.create_session(sample_session)
        
        result = session_store.append_turn("test-session-123", sample_turn)
        assert result is False


class TestCleanupExpired:
    """Tests for cleanup of expired sessions."""

    def test_cleanup_expired_returns_count(self, session_store, sample_session):
        """Test that cleanup_expired returns the number of removed sessions."""
        # Create an expired session
        sample_session.created_at = time.time() - (2 * 3600)
        session_store.create_session(sample_session)
        
        # Create a valid session
        valid_session = Session(
            session_id="valid-session",
            age_group="6-8",
            created_at=time.time()
        )
        session_store.create_session(valid_session)
        
        removed = session_store.cleanup_expired_sessions()
        assert removed == 1

    def test_cleanup_expired_removes_expired(self, session_store, sample_session):
        """Test that cleanup_expired actually removes expired sessions."""
        # Create an expired session
        sample_session.created_at = time.time() - (2 * 3600)
        session_store.create_session(sample_session)
        
        # Create a valid session
        valid_session = Session(
            session_id="valid-session",
            age_group="6-8",
            created_at=time.time()
        )
        session_store.create_session(valid_session)
        
        session_store.cleanup_expired_sessions()
        
        # Expired should be gone
        assert session_store.get_session("test-session-123") is None
        # Valid should still exist
        assert session_store.get_session("valid-session") is not None

    def test_cleanup_expired_returns_zero_when_none_expired(self, session_store, sample_session):
        """Test that cleanup_expired returns 0 when no sessions are expired."""
        session_store.create_session(sample_session)
        removed = session_store.cleanup_expired_sessions()
        assert removed == 0


class TestGetAllSessions:
    """Tests for getting all sessions."""

    def test_get_all_sessions_returns_list(self, session_store, sample_session):
        """Test that get_all_sessions returns a list."""
        session_store.create_session(sample_session)
        result = session_store.get_all_sessions()
        assert isinstance(result, list)

    def test_get_all_sessions_includes_valid_sessions(self, session_store, sample_session):
        """Test that get_all_sessions includes valid sessions."""
        session_store.create_session(sample_session)
        result = session_store.get_all_sessions()
        assert len(result) == 1
        assert result[0].session_id == "test-session-123"

    def test_get_all_sessions_excludes_expired(self, session_store, sample_session):
        """Test that get_all_sessions excludes expired sessions."""
        sample_session.created_at = time.time() - (2 * 3600)
        session_store.create_session(sample_session)
        
        result = session_store.get_all_sessions()
        assert len(result) == 0

    def test_get_all_sessions_multiple_sessions(self, session_store):
        """Test get_all_sessions with multiple sessions."""
        for i in range(5):
            session = Session(
                session_id=f"session-{i}",
                age_group="9-12",
                created_at=time.time()
            )
            session_store.create_session(session)
        
        result = session_store.get_all_sessions()
        assert len(result) == 5
