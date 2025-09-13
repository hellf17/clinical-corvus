# Hybrid GraphRAG Architecture Implementation Design

## Overview

This document outlines the implementation design for the hybrid GraphRAG architecture in Clinical Corvus, combining a Neo4j Knowledge Graph with BM25/Vector search stores for comprehensive medical information retrieval.

## System Architecture

### Core Components

1. **Knowledge Graph (Neo4j)** - Curated medical knowledge with relationships
2. **BM25 Search Store** - Traditional keyword-based search (Elasticsearch/OpenSearch)
3. **Vector Search Store** - Semantic search using embeddings (ChromaDB/FAISS)
4. **Query Router** - Intelligent routing between KG and search stores
5. **Retrieval Orchestrator** - Coordinate searches across multiple stores
6. **Result Aggregator** - Combine and rank results from multiple sources

### Data Flow

```
[User Query]
     ↓
[Query Analysis]
     ↓
[Query Router]
     ↓
[Parallel Search Execution]
     ↓
[KG Search] → [Entity Matching] → [Graph Traversal]
     ↓
[BM25 Search] → [Keyword Matching] → [Document Retrieval]
     ↓
[Vector Search] → [Semantic Matching] → [Similar Document Retrieval]
     ↓
[Result Aggregation & Re-ranking]
     ↓
[Final Ranked Results]
```

## Implementation

### Knowledge Graph (Neo4j) Implementation

```python
import neo4j
from typing import List, Dict, Any, Optional
import asyncio
import logging

logger = logging.getLogger(__name__)

class KnowledgeGraphInterface:
    def __init__(self, uri: str, username: str, password: str):
        """
        Initialize Neo4j connection.
        
        Args:
            uri: Neo4j database URI
            username: Database username
            password: Database password
        """
        self.uri = uri
        self.username = username
        self.password = password
        self.driver = None
    
    async def initialize(self):
        """Initialize Neo4j driver."""
        try:
            self.driver = neo4j.AsyncGraphDatabase.driver(
                self.uri, 
                auth=(self.username, self.password)
            )
            # Test connection
            async with self.driver.session() as session:
                await session.run("RETURN 1")
            logger.info("Neo4j connection established")
        except Exception as e:
            logger.error(f"Failed to initialize Neo4j connection: {e}")
            raise
    
    async def close(self):
        """Close Neo4j driver."""
        if self.driver:
            await self.driver.close()
    
    async def search_entities(
        self,
        query: str,
        entity_types: Optional[List[str]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for entities in the knowledge graph.
        
        Args:
            query: Search query
            entity_types: Specific entity types to search for
            limit: Maximum number of results
            
        Returns:
            List of matching entities
        """
        async with self.driver.session() as session:
            # Build Cypher query
            cypher_query = """
            CALL db.index.fulltext.queryNodes('entityIndex', $query) 
            YIELD node, score
            WHERE score > 0.5
            """
            
            # Add entity type filtering if specified
            if entity_types:
                type_conditions = " OR ".join([f"node.type = '{etype}'" for etype in entity_types])
                cypher_query += f" AND ({type_conditions})"
            
            cypher_query += """
            RETURN node, score
            ORDER BY score DESC
            LIMIT $limit
            """
            
            result = await session.run(
                cypher_query,
                query=query,
                limit=limit
            )
            
            entities = []
            async for record in result:
                node = record["node"]
                score = record["score"]
                
                entity_data = {
                    "id": node.id,
                    "properties": dict(node.items()),
                    "labels": list(node.labels),
                    "relevance_score": score
                }
                entities.append(entity_data)
            
            return entities
    
    async def find_relationships(
        self,
        source_entity_id: Optional[str] = None,
        target_entity_id: Optional[str] = None,
        relation_types: Optional[List[str]] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Find relationships between entities.
        
        Args:
            source_entity_id: Source entity ID (optional)
            target_entity_id: Target entity ID (optional)
            relation_types: Specific relation types to search for
            limit: Maximum number of results
            
        Returns:
            List of relationships
        """
        async with self.driver.session() as session:
            # Build Cypher query
            cypher_query = "MATCH (source)-[rel]->(target) WHERE "
            conditions = []
            parameters = {}
            
            # Add source entity condition
            if source_entity_id:
                conditions.append("id(source) = $source_id")
                parameters["source_id"] = int(source_entity_id)
            
            # Add target entity condition
            if target_entity_id:
                conditions.append("id(target) = $target_id")
                parameters["target_id"] = int(target_entity_id)
            
            # Add relation type conditions
            if relation_types:
                type_conditions = " OR ".join([f"type(rel) = '{rtype}'" for rtype in relation_types])
                conditions.append(f"({type_conditions})")
            
            # If no conditions, match all relationships
            if not conditions:
                conditions.append("true")
            
            cypher_query += " AND ".join(conditions)
            cypher_query += """
            RETURN source, rel, target
            LIMIT $limit
            """
            parameters["limit"] = limit
            
            result = await session.run(cypher_query, **parameters)
            
            relationships = []
            async for record in result:
                source = record["source"]
                rel = record["rel"]
                target = record["target"]
                
                relationship_data = {
                    "source": {
                        "id": source.id,
                        "properties": dict(source.items()),
                        "labels": list(source.labels)
                    },
                    "relationship": {
                        "id": rel.id,
                        "type": rel.type,
                        "properties": dict(rel.items())
                    },
                    "target": {
                        "id": target.id,
                        "properties": dict(target.items()),
                        "labels": list(target.labels)
                    }
                }
                relationships.append(relationship_data)
            
            return relationships
    
    async def traverse_graph(
        self,
        start_entity_id: str,
        max_depth: int = 3,
        relationship_filters: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Traverse the knowledge graph from a starting entity.
        
        Args:
            start_entity_id: Starting entity ID
            max_depth: Maximum traversal depth
            relationship_filters: Filters for relationship types
            
        Returns:
            Graph traversal results
        """
        async with self.driver.session() as session:
            # Build Cypher query for graph traversal
            cypher_query = """
            MATCH (start)
            WHERE id(start) = $start_id
            CALL apoc.path.subgraphAll(start, {
                maxLevel: $max_depth,
                relationshipFilter: $rel_filter
            })
            YIELD nodes, relationships
            RETURN nodes, relationships
            """
            
            # Prepare relationship filter
            rel_filter = ""
            if relationship_filters:
                # Convert filters to APOC format
                included_types = relationship_filters.get("include", [])
                if included_types:
                    rel_filter = "|".join(included_types)
            
            result = await session.run(
                cypher_query,
                start_id=int(start_entity_id),
                max_depth=max_depth,
                rel_filter=rel_filter
            )
            
            record = await result.single()
            if record:
                nodes = record["nodes"]
                relationships = record["relationships"]
                
                return {
                    "nodes": [{"id": node.id, "properties": dict(node.items()), "labels": list(node.labels)} for node in nodes],
                    "relationships": [
                        {
                            "id": rel.id,
                            "type": rel.type,
                            "properties": dict(rel.items()),
                            "start_node": rel.start_node.id,
                            "end_node": rel.end_node.id
                        }
                        for rel in relationships
                    ]
                }
            
            return {"nodes": [], "relationships": []}
    
    async def get_entity_context(
        self,
        entity_id: str,
        context_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Get contextual information for an entity.
        
        Args:
            entity_id: Entity ID
            context_types: Types of context to retrieve
            
        Returns:
            Entity context information
        """
        async with self.driver.session() as session:
            # Get entity properties
            entity_query = "MATCH (e) WHERE id(e) = $entity_id RETURN e"
            entity_result = await session.run(entity_query, entity_id=int(entity_id))
            entity_record = await entity_result.single()
            
            if not entity_record:
                return {}
            
            entity = entity_record["e"]
            context = {
                "entity": {
                    "id": entity.id,
                    "properties": dict(entity.items()),
                    "labels": list(entity.labels)
                },
                "related_entities": [],
                "relationships": []
            }
            
            # Get related entities and relationships
            related_query = """
            MATCH (e)-[r]-(related)
            WHERE id(e) = $entity_id
            RETURN related, r
            LIMIT 50
            """
            
            related_result = await session.run(related_query, entity_id=int(entity_id))
            async for record in related_result:
                related = record["related"]
                rel = record["r"]
                
                context["related_entities"].append({
                    "id": related.id,
                    "properties": dict(related.items()),
                    "labels": list(related.labels)
                })
                
                context["relationships"].append({
                    "id": rel.id,
                    "type": rel.type,
                    "properties": dict(rel.items())
                })
            
            return context
```

### BM25 Search Store Implementation

```python
from elasticsearch import AsyncElasticsearch
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class BM25SearchStore:
    def __init__(self, hosts: List[str], index_name: str = "clinical_documents"):
        """
        Initialize Elasticsearch connection.
        
        Args:
            hosts: List of Elasticsearch hosts
            index_name: Name of the index to use
        """
        self.hosts = hosts
        self.index_name = index_name
        self.client = None
    
    async def initialize(self):
        """Initialize Elasticsearch client."""
        try:
            self.client = AsyncElasticsearch(hosts=self.hosts)
            # Test connection
            await self.client.ping()
            logger.info("Elasticsearch connection established")
        except Exception as e:
            logger.error(f"Failed to initialize Elasticsearch connection: {e}")
            raise
    
    async def close(self):
        """Close Elasticsearch client."""
        if self.client:
            await self.client.close()
    
    async def index_document(
        self,
        document_id: str,
        content: str,
        metadata: Dict[str, Any]
    ):
        """
        Index a document for BM25 search.
        
        Args:
            document_id: Unique document identifier
            content: Document content
            metadata: Document metadata
        """
        if not self.client:
            await self.initialize()
        
        try:
            document = {
                "content": content,
                "metadata": metadata,
                "indexed_at": self._get_timestamp()
            }
            
            await self.client.index(
                index=self.index_name,
                id=document_id,
                document=document
            )
            
            logger.info(f"Indexed document {document_id}")
        except Exception as e:
            logger.error(f"Error indexing document {document_id}: {e}")
            raise
    
    async def search(
        self,
        query: str,
        filters: Optional[Dict] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Perform BM25 search on documents.
        
        Args:
            query: Search query
            filters: Additional filters to apply
            limit: Maximum number of results
            
        Returns:
            List of search results
        """
        if not self.client:
            await self.initialize()
        
        try:
            # Build search body
            search_body = {
                "query": {
                    "bool": {
                        "must": [
                            {
                                "multi_match": {
                                    "query": query,
                                    "fields": ["content", "metadata.title^2", "metadata.abstract"],
                                    "type": "best_fields"
                                }
                            }
                        ]
                    }
                },
                "size": limit
            }
            
            # Add filters if provided
            if filters:
                filter_clauses = []
                for field, value in filters.items():
                    filter_clauses.append({"term": {f"metadata.{field}": value}})
                
                if filter_clauses:
                    search_body["query"]["bool"]["filter"] = filter_clauses
            
            # Execute search
            response = await self.client.search(
                index=self.index_name,
                body=search_body
            )
            
            # Process results
            results = []
            for hit in response["hits"]["hits"]:
                result = {
                    "id": hit["_id"],
                    "score": hit["_score"],
                    "content": hit["_source"].get("content", ""),
                    "metadata": hit["_source"].get("metadata", {}),
                    "highlight": hit.get("highlight", {})
                }
                results.append(result)
            
            return results
            
        except Exception as e:
            logger.error(f"Error performing BM25 search: {e}")
            return []
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        from datetime import datetime
        return datetime.now().isoformat()
```

### Vector Search Store Implementation

```python
import chromadb
from chromadb.api import AsyncClientAPI
from typing import List, Dict, Any, Optional
import numpy as np
import logging

logger = logging.getLogger(__name__)

class VectorSearchStore:
    def __init__(
        self,
        host: str = "localhost",
        port: int = 8000,
        collection_name: str = "clinical_vectors"
    ):
        """
        Initialize ChromaDB connection.
        
        Args:
            host: ChromaDB server host
            port: ChromaDB server port
            collection_name: Name of the collection to use
        """
        self.host = host
        self.port = port
        self.collection_name = collection_name
        self.client = None
        self.collection = None
    
    async def initialize(self):
        """Initialize ChromaDB client."""
        try:
            self.client = await chromadb.AsyncHttpClient(host=self.host, port=self.port)
            self.collection = await self.client.get_or_create_collection(
                name=self.collection_name
            )
            logger.info("ChromaDB connection established")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB connection: {e}")
            raise
    
    async def close(self):
        """Close ChromaDB client."""
        if self.client:
            # ChromaDB client doesn't have explicit close method
            pass
    
    async def add_documents(
        self,
        document_ids: List[str],
        contents: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None
    ):
        """
        Add documents with their embeddings to the vector store.
        
        Args:
            document_ids: List of document IDs
            contents: List of document contents
            embeddings: List of document embeddings
            metadatas: List of document metadata (optional)
        """
        if not self.client:
            await self.initialize()
        
        try:
            # Ensure embeddings are proper format
            embeddings = [list(embedding) for embedding in embeddings]
            
            await self.collection.add(
                ids=document_ids,
                embeddings=embeddings,
                documents=contents,
                metadatas=metadatas or [{} for _ in document_ids]
            )
            
            logger.info(f"Added {len(document_ids)} documents to vector store")
        except Exception as e:
            logger.error(f"Error adding documents to vector store: {e}")
            raise
    
    async def search(
        self,
        query_embedding: List[float],
        filters: Optional[Dict] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for similar documents using vector similarity.
        
        Args:
            query_embedding: Query embedding vector
            filters: Metadata filters to apply
            limit: Maximum number of results
            
        Returns:
            List of similar documents
        """
        if not self.client:
            await self.initialize()
        
        try:
            # Ensure query embedding is proper format
            query_embedding = list(query_embedding)
            
            # Prepare where clause for filters
            where_clause = None
            if filters:
                where_clause = filters
            
            # Perform similarity search
            results = await self.collection.query(
                query_embeddings=[query_embedding],
                n_results=limit,
                where=where_clause
            )
            
            # Process results
            processed_results = []
            for i in range(len(results["ids"][0])):
                result = {
                    "id": results["ids"][0][i],
                    "score": results["distances"][0][i],
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i] if results["metadatas"][0] else {}
                }
                processed_results.append(result)
            
            return processed_results
            
        except Exception as e:
            logger.error(f"Error performing vector search: {e}")
            return []
```

### Query Router Implementation

```python
from typing import Dict, Any, List, Optional
import asyncio
import logging

logger = logging.getLogger(__name__)

class QueryRouter:
    def __init__(
        self,
        kg_interface: KnowledgeGraphInterface,
        bm25_store: BM25SearchStore,
        vector_store: VectorSearchStore
    ):
        """
        Initialize query router.
        
        Args:
            kg_interface: Knowledge graph interface
            bm25_store: BM25 search store
            vector_store: Vector search store
        """
        self.kg_interface = kg_interface
        self.bm25_store = bm25_store
        self.vector_store = vector_store
        self.intent_classifier = None  # Would be initialized with NLP model
    
    async def route_query(
        self,
        query: str,
        user_context: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Route query to appropriate stores.
        
        Args:
            query: User query
            user_context: Additional user context
            
        Returns:
            Routing decision with store preferences
        """
        # Analyze query intent (simplified implementation)
        intent = await self._analyze_intent(query)
        
        # Recognize entities in query
        entities = await self._recognize_entities(query)
        
        # Check if entities exist in KG
        kg_entities = await self._check_kg_entities(entities)
        
        # Determine routing strategy
        routing_decision = self._determine_routing(
            intent, entities, kg_entities, user_context
        )
        
        logger.info(f"Query routed: {routing_decision}")
        return routing_decision
    
    async def _analyze_intent(self, query: str) -> str:
        """
        Analyze query intent.
        
        Args:
            query: User query
            
        Returns:
            Intent type (factual, exploratory, relationship, etc.)
        """
        # Simplified intent analysis
        query_lower = query.lower()
        
        # Check for relationship queries
        if any(word in query_lower for word in ["relationship", "relation", "connect", "link"]):
            return "relationship"
        
        # Check for entity queries
        if any(word in query_lower for word in ["what is", "define", "explain"]):
            return "factual"
        
        # Check for treatment queries
        if any(word in query_lower for word in ["treat", "therapy", "treatment", "cure"]):
            return "treatment"
        
        # Default to exploratory
        return "exploratory"
    
    async def _recognize_entities(self, query: str) -> List[str]:
        """
        Recognize entities in query.
        
        Args:
            query: User query
            
        Returns:
            List of recognized entities
        """
        # Simplified entity recognition
        # In practice, this would use NER or Clinical RoBERTa
        import re
        
        # Simple pattern matching for medical terms
        medical_terms = [
            r'\b(diabetes|hypertension|cancer|heart disease|asthma)\b',
            r'\b(aspirin|insulin|metformin|lisinopril)\b',
            r'\b(symptom|treatment|diagnosis|prognosis)\b'
        ]
        
        entities = []
        for pattern in medical_terms:
            matches = re.findall(pattern, query, re.IGNORECASE)
            entities.extend(matches)
        
        return list(set(entities))  # Remove duplicates
    
    async def _check_kg_entities(self, entities: List[str]) -> List[str]:
        """
        Check which entities exist in the knowledge graph.
        
        Args:
            entities: List of entities to check
            
        Returns:
            List of entities found in KG
        """
        if not entities:
            return []
        
        # Search KG for entities
        found_entities = []
        for entity in entities:
            kg_results = await self.kg_interface.search_entities(
                entity, limit=1
            )
            if kg_results:
                found_entities.append(entity)
        
        return found_entities
    
    def _determine_routing(
        self,
        intent: str,
        entities: List[str],
        kg_entities: List[str],
        user_context: Optional[Dict]
    ) -> Dict[str, Any]:
        """
        Determine routing based on analysis.
        
        Args:
            intent: Query intent
            entities: Recognized entities
            kg_entities: Entities found in KG
            user_context: User context
            
        Returns:
            Routing decision
        """
        routing = {
            "use_kg": False,
            "use_bm25": False,
            "use_vector": False,
            "intent": intent,
            "confidence": 0.0
        }
        
        # Routing logic based on intent and entities
        if intent == "factual" and kg_entities:
            # Factual queries about known entities -> KG
            routing["use_kg"] = True
            routing["confidence"] = 0.9
        elif intent == "relationship" and len(kg_entities) >= 2:
            # Relationship queries between known entities -> KG
            routing["use_kg"] = True
            routing["confidence"] = 0.85
        elif intent == "treatment":
            # Treatment queries -> All stores for comprehensive results
            routing["use_kg"] = True
            routing["use_bm25"] = True
            routing["use_vector"] = True
            routing["confidence"] = 0.8
        else:
            # Exploratory queries -> Search stores
            routing["use_bm25"] = True
            routing["use_vector"] = True
            routing["confidence"] = 0.7
        
        return routing
```

### Retrieval Orchestrator Implementation

```python
from typing import Dict, Any, List, Optional
import asyncio
import logging

logger = logging.getLogger(__name__)

class RetrievalOrchestrator:
    def __init__(
        self,
        kg_interface: KnowledgeGraphInterface,
        bm25_store: BM25SearchStore,
        vector_store: VectorSearchStore,
        query_router: QueryRouter
    ):
        """
        Initialize retrieval orchestrator.
        
        Args:
            kg_interface: Knowledge graph interface
            bm25_store: BM25 search store
            vector_store: Vector search store
            query_router: Query router
        """
        self.kg_interface = kg_interface
        self.bm25_store = bm25_store
        self.vector_store = vector_store
        self.query_router = query_router
    
    async def execute_search(
        self,
        query: str,
        user_context: Optional[Dict] = None,
        max_results: int = 10
    ) -> Dict[str, Any]:
        """
        Execute hybrid search across all relevant stores.
        
        Args:
            query: User query
            user_context: Additional user context
            max_results: Maximum number of results to return
            
        Returns:
            Combined search results
        """
        start_time = asyncio.get_event_loop().time()
        
        # Route query
        routing_decision = await self.query_router.route_query(query, user_context)
        logger.info(f"Routing decision: {routing_decision}")
        
        # Execute parallel searches
        search_tasks = []
        
        if routing_decision.get("use_kg"):
            search_tasks.append(("kg", self._search_kg(query, max_results // 3)))
        
        if routing_decision.get("use_bm25"):
            search_tasks.append(("bm25", self._search_bm25(query, max_results // 2)))
        
        if routing_decision.get("use_vector"):
            search_tasks.append(("vector", self._search_vector(query, max_results // 2)))
        
        # Execute all searches concurrently
        search_results = {}
        if search_tasks:
            task_names, tasks = zip(*search_tasks)
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for i, (name, result) in enumerate(zip(task_names, results)):
                if isinstance(result, Exception):
                    logger.error(f"Search task {name} failed: {result}")
                    search_results[name] = []
                else:
                    search_results[name] = result
        else:
            # Default to BM25 if no routing decision
            search_results["bm25"] = await self._search_bm25(query, max_results)
        
        # Process and combine results
        combined_results = self._combine_results(search_results, routing_decision)
        
        # Calculate processing time
        processing_time = asyncio.get_event_loop().time() - start_time
        
        return {
            "results": combined_results,
            "routing_decision": routing_decision,
            "processing_time": processing_time,
            "total_results": len(combined_results)
        }
    
    async def _search_kg(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Search knowledge graph."""
        try:
            entities = await self.kg_interface.search_entities(query, limit=limit)
            relationships = await self.kg_interface.find_relationships(limit=limit)
            
            return {
                "entities": entities,
                "relationships": relationships
            }
        except Exception as e:
            logger.error(f"KG search failed: {e}")
            return {"entities": [], "relationships": []}
    
    async def _search_bm25(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Search BM25 store."""
        try:
            results = await self.bm25_store.search(query, limit=limit)
            return results
        except Exception as e:
            logger.error(f"BM25 search failed: {e}")
            return []
    
    async def _search_vector(self, query: str, limit: int) -> List[Dict[str, Any]]:
        """Search vector store."""
        try:
            # Generate query embedding (simplified)
            # In practice, this would use an embedding model
            query_embedding = self._generate_dummy_embedding(query)
            results = await self.vector_store.search(query_embedding, limit=limit)
            return results
        except Exception as e:
            logger.error(f"Vector search failed: {e}")
            return []
    
    def _generate_dummy_embedding(self, text: str) -> List[float]:
        """Generate dummy embedding for testing."""
        # In practice, this would use a real embedding model
        import hashlib
        import struct
        
        # Simple hash-based embedding generation
        hash_obj = hashlib.md5(text.encode())
        hash_bytes = hash_obj.digest()
        
        # Convert to float vector
        embedding = []
        for i in range(0, len(hash_bytes), 4):
            if len(embedding) >= 768:  # Standard embedding size
                break
            # Convert 4 bytes to float
            float_val = struct.unpack('f', hash_bytes[i:i+4])[0]
            # Normalize to [-1, 1]
            normalized = max(-1.0, min(1.0, float_val))
            embedding.append(normalized)
        
        # Pad to 768 dimensions if needed
        while len(embedding) < 768:
            embedding.append(0.0)
        
        return embedding[:768]
    
    def _combine_results(
        self,
        search_results: Dict[str, Any],
        routing_decision: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Combine results from different stores."""
        combined = []
        
        # Add KG results
        if "kg" in search_results:
            kg_results = search_results["kg"]
            for entity in kg_results.get("entities", []):
                combined.append({
                    "type": "entity",
                    "source": "kg",
                    "data": entity,
                    "relevance_score": entity.get("relevance_score", 0.0)
                })
            
            for relationship in kg_results.get("relationships", []):
                combined.append({
                    "type": "relationship",
                    "source": "kg",
                    "data": relationship,
                    "relevance_score": 0.9  # Default score for KG relationships
                })
        
        # Add BM25 results
        if "bm25" in search_results:
            for result in search_results["bm25"]:
                combined.append({
                    "type": "document",
                    "source": "bm25",
                    "data": result,
                    "relevance_score": result.get("score", 0.0)
                })
        
        # Add vector results
        if "vector" in search_results:
            for result in search_results["vector"]:
                # Convert distance to similarity score (lower distance = higher similarity)
                distance = result.get("score", 1.0)
                similarity_score = max(0.0, 1.0 - distance)
                
                combined.append({
                    "type": "document",
                    "source": "vector",
                    "data": result,
                    "relevance_score": similarity_score
                })
        
        # Sort by relevance score
        combined.sort(key=lambda x: x["relevance_score"], reverse=True)
        
        return combined
```

### Result Aggregator Implementation

```python
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class ResultAggregator:
    def __init__(self, clinical_roberta_service=None):
        """
        Initialize result aggregator.
        
        Args:
            clinical_roberta_service: Optional Clinical RoBERTa service for re-ranking
        """
        self.clinical_roberta = clinical_roberta_service
    
    async def aggregate_and_rerank(
        self,
        raw_results: List[Dict[str, Any]],
        original_query: str,
        user_context: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """
        Aggregate results from multiple sources and re-rank.
        
        Args:
            raw_results: Raw results from different sources
            original_query: Original user query
            user_context: Additional user context
            
        Returns:
            Re-ranked list of results
        """
        # Normalize scores across different sources
        normalized_results = self._normalize_scores(raw_results)
        
        # Apply re-ranking if Clinical RoBERTa is available
        if self.clinical_roberta:
            reranked_results = await self._rerank_results(
                normalized_results, original_query, user_context
            )
        else:
            reranked_results = normalized_results
        
        # Apply diversity and deduplication
        final_results = self._apply_diversity(reranked_results)
        
        return final_results
    
    def _normalize_scores(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalize scores from different sources to 0-1 range."""
        if not results:
            return []
        
        # Find min and max scores for each source type
        source_scores = {}
        for result in results:
            source = result.get("source", "unknown")
            score = result.get("relevance_score", 0.0)
            
            if source not in source_scores:
                source_scores[source] = {"min": score, "max": score}
            else:
                source_scores[source]["min"] = min(source_scores[source]["min"], score)
                source_scores[source]["max"] = max(source_scores[source]["max"], score)
        
        # Normalize scores
        normalized = []
        for result in results:
            source = result.get("source", "unknown")
            score = result.get("relevance_score", 0.0)
            
            # Get min/max for this source
            source_info = source_scores[source]
            score_range = source_info["max"] - source_info["min"]
            
            # Normalize to 0-1 range
            if score_range > 0:
                normalized_score = (score - source_info["min"]) / score_range
            else:
                normalized_score = 0.5  # Default if all scores are the same
            
            # Apply source weighting
            source_weights = {
                "kg": 1.2,      # Knowledge graph results weighted higher
                "bm25": 1.0,    # BM25 results
                "vector": 0.9   # Vector results slightly lower
            }
            weighted_score = normalized_score * source_weights.get(source, 1.0)
            
            normalized_result = result.copy()
            normalized_result["normalized_score"] = weighted_score
            normalized.append(normalized_result)
        
        return normalized
    
    async def _rerank_results(
        self,
        results: List[Dict[str, Any]],
        query: str,
        user_context: Optional[Dict] = None
    ) -> List[Dict[str, Any]]:
        """Re-rank results using Clinical RoBERTa."""
        if not self.clinical_roberta:
            return results
        
        try:
            # Prepare results for re-ranking
            rerank_input = []
            for result in results:
                content = self._extract_content_for_reranking(result)
                if content:
                    rerank_input.append({
                        "id": result.get("data", {}).get("id", ""),
                        "content": content,
                        "original_score": result.get("normalized_score", 0.0)
                    })
            
            if not rerank_input:
                return results
            
            # Use Clinical RoBERTa for re-ranking
            reranked = await self.clinical_roberta.rerank_results(
                query, rerank_input, user_context
            )
            
            # Update results with re-ranked scores
            reranked_dict = {item["id"]: item["relevance_score"] for item in reranked}
            reranked_results = []
            
            for result in results:
                result_id = result.get("data", {}).get("id", "")
                if result_id in reranked_dict:
                    result["reranked_score"] = reranked_dict[result_id]
                else:
                    # Keep original normalized score if not re-ranked
                    result["reranked_score"] = result.get("normalized_score", 0.0)
                reranked_results.append(result)
            
            # Sort by re-ranked score
            reranked_results.sort(key=lambda x: x["reranked_score"], reverse=True)
            return reranked_results
            
        except Exception as e:
            logger.error(f"Error in re-ranking: {e}")
            return results
    
    def _extract_content_for_reranking(self, result: Dict[str, Any]) -> str:
        """Extract content from result for re-ranking."""
        data = result.get("data", {})
        
        if result.get("type") == "entity":
            # For entities, use name and description
            properties = data.get("properties", {})
            name = properties.get("name", "")
            description = properties.get("description", "")
            return f"{name}: {description}"
        
        elif result.get("type") == "relationship":
            # For relationships, use relationship information
            rel_type = data.get("relationship", {}).get("type", "")
            source_name = data.get("source", {}).get("properties", {}).get("name", "")
            target_name = data.get("target", {}).get("properties", {}).get("name", "")
            return f"{source_name} {rel_type} {target_name}"
        
        elif result.get("type") == "document":
            # For documents, use content or metadata
            content = data.get("content", "")
            metadata = data.get("metadata", {})
            title = metadata.get("title", "")
            
            if title and content:
                return f"{title}\n{content[:500]}"  # Limit content length
            elif content:
                return content[:500]
            elif title:
                return title
            else:
                return ""
        
        return ""
    
    def _apply_diversity(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply diversity and deduplication to results."""
        if not results:
            return []
        
        # Deduplicate based on content similarity
        deduplicated = []
        seen_contents = set()
        
        for result in results:
            content = self._extract_content_for_deduplication(result)
            
            # Create content hash for comparison
            content_hash = hash(content.lower().strip()) % 10000
            
            # Check if we've seen similar content
            if content_hash not in seen_contents:
                seen_contents.add(content_hash)
                deduplicated.append(result)
        
        return deduplicated
    
    def _extract_content_for_deduplication(self, result: Dict[str, Any]) -> str:
        """Extract content for deduplication purposes."""
        return self._extract_content_for_reranking(result)
```

## Integration with Clinical Corvus

### API Endpoints

```python
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import asyncio

router = APIRouter()

class HybridSearchRequest(BaseModel):
    query: str
    user_context: Optional[Dict[str, Any]] = None
    max_results: Optional[int] = 10
    use_kg: Optional[bool] = True
    use_bm25: Optional[bool] = True
    use_vector: Optional[bool] = True

class HybridSearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    processing_time: float
    total_results: int
    routing_decision: Dict[str, Any]

@router.post("/api/graphrag/search", response_model=HybridSearchResponse)
async def hybrid_search(request: HybridSearchRequest):
    """Perform hybrid search across KG and search stores."""
    try:
        # Get retrieval orchestrator
        orchestrator = await get_retrieval_orchestrator()
        
        # Execute search
        search_results = await orchestrator.execute_search(
            request.query,
            request.user_context,
            request.max_results
        )
        
        # Get result aggregator
        aggregator = get_result_aggregator()
        
        # Aggregate and re-rank results
        final_results = await aggregator.aggregate_and_rerank(
            search_results["results"],
            request.query,
            request.user_context
        )
        
        return HybridSearchResponse(
            results=final_results[:request.max_results],
            processing_time=search_results["processing_time"],
            total_results=len(final_results),
            routing_decision=search_results["routing_decision"]
        )
        
    except Exception as e:
        logger.error(f"Hybrid search error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error performing hybrid search: {str(e)}"
        )

class KGQueryRequest(BaseModel):
    query_type: str  # entities, relationships, traversal
    query_params: Dict[str, Any]

@router.post("/api/graphrag/kg-query")
async def kg_query(request: KGQueryRequest):
    """Query the knowledge graph directly."""
    try:
        kg_interface = await get_kg_interface()
        
        if request.query_type == "entities":
            results = await kg_interface.search_entities(**request.query_params)
        elif request.query_type == "relationships":
            results = await kg_interface.find_relationships(**request.query_params)
        elif request.query_type == "traversal":
            results = await kg_interface.traverse_graph(**request.query_params)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown query type: {request.query_type}"
            )
        
        return {"results": results}
        
    except Exception as e:
        logger.error(f"KG query error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error querying knowledge graph: {str(e)}"
        )
```

### Service Initialization

```python
# Global service instances
kg_interface = None
bm25_store = None
vector_store = None
query_router = None
retrieval_orchestrator = None
result_aggregator = None

async def initialize_graphrag_services():
    """Initialize all GraphRAG services."""
    global kg_interface, bm25_store, vector_store, query_router
    global retrieval_orchestrator, result_aggregator
    
    try:
        # Initialize Knowledge Graph
        kg_interface = KnowledgeGraphInterface(
            uri="bolt://localhost:7687",
            username="neo4j",
            password="password"
        )
        await kg_interface.initialize()
        
        # Initialize BM25 Store
        bm25_store = BM25SearchStore(
            hosts=["http://localhost:9200"],
            index_name="clinical_documents"
        )
        await bm25_store.initialize()
        
        # Initialize Vector Store
        vector_store = VectorSearchStore(
            host="localhost",
            port=8000,
            collection_name="clinical_vectors"
        )
        await vector_store.initialize()
        
        # Initialize Query Router
        query_router = QueryRouter(kg_interface, bm25_store, vector_store)
        
        # Initialize Retrieval Orchestrator
        retrieval_orchestrator = RetrievalOrchestrator(
            kg_interface, bm25_store, vector_store, query_router
        )
        
        # Initialize Result Aggregator
        clinical_roberta = await get_clinical_roberta_service()
        result_aggregator = ResultAggregator(clinical_roberta)
        
        logger.info("All GraphRAG services initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize GraphRAG services: {e}")
        raise

async def get_retrieval_orchestrator():
    """Get retrieval orchestrator instance."""
    if retrieval_orchestrator is None:
        await initialize_graphrag_services()
    return retrieval_orchestrator

def get_result_aggregator():
    """Get result aggregator instance."""
    if result_aggregator is None:
        # This doesn't need to be async since it doesn't require initialization
        pass
    return result_aggregator

async def get_kg_interface():
    """Get knowledge graph interface instance."""
    if kg_interface is None:
        await initialize_graphrag_services()
    return kg_interface

async def shutdown_graphrag_services():
    """Shutdown all GraphRAG services."""
    global kg_interface, bm25_store, vector_store
    
    if kg_interface:
        await kg_interface.close()
    if bm25_store:
        await bm25_store.close()
    if vector_store:
        await vector_store.close()
    
    logger.info("GraphRAG services shutdown completed")
```

## Performance Optimization

### Caching Strategy

```python
from functools import lru_cache
import hashlib
import json

class GraphRAGCache:
    def __init__(self, max_size: int = 1000):
        self.query_cache = lru_cache(maxsize=max_size)(self._cached_query_results)
        self.entity_cache = lru_cache(maxsize=max_size * 5)(self._cached_entity_info)
    
    def _cached_query_results(self, query_hash: str) -> Optional[Dict[str, Any]]:
        """Cached query results."""
        # Implementation would retrieve from Redis or similar
        pass
    
    def _cached_entity_info(self, entity_id: str) -> Optional[Dict[str, Any]]:
        """Cached entity information."""
        # Implementation would retrieve from Redis or similar
        pass
    
    def get_cached_query_result(self, query: str, params: Dict) -> Optional[Dict[str, Any]]:
        """Get cached query result."""
        # Create cache key
        cache_key = hashlib.md5(
            f"{query}:{json.dumps(params, sort_keys=True)}".encode()
        ).hexdigest()
        
        return self.query_cache(cache_key)
    
    def cache_query_result(self, query: str, params: Dict, result: Dict[str, Any]):
        """Cache query result."""
        # Create cache key
        cache_key = hashlib.md5(
            f"{query}:{json.dumps(params, sort_keys=True)}".encode()
        ).hexdigest()
        
        # In practice, store in Redis with expiration
        pass
```

### Monitoring and Metrics

```python
import time
from typing import Dict, Any

class GraphRAGMetrics:
    def __init__(self):
        self.search_count = 0
        self.kg_search_count = 0
        self.bm25_search_count = 0
        self.vector_search_count = 0
        self.average_response_time = 0.0
        self.total_response_time = 0.0
    
    def record_search(
        self,
        response_time: float,
        stores_used: Dict[str, bool]
    ):
        """Record search metrics."""
        self.search_count += 1
        self.total_response_time += response_time
        self.average_response_time = self.total_response_time / self.search_count
        
        if stores_used.get("kg"):
            self.kg_search_count += 1
        if stores_used.get("bm25"):
            self.bm25_search_count += 1
        if stores_used.get("vector"):
            self.vector_search_count += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics."""
        return {
            "total_searches": self.search_count,
            "kg_searches": self.kg_search_count,
            "bm25_searches": self.bm25_search_count,
            "vector_searches": self.vector_search_count,
            "average_response_time": self.average_response_time
        }

# Global metrics instance
metrics = GraphRAGMetrics()

# Decorator for monitoring
def monitor_search(func):
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            response_time = time.time() - start_time
            
            # Record metrics
            if hasattr(args[0], 'routing_decision'):
                metrics.record_search(
                    response_time,
                    args[0].routing_decision
                )
            
            return result
        except Exception as e:
            response_time = time.time() - start_time
            # Record failed search
            metrics.record_search(response_time, {})
            raise
    return wrapper
```

## Testing Strategy

### Unit Tests

```python
import pytest
from unittest.mock import Mock, AsyncMock

class TestKnowledgeGraphInterface:
    @pytest.fixture
    def mock_driver(self):
        driver = AsyncMock()
        session = AsyncMock()
        driver.session.return_value = session
        session.__aenter__.return_value = session
        return driver
    
    @pytest.mark.asyncio
    async def test_search_entities(self, mock_driver):
        """Test entity search functionality."""
        # Setup mock results
        mock_record = Mock()
        mock_record.__getitem__ = Mock(return_value=Mock())
        mock_driver.session.return_value.__aenter__.return_value.run.return_value.__aiter__ = Mock()
        
        # Create KG interface with mock driver
        kg = KnowledgeGraphInterface("bolt://localhost:7687", "neo4j", "password")
        kg.driver = mock_driver
        
        # Test search
        results = await kg.search_entities("diabetes", limit=5)
        
        # Verify results
        assert isinstance(results, list)
        mock_driver.session.return_value.__aenter__.return_value.run.assert_called()

class TestQueryRouter:
    @pytest.mark.asyncio
    async def test_route_factual_query(self):
        """Test routing of factual queries."""
        # Create mock services
        mock_kg = AsyncMock()
        mock_bm25 = AsyncMock()
        mock_vector = AsyncMock()
        
        # Setup mock KG to find entities
        mock_kg.search_entities.return_value = [{"id": "1", "name": "diabetes"}]
        
        router = QueryRouter(mock_kg, mock_bm25, mock_vector)
        
        # Test routing
        routing = await router.route_query("What is diabetes?")
        
        # Verify routing decision
        assert routing["use_kg"] == True
        assert routing["intent"] == "factual"

class TestRetrievalOrchestrator:
    @pytest.mark.asyncio
    async def test_execute_search(self):
        """Test search execution."""
        # Create mock services
        mock_kg = AsyncMock()
        mock_bm25 = AsyncMock()
        mock_vector = AsyncMock()
        mock_router = AsyncMock()
        
        # Setup mock router
        mock_router.route_query.return_value = {
            "use_kg": True,
            "use_bm25": True,
            "use_vector": False
        }
        
        # Setup mock search results
        mock_kg.search_entities.return_value = [{"id": "1", "name": "entity1"}]
        mock_kg.find_relationships.return_value = []
        mock_bm25.search.return_value = [{"id": "doc1", "content": "content"}]
        
        orchestrator = RetrievalOrchestrator(mock_kg, mock_bm25, mock_vector, mock_router)
        
        # Test search execution
        results = await orchestrator.execute_search("test query")
        
        # Verify results structure
        assert "results" in results
        assert "routing_decision" in results
        assert "processing_time" in results
```

## Deployment Considerations

### Docker Configuration

```dockerfile
# Dockerfile for GraphRAG services
FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Command to run the service
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Configuration

```python
# config.py
import os

class GraphRAGConfig:
    # Neo4j Configuration
    NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USERNAME = os.getenv("NEO4J_USERNAME", "neo4j")
    NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "password")
    
    # Elasticsearch Configuration
    ELASTICSEARCH_HOSTS = os.getenv(
        "ELASTICSEARCH_HOSTS", 
        "http://localhost:9200"
    ).split(",")
    
    # ChromaDB Configuration
    CHROMADB_HOST = os.getenv("CHROMADB_HOST", "localhost")
    CHROMADB_PORT = int(os.getenv("CHROMADB_PORT", "8000"))
    
    # Service Configuration
    MAX_CONCURRENT_SEARCHES = int(os.getenv("MAX_CONCURRENT_SEARCHES", "10"))
    CACHE_SIZE = int(os.getenv("CACHE_SIZE", "1000"))
    
    # Logging Configuration
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
```

## Future Extensions

### Planned Enhancements

1. **Advanced Query Language** - Support for complex Cypher-like queries
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