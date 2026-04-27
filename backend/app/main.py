"""SocraticGemma FastAPI Application.

A FastAPI-based API for Socratic dialogue facilitation using Gemma models.
Built for the Philosophy for Children (P4C) hackathon project.
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routers import sessions, dialogue, evaluation, compare, prompts, health, rag_router
from .services.session_store import session_store
from .config import settings


# Background task for session cleanup
_cleanup_task = None


async def session_cleanup_task():
    """Background task to periodically clean up expired sessions."""
    while True:
        try:
            await asyncio.sleep(300)  # Run every 5 minutes
            cleaned = session_store.cleanup_expired_sessions()
            if cleaned > 0:
                print(f"Cleaned up {cleaned} expired sessions")
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"Error in session cleanup: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context manager.
    
    Handles startup and shutdown events.
    """
    global _cleanup_task
    
    # Startup: start cleanup task
    _cleanup_task = asyncio.create_task(session_cleanup_task())
    print("SocraticGemma API started")
    
    yield
    
    # Shutdown: cancel cleanup task and close connections
    if _cleanup_task is not None:
        _cleanup_task.cancel()
        try:
            await _cleanup_task
        except asyncio.CancelledError:
            pass
    
    print("SocraticGemma API shutdown complete")


# Create FastAPI application
app = FastAPI(
    title="SocraticGemma API",
    description="""
## SocraticGemma - Philosophy for Children AI Facilitator

SocraticGemma is an API that uses Google's Gemma models to facilitate
Socratic dialogues with children. It implements the Philosophy for Children
(P4C) methodology, guiding children through philosophical inquiry by
asking questions rather than giving answers.

### Features

- **Socratic Dialogue**: Facilitates philosophical inquiry without giving direct answers
- **Age-Appropriate**: Adapts language and concepts for different age groups (6-8, 9-12, 13-16)
- **Evaluation**: Scores responses on socratism, age-fit, builds-on, openness, and advancement
- **Forbidden Behavior Detection**: Identifies overhelp, lecture, correct, leading, and close behaviors
- **RAG Enhancement**: Optional retrieval-augmented generation for context
- **Baseline Comparison**: Compare P4C approach vs baseline helpful assistant

### API Usage

1. Create a session with POST /sessions
2. Send dialogue turns with POST /sessions/{id}/turns
3. Get evaluation summaries with GET /sessions/{id}/eval

Built for the P4C Hackathon 2024.
    """,
    version="0.1.0",
    lifespan=lifespan
)

# Add CORS middleware (allow all origins for development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

# Include routers
app.include_router(sessions.router)
app.include_router(dialogue.router)
app.include_router(evaluation.router)
app.include_router(compare.router)
app.include_router(prompts.router)
app.include_router(health.router)
app.include_router(rag_router.router)


@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information."""
    return {
        "name": "SocraticGemma API",
        "version": "0.1.0",
        "description": "Socratic dialogue facilitation API using Gemma models",
        "docs": "/docs",
        "health": "/health"
    }
