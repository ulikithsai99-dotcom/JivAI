"""FAISS vector store for emergency knowledge retrieval."""

from __future__ import annotations

import hashlib
import pickle
from pathlib import Path
from typing import Any

import numpy as np

from utils.logging import get_logger

logger = get_logger(__name__)

EMBEDDING_DIM = 384


def _hash_embedding(text: str, dim: int = EMBEDDING_DIM) -> np.ndarray:
    """Deterministic offline embedding — no external model download required."""
    vector = np.zeros(dim, dtype=np.float32)
    tokens = text.lower().split()
    for token in tokens:
        digest = hashlib.sha256(token.encode()).digest()
        for i in range(0, min(len(digest), dim)):
            vector[i % dim] += (digest[i] - 128) / 128.0
    norm = np.linalg.norm(vector)
    if norm > 0:
        vector /= norm
    return vector


class FAISSVectorStore:
    def __init__(self, index_dir: Path) -> None:
        self._index_dir = index_dir
        self._index_dir.mkdir(parents=True, exist_ok=True)
        self._index_path = index_dir / "faiss.index"
        self._meta_path = index_dir / "metadata.pkl"
        self._index: Any = None
        self._metadata: list[dict[str, str]] = []

    @property
    def is_built(self) -> bool:
        return self._index is not None and len(self._metadata) > 0

    def build(self, documents: list[dict[str, str]]) -> None:
        import faiss

        if not documents:
            logger.warning("No documents provided for FAISS index build")
            return

        embeddings = np.vstack([_hash_embedding(doc["text"]) for doc in documents])
        index = faiss.IndexFlatIP(EMBEDDING_DIM)
        index.add(embeddings.astype(np.float32))

        self._index = index
        self._metadata = documents

        faiss.write_index(index, str(self._index_path))
        with self._meta_path.open("wb") as f:
            pickle.dump(documents, f)

        logger.info("FAISS index built with %d documents", len(documents))

    def load(self) -> bool:
        import faiss

        if not self._index_path.exists() or not self._meta_path.exists():
            return False

        self._index = faiss.read_index(str(self._index_path))
        with self._meta_path.open("rb") as f:
            self._metadata = pickle.load(f)
        logger.info("FAISS index loaded with %d documents", len(self._metadata))
        return True

    def search(self, query: str, top_k: int = 5, category_filter: str | None = None) -> list[dict[str, Any]]:
        if not self.is_built:
            return []

        import faiss

        query_vec = _hash_embedding(query).reshape(1, -1).astype(np.float32)
        scores, indices = self._index.search(query_vec, min(top_k * 3, len(self._metadata)))

        results: list[dict[str, Any]] = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0 or idx >= len(self._metadata):
                continue
            meta = self._metadata[idx]
            if category_filter and meta.get("category") != category_filter:
                continue
            results.append({**meta, "score": float(score)})
            if len(results) >= top_k:
                break

        return results
