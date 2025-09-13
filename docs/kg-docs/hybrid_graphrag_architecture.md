# Hybrid GraphRAG Architecture Design

## Overview

This document outlines the design for implementing a hybrid GraphRAG architecture in Clinical Corvus, combining a Neo4j Knowledge Graph (KG) with BM25/Vector search stores. The system will use curated knowledge for the KG and non-curated knowledge in BM25/Vector stores.

## Architecture Components

### Core Components

1. **Knowledge Graph (Neo4j)** - Curated medical knowledge with relationships
2. **BM25 Search Store** - Traditional keyword-based search for documents
3. **Vector Search Store** - Semantic search using embeddings
4. **Query Router** - Intelligent routing between KG and search stores
5. **Knowledge Curation System** - Determine what goes in KG vs search stores
6. **Retrieval Orchestrator** - Coordinate searches across multiple stores
7. **Result Aggregator** - Combine and rank results from multiple sources

### Data Flow

```
[User Query]
     ↓
[Query Analysis & Intent Detection]
     ↓
[Query Router - KG vs Search Decision]
     ↓
[Parallel Search Execution]
     ↓
[KG Search]  [BM25 Search] [Vector Search]
     ↓              ↓              ↓
[Result Processing & Scoring]
     ↓              ↓              ↓
[Result Aggregation & Re-ranking]
     ↓
[Final Ranked Results]
```

## Knowledge Graph (Neo4j)

### Schema Design

#### Node Types

1. **MedicalEntity**
   - Properties: id, name, type, description, confidence, source, created_date
   - Subtypes: Disease, Drug, Symptom, Procedure, Anatomy, Gene, Protein

2. **MedicalConcept**
   - Properties: id, name, definition, category, confidence, source

3. **MedicalStudy**
   - Properties: id, title, abstract, publication_date, journal, authors, doi, pmid

4. **Guideline**
   - Properties: id, title, organization, publication_date, url

#### Relationship Types

1. **CAUSES** - Disease causes Symptom
2. **TREATS** - Drug treats Disease
3. **SIDE_EFFECT** - Drug causes SideEffect
4. **ASSOCIATED_WITH** - General association
5. **CONTRAINDICATED** - Treatment contraindicated for condition
6. **DIAGNOSES** - Test diagnoses condition
7. **PREVENTS** - Intervention prevents condition
8. **MANIFESTATION** - Condition manifests as symptom
9. **LOCATION** - Entity located in anatomy
10. **SEVERITY** - Entity indicates severity
11. **REFERENCES** - Entity references study
12. **CONTRADICTS** - Two entities/studies contradict each other
13. **PRECEDES** - Temporal relationship
14. **FOLLOWS** - Temporal relationship

#### Metadata Properties

All nodes and relationships will include:
- **confidence** - Confidence score (0.0-1.0)
- **evidence_level** - Level of evidence (I-IV)
- **source** - Source of information
- **created_date** - When entity/relation was created
- **updated_date** - When entity/relation was last updated
- **curated** - Boolean indicating curation status

### Query Interface

```python
class KGQueryInterface:
    async def search_entities(
        self,
        query: str,
        entity_types: List[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """Search for entities in the knowledge graph."""
        pass
    
    async def find_relationships(
        self,
        source_entity: str,
        target_entity: str = None,
        relation_types: List[str] = None
    ) -> List[Dict]:
        """Find relationships between entities."""
        pass
    
    async def get_entity_context(
        self,
        entity_id: str,
        context_types: List[str] = None
    ) -> Dict:
        """Get contextual information for an entity."""
        pass
    
    async def traverse_graph(
        self,
        start_entity: str,
        max_depth: int = 3,
        relationship_filters: Dict = None
    ) -> Dict:
        """Traverse the knowledge graph from a starting point."""
        pass
```

## BM25 Search Store

### Implementation

Using Elasticsearch/OpenSearch for BM25 keyword search:

```python
class BM25SearchStore:
    def __init__(self, host: str, index_name: str = "clinical_documents"):
        self.host = host
        self.index_name = index_name
        self.client = None
    
    async def index_document(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any]
    ):
        """Index a document for BM25 search."""
        pass
    
    async def search(
        self,
        query: str,
        filters: Dict = None,
        limit: int = 10
    ) -> List[Dict]:
        """Perform BM25 search on documents."""
        pass
```

### Document Structure

```json
{
  "document_id": "unique_identifier",
  "title": "Document Title",
  "content": "Full document content",
  "abstract": "Document abstract if available",
  "metadata": {
    "source": "PubMed",
    "publication_date": "2023-01-15",
    "authors": ["Author1", "Author2"],
    "journal": "Journal Name",
    "doi": "10.1234/abcd",
    "pmid": "12345678",
    "keywords": ["keyword1", "keyword2"],
    "mesh_terms": ["term1", "term2"],
    "language": "en"
  },
  "sections": [
    {
      "title": "Introduction",
      "content": "Section content",
      "position": 1
    }
  ]
}
```

## Vector Search Store

### Implementation

Using FAISS/ChromaDB for vector similarity search:

```python
class VectorSearchStore:
    def __init__(self, dimension: int = 768, collection_name: str = "clinical_vectors"):
        self.dimension = dimension
        self.collection_name = collection_name
        self.client = None
    
    async def add_documents(
        self,
        documents: List[Dict[str, Any]],
        embeddings: List[List[float]]
    ):
        """Add documents with their embeddings to the vector store."""
        pass
    
    async def search(
        self,
        query_embedding: List[float],
        filters: Dict = None,
        limit: int = 10
    ) -> List[Dict]:
        """Search for similar documents using vector similarity."""
        pass
```

### Embedding Generation

```python
class EmbeddingGenerator:
    def __init__(self, model_name: str = "clinical-bert"):
        self.model_name = model_name
        self.model = None
    
    async def generate_embeddings(
        self,
        texts: List[str]
    ) -> List[List[float]]:
        """Generate embeddings for a list of texts."""
        pass
    
    async def generate_query_embedding(
        self,
        query: str
    ) -> List[float]:
        """Generate embedding for a search query."""
        pass
```

## Query Router

### Purpose

Intelligently route queries between KG and search stores based on:

1. **Query Intent** - Determine if query is factual (KG) or exploratory (search)
2. **Entity Recognition** - Identify known entities that exist in KG
3. **Query Complexity** - Route complex queries to appropriate store
4. **User Context** - Consider user role and preferences

### Implementation

```python
class QueryRouter:
    def __init__(self, kg_interface, bm25_store, vector_store):
        self.kg_interface = kg_interface
        self.bm25_store = bm25_store
        self.vector_store = vector_store
        self.intent_classifier = None  # NLP model for intent classification
    
    async def route_query(
        self,
        query: str,
        user_context: Dict = None
    ) -> Dict[str, Any]:
        """
        Route query to appropriate stores.
        
        Returns:
            Dict with routing decision and store preferences
        """
        # Analyze query intent
        intent = await self._analyze_intent(query)
        
        # Recognize entities
        entities = await self._recognize_entities(query)
        
        # Check KG for known entities
        kg_entities = await self._check_kg_entities(entities)
        
        # Determine routing strategy
        routing_decision = self._determine_routing(
            intent, entities, kg_entities, user_context
        )
        
        return routing_decision
    
    def _determine_routing(
        self,
        intent: str,
        entities: List[str],
        kg_entities: List[str],
        user_context: Dict
    ) -> Dict[str, Any]:
        """Determine routing based on analysis."""
        # Logic for routing decisions
        # Return routing configuration
        pass
```

## Retrieval Orchestrator

### Purpose

Coordinate parallel searches across multiple stores and manage execution:

```python
class RetrievalOrchestrator:
    def __init__(self, kg_interface, bm25_store, vector_store, query_router):
        self.kg_interface = kg_interface
        self.bm25_store = bm25_store
        self.vector_store = vector_store
        self.query_router = query_router
    
    async def execute_search(
        self,
        query: str,
        user_context: Dict = None
    ) -> Dict[str, Any]:
        """
        Execute hybrid search across all relevant stores.
        
        Returns:
            Dict with results from all stores and metadata
        """
        # Route query
        routing_decision = await self.query_router.route_query(query, user_context)
        
        # Execute parallel searches
        tasks = []
        
        if routing_decision.get("use_kg"):
            tasks.append(self._search_kg(query, routing_decision))
        
        if routing_decision.get("use_bm25"):
            tasks.append(self._search_bm25(query, routing_decision))
        
        if routing_decision.get("use_vector"):
            tasks.append(self._search_vector(query, routing_decision))
        
        # Wait for all searches to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process and combine results
        combined_results = self._combine_results(results, routing_decision)
        
        return combined_results
```

## Result Aggregation & Re-ranking

### Purpose

Combine results from multiple sources and re-rank based on:

1. **Source Quality** - Weight results based on source reliability
2. **Relevance Scores** - Combine different scoring mechanisms
3. **User Context** - Personalize results based on user profile
4. **Freshness** - Prefer more recent information
5. **Diversity** - Ensure diverse results

### Implementation

```python
class ResultAggregator:
    def __init__(self):
        self.reranker = None  # Clinical RoBERTa for re-ranking
    
    async def aggregate_and_rerank(
        self,
        raw_results: Dict[str, Any],
        original_query: str,
        user_context: Dict = None
    ) -> List[Dict]:
        """
        Aggregate results from multiple sources and re-rank.
        
        Returns:
            List of re-ranked results
        """
        # Normalize scores across different sources
        normalized_results = self._normalize_scores(raw_results)
        
        # Combine results
        combined_results = self._combine_results(normalized_results)
        
        # Apply re-ranking
        reranked_results = await self._rerank_results(
            combined_results, original_query, user_context
        )
        
        # Apply diversity and deduplication
        final_results = self._apply_diversity(reranked_results)
        
        return final_results
    
    def _normalize_scores(self, raw_results: Dict) -> Dict:
        """Normalize scores from different sources to 0-1 range."""
        pass
    
    def _combine_results(self, normalized_results: Dict) -> List[Dict]:
        """Combine results from different sources."""
        pass
    
    async def _rerank_results(
        self,
        results: List[Dict],
        query: str,
        user_context: Dict = None
    ) -> List[Dict]:
        """Re-rank results using Clinical RoBERTa."""
        # Use Clinical RoBERTa service for re-ranking
        pass
    
    def _apply_diversity(self, results: List[Dict]) -> List[Dict]:
        """Apply diversity and deduplication to results."""
        pass
```

## Knowledge Curation System

### Purpose

Determine what information goes into the KG vs BM25/Vector stores:

1. **Source Quality Assessment** - Evaluate source reliability
2. **Content Analysis** - Analyze content quality and structure
3. **Entity Verification** - Verify entity accuracy
4. **Relationship Validation** - Validate relationships between entities
5. **Curation Workflow** - Human-in-the-loop for critical information

### Implementation

```python
class KnowledgeCurationSystem:
    def __init__(self):
        self.quality_assessor = None
        self.entity_verifier = None
        self.relationship_validator = None
    
    async def curate_document(
        self,
        document: Dict[str, Any],
        source_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Curate a document for appropriate storage.
        
        Returns:
            Dict with curation decision and metadata
        """
        # Assess source quality
        source_quality = await self._assess_source_quality(source_info)
        
        # Analyze content quality
        content_quality = await self._analyze_content_quality(document)
        
        # Extract entities and relationships
        entities, relationships = await self._extract_knowledge(document)
        
        # Verify entities
        verified_entities = await self._verify_entities(entities)
        
        # Validate relationships
        validated_relationships = await self._validate_relationships(relationships)
        
        # Make curation decision
        curation_decision = self._make_curation_decision(
            source_quality, content_quality, verified_entities, validated_relationships
        )
        
        return {
            "decision": curation_decision,
            "entities": verified_entities,
            "relationships": validated_relationships,
            "metadata": {
                "source_quality": source_quality,
                "content_quality": content_quality,
                "curation_timestamp": datetime.now().isoformat()
            }
        }
```

## Integration with Clinical Corvus

### API Endpoints

```python
# Hybrid search endpoint
@app.post("/api/graphrag/search")
async def hybrid_search(
    query: str,
    user_context: Optional[Dict] = None,
    search_preferences: Optional[Dict] = None
):
    """Perform hybrid search across KG and search stores."""
    pass

# KG query endpoint
@app.post("/api/graphrag/kg-query")
async def kg_query(
    query: str,
    query_type: str = "entities"  # entities, relationships, traversal
):
    """Query the knowledge graph directly."""
    pass

# Document indexing endpoint
@app.post("/api/graphrag/index-document")
async def index_document(
    document: Dict[str, Any],
    force_kg: bool = False  # Force indexing in KG
):
    """Index a document in appropriate store."""
    pass
```

### MCP Integration

Add GraphRAG capabilities as MCP tools:

```python
# Hybrid search tool
hybrid_search_tool = MCPToolDefinition(
    name="hybrid_search",
    description="Search across knowledge graph and document stores",
    input_schema={
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "Search query"},
            "max_results": {"type": "integer", "description": "Maximum results to return"},
            "include_kg": {"type": "boolean", "description": "Include knowledge graph results"},
            "include_bm25": {"type": "boolean", "description": "Include BM25 search results"},
            "include_vector": {"type": "boolean", "description": "Include vector search results"}
        },
        "required": ["query"]
    }
)

# KG traversal tool
kg_traversal_tool = MCPToolDefinition(
    name="kg_traverse",
    description="Traverse the knowledge graph from a starting entity",
    input_schema={
        "type": "object",
        "properties": {
            "start_entity": {"type": "string", "description": "Starting entity name or ID"},
            "max_depth": {"type": "integer", "description": "Maximum traversal depth"},
            "relationship_types": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Specific relationship types to follow"
            }
        },
        "required": ["start_entity"]
    }
)
```

## Performance Optimization

### Caching Strategy

```python
class GraphRAGCache:
    def __init__(self):
        self.query_cache = LRUCache(maxsize=10000)  # Query results
        self.entity_cache = LRUCache(maxsize=50000)  # Entity information
        self.embedding_cache = LRUCache(maxsize=20000)  # Embeddings
    
    async def get_cached_result(self, query_hash: str) -> Optional[Dict]:
        """Get cached search result."""
        return self.query_cache.get(query_hash)
    
    async def cache_result(self, query_hash: str, result: Dict):
        """Cache search result."""
        self.query_cache[query_hash] = result
```

### Parallel Processing

```python
async def parallel_search_execution(
    self,
    query: str,
    routing_decision: Dict
) -> Dict[str, Any]:
    """Execute searches in parallel for better performance."""
    tasks = []
    
    # Create tasks for each store based on routing decision
    if routing_decision.get("use_kg"):
        tasks.append(self._execute_kg_search(query))
    
    if routing_decision.get("use_bm25"):
        tasks.append(self._execute_bm25_search(query))
    
    if routing_decision.get("use_vector"):
        tasks.append(self._execute_vector_search(query))
    
    # Execute all tasks concurrently
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    return self._process_parallel_results(results)
```

## Monitoring and Observability

### Metrics Collection

1. **Query Performance** - Response times, success rates
2. **Store Performance** - Individual store performance metrics
3. **Routing Accuracy** - Effectiveness of query routing decisions
4. **Result Quality** - User satisfaction and relevance scores
5. **Resource Usage** - CPU, memory, and network usage

### Logging

```python
class GraphRAGLogger:
    def __init__(self):
        self.logger = logging.getLogger("graphrag")
    
    def log_query(
        self,
        query: str,
        routing_decision: Dict,
        execution_time: float,
        results_count: int
    ):
        """Log query execution details."""
        self.logger.info(
            f"Query executed: {query[:50]}... | "
            f"Routing: {routing_decision} | "
            f"Time: {execution_time:.2f}s | "
            f"Results: {results_count}"
        )
    
    def log_error(
        self,
        error: Exception,
        context: Dict
    ):
        """Log errors with context."""
        self.logger.error(
            f"GraphRAG error: {str(error)} | Context: {context}",
            exc_info=True
        )
```

## Security Considerations

### Data Protection

1. **Access Control** - Restrict access to GraphRAG components
2. **Data Encryption** - Encrypt data at rest and in transit
3. **PII Handling** - Ensure no patient data in KG or search stores
4. **Audit Logging** - Log all GraphRAG operations

### Model Security

1. **Input Validation** - Validate all inputs to prevent injection
2. **Rate Limiting** - Limit query frequency to prevent abuse
3. **Model Isolation** - Run models in secure environments
4. **Version Control** - Track model versions and changes

## Testing Strategy

### Unit Testing

1. **Query Routing Tests** - Test routing logic accuracy
2. **Store Integration Tests** - Test individual store operations
3. **Result Aggregation Tests** - Test result combination logic
4. **Curation System Tests** - Test curation decision making

### Integration Testing

1. **End-to-End Search Tests** - Test complete search workflows
2. **Performance Tests** - Test response times and scalability
3. **Accuracy Tests** - Test result relevance and quality
4. **Failure Recovery Tests** - Test system behavior under failures

## Deployment Architecture

### Component Deployment

```
[API Layer]
     ↓
[Query Router] → [Retrieval Orchestrator]
     ↓                    ↓
[KG Interface]  [BM25 Store] [Vector Store]
     ↓                    ↓              ↓
[Neo4j Cluster] [Elasticsearch] [ChromaDB/FAISS]
```

### Scaling Strategy

1. **Horizontal Scaling** - Scale individual components independently
2. **Load Balancing** - Distribute queries across multiple instances
3. **Caching** - Use distributed caching for frequently accessed data
4. **Database Sharding** - Shard databases for better performance

## Future Extensions

### Planned Enhancements

1. **Advanced Query Language** - Support for complex KG queries
2. **Temporal Reasoning** - Handle time-based relationships and queries
3. **Contradiction Detection** - Identify and handle contradictory information
4. **Active Learning** - Improve system based on user interactions

### Integration Points

1. **Langroid Agents** - Integrate with Langroid multi-agent system
2. **Human-in-the-loop** - Add review workflows for critical queries
3. **Continuous Learning** - Update models and KG with new information
4. **Explainability** - Provide explanations for search results

## Implementation Roadmap

### Phase 1: Core Infrastructure
- [ ] Set up Neo4j database with basic schema
- [ ] Implement BM25 search store (Elasticsearch/OpenSearch)
- [ ] Implement vector search store (ChromaDB/FAISS)
- [ ] Create basic query router

### Phase 2: Integration
- [ ] Integrate with document processing pipeline
- [ ] Add Clinical RoBERTa re-ranking
- [ ] Implement knowledge curation system
- [ ] Add caching and performance optimization

### Phase 3: Enhancement
- [ ] Add advanced query capabilities
- [ ] Implement contradiction detection
- [ ] Add temporal reasoning
- [ ] Enhance monitoring and logging

### Phase 4: Testing and Deployment
- [ ] Unit testing for all components
- [ ] Integration testing with full pipeline
- [ ] Performance testing and optimization
- [ ] Production deployment