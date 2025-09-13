# Knowledge Graph Document Processing System Design

## Overview

This document outlines the design for a document processing system specifically for Knowledge Graph (KG) population in the Clinical Corvus platform. The system will handle preprocessing of PDF and markdown documents to extract entities and relationships for KG population, with integration with Clinical RoBERTa for specialized medical entity extraction.

## System Architecture

### Components

1. **Unified Document Processor Interface** - Central entry point for all document processing
2. **Format-Specific Processors** - Specialized processors for PDF and markdown documents
3. **Clinical RoBERTa Integration** - Entity and relationship extraction using the specialized medical model
4. **Document Router** - Format detection and routing to appropriate processors
5. **Metadata Extractor** - Extract document metadata for KG context

### Data Flow

```
[Input Document] 
      ↓
[Document Router] 
      ↓
[Format-Specific Processor] 
      ↓
[Text Extraction & Cleaning]
      ↓
[Clinical RoBERTa Entity Extraction]
      ↓
[KG-Ready Entity/Relation Data]
```

## Unified Document Processor Interface

### Interface Definition

```python
class KGDocumentProcessor:
    async def process_document(
        self,
        file_content: bytes,
        filename: str,
        document_type: str = None,
        processing_options: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Process a document for KG population.
        
        Args:
            file_content: Document content in bytes
            filename: Original filename
            document_type: Explicit document type (pdf, md, txt) or None for auto-detection
            processing_options: Options for processing (extraction_mode, etc.)
            
        Returns:
            Dict containing extracted entities, relationships, and metadata
        """
        pass
```

### Return Format

```python
{
    "document_id": "unique_document_identifier",
    "filename": "original_filename.pdf",
    "content": "extracted_text_content",
    "entities": [
        {
            "entity_id": "unique_entity_id",
            "text": "entity_text",
            "type": "entity_type",  # e.g., "DISEASE", "DRUG", "SYMPTOM"
            "confidence": 0.95,
            "position": {"start": 0, "end": 10},
            "normalized_name": "normalized_entity_name"
        }
    ],
    "relationships": [
        {
            "source_entity_id": "entity_id_1",
            "target_entity_id": "entity_id_2",
            "relation_type": "TREATS",  # e.g., "CAUSES", "TREATS", "ASSOCIATED_WITH"
            "confidence": 0.87,
            "evidence_text": "supporting text snippet"
        }
    ],
    "metadata": {
        "extraction_method": "llamaparse",
        "processing_time": 1.23,
        "document_type": "pdf",
        "pages_processed": 5,
        "language": "pt"
    }
}
### Extended Return Format (GraphRAG + KG ingestion)

To make the outputs GraphRAG-ready, the processor MUST include the following additional elements:

- `passages[]` : list of semantic chunks with fields {passage_id, text, start_char, end_char, page, section, token_count, embedding_vector, extraction_method}
- `claims[]` : reified relation objects with fields {claim_id, type, subject_entity_id, object_entity_id, evidence_passage_ids, confidence, provenance, structured_attributes}
- `normalizations[]` : for each entity, resolved ontology ids with scores: {entity_id, candidates:[{id, source, score}]}
- `tables[]` : extracted tables with structured rows and mapping suggestions
- `review_payload` (optional) : compact review object for human-in-the-loop QA

```python
{
  "document_id": "unique_document_identifier",
  "filename": "original_filename.pdf",
  "content": "extracted_text_content",
  "passages": [
    {
      "passage_id": "p-1",
      "text": "...snip...",
      "start_char": 120,
      "end_char": 450,
      "page": 2,
      "section": "Methods",
      "token_count": 120,
      "embedding_vector": [...],
      "language": "pt",
      "extraction_method": "llamaparse+ocr-v2"
    }
  ],
  "entities": [
    {
      "entity_id": "unique_entity_id",
      "text": "entity_text",
      "type": "entity_type", # e.g., "DISEASE", "DRUG", "SYMPTOM"
      "confidence": 0.95,
      "position": {"start": 0, "end": 10},
      "normalized_name": "normalized_entity_name",
      "resolved_ids": [
        {
          "id": "C0012345",
          "source": "UMLS",
          "confidence": 0.92
        }
      ]
    }
  ],
  "claims": [
    {
      "claim_id": "c-1",
      "type": "TREATS",
      "subject_entity_id": "e-101",
      "object_entity_id": "e-202",
      "confidence": 0.92,
      "evidence_passage_ids": ["p-1", "p-3"],
      "provenance": {
        "source": "PMID:xxxx",
        "extractor": "ClinicalRoBERTa v1",
        "timestamp": "...",
        "extractor_run_id": "run-uuid",
        "document_cursor": "file.pdf#page=2&char=120-450"
      },
      "structured_attributes": {
        "dose_amount": 500,
        "dose_unit": "mg",
        "route": "oral",
        "frequency": "BID"
      }
    }
  ],
  "tables": [
    {
      "table_id": "t-1",
      "page": 3,
      "caption": "Patient demographics",
      "headers": ["Age", "Gender", "Condition"],
      "rows": [
        [25, "Male", "Diabetes"],
        [30, "Female", "Hypertension"]
      ],
      "mapping_suggestions": [
        {
          "column_index": 0,
          "entity_type": "AGE",
          "confidence": 0.95
        }
      ]
    }
  ],
  "metadata": {
    "extraction_method": "llamaparse",
    "processing_time": 1.23,
    "document_type": "pdf",
    "pages_processed": 5,
    "language": "pt",
    "confidence_calibrated": true,
    "normalization_applied": true
  },
  "review_payload": {
    "requires_human_review": false,
    "confidence_threshold": 0.85,
    "low_confidence_claims": []
  }
}
```
```

## Format-Specific Processors

### PDF Processor (KG-Specific Extensions)

Building upon the existing `PDFExtractionService`, we'll create a KG-specific extension:

#### Features

1. **Enhanced Text Extraction** - Preserve structure for better entity context
2. **Metadata Preservation** - Keep page numbers, sections, etc.
3. **Table Processing** - Special handling for medical data tables
4. **Image Detection** - Identify figures that may contain relevant information

#### Implementation

```python
class KGPDFProcessor:
    async def extract_for_kg(
        self,
        file_content: bytes,
        filename: str,
        extraction_mode: str = "balanced"
    ) -> Dict[str, Any]:
        """
        Extract text and metadata specifically for KG processing.
        """
        # Use existing PDFExtractionService with enhanced options
        base_result = await pdf_service.extract_text_from_pdf(
            file_content, filename, extraction_mode
        )
        
        # Enhance for KG processing
        enhanced_result = self._enhance_for_kg(base_result)
        return enhanced_result
    
    def _enhance_for_kg(self, base_result: Dict) -> Dict[str, Any]:
        """Add KG-specific enhancements to extraction result."""
        # Add section detection
        # Add citation extraction
        # Add figure/table markers
        # Add enhanced metadata
        pass
```

### Markdown Processor

#### Features

1. **Structure Preservation** - Maintain headings, lists, code blocks
2. **Link Processing** - Extract and process markdown links
3. **Table Parsing** - Parse markdown tables for structured data
4. **Frontmatter Handling** - Process YAML frontmatter for metadata

#### Implementation

```python
class KGMarkdownProcessor:
    async def extract_for_kg(
        self,
        file_content: bytes,
        filename: str
    ) -> Dict[str, Any]:
        """
        Process markdown document for KG extraction.
        """
        # Convert bytes to string
        text_content = file_content.decode('utf-8')
        
        # Parse markdown structure
        parsed_content = self._parse_markdown(text_content)
        
        # Extract entities and relationships
        return self._extract_kg_elements(parsed_content)
    
    def _parse_markdown(self, content: str) -> Dict[str, Any]:
        """Parse markdown content into structured elements."""
        # Use markdown parser to extract headings, lists, tables, etc.
        pass
    
    def _extract_kg_elements(self, parsed_content: Dict) -> Dict[str, Any]:
        """Extract KG-ready elements from parsed markdown."""
        # Extract headings as potential entities
        # Extract list items as entities/relationships
        # Parse tables for structured data
        # Process links for relationship extraction
        pass
```

## Document Router

### Purpose

Automatically detect document format and route to appropriate processor.

### Implementation

```python
class DocumentRouter:
    def __init__(self):
        self.pdf_processor = KGPDFProcessor()
        self.markdown_processor = KGMarkdownProcessor()
    
    async def route_document(
        self,
        file_content: bytes,
        filename: str,
        document_type: str = None
    ) -> Dict[str, Any]:
        """
        Route document to appropriate processor based on type.
        """
        if document_type is None:
            document_type = self._detect_document_type(file_content, filename)
        
        if document_type == "pdf":
            return await self.pdf_processor.extract_for_kg(file_content, filename)
### Ensemble Extraction Pattern

To improve the accuracy and coverage of entity and relationship extraction, we implement a hybrid ensemble approach that combines Clinical RoBERTa with LLMs and heuristic rules:

```python
class EnsembleExtractor:
    def __init__(self):
        self.clinical_roberta = ClinicalRoBERTaExtractor()
        self.llm_extractor = None  # Initialize LLM extractor
        self.rule_engine = None    # Initialize rule-based engine
        self.table_parser = None   # Initialize table parser
        self.terminology_service = None  # Initialize terminology service
    
    async def extract_entities_and_relations_ensemble(
        self,
        text_content: str,
        document_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Extract entities and relationships using an ensemble of methods.
        """
        # 1. Semantic chunking
        chunks = await self._semantic_chunking(text_content)
        
        # 2. Extract with Clinical RoBERTa
        roberta_results = await self.clinical_roberta.extract_entities_and_relations(
            text_content, document_context
        )
        
        # 3. Extract with LLM (for semantic linking and complex relations)
        llm_results = await self._llm_extraction(chunks, document_context)
        
        # 4. Parse tables for structured data
        table_results = await self._table_extraction(chunks)
        
        # 5. Apply rule-based postprocessing
        rule_results = await self._rule_based_processing(roberta_results, llm_results)
        
        # 6. Normalize entities to ontologies
        normalized_results = await self._normalize_entities(roberta_results, llm_results)
        
        # 7. Build claims with evidence alignment
        claims = await self._build_claims_with_evidence(
            normalized_results, chunks, table_results
        )
        
        # 8. Compute embeddings for passages
        for passage in chunks:
            passage["embedding_vector"] = await self._compute_embeddings(passage["text"])
        
        return {
            "passages": chunks,
            "entities": normalized_results.get("entities", []),
            "claims": claims,
            "tables": table_results,
            "metadata": {
                "extraction_methods": ["ClinicalRoBERTa", "LLM", "Rules", "Tables"],
                "confidence_calibrated": True
            }
        }
    
    async def _semantic_chunking(self, text: str) -> List[Dict[str, Any]]:
        """Perform semantic chunking on text."""
        # Use LLM or heuristic algorithm for chunk boundaries
        # Preserve logical boundaries (headings, sections, table blocks, sentences)
        # Attach metadata: section, page, header_path, token_count
        pass
    
    async def _llm_extraction(self, chunks: List[Dict], context: Dict) -> Dict[str, Any]:
        """Extract relations using LLM prompting."""
        # Use few-shot prompting or LlamaParse for complex relation inference
        pass
    
    async def _table_extraction(self, chunks: List[Dict]) -> List[Dict]:
        """Extract and parse tables from chunks."""
        # Detect tables in chunks
        # Parse table cells into structured rows
        # Convert common table patterns to claims
        pass
    
    async def _rule_based_processing(self, roberta_results: Dict, llm_results: Dict) -> Dict[str, Any]:
        """Apply rule-based postprocessing."""
        # Regex for codes (ICD, RxNorm, etc.)
        # UCUM unit validation
        # Drug code lookups
        pass
    
    async def _normalize_entities(self, roberta_results: Dict, llm_results: Dict) -> Dict[str, Any]:
        """Normalize entities to standard ontologies."""
        # Map extracted entities to UMLS CUI / SNOMED / RxNorm / LOINC
        # Return normalization confidence and resolved IDs
        pass
    
## Confidence Calibration and Quality Scoring

To ensure reliable extraction results, we implement a confidence calibration system that combines multiple signals:

```python
class ConfidenceCalibrator:
    def __init__(self):
        self.calibration_model = None  # Platt scaling or isotonic regression model
    
    def compute_calibrated_confidence(self, raw_confidence: float, features: Dict[str, Any]) -> float:
        """
        Compute calibrated confidence score based on multiple features.
        """
        # Combine model confidences (RoBERTa/RE model logits)
        model_confidence = features.get("model_confidence", raw_confidence)
        
        # Heuristic signals (presence of IDs e.g., RxNorm)
        id_presence_boost = features.get("has_resolved_ids", 0) * 0.1
        
        # Source strength (guideline vs blog)
        source_strength = features.get("source_quality", 0.8)
        
        # Table-derived signals (structured table rows boost confidence)
        table_boost = features.get("from_table", 0) * 0.15
        
        # Ensemble agreement (multiple extractors agree)
        agreement_boost = features.get("extractor_agreement", 0) * 0.2
        
        # Compute raw confidence
        raw_score = (
            model_confidence * 0.6 +
            id_presence_boost +
            source_strength * 0.1 +
            table_boost +
            agreement_boost
        )
        
        # Apply calibration model if available
        if self.calibration_model:
            calibrated_score = self.calibration_model.predict([[raw_score]])[0]
            return min(1.0, max(0.0, calibrated_score))
        else:
            return min(1.0, max(0.0, raw_score))
    
    def flag_for_review(self, calibrated_confidence: float, threshold: float = 0.85) -> bool:
## Human-in-the-Loop and Active Learning

To ensure the highest accuracy and enable continuous improvement, we implement human review workflows and active learning mechanisms:

```python
class HumanReviewManager:
    def __init__(self):
        self.review_queue = []  # Queue for claims requiring human review
    
    async def generate_review_payload(self, claim: Dict[str, Any], passages: List[Dict]) -> Dict[str, Any]:
        """
        Generate a compact review payload for human reviewers.
        """
        # Extract evidence passages
        evidence_passages = [
            p for p in passages if p["passage_id"] in claim.get("evidence_passage_ids", [])
        ]
        
        return {
            "review_id": f"review-{uuid.uuid4()}",
            "claim": claim,
            "evidence_passages": evidence_passages,
            "suggested_kg_mapping": await self._suggest_kg_mapping(claim),
            "alternatives": await self._generate_alternatives(claim),
            "confidence": claim.get("confidence", 0.0),
            "review_status": "pending"
        }
    
    async def _suggest_kg_mapping(self, claim: Dict) -> Dict[str, Any]:
        """Suggest mapping to existing KG entities."""
        # Query KG for similar entities
        # Suggest potential mappings with confidence scores
        pass
    
    async def _generate_alternatives(self, claim: Dict) -> List[Dict]:
        """Generate alternative interpretations of the claim."""
        # Use LLM to generate alternative relations
        # Consider different entity mappings
        pass
    
    async def process_review_feedback(self, review_id: str, feedback: Dict) -> Dict[str, Any]:
        """
        Process feedback from human reviewers and update models.
        """
        # Update claim with reviewer corrections
        # Feed corrections into active learning loop
        # Fine-tune RoBERTa or adjust extraction prompts
        pass

class ActiveLearningEngine:
    def __init__(self):
        self.feedback_buffer = []  # Store reviewer feedback
        self.model_updater = None   # Model update service
    
    async def collect_feedback(self, feedback: Dict):
## Performance and Scaling Patterns

To ensure efficient processing at scale, we implement several optimization strategies:

### Model Serving and Batching

```python
class ModelServer:
    def __init__(self):
        self.model = None
        self.request_queue = asyncio.Queue()
        self.batch_size = 32
        self.max_wait_time = 0.1  # seconds
    
    async def initialize_model(self):
        """Initialize Clinical RoBERTa on GPU-backed model server."""
        # Load model using TorchServe or Triton
        pass
    
    async def batch_process_requests(self):
        """Process requests in batches for optimal GPU utilization."""
        while True:
            batch = []
            start_time = time.time()
            
            # Collect requests for batch
            while len(batch) < self.batch_size and (time.time() - start_time) < self.max_wait_time:
                try:
                    request = await asyncio.wait_for(self.request_queue.get(), timeout=0.01)
                    batch.append(request)
                except asyncio.TimeoutError:
                    continue
            
            if batch:
                await self._process_batch(batch)
    
    async def _process_batch(self, batch: List[Dict]):
        """Process a batch of extraction requests."""
        # Batch inference on GPU
        # Return results to requesters
### Caching and Vectorization

```python
class CachingAndVectorization:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.vector_db = None  # FAISS/Pinecone client
        self.neo4j_driver = None
    
    async def cache_embeddings(self, document_hash: str, chunk_hash: str, embedding: List[float]):
        """Cache embeddings in Redis for fast retrieval."""
        cache_key = f"embedding:{document_hash}:{chunk_hash}"
        await self.redis.setex(cache_key, 3600, json.dumps(embedding))  # 1 hour TTL
    
    async def sync_passage_to_neo4j(self, passage: Dict[str, Any]):
        """Sync passage with embedding to Neo4j."""
        # Store passage as :Passage node with vector property
        # Use Neo4j 5+ native vector indexes for fast ANN
        pass
    
    async def bulk_import_artifacts(self, artifacts: Dict[str, List]):
        """Produce NDJSON artifacts for bulk import."""
        # Create passage.ndjson, entity.ndjson, claim.ndjson
        # Use neo4j-admin import for fast bulk ingestion
        pass
## Error Handling and Observability

To ensure robust processing and enable debugging, we implement comprehensive error handling and observability:

```python
class ErrorHandler:
    def __init__(self):
        self.metrics = None  # Prometheus client
        self.logger = logging.getLogger(__name__)
    
    async def handle_ocr_failure(self, document: Dict) -> Dict:
        """Handle OCR failure with graceful degradation."""
        self.logger.warning(f"OCR failed for document {document.get('filename')}")
        
        return {
            "document_status": "ocr_failed",
            "requires_manual_review": True,
            "fallback_used": False,
            "error_details": "OCR processing failed"
        }
    
    async def handle_model_timeout(self, document: Dict) -> Dict:
        """Handle model timeout with fallback processing."""
        self.logger.warning(f"ClinicalRoBERTa timeout for document {document.get('filename')}")
        
        # Fallback to LLM extraction or basic regex extraction
        fallback_result = await self._fallback_extraction(document)
        
        return {
            "document_status": "processed_with_fallback",
            "fallback_used": True,
            "fallback_method": "llm_extraction",
            "result": fallback_result
        }
    
    async def _fallback_extraction(self, document: Dict) -> Dict:
        """Perform fallback extraction using alternative methods."""
        # Use LLM-based extraction
        # Or basic regex pattern matching
        pass
    
    def emit_error_event(self, error_type: str, details: Dict):
        """Emit structured error events to observability pipeline."""
        # Send to Prometheus/Grafana/Elastic
        if self.metrics:
## Security Considerations

To protect sensitive data and ensure secure processing, we implement several security measures:

```python
class SecurityManager:
    def __init__(self):
        self.pii_patterns = [
            r'\b\d{3}-?\d{2}-?\d{4}\b',  # SSN
            r'\b\d{11}\b',               # CPF (Brazil)
            r'\b[A-Z]{2}\d{6}[A-Z]\b',   # Passport
            r'\b\d{10,11}\b'             # Phone numbers
        ]
    
    async def redact_pii(self, text: str) -> str:
        """Automatically redact PII from text content."""
        redacted_text = text
        for pattern in self.pii_patterns:
            redacted_text = re.sub(pattern, '[REDACTED]', redacted_text)
        return redacted_text
    
    async def secure_model_processing(self, document: Dict) -> bool:
        """Ensure secure processing in isolated environment."""
        # Run models in isolated subnet with strict egress rules
        # Log inference requests (not contents) for audit
        # Check if document is flagged for allowed processing
        pass
    
    def log_inference_request(self, request: Dict):
        """Log inference requests for audit purposes."""
        # Log model name, timestamp, document ID
        # Do NOT log document contents
        logging.info(f"Inference request: {request.get('model')} for document {request.get('document_id')}")
            self.metrics.increment(f"document_processing_errors_{error_type}")
        
        self.logger.error(f"Error event: {error_type}", extra=details)
        pass
        """Collect feedback for active learning."""
        self.feedback_buffer.append(feedback)
        
        # Trigger model update when enough feedback is collected
        if len(self.feedback_buffer) >= 100:
            await self._update_models()
    
    async def _update_models(self):
        """Update extraction models based on collected feedback."""
        # Fine-tune Clinical RoBERTa with corrected examples
        # Adjust LLM prompts based on feedback patterns
        # Update rule-based processors
        pass
        """Flag claims with low confidence for human review."""
        return calibrated_confidence < threshold
    async def _build_claims_with_evidence(self, normalized_results: Dict, chunks: List[Dict], table_results: List[Dict]) -> List[Dict]:
        """Build reified claims with evidence alignment."""
        # Create claims from normalized entities and relationships
        # Align claims with evidence passages
        # Add structured attributes from tables
        pass
    
    async def _compute_embeddings(self, text: str) -> List[float]:
        """Compute embeddings for text passages."""
        # Use embedding model to compute vector representations
        pass
        elif document_type in ["md", "markdown"]:
            return await self.markdown_processor.extract_for_kg(file_content, filename)
        else:
            raise ValueError(f"Unsupported document type: {document_type}")
    
    def _detect_document_type(self, file_content: bytes, filename: str) -> str:
        """Detect document type based on content and filename."""
        # Check file extension
        if filename.lower().endswith('.pdf'):
            return "pdf"
        elif filename.lower().endswith(('.md', '.markdown')):
            return "markdown"
        
        # Check file header for PDF magic number
        if file_content.startswith(b'%PDF-'):
            return "pdf"
        
        # Default to text/markdown for other cases
        return "markdown"
```

## Clinical RoBERTa Integration

### Purpose

Extract medical entities and relationships using the specialized Clinical RoBERTa model.

### Integration Design

```python
class ClinicalRoBERTaExtractor:
    def __init__(self):
        # Initialize Clinical RoBERTa model
        # This would typically be loaded from a model server or local file
        self.model = None
        self._initialize_model()
    
    def _initialize_model(self):
        """Initialize the Clinical RoBERTa model."""
        # Load model configuration
        # Connect to model server if remote
        # Load local model if available
        pass
    
    async def extract_entities_and_relations(
        self,
        text_content: str,
        document_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Extract entities and relationships using Clinical RoBERTa.
        
        Args:
            text_content: Text to process
            document_context: Additional context (metadata, section info, etc.)
            
        Returns:
            Dict with entities and relationships
        """
        # Preprocess text for model input
        processed_text = self._preprocess_text(text_content)
        
        # Run entity extraction
        entities = await self._extract_entities(processed_text)
        
        # Run relationship extraction
        relationships = await self._extract_relationships(processed_text, entities)
        
        # Post-process results
        normalized_results = self._normalize_results(entities, relationships)
        
        return normalized_results
    
    def _preprocess_text(self, text: str) -> str:
        """Preprocess text for model input."""
        # Clean text
        # Normalize medical terms
        # Handle abbreviations
        pass
    
    async def _extract_entities(self, text: str) -> List[Dict]:
        """Extract entities from text."""
        # Use Clinical RoBERTa for NER
        pass
    
    async def _extract_relationships(
        self,
        text: str,
        entities: List[Dict]
    ) -> List[Dict]:
        """Extract relationships between entities."""
        # Use Clinical RoBERTa for relation extraction
        pass
    
    def _normalize_results(
        self,
        entities: List[Dict],
        relationships: List[Dict]
    ) -> Dict[str, Any]:
        """Normalize and format extraction results."""
        # Assign unique IDs
        # Calculate confidence scores
        # Normalize entity names
        pass
```

## Integration with Existing Services

### Relationship to Current PDF Service

The KG document processor will extend the existing `PDFExtractionService` rather than replace it:

1. **Reuse Core Functionality** - Use existing PDF extraction logic
2. **Add KG-Specific Enhancements** - Additional processing for KG population
3. **Maintain Compatibility** - Ensure existing functionality remains intact

### Relationship to MCP Server

The document processor will integrate with the MCP server for:

1. **Tool Registration** - Register document processing as an MCP tool
2. **Context Enrichment** - Provide processed documents as context for other tools
3. **Batch Processing** - Handle multiple documents in batch for efficiency

## Processing Pipeline

### Step-by-Step Flow

1. **Document Reception** - Receive document via API or file system
2. **Format Detection** - Automatically detect document format
3. **Text Extraction** - Extract text content using appropriate processor
4. **Content Enhancement** - Add structure and metadata for better processing
5. **Entity Extraction** - Use Clinical RoBERTa to extract medical entities
6. **Relationship Extraction** - Identify relationships between entities
7. **Result Normalization** - Format results for KG population
8. **Quality Scoring** - Assign confidence scores to extracted elements
9. **Return Results** - Provide structured data for KG population

## Error Handling and Fallbacks

### Error Handling Strategy

1. **Graceful Degradation** - Continue processing with reduced functionality on errors
2. **Multiple Extraction Methods** - Try different extraction approaches if one fails
3. **Detailed Error Reporting** - Provide specific error information for debugging
4. **Retry Logic** - Implement retry mechanisms for transient failures

### Fallback Processing

```python
async def process_with_fallbacks(
    self,
    file_content: bytes,
    filename: str
) -> Dict[str, Any]:
    """
    Process document with multiple fallback options.
    """
    # Primary: Enhanced processing with Clinical RoBERTa
    try:
        result = await self._primary_processing(file_content, filename)
        if result.get("success"):
            return result
    except Exception as e:
        logger.warning(f"Primary processing failed: {e}")
    
    # Fallback 1: Basic processing without Clinical RoBERTa
    try:
        result = await self._fallback_processing(file_content, filename)
        if result.get("success"):
            return result
    except Exception as e:
        logger.warning(f"Fallback processing failed: {e}")
    
    # Fallback 2: Return basic extraction only
    return await self._basic_extraction(file_content, filename)
```

## Performance Considerations

### Optimization Strategies

1. **Batch Processing** - Process multiple documents simultaneously
2. **Caching** - Cache processed results for identical documents
3. **Async Processing** - Use asynchronous operations for I/O bound tasks
4. **Memory Management** - Efficiently manage memory for large documents
5. **Parallel Execution** - Run independent processing steps in parallel

### Resource Management

1. **Model Loading** - Load Clinical RoBERTa model once and reuse
2. **Connection Pooling** - Reuse database and service connections
3. **Temporary File Cleanup** - Automatically clean up temporary files
4. **Memory Limits** - Set limits on document size and processing memory

## Security Considerations

### Data Protection

1. **PII Redaction** - Automatically redact personal information
2. **Access Control** - Restrict document processing to authorized users
3. **Encryption** - Encrypt documents at rest and in transit
4. **Audit Logging** - Log all document processing activities

### Model Security

1. **Model Isolation** - Run Clinical RoBERTa in isolated environment
2. **Input Validation** - Validate all inputs to the model
3. **Output Sanitization** - Sanitize model outputs before use
4. **Rate Limiting** - Limit model usage to prevent abuse

## Monitoring and Logging

### Metrics Collection

1. **Processing Time** - Track time for each processing step
2. **Success Rates** - Monitor successful vs failed processing
3. **Entity Extraction Quality** - Track confidence scores and accuracy
4. **Resource Usage** - Monitor CPU, memory, and GPU usage

### Logging Strategy

1. **Structured Logging** - Use structured logs for easy analysis
2. **Error Tracking** - Log detailed error information for debugging
3. **Performance Logging** - Log performance metrics for optimization
4. **Audit Trail** - Maintain audit trail of all processing activities

## Future Extensions

### Planned Enhancements

1. **Additional Formats** - Support for DOCX, HTML, and other formats
2. **Multimodal Processing** - Process images and diagrams within documents
3. **Real-time Processing** - Stream processing for large documents
4. **Incremental Updates** - Update KG with changes to existing documents

### Integration Points

1. **Langroid Agents** - Integrate with Langroid multi-agent system
2. **Active Learning** - Use processing results to improve model performance
3. **Human-in-the-loop** - Add review workflows for critical extractions
4. **Quality Assurance** - Implement automated quality checks

## Implementation Roadmap

### Phase 1: Core Infrastructure
- [ ] Implement Unified Document Processor Interface
- [ ] Create Document Router
- [ ] Extend PDF Processor for KG
- [ ] Implement Markdown Processor

### Phase 2: Model Integration
- [ ] Integrate Clinical RoBERTa for entity extraction
- [ ] Implement relationship extraction
- [ ] Add result normalization

### Phase 3: Enhancement and Optimization
- [ ] Add error handling and fallbacks
- [ ] Implement caching and batch processing
- [ ] Add monitoring and logging

### Phase 4: Testing and Deployment
- [ ] Unit testing for all components
- [ ] Integration testing with KG population pipeline
- [ ] Performance testing and optimization
### Phase 4: GraphRAG and Advanced Features
- [ ] Add Passage & Claim models to output spec and implement in processors
- [ ] Integrate semantic chunker (LLM or heuristic) and attach token/page metadata
- [ ] Implement table-to-claim parser and test across 50 clinical PDFs
- [ ] Implement normalization microservice (UMLS/SNOMED/RxNorm)
- [ ] Add provenance metadata to all extractions and claims

### Phase 5: Human-in-the-loop and Active Learning
- [ ] Build human-review UI (compact review payload + approve/reject flow)
- [ ] Implement confidence calibration and quality scoring
- [ ] Hook passage embeddings into vector index and sync to Neo4j
- [ ] Implement active learning feedback loop

### Phase 6: Performance and Security
- [ ] Optimize model serving with batching and async calls
- [ ] Implement comprehensive caching for embeddings and normalized IDs
- [ ] Add deterministic fallbacks and structured error handling
- [ ] Implement PII redaction and secure model isolation

### Phase 7: Testing and Deployment
- [ ] Unit testing for all components
- [ ] Integration testing with KG population pipeline
- [ ] Performance testing and optimization
- [ ] Production deployment
- [ ] Production deployment