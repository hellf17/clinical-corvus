import logging
import os
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple, Any, Iterable

import numpy as np
from rank_bm25 import BM25Okapi

# Optional backends
try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import VectorParams, Distance, PointStruct
    QDRANT_AVAILABLE = True
except Exception:
    QDRANT_AVAILABLE = False

try:
    from whoosh import index as whoosh_index
    from whoosh.fields import Schema, ID, TEXT
    from whoosh.qparser import QueryParser
    from whoosh.analysis import StemmingAnalyzer
    WHOOSH_AVAILABLE = True
except Exception:
    WHOOSH_AVAILABLE = False

try:
    from sentence_transformers import CrossEncoder
    ST_AVAILABLE = True
except Exception:
    ST_AVAILABLE = False


logger = logging.getLogger(__name__)


def _simple_tokenize(text: str) -> List[str]:
    """Lightweight regex tokenizer, lowercased. Uses unicode word chars."""
    if not text:
        return []
    return re.findall(r"\w+", text.lower(), flags=re.UNICODE)


class EmbeddingProvider:
    """
    Pluggable embedding provider.
    - Tries OpenAI if OPENAI_API_KEY is present.
    - Falls back to a deterministic hashing-based bag-of-words vector if OpenAI is unavailable.
    """

    def __init__(self, dim: int = 1024, model: str = "text-embedding-3-small"):
        self.dim = dim
        self.model = model
        self._use_openai = False
        self._openai_client = None

        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("OPENAI_API_KEY".lower())
        if api_key:
            try:
                # openai>=1.0.0 interface
                from openai import OpenAI  # type: ignore

                self._openai_client = OpenAI(api_key=api_key)
                self._use_openai = True
                logger.info("HybridRAG: Using OpenAI embeddings provider")
            except Exception as e:
                logger.warning(f"HybridRAG: OpenAI client unavailable, falling back to hashing embeddings: {e}")

        if not self._use_openai:
            logger.info("HybridRAG: Using hashing-based embeddings provider (no external dependencies)")

    def embed_texts(self, texts: List[str]) -> np.ndarray:
        if self._use_openai:
            try:
                resp = self._openai_client.embeddings.create(model=self.model, input=texts)
                vectors = np.array([item.embedding for item in resp.data], dtype=np.float32)
                return vectors
            except Exception as e:
                logger.error(f"HybridRAG: OpenAI embedding error, falling back to hashing embeddings: {e}")
                # Fall back to hashing
        # Hashing-based deterministic vectors
        vecs = []
        for t in texts:
            tokens = _simple_tokenize(t)
            v = np.zeros(self.dim, dtype=np.float32)
            for tok in tokens:
                # use consistent hashing to map token to an index
                idx = (hash(tok) % self.dim)
                v[idx] += 1.0
            # normalize
            norm = np.linalg.norm(v) + 1e-8
            vecs.append(v / norm)
        return np.vstack(vecs)


@dataclass
class IndexedDocument:
    doc_id: str
    text: str
    metadata: Optional[Dict[str, Any]] = None


class LocalVectorIndex:
    """Simple in-memory vector index with brute-force cosine similarity."""

    def __init__(self, embedding_provider: EmbeddingProvider):
        self.embedding_provider = embedding_provider
        self._doc_ids: List[str] = []
        self._vectors: Optional[np.ndarray] = None  # shape: (n_docs, dim)

    def clear(self) -> None:
        self._doc_ids = []
        self._vectors = None

    def add(self, doc_ids: List[str], texts: List[str]) -> None:
        if not doc_ids:
            return
        vecs = self.embedding_provider.embed_texts(texts)
        if self._vectors is None:
            self._vectors = vecs
            self._doc_ids = list(doc_ids)
        else:
            self._vectors = np.vstack([self._vectors, vecs])
            self._doc_ids.extend(doc_ids)

    def query(self, text: str, top_k: int = 10) -> List[Tuple[str, float]]:
        if self._vectors is None or len(self._doc_ids) == 0:
            return []
        q = self.embedding_provider.embed_texts([text])[0]
        # cosine similarity
        sims = (self._vectors @ q) / (np.linalg.norm(self._vectors, axis=1) * (np.linalg.norm(q) + 1e-8) + 1e-8)
        idxs = np.argsort(-sims)[:top_k]
        return [(self._doc_ids[i], float(sims[i])) for i in idxs]


class BM25Index:
    """In-memory BM25 using rank_bm25."""

    def __init__(self):
        self._docs_tokenized: List[List[str]] = []
        self._doc_ids: List[str] = []
        self._bm25: Optional[BM25Okapi] = None

    def clear(self) -> None:
        self._docs_tokenized = []
        self._doc_ids = []
        self._bm25 = None

    def add(self, doc_ids: List[str], texts: List[str]) -> None:
        toks = [_simple_tokenize(t) for t in texts]
        self._docs_tokenized.extend(toks)
        self._doc_ids.extend(doc_ids)
        self._bm25 = BM25Okapi(self._docs_tokenized)

    def query(self, text: str, top_k: int = 10) -> List[Tuple[str, float]]:
        if self._bm25 is None or len(self._doc_ids) == 0:
            return []
        q = _simple_tokenize(text)
        scores = self._bm25.get_scores(q)
        # get top_k indices
        idxs = np.argsort(-scores)[:top_k]
        return [(self._doc_ids[i], float(scores[i])) for i in idxs]


class WhooshBM25Index:
    """Persistent BM25 via Whoosh."""

    def __init__(self, index_dir: str):
        os.makedirs(index_dir, exist_ok=True)
        self.index_dir = index_dir
        schema = Schema(doc_id=ID(stored=True, unique=True), content=TEXT(stored=False, analyzer=StemmingAnalyzer()))
        if not whoosh_index.exists_in(index_dir):
            self.ix = whoosh_index.create_in(index_dir, schema)
        else:
            self.ix = whoosh_index.open_dir(index_dir)

    def clear(self) -> None:
        # Recreate index
        schema = self.ix.schema
        whoosh_index.create_in(self.index_dir, schema)
        self.ix = whoosh_index.open_dir(self.index_dir)

    def add(self, doc_ids: List[str], texts: List[str]) -> None:
        writer = self.ix.writer(limitmb=256, procs=1, multisegment=True)
        for did, txt in zip(doc_ids, texts):
            writer.update_document(doc_id=did, content=txt)
        writer.commit()

    def query(self, text: str, top_k: int = 10) -> List[Tuple[str, float]]:
        if self.ix is None:
            return []
        with self.ix.searcher() as searcher:
            parser = QueryParser("content", schema=self.ix.schema)
            try:
                q = parser.parse(text)
            except Exception:
                # fallback: quote the text as a phrase query
                safe = text.replace('"', ' ')
                q = parser.parse(f'"{safe}"')
            results = searcher.search(q, limit=top_k)
            return [(hit["doc_id"], float(hit.score)) for hit in results]


class QdrantVectorIndex:
    """Vector index backed by Qdrant. Stores doc_id in payload and uses hashed int ID."""

    def __init__(self, collection: str, dim: int, url: Optional[str] = None, host: Optional[str] = None, port: Optional[int] = None, api_key: Optional[str] = None):
        if url:
            self.client = QdrantClient(url=url, api_key=api_key)  # type: ignore
        else:
            self.client = QdrantClient(host=host or "localhost", port=port or 6333, api_key=api_key)  # type: ignore
        self.collection = collection
        self.dim = dim
        self._ensure_collection()

    def _ensure_collection(self):
        try:
            self.client.get_collection(self.collection)
        except Exception:
            self.client.recreate_collection(
                collection_name=self.collection,
                vectors_config=VectorParams(size=self.dim, distance=Distance.COSINE),
            )

    def clear(self) -> None:
        self.client.recreate_collection(
            collection_name=self.collection,
            vectors_config=VectorParams(size=self.dim, distance=Distance.COSINE),
        )

    @staticmethod
    def _hash_id(s: str) -> int:
        # Stable 64-bit hash to int
        return abs(hash(s)) % (2**63)

    def add(self, doc_ids: List[str], texts: List[str], vectors: Optional[np.ndarray] = None) -> None:
        if vectors is None:
            raise ValueError("QdrantVectorIndex.add requires precomputed vectors")
        points = []
        for did, vec in zip(doc_ids, vectors):
            pid = self._hash_id(did)
            points.append(PointStruct(id=pid, vector=vec.tolist(), payload={"doc_id": did}))
        # Batch upsert
        self.client.upsert(collection_name=self.collection, points=points)

    def query(self, query_vector: np.ndarray, top_k: int = 10) -> List[Tuple[str, float]]:
        res = self.client.search(collection_name=self.collection, query_vector=query_vector.tolist(), limit=top_k)
        out: List[Tuple[str, float]] = []
        for r in res:
            did = (r.payload or {}).get("doc_id")
            if did:
                out.append((did, float(r.score)))
        return out


from config import get_settings


class HybridRAGService:
    """
    Minimal Hybrid RAG (BM25 + Vector) service for MVP and benchmarks.
    - In-memory indices for simplicity.
    - Score fusion: normalized(min-max) cosine + normalized BM25.
    - alpha controls weighting of vector vs lexical.
    """

    _instance: Optional["HybridRAGService"] = None

    @classmethod
    def get_instance(cls) -> "HybridRAGService":
        if cls._instance is None:
            cls._instance = HybridRAGService()
        return cls._instance

    def __init__(self, alpha: float = 0.5, embedding_dim: int = 1024):
        settings = get_settings()
        # Parameters
        self.alpha = float(getattr(settings, "rag_alpha", alpha))
        self.COARSE_SECTIONS = int(getattr(settings, "rag_coarse_sections", 20))
        self.VECTOR_CANDIDATES = int(getattr(settings, "rag_vector_candidates", 200))
        self.BM25_CANDIDATES = int(getattr(settings, "rag_bm25_candidates", 200))
        self.enable_reranker = bool(getattr(settings, "rag_enable_reranker", False))
        self.reranker_model_name = str(getattr(settings, "rag_reranker_model", "BAAI/bge-reranker-base"))
        self.rerank_top_k = int(getattr(settings, "rag_rerank_top_k", 50))

        self.embedding_provider = EmbeddingProvider(dim=embedding_dim)
        # Chunk-level indices
        if getattr(settings, "rag_use_qdrant", False) and QDRANT_AVAILABLE:
            logger.info("HybridRAG: Using Qdrant vector index for chunks and sections")
            url = getattr(settings, "qdrant_url", None)
            host = getattr(settings, "qdrant_host", None)
            port = getattr(settings, "qdrant_port", None)
            api_key = getattr(settings, "qdrant_api_key", None)
            self.vector_index = QdrantVectorIndex(collection="rag_chunks", dim=embedding_dim, url=url, host=host, port=port, api_key=api_key)
            self.section_vector_index = QdrantVectorIndex(collection="rag_sections", dim=embedding_dim, url=url, host=host, port=port, api_key=api_key)
            self._qdrant = True
        else:
            self.vector_index = LocalVectorIndex(self.embedding_provider)
            self.section_vector_index = LocalVectorIndex(self.embedding_provider)
            self._qdrant = False

        # Lexical index
        if getattr(settings, "rag_use_whoosh", False) and WHOOSH_AVAILABLE:
            self.bm25_index = WhooshBM25Index(index_dir=getattr(settings, "rag_whoosh_index_dir", "/app/data/whoosh_index"))
            logger.info("HybridRAG: Using Whoosh BM25 index")
        else:
            self.bm25_index = BM25Index()
            logger.info("HybridRAG: Using in-memory BM25 index")

        self.documents: Dict[str, IndexedDocument] = {}
        # Section-level docs store
        self.section_documents: Dict[str, IndexedDocument] = {}
        # Mappings to enable section-constrained search
        self.section_to_chunks: Dict[str, List[str]] = {}
        self.chunk_to_section: Dict[str, str] = {}
        # Section metadata by key for citation hints (page spans)
        self.section_meta_by_key: Dict[str, Dict[str, Any]] = {}
        # Expert weights by role for light MODE-style fusion
        self.ROLE_WEIGHTS: Dict[str, float] = {
            "guideline": 1.15,
            "narrative": 1.00,
            "table": 0.95,
            "figure": 0.90,
        }
        self._cross_encoder = None

    def reset(self) -> None:
        self.vector_index.clear()
        self.bm25_index.clear()
        self.documents.clear()
        self.section_vector_index.clear()
        self.section_documents.clear()
        self.section_to_chunks.clear()
        self.chunk_to_section.clear()
        self.section_meta_by_key.clear()
        logger.info("HybridRAG: indices cleared")

    def index_documents(self, docs: List[IndexedDocument]) -> Dict[str, Any]:
        if not docs:
            return {"indexed": 0}
        # Separate by doc_type (section vs chunk)
        chunk_docs: List[IndexedDocument] = []
        section_docs: List[IndexedDocument] = []
        for d in docs:
            meta = d.metadata or {}
            dt = (meta.get("doc_type") or "chunk").lower()
            if dt == "section":
                section_docs.append(d)
            else:
                chunk_docs.append(d)

        if section_docs:
            s_ids = [d.doc_id for d in section_docs]
            s_texts = [d.text for d in section_docs]
            for d in section_docs:
                self.section_documents[d.doc_id] = d
                sk = (d.metadata or {}).get("section_key")
                if sk:
                    self.section_meta_by_key[str(sk)] = d.metadata or {}
            if self._qdrant:
                vecs = self.embedding_provider.embed_texts(s_texts)
                self.section_vector_index.add(s_ids, s_texts, vectors=vecs)  # type: ignore[arg-type]
            else:
                self.section_vector_index.add(s_ids, s_texts)

        if chunk_docs:
            ids = [d.doc_id for d in chunk_docs]
            texts = [d.text for d in chunk_docs]
            for d in chunk_docs:
                self.documents[d.doc_id] = d
                sec_key = (d.metadata or {}).get("section_key")
                if sec_key:
                    self.chunk_to_section[d.doc_id] = sec_key
                    self.section_to_chunks.setdefault(sec_key, []).append(d.doc_id)
            if self._qdrant:
                vecs = self.embedding_provider.embed_texts(texts)
                self.vector_index.add(ids, texts, vectors=vecs)  # type: ignore[arg-type]
            else:
                self.vector_index.add(ids, texts)
            self.bm25_index.add(ids, texts)

        total = len(section_docs) + len(chunk_docs)
        logger.info(f"HybridRAG: indexed sections={len(section_docs)} chunks={len(chunk_docs)} (total={total})")
        return {"indexed": total, "sections": len(section_docs), "chunks": len(chunk_docs)}

    @staticmethod
    def _normalize_scores(pairs: List[Tuple[str, float]]) -> Dict[str, float]:
        if not pairs:
            return {}
        vals = np.array([s for _, s in pairs], dtype=np.float32)
        vmin = float(np.min(vals))
        vmax = float(np.max(vals))
        if vmax - vmin < 1e-8:
            return {doc_id: 0.0 for doc_id, _ in pairs}
        return {doc_id: (float(score) - vmin) / (vmax - vmin) for doc_id, score in pairs}

    def search(self, query: str, top_k: int = 10) -> List[Dict[str, Any]]:
        # 1) Coarse search over section summaries (if available)
        allowed_sections: Optional[set] = None
        if self.section_documents and self.section_vector_index._doc_ids:
            s_hits = self.section_vector_index.query(query, top_k=self.COARSE_SECTIONS)
            # map to section_keys from metadata
            allowed_sections = set()
            for sid, _ in s_hits:
                sdoc = self.section_documents.get(sid)
                if sdoc and sdoc.metadata:
                    sk = sdoc.metadata.get("section_key")
                    if sk:
                        allowed_sections.add(sk)

        # 2) Retrieve candidates from chunk indices
        if self._qdrant:
            qvec = self.embedding_provider.embed_texts([query])[0]
            v_hits = self.vector_index.query(qvec, top_k=self.VECTOR_CANDIDATES)  # type: ignore[arg-type]
        else:
            v_hits = self.vector_index.query(query, top_k=self.VECTOR_CANDIDATES)
        b_hits = self.bm25_index.query(query, top_k=self.BM25_CANDIDATES)

        # Filter by allowed sections if present
        def _filter_hits(hits: List[Tuple[str, float]]) -> List[Tuple[str, float]]:
            if not allowed_sections:
                return hits
            out: List[Tuple[str, float]] = []
            for doc_id, score in hits:
                sec = self.chunk_to_section.get(doc_id)
                if sec and sec in allowed_sections:
                    out.append((doc_id, score))
            return out

        v_hits = _filter_hits(v_hits)
        b_hits = _filter_hits(b_hits)

        v_norm = self._normalize_scores(v_hits)
        b_norm = self._normalize_scores(b_hits)

        # 3) Weighted fusion with role weights (light MODE)
        all_ids = set(list(v_norm.keys()) + list(b_norm.keys()))
        results: List[Tuple[str, float, float, float]] = []  # (doc_id, vector, bm25, hybrid)
        for doc_id in all_ids:
            vs = v_norm.get(doc_id, 0.0)
            bs = b_norm.get(doc_id, 0.0)
            hybrid = self.alpha * vs + (1.0 - self.alpha) * bs
            # apply expert role weight
            role = (self.documents.get(doc_id).metadata or {}).get("role") if self.documents.get(doc_id) else None
            weight = self.ROLE_WEIGHTS.get(str(role), 1.0)
            hybrid *= weight
            results.append((doc_id, vs, bs, hybrid))

        results.sort(key=lambda x: x[3], reverse=True)

        # Optional reranker on top-M candidates
        if self.enable_reranker and ST_AVAILABLE:
            rerank_M = min(self.rerank_top_k, len(results))
            cand_ids = [doc_id for (doc_id, _, _, _) in results[:rerank_M]]
            pairs = []
            texts = []
            for did in cand_ids:
                doc = self.documents.get(did)
                if not doc:
                    continue
                texts.append(doc.text)
                pairs.append((query, doc.text))
            if pairs:
                try:
                    if self._cross_encoder is None:
                        self._cross_encoder = CrossEncoder(self.reranker_model_name)
                    scores = self._cross_encoder.predict(pairs)
                    # Reorder by reranker scores
                    scored = list(zip(cand_ids, scores))
                    scored.sort(key=lambda x: float(x[1]), reverse=True)
                    # Merge reranked head with tail
                    reranked_ids = [cid for cid, _ in scored]
                    # build new ordered results list
                    id_to_tuple = {doc_id: tpl for (doc_id, *tpl) in [(d, v, b, h) for (d, v, b, h) in results]}
                    new_results: List[Tuple[str, float, float, float]] = []
                    for cid in reranked_ids:
                        v = id_to_tuple[cid][0]
                        b = id_to_tuple[cid][1]
                        h = id_to_tuple[cid][2]
                        new_results.append((cid, v, b, h))
                    # append remaining (not reranked)
                    remaining = [r for r in results if r[0] not in set(reranked_ids)]
                    results = new_results + remaining
                except Exception as e:
                    logger.warning(f"Reranker failed, ignoring: {e}")
        out: List[Dict[str, Any]] = []
        for doc_id, vs, bs, hs in results[:top_k]:
            doc = self.documents.get(doc_id)
            meta = (doc.metadata if doc else None) or {}
            # Page and citation helpers
            page_val = meta.get("page")
            try:
                page_int = int(page_val) if page_val is not None else None
            except Exception:
                page_int = None
            page_from = None
            page_to = None
            if page_int is None:
                sk = meta.get("section_key")
                if sk and sk in self.section_meta_by_key:
                    sm = self.section_meta_by_key.get(sk) or {}
                    try:
                        page_from = int(sm.get("page_from")) if sm.get("page_from") is not None else None
                    except Exception:
                        page_from = None
                    try:
                        page_to = int(sm.get("page_to")) if sm.get("page_to") is not None else None
                    except Exception:
                        page_to = None
            citation = None
            if page_int is not None:
                citation = f"p. {page_int}"
            elif page_from is not None or page_to is not None:
                if page_from is not None and page_to is not None and page_from != page_to:
                    citation = f"pp. {page_from}-{page_to}"
                else:
                    pf = page_from or page_to
                    if pf is not None:
                        citation = f"p. {pf}"
            out.append({
                "doc_id": doc_id,
                "text": (doc.text if doc else None),
                "metadata": meta,
                "scores": {
                    "vector": vs,
                    "bm25": bs,
                    "hybrid": hs,
                },
                "citation": citation,
                "page": page_int,
                "page_from": page_from,
                "page_to": page_to,
            })
        return out
