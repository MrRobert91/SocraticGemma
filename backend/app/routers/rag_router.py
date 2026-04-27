"""RAG router for P4C move retrieval.

Provides endpoints for searching and indexing P4C (Philosophy for Children)
question moves using the RAG service.
"""

import os
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..services.rag_service import rag_service, P4CMove


router = APIRouter(prefix="/rag", tags=["rag"])


# Schema definitions
class RAGSearchRequest(BaseModel):
    """Request schema for RAG search."""
    query: str
    age_range: Optional[str] = None
    top_k: int = 3


class RAGSearchResponse(BaseModel):
    """Response schema for RAG search results."""
    moves: list[dict]
    query: str
    age_range: Optional[str] = None
    count: int


class RAGStatusResponse(BaseModel):
    """Response schema for RAG status check."""
    available: bool
    move_count: int


class RAGIndexResponse(BaseModel):
    """Response schema for RAG index build."""
    success: bool
    message: str
    move_count: int = 0


@router.post(
    "/search",
    response_model=RAGSearchResponse,
    summary="Search P4C moves",
    description="Search for relevant P4C question moves based on query text."
)
async def search_moves(
    request: RAGSearchRequest,
) -> RAGSearchResponse:
    """Search for relevant P4C moves.
    
    Args:
        request: Search request with query text, optional age_range filter, and top_k
        
    Returns:
        RAGSearchResponse with list of matching P4C moves
    """
    if not rag_service.is_available():
        raise HTTPException(
            status_code=503,
            detail="RAG service unavailable. Please build the index first."
        )
    
    # Validate age_range if provided
    if request.age_range and request.age_range not in ("6-8", "9-12", "13-16", "all"):
        raise HTTPException(
            status_code=400,
            detail="Invalid age_range. Must be '6-8', '9-12', '13-16', or 'all'."
        )
    
    # Validate top_k
    if request.top_k < 1 or request.top_k > 20:
        raise HTTPException(
            status_code=400,
            detail="top_k must be between 1 and 20."
        )
    
    moves = rag_service.search(
        query_text=request.query,
        age_range=request.age_range,
        top_k=request.top_k
    )
    
    return RAGSearchResponse(
        moves=[move.to_dict() for move in moves],
        query=request.query,
        age_range=request.age_range,
        count=len(moves)
    )


@router.post(
    "/index",
    response_model=RAGIndexResponse,
    summary="Build RAG index",
    description="Build the RAG index from the P4C moves data file."
)
async def build_index() -> RAGIndexResponse:
    """Build the RAG index.
    
    Loads the P4C moves from the YAML data file and indexes them
    in ChromaDB for semantic search.
    
    Returns:
        RAGIndexResponse with success status and move count
    """
    # Determine the path to the moves file
    moves_file_path = os.environ.get(
        "P4C_MOVES_PATH",
        os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "data",
            "p4c_moves.yaml"
        )
    )
    
    if not os.path.exists(moves_file_path):
        return RAGIndexResponse(
            success=False,
            message=f"Moves file not found: {moves_file_path}",
            move_count=0
        )
    
    success = rag_service.build_index(moves_file_path)
    
    if success:
        return RAGIndexResponse(
            success=True,
            message="Index built successfully",
            move_count=rag_service.get_move_count()
        )
    else:
        return RAGIndexResponse(
            success=False,
            message="Failed to build index. Check that chromadb is installed.",
            move_count=0
        )


@router.get(
    "/status",
    response_model=RAGStatusResponse,
    summary="Get RAG status",
    description="Check the status of the RAG service."
)
async def get_status() -> RAGStatusResponse:
    """Get RAG service status.
    
    Returns:
        RAGStatusResponse with availability and move count
    """
    return RAGStatusResponse(
        available=rag_service.is_available(),
        move_count=rag_service.get_move_count()
    )
