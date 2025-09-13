# Curation Workflow for Knowledge Graph (KG) vs BM25/Vector Storage Design - Overview  

## Overview

This document outlines the design for a knowledge curation workflow in Clinical Corvus, determining whether ingested information should populate the Neo4j Knowledge Graph (KG) or be stored in the BM25/Vector search indices. The goal is to maintain the KG as a source of high-quality, curated knowledge while leveraging search indices for broader, less structured information.

## Design Principles

### Core Principles

1.  **Quality Assurance**: Prioritize the accuracy, reliability, and validity of knowledge added to the KG.
2.  **Efficiency**: Automate as much of the curation process as possible, with human intervention for critical decisions.
3.  **Transparency**: Provide clear explanations for contradiction flags and evidence scores.
4.  **Adaptability**: Allow for flexible criteria and rules that can evolve with new knowledge sources and domain understanding.
5.  **Traceability**: Ensure that the origin and processing history of all knowledge are trackable.

### Modeling Approach

1.  **Rule-Based Decisioning**: Utilize predefined rules and thresholds for automated curation decisions.
2.  **Confidence-Driven**: Leverage evidence scores and confidence levels from the preprocessing pipeline.
3.  **Human-in-the-Loop (HITL)**: Implement a human review queue for uncertain or high-impact curation decisions.
4.  **Feedback Loop**: Use human curation decisions to refine automated models.

# Curation Workflow for Knowledge Graph (KG) vs BM25/Vector Storage Design - Architecture

## Curation Workflow Architecture

### Components

1.  **Curation Orchestrator**: Manages the overall curation process, including decision-making and routing.
2.  **Quality Assessor**: Evaluates the quality and trustworthiness of incoming knowledge (reusing components from the validation layer of the KG population pipeline).
3.  **KG Matcher**: Checks for existing entities/relationships in the KG to identify potential duplicates or contradictions.
4.  **Human Review Queue**: A system for presenting uncertain curation decisions to human curators.
5.  **KG Ingester**: Loads curated knowledge into the Neo4j KG.
6.  **Search Indexer**: Indexes non-curated knowledge into BM25/Vector stores.
7.  **Audit Logger**: Records all curation decisions and metadata.

### Data Flow

```mermaid
graph TD
    A[Incoming Document (Processed)] --> B{Curation Orchestrator};
    B -- Document Metadata & Extracted K. --> C[Quality Assessor];
    C -- Quality Score & Validation Issues --> D{KG Matcher};
    D -- Potential Duplicates/Conflicts --> B;
    B -- Decision: KG --> E[KG Ingester];
    B -- Decision: Search Index --> F[Search Indexer];
    B -- Decision: Human Review --> G[Human Review Queue];
    G -- Curator Decision --> B;
    E -- Populated KG --> H[Audit Logger];
    F -- Indexed Search Stores --> H;
    H -- Audit Log Entry --> I[Monitoring & Reporting];

    style A fill:#f9f,stroke:#333,stroke-width:2px;
    style B fill:#bbf,stroke:#333,stroke-width:2px;
    style C fill:#ccf,stroke:#333,stroke-width:2px;
    style D fill:#fcf,stroke:#333,stroke-width:2px;
    style E fill:#ada,stroke:#333,stroke-width:2px;
    style F fill:#afd,stroke:#333,stroke-width:2px;
    style G fill:#fdd,stroke:#333,stroke-width:2px;
    style H fill:#eee,stroke:#333,stroke-width:2px;
    style I fill:#f5f5f5,stroke:#333,stroke-width:2px;
```

# Curation Workflow for Knowledge Graph (KG) vs BM25/Vector Storage Design - Curation Rules and Decision Logic

## Curation Rules and Decision Logic

### Decision Criteria

The Curation Orchestrator will make decisions based on a set of weighted criteria:

1.  **Source Credibility Score**: Primary factor. Information from highly credible sources (e.g., Tier 1: systematic reviews, RCTs from top journals; Tier 2: cohort studies, case-control; Tier 3: expert opinion, case reports) is favored for KG.
2.  **Evidence Level**: Higher evidence levels (e.g., RCTs) are preferred for KG population.
3.  **Confidence Score**: High confidence scores from the entity/relationship extraction process.
4.  **Novelty**: Is the information new, or does it confirm existing knowledge?
5.  **Conflict Status**: Does the new information contradict existing KG knowledge? (Leverages Contradiction Handling Mechanism).
6.  **Completeness**: Is the extracted knowledge sufficiently complete and structured for KG representation?

### Decision Tiers

1.  **Automated KG Population (High Confidence)**:
    -   Criteria: High source credibility (e.g., Tier 1), high evidence level (e.g., Level I/II), high extraction confidence (>0.9), no direct contradiction with existing KG knowledge.
    -   Action: Directly ingest into KG.
2.  **Automated Search Indexing (Low Confidence / Exploratory)**:
    -   Criteria: Low source credibility (e.g., blogs, forums, preliminary studies), low evidence level, low extraction confidence (<0.6), or unstructured/incomplete data.
    -   Action: Index into BM25/Vector stores for broader search.
3.  **Human Review Queue (Uncertain / High Impact)**:
    -   Criteria:
        -   Moderate source credibility/evidence level.
        -   Moderate extraction confidence (0.6-0.9).
        -   Direct contradiction with existing KG knowledge (requires manual resolution).
        -   Information flagged as highly significant or sensitive.
        -   Novel information that fundamentally changes existing KG knowledge.
    -   Action: Route to human review queue.

# Curation Workflow - Curation Orchestrator Implementation Details

## Curation Orchestrator
```python
import asyncio
from typing import Dict, Any, List, Optional
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class CurationOrchestrator:
    def __init__(
        self,
        quality_assessor, # Instance of QualityValidator
        kg_matcher,       # Instance of KGMatcher
        kg_ingester,      # Instance of Neo4jLoader
        search_indexer,   # Instance for BM25/Vector indexing
        audit_logger,     # Instance of AuditLogger
        human_review_queue # Instance for managing review queue
    ):
        self.quality_assessor = quality_assessor
        self.kg_matcher = kg_matcher
        self.kg_ingester = kg_ingester
        self.search_indexer = search_indexer
        self.audit_logger = audit_logger
        self.human_review_queue = human_review_queue
        self.curation_rules = self._load_curation_rules()

    def _load_curation_rules(self) -> Dict[str, Any]:
        # Rules can be loaded from a config file or database
        return {
            "thresholds": {
                "auto_kg_confidence": 0.9,
                "auto_kg_evidence_level_min_score": 0.9, # Example: Level I/II
                "auto_search_index_confidence": 0.6, # Added for clarity
                "human_review_confidence_min": 0.6,
                "human_review_confidence_max": 0.9,
            },
            "source_credibility_weights": {
                "peer_reviewed_journal": 1.0,
                "clinical_guideline": 1.1,
                "medical_textbook": 0.9,
                "preprint_server": 0.5,
                "medical_blog": 0.3,
                "unknown": 0.1 # Default for unknown sources
            },
            "evidence_level_mapping": {
                "I": 1.0, "II": 0.9, "III": 0.7, "IV": 0.5, "V": 0.3, "UNKNOWN": 0.0
            }
        }

    async def curate_knowledge(
        self,
        document: Dict[str, Any], # Processed document with entities, relationships, metadata
        raw_source_data: Dict[str, Any] # Original source info for credibility assessment
    ) -> Dict[str, Any]:
        """
        Curate extracted knowledge, deciding whether to ingest into KG, search index, or human review.
        """
        doc_id = document.get("document_id", str(uuid.uuid4()))
        curation_decision = "unknown"
        curation_reason = "initial_assessment"
        
        try:
            # 1. Assess Quality and Validate
            validated_entities, validated_relationships, validation_metrics = \
                await self.quality_assessor.validate_knowledge(
                    document.get("entities", []), 
                    document.get("relationships", []), 
                    document
                )
            
            document["validation_metrics"] = validation_metrics
            document["validated_entities"] = validated_entities
            document["validated_relationships"] = validated_relationships

            overall_quality_score = validation_metrics.get("quality_score", 0.0)
            avg_entity_confidence = sum(e.get("confidence", 0) for e in validated_entities) / max(len(validated_entities), 1)
            avg_relationship_confidence = sum(r.get("confidence", 0) for r in validated_relationships) / max(len(validated_relationships), 1)
            
            # 2. Check for Conflicts/Duplicates in KG
            # This step would interact with the Contradiction Handling Mechanism
            conflicts = await self.kg_matcher.check_for_conflicts(
                validated_entities, validated_relationships, document
            )

            if conflicts:
                curation_decision = "human_review"
                curation_reason = "conflict_detected"
                logger.warning(f"Conflict detected for document {doc_id}. Routing to human review.")
            
            else:
                # 3. Apply Automated Curation Rules
                # Calculate aggregated confidence and evidence level
                aggregated_confidence = (avg_entity_confidence + avg_relationship_confidence) / 2
                document_evidence_level_score = self.curation_rules["evidence_level_mapping"].get(
                    document.get("metadata", {}).get("evidence_level", "UNKNOWN"), 0.0
                )

                if (aggregated_confidence >= self.curation_rules["thresholds"]["auto_kg_confidence"] and
                    document_evidence_level_score >= self.curation_rules["thresholds"]["auto_kg_evidence_level_min_score"]):
                    
                    curation_decision = "auto_kg"
                    curation_reason = "high_quality_auto_ingest"
                    logger.info(f"Document {doc_id} meets auto-KG criteria. Auto-ingesting.")

                elif (overall_quality_score < self.curation_rules["thresholds"]["auto_search_index_confidence"] or
                      aggregated_confidence < self.curation_rules["thresholds"]["auto_search_index_confidence"]):
                    curation_decision = "auto_search_index"
                    curation_reason = "low_quality_auto_index"
                    logger.info(f"Document {doc_id} meets auto-search index criteria. Auto-indexing.")

                else:
                    curation_decision = "human_review"
                    curation_reason = "moderate_quality_manual_review"
                    logger.info(f"Document {doc_id} is of moderate quality. Routing to human review.")
            
            # 4. Execute Decision
            if curation_decision == "auto_kg":
                load_entities_result = await self.kg_ingester.load_entities(validated_entities)
                load_relationships_result = await self.kg_ingester.load_relationships(validated_relationships) 
                await self.audit_logger.log_curation_event(
                    doc_id, 
                    "KG_INGESTED", 
                    curation_reason, 
                    {"entities_loaded": load_entities_result, "relationships_loaded": load_relationships_result}
                )
            elif curation_decision == "auto_search_index":
                index_results = await self.search_indexer.index_document(document)
                await self.audit_logger.log_curation_event(doc_id, "SEARCH_INDEXED", curation_reason, {"index_results": index_results})
            elif curation_decision == "human_review":
                review_item_id = await self.human_review_queue.add_to_queue(document, curation_reason, conflicts)
                await self.audit_logger.log_curation_event(doc_id, "HUMAN_REVIEW_PENDING", curation_reason, {"review_item_id": review_item_id})

        except Exception as e:
            curation_decision = "failed"
            curation_reason = f"pipeline_error: {str(e)}"
            logger.error(f"Curation pipeline failed for document {doc_id}: {e}", exc_info=True)
            await self.audit_logger.log_curation_event(doc_id, "FAILED", curation_reason)

        return {
            "document_id": doc_id,
            "curation_decision": curation_decision,
            "curation_reason": curation_reason,
            "quality_score": overall_quality_score,
            "conflicts_detected": bool(conflicts)
        }

    def _get_source_credibility(self, source_name: str) -> float:
        # Placeholder for actual source credibility lookup (could be a separate service)
        source_name_lower = source_name.lower().replace(" ", "_")
        return self.curation_rules["source_credibility_weights"].get(source_name_lower, 0.1)
```

# Curation Workflow - Curation Orchestrator Implementation Details

## Curation Orchestrator

```python
import asyncio
from typing import Dict, Any, List, Optional
import logging
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class CurationOrchestrator:
    def __init__(
        self,
        quality_assessor, # Instance of QualityValidator
        kg_matcher,       # Instance of KGMatcher
        kg_ingester,      # Instance of Neo4jLoader
        search_indexer,   # Instance for BM25/Vector indexing
        audit_logger,     # Instance of AuditLogger
        human_review_queue # Instance for managing review queue
    ):
        self.quality_assessor = quality_assessor
        self.kg_matcher = kg_matcher
        self.kg_ingester = kg_ingester
        self.search_indexer = search_indexer
        self.audit_logger = audit_logger
        self.human_review_queue = human_review_queue
        self.curation_rules = self._load_curation_rules()

    def _load_curation_rules(self) -> Dict[str, Any]:
        # Rules can be loaded from a config file or database
        return {
            "thresholds": {
                "auto_kg_confidence": 0.9,
                "auto_kg_evidence_level_min_score": 0.9, # Example: Level I/II
                "auto_search_index_confidence": 0.6, # Added for clarity
                "human_review_confidence_min": 0.6,
                "human_review_confidence_max": 0.9,
            },
            "source_credibility_weights": {
                "peer_reviewed_journal": 1.0,
                "clinical_guideline": 1.1,
                "medical_textbook": 0.9,
                "preprint_server": 0.5,
                "medical_blog": 0.3,
                "unknown": 0.1 # Default for unknown sources
            },
            "evidence_level_mapping": {
                "I": 1.0, "II": 0.9, "III": 0.7, "IV": 0.5, "V": 0.3, "UNKNOWN": 0.0
            }
        }

    async def curate_knowledge(
        self,
        document: Dict[str, Any], # Processed document with entities, relationships, metadata
        raw_source_data: Dict[str, Any] # Original source info for credibility assessment
    ) -> Dict[str, Any]:
        """
        Curate extracted knowledge, deciding whether to ingest into KG, search index, or human review.
        """
        doc_id = document.get("document_id", str(uuid.uuid4()))
        curation_decision = "unknown"
        curation_reason = "initial_assessment"
        
        try:
            # 1. Assess Quality and Validate
            validated_entities, validated_relationships, validation_metrics = \
                await self.quality_assessor.validate_knowledge(
                    document.get("entities", []), 
                    document.get("relationships", []), 
                    document
                )
            
            document["validation_metrics"] = validation_metrics
            document["validated_entities"] = validated_entities
            document["validated_relationships"] = validated_relationships

            overall_quality_score = validation_metrics.get("quality_score", 0.0)
            avg_entity_confidence = sum(e.get("confidence", 0) for e in validated_entities) / max(len(validated_entities), 1)
            avg_relationship_confidence = sum(r.get("confidence", 0) for r in validated_relationships) / max(len(validated_relationships), 1)
            
            # 2. Check for Conflicts/Duplicates in KG
            # This step would interact with the Contradiction Handling Mechanism
            conflicts = await self.kg_matcher.check_for_conflicts(
                validated_entities, validated_relationships, document
            )

            if conflicts:
                curation_decision = "human_review"
                curation_reason = "conflict_detected"
                logger.warning(f"Conflict detected for document {doc_id}. Routing to human review.")
            
            else:
                # 3. Apply Automated Curation Rules
                # Calculate aggregated confidence and evidence level
                aggregated_confidence = (avg_entity_confidence + avg_relationship_confidence) / 2
                document_evidence_level_score = self.curation_rules["evidence_level_mapping"].get(
                    document.get("metadata", {}).get("evidence_level", "UNKNOWN"), 0.0
                )

                if (aggregated_confidence >= self.curation_rules["thresholds"]["auto_kg_confidence"] and
                    document_evidence_level_score >= self.curation_rules["thresholds"]["auto_kg_evidence_level_min_score"]):
                    
                    curation_decision = "auto_kg"
                    curation_reason = "high_quality_auto_ingest"
                    logger.info(f"Document {doc_id} meets auto-KG criteria. Auto-ingesting.")

                elif (overall_quality_score < self.curation_rules["thresholds"]["auto_search_index_confidence"] or
                      aggregated_confidence < self.curation_rules["thresholds"]["auto_search_index_confidence"]):
                    curation_decision = "auto_search_index"
                    curation_reason = "low_quality_auto_index"
                    logger.info(f"Document {doc_id} meets auto-search index criteria. Auto-indexing.")

                else:
                    curation_decision = "human_review"
                    curation_reason = "moderate_quality_manual_review"
                    logger.info(f"Document {doc_id} is of moderate quality. Routing to human review.")
            
            # 4. Execute Decision
            if curation_decision == "auto_kg":
                load_entities_result = await self.kg_ingester.load_entities(validated_entities)
                load_relationships_result = await self.kg_ingester.load_relationships(validated_relationships) 
                await self.audit_logger.log_curation_event(
                    doc_id, 
                    "KG_INGESTED", 
                    curation_reason, 
                    {"entities_loaded": load_entities_result, "relationships_loaded": load_relationships_result}
                )
            elif curation_decision == "auto_search_index":
                index_results = await self.search_indexer.index_document(document)
                await self.audit_logger.log_curation_event(doc_id, "SEARCH_INDEXED", curation_reason, {"index_results": index_results})
            elif curation_decision == "human_review":
                review_item_id = await self.human_review_queue.add_to_queue(document, curation_reason, conflicts)
                await self.audit_logger.log_curation_event(doc_id, "HUMAN_REVIEW_PENDING", curation_reason, {"review_item_id": review_item_id})

        except Exception as e:
            curation_decision = "failed"
            curation_reason = f"pipeline_error: {str(e)}"
            logger.error(f"Curation pipeline failed for document {doc_id}: {e}", exc_info=True)
            await self.audit_logger.log_curation_event(doc_id, "FAILED", curation_reason)

        return {
            "document_id": doc_id,
            "curation_decision": curation_decision,
            "curation_reason": curation_reason,
            "quality_score": overall_quality_score,
            "conflicts_detected": bool(conflicts)
        }

    def _get_source_credibility(self, source_name: str) -> float:
        # Placeholder for actual source credibility lookup (could be a separate service)
        source_name_lower = source_name.lower().replace(" ", "_")
        return self.curation_rules["source_credibility_weights"].get(source_name_lower, 0.1)
```

# Curation Workflow - Human Review Queue Implementation Details

## Human Review Queue

### Purpose

Provide a mechanism for human curators to review and make decisions on ambiguous or high-impact curation cases.

### Functionality

1.  **Queue Management**: Maintain a prioritized queue of documents requiring human review.
2.  **Review Interface**: A web-based interface (or integration with an existing one) for curators to:
    -   View the original document.
    -   See extracted entities, relationships, and their confidence scores.
    -   View detected conflicts and their details.
    -   Access quality assessment metrics.
    -   Propose edits to extracted knowledge.
    -   Make a final curation decision (KG, Search Index, Reject, Reconcile).
    -   Provide justification for their decision.
3.  **Feedback Loop**: Curators' decisions and edits feed back into the system to improve automated models.

### Implementation

```python
from typing import Dict, Any, List, Optional
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class HumanReviewQueue:
    def __init__(self, db_client): # Placeholder for a database client to store review items
        self.db_client = db_client
        self.queue_name = "curation_review_queue"

    async def add_to_queue(
        self,
        document: Dict[str, Any],
        reason: str,
        conflicts: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Add a document to the human review queue.
        Returns the ID of the new review item.
        """
        review_item = {
            "item_id": str(uuid.uuid4()),
            "document_id": document.get("document_id"),
            "filename": document.get("filename"),
            "reason": reason,
            "conflicts": conflicts,
            "extracted_knowledge": {
                "entities": document.get("entities", []),
                "relationships": document.get("relationships", [])
            },
            "document_metadata": document.get("metadata", {}),
            "status": "pending",
            "assigned_to": None,
            "created_at": datetime.now().isoformat(),
            "last_updated_at": datetime.now().isoformat()
        }
        
        # Store in a database (e.g., PostgreSQL, MongoDB)
        await self.db_client.insert_one(self.queue_name, review_item)
        logger.info(f"Document {review_item['document_id']} added to human review queue (ID: {review_item['item_id']})")
        return review_item["item_id"]

    async def get_pending_items(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve pending review items from the queue."""
        # Fetch from database
        items = await self.db_client.find(self.queue_name, {"status": "pending"}, limit=limit)
        return items

    async def submit_review_decision(
        self,
        item_id: str,
        decision: str, # "kg", "search_index", "reject", "reconcile"
        curator_id: str,
        justification: str,
        edited_knowledge: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Submit a human curator's decision for a review item.
        """
        update_data = {
            "status": "reviewed",
            "decision": decision,
            "curator_id": curator_id,
            "justification": justification,
            "edited_knowledge": edited_knowledge,
            "last_updated_at": datetime.now().isoformat()
        }
        
        # Update item in database
        success = await self.db_client.update_one(self.queue_name, {"item_id": item_id}, {"$set": update_data})
        logger.info(f"Review item {item_id} decided by {curator_id}: {decision}")
        return success

    # Placeholder for a simple DB client for demonstration
class MockDBClient:
    def __init__(self):
        self.collections = {} # {collection_name: [items]}

    async def insert_one(self, collection_name: str, item: Dict[str, Any]):
        if collection_name not in self.collections:
            self.collections[collection_name] = []
        self.collections[collection_name].append(item)
        return True

    async def find(self, collection_name: str, query: Dict[str, Any], limit: int = 10) -> List[Dict[str, Any]]:
        if collection_name not in self.collections:
            return []
        results = [item for item in self.collections[collection_name] if all(item.get(k) == v for k, v in query.items())]
        return results[:limit]

    async def update_one(self, collection_name: str, query: Dict[str, Any], update: Dict[str, Any]) -> bool:
        if collection_name not in self.collections:
            return False
        for item in self.collections[collection_name]:
            if all(item.get(k) == v for k, v in query.items()):
                # Apply update (simplified)
                for op, fields in update.items():
                    if op == "$set":
                        item.update(fields)
                return True
        return False
```

# Curation Workflow - Search Indexer Implementation Details

## Search Indexer

### Purpose

Index extracted documents and their entities/relationships into BM25 and Vector search stores for efficient retrieval of less structured or lower-confidence knowledge.

### Functionality

1.  **Document Indexing**: Store the full text and metadata of documents.
2.  **Chunking and Embedding**: Break down documents into smaller chunks and generate embeddings for vector search.
3.  **Entity/Relationship Indexing**: Optionally index extracted entities and relationships within the search stores for faceted search.

### Implementation

```python
import asyncio
from typing import Dict, Any, List, Optional
import logging
import uuid

logger = logging.getLogger(__name__)

class SearchIndexer:
    def __init__(self, bm25_store, vector_store, embedding_generator):
        self.bm25_store = bm25_store       # Instance of BM25SearchStore
        self.vector_store = vector_store   # Instance of VectorSearchStore
        self.embedding_generator = embedding_generator # Instance of EmbeddingGenerator

    async def index_document(
        self,
        document: Dict[str, Any], # Processed document with entities, relationships, metadata
    ) -> Dict[str, Any]:
        """
        Index a processed document into BM25 and Vector search stores.
        """
        doc_id = document.get("document_id", str(uuid.uuid4()))
        content = document.get("content", "")
        metadata = document.get("metadata", {})
        entities = document.get("entities", [])
        relationships = document.get("relationships", [])

        index_results = {
            "bm25_indexed": False,
            "vector_indexed": False,
            "bm25_error": None,
            "vector_error": None,
        }

        # 1. Index in BM25 store
        try:
            await self.bm25_store.index_document(doc_id, content, metadata)
            index_results["bm25_indexed"] = True
            logger.info(f"Document {doc_id} indexed in BM25 store.")
        except Exception as e:
            index_results["bm25_error"] = str(e)
            logger.error(f"Error indexing document {doc_id} in BM25: {e}")

        # 2. Index in Vector store
        try:
            # Generate embeddings for document content (and optionally entities/relationships)
            text_to_embed = content
            if entities:
                text_to_embed += " " + " ".join([e.get("text", "") for e in entities])
            
            embeddings = await self.embedding_generator.generate_embeddings([text_to_embed])
            
            if embeddings:
                # For simplicity, using the entire document content as the document for vector store
                # In practice, you might chunk the document further
                await self.vector_store.add_documents(
                    document_ids=[doc_id],
                    contents=[content],
                    embeddings=embeddings,
                    metadatas=[metadata]
                )
                index_results["vector_indexed"] = True
                logger.info(f"Document {doc_id} indexed in Vector store.")
            else:
                index_results["vector_error"] = "Failed to generate embeddings."
                logger.warning(f"Failed to generate embeddings for document {doc_id}.")
        except Exception as e:
            index_results["vector_error"] = str(e)
            logger.error(f"Error indexing document {doc_id} in Vector store: {e}")
        
        return index_results
```

# Curation Workflow - Audit Logger Implementation Details

## Audit Logger

### Purpose

Provide a centralized logging mechanism for all curation decisions and related events, ensuring traceability and transparency.

### Functionality

1.  **Event Logging**: Record every curation decision (KG ingestion, search indexing, human review, rejection).
2.  **Metadata Capture**: Store relevant metadata with each event (document ID, timestamp, curator ID, reason, quality scores, conflicts).
3.  **Searchable Logs**: Enable easy searching and analysis of audit logs for compliance and debugging.

### Implementation

```python
import logging
from datetime import datetime
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class AuditLogger:
    def __init__(self, log_storage_client=None): # Placeholder for a storage client (e.g., for database or file)
        self.log_storage_client = log_storage_client
        self.log_stream_name = "curation_audit_log" # For stream-based logging

    async def log_curation_event(
        self,
        document_id: str,
        event_type: str, # "KG_INGESTED", "SEARCH_INDEXED", "HUMAN_REVIEW_PENDING", "REJECTED", "FAILED"
        reason: str,
        details: Optional[Dict[str, Any]] = None,
        curator_id: Optional[str] = None
    ):
        """
        Log a curation event.
        """
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "document_id": document_id,
            "event_type": event_type,
            "reason": reason,
            "curator_id": curator_id,
            "details": details or {}
        }
        
        # Log to console
        logger.info(f"AUDIT: {event_type} for Doc ID {document_id} - Reason: {reason}")

        # Optionally store in a persistent storage
        if self.log_storage_client:
            try:
                await self.log_storage_client.insert_one(self.log_stream_name, log_entry)
            except Exception as e:
                logger.error(f"Failed to store audit log entry: {e}")
```

# Curation Workflow - Implementation Roadmap, Testing, and Future Enhancements

## Implementation Roadmap

### Phase 1: Core Curation Logic
- [ ] Implement `CurationOrchestrator` with basic decision tiers.
- [ ] Integrate `QualityValidator` to provide quality metrics.
- [ ] Implement `KGMatcher` for duplicate and basic conflict detection.
- [ ] Implement `SearchIndexer` to index documents into BM25/Vector stores.
- [ ] Implement `AuditLogger` for tracking curation events.

### Phase 2: Human-in-the-Loop Integration
- [ ] Develop `HumanReviewQueue` for managing review items.
- [ ] Integrate human review decisions back into the `CurationOrchestrator`.
- [ ] Enhance `KGMatcher` to use the `Contradiction Handling Mechanism` for conflict detection.
- [ ] Implement feedback loop to refine automated curation rules based on human decisions.

### Phase 3: Advanced Features and Optimization
- [ ] Refine decision criteria and weights in `CurationOrchestrator` for more nuanced decisions.
- [ ] Implement batch processing for `SearchIndexer` and `KG Ingester`.
- [ ] Integrate with monitoring and alerting systems for curation performance.
- [ ] Implement versioning for curation rules.

## Testing Strategy

### Unit Testing
- Test `CurationOrchestrator` with various inputs to verify correct decision routing.
- Test `KGMatcher` for accurate duplicate and conflict detection scenarios.
- Test `SearchIndexer` for successful indexing into both BM25 and Vector stores.
- Test `HumanReviewQueue` for proper item management and decision updates.
- Test `AuditLogger` for correct event logging and metadata capture.

### Integration Testing
- End-to-end testing of the curation pipeline: from document ingestion to final storage (KG or search index) based on different quality and conflict scenarios.
- Verify that human review decisions are correctly applied and reflected in the KG/search indices.
- Test the interaction between the `Curation Workflow` and the `Contradiction Handling Mechanism`.

### Performance Testing
- Measure the latency of curation decisions under various load conditions.
- Benchmark indexing rates for both KG and search stores.
- Assess the impact of human review queue size on overall processing throughput.

## Future Enhancements

-   **Automated Rule Learning**: Use machine learning to automatically discover and update curation rules.
-   **Explainable Curation Decisions**: Provide clear explanations for why a document was routed to KG, search index, or human review.
-   **Predictive Curation**: Predict the likelihood of a document requiring human review to optimize resource allocation.
-   **Real-time Stream Processing**: Integrate with streaming platforms (e.g., Kafka) for real-time ingestion and curation.

# Curation Workflow - Implementation Roadmap, Testing, and Future Enhancements

## Implementation Roadmap

### Phase 1: Core Curation Logic
- [ ] Implement `CurationOrchestrator` with basic decision tiers.
- [ ] Integrate `QualityValidator` to provide quality metrics.
- [ ] Implement `KGMatcher` for duplicate and basic conflict detection.
- [ ] Implement `SearchIndexer` to index documents into BM25/Vector stores.
- [ ] Implement `AuditLogger` for tracking curation events.

### Phase 2: Human-in-the-Loop Integration
- [ ] Develop `HumanReviewQueue` for managing review items.
- [ ] Integrate human review decisions back into the `CurationOrchestrator`.
- [ ] Enhance `KGMatcher` to use the `Contradiction Handling Mechanism` for conflict detection.
- [ ] Implement feedback loop to refine automated curation rules based on human decisions.

### Phase 3: Advanced Features and Optimization
- [ ] Refine decision criteria and weights in `CurationOrchestrator` for more nuanced decisions.
- [ ] Implement batch processing for `SearchIndexer` and `KG Ingester`.
- [ ] Integrate with monitoring and alerting systems for curation performance.
- [ ] Implement versioning for curation rules.

## Testing Strategy

### Unit Testing
- Test `CurationOrchestrator` with various inputs to verify correct decision routing.
- Test `KGMatcher` for accurate duplicate and conflict detection scenarios.
- Test `SearchIndexer` for successful indexing into both BM25 and Vector stores.
- Test `HumanReviewQueue` for proper item management and decision updates.
- Test `AuditLogger` for correct event logging and metadata capture.

### Integration Testing
- End-to-end testing of the curation pipeline: from document ingestion to final storage (KG or search index) based on different quality and conflict scenarios.
- Verify that human review decisions are correctly applied and reflected in the KG/search indices.
- Test the interaction between the `Curation Workflow` and the `Contradiction Handling Mechanism`.

### Performance Testing
- Measure the latency of curation decisions under various load conditions.
- Benchmark indexing rates for both KG and search stores.
- Assess the impact of human review queue size on overall processing throughput.

## Future Enhancements

-   **Automated Rule Learning**: Use machine learning to automatically discover and update curation rules.
-   **Explainable Curation Decisions**: Provide clear explanations for why a document was routed to KG, search index, or human review.
-   **Predictive Curation**: Predict the likelihood of a document requiring human review to optimize resource allocation.
-   **Real-time Stream Processing**: Integrate with streaming platforms (e.g., Kafka) for real-time ingestion and curation.

# Monitoring and Evaluation Framework Design

## Overview

This document outlines the design for a comprehensive Monitoring and Evaluation (M&E) framework for the Clinical Corvus Knowledge Graph (KG) system and its integrated AI components. The framework aims to ensure the quality, performance, and reliability of the system, providing insights into data accuracy, model effectiveness, and overall system health.

## Design Principles

### Core Principles

1.  **Comprehensive Coverage**: Monitor all critical components from data ingestion to user interaction.
2.  **Real-time Insights**: Provide immediate feedback on system health and performance.
3.  **Actionable Alerts**: Generate timely and specific alerts for anomalies or issues.
4.  **Data-Driven Improvement**: Use collected metrics to identify areas for optimization and enhancement.
5.  **Transparency and Auditability**: Maintain detailed logs and audit trails for compliance and debugging.
6.  **Scalability**: Ensure the monitoring infrastructure can handle increasing data volumes and system complexity.
7.  **Customizability**: Allow for flexible configuration of metrics, dashboards, and alerts.

### Key Focus Areas

1.  **Data Quality Monitoring**: Track the quality and integrity of data within the KG and search indices.
2.  **Pipeline Performance Monitoring**: Measure the efficiency and throughput of data ingestion and processing pipelines.
3.  **AI Model Performance Monitoring**: Evaluate the accuracy and effectiveness of Clinical RoBERTa and Langroid agents.
4.  **System Health Monitoring**: Oversee the operational status and resource utilization of all services.
5.  **User Experience Monitoring**: Track user engagement and satisfaction with the system.
6.  **Security and Compliance Monitoring**: Ensure adherence to data privacy and security regulations.

## Framework Architecture

### Components

1.  **Metrics Collectors**: Agents or modules embedded within each component responsible for gathering raw metrics.
2.  **Log Aggregation**: Centralized system for collecting and storing logs from all services.
3.  **Monitoring Database/Time-Series Database**: Stores collected metrics for historical analysis (e.g., Prometheus, InfluxDB).
4.  **Alerting System**: Processes metrics and logs to detect anomalies and trigger alerts (e.g., Alertmanager, custom alerting service).
5.  **Dashboarding Tool**: Visualizes metrics and logs for operational oversight (e.g., Grafana, custom dashboard).
6.  **Reporting Module**: Generates periodic reports on system performance, quality, and compliance.
7.  **Audit Log Storage**: Secure, immutable storage for audit trails.
8.  **Feedback Loop Mechanism**: Channels for feeding M&E insights back into development and improvement processes.

### Data Flow

```mermaid
graph TD
    A[Data Sources] --> B[Ingestion Pipeline];
    B --> C[KG (Neo4j)];
    B --> D[BM25/Vector Stores];
    C -- Data Access --> E[KG Query/Retrieval];
    D -- Data Access --> E;
    E --> F[Langroid Agents];
    F --> G[User Interface];

    subgraph Monitoring Infrastructure
        H[Metrics Collectors] -- Metrics --> I[Monitoring DB];
        J[Log Aggregation] -- Logs --> K[Log Storage];
        I -- Query --> L[Dashboarding Tool];
        K -- Query --> L;
        I -- Alerts --> M[Alerting System];
        K -- Alerts --> M;
        M -- Notifications --> N[Operations/Dev Team];
        O[Reporting Module] --> N;
        P[Audit Log Storage] --> Q[Compliance/Audit Team];
    end

    G -- User Interaction Data --> H;
    F -- Agent Performance Data --> H;
    E -- Query Performance Data --> H;
    B -- Pipeline Metrics --> H;
    C -- DB Metrics --> H;
    D -- Store Metrics --> H;

    style A fill:#f9f,stroke:#333,stroke-width:2px;
    style B fill:#bbf,stroke:#333,stroke-width:2px;
    style C fill:#ccf,stroke:#333,stroke-width:2px;
    style D fill:#ccf,stroke:#333,stroke-width:2px;
    style E fill:#fcf,stroke:#333,stroke-width:2px;
    style F fill:#ada,stroke:#333,stroke-width:2px;
    style G fill:#afd,stroke:#333,stroke-width:2px;
    style H fill:#fdd,stroke:#333,stroke-width:2px;
    style I fill:#eee,stroke:#333,stroke-width:2px;
    style J fill:#f5f5f5,stroke:#333,stroke-width:2px;
    style K fill:#f5f5f5,stroke:#333,stroke-width:2px;
    style L fill:#f5f5f5,stroke:#333,stroke-width:2px;
    style M fill:#f5f5f5,stroke:#333,stroke-width:2px;
    style N fill:#f5f5f5,stroke:#333,stroke-width:2px;
    style O fill:#f5f5f5,stroke:#333,stroke-width:2px;
    style P fill:#f5f5f5,stroke:#333,stroke-width:2px;
    style Q fill:#f5f5f5,stroke:#333,stroke-width:2px;
```

## Key Metrics to Monitor

### 1. Data Quality Metrics

-   **KG Consistency**:
    -   Number of orphaned nodes/relationships.
    -   Number of inconsistent entity types or property values.
    -   Schema validation errors.
-   **Contradiction Status**:
    -   Number of detected contradictions (per type).
    -   Resolution rate and average resolution time for human-reviewed contradictions.
    -   Accuracy of automated contradiction detection.
-   **Evidence Scoring**:
    -   Distribution of confidence and evidence levels across KG.
    -   Correlation between automated scores and human expert ratings.
-   **Data Freshness**:
    -   Age of data in KG (last updated timestamp).
    -   Latency from source update to KG ingestion.

### 2. Pipeline Performance Metrics

-   **Ingestion Rate**: Documents/entities/relationships processed per second/minute.
-   **Processing Latency**: Time taken for each stage of the pipeline (source fetch, preprocessing, extraction, validation, transformation, loading).
-   **Error Rate**: Number/percentage of documents failing at each pipeline stage.
-   **Resource Utilization**: CPU, memory, and I/O usage of pipeline components.
-   **Backlog Size**: Number of documents waiting to be processed.

### 3. AI Model Performance Metrics

-   **Clinical RoBERTa**:
    -   Entity extraction accuracy (precision, recall, F1-score).
    -   Relationship extraction accuracy (precision, recall, F1-score).
    -   Inference latency.
    -   Model resource utilization (GPU/CPU, memory).
-   **Langroid Agents**:
    -   Answer accuracy/relevance (evaluated against golden dataset or human ratings).
    -   Tool utilization rate (how often and effectively agents use KG tools).
    -   Response latency.
    -   Success rate for complex tasks.
    -   Number of "hallucinations" or factual errors.

### 4. System Health Metrics

-   **Service Uptime/Availability**: For Neo4j, Elasticsearch/ChromaDB, FastAPI backend, MCP server.
-   **API Latency**: Response times for all critical API endpoints.
-   **Error Rates**: HTTP error codes, application-level exceptions.
-   **Resource Usage**: Overall CPU, memory, disk, and network usage of all deployed services.
-   **Database Health**: Connection pool usage, query execution times, disk space.

### 5. User Experience Metrics

-   **Query Success Rate**: Percentage of user queries resulting in a relevant answer.
-   **Search Relevance**: User ratings of search results.
-   **Agent Satisfaction**: User ratings of agent interactions.
-   **Feature Usage**: Frequency of use for different application features.
-   **Feedback Loop**: Number of user feedback submissions and resolution rate.

### 6. Security and Compliance Metrics

-   **Access Violations**: Number of unauthorized access attempts.
-   **PII Leakage**: Detection of sensitive data in logs or unredacted outputs.
-   **Audit Log Integrity**: Verification of audit log immutability and completeness.
-   **Compliance Checks**: Regular automated checks against HIPAA, LGPD, GDPR requirements.

## Implementation Details

### Metrics Collection

-   **Python `logging` module**: For application-level logs.
-   **Prometheus client libraries**: Integrate into Python services to expose custom metrics via HTTP endpoints.
-   **`statsd` / `Prometheus Pushgateway`**: For ephemeral or batch jobs.
-   **AuditLogger**: Custom module for structured audit events.

### Log Aggregation

-   **ELK Stack (Elasticsearch, Logstash, Kibana)** or **Loki/Grafana**: For centralized log collection, parsing, and visualization.
-   **Structured Logging**: All logs should be in JSON format to facilitate parsing and querying.

### Monitoring Database

-   **Prometheus**: Time-series database for collecting and storing metrics.
-   **Neo4j Metrics**: Neo4j exposes its own metrics endpoints.
-   **Elasticsearch/ChromaDB Metrics**: Built-in metrics for search stores.

### Alerting System

-   **Prometheus Alertmanager**: Configured with rules to trigger alerts based on metric thresholds.
-   **Integration with communication channels**: Slack, PagerDuty, email for critical alerts.
-   **Custom Alerting Logic**: For complex rules involving multiple metrics or contextual information.

### Dashboarding

-   **Grafana**: Create interactive dashboards for visualizing all collected metrics and logs.
-   **Dedicated Dashboards**: For overall system health, data quality, pipeline performance, AI model performance, etc.

### Reporting Module

-   **Automated Scripts**: Generate daily, weekly, monthly reports summarizing key metrics and trends.
-   **Report Formats**: PDF, HTML, or CSV, delivered via email or an internal portal.
-   **Customizable Reports**: Allow stakeholders to define their own reporting needs.

### Audit Log Storage

-   **Dedicated Database**: A separate, immutable database (e.g., a blockchain-based ledger for critical events, or a write-once object storage) for audit logs to ensure non-repudiation.
-   **Hashing and Chaining**: Implement cryptographic hashing for log entries to detect tampering.

## Implementation Roadmap

### Phase 1: Basic Health and Performance Monitoring
- [ ] Set up Prometheus and Grafana.
- [ ] Instrument all core services (FastAPI, MCP, KG loaders/query) with basic health and performance metrics (uptime, request latency, error rates, resource usage).
- [ ] Configure centralized log aggregation (e.g., with ELK or Loki).
- [ ] Create initial Grafana dashboards for system overview.

### Phase 2: Data Quality and Pipeline Monitoring
- [ ] Integrate `QualityValidator` metrics into the monitoring system.
- [ ] Track ingestion pipeline metrics (throughput, latency per stage, error rates).
- [ ] Implement contradiction detection metrics and resolution tracking.
- [ ] Develop dashboards for data quality and pipeline performance.

### Phase 3: AI Model and Advanced Metrics
- [ ] Instrument Clinical RoBERTa and Langroid agents with performance and accuracy metrics (e.g., inference time, accuracy scores from evaluation datasets).
- [ ] Implement user experience metrics (e.g., search relevance, agent satisfaction).
- [ ] Set up alerting rules for critical data quality and model performance deviations.
- [ ] Develop initial automated reports.

### Phase 4: Security, Compliance, and Continuous Improvement
- [ ] Implement security and compliance monitoring (access violations, PII detection).
- [ ] Integrate audit logs into a dedicated, secure storage.
- [ ] Establish a formal feedback loop process for M&E insights to drive system improvements.
- [ ] Implement advanced analytics for predictive monitoring (e.g., predicting potential bottlenecks).

## Testing Strategy

### Unit Testing
- Test individual metric collectors and loggers.
- Test alerting rules with simulated data.

### Integration Testing
- Verify that all components correctly send metrics and logs to the central system.
- Test the end-to-end alerting process.
- Validate that dashboards display accurate and real-time information.

### Performance Testing
- Stress test the monitoring infrastructure to ensure it can handle peak loads.
- Measure the overhead introduced by monitoring.

### Data Integrity Testing
- Regularly verify the integrity and completeness of collected metrics and logs.
- Test backup and restore procedures for monitoring data.

## Future Enhancements

-   **Predictive Analytics**: Use machine learning models to predict future performance issues or data quality degradation.
-   **Automated Remediation**: Implement automated scripts to address common issues detected by the monitoring system.
-   **Anomaly Detection**: Integrate advanced anomaly detection algorithms for proactive issue identification.
-   **Root Cause Analysis**: Develop tools to automatically assist in identifying the root cause of complex system failures.
-   **Simulation and Stress Testing Integration**: Integrate M&E with simulation environments to test system behavior under extreme conditions.

# Production Deployment Architecture Design

## Overview

This document outlines the design for the production deployment architecture of the Clinical Corvus platform, focusing on scalability, reliability, security, and cost-effectiveness. The architecture leverages containerization, orchestration, and cloud-native services to ensure a robust and performant environment for the Knowledge Graph (KG) system and its integrated AI components.

## Design Principles

### Core Principles

1.  **Scalability**: Ability to handle increasing user load and data volumes by scaling components independently.
2.  **High Availability**: Minimize downtime and ensure continuous service operation through redundancy and fault tolerance.
3.  **Security**: Protect sensitive medical data and intellectual property through robust security measures at all layers.
4.  **Reliability**: Ensure consistent and predictable performance, with mechanisms for error handling and recovery.
5.  **Cost-Effectiveness**: Optimize resource utilization and leverage managed services to reduce operational costs.
6.  **Observability**: Comprehensive monitoring, logging, and tracing to provide deep insights into system behavior.
7.  **Automation**: Automate deployment, scaling, and operational tasks to reduce manual effort and human error.

### Key Considerations

-   **Microservices Architecture**: Each major component (Frontend, Backend API, MCP Server, KG, Search Stores, AI Models) is deployed as an independent service.
-   **Cloud-Native**: Designed for deployment on a major cloud provider (e.g., AWS, Azure, GCP) leveraging their managed services.
-   **Containerization**: All services are containerized using Docker for consistency across environments.
-   **Orchestration**: Kubernetes (K8s) for container orchestration, scaling, and management.
-   **Infrastructure as Code (IaC)**: Use tools like Terraform or Pulumi for declarative infrastructure provisioning.
-   **CI/CD**: Automated pipelines for continuous integration and continuous deployment.

## Architecture Components

### 1. Frontend (Next.js App Router)

-   **Deployment**: Static site generation (SSG) or Server-Side Rendering (SSR) deployed on a CDN (e.g., Vercel, AWS CloudFront, Azure Front Door).
-   **Scalability**: CDN handles global distribution and caching, ensuring low latency. SSR can scale using serverless functions or container instances.
-   **Security**: WAF (Web Application Firewall), DDoS protection, HTTPS.
-   **Managed Service (Example)**: Vercel for Next.js, or AWS Amplify/CloudFront.

### 2. Backend API (FastAPI)

-   **Deployment**: Containerized FastAPI application deployed on Kubernetes.
-   **Scalability**: Horizontal Pod Autoscaler (HPA) based on CPU/memory utilization or custom metrics (e.g., request queue depth).
-   **High Availability**: Multiple replicas across availability zones.
-   **Security**: API Gateway (e.g., AWS API Gateway, Azure API Management, GCP API Gateway) for authentication, authorization, rate limiting, WAF. Network policies within K8s.
-   **Managed Service (Example)**: AWS EKS, Azure AKS, GCP GKE.

### 3. MCP Server (FastAPI)

-   **Deployment**: Containerized FastAPI application deployed on Kubernetes, potentially on separate nodes or node groups if it has specific resource requirements (e.g., GPU for certain AI tasks).
-   **Scalability**: HPA.
-   **High Availability**: Multiple replicas.
-   **Security**: Network policies, secure communication with backend.
-   **Managed Service (Example)**: AWS EKS, Azure AKS, GCP GKE.

### 4. Knowledge Graph (Neo4j)

-   **Deployment**:
    -   **Managed Service (Recommended)**: Neo4j Aura (for ease of management, scaling, and HA).
    -   **Self-Managed on K8s**: Neo4j Enterprise Edition deployed as a StatefulSet on Kubernetes with persistent volumes, using a Causal Cluster for high availability (3+ Core instances, optional Read Replicas).
-   **Scalability**: Aura handles scaling automatically. Self-managed scales horizontally by adding more Core/Read Replica instances.
-   **High Availability**: Aura provides built-in HA. Self-managed uses Causal Cluster for fault tolerance and data consistency.
-   **Security**: Network isolation, strict access control (user roles, SSL/TLS), encryption at rest and in transit.
-   **Managed Service (Example)**: Neo4j Aura.

### 5. Search Stores (BM25 - Elasticsearch/OpenSearch, Vector - ChromaDB/FAISS/Managed Vector DB)

-   **Deployment**:
    -   **Managed Service (Recommended)**: AWS OpenSearch Service, Azure Cognitive Search, GCP Cloud Search (for BM25). For Vector, dedicated vector databases like Pinecone, Weaviate, or managed ChromaDB/FAISS.
    -   **Self-Managed on K8s**: Elasticsearch/ChromaDB deployed as StatefulSets on Kubernetes with persistent volumes.
-   **Scalability**: Managed services handle scaling. Self-managed scales horizontally by adding more nodes to the cluster.
-   **High Availability**: Managed services provide built-in HA. Self-managed uses clustering and replication.
-   **Security**: Network isolation, encryption, access control.
-   **Managed Service (Example)**: AWS OpenSearch Service, Pinecone.

### 6. AI Models (Clinical RoBERTa, Mistral, LLMs)

-   **Deployment**:
    -   **Remote APIs**: Leverage external LLM providers (OpenRouter, Gemini) directly from Backend/MCP (as currently designed). This offloads infrastructure management.
    -   **Self-Hosted on K8s**: Deploy fine-tuned or specialized models (e.g., Clinical RoBERTa) as separate microservices on Kubernetes, potentially using GPU-enabled nodes.
-   **Scalability**: External APIs handle scaling. Self-hosted scales with HPA on GPU resources.
-   **High Availability**: Redundancy for self-hosted models.
-   **Security**: Secure API keys, network policies.
-   **Managed Service (Example)**: AWS SageMaker, Azure Machine Learning, GCP AI Platform (for self-hosted model serving).

### 7. Data Storage (PostgreSQL)

-   **Deployment**: Managed Relational Database Service (e.g., AWS RDS PostgreSQL, Azure Database for PostgreSQL, GCP Cloud SQL for PostgreSQL).
-   **Scalability**: Vertical scaling (upgrading instance size), read replicas for read-heavy workloads.
-   **High Availability**: Multi-AZ deployments, automated backups, point-in-time recovery.
-   **Security**: Network isolation, encryption at rest and in transit, IAM roles.
-   **Managed Service (Example)**: AWS RDS.

### 8. Message Queue (Optional, for asynchronous processing)

-   **Purpose**: Decouple components, handle spikes in load, enable asynchronous tasks (e.g., document processing for KG population).
-   **Deployment**: Managed message queue service (e.g., AWS SQS/Kafka, Azure Service Bus, GCP Pub/Sub).
-   **Managed Service (Example)**: AWS SQS.

### 9. Monitoring & Logging

-   **Metrics**: Prometheus for time-series metrics, integrated with Grafana for dashboards.
-   **Logging**: Centralized logging system (e.g., ELK Stack, AWS CloudWatch Logs, Azure Monitor Logs) for collecting, storing, and analyzing logs from all services.
-   **Tracing**: Distributed tracing (e.g., Jaeger, OpenTelemetry) for end-to-end request visibility across microservices.
-   **Managed Service (Example)**: AWS CloudWatch, Azure Monitor, GCP Operations Suite.

### 10. CI/CD Pipeline

-   **Tools**: GitHub Actions, GitLab CI/CD, Jenkins, AWS CodePipeline/CodeBuild/CodeDeploy.
-   **Functionality**: Automated testing, static code analysis, container image building, vulnerability scanning, deployment to Kubernetes clusters.

## Network Architecture

-   **VPC (Virtual Private Cloud)**: Isolate all resources within a private network.
-   **Subnets**: Private subnets for application components and databases, public subnets for load balancers/NAT gateways.
-   **Security Groups/Network ACLs**: Restrict traffic between components to the absolute minimum required.
-   **Load Balancers**:
    -   **Application Load Balancer (ALB)**: For HTTP/HTTPS traffic to the Frontend and Backend API.
    -   **Network Load Balancer (NLB)**: For high-performance TCP traffic (e.g., to Neo4j Bolt port if self-managed).
-   **Private Endpoints/Service Endpoints**: For secure and private connectivity to managed cloud services without traversing the public internet.
-   **VPN/Direct Connect**: Secure access for administrators and internal systems.

## Security Considerations

-   **Authentication & Authorization**: Clerk for user authentication. JWT validation in Backend. Role-Based Access Control (RBAC) in Kubernetes.
-   **Data Encryption**:
    -   **In Transit**: TLS 1.2/1.3 for all inter-service communication and external traffic.
    -   **At Rest**: Encryption for databases, object storage, and persistent volumes.
-   **Secrets Management**: Managed secret store (e.g., AWS Secrets Manager, Azure Key Vault, GCP Secret Manager) for API keys, database credentials.
-   **Vulnerability Management**: Regular scanning of container images and dependencies.
-   **Compliance**: Adherence to HIPAA, LGPD, GDPR through data de-identification, access controls, and audit trails.
-   **Least Privilege**: Grant only the necessary permissions to users and services.

## Scalability Strategy

-   **Horizontal Pod Autoscaling (HPA)**: For stateless services (Backend, MCP, stateless AI models) based on CPU/memory.
-   **Cluster Autoscaling**: Automatically adjust the number of nodes in the Kubernetes cluster.
-   **Database Scaling**:
    -   **Relational (PostgreSQL)**: Read replicas, vertical scaling, sharding (if necessary).
    -   **Graph (Neo4j)**: Causal Clustering (Enterprise), read replicas.
    -   **Search (Elasticsearch/ChromaDB)**: Horizontal scaling by adding more nodes/shards.
-   **Managed Services**: Leverage auto-scaling capabilities of cloud provider managed services.

## High Availability Strategy

-   **Multi-AZ Deployment**: Deploy critical components across multiple Availability Zones within a region.
-   **Redundancy**: Multiple replicas for stateless services. Database replication (primary/standby, read replicas).
-   **Automated Failover**: Configure Kubernetes and managed services for automatic failover in case of component or AZ failure.
-   **Automated Backups & Disaster Recovery**: Regular, automated backups to geographically separate regions. Documented disaster recovery plans with RTO/RPO objectives.

## Cost Optimization

-   **Right-Sizing**: Continuously monitor and adjust resource allocations (CPU, memory) to avoid over-provisioning.
-   **Spot Instances/Spot VMs**: Use for fault-tolerant, interruptible workloads (e.g., batch processing, non-critical AI model inference).
-   **Reserved Instances/Savings Plans**: For predictable, long-running workloads.
-   **Managed Services**: Offload operational overhead to cloud providers.
-   **Serverless**: Utilize serverless functions (e.g., AWS Lambda, Azure Functions) for event-driven or bursty workloads where applicable.

## Implementation Roadmap

### Phase 1: Core Infrastructure Setup (MVP)
- [ ] Establish cloud provider account and basic VPC network.
- [ ] Set up managed PostgreSQL database.
- [ ] Deploy Kubernetes cluster (EKS/AKS/GKE).
- [ ] Deploy Backend API and MCP Server containers on Kubernetes with HPA.
- [ ] Deploy managed Neo4j Aura instance.
- [ ] Deploy managed BM25 (Elasticsearch) and Vector (ChromaDB/Pinecone) services.
- [ ] Configure basic CI/CD for Backend and MCP.
- [ ] Implement basic monitoring and logging.

### Phase 2: Enhanced Reliability and Scalability
- [ ] Implement multi-AZ deployments for all critical services.
- [ ] Configure advanced HPA rules and cluster autoscaling.
- [ ] Implement robust backup and disaster recovery procedures.
- [ ] Integrate advanced monitoring, alerting, and distributed tracing.
- [ ] Implement secrets management solution.

### Phase 3: Security and Optimization
- [ ] Implement API Gateway for all external API access.
- [ ] Conduct comprehensive security audits and penetration testing.
- [ ] Refine resource allocation for cost optimization.
- [ ] Implement advanced caching strategies.
- [ ] Explore serverless options for suitable workloads.

### Phase 4: Continuous Improvement and Automation
- [ ] Fully automate infrastructure provisioning using IaC (Terraform/Pulumi).
- [ ] Expand CI/CD pipelines for all components, including automated testing and security scanning.
- [ ] Establish a performance baseline and continuous performance testing.
- [ ] Implement automated healing and self-recovery mechanisms.
- [ ] Regular review and update of security and compliance postures.

This comprehensive production deployment architecture provides a solid foundation for the Clinical Corvus platform, ensuring it is scalable, reliable, secure, and cost-effective in a production environment.