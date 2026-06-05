"""RAG retrieval layer over FAISS vector store."""

from services.knowledge_service import KnowledgeService
from rag.vector_store import FAISSVectorStore
from utils.config import get_settings
from utils.logging import get_logger

logger = get_logger(__name__)


class RAGRetriever:
    def __init__(self, knowledge_service: KnowledgeService) -> None:
        settings = get_settings()
        self._knowledge = knowledge_service
        self._store = FAISSVectorStore(settings.rag_index_dir)
        self._initialize_index()

    def _initialize_index(self) -> None:
        if not self._store.load():
            documents = self._knowledge.get_all_documents_for_rag()
            self._store.build(documents)

    def retrieve(self, query: str, category: str | None = None, top_k: int = 5) -> list[str]:
        normalized = self._knowledge.normalize_category(category) if category else None
        hits = self._store.search(query, top_k=top_k, category_filter=normalized)
        if not hits and normalized:
            hits = self._store.search(query, top_k=top_k)

        texts = [hit["text"] for hit in hits]
        logger.debug("RAG retrieved %d chunks for query", len(texts))
        return texts

    def retrieve_steps(self, category: str, transcript: str | None = None) -> list[str]:
        cat = self._knowledge.get_category(category)
        if not cat:
            return []

        base_steps = list(cat.get("steps", []))
        if transcript:
            rag_steps = self.retrieve(transcript, category=category, top_k=3)
            for step in rag_steps:
                if step not in base_steps:
                    base_steps.append(step)
        return base_steps
