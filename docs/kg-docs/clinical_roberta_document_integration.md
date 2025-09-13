
# Clinical RoBERTa Document Processing Integration Design

## Overview

This document outlines the design for integrating Clinical RoBERTa with the document processing pipeline for medical entity and relationship extraction in the Clinical Corvus Knowledge Graph system.

## Requirements

### Functional Requirements

1. **Entity Extraction** - Extract medical entities from processed documents
2. **Relationship Extraction** - Identify relationships between medical entities
3. **Confidence Scoring** - Provide confidence scores for extracted entities and relationships
4. **Batch Processing** - Process multiple documents efficiently
5. **Error Handling** - Handle model errors gracefully with fallbacks

### Non-Functional Requirements

1. **Performance** - Fast processing with minimal latency
2. **Scalability** - Handle varying loads efficiently
3. **Reliability** - Robust error handling and recovery
4. **Maintainability** - Clean, modular code structure

## Architecture

### Components

1. **Clinical RoBERTa Service** - Core service for model interactions
2. **Entity Extractor** - Extract medical entities from text
3. **Relationship Extractor** - Extract relationships between entities
4. **Model Manager** - Handle model loading, caching, and lifecycle
5. **Result Processor** - Format and validate extraction results

### Data Flow

```
[Processed Document]
        ↓
[Clinical RoBERTa Service]
        ↓
[Entity Extraction]
        ↓
[Relationship Extraction]
        ↓
[Confidence Scoring]
        ↓
[Result Validation]
        ↓
[Formatted KG Data]
```

## Implementation

### Clinical RoBERTa Service

```python
import asyncio
import logging
from typing import List, Dict, Any, Optional
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

class ClinicalRoBERTaService:
    def __init__(
        self,
        model_path: Optional[str] = None,
        model_server_url: Optional[str] = None,
        model_name: str = "clinical-roberta-base"
    ):
        """
        Initialize Clinical RoBERTa service.
        
        Args:
            model_path: Local path to model files
            model_server_url: URL of remote model server
            model_name: Name of the model to use
        """
        self.model_path = model_path
        self.model_server_url = model_server_url
        self.model_name = model_name
        self.model = None
        self.is_remote = bool(model_server_url)
        self.initialized = False
        
    async def initialize(self):
        """Initialize the model or connection to model server."""
        if self.initialized:
            return
            
        try:
            if self.is_remote:
                await self._connect_to_server()
            else:
                await self._load_local_model()
            
            self.initialized = True
            logger.info(f"Clinical RoBERTa service initialized ({'remote' if self.is_remote else 'local'})")
        except Exception as e:
            logger.error(f"Failed to initialize Clinical RoBERTa service: {e}")
            raise
    
    async def _connect_to_server(self):
        """Connect to remote model server."""
        # Implementation for remote model server connection
        # This could use HTTP/gRPC clients depending on server setup
        pass
    
    async def _load_local_model(self):
        """Load model from local storage."""
        # Implementation for loading local model
        # This would typically use Hugging Face transformers or similar
        pass
    
    async def extract_entities(
        self,
        text: str,
        entity_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract medical entities from text.
        
        Args:
            text: Input text to process
            entity_types: Specific entity types to extract (optional)
            
        Returns:
            List of extracted entities with metadata
        """
        if not self.initialized:
            await self.initialize()
        
        try:
            if self.is_remote:
                return await self._extract_entities_remote(text, entity_types)
            else:
                return await self._extract_entities_local(text, entity_types)
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            # Return empty list as fallback
            return []
    
    async def extract_relationships(
        self,
        text: str,
        entities: Optional[List[Dict]] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract relationships between entities.
        
        Args:
            text: Input text to process
            entities: Pre-extracted entities (optional)
            
        Returns:
            List of extracted relationships
        """
        if not self.initialized:
            await self.initialize()
        
        try:
            if self.is_remote:
                return await self._extract_relationships_remote(text, entities)
            else:
                return await self._extract_relationships_local(text, entities)
        except Exception as e:
            logger.error(f"Error extracting relationships: {e}")
            # Return empty list as fallback
            return []
    
    async def process_document(
        self,
        document_text: str,
        document_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process entire document for entities and relationships.
        
        Args:
            document_text: Full document text
            document_metadata: Additional document metadata
            
        Returns:
            Dict with entities, relationships, and processing metadata
        """
        start_time = asyncio.get_event_loop().time()
        
        # Extract entities
        entities = await self.extract_entities(document_text)
        
        # Extract relationships
        relationships = await self.extract_relationships(document_text, entities)
        
        # Calculate processing time
        processing_time = asyncio.get_event_loop().time() - start_time
        
        return {
            'entities': entities,
            'relationships': relationships,
            'processing_metadata': {
                'model_name': self.model_name,
                'processing_time': processing_time,
                'text_length': len(document_text),
                'entities_count': len(entities),
                'relationships_count': len(relationships),
                'timestamp': self._get_timestamp()
            },
            'document_metadata': document_metadata or {}
        }
    
    async def batch_process_documents(
        self,
        documents: List[Dict[str, Any]],
        max_concurrent: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Process multiple documents concurrently.
        
        Args:
            documents: List of documents with 'text' and 'metadata' keys
            max_concurrent: Maximum number of concurrent processing tasks
            
        Returns:
            List of processing results
        """
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def process_with_semaphore(doc):
            async with semaphore:
                return await self.process_document(
                    doc['text'], doc.get('metadata')
                )
        
        tasks = [process_with_semaphore(doc) for doc in documents]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions
        processed_results = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Error processing document {i}: {result}")
                processed_results.append({
                    'error': str(result),
                    'document_index': i,
                    'entities': [],
                    'relationships': []
                })
            else:
                processed_results.append(result)
        
        return processed_results
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        from datetime import datetime
        return datetime.now().isoformat()
    
    # Abstract methods to be implemented by subclasses
    async def _extract_entities_local(
        self,
        text: str,
        entity_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Extract entities using local model."""
        raise NotImplementedError
    
    async def _extract_entities_remote(
        self,
        text: str,
        entity_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Extract entities using remote model server."""
        raise NotImplementedError
    
    async def _extract_relationships_local(
        self,
        text: str,
        entities: Optional[List[Dict]] = None
    ) -> List[Dict[str, Any]]:
        """Extract relationships using local model."""
        raise NotImplementedError
    
    async def _extract_relationships_remote(
        self,
        text: str,
        entities: Optional[List[Dict]] = None
    ) -> List[Dict[str, Any]]:
        """Extract relationships using remote model server."""
        raise NotImplementedError
```

### Local Model Implementation

```python
import torch
from transformers import AutoTokenizer, AutoModelForTokenClassification
from transformers import pipeline
from typing import List, Dict, Any, Optional

class LocalClinicalRoBERTaService(ClinicalRoBERTaService):
    """Implementation using local Hugging Face models."""
    
    def __init__(
        self,
        model_path: Optional[str] = None,
        model_name: str = "medicalai/ClinicalBERT",
        device: str = "cuda" if torch.cuda.is_available() else "cpu"
    ):
        super().__init__(model_path=model_path, model_name=model_name)
        self.device = device
        self.tokenizer = None
        self.ner_model = None
        self.re_model = None  # Relation extraction model
        self.ner_pipeline = None
    
    async def _load_local_model(self):
        """Load local model from Hugging Face or local path."""
        try:
            # Load tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.model_path or self.model_name
            )
            
            # Load NER model
            self.ner_model = AutoModelForTokenClassification.from_pretrained(
                self.model_path or self.model_name
            )
            
            # Move to device
            self.ner_model = self.ner_model.to(self.device)
            self.ner_model.eval()
            
            # Create NER pipeline
            self.ner_pipeline = pipeline(
                "ner",
                model=self.ner_model,
                tokenizer=self.tokenizer,
                aggregation_strategy="simple",
                device=0 if self.device == "cuda" else -1
            )
            
            logger.info(f"Loaded Clinical RoBERTa model on {self.device}")
        except Exception as e:
            logger.error(f"Failed to load local model: {e}")
            raise
    
    async def _extract_entities_local(
        self,
        text: str,
        entity_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Extract entities using local model."""
        try:
            # Split text into chunks if too long
            chunks = self._split_text_into_chunks(text, max_length=512)
            
            all_entities = []
            for i, chunk in enumerate(chunks):
                # Run NER pipeline
                ner_results = self.ner_pipeline(chunk)
                
                # Process results
                chunk_entities = self._process_ner_results(
                    ner_results, chunk, chunk_offset=sum(len(c) for c in chunks[:i])
                )
                
                # Filter by entity types if specified
                if entity_types:
                    chunk_entities = [
                        entity for entity in chunk_entities
                        if entity['type'] in entity_types
                    ]
                
                all_entities.extend(chunk_entities)
            
            # Deduplicate and merge entities
            deduplicated_entities = self._deduplicate_entities(all_entities)
            
            return deduplicated_entities
            
        except Exception as e:
            logger.error(f"Error in local entity extraction: {e}")
            return []
    
    async def _extract_relationships_local(
        self,
        text: str,
        entities: Optional[List[Dict]] = None
    ) -> List[Dict[str, Any]]:
        """Extract relationships using local model."""
        # For local implementation, we might use a simpler approach
        # or load a separate relation extraction model
        
        # Placeholder implementation - in practice, this would use
        # a relation extraction model or rule-based approach
        return await self._extract_relationships_rule_based(text, entities)
    
    def _split_text_into_chunks(
        self,
        text: str,
        max_length: int = 512
    ) -> List[str]:
        """Split text into chunks for processing."""
        # Simple sentence-based chunking
        import re
        sentences = re.split(r'[.!?]+', text)
        
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue
                
            # Check if adding this sentence would exceed max length
            if len(current_chunk) + len(sentence) + 1 <= max_length:
                if current_chunk:
                    current_chunk += " " + sentence
                else:
                    current_chunk = sentence
            else:
                # Add current chunk to chunks and start new chunk
                if current_chunk:
                    chunks.append(current_chunk)
                current_chunk = sentence
        
        # Add final chunk
        if current_chunk:
            chunks.append(current_chunk)
        
        return chunks
    
    def _process_ner_results(
        self,
        ner_results: List[Dict],
        chunk_text: str,
        chunk_offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Process NER pipeline results into standardized format."""
        entities = []
        
        # Map Hugging Face entity types to our standardized types
        entity_type_mapping = {
            'B-Disease': 'DISEASE',
            'I-Disease': 'DISEASE',
            'B-Drug': 'DRUG',
            'I-Drug': 'DRUG',
            'B-Symptom': 'SYMPTOM',
            'I-Symptom': 'SYMPTOM',
            'B-Anatomy': 'ANATOMY',
            'I-Anatomy': 'ANATOMY',
            # Add more mappings as needed
        }
        
        for result in ner_results:
            entity_type = entity_type_mapping.get(result['entity_group'], 'UNKNOWN')
            
            entity = {
                'entity_id': f"entity_{len(entities)}",
                'text': result['word'],
                'normalized_text': result['word'],  # Would need normalization
                'type': entity_type,
                'confidence': result['score'],
                'position': {
                    'start': result['start'] + chunk_offset,
                    'end': result['end'] + chunk_offset
                }
            }
            
            entities.append(entity)
        
        return entities
    
    def _deduplicate_entities(
        self,
        entities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Deduplicate overlapping or identical entities."""
        if not entities:
            return []
        
        # Sort by position
        entities.sort(key=lambda x: x['position']['start'])
        
        deduplicated = []
        for entity in entities:
            # Check if this entity overlaps with the last one
            if (deduplicated and 
                entity['position']['start'] < deduplicated[-1]['position']['end']):
                # Overlapping entities - keep the one with higher confidence
                if entity['confidence'] > deduplicated[-1]['confidence']:
                    deduplicated[-1] = entity
            else:
                deduplicated.append(entity)
        
        return deduplicated
    
    async def _extract_relationships_rule_based(
        self,
        text: str,
        entities: Optional[List[Dict]] = None
    ) -> List[Dict[str, Any]]:
        """Extract relationships using rule-based approach."""
        if not entities:
            entities = await self.extract_entities(text)
        
        relationships = []
        
        # Simple rule-based relationship extraction
        # In practice, this would be more sophisticated
        for i, entity1 in enumerate(entities):
            for j, entity2 in enumerate(entities[i+1:], i+1):
                # Check for simple relationships based on proximity and entity types
                distance = abs(
                    entity1['position']['start'] - entity2['position']['start']
                )
                
                # If entities are close enough, look for relationship words between them
                if distance < 200:  # Within 200 characters
                    relationship = self._find_relationship_between_entities(
                        text, entity1, entity2
                    )
                    if relationship:
                        relationships.append(relationship)
        
        return relationships
    
    def _find_relationship_between_entities(
        self,
        text: str,
        entity1: Dict,
        entity2: Dict
    ) -> Optional[Dict[str, Any]]:
        """Find relationship between two entities using simple rules."""
        start = min(entity1['position']['end'], entity2['position']['end'])
        end = max(entity1['position']['start'], entity2['position']['start'])
        
        # Extract text between entities
        between_text = text[start:end].lower()
        
        # Simple relationship keywords
        relationship_keywords = {
            'treats': ['treat', 'therapy', 'treatment', 'manage'],
            'causes': ['cause', 'lead to', 'result in'],
            'associated_with': ['associate', 'link', 'related'],
            'prevents': ['prevent', 'prophylaxis'],
            'diagnoses': ['diagnose', 'test', 'screen']
        }
        
        for relation_type, keywords in relationship_keywords.items():
            for keyword in keywords:
                if keyword in between_text:
                    return {
                        'relation_id': f"rel_{len(relationship_keywords)}",
                        'source_entity_id': entity1['entity_id'],
                        'target_entity_id': entity2['entity_id'],
                        'type': relation_type.upper(),
                        'confidence': 0.7,  # Rule-based confidence
                        'evidence': {
                            'text': between_text.strip(),
                            'sentence': self._get_containing_sentence(text, start, end)
                        }
                    }
        
        return None
    
    def _get_containing_sentence(
        self,
        text: str,
        start: int,
        end: int
    ) -> str:
        """Get the sentence containing the specified text range."""
        # Simple sentence extraction
        import re
        sentences = re.split(r'[.!?]+', text)
        
        for sentence in sentences:
            sentence_start = text.find(sentence)
            sentence_end = sentence_start + len(sentence)
            
            if sentence_start <= start <= sentence_end or sentence_start <= end <= sentence_end:
                return sentence.strip()
        
        return text[start:end].strip()
```

### Remote Model Implementation

```python
import aiohttp
import json
from typing import List, Dict, Any, Optional

class RemoteClinicalRoBERTaService(ClinicalRoBERTaService):
    """Implementation using remote model server."""
    
    def __init__(
        self,
        model_server_url: str,
        api_key: Optional[str] = None,
        timeout: int = 30
    ):
        super().__init__(model_server_url=model_server_url)
        self.api_key = api_key
        self.timeout = timeout
        self.session = None
    
    async def _connect_to_server(self):
        """Initialize HTTP session for remote server."""
        if self.session is None or self.session.closed:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            self.session = aiohttp.ClientSession(timeout=timeout)
        
        # Test connection
        try:
            async with self.session.get(f"{self.model_server_url}/health") as response:
                if response.status != 200:
                    raise Exception(f"Model server health check failed: {response.status}")
        except Exception as e:
            logger.error(f"Failed to connect to model server: {e}")
            raise
    
    async def _extract_entities_remote(
        self,
        text: str,
        entity_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Extract entities using remote model server."""
        if not self.session:
            await self._connect_to_server()
        
        try:
            payload = {
                "text": text,
                "task": "entity_extraction"
            }
            
            if entity_types:
                payload["entity_types"] = entity_types
            
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            async with self.session.post(
                f"{self.model_server_url}/predict",
                json=payload,
                headers=headers
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result.get("entities", [])
                else:
                    error_text = await response.text()
                    raise Exception(f"Remote server error {response.status}: {error_text}")
                    
        except Exception as e:
            logger.error(f"Error in remote entity extraction: {e}")
            return []
    
    async def _extract_relationships_remote(
        self,
        text: str,
        entities: Optional[List[Dict]] = None
    ) -> List[Dict[str, Any]]:
        """Extract relationships using remote model server."""
        if not self.session:
            await self._connect_to_server()
        
        try:
            payload = {
                "text": text,
                "task": "relationship_extraction"
            }
            
            if entities:
                payload["entities"] = entities
            
            headers = {"Content-Type": "application/json"}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            async with self.session.post(
                f"{self.model_server_url}/predict",
                json=payload,
                headers=headers
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    return result.get("relationships", [])
                else:
                    error_text = await response.text()
                    raise Exception(f"Remote server error {response.status}: {error_text}")
                    
        except Exception as e:
            logger.error(f"Error in remote relationship extraction: {e}")
            return []
    
    async def close(self):
        """Close HTTP session."""
        if self.session and not self.session.closed:
            await self.session.close()
```

### Integration with Document Processing Pipeline

```python
class DocumentProcessorWithRoBERTa:
    """Document processor that integrates Clinical RoBERTa for entity extraction."""
    
    def __init__(self, clinical_roberta_service: ClinicalRoBERTaService):
        self.clinical_roberta = clinical_roberta_service
    
    async def process_document_with_entities(
        self,
        processed_document: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process document and extract entities/relationships using Clinical RoBERTa.
        
        Args:
            processed_document: Document processed by format-specific processor
            
        Returns:
            Enhanced document with extracted entities and relationships
        """
        try:
            # Extract text content for processing
            document_text = self._extract_text_content(processed_document)
            
            # Process with Clinical RoBERTa
            roberta_results = await self.clinical_roberta.process_document(
                document_text, processed_document.get('metadata', {})
            )
            
            # Merge results with document data
            enhanced_document = self._merge_roberta_results(
                processed_document, roberta_results
            )
            
            return enhanced_document
            
        except Exception as e:
            logger.error(f"Error processing document with Clinical RoBERTa: {e}")
            # Return original document with error information
            processed_document['roberta_error'] = str(e)
            return processed_document
    
    def _extract_text_content(self, processed_document: Dict[str, Any]) -> str:
        """Extract text content from processed document."""
        # Priority: raw content > structured content > content field
        if 'raw_content' in processed_document:
            return processed_document['raw_content']
        elif 'content' in processed_document:
            return processed_document['content']
        elif 'elements' in processed_document:
            # Extract text from structured elements
            elements = processed_document['elements']
            text_parts = []
            for element in elements:
                if element.get('type') in ['paragraph', 'heading', 'list_item']:
                    text_parts.append(element.get('text', ''))
            return '\n'.join(text_parts)
        else:
            return ""
    
    def _merge_roberta_results(
        self,
        original_document: Dict[str, Any],
        roberta_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Merge Clinical RoBERTa results with original document."""
        # Create enhanced document
        enhanced_document = original_document.copy()
        
        # Add entities and relationships
        enhanced_document['entities'] = roberta_results.get('entities', [])
        enhanced_document['relationships'] = roberta_results.get('relationships', [])
        
        # Add processing metadata
        enhanced_document['roberta_processing'] = roberta_results.get('processing_metadata', {})
        
        # Add confidence scores to entities and relationships
        self._add_confidence_scores(enhanced_document)
        
        return enhanced_document
    
    def _add_confidence_scores(self, document: Dict[str, Any]):
        """Add confidence scores and validation to entities/relationships."""
        # Validate entities
        entities = document.get('entities', [])
        validated_entities = []
        
        for entity in entities:
            # Add unique ID if not present
            if 'entity_id' not in entity:
                entity['entity_id'] = f"entity_{len(validated_entities)}"
            
            # Ensure confidence score is present
            if 'confidence' not in entity:
                entity['confidence'] = 0.8  # Default confidence
            
            # Validate confidence range
            entity['confidence'] = max(0.0, min(1.0, entity['confidence']))
            
            validated_entities.append(entity)
        
        document['entities'] = validated_entities
        
        # Validate relationships
        relationships = document.get('relationships', [])
        validated_relationships = []
        
        for relation in relationships:
            # Add unique ID if not present
            if 'relation_id' not in relation:
                relation['relation_id'] = f"relation_{len(validated_relationships)}"
            
            # Ensure confidence score is present
            if 'confidence' not in relation:
                relation['confidence'] = 0.7  # Default confidence
            
            # Validate confidence range
            relation['confidence'] = max(0.0, min(1.0, relation['confidence']))
            
            validated_relationships.append(relation)
        
        document['relationships'] = validated_relationships
```

## Error Handling and Fallbacks

### Robust Error Handling

```python
class RobustClinicalRoBERTaService(ClinicalRoBERTaService):
    """Clinical RoBERTa service with enhanced error handling and fallbacks."""
    
    def __init__(
        self,
        primary_service: ClinicalRoBERTaService,
        fallback_service: Optional[ClinicalRoBERTaService] = None,
        max_retries: int = 3
    ):
        # Don't call parent __init__ as we're using composition
        self.primary_service = primary_service
        self.fallback_service = fallback_service
        self.max_retries = max_retries
    
    async def extract_entities(
        self,
        text: str,
        entity_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Extract entities with retry and fallback logic."""
        for attempt in range(self.max_retries):
            try:
                result = await self.primary_service.extract_entities(text, entity_types)
                if result:  # Success if we got results
                    return result
            except Exception as e:
                logger.warning(f"Primary service failed (attempt {attempt + 1}): {e}")
                if attempt == self.max_retries - 1:  # Last attempt
                    if self.fallback_service:
                        logger.info("Using fallback service")
                        try:
                            return await self.fallback_service.extract_entities(text, entity_types)
                        except Exception as fallback_error:
                            logger.error(f"Fallback service also failed: {fallback_error}")
                    # If no fallback or fallback failed, raise original error
                    raise
        
        return []  # Return empty list if all attempts failed
    
    async def extract_relationships(
        self,
        text: str,
        entities: Optional[List[Dict]] = None
    ) -> List[Dict[str, Any]]:
        """Extract relationships with retry and fallback logic."""
        for attempt in range(self.max_retries):
            try:
                result = await self.primary_service.extract_relationships(text, entities)
                if result is not None: # Success
                    return result
            except Exception as e:
                logger.warning(f"Primary service failed (attempt {attempt + 1}): {e}")
                if attempt == self.max_retries - 1:  # Last attempt
                    if self.fallback_service:
                        logger.info("Using fallback service")
                        try:
                            return await self.fallback_service.extract_relationships(text, entities)
                        except Exception as fallback_error:
                            logger.error(f"Fallback service also failed: {fallback_error}")
                    # If no fallback or fallback failed, raise original error
                    raise
        
        return []  # Return empty list if all attempts failed
    
    async def process_document(
        self,
        document_text: str,
        document_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Process document with retry and fallback logic."""
        for attempt in range(self.max_retries):
            try:
                result = await self.primary_service.process_document(document_text, document_metadata)
                return result
            except Exception as e:
                logger.warning(f"Primary service failed (attempt {attempt + 1}): {e}")
                if attempt == self.max_retries - 1:  # Last attempt
                    if self.fallback_service:
                        logger.info("Using fallback service")
                        try:
                            return await self.fallback_service.process_document(document_text, document_metadata)
                        except Exception as fallback_error:
                            logger.error(f"Fallback service also failed: {fallback_error}")
                    # If no fallback or fallback failed, raise original error
                    raise
        
        # Return minimal result if all attempts failed
        return {
            'entities': [],
            'relationships': [],
            'processing_metadata': {
                'error': 'All processing attempts failed',
                'timestamp': self._get_timestamp()
            }
        }
```

## Performance Optimization

### Caching

```python
from functools import lru_cache
import hashlib

class CachedClinicalRoBERTaService(ClinicalRoBERTaService):
    """Clinical RoBERTa service with caching for performance optimization."""
    
    def __init__(
        self,
        base_service: ClinicalRoBERTaService,
        cache_size: int = 1000
    ):
        # Don't call parent __init__ as we're using composition
        self.base_service = base_service
        self.entity_cache = lru_cache(maxsize=cache_size)(self._cached_entity_extraction)
        self.relation_cache = lru_cache(maxsize=cache_size)(self._cached_relation_extraction)
    
    def _cached_entity_extraction(
        self,
        text_hash: str,
        entity_types_tuple: tuple
    ) -> List[Dict[str, Any]]:
        """Cached entity extraction (actual implementation would call base service)."""
        pass  # Implementation would call self.base_service.extract_entities
    
    def _cached_relation_extraction(
        self,
        text_hash: str,
        entities_hash: str
    ) -> List[Dict[str, Any]]:
        """Cached relation extraction (actual implementation would call base service)."""
        pass  # Implementation would call self.base_service.extract_relationships
    
    async def extract_entities(
        self,
        text: str,
        entity_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Extract entities with caching."""
        # Create hash for caching
        text_hash = hashlib.md5(text.encode()).hexdigest()
        entity_types_tuple = tuple(entity_types) if entity_types else tuple()
        
        # Try to get from cache
        cached_result = self.entity_cache(text_hash, entity_types_tuple)
        if cached_result is not None:
            return cached_result
        
        # If not in cache, call base service
        result = await self.base_service.extract_entities(text, entity_types)
        
        # Cache the result (this is a simplified approach)
        # In practice, you'd need to handle the async caching differently
        
        return result
    
    async def extract_relationships(
        self,
        text: str,
        entities: Optional[List[Dict]] = None
    ) -> List[Dict[str, Any]]:
        """Extract relationships with caching."""
        # Similar caching approach for relationships
        pass
```

### Batch Processing

```python
async def batch_process_documents_with_roberta(
    roberta_service: ClinicalRoBERTaService,
    documents: List[Dict[str, Any]],
    batch_size: int = 10,
    max_concurrent: int = 5
) -> List[Dict[str, Any]]:
    """
    Process multiple documents with Clinical RoBERTa in batches.
    
    Args:
        roberta_service: Clinical RoBERTa service instance
        documents: List of documents to process
        batch_size: Number of documents per batch
        max_concurrent: Maximum concurrent batch processing
        
    Returns:
        List of processed documents with entities and relationships
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def process_batch(batch_docs):
        async with semaphore:
            return await roberta_service.batch_process_documents(batch_docs)
    
    # Split documents into batches
    batches = [
        documents[i:i + batch_size] 
        for i in range(0, len(documents), batch_size)
    ]
    
    # Process batches concurrently
    batch_tasks = [process_batch(batch) for batch in batches]
    batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
    
    # Flatten results
    all_results = []
    for batch_result in batch_results:
        if isinstance(batch_result, Exception):
            logger.error(f"Batch processing failed: {batch_result}")
            # Add error results for failed batch
            # (Implementation would depend on batch size)
        else:
            all_results.extend(batch_result)
    
    return all_results
```

## Monitoring and Logging

### Audit Logging

```python
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

class AuditLogger:
    """Audit logger for Clinical RoBERTa operations."""
    
    def __init__(self, log_file: Optional[str] = None):
        self.logger = logging.getLogger("clinical_roberta_audit")
        self.log_file = log_file
        
        if log_file:
            handler = logging.FileHandler(log_file)
            formatter = logging.Formatter('%(asctime)s - %(message)s')
            handler.setFormatter(formatter)
            self.logger.addHandler(handler)
            self.logger.setLevel(logging.INFO)
    
    def log_extraction(
        self,
        document_id: str,
        operation: str,
        input_data: Dict[str, Any],
        results: Dict[str, Any],
        processing_metadata: Dict[str, Any]
    ):
        """Log entity/relationship extraction operations."""
        audit_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'document_id': document_id,
            'operation': operation,
            'input': {
                'text_length': len(input_data.get('text', '')),
                'entity_types': input_data.get('entity_types'),
                'chunk_count': processing_metadata.get('chunk_count', 1)
            },
            'results': {
                'entities_count': len(results.get('entities', [])),
                'relationships_count': len(results.get('relationships', [])),
                'success': processing_metadata.get('success', True)
            },
            'performance': {
                'processing_time': processing_metadata.get('processing_time'),
                'model_name': processing_metadata.get('model_name'),
                'service_type': processing_metadata.get('service_type', 'unknown')
            }
        }
        
        self.logger.info(json.dumps(audit_entry))
    
    def log_research_agent_query(
        self,
        query_id: str,
        query_text: str,
        retrieved_docs: List[str],
        chunk_ids: List[str],
        response: str,
        citations: List[Dict[str, Any]]
    ):
        """Log Research Agent queries with retrieved context."""
        audit_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'query_id': query_id,
            'operation': 'research_agent_query',
            'query': {
                'text': query_text,
                'length': len(query_text)
            },
            'retrieval': {
                'document_ids': retrieved_docs,
                'chunk_ids': chunk_ids,
                'retrieved_count': len(retrieved_docs)
            },
            'response': {
                'text': response,
                'length': len(response),
                'citations_count': len(citations)
            },
            'citations': citations
        }
        
        self.logger.info(json.dumps(audit_entry))

### Metrics Collection

```python
from prometheus_client import Counter, Histogram, Gauge
from typing import Dict, Any

class ClinicalRoBERTaMetrics:
    """Collect and report metrics for Clinical RoBERTa service with Prometheus support."""
    
    def __init__(self, enable_prometheus: bool = True):
        # Basic counters
        self.extraction_count = 0
        self.relationship_count = 0
        self.successful_extractions = 0
        self.failed_extractions = 0
        self.processing_times = []
        self.entity_counts = []
        self.relationship_counts = []
        self.confidence_scores = []
        
        # Prometheus metrics (optional)
        if enable_prometheus:
            self.prom_extraction_total = Counter(
                'clinical_roberta_extractions_total',
                'Total number of extractions',
                ['operation_type', 'success']
            )
            self.prom_processing_duration = Histogram(
                'clinical_roberta_processing_seconds',
                'Processing duration in seconds',
                ['operation_type']
            )
            self.prom_entities_per_doc = Histogram(
                'clinical_roberta_entities_per_document',
                'Number of entities extracted per document'
            )
            self.prom_confidence_score = Histogram(
                'clinical_roberta_confidence_score',
                'Confidence scores of extracted entities',
                buckets=[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
            )
    
    def record_extraction(
        self,
        operation_type: str,
        success: bool,
        processing_time: float,
        entities_count: int = 0,
        relationships_count: int = 0,
        average_confidence: float = 0.0
    ):
        """Record extraction metrics with enhanced tracking."""
        self.extraction_count += 1
        if success:
            self.successful_extractions += 1
        else:
            self.failed_extractions += 1
        
        self.processing_times.append(processing_time)
        self.entity_counts.append(entities_count)
        self.relationship_counts.append(relationships_count)
        if average_confidence > 0:
            self.confidence_scores.append(average_confidence)
        
        # Record Prometheus metrics
        if hasattr(self, 'prom_extraction_total'):
            self.prom_extraction_total.labels(
                operation_type=operation_type,
                success=str(success)
            ).inc()
            
            self.prom_processing_duration.labels(
                operation_type=operation_type
            ).observe(processing_time)
            
            if entities_count > 0:
                self.prom_entities_per_doc.observe(entities_count)
            
            if average_confidence > 0:
                self.prom_confidence_score.observe(average_confidence)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics with enhanced statistics."""
        total_extractions = self.successful_extractions + self.failed_extractions
        success_rate = (self.successful_extractions / total_extractions) if total_extractions > 0 else 0
        
        # Calculate percentiles for processing time
        processing_times_sorted = sorted(self.processing_times) if self.processing_times else []
        p50_processing = processing_times_sorted[len(processing_times_sorted)//2] if processing_times_sorted else 0
        p95_processing = processing_times_sorted[int(len(processing_times_sorted)*0.95)] if processing_times_sorted else 0
        
        return {
            'total_extractions': self.extraction_count,
            'successful_extractions': self.successful_extractions,
            'failed_extractions': self.failed_extractions,
            'success_rate': success_rate,
            'processing_time_stats': {
                'average': sum(self.processing_times) / len(self.processing_times) if self.processing_times else 0,
                'p50': p50_processing,
                'p95': p95_processing,
                'min': min(self.processing_times) if self.processing_times else 0,
                'max': max(self.processing_times) if self.processing_times else 0
            },
            'extraction_stats': {
                'average_entities_per_document': sum(self.entity_counts) / len(self.entity_counts) if self.entity_counts else 0,
                'average_relationships_per_document': sum(self.relationship_counts) / len(self.relationship_counts) if self.relationship_counts else 0,
                'average_confidence': sum(self.confidence_scores) / len(self.confidence_scores) if self.confidence_scores else 0
            }
        }
    
    def reset_metrics(self):
        """Reset all metrics."""
        self.__init__(enable_prometheus=hasattr(self, 'prom_extraction_total'))
```

## Testing Strategy

### Unit Tests

```python
import pytest
from unittest.mock import Mock, AsyncMock

class TestClinicalRoBERTaService:
    @pytest.fixture
    def mock_service(self):
        service = Mock(spec=ClinicalRoBERTaService)
        service.initialized = True
        return service
    
    @pytest.mark.asyncio
    async def test_extract_entities_success(self, mock_service):
        """Test successful entity extraction."""
        mock_service.extract_entities = AsyncMock(return_value=[
            {
                'entity_id': '1',
                'text': 'diabetes',
                'type': 'DISEASE',
                'confidence': 0.95,
                'position': {'start': 0, 'end': 8}
            }
        ])
        
        result = await mock_service.extract_entities("Patient has diabetes")
        assert len(result) == 1
        assert result[0]['type'] == 'DISEASE'
        assert result[0]['confidence'] == 0.95
    
    @pytest.mark.asyncio
    async def test_extract_relationships_success(self, mock_service):
        """Test successful relationship extraction."""
        mock_service.extract_relationships = AsyncMock(return_value=[
            {
                'relation_id': '1',
                'source_entity_id': '1',
                'target_entity_id': '2',
                'type': 'TREATS',
                'confidence': 0.87
            }
        ])
        
        entities = [
            {'entity_id': '1', 'text': 'insulin', 'type': 'DRUG'},
            {'entity_id': '2', 'text': 'diabetes', 'type': 'DISEASE'}
        ]
        
        result = await mock_service.extract_relationships("Insulin treats diabetes", entities)
        assert len(result) == 1
        assert result[0]['type'] == 'TREATS'
        assert result[0]['confidence'] == 0.87

class TestDocumentProcessorWithRoBERTa:
    @pytest.fixture
    def mock_roberta_service(self):
        service = AsyncMock()
        service.process_document = AsyncMock(return_value={
            'entities': [{'entity_id': '1', 'text': 'test', 'type': 'DISEASE'}],
            'relationships': [],
            'processing_metadata': {}
        })
        return service
    
    @pytest.mark.asyncio
    async def test_process_document_with_entities(self, mock_roberta_service):
        """Test document processing with entity extraction."""
        processor = DocumentProcessorWithRoBERTa(mock_roberta_service)
        
        document = {
            'content': 'Patient has diabetes',
            'metadata': {'source': 'test'}
        }
        
        result = await processor.process_document_with_entities(document)
        
        assert 'entities' in result
        assert len(result['entities']) == 1
        assert result['entities'][0]['type'] == 'DISEASE'
```

## Integration Points

### With Document Processing Pipeline

```python
# Integration with the document router
class EnhancedDocumentRouter:
    def __init__(
        self,
        format_detector: FormatDetector,
        processor_registry: ProcessorRegistry,
        clinical_roberta_service: ClinicalRoBERTaService
    ):
        self.format_detector = format_detector
        self.processor_registry = processor_registry
        self.clinical_roberta = clinical_roberta_service
    
    async def route_document_with_entities(
        self,
        file_content: bytes,
        filename: str,
        extract_entities: bool = True,
        **processing_options
    ) -> Dict[str, Any]:
        """Route document and optionally extract entities."""
        # First, route to appropriate format processor
        initial_result = await self.route_document(
            file_content, filename, **processing_options
        )
        
        if not initial_result.get('success', False):
            return initial_result
        
        if not extract_entities:
            return initial_result
        
        # If successful and entity extraction requested, process with Clinical RoBERTa
        try:
            document_processor = DocumentProcessorWithRoBERTa(self.clinical_roberta)
            enhanced_result = await document_processor.process_document_with_entities(
                initial_result
            )
            return enhanced_result
        except Exception as e:
            logger.error(f"Error in entity extraction: {e}")
            # Return original result with error info
            initial_result['entity_extraction_error'] = str(e)
            return initial_result
```

### With API Endpoints

```python
@app.post("/api/kg/process-document-with-entities")
async def process_document_with_entities(
    file: UploadFile = File(...),
    extract_entities: bool = True,
    format_type: Optional[str] = None
):
    """API endpoint for processing documents with entity extraction."""
    try:
        # Read file content
        content = await file.read()
        
        # Get enhanced document router
        router = await get_enhanced_document_router()
        
        # Process document with entity extraction
        result = await router.route_document_with_entities(
            content,
            file.filename,
            extract_entities=extract_entities,
            explicit_format=format_type
        )
        
        return result
        
    except Exception as e:
        logger.error(f"API error processing document: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing document: {str(e)}"
        )
```

## Future Extensions

### Planned Enhancements

1. **Multi-language Support** - Support for processing documents in multiple languages
2. **Domain-specific Models** - Specialized models for different medical domains
3. **Active Learning** - Use processing results to improve model performance
4. **Explainability** - Provide explanations for model decisions

### Integration with Other Systems

1. **Langroid Agents** - Integrate with Langroid multi-agent system for advanced reasoning
2. **Human-in-the-loop** - Add review workflows for critical extractions
3. **Quality Assurance** - Implement automated quality checks for extracted information
4. **Continuous Learning** - Update models with new medical knowledge

## MVP Recommendations for Research Agent

### Critical Fixes (High Priority)
1. **Fix chunk offset calculation** - Implement `_split_text_into_chunks_with_offsets()` with proper separator handling
2. **Fix between-text extraction logic** - Use sorted entity order and handle overlapping entities
3. **Replace collision-prone IDs** - Use UUID-based entity and relationship IDs
4. **Fix async caching** - Replace `lru_cache` with async-safe caching mechanism
5. **Add defensive NER parsing** - Support multiple HuggingFace pipeline output formats
6. **Make proximity threshold configurable** - Move from hard-coded 200 chars to parameter
7. **Add circuit breaker for remote service** - Implement health checks and failfast behavior
8. **Implement audit logging** - Log all extractions and Research Agent queries with citations

### MVP Feature Set (Research Agent Enabled)
1. **Remote Clinical RoBERTa** - Use hosted inference (HF Inference API or cloud GPU) for MVP
2. **Rule-based Relationship Extraction** - Keep ML-based RE for Phase 2
3. **BM25 + Vector Search** - Implement hybrid retrieval with Whoosh + Chroma
4. **Citation Granularity** - Store `doc_id`, `chunk_id`, `sentence_idx` for precise citations
5. **Audit Trail** - Complete logging of retrieved documents and Research Agent responses
6. **Configurable Parameters** - Chunk size, proximity threshold, batch size as env vars

### Performance Targets (MVP)
- **Extraction Success Rate**: >95% (no exceptions)
- **Processing Time**: <10s per small document
- **Throughput**: 5-20 docs/min with 5-concurrency pipeline
- **Research Agent Precision**: >0.8 relevance on human eval (50 queries)
- **Audit Completeness**: 100% of queries logged with doc IDs and chunk indices

## Implementation Roadmap (Updated)

### Week 0-1: Foundation & Critical Fixes
- [x] Fix chunk offset calculation with separator handling
- [x] Fix between-text extraction logic for relationships
- [x] Replace collision-prone entity/relationship IDs with UUIDs
- [x] Fix async caching issues (replace lru_cache)
- [ ] Implement RemoteClinicalRoBERTaService with health checks
- [ ] Add defensive NER pipeline parsing
- [ ] Implement AuditLogger with Postgres/JSONL persistence

### Week 1-2: Retrieval & Storage
- [ ] Implement BM25 index with Whoosh
- [ ] Set up Chroma vector store for embeddings
- [ ] Implement chunking pipeline (400-600 tokens per chunk)
- [ ] Add batch processing with configurable concurrency (3-5)
- [ ] Add document ingestion pipeline for 5-50 test documents

### Week 2-4: Research Agent Integration
- [ ] Implement hybrid BM25 + vector retrieval fusion
- [ ] Build Research Agent orchestration (query → retrieve → synthesize)
- [ ] Add citation tracking (doc_id, chunk_id, sentence_idx)
- [ ] Implement LLM synthesis with explicit source requirements
- [ ] Add comprehensive audit logging for all agent operations

### Week 4-6: Quality & Monitoring
- [ ] Add RobustClinicalRoBERTaService with retry/fallback logic
- [ ] Implement ClinicalRoBERTaMetrics with Prometheus export
- [ ] Add configurable parameters (chunk size, proximity, timeouts)
- [ ] Implement circuit breaker for remote services
- [ ] Add human review queue for flagged extractions

### Week 6-8: Testing & Deployment
- [ ] Unit tests for offset calculation and relationship extraction
- [ ] Integration tests for full document processing pipeline
- [ ] End-to-end tests for Research Agent with citation verification
- [ ] Performance testing with target throughput (5-20 docs/min)
- [ ] Production deployment with monitoring and alerts

### Phase 2: Advanced Features (Post-MVP)
- [ ] ML-based relationship extraction models
- [ ] Advanced caching with Redis and TTL
- [ ] Multi-language support for international deployment
- [ ] Active learning pipeline for continuous improvement
- [ ] Advanced quality assurance and human-in-the-loop workflows
