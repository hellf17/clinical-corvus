# Clinical RoBERTa Integration Design

## Overview

This document outlines the design for integrating Clinical RoBERTa into the Clinical Corvus platform for medical entity and relationship extraction to populate the Knowledge Graph (KG).

## Purpose

Clinical RoBERTa will be used for:
1. **Entity Extraction** - Identify medical entities (diseases, drugs, symptoms, procedures, etc.)
2. **Relationship Extraction** - Identify relationships between medical entities
3. **Information Reranking** - Rerank retrieved information for relevance in the GraphRAG system

## What's Strong About the Design

- **Clear separation of concerns** (service, extractor, reranker, model manager)
- **Thoughtful I/O formats** for entities/relations (keeps KG mapping easy)
- **Caching, batching, fallback, and monitoring** are called out — all essential
- **Security and auditability** addressed (PII, encryption, audit log)
- **Reranking included** (important to avoid hallucinations when used by Research Agent)

## Key Risks & Gaps to Address Before Building MVP

### 1. UMLS/Terminology Licensing & Mapping
- **Risk**: UMLS access requires API key/license; SNOMED licensing varies by country
- **Solution**: Have a plan (or placeholder) if those IDs are not available
- **Implementation**: Use fallback to MeSH/basic synonym matching when UMLS unavailable

### 2. Entity Normalization/Canonicalization
- **Risk**: Extracting text spans isn't enough without proper normalization
- **Solution**: Need normalization and ID resolution (string match + ontology lookups + fuzzy match)
- **Critical**: This is essential for KG deduplication

### 3. Contradiction Handling Coupling
- **Risk**: Downstream contradictions in KG require provenance tracking
- **Solution**: Relation output must include provenance (doc id, sentence-level evidence) and timestamp
- **Implementation**: Format already supports this — enforce it strictly

### 4. Model Inference Cost & Latency
- **Risk**: Clinical RoBERTa can be large and expensive
- **Solution**: Decide local CPU-only vs remote inference (API or self-host GPU)
- **MVP Recommendation**: Remote inference (hosted inference endpoint) is likely cheaper/faster to start

### 5. Reranker Model Capability
- **Risk**: Reranking quality affects Research Agent reliability
- **Solution**: Use cross-encoder (sequence-pair scoring), not bi-encoder
- **Note**: Cross-encoder is more expensive per item; use only on top-K candidates

### 6. Evaluation/Golden Data
- **Risk**: No way to measure quality without labeled data
- **Solution**: Build small labeled set for entity/relationship evaluation and tuning thresholds
- **Timeline**: Build this early in development

### 7. Cache Invalidation
- **Risk**: Stale cache when models or rules change
- **Solution**: Track cache keys by model version and normalization rules version
- **Implementation**: Include version hashes in cache keys

### 8. Chunking + Context Windowing
- **Risk**: Relation extraction may miss evidence across chunk boundaries
- **Solution**: Ensure chunking logic considers sentence/window boundaries
- **Implementation**: Careful tuning to avoid split evidence

## MVP Goals (Research Agent Enabled)

What we must deliver for a functional Research Agent integration:

1. **Reliable entity extraction with provenance** (doc id, sentence)
2. **Relationship extraction with evidence snippets and confidence**
3. **Reranker that meaningfully improves retrieval ranking** (cross-encoder on top-K)
4. **Fast, auditable API** that the Research Agent can call and trust for citations
5. **Low cost**: Prefer managed or small-scale infra until usage proves out

## Recommended MVP Architecture Decisions

### Model Hosting Strategy
- **Start Remote**: Use managed inference endpoint (Hugging Face Inference Endpoints, Replicate, or OpenAI/Anthropic if they provide specialized biomedical models)
- **Avoid GPU infra cost and ops overhead initially**
- **Local Fallback**: Implement local CPU inference (smaller model or quantized) as fallback for low-throughput or privacy-mode

### Model Choice Strategy
- **Primary**: Use clinically-tuned RoBERTa (Bio/Clinical RoBERTa) for NER
- **Reranker**: Smaller cross-encoder fine-tuned for relevance/reranking
- **Fallback**: If no off-the-shelf Clinical RoBERTa endpoint available, use general biomedical model (BioBERT/PubMedBERT) then refine

### Two-Stage Reranking Architecture
1. **Fast retrieval**: BM25 + dense bi-encoder embeddings → get top N (e.g. 50)
2. **Cross-encoder**: Clinical RoBERTa rerank top N → return top K (e.g. 5-10) with explanations
3. **Balance**: Cost vs. precision optimization

### Normalization & Ontology Mapping Strategy
- **Small lookup service** with exact match → UMLS/MeSH/SNOMED synonyms table
- **Fallback fuzzy match**: Levenshtein + embedding similarity
- **Keep service pluggable and versioned** for easy updates

### Throughput & Batching Strategy
- **Batch NER calls** (batch size 8-32 depending on tokenization)
- **Cache results** keyed by sha256(text + model_version + normalizer_version)
- **Version tracking** for cache invalidation

### Logging & Audit Strategy
- **Log**: input text hash, model version, timestamp, returned entities/relations, evidence snippet
- **Storage**: Write to append-only store (JSONL or Postgres)
- **Compliance**: Full audit trail for clinical decisions

## System Architecture

### Components

1. **Clinical RoBERTa Service** - Core service for model interactions with robust caching and fallbacks
2. **Entity Extractor** - Extract medical entities with normalization and ID resolution
3. **Relationship Extractor** - Extract relationships with provenance and evidence tracking
4. **Cross-Encoder Reranker** - Two-stage reranking for optimal cost/precision balance
5. **Model Manager** - Handle local/remote model deployment with version tracking
6. **Normalization Service** - Pluggable ontology mapping with fallback strategies

### Integration Points

1. **Document Processing Pipeline** - Extract entities/relations from documents
2. **GraphRAG System** - Rerank retrieved information
3. **MCP Server** - Provide entity extraction as a tool
4. **Langroid Agents** - Support agent reasoning with medical knowledge

## Clinical RoBERTa Service

### Enhanced Service Interface

```python
import asyncio
import hashlib
import httpx
from typing import List, Dict, Any, Optional
from cachetools import LRUCache
from functools import partial

DEFAULT_MODEL_VERSION = "crv-1.0"

class ClinicalRoBERTaService:
    def __init__(
        self,
        model_path: Optional[str] = None,
        model_server_url: Optional[str] = None,
        model_version: str = DEFAULT_MODEL_VERSION
    ):
        """
        Initialize Clinical RoBERTa service with robust caching and fallbacks.
        
        Args:
            model_path: Local path to model files
            model_server_url: URL of remote model server
            model_version: Version identifier for cache invalidation
        """
        self.model_path = model_path
        self.model_server_url = model_server_url
        self.is_remote = bool(model_server_url)
        self.model_version = model_version
        self.cache = LRUCache(maxsize=5000)  # Adjust based on memory constraints
        self.http = httpx.AsyncClient(timeout=15.0)
        
    def _cache_key(self, text: str, op: str) -> str:
        """Generate cache key with model version for proper invalidation."""
        key_data = f"{self.model_version}|{op}|{hashlib.sha256(text.encode()).hexdigest()}"
        return key_data

    async def initialize(self):
        """Initialize the model or connection to model server with health checks."""
        if self.is_remote:
            try:
                r = await self.http.get(self.model_server_url + "/health", timeout=5.0)
                assert r.status_code == 200
            except Exception:
                raise RuntimeError("Remote model server unreachable")
        else:
            # Load local model (placeholder for transformers/optimum integration)
            # self.model = ...
            pass

    async def extract_entities(
        self,
        text: str,
        entity_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract medical entities with caching and normalization.
        
        Args:
            text: Input text to process
            entity_types: Specific entity types to extract (optional)
            
        Returns:
            List of extracted entities with provenance and normalized IDs
        """
        key = self._cache_key(text, "entities")
        cached = self.cache.get(key)
        if cached:
            return cached

        if self.is_remote:
            payload = {"text": text, "entity_types": entity_types}
            resp = await self._post_with_retries("/extract/entities", payload)
            entities = resp.json()
        else:
            entities = await self._local_extract_entities(text, entity_types)

        self.cache[key] = entities
        return entities

    async def extract_relationships(
        self,
        text: str,
        entities: Optional[List[Dict]] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract relationships with evidence tracking and provenance.
        
        Args:
            text: Input text to process
            entities: Pre-extracted entities (optional)
            
        Returns:
            List of extracted relationships with evidence snippets
        """
        key = self._cache_key(text + str(len(entities or [])), "relations")
        cached = self.cache.get(key)
        if cached:
            return cached

        if self.is_remote:
            payload = {"text": text, "entities": entities}
            resp = await self._post_with_retries("/extract/relationships", payload)
            rels = resp.json()
        else:
            rels = await self._local_extract_relationships(text, entities)

        self.cache[key] = rels
        return rels

    async def rerank_results(
        self,
        query: str,
        results: List[Dict],
        context: Dict[str, Any] = None
    ) -> List[Dict]:
        """
        Cross-encoder reranking for top-N candidates only.
        
        Args:
            query: Original query
            results: Top-N results from fast retrieval (caller should limit)
            context: Additional context for reranking
            
        Returns:
            Reranked results with explanations and confidence scores
        """
        key = self._cache_key(query + "".join(r["id"] for r in results), "rerank")
        cached = self.cache.get(key)
        if cached:
            return cached

        if self.is_remote:
            payload = {"query": query, "results": results, "context": context}
            resp = await self._post_with_retries("/rerank", payload)
            out = resp.json()
        else:
            out = await self._local_rerank(query, results, context)

        self.cache[key] = out
        return out

    async def _post_with_retries(self, path: str, payload: Dict[str, Any], retries=2):
        """POST with exponential backoff retry logic."""
        url = self.model_server_url.rstrip("/") + path
        for attempt in range(retries + 1):
            try:
                r = await self.http.post(url, json=payload, timeout=30.0)
                r.raise_for_status()
                return r
            except Exception as e:
                if attempt == retries:
                    raise
                await asyncio.sleep(0.5 * (2 ** attempt))

    # Placeholder local implementations (use transformers in real system)
    async def _local_extract_entities(self, text, entity_types):
        """Local entity extraction fallback."""
        return []

    async def _local_extract_relationships(self, text, entities):
        """Local relationship extraction fallback."""
        return []

    async def _local_rerank(self, query, results, context):
        """Local reranking fallback using BM25 score or title match."""
        for r in results:
            r["relevance_score"] = 0.5
            r["explanation"] = "Fallback rerank"
        return sorted(results, key=lambda x: x.get("relevance_score", 0), reverse=True)
```

## Entity Extraction

### Entity Types

The system will recognize the following medical entity types:

1. **DISEASE** - Medical conditions, disorders, syndromes
2. **DRUG** - Medications, pharmaceutical compounds
3. **SYMPTOM** - Signs and symptoms of medical conditions
4. **PROCEDURE** - Medical procedures, surgeries, interventions
5. **ANATOMY** - Body parts, organs, anatomical structures
6. **GENE** - Gene names and identifiers
7. **PROTEIN** - Protein names and identifiers
8. **CELL_TYPE** - Cell types and classifications
9. **TISSUE** - Tissue types and classifications
10. **PATHWAY** - Biological pathways and processes

### Entity Output Format

```python
{
    "entity_id": "unique_identifier",
    "text": "original_text_span",
    "normalized_text": "normalized_entity_name",
    "type": "DISEASE",  # Entity type
    "confidence": 0.95,  # Confidence score
    "position": {
        "start": 10,  # Start character position
        "end": 25     # End character position
    },
    "attributes": {
        "umls_id": "C0012345",  # UMLS identifier if available (may be null)
        "snomed_id": "123456789",  # SNOMED CT identifier (licensing dependent)
        "icd_code": "I10",  # ICD code if applicable
        "mesh_id": "D001234",  # MeSH identifier (fallback when UMLS unavailable)
        "normalized_name": "hypertension",  # Canonicalized entity name
        "synonym_source": "mesh_synonyms"  # Source of normalization
    },
    "context": {
        "sentence": "Full sentence containing the entity",
        "section": "Abstract"  # Document section if available
    }
}
```

## Relationship Extraction

### Relationship Types

The system will identify the following relationship types:

1. **CAUSES** - Entity A causes condition B
2. **TREATS** - Treatment A treats condition B
3. **SIDE_EFFECT** - Drug A causes side effect B
4. **ASSOCIATED_WITH** - General association between entities
5. **CONTRAINDICATED** - Treatment A is contraindicated for condition B
6. **DIAGNOSES** - Test A diagnoses condition B
7. **PREVENTS** - Intervention A prevents condition B
8. **MANIFESTATION** - Condition A manifests as symptom B
9. **LOCATION** - Entity A is located in anatomy B
10. **SEVERITY** - Entity A indicates severity of condition B

### Relationship Output Format

```python
{
    "relation_id": "unique_identifier",
    "source_entity_id": "entity_1_id",
    "target_entity_id": "entity_2_id",
    "type": "TREATS",  # Relationship type
    "confidence": 0.87,  # Confidence score
    "evidence": {
        "text": "supporting_text_snippet",
        "sentence": "full_sentence_containing_evidence",
        "doc_id": "pmid_12345678",  # Document identifier for provenance
        "sentence_start": 150,  # Character position of evidence start
        "sentence_end": 200  # Character position of evidence end
    },
    "context": {
        "section": "Methods",  # Document section
        "paragraph": 3,  # Paragraph number
        "timestamp": "2024-01-15T10:30:00Z"  # Extraction timestamp
    },
    "provenance": {
        "model_version": "crv-1.0",
        "extraction_confidence": 0.87,
        "normalization_method": "umls_exact_match"
    }
}
```

## Reranking System

### Input Format

```python
{
    "query": "What are the treatments for diabetes?",
    "results": [
        {
            "id": "result_1",
            "title": "Diabetes Treatment Guidelines 2023",
            "content": "Comprehensive guidelines for diabetes management...",
            "source": "PubMed",
            "metadata": {
                "publication_date": "2023-01-15",
                "authors": ["Smith, J.", "Doe, A."],
                "journal": "Journal of Diabetes Research"
            }
        }
    ],
    "context": {
        "user_profile": "medical_student",
        "specialty": "endocrinology",
        "patient_context": {
            "age": 55,
            "gender": "male",
            "comorbidities": ["hypertension"]
        }
    }
}
```

### Output Format

```python
[
    {
        "id": "result_1",
        "title": "Diabetes Treatment Guidelines 2023",
        "content": "Comprehensive guidelines for diabetes management...",
        "relevance_score": 0.95,  # Reranked score
        "explanation": "Highly relevant as it contains current treatment guidelines...",
        "metadata": {
            # ... original metadata
        }
    }
]
```

## Model Management

### Local Model Deployment

For local deployment, the system will:

1. **Model Loading** - Load model from local storage
2. **Memory Management** - Efficiently manage GPU/CPU memory
3. **Batch Processing** - Process multiple inputs in batches
4. **Caching** - Cache model predictions for repeated inputs

### Remote Model Deployment

For remote deployment, the system will:

1. **API Communication** - Communicate with model server via REST/gRPC
2. **Connection Management** - Manage connection pooling and retries
3. **Load Balancing** - Distribute requests across multiple model instances
4. **Fallback Handling** - Switch to local model if remote is unavailable

## Integration with Document Processing

### Pipeline Integration

The Clinical RoBERTa service will integrate with the document processing pipeline:

1. **Text Preprocessing** - Clean and normalize text for model input
2. **Entity Extraction** - Extract medical entities from document text
3. **Relationship Extraction** - Identify relationships between entities
4. **Result Post-processing** - Format results for KG population
5. **Quality Scoring** - Assign confidence scores to extracted elements

### Error Handling

The integration will handle:

1. **Model Errors** - Graceful handling of model inference errors
2. **Timeout Handling** - Manage timeouts for remote model calls
3. **Fallback Processing** - Use alternative methods if model fails
4. **Partial Results** - Return partial results when possible

## Performance Optimization

### Batch Processing

```python
async def batch_extract_entities(
    self,
    texts: List[str],
    batch_size: int = 32
) -> List[List[Dict]]:
    """
    Extract entities from multiple texts in batches.
    """
    results = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        batch_results = await self._process_batch(batch)
        results.extend(batch_results)
    return results
```

### Caching Strategy

```python
class EntityExtractionCache:
    def __init__(self, cache_size: int = 10000):
        self.cache = LRUCache(maxsize=cache_size)
        self.cache_hits = 0
        self.cache_misses = 0
    
    def get_cached_result(self, text_hash: str) -> Optional[List[Dict]]:
        """Retrieve cached result if available."""
        result = self.cache.get(text_hash)
        if result:
            self.cache_hits += 1
        else:
            self.cache_misses += 1
        return result
    
    def cache_result(self, text_hash: str, result: List[Dict]):
        """Cache extraction result."""
        self.cache[text_hash] = result
```

## Security Considerations

### Data Privacy

1. **PII Protection** - Ensure no patient data is sent to model
2. **Data Encryption** - Encrypt data in transit to remote models
3. **Access Control** - Restrict model access to authorized components
4. **Audit Logging** - Log all model interactions for compliance

### Model Security

1. **Input Validation** - Validate all inputs to prevent injection attacks
2. **Rate Limiting** - Limit model usage to prevent abuse
3. **Model Isolation** - Run models in isolated environments
4. **Version Control** - Track model versions and changes

## Monitoring and Logging

### Metrics Collection

1. **Extraction Accuracy** - Track entity/relationship extraction accuracy
2. **Processing Time** - Monitor model inference time
3. **Cache Performance** - Track cache hit/miss rates
4. **Error Rates** - Monitor model error rates and types

### Logging Strategy

1. **Structured Logging** - Use structured logs for easy analysis
2. **Performance Logging** - Log processing times and resource usage
3. **Error Tracking** - Log detailed error information for debugging
4. **Audit Trail** - Maintain audit trail of all model interactions

## Testing Strategy

### Unit Testing

1. **Entity Extraction Tests** - Test entity extraction accuracy
2. **Relationship Extraction Tests** - Test relationship identification
3. **Reranking Tests** - Test result reranking quality
4. **Error Handling Tests** - Test error scenarios and fallbacks

### Integration Testing

1. **Pipeline Integration Tests** - Test full document processing pipeline
2. **Model Server Integration Tests** - Test remote model interactions
3. **KG Population Tests** - Test integration with KG population
4. **Performance Tests** - Test processing speed and resource usage

## Deployment Architecture

### Local Deployment

```
[Clinical Corvus Backend]
        ↓
[Clinical RoBERTa Service]
        ↓
[Local Model Files/GPU]
```

### Remote Deployment

```
[Clinical Corvus Backend]
        ↓
[Clinical RoBERTa Service]
        ↓
[Model Server Cluster]
        ↓
[Docker/Kubernetes Pods]
```

## Future Extensions

### Planned Enhancements

1. **Multi-language Support** - Support for multiple medical languages
2. **Specialized Models** - Domain-specific models (oncology, cardiology, etc.)
3. **Active Learning** - Use processing results to improve model performance
4. **Explainability** - Provide explanations for model decisions

### Integration Points

1. **Langroid Agents** - Integrate with Langroid multi-agent system
2. **Human-in-the-loop** - Add review workflows for critical extractions
3. **Quality Assurance** - Implement automated quality checks
4. **Continuous Learning** - Update models with new medical knowledge

## Concrete MVP Implementation Plan (12-16 dev days estimate)

### Phase A - Foundation (3-5 days)
- [ ] Implement ClinicalRoBERTaService skeleton (local + remote modes)
- [ ] Implement extraction API endpoints:
  - [ ] `POST /extract/entities` → returns entities with provenance
  - [ ] `POST /extract/relationships` → returns relationships with supporting sentence text
- [ ] Add simple LRU cache with model-version keying
- [ ] Set up basic health check endpoint for remote model server

### Phase B - Normalization & KG Prep (2-3 days)
- [ ] Implement lightweight normalizer:
  - [ ] Synonym map (CSV) + fuzzy matching + configurable thresholds
  - [ ] Output normalized name + resolved IDs (or null if none)
- [ ] Add packaging of extraction results to KG transformer format
- [ ] Implement cache invalidation with version tracking
- [ ] Add fallback handling when UMLS/SNOMED unavailable

### Phase C - Reranker & Research Agent Integration (3-4 days)
- [ ] Implement bi-encoder embeddings for vector search (Chroma) and BM25 index
- [ ] Implement cross-encoder reranker endpoint:
  - [ ] `POST /rerank` (accepts query + list of candidate results)
  - [ ] Apply cross-encoder only to top-N candidates
- [ ] Integrate reranker into Research Agent flow
- [ ] Log reranker decisions for quality assessment

### Phase D - Monitoring & Testing (2-3 days)
- [ ] Unit tests for extractors and reranker
- [ ] Create small labeled test set for evaluation
- [ ] Instrument latency, errors, cache hit rate, and extraction confidence histograms
- [ ] Add audit logging (JSONL)
- [ ] Create simple UI to view extraction results (human review queue seed)

### Phase E - Hardening & Ops (2-4 days)
- [ ] Add retry/timeouts for model calls
- [ ] Add model version header in responses
- [ ] Add config to switch between remote and local models
- [ ] Add basic validation of inputs and PII stripping (if required)
- [ ] Implement chunking logic with careful boundary handling
- [ ] Add performance benchmarks and cost monitoring

## Monitoring & Quality Control (Must-Haves for Research Agent)

### Per-Call Logging Requirements
- **Query ID**: Unique identifier for tracking request flow
- **Model Version**: Track which model version processed the request
- **Latency**: Response time for performance monitoring
- **Cache Hit**: Whether result came from cache (performance optimization)
- **Returned Entities/Relations**: Full extraction results for audit trail

### Quality Metrics Dashboard
- **Confidence Histograms**: Track distribution; investigate drift over time
- **Extraction Precision/Recall**: Measured on small golden set; run nightly
- **Cache Performance**: Hit rate, memory usage, invalidation frequency
- **Error Rates**: Model failures, timeout rates, fallback usage

### Continuous Quality Assurance
- **Extraction Precision/Recall**: Automated testing on labeled dataset
- **Reranker A/B Testing**: Compare Research Agent answers with and without cross-encoder
- **Human Review Queue**: Sample extraction results for manual quality review
- **Model Drift Detection**: Alert when confidence distributions change significantly

### Audit Trail Requirements
- **Input Text Hash**: For privacy while maintaining audit capability
- **Extraction Provenance**: Model version, timestamp, confidence scores
- **Evidence Tracking**: Full sentence context and document location
- **Decision Logging**: Why certain entities/relations were extracted or rejected

### Cost Monitoring
- **API Usage Tracking**: Monitor external model API calls and costs
- **Throughput Optimization**: Track requests per second and batch efficiency
- **Resource Utilization**: CPU/memory usage for local models
- **Cost per Extraction**: Monitor unit economics of extraction pipeline

This enhanced implementation plan addresses the key risks identified while maintaining focus on delivering a functional MVP that supports the Research Agent effectively.