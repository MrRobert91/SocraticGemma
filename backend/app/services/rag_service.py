"""RAG service for retrieving P4C moves using ChromaDB.

This service provides semantic search over Philosophy for Children question moves,
enabling context-aware retrieval of appropriate Socratic questions based on
the dialogue context.
"""

import os
import threading
from typing import Optional

import yaml

# Try to import chromadb - graceful fallback if not available
try:
    import chromadb
    from chromadb.config import Settings as ChromaSettings
    CHROMADB_AVAILABLE = True
except ImportError:
    CHROMADB_AVAILABLE = False

from ..config import settings


class P4CMove:
    """Represents a single P4C move retrieved from the RAG index."""
    
    def __init__(
        self,
        id: str,
        question_type: str,
        move_text: str,
        example_context: str,
        age_range: str,
        source: str,
        distance: Optional[float] = None
    ):
        self.id = id
        self.question_type = question_type
        self.move_text = move_text
        self.example_context = example_context
        self.age_range = age_range
        self.source = source
        self.distance = distance
    
    def to_dict(self) -> dict:
        """Convert to dictionary representation."""
        result = {
            "id": self.id,
            "question_type": self.question_type,
            "move_text": self.move_text,
            "example_context": self.example_context,
            "age_range": self.age_range,
            "source": self.source,
        }
        if self.distance is not None:
            result["distance"] = self.distance
        return result


class RAGService:
    """Retrieval-augmented generation service for P4C moves.
    
    Uses ChromaDB to index and search P4C question moves with semantic
    similarity. Falls back gracefully when ChromaDB is not available.
    """
    
    _instance: Optional["RAGService"] = None
    _lock = threading.Lock()
    
    def __init__(self, settings=None):
        """Initialize the RAG service.
        
        Args:
            settings: Application settings (uses global settings if not provided)
        """
        from ..config import settings as _settings
        self._settings = settings if settings is not None else _settings
        self._client = None
        self._collection = None
        self._indexed = False
        self._move_count = 0
        self._chromadb_available = CHROMADB_AVAILABLE
        
        if self._chromadb_available:
            self._init_chromadb()
    
    def _init_chromadb(self):
        """Initialize ChromaDB client and collection."""
        try:
            # Determine storage path
            storage_path = os.environ.get("CHROMADB_STORAGE_PATH", ".chromadb")
            os.makedirs(storage_path, exist_ok=True)
            
            # Initialize persistent client
            self._client = chromadb.Client(
                ChromaSettings(
                    anonymized_telemetry=False,
                    allow_reset=True,
                )
            )
            
            # Create or get collection
            self._collection = self._client.get_or_create_collection(
                name="p4c_moves",
                metadata={"description": "P4C question moves for Socratic dialogue"}
            )
        except Exception as e:
            print(f"Warning: Failed to initialize ChromaDB: {e}")
            self._chromadb_available = False
            self._client = None
            self._collection = None
    
    @classmethod
    def get_instance(cls) -> "RAGService":
        """Get the singleton RAG service instance."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls(settings)
        return cls._instance
    
    def build_index(self, moves_file_path: str) -> bool:
        """Build the RAG index from the P4C moves YAML file.
        
        Args:
            moves_file_path: Path to the p4c_moves.yaml file
            
        Returns:
            True if indexing succeeded, False otherwise
        """
        if not self._chromadb_available:
            print("RAG service unavailable: ChromaDB not installed")
            return False
        
        try:
            # Load moves from YAML
            with open(moves_file_path, "r", encoding="utf-8") as f:
                data = yaml.safe_load(f)
            
            moves = data.get("moves", [])
            if not moves:
                print("No moves found in file")
                return False
            
            # Clear existing collection
            try:
                self._client.delete_collection("p4c_moves")
                self._collection = self._client.get_or_create_collection(
                    name="p4c_moves",
                    metadata={"description": "P4C question moves for Socratic dialogue"}
                )
            except Exception:
                pass  # Collection might not exist yet
            
            # Add moves to collection
            ids = []
            documents = []
            metadatas = []
            
            for move in moves:
                move_id = move["id"]
                # Combine move text and example context for richer embedding
                doc = f"{move['move_text']} [Contexto: {move['example_context']}]"
                
                ids.append(move_id)
                documents.append(doc)
                metadatas.append({
                    "question_type": move["question_type"],
                    "age_range": move["age_range"],
                    "source": move["source"],
                    "move_text": move["move_text"],
                    "example_context": move["example_context"],
                })
            
            # Add to collection
            if ids:
                self._collection.add(
                    ids=ids,
                    documents=documents,
                    metadatas=metadatas
                )
            
            self._move_count = len(ids)
            self._indexed = True
            print(f"RAG index built successfully with {self._move_count} moves")
            return True
            
        except Exception as e:
            print(f"Error building RAG index: {e}")
            return False
    
    def search(
        self,
        query_text: str,
        age_range: Optional[str] = None,
        top_k: int = 3
    ) -> list[P4CMove]:
        """Search for relevant P4C moves.
        
        Args:
            query_text: The query text to search for
            age_range: Optional age range filter ("6-8", "9-12", "13-16", or "all")
            top_k: Maximum number of results to return
            
        Returns:
            List of P4CMove objects sorted by relevance
        """
        if not self._chromadb_available or not self._indexed:
            return []
        
        if self._collection is None:
            return []
        
        try:
            # Query the collection
            results = self._collection.query(
                query_texts=[query_text],
                n_results=top_k * 2  # Over-fetch to allow filtering
            )
            
            if not results or not results["ids"]:
                return []
            
            moves = []
            seen_ids = set()
            
            for i in range(len(results["ids"][0])):
                move_id = results["ids"][0][i]
                
                if move_id in seen_ids:
                    continue
                seen_ids.add(move_id)
                
                metadata = results["metadatas"][0][i]
                distance = results["distances"][0][i] if "distances" in results else None
                
                # Filter by age range if specified
                move_age_range = metadata.get("age_range", "all")
                if age_range and move_age_range != "all" and move_age_range != age_range:
                    continue
                
                move = P4CMove(
                    id=move_id,
                    question_type=metadata.get("question_type", ""),
                    move_text=metadata.get("move_text", ""),
                    example_context=metadata.get("example_context", ""),
                    age_range=move_age_range,
                    source=metadata.get("source", ""),
                    distance=distance
                )
                moves.append(move)
                
                if len(moves) >= top_k:
                    break
            
            return moves
            
        except Exception as e:
            print(f"Error searching RAG index: {e}")
            return []
    
    def get_move_count(self) -> int:
        """Get the number of indexed moves.
        
        Returns:
            Number of moves in the index, or 0 if not available
        """
        return self._move_count if self._indexed else 0
    
    def is_available(self) -> bool:
        """Check if the RAG service is available.
        
        Returns:
            True if ChromaDB is available and the index is built
        """
        return self._chromadb_available and self._indexed
    
    def reset(self):
        """Reset the RAG service (for testing)."""
        with self._lock:
            if self._client and self._chromadb_available:
                try:
                    self._client.delete_collection("p4c_moves")
                except Exception:
                    pass
            self._indexed = False
            self._move_count = 0
            self._collection = None


# Global RAG service instance
rag_service = RAGService()
