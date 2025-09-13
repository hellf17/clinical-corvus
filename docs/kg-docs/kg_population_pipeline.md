# Knowledge Graph Population Pipeline Design

## Overview

This document outlines the design for the Knowledge Graph (KG) population pipeline that ingests curated medical sources into the Clinical Corvus Knowledge Graph. The pipeline processes various data formats, extracts entities and relationships using Clinical RoBERTa, validates information quality, and populates the Neo4j database with structured medical knowledge.

## Pipeline Architecture

### Core Components

1. **Source Connector Layer** - Interfaces with various data sources
2. **Preprocessing Layer** - Processes and normalizes source data
3. **Entity Extraction Layer** - Identifies medical entities using Clinical RoBERTa
4. **Relationship Extraction Layer** - Identifies relationships between entities
5. **Validation Layer** - Validates extracted information quality
6. **Transformation Layer** - Transforms data to KG schema format
7. **Loading Layer** - Loads validated data into Neo4j database
8. **Monitoring Layer** - Tracks pipeline performance and quality metrics

### Data Flow

```
[Curated Sources]
       ↓
[Source Connectors]
       ↓
[Preprocessing]
       ↓
[Entity Extraction] → [Clinical RoBERTa]
       ↓
[Relationship Extraction] → [Clinical RoBERTa]
       ↓
[Validation & Quality Scoring]
       ↓
[Transformation to KG Schema]
       ↓
[Neo4j Database Loading]
       ↓
[Monitoring & Metrics Collection]
```

## Source Connector Layer

### Supported Source Types

#### Medical Literature Databases
```python
class PubMedConnector:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
    
    async def fetch_articles(
        self,
        query: str,
        max_results: int = 1000,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch articles from PubMed based on search criteria."""
        # Implementation details for PubMed API integration
        pass
    
    async def fetch_article_details(
        self,
        pmids: List[str]
    ) -> List[Dict[str, Any]]:
        """Fetch detailed article information by PMID."""
        # Implementation for fetching full article details
        pass

class EuropePMCConnector:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = "https://www.ebi.ac.uk/europepmc/webservices/rest"
    
    async def search_articles(
        self,
        query: str,
        max_results: int = 1000
    ) -> List[Dict[str, Any]]:
        """Search articles in Europe PMC."""
        # Implementation for Europe PMC search
        pass

class LensScholarConnector:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://api.lens.org/scholar"
    
    async def search_patents(
        self,
        query: str,
        max_results: int = 1000
    ) -> List[Dict[str, Any]]:
        """Search patents in Lens Scholar."""
        # Implementation for patent search
        pass
```

#### Clinical Guidelines and Protocols
```python
class GuidelineConnector:
    def __init__(self):
        self.supported_sources = [
            "cdc", "who", "nih", "aha", "acc", "esmo", "nccn"
        ]
    
    async def fetch_guidelines(
        self,
        organization: str,
        specialty: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch clinical guidelines from supported organizations."""
        # Implementation for fetching guidelines
        pass
    
    async def parse_guideline_document(
        self,
        document_url: str
    ) -> Dict[str, Any]:
        """Parse guideline document and extract recommendations."""
        # Implementation for document parsing
        pass
```

#### Medical Ontologies
```python
class OntologyConnector:
    def __init__(self):
        self.ontologies = {
            "snomed": "https://browser.ihtsdotools.org/snowstorm/snomed-ct",
            "umls": "https://uts-ws.nlm.nih.gov/rest",
            "mesh": "https://meshb.nlm.nih.gov/api",
            "icd": "https://icd.who.int/dev11"
        }
    
    async def fetch_concepts(
        self,
        ontology: str,
        query: str,
        max_results: int = 1000
    ) -> List[Dict[str, Any]]:
        """Fetch concepts from specified ontology."""
        # Implementation for ontology concept fetching
        pass
    
    async def fetch_hierarchy(
        self,
        ontology: str,
        concept_id: str
    ) -> Dict[str, Any]:
        """Fetch concept hierarchy from ontology."""
        # Implementation for hierarchy fetching
        pass
```

### Source Data Models

#### Article Model
```python
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
from datetime import datetime

@dataclass
class MedicalArticle:
    id: str
    title: str
    abstract: str
    full_text: Optional[str]
    authors: List[str]
    publication_date: datetime
    journal: str
    volume: Optional[str]
    issue: Optional[str]
    pages: Optional[str]
    doi: Optional[str]
    pmid: Optional[str]
    pmcid: Optional[str]
    mesh_terms: List[str]
    keywords: List[str]
    affiliations: List[str]
    funding: List[str]
    conflicts_of_interest: List[str]
    study_type: Optional[str]
    sample_size: Optional[int]
    duration: Optional[str]
    source: str  # PubMed, EuropePMC, etc.
    confidence: float = 1.0
    created_date: datetime = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "title": self.title,
            "abstract": self.abstract,
            "full_text": self.full_text,
            "authors": self.authors,
            "publication_date": self.publication_date.isoformat(),
            "journal": self.journal,
            "volume": self.volume,
            "issue": self.issue,
            "pages": self.pages,
            "doi": self.doi,
            "pmid": self.pmid,
            "pmcid": self.pmcid,
            "mesh_terms": self.mesh_terms,
            "keywords": self.keywords,
            "affiliations": self.affiliations,
            "funding": self.funding,
            "conflicts_of_interest": self.conflicts_of_interest,
            "study_type": self.study_type,
            "sample_size": self.sample_size,
            "duration": self.duration,
            "source": self.source,
            "confidence": self.confidence,
            "created_date": self.created_date.isoformat()
        }
```

#### Guideline Model
```python
@dataclass
class ClinicalGuideline:
    id: str
    title: str
    organization: str
    publication_date: datetime
    version: str
    url: str
    recommendations: List[Dict[str, Any]]
    target_population: str
    evidence_level: str
    last_reviewed: Optional[datetime]
    related_guidelines: List[str]
    key_points: List[str]
    limitations: List[str]
    implementation: List[str]
    source: str
    confidence: float = 1.0
    created_date: datetime = datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "id": self.id,
            "title": self.title,
            "organization": self.organization,
            "publication_date": self.publication_date.isoformat(),
            "version": self.version,
            "url": self.url,
            "recommendations": self.recommendations,
            "target_population": self.target_population,
            "evidence_level": self.evidence_level,
            "last_reviewed": self.last_reviewed.isoformat() if self.last_reviewed else None,
            "related_guidelines": self.related_guidelines,
            "key_points": self.key_points,
            "limitations": self.limitations,
            "implementation": self.implementation,
            "source": self.source,
            "confidence": self.confidence,
            "created_date": self.created_date.isoformat()
        }
```

## Preprocessing Layer

### Document Preprocessing

#### Text Normalization
```python
import re
from typing import Dict, Any, List
import unicodedata

class TextPreprocessor:
    def __init__(self):
        self.normalization_rules = [
            self._normalize_unicode,
            self._remove_extra_whitespace,
            self._normalize_medical_abbreviations,
            self._normalize_numbers,
            self._handle_line_breaks
        ]
    
    def preprocess_text(self, text: str) -> str:
        """Apply all normalization rules to text."""
        processed_text = text
        for rule in self.normalization_rules:
            processed_text = rule(processed_text)
        return processed_text
    
    def _normalize_unicode(self, text: str) -> str:
        """Normalize unicode characters."""
        return unicodedata.normalize('NFKC', text)
    
    def _remove_extra_whitespace(self, text: str) -> str:
        """Remove extra whitespace and normalize spaces."""
        # Replace multiple spaces with single space
        text = re.sub(r'\s+', ' ', text)
        # Remove leading/trailing whitespace
        text = text.strip()
        return text
    
    def _normalize_medical_abbreviations(self, text: str) -> str:
        """Normalize common medical abbreviations."""
        abbreviations = {
            r'\bm\.g\.d\.?\b': 'major gastrointestinal disorder',
            r'\bc\.o\.p\.d\.?\b': 'chronic obstructive pulmonary disease',
            r'\bd\.m\.?\b': 'diabetes mellitus',
            r'\bh\.t\.?\b': 'hypertension',
            r'\ba\.s\.t\.?\b': 'aspartate transaminase',
            r'\ba\.l\.t\.?\b': 'alanine transaminase'
        }
        
        for pattern, replacement in abbreviations.items():
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        
        return text
    
    def _normalize_numbers(self, text: str) -> str:
        """Normalize number formats."""
        # Normalize decimal points
        text = re.sub(r'(\d),(\d)', r'\1.\2', text)
        # Normalize thousands separators
        text = re.sub(r'(\d)\.(\d{3})(?!\d)', r'\1\2', text)
        return text
    
    def _handle_line_breaks(self, text: str) -> str:
        """Handle line breaks appropriately."""
        # Remove line breaks within sentences
        text = re.sub(r'([a-z])- *\n *([a-z])', r'\1\2', text)
        # Replace paragraph breaks with double newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text
```

#### Structure Extraction
```python
class StructureExtractor:
    def __init__(self):
        self.section_patterns = {
            'abstract': [r'abstract', r'resumo'],
            'introduction': [r'introduction', r'introdu..o'],
            'methods': [r'methods?', r'materials? and methods?'],
            'results': [r'results?', r'achados', r'findings'],
            'discussion': [r'discussion', r'discuss..o'],
            'conclusion': [r'conclusion', r'conclus..o'],
            'references': [r'references?', r'refer..ncias']
        }
    
    def extract_structure(
        self,
        text: str
    ) -> Dict[str, Any]:
        """Extract document structure."""
        sections = {}
        
        # Split text into lines for processing
        lines = text.split('\n')
        
        current_section = 'introduction'  # Default starting section
        section_content = []
        
        for line in lines:
            line_lower = line.lower().strip()
            
            # Check if this line indicates a new section
            new_section = self._identify_section(line_lower)
            if new_section:
                # Save previous section
                if section_content:
                    sections[current_section] = '\n'.join(section_content)
                
                # Start new section
                current_section = new_section
                section_content = []
            else:
                # Add line to current section
                section_content.append(line)
        
        # Save final section
        if section_content:
            sections[current_section] = '\n'.join(section_content)
        
        return sections
    
    def _identify_section(self, line: str) -> Optional[str]:
        """Identify section from line content."""
        for section, patterns in self.section_patterns.items():
            for pattern in patterns:
                if re.search(rf'^\s*{pattern}\s*[.:]?\s*$', line, re.IGNORECASE):
                    return section
        return None
```

## Entity Extraction Layer

### Clinical RoBERTa Integration

#### Entity Extractor
```python
import asyncio
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class EntityExtractor:
    def __init__(self, clinical_roberta_service):
        self.clinical_roberta = clinical_roberta_service
        self.entity_types = [
            'DISEASE', 'DRUG', 'SYMPTOM', 'PROCEDURE', 
            'ANATOMY', 'GENE', 'PROTEIN', 'ORGANISM'
        ]
    
    async def extract_entities(
        self,
        document: Dict[str, Any],
        entity_types: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Extract entities from document using Clinical RoBERTa."""
        if entity_types is None:
            entity_types = self.entity_types
        
        extracted_entities = []
        
        # Extract entities from different document sections
        sections_to_process = [
            document.get('abstract', ''),
            document.get('full_text', ''),
            document.get('introduction', ''),
            document.get('methods', ''),
            document.get('results', ''),
            document.get('discussion', '')
        ]
        
        # Process sections concurrently for better performance
        tasks = [
            self._extract_from_section(section, entity_types)
            for section in sections_to_process
            if section
        ]
        
        section_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine results from all sections
        for result in section_results:
            if isinstance(result, Exception):
                logger.error(f"Error extracting entities from section: {result}")
                continue
            if result:
                extracted_entities.extend(result)
        
        # Deduplicate entities based on text and position overlap
        deduplicated_entities = self._deduplicate_entities(extracted_entities)
        
        # Add document context to entities
        contextualized_entities = self._add_document_context(
            deduplicated_entities, document
        )
        
        return contextualized_entities
    
    async def _extract_from_section(
        self,
        text: str,
        entity_types: List[str]
    ) -> List[Dict[str, Any]]:
        """Extract entities from a single text section."""
        try:
            # Split long texts into chunks to avoid model limitations
            chunks = self._chunk_text(text, max_length=1000)
            
            all_entities = []
            for chunk in chunks:
                entities = await self.clinical_roberta.extract_entities(
                    chunk, entity_types=entity_types
                )
                all_entities.extend(entities)
            
            return all_entities
        except Exception as e:
            logger.error(f"Error extracting entities from section: {e}")
            return []
    
    def _chunk_text(
        self,
        text: str,
        max_length: int = 1000
    ) -> List[str]:
        """Split text into manageable chunks."""
        if len(text) <= max_length:
            return [text]
        
        # Split by sentences to maintain context
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
                    current_chunk += ". " + sentence
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
    
    def _deduplicate_entities(
        self,
        entities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Remove duplicate entities based on text overlap."""
        if not entities:
            return []
        
        # Sort by position to process in order
        entities.sort(key=lambda x: x.get('start', 0))
        
        deduplicated = []
        for entity in entities:
            # Check if this entity overlaps with the last one
            if (deduplicated and 
                entity.get('start', 0) < deduplicated[-1].get('end', 0)):
                # Overlapping entities - keep the one with higher confidence
                if entity.get('confidence', 0) > deduplicated[-1].get('confidence', 0):
                    deduplicated[-1] = entity
            else:
                deduplicated.append(entity)
        
        return deduplicated
    
    def _add_document_context(
        self,
        entities: List[Dict[str, Any]],
        document: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Add document context to extracted entities."""
        contextualized = []
        
        for entity in entities:
            contextualized_entity = entity.copy()
            contextualized_entity['document_id'] = document.get('id')
            contextualized_entity['document_source'] = document.get('source')
            contextualized_entity['document_publication_date'] = document.get('publication_date')
            contextualized_entity['extraction_timestamp'] = self._get_timestamp()
            contextualized.append(contextualized_entity)
        
        return contextualized
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        from datetime import datetime
        return datetime.now().isoformat()
```

## Relationship Extraction Layer

### Relationship Extractor

```python
class RelationshipExtractor:
    def __init__(self, clinical_roberta_service):
        self.clinical_roberta = clinical_roberta_service
        self.relationship_types = [
            'CAUSES', 'TREATS', 'SIDE_EFFECT', 'ASSOCIATED_WITH',
            'CONTRAINDICATED', 'DIAGNOSES', 'PREVENTS', 'MANIFESTATION'
        ]
    
    async def extract_relationships(
        self,
        document: Dict[str, Any],
        entities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Extract relationships between entities."""
        extracted_relationships = []
        
        # Extract relationships from different document sections
        sections_to_process = [
            document.get('abstract', ''),
            document.get('full_text', ''),
            document.get('results', ''),
            document.get('discussion', '')
        ]
        
        # Process sections concurrently
        tasks = [
            self._extract_from_section(section, entities)
            for section in sections_to_process
            if section
        ]
        
        section_results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Combine results from all sections
        for result in section_results:
            if isinstance(result, Exception):
                logger.error(f"Error extracting relationships from section: {result}")
                continue
            if result:
                extracted_relationships.extend(result)
        
        # Deduplicate relationships
        deduplicated_relationships = self._deduplicate_relationships(
            extracted_relationships
        )
        
        # Add document context
        contextualized_relationships = self._add_document_context(
            deduplicated_relationships, document
        )
        
        return contextualized_relationships
    
    async def _extract_from_section(
        self,
        text: str,
        entities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Extract relationships from a single text section."""
        try:
            # Split long texts into chunks
            chunks = self._chunk_text(text, max_length=1000)
            
            all_relationships = []
            for chunk in chunks:
                relationships = await self.clinical_roberta.extract_relationships(
                    chunk, entities
                )
                all_relationships.extend(relationships)
            
            return all_relationships
        except Exception as e:
            logger.error(f"Error extracting relationships from section: {e}")
            return []
    
    def _chunk_text(
        self,
        text: str,
        max_length: int = 1000
    ) -> List[str]:
        """Split text into manageable chunks."""
        # Reuse chunking logic from EntityExtractor
        extractor = EntityExtractor(None)  # Dummy instance for chunking
        return extractor._chunk_text(text, max_length)
    
    def _deduplicate_relationships(
        self,
        relationships: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Remove duplicate relationships."""
        if not relationships:
            return []
        
        # Create a set of unique relationship signatures
        seen_relationships = set()
        deduplicated = []
        
        for relationship in relationships:
            # Create signature based on source, target, and type
            source_id = relationship.get('source_entity_id', '')
            target_id = relationship.get('target_entity_id', '')
            rel_type = relationship.get('type', '')
            
            signature = f"{source_id}_{target_id}_{rel_type}"
            
            if signature not in seen_relationships:
                seen_relationships.add(signature)
                deduplicated.append(relationship)
        
        return deduplicated
    
    def _add_document_context(
        self,
        relationships: List[Dict[str, Any]],
        document: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Add document context to extracted relationships."""
        contextualized = []
        
        for relationship in relationships:
            contextualized_relationship = relationship.copy()
            contextualized_relationship['document_id'] = document.get('id')
            contextualized_relationship['document_source'] = document.get('source')
            contextualized_relationship['document_publication_date'] = document.get('publication_date')
            contextualized_relationship['extraction_timestamp'] = self._get_timestamp()
            contextualized.append(contextualized_relationship)
        
        return contextualized
    
    def _get_timestamp(self) -> str:
        """Get current timestamp in ISO format."""
        from datetime import datetime
        return datetime.now().isoformat()
```

## Validation Layer

### Quality Validator

```python
import statistics
from typing import Dict, Any, List, Tuple
import logging

logger = logging.getLogger(__name__)

class QualityValidator:
    def __init__(self):
        self.validation_rules = [
            self._validate_entity_confidence,
            self._validate_relationship_confidence,
            self._validate_entity_consistency,
            self._validate_source_credibility,
            self._validate_temporal_consistency
        ]
    
    async def validate_knowledge(
        self,
        entities: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]],
        document: Dict[str, Any]
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        """
        Validate extracted knowledge and return quality scores.
        
        Returns:
            Tuple of (validated_entities, validated_relationships, quality_metrics)
        """
        validation_results = {
            'total_entities': len(entities),
            'total_relationships': len(relationships),
            'validated_entities': 0,
            'validated_relationships': 0,
            'quality_score': 0.0,
            'validation_issues': []
        }
        
        # Validate entities
        validated_entities = []
        entity_issues = []
        
        for entity in entities:
            is_valid, issues = await self._validate_entity(entity, document)
            if is_valid:
                validated_entities.append(entity)
                validation_results['validated_entities'] += 1
            else:
                entity_issues.extend(issues)
        
        # Validate relationships
        validated_relationships = []
        relationship_issues = []
        
        for relationship in relationships:
            is_valid, issues = await self._validate_relationship(
                relationship, entities, document
            )
            if is_valid:
                validated_relationships.append(relationship)
                validation_results['validated_relationships'] += 1
            else:
                relationship_issues.extend(issues)
        
        # Calculate overall quality score
        validation_results['quality_score'] = self._calculate_quality_score(
            validation_results, entity_issues, relationship_issues
        )
        
        validation_results['validation_issues'] = entity_issues + relationship_issues
        
        logger.info(
            f"Validation completed: {validation_results['validated_entities']}/{validation_results['total_entities']} entities, "
            f"{validation_results['validated_relationships']}/{validation_results['total_relationships']} relationships"
        )
        
        return validated_entities, validated_relationships, validation_results
    
    async def _validate_entity(
        self,
        entity: Dict[str, Any],
        document: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Validate a single entity."""
        issues = []
        
        # Check confidence threshold
        if entity.get('confidence', 0) < 0.7:
            issues.append(f"Low confidence entity: {entity.get('text', '')}")
        
        # Check required fields
        required_fields = ['text', 'type', 'start', 'end', 'confidence']
        for field in required_fields:
            if field not in entity:
                issues.append(f"Missing required field '{field}' in entity")
        
        # Check entity type validity
        valid_types = [
            'DISEASE', 'DRUG', 'SYMPTOM', 'PROCEDURE', 
            'ANATOMY', 'GENE', 'PROTEIN', 'ORGANISM'
        ]
        if entity.get('type') not in valid_types:
            issues.append(f"Invalid entity type: {entity.get('type')}")
        
        # Check position validity
        if entity.get('start', -1) < 0 or entity.get('end', -1) < entity.get('start', 0):
            issues.append("Invalid entity position")
        
        return len(issues) == 0, issues
    
    async def _validate_relationship(
        self,
        relationship: Dict[str, Any],
        entities: List[Dict[str, Any]],
        document: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Validate a single relationship."""
        issues = []
        
        # Check confidence threshold
        if relationship.get('confidence', 0) < 0.6:
            issues.append(f"Low confidence relationship: {relationship.get('type', '')}")
        
        # Check required fields
        required_fields = [
            'source_entity_id', 'target_entity_id', 'type', 'confidence'
        ]
        for field in required_fields:
            if field not in relationship:
                issues.append(f"Missing required field '{field}' in relationship")
        
        # Check relationship type validity
        valid_types = [
            'CAUSES', 'TREATS', 'SIDE_EFFECT', 'ASSOCIATED_WITH',
            'CONTRAINDICATED', 'DIAGNOSES', 'PREVENTS', 'MANIFESTATION'
        ]
        if relationship.get('type') not in valid_types:
            issues.append(f"Invalid relationship type: {relationship.get('type')}")
        
        # Check if referenced entities exist
        source_id = relationship.get('source_entity_id')
        target_id = relationship.get('target_entity_id')
        
        source_exists = any(e.get('entity_id') == source_id for e in entities)
        target_exists = any(e.get('entity_id') == target_id for e in entities)
        
        if not source_exists:
            issues.append(f"Referenced source entity {source_id} not found")
        if not target_exists:
            issues.append(f"Referenced target entity {target_id} not found")
        
        return len(issues) == 0, issues
    
    def _validate_entity_confidence(
        self,
        entities: List[Dict[str, Any]]
    ) -> Tuple[bool, List[str]]:
        """Validate entity confidence scores."""
        issues = []
        
        if not entities:
            return True, []
        
        # Calculate average confidence
        confidences = [e.get('confidence', 0) for e in entities]
        avg_confidence = statistics.mean(confidences)
        
        # Check if average confidence is too low
        if avg_confidence < 0.6:
            issues.append(f"Average entity confidence too low: {avg_confidence:.2f}")
        
        return len(issues) == 0, issues
    
    def _validate_relationship_confidence(
        self,
        relationships: List[Dict[str, Any]]
    ) -> Tuple[bool, List[str]]:
        """Validate relationship confidence scores."""
        issues = []
        
        if not relationships:
            return True, []
        
        # Calculate average confidence
        confidences = [r.get('confidence', 0) for r in relationships]
        avg_confidence = statistics.mean(confidences)
        
        # Check if average confidence is too low
        if avg_confidence < 0.5:
            issues.append(f"Average relationship confidence too low: {avg_confidence:.2f}")
        
        return len(issues) == 0, issues
    
    def _validate_entity_consistency(
        self,
        entities: List[Dict[str, Any]]
    ) -> Tuple[bool, List[str]]:
        """Validate entity consistency across document."""
        issues = []
        
        # Group entities by normalized text
        entity_groups = {}
        for entity in entities:
            norm_text = entity.get('normalized_text', entity.get('text', '')).lower()
            if norm_text not in entity_groups:
                entity_groups[norm_text] = []
            entity_groups[norm_text].append(entity)
        
        # Check for inconsistent entity types
        for norm_text, group in entity_groups.items():
            if len(group) > 1:
                types = set(e.get('type') for e in group)
                if len(types) > 1:
                    issues.append(f"Inconsistent entity types for '{norm_text}': {', '.join(types)}")
        
        return len(issues) == 0, issues
    
    def _validate_source_credibility(
        self,
        document: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Validate source credibility."""
        issues = []
        
        # Check source credibility based on known sources
        credible_sources = [
            'pubmed', 'europepmc', 'cdc', 'who', 'nih', 'aha', 'acc',
            'esmo', 'nccn', 'cochrane', 'uptodate'
        ]
        
        source = document.get('source', '').lower()
        if source not in credible_sources:
            issues.append(f"Source credibility unknown: {source}")
        
        return len(issues) == 0, issues
    
    def _validate_temporal_consistency(
        self,
        entities: List[Dict[str, Any]],
        relationships: List[Dict[str, Any]],
        document: Dict[str, Any]
    ) -> Tuple[bool, List[str]]:
        """Validate temporal consistency of information."""
        issues = []
        
        # Check if document publication date is reasonable
        pub_date = document.get('publication_date')
        if pub_date:
            from datetime import datetime
            try:
                pub_datetime = datetime.fromisoformat(pub_date.replace('Z', '+00:00'))
                current_year = datetime.now().year
                
                # Check if publication date is in the future
                if pub_datetime.year > current_year + 1:
                    issues.append(f"Future publication date: {pub_date}")
                
                # Check if publication date is too old (older than 50 years)
                if pub_datetime.year < current_year - 50:
                    issues.append(f"Very old publication date: {pub_date}")
            except ValueError:
                issues.append(f"Invalid publication date format: {pub_date}")
        
        return len(issues) == 0, issues
    
    def _calculate_quality_score(
        self,
        validation_results: Dict[str, Any],
        entity_issues: List[str],
        relationship_issues: List[str]
    ) -> float:
        """Calculate overall quality score."""
        # Base score based on validation ratios
        entity_ratio = (
            validation_results['validated_entities'] / 
            max(validation_results['total_entities'], 1)
        )
        
        relationship_ratio = (
            validation_results['validated_relationships'] / 
            max(validation_results['total_relationships'], 1)
        )
        
        # Weighted average (entities 60%, relationships 40%)
        base_score = (entity_ratio * 0.6) + (relationship_ratio * 0.4)
        
        # Penalty for validation issues
        issue_penalty = min(len(entity_issues) + len(relationship_issues) * 0.1, 0.5)
        
        # Final score (0.0 to 1.0)
        final_score = max(0.0, base_score - issue_penalty)
        
        return round(final_score, 3)
```

## Transformation Layer

### Schema Transformer

```python
from typing import Dict, Any, List
import uuid
from datetime import datetime

class SchemaTransformer:
    def __init__(self):
        self.entity_type_mapping = {
            'DISEASE': 'Disease',
            'DRUG': 'Drug',
            'SYMPTOM': 'Symptom',
            'PROCEDURE': 'Procedure',
            'ANATOMY': 'Anatomy',
            'GENE': 'Gene',
            'PROTEIN': 'Protein',
            'ORGANISM': 'Organism'
        }
        
        self.relationship_type_mapping = {
            'CAUSES': 'CAUSES',
            'TREATS': 'TREATS',
            'SIDE_EFFECT': 'SIDE_EFFECT',
            'ASSOCIATED_WITH': 'ASSOCIATED_WITH',
            'CONTRAINDICATED': 'CONTRAINDICATED',
            'DIAGNOSES': 'DIAGNOSES',
            'PREVENTS': 'PREVENTS',
            'MANIFESTATION': 'MANIFESTATION'
        }
    
    def transform_entities(
        self,
        validated_entities: List[Dict[str, Any]],
        document: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Transform validated entities to KG schema."""
        transformed_entities = []
        
        for entity in validated_entities:
            transformed_entity = self._transform_single_entity(entity, document)
            if transformed_entity:
                transformed_entities.append(transformed_entity)
        
        return transformed_entities
    
    def _transform_single_entity(
        self,
        entity: Dict[str, Any],
        document: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Transform a single entity to KG schema."""
        try:
            # Map entity type
            entity_type = self.entity_type_mapping.get(
                entity.get('type'), 'Unknown'
            )
            
            # Create transformed entity
            transformed = {
                'id': str(uuid.uuid4()),
                'original_id': entity.get('entity_id'),
                'name': entity.get('text', ''),
                'normalized_name': entity.get('normalized_text', entity.get('text', '')),
                'type': entity_type,
                'description': entity.get('description', ''),
                'synonyms': entity.get('synonyms', []),
                'confidence': entity.get('confidence', 0.0),
                'source_document_id': document.get('id'),
                'source_document_title': document.get('title', ''),
                'source_document_url': document.get('url', ''),
                'source_document_publication_date': document.get('publication_date'),
                'extraction_method': entity.get('extraction_method', 'ClinicalRoBERTa'),
                'created_date': datetime.now().isoformat(),
                'updated_date': datetime.now().isoformat(),
                'version': '1.0'
            }
            
            # Add type-specific properties
            if entity_type == 'Disease':
                transformed.update({
                    'icd_codes': entity.get('icd_codes', []),
                    'snomed_id': entity.get('snomed_id'),
                    'umls_id': entity.get('umls_id'),
                    'mesh_id': entity.get('mesh_id'),
                    'category': entity.get('category', ''),
                    'prevalence': entity.get('prevalence', ''),
                    'incidence': entity.get('incidence', ''),
                    'mortality_rate': entity.get('mortality_rate')
                })
            elif entity_type == 'Drug':
                transformed.update({
                    'atc_codes': entity.get('atc_codes', []),
                    'rxnorm_id': entity.get('rxnorm_id'),
                    'drugbank_id': entity.get('drugbank_id'),
                    'mechanism_of_action': entity.get('mechanism_of_action', ''),
                    'pregnancy_category': entity.get('pregnancy_category', ''),
                    'contraindications': entity.get('contraindications', [])
                })
            
            return transformed
            
        except Exception as e:
            logger.error(f"Error transforming entity: {e}")
            return None
    
    def transform_relationships(
        self,
        validated_relationships: List[Dict[str, Any]],
        document: Dict[str, Any],
        transformed_entities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Transform validated relationships to KG schema."""
        transformed_relationships = []
        
        # Create entity ID mapping for quick lookup
        entity_id_map = {
            entity.get('original_id'): entity.get('id')
            for entity in transformed_entities
        }
        
        for relationship in validated_relationships:
            transformed_relationship = self._transform_single_relationship(
                relationship, document, entity_id_map
            )
            if transformed_relationship:
                transformed_relationships.append(transformed_relationship)
        
        return transformed_relationships
    
    def _transform_single_relationship(
        self,
        relationship: Dict[str, Any],
        document: Dict[str, Any],
        entity_id_map: Dict[str, str]
    ) -> Optional[Dict[str, Any]]:
        """Transform a single relationship to KG schema."""
        try:
            # Map relationship type
            relationship_type = self.relationship_type_mapping.get(
                relationship.get('type'), 'ASSOCIATED_WITH'
            )
            
            # Map source and target entity IDs
            source_original_id = relationship.get('source_entity_id')
            target_original_id = relationship.get('target_entity_id')
            
            source_id = entity_id_map.get(source_original_id)
            target_id = entity_id_map.get(target_original_id)
            
            if not source_id or not target_id:
                logger.warning(f"Could not map entity IDs for relationship: {source_original_id} -> {target_original_id}")
                return None
            
            # Create transformed relationship
            transformed = {
                'id': str(uuid.uuid4()),
                'type': relationship_type,
                'source_entity_id': source_id,
                'target_entity_id': target_id,
                'confidence': relationship.get('confidence', 0.0),
                'strength': relationship.get('strength', ''),
                'evidence_text': relationship.get('evidence_text', ''),
                'source_document_id': document.get('id'),
                'source_document_title': document.get('title', ''),
                'source_document_url': document.get('url', ''),
                'source_document_publication_date': document.get('publication_date'),
                'extraction_method': relationship.get('extraction_method', 'ClinicalRoBERTa'),
                'created_date': datetime.now().isoformat(),
                'updated_date': datetime.now().isoformat(),
                'version': '1.0'
            }
            
            # Add type-specific properties
            if relationship_type == 'CAUSES':
                transformed.update({
                    'mechanism': relationship.get('mechanism', ''),
                    'temporal_relationship': relationship.get('temporal_relationship', '')
                })
            elif relationship_type == 'TREATS':
                transformed.update({
                    'efficacy': relationship.get('efficacy'),
                    'dosage_recommendation': relationship.get('dosage_recommendation', ''),
                    'route_of_administration': relationship.get('route_of_administration', '')
                })
            elif relationship_type == 'SIDE_EFFECT':
                transformed.update({
                    'frequency': relationship.get('frequency', ''),
                    'severity': relationship.get('severity', ''),
                    'onset_time': relationship.get('onset_time', '')
                })
            
            return transformed
            
        except Exception as e:
            logger.error(f"Error transforming relationship: {e}")
            return None
```
### Improved Schema Transformer with Deterministic ID Generation

To address the idempotency issue identified in the friend's review, we implement a deterministic ID generation approach in the SchemaTransformer. This ensures that repeated ingestion of the same document will not create duplicate nodes in the knowledge graph.

```python
from typing import Dict, Any, List, Optional
import hashlib
import uuid
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def deterministic_id(normalized_name: str, source_document_id: Optional[str], original_id: Optional[str]) -> str:
    """
    Generate deterministic stable id using sha256 over normalized_name + source_document_id + original_id.
    If insufficient inputs, fall back to uuid4.
    """
    components = []
    if normalized_name:
        components.append(normalized_name.strip().lower())
    if source_document_id:
        components.append(str(source_document_id))
    if original_id:
        components.append(str(original_id))

    if not components:
        # fallback to random uuid to avoid returning empty id
        return str(uuid.uuid4())

    base = "|".join(components)
    digest = hashlib.sha256(base.encode("utf-8")).hexdigest()
    return digest  # 64 hex chars

class DeterministicSchemaTransformer:
    """
    Transforms validated entities/relationships to KG schema and assigns deterministic IDs.
    """

    def __init__(self):
        # reuse your mappings
        self.entity_type_mapping = {
            'DISEASE': 'Disease',
            'DRUG': 'Drug',
            'SYMPTOM': 'Symptom',
            'PROCEDURE': 'Procedure',
            'ANATOMY': 'Anatomy',
            'GENE': 'Gene',
            'PROTEIN': 'Protein',
            'ORGANISM': 'Organism'
        }

        self.relationship_type_mapping = {
            'CAUSES': 'CAUSES',
            'TREATS': 'TREATS',
            'SIDE_EFFECT': 'SIDE_EFFECT',
            'ASSOCIATED_WITH': 'ASSOCIATED_WITH',
            'CONTRAINDICATED': 'CONTRAINDICATED',
            'DIAGNOSES': 'DIAGNOSES',
            'PREVENTS': 'PREVENTS',
            'MANIFESTATION': 'MANIFESTATION'
        }

    def _now(self) -> str:
        return datetime.utcnow().isoformat() + "Z"

    def transform_single_entity(self, entity: Dict[str, Any], document: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Transform a single validated entity to KG schema and set a deterministic id.
        `entity` should contain at least: 'text' and (optionally) 'original_id'
        `document` should contain 'id' and other metadata
        """
        try:
            text = entity.get('normalized_text') or entity.get('text') or ""
            original_id = entity.get('entity_id') or entity.get('original_id') or ""
            source_doc_id = document.get('id', '') or entity.get('source_document_id', '')

            stable_id = deterministic_id(text, source_doc_id, original_id)

            entity_type = self.entity_type_mapping.get(entity.get('type'), 'Unknown')

            transformed = {
                'id': stable_id,
                'original_id': original_id,
                'name': entity.get('text', ''),
                'normalized_name': text,
                'type': entity_type,
                'description': entity.get('description', ''),
                'synonyms': entity.get('synonyms', []),
                'confidence': float(entity.get('confidence', 0.0)),
                'source_document_id': source_doc_id,
                'source_document_title': document.get('title', ''),
                'source_document_url': document.get('url', ''),
                'source_document_publication_date': document.get('publication_date'),
                'extraction_method': entity.get('extraction_method', 'ClinicalRoBERTa'),
                'created_date': entity.get('created_date', self._now()),
                'updated_date': entity.get('updated_date', self._now()),
                'version': entity.get('version', '1.0')
            }

            # type specific
            if entity_type == 'Disease':
                transformed.update({
                    'icd_codes': entity.get('icd_codes', []),
                    'snomed_id': entity.get('snomed_id'),
                    'umls_id': entity.get('umls_id'),
                    'mesh_id': entity.get('mesh_id'),
                })
            elif entity_type == 'Drug':
                transformed.update({
                    'atc_codes': entity.get('atc_codes', []),
                    'rxnorm_id': entity.get('rxnorm_id'),
                    'drugbank_id': entity.get('drugbank_id'),
                    'mechanism_of_action': entity.get('mechanism_of_action', '')
                })

            return transformed
        except Exception as e:
            logger.exception("Error transforming entity: %s", e)
            return None

    def transform_single_relationship(self, relationship: Dict[str, Any], document: Dict[str, Any], transformed_entity_map: Dict[str, str]) -> Optional[Dict[str, Any]]:
        """
        Transform a relationship and assign deterministic id:
        deterministic id = sha256(relationship_type|source_entity_stable_id|target_entity_stable_id|source_doc_id|original_rel_id)
        """
        try:
            rel_type = self.relationship_type_mapping.get(relationship.get('type'), 'ASSOCIATED_WITH')

            # Lookup transformed entity stable IDs via original IDs
            src_orig = relationship.get('source_entity_id')
            tgt_orig = relationship.get('target_entity_id')

            src_stable = transformed_entity_map.get(src_orig)
            tgt_stable = transformed_entity_map.get(tgt_orig)

            if not src_stable or not tgt_stable:
                logger.warning("Cannot map source/target original ids to stable ids: %s -> %s", src_orig, tgt_orig)
                return None

            original_rel_id = relationship.get('id') or relationship.get('original_id') or ""
            source_doc_id = document.get('id') or relationship.get('source_document_id', '')

            base = "|".join([rel_type, src_stable, tgt_stable, str(source_doc_id), str(original_rel_id)])
            rel_id = hashlib.sha256(base.encode("utf-8")).hexdigest()

            transformed = {
                'id': rel_id,
                'type': rel_type,
                'source_entity_id': src_stable,
                'target_entity_id': tgt_stable,
                'confidence': float(relationship.get('confidence', 0.0)),
                'evidence_text': relationship.get('evidence_text', ''),
                'source_document_id': source_doc_id,
                'source_document_title': document.get('title', ''),
                'source_document_url': document.get('url', ''),
                'source_document_publication_date': document.get('publication_date'),
                'extraction_method': relationship.get('extraction_method', 'ClinicalRoBERTa'),
                'created_date': relationship.get('created_date', self._now()),
                'updated_date': relationship.get('updated_date', self._now()),
                'version': relationship.get('version', '1.0'),
            }

            # add any extra fields like dosage / severity
            for k in ('strength', 'mechanism', 'efficacy', 'dosage_recommendation', 'frequency', 'severity'):
                if k in relationship:
                    transformed[k] = relationship[k]

            return transformed
        except Exception as e:
            logger.exception("Error transforming relationship: %s", e)
            return None

    def transform_entities(self, validated_entities: List[Dict[str, Any]], document: Dict[str, Any]) -> List[Dict[str, Any]]:
        transformed = []
        for e in validated_entities:
            t = self.transform_single_entity(e, document)
            if t:
                transformed.append(t)
### Improved Neo4j Loader with Contradiction Detection and Cache Invalidation

To address the issues identified in the friend's review, we implement an improved Neo4j loader with the following enhancements:
1. Batched upserts for entities and relationships
2. Relationship creation grouped by relation type (whitelisted)
3. Unique constraint creation
4. Transactional retries with exponential backoff
5. Optional Redis publish on updates for cache invalidation
6. Basic contradiction marking for opposite-type conflicts (configurable)

```python
import asyncio
import logging
import json
import time
from typing import List, Dict, Any, Optional, Tuple, Set
from collections import defaultdict

from neo4j import AsyncGraphDatabase, exceptions as neo4j_exc

# Optional: aioredis for cache invalidation pub/sub
try:
    import aioredis
except Exception:
    aioredis = None

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class ImprovedNeo4jLoader:
    """
    Async Neo4j loader with batched idempotent upserts for entities and relationships.
    - Entities: MERGE on :Entity{id: ...} then set properties and add label from type mapping.
    - Relationships: grouped by relationship type (whitelisted) and UNWINDed per-type safe query.
    - Emits optional Redis pub/sub "kg-updates" messages listing affected entity ids.
    """

    # Allowed (whitelisted) relationship types — add others as required
    ALLOWED_RELATIONSHIP_TYPES = {
        "CAUSES", "TREATS", "SIDE_EFFECT", "ASSOCIATED_WITH",
        "CONTRAINDICATED", "DIAGNOSES", "PREVENTS", "MANIFESTATION"
    }

    def __init__(
        self,
        uri: str,
        user: str,
        password: str,
        redis_url: Optional[str] = None,
        batch_size: int = 250,
        max_retries: int = 3,
        retry_backoff_base: float = 0.5,
        contradiction_conf_threshold: float = 0.7
    ):
        self.driver = AsyncGraphDatabase.driver(uri, auth=(user, password))
        self.batch_size = batch_size
        self.max_retries = max_retries
        self.retry_backoff_base = retry_backoff_base
        self.redis_url = redis_url
        self.redis = None
        self.contradiction_conf_threshold = contradiction_conf_threshold

    async def init(self):
        if self.redis_url and aioredis:
            self.redis = aioredis.from_url(self.redis_url, encoding="utf-8", decode_responses=True)

    async def close(self):
        await self.driver.close()
        if self.redis:
            await self.redis.close()

    # ---------------------
    # CONSTRAINTS & INDEXES
    # ---------------------
    async def ensure_constraints(self):
        """
        Ensures useful constraints and indexes exist.
        (Neo4j 4+/5 syntax)
        """
        queries = [
            # Ensure Entity id uniqueness
            "CREATE CONSTRAINT IF NOT EXISTS FOR (n:Entity) REQUIRE (n.id) IS UNIQUE",
            # Index on normalized_name for faster lookups (text index could be different per Neo4j version)
            "CREATE INDEX IF NOT EXISTS FOR (n:Entity) ON (n.normalized_name)",
            # Example property indexes (you can adjust labels)
            "CREATE INDEX IF NOT EXISTS FOR (n:Disease) ON (n.name)",
            "CREATE INDEX IF NOT EXISTS FOR (n:Drug) ON (n.name)"
        ]
        async with self.driver.session() as session:
            for q in queries:
                try:
                    await session.run(q)
                    logger.debug("Ensured constraint/index: %s", q)
                except Exception as e:
                    logger.warning("Could not ensure index/constraint (%s): %s", q, e)

    # ---------------------
    # ENTITY UPSERT
    # ---------------------
    async def upsert_entities(self, entities: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not entities:
            return {"success": True, "processed": 0, "errors": []}

        processed = 0
        errors = []
        affected_entity_ids = []

        batches = [entities[i:i + self.batch_size] for i in range(0, len(entities), self.batch_size)]
        for batch in batches:
            for attempt in range(1, self.max_retries + 1):
                try:
                    async with self.driver.session() as session:
                        res = await session.execute_write(self._tx_upsert_entities, batch)
                    processed += res.get("processed", 0)
                    affected_entity_ids.extend(res.get("affected_ids", []))
                    break
                except neo4j_exc.TransientError as e:
                    backoff = self.retry_backoff_base * (2 ** (attempt - 1))
                    logger.warning("Transient error on upsert_entities attempt %d: %s — retry %.1fs", attempt, e, backoff)
                    await asyncio.sleep(backoff)
                except Exception as e:
                    logger.exception("Fatal error upserting entities batch: %s", e)
                    errors.append(str(e))
                    break

        # publish updates
        if affected_entity_ids:
            await self._publish_update_event(list(set(affected_entity_ids)), reason="entities_upsert")

        return {"success": True, "processed": processed, "errors": errors, "affected_ids": list(set(affected_entity_ids))}

    @staticmethod
    async def _tx_upsert_entities(tx, batch: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Perform an UNWIND MERGE for entities. We rely on `id` being canonical.
        Adds a :Entity label and a type-specific label if provided via entity['type'] mapping.
        """
        # Build rows but only include allowed fields (avoid unexpected keys)
        rows = []
        for e in batch:
            rows.append({
                "id": e.get("id"),
                "name": e.get("name"),
                "normalized_name": e.get("normalized_name"),
                "type_label": e.get("type"),  # e.g., "Disease"
                "description": e.get("description"),
                "confidence": float(e.get("confidence", 0.0)),
                "source_document_id": e.get("source_document_id"),
                "created_date": e.get("created_date"),
                "updated_date": e.get("updated_date"),
                "props": {k: v for k, v in e.items() if k not in ("id", "type")}
            })

        query = """
        UNWIND $rows AS row
        MERGE (n:Entity {id: row.id})
          ON CREATE SET
            n.name = row.name,
            n.normalized_name = coalesce(row.normalized_name, row.name),
            n.confidence = row.confidence,
            n.created_date = coalesce(row.created_date, datetime()),
            n.source_document_id = row.source_document_id
          ON MATCH SET
            n.name = row.name,
            n.normalized_name = coalesce(row.normalized_name, row.name),
            n.confidence = row.confidence,
            n.updated_date = coalesce(row.updated_date, datetime()),
            n.source_document_id = row.source_document_id
        WITH n, row
        CALL {
          WITH n, row
          // Add specific type label if provided (safe - label is not parameterized here typically)
          // We avoid arbitrary labels here by checking row.type_label non-null and not injecting untrusted data.
          // Setting a type property remains safe as fallback.
          WITH n, row
          RETURN CASE WHEN row.type_label IS NULL THEN 0 ELSE 1 END AS _hasLabel
        }
        // As a fallback, store type in property
        SET n.type = coalesce(n.type, row.type_label)
        RETURN collect(n.id) AS ids, count(*) AS processed
        """
        result = await tx.run(query, rows=rows)
        rec = await result.single()
        ids = rec["ids"] if rec else []
        return {"processed": len(ids), "affected_ids": ids}

    # ---------------------
    # RELATIONSHIP UPSERT
    # ---------------------
    async def upsert_relationships(self, relationships: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not relationships:
            return {"success": True, "processed": 0, "errors": []}

        # Group relationships by type (only allowed types)
        grouped = defaultdict(list)
        rejected = []
        for rel in relationships:
            rtype = rel.get("type")
            if rtype not in self.ALLOWED_RELATIONSHIP_TYPES:
                rejected.append({"relationship": rel, "reason": "invalid_type"})
            else:
                grouped[rtype].append(rel)

        processed = 0
        errors = []
        affected_entity_ids: Set[str] = set()

        # For each relationship type, run a batched UNWIND MERGE
        for rtype, rel_batch in grouped.items():
            # chunk
            batches = [rel_batch[i:i + self.batch_size] for i in range(0, len(rel_batch), self.batch_size)]
            for batch in batches:
                for attempt in range(1, self.max_retries + 1):
                    try:
                        async with self.driver.session() as session:
                            res = await session.execute_write(self._tx_upsert_relationships_for_type, rtype, batch, self.contradiction_conf_threshold)
                        processed += res.get("processed", 0)
                        affected_entity_ids.update(res.get("affected_entity_ids", []))
                        break
                    except neo4j_exc.TransientError as e:
                        backoff = self.retry_backoff_base * (2 ** (attempt - 1))
                        logger.warning("Transient error on upsert_relationships (type=%s) attempt %d: %s — retry %.1fs", rtype, attempt, e, backoff)
                        await asyncio.sleep(backoff)
                    except Exception as e:
                        logger.exception("Fatal error upserting relationship batch for type %s: %s", rtype, e)
                        errors.append(str(e))
                        break

        # publish updates
        if affected_entity_ids:
            await self._publish_update_event(list(affected_entity_ids), reason="relationships_upsert")

        return {"success": True, "processed": processed, "errors": errors, "rejected": rejected, "affected_entity_ids": list(affected_entity_ids)}

    @staticmethod
    async def _tx_upsert_relationships_for_type(tx, rel_type: str, batch: List[Dict[str, Any]], contradiction_conf_threshold: float) -> Dict[str, Any]:
        """
        Create or update relationships of a given type safely.
        We parametrize row fields; the relationship type is included via the cypher string (safe because rel_type is whitelisted).
        This query also checks for other relationships between same nodes and flags contradictions if both confidences exceed threshold.
        """
        rows = []
        for r in batch:
            rows.append({
                "id": r.get("id"),
                "source_entity_id": r.get("source_entity_id"),
                "target_entity_id": r.get("target_entity_id"),
                "confidence": float(r.get("confidence", 0.0)),
                "evidence_text": r.get("evidence_text"),
                "source_document_id": r.get("source_document_id"),
                "created_date": r.get("created_date"),
                "updated_date": r.get("updated_date"),
                "props": {k: v for k, v in r.items() if k not in ("id", "source_entity_id", "target_entity_id", "type")}
            })

        # Build cypher using rel_type literal inserted (safe because caller whitelisted it)
        cypher = f"""
        UNWIND $rows AS row
        MATCH (s:Entity {{id: row.source_entity_id}}), (t:Entity {{id: row.target_entity_id}})
        MERGE (s)-[r:{rel_type} {{id: row.id}}]->(t)
          ON CREATE SET
            r.confidence = row.confidence,
            r.evidence_text = row.evidence_text,
            r.source_document_id = row.source_document_id,
            r.created_date = coalesce(row.created_date, datetime())
          ON MATCH SET
            r.confidence = row.confidence,
            r.evidence_text = row.evidence_text,
            r.source_document_id = row.source_document_id,
            r.updated_date = coalesce(row.updated_date, datetime())
        WITH s, t, r
        // Find other relationships between same nodes with conflicting semantics (simple heuristic)
        OPTIONAL MATCH (s)-[other]- (t)
            WHERE other.id IS NOT NULL AND other.id <> r.id
              AND other.confidence >= $conf_threshold
              AND r.confidence >= $conf_threshold
              AND other.type IS NULL // if you store explicit type prop
        // In general, we will set contradiction_flag on both if types differ (this is simplistic)
        FOREACH (_ IN CASE WHEN other IS NULL THEN [] ELSE [1] END |
            SET r.contradiction_flag = true,
                other.contradiction_flag = true,
                r.contradicts_id = coalesce(r.contradicts_id, []) + other.id,
                other.contradicts_id = coalesce(other.contradicts_id, []) + r.id
        )
        RETURN collect(DISTINCT r.id) AS rel_ids, collect(DISTINCT s.id) + collect(DISTINCT t.id) AS entity_ids, count(*) AS processed
        """

        result = await tx.run(cypher, rows=rows, conf_threshold=contradiction_conf_threshold)
        rec = await result.single()
        rel_ids = rec["rel_ids"] if rec else []
        ent_ids = rec["entity_ids"] if rec else []
        return {"processed": len(rel_ids), "affected_entity_ids": ent_ids}

    # ---------------------
    # PUBLISH / CACHE INVALIDATION HOOK
    # ---------------------
    async def _publish_update_event(self, entity_ids: List[str], reason: str = "update"):
        if not self.redis:
            logger.debug("No redis configured; skipping publish of KG update event.")
            return
        payload = {"type": "kg.update", "reason": reason, "entity_ids": entity_ids, "ts": time.time()}
        try:
            await self.redis.publish("kg-updates", json.dumps(payload))
            logger.debug("Published kg.update for %d entities", len(entity_ids))
        except Exception as e:
            logger.warning("Failed to publish kg.update: %s", e)
```
        return transformed

    def transform_relationships(self, validated_relationships: List[Dict[str, Any]], document: Dict[str, Any], transformed_entities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        # building a map original_id -> stable id
        entity_id_map = {}
        for te in transformed_entities:
            # original_id may be stored as 'original_id' or 'original_entity_id'
            orig = te.get('original_id')
            if orig:
                entity_id_map[orig] = te['id']

        transformed = []
        for r in validated_relationships:
            t = self.transform_single_relationship(r, document, entity_id_map)
            if t:
                transformed.append(t)
        return transformed
```

## Loading Layer

### Neo4j Loader

```python
import neo4j
from typing import Dict, Any, List
import asyncio
import logging

logger = logging.getLogger(__name__)

class Neo4jLoader:
    def __init__(self, uri: str, username: str, password: str):
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
    
    async def load_entities(
        self,
        entities: List[Dict[str, Any]],
        batch_size: int = 1000
    ) -> Dict[str, Any]:
        """Load entities into Neo4j database."""
        if not entities:
            return {"loaded": 0, "errors": []}
        
        loaded_count = 0
        errors = []
        
        # Process entities in batches
        for i in range(0, len(entities), batch_size):
            batch = entities[i:i + batch_size]
            batch_result = await self._load_entity_batch(batch)
            loaded_count += batch_result["loaded"]
            errors.extend(batch_result["errors"])
        
        logger.info(f"Loaded {loaded_count} entities into Neo4j")
        return {"loaded": loaded_count, "errors": errors}
    
    async def _load_entity_batch(
        self,
        entities: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Load a batch of entities."""
        if not self.driver:
            await self.initialize()
        
        loaded_count = 0
        errors = []
        
        async with self.driver.session() as session:
            # Build Cypher query for batch insert
            query = """
            UNWIND $entities AS entity
            MERGE (e {id: entity.id})
            SET e += entity
            WITH e, entity.type AS entityType
            CALL apoc.create.addLabels(e, [entityType]) YIELD node
            RETURN count(node) AS count
            """
            
            try:
                result = await session.run(
                    query,
                    entities=entities
                )
                record = await result.single()
                loaded_count = record["count"] if record else 0
            except Exception as e:
                logger.error(f"Error loading entity batch: {e}")
                errors.append(str(e))
        
        return {"loaded": loaded_count, "errors": errors}
    
    async def load_relationships(
        self,
        relationships: List[Dict[str, Any]],
        batch_size: int = 1000
    ) -> Dict[str, Any]:
        """Load relationships into Neo4j database."""
        if not relationships:
            return {"loaded": 0, "errors": []}
        
        loaded_count = 0
        errors = []
        
        # Process relationships in batches
        for i in range(0, len(relationships), batch_size):
            batch = relationships[i:i + batch_size]
            batch_result = await self._load_relationship_batch(batch)
            loaded_count += batch_result["loaded"]
            errors.extend(batch_result["errors"])
        
        logger.info(f"Loaded {loaded_count} relationships into Neo4j")
        return {"loaded": loaded_count, "errors": errors}
    
    async def _load_relationship_batch(
        self,
        relationships: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Load a batch of relationships."""
        if not self.driver:
            await self.initialize()
        
        loaded_count = 0
        errors = []
        
        async with self.driver.session() as session:
            # Build Cypher query for batch relationship creation
            query = """
            UNWIND $relationships AS rel
            MATCH (source {id: rel.source_entity_id})
            MATCH (target {id: rel.target_entity_id})
            CALL apoc.create.relationship(source, rel.type, rel, target) YIELD rel AS created_rel
            RETURN count(created_rel) AS count
            """
            
            try:
                result = await session.run(
                    query,
                    relationships=relationships
                )
                record = await result.single()
                loaded_count = record["count"] if record else 0
            except Exception as e:
                logger.error(f"Error loading relationship batch: {e}")
                errors.append(str(e))
        
        return {"loaded": loaded_count, "errors": errors}
    
    async def create_indexes(self):
        """Create necessary indexes for optimal performance."""
        if not self.driver:
            await self.initialize()
        
        index_queries = [
            "CREATE INDEX IF NOT EXISTS FOR (n:Disease) ON (n.name)",
            "CREATE INDEX IF NOT EXISTS FOR (n:Drug) ON (n.name)",
            "CREATE INDEX IF NOT EXISTS FOR (n:Symptom) ON (n.name)",
            "CREATE INDEX IF NOT EXISTS FOR (n:Procedure) ON (n.name)",
            "CREATE INDEX IF NOT EXISTS FOR (n:Anatomy) ON (n.name)",
            "CREATE INDEX IF NOT EXISTS FOR (n:Gene) ON (n.name)",
            "CREATE INDEX IF NOT EXISTS FOR (n:Protein) ON (n.name)",
            "CREATE TEXT INDEX IF NOT EXISTS FOR (n) ON (n.name, n.description)",
            "CREATE INDEX IF NOT EXISTS FOR ()-[r:CAUSES]->() ON (r.confidence)",
            "CREATE INDEX IF NOT EXISTS FOR ()-[r:TREATS]->() ON (r.confidence)"
        ]
        
        async with self.driver.session() as session:
            for query in index_queries:
                try:
                    await session.run(query)
                    logger.info(f"Created index: {query}")
                except Exception as e:
                    logger.error(f"Error creating index {query}: {e}")
```

## Monitoring Layer

### Pipeline Monitor

```python
import time
from typing import Dict, Any, List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class PipelineMonitor:
    def __init__(self):
        self.metrics = {
            "pipeline_runs": 0,
            "total_processing_time": 0.0,
            "entities_processed": 0,
            "relationships_processed": 0,
            "successful_runs": 0,
            "failed_runs": 0,
            "average_run_time": 0.0
        }
        self.current_run_start_time = None
    
    def start_pipeline_run(self):
        """Start monitoring a pipeline run."""
        self.current_run_start_time = time.time()
        self.metrics["pipeline_runs"] += 1
        logger.info("Pipeline run started")
    
    def end_pipeline_run(
        self,
        success: bool,
        entities_count: int,
        relationships_count: int,
        validation_results: Dict[str, Any]
    ):
        """End monitoring a pipeline run."""
        if not self.current_run_start_time:
            logger.warning("Pipeline run ended without start time recorded")
            return
        
        run_time = time.time() - self.current_run_start_time
        self.current_run_start_time = None
        
        # Update metrics
        self.metrics["total_processing_time"] += run_time
        self.metrics["entities_processed"] += entities_count
        self.metrics["relationships_processed"] += relationships_count
        
        if success:
## Cache Invalidation Architecture

To address the cache invalidation issue identified in the friend's review, we implement a Redis-based cache invalidation architecture. This architecture consists of two main components:

1. **ExtendedQueryCache**: An in-memory LRU cache extended with optional Redis registration and invalidation subscription
2. **RedisInvalidator**: A service that subscribes to KG updates and publishes cache invalidation messages

### ExtendedQueryCache Implementation

```python
import asyncio
import json
import logging
import time
from typing import Any, Dict, Optional, List

try:
    import aioredis
except Exception:
    aioredis = None

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class QueryCache:
    """Your existing in-memory QueryCache (slightly adapted)."""
    def __init__(self, max_size: int = 1000, ttl: int = 3600):
        self.max_size = max_size
        self.ttl = ttl
        self.cache = {}  # key -> (value, timestamp)
        self.access_order = []  # LRU list

    def get(self, key: str) -> Optional[Any]:
        if key not in self.cache:
            return None
        value, ts = self.cache[key]
        if time.time() - ts > self.ttl:
            self._remove(key)
            return None
        self._update_access_order(key)
        return value

    def set(self, key: str, value: Any):
        if len(self.cache) >= self.max_size:
            self._evict_lru()
        self.cache[key] = (value, time.time())
        self._update_access_order(key)
        logger.debug("Cache set: %s", key)

    def invalidate(self, key: str):
        """Remove key if present."""
        self._remove(key)
        logger.debug("Cache invalidated: %s", key)

    def generate_key(self, query_info: Dict[str, Any]) -> str:
        import hashlib, json
        key_json = json.dumps(query_info, sort_keys=True, default=str)
        return hashlib.md5(key_json.encode()).hexdigest()

    def _update_access_order(self, key: str):
        if key in self.access_order:
            self.access_order.remove(key)
        self.access_order.append(key)

    def _remove(self, key: str):
        if key in self.cache:
            del self.cache[key]
        if key in self.access_order:
            self.access_order.remove(key)

    def _evict_lru(self):
        if self.access_order:
            lru = self.access_order.pop(0)
            if lru in self.cache:
                del self.cache[lru]

class ExtendedQueryCache(QueryCache):
    """
    Extends QueryCache with optional Redis registration and invalidation subscription.
    - When setting a cache entry, pass entity_ids to register mapping in Redis.
    - The cache subscribes to 'kg-cache-invalidate' and removes listed keys on delivery.
    """

    def __init__(self, max_size: int = 1000, ttl: int = 3600, redis_url: Optional[str] = None):
        super().__init__(max_size=max_size, ttl=ttl)
        self.redis_url = redis_url
        self.redis = None
        self._pubsub_task = None
        self._stop = False

    async def init_redis(self):
        if not self.redis_url:
            logger.info("No redis_url provided for ExtendedQueryCache.")
            return
        if aioredis is None:
            raise RuntimeError("aioredis (async redis client) not installed.")
        self.redis = aioredis.from_url(self.redis_url, encoding="utf-8", decode_responses=True)
        # start background subscription to invalidation channel
        self._pubsub_task = asyncio.create_task(self._subscribe_invalidation_channel())

    async def close(self):
        self._stop = True
        if self._pubsub_task:
            self._pubsub_task.cancel()
            try:
                await self._pubsub_task
            except asyncio.CancelledError:
                pass
        if self.redis:
            await self.redis.close()

    def set(self, key: str, value: Any, entity_ids: Optional[List[str]] = None):
        """Set in-memory cache, and register mapping in redis if available."""
        super().set(key, value)
        if self.redis and entity_ids:
            # fire-and-forget async registration
            asyncio.create_task(self._register_key_for_entities(key, entity_ids))

    async def _register_key_for_entities(self, key: str, entity_ids: List[str]):
        """Add key to Redis set per entity: kg:entity:{entity_id}:cachekeys"""
        if not self.redis:
            return
        try:
            pipe = self.redis.pipeline()
            for eid in entity_ids:
                pipe.sadd(f"kg:entity:{eid}:cachekeys", key)
                # optionally set TTL on the set so mappings eventually expire
                pipe.expire(f"kg:entity:{eid}:cachekeys", self.ttl * 2)
            await pipe.execute()
        except Exception as e:
            logger.warning("Failed to register cache key in redis: %s", e)

    async def _subscribe_invalidation_channel(self):
        """Background task: subscribe to 'kg-cache-invalidate' and remove keys."""
        if not self.redis:
            logger.info("No redis client for invalidation subscription.")
            return
        try:
            pubsub = self.redis.pubsub()
            await pubsub.subscribe("kg-cache-invalidate")
            logger.info("ExtendedQueryCache subscribed to kg-cache-invalidate")
            async for message in pubsub.listen():
                if self._stop:
                    break
                if message is None:
                    continue
                # message structure differs between clients; normalize
                # We expect message to be dict-like with 'type'/'data'
                mtype = message.get("type")
                if mtype not in ("message", "pmessage"):
                    continue
                data_raw = message.get("data")
                if not data_raw:
                    continue
                try:
                    payload = json.loads(data_raw)
                except Exception:
                    # if data_raw already a dict
                    payload = data_raw if isinstance(data_raw, dict) else None
                if not payload:
                    continue
                keys = payload.get("keys", [])
                logger.info("Invalidation message received: %d keys", len(keys))
                for k in keys:
                    self.invalidate(k)
        except asyncio.CancelledError:
            logger.info("Invalidation subscription cancelled.")
        except Exception as e:
            logger.exception("Exception in invalidation subscription: %s", e)

    async def invalidate_by_entity_ids(self, entity_ids: List[str]):
        """
        Convenience: fetch keys registered in Redis for given entity_ids and invalidate locally.
        This can be used by services that want to proactively pull mappings.
        """
        if not self.redis:
            # fallback to local invalidation none
            return
        try:
            # collect keys
            all_keys = set()
            pipe = self.redis.pipeline()
            for eid in entity_ids:
                pipe.smembers(f"kg:entity:{eid}:cachekeys")
            sets = await pipe.execute()
            for members in sets:
                if members:
                    all_keys.update(members)
            # locally invalidate
            for k in all_keys:
                self.invalidate(k)
        except Exception as e:
            logger.exception("Failed to invalidate keys for entities %s: %s", entity_ids, e)
```

### RedisInvalidator Implementation

```python
class RedisInvalidator:
    """
    Service that subscribes to 'kg-updates' and publishes 'kg-cache-invalidate'.
    Usage:
      invalidator = RedisInvalidator(redis_url="redis://localhost:6379")
      await invalidator.init()
      await invalidator.run_forever()   # runs until cancelled
    """

    def __init__(self, redis_url: str, delete_mappings_after_invalidate: bool = False):
        if aioredis is None:
            raise RuntimeError("aioredis not installed or available")
        self.redis_url = redis_url
        self.redis = None
        self.delete_mappings = delete_mappings_after_invalidate
        self._stop = False

    async def init(self):
        self.redis = aioredis.from_url(self.redis_url, encoding="utf-8", decode_responses=True)
        logger.info("RedisInvalidator connected to redis")

    async def close(self):
        self._stop = True
        if self.redis:
            await self.redis.close()

    async def run_forever(self):
        if not self.redis:
            raise RuntimeError("Redis client not initialized. Call init() first.")
        pubsub = self.redis.pubsub()
        await pubsub.subscribe("kg-updates")
        logger.info("Subscribed to kg-updates channel")

        try:
            async for message in pubsub.listen():
                if self._stop:
                    break
                if message is None:
                    continue
                mtype = message.get("type")
                if mtype not in ("message", "pmessage"):
                    continue
                data_raw = message.get("data")
                if not data_raw:
                    continue
                try:
                    payload = json.loads(data_raw)
                except Exception:
                    # if the producer is sending dicts or different shapes, handle gracefully
                    payload = data_raw if isinstance(data_raw, dict) else None
                if not payload:
                    continue

                # Expected payload: {"type":"kg.update", "entity_ids": [...], ...}
                entity_ids = payload.get("entity_ids") or payload.get("affected_ids") or []
                if not entity_ids:
                    logger.debug("kg-updates message had no entity_ids - skipping")
                    continue

                logger.info("kg-updates received for %d entities", len(entity_ids))

                # Fetch cache keys for entities
                keys = await self._collect_cache_keys_for_entities(entity_ids)
                if not keys:
                    logger.debug("No cache keys found for updated entities")
                    # optionally remove mapping sets to avoid accumulation
                    if self.delete_mappings:
                        await self._delete_entity_mappings(entity_ids)
                    continue

                # Publish invalidation message
                invalidation_payload = {"keys": list(keys), "entity_ids": entity_ids, "trigger": "kg-updates"}
                try:
                    await self.redis.publish("kg-cache-invalidate", json.dumps(invalidation_payload))
                    logger.info("Published kg-cache-invalidate for %d keys", len(keys))
                except Exception as e:
                    logger.exception("Failed to publish cache invalidation: %s", e)

                # Optionally remove mapping sets (if you want one-shot invalidations)
                if self.delete_mappings:
                    await self._delete_entity_mappings(entity_ids)

        except asyncio.CancelledError:
            logger.info("RedisInvalidator cancelled")
        except Exception as e:
            logger.exception("Exception while listening to kg-updates: %s", e)
        finally:
            await pubsub.unsubscribe("kg-updates")

    async def _collect_cache_keys_for_entities(self, entity_ids: List[str]) -> set:
        keys = set()
        try:
            pipe = self.redis.pipeline()
            for eid in entity_ids:
                pipe.smembers(f"kg:entity:{eid}:cachekeys")
            results = await pipe.execute()
            for s in results:
                if s:
                    keys.update(s)
        except Exception as e:
            logger.exception("Error collecting cache keys for entities: %s", e)
        return keys

    async def _delete_entity_mappings(self, entity_ids: List[str]):
        try:
            pipe = self.redis.pipeline()
            for eid in entity_ids:
                pipe.delete(f"kg:entity:{eid}:cachekeys")
            await pipe.execute()
            logger.debug("Deleted mapping sets for %d entities", len(entity_ids))
        except Exception as e:
            logger.exception("Failed to delete entity mapping sets: %s", e)
```

### Integration Notes

1. **Startup**:
   - Call `await loader.init()` (if loader uses Redis) and `await cache.init_redis()` on your API/app startup
   - Call `await invalidator.init()` and then `await invalidator.run_forever()` in a dedicated process or Kubernetes deployment (one instance recommended)

2. **When storing cache entries**:
   - When you produce cache entries in your KG query pipeline (after formatting results), call:
     ```python
     cache_key = cache.generate_key({...})
     query_cache.set(cache_key, formatted_results, entity_ids=[...])
     ```
   - Provide the list of entity_ids that appear in the result (these should be stable IDs created by the DeterministicSchemaTransformer). This registers the mapping in Redis.

3. **When loader publishes kg-updates**:
   - Use the ImprovedNeo4jLoader to redis.publish("kg-updates", json.dumps(payload)) where payload contains entity_ids or affected_ids. The RedisInvalidator will pick it up, create a kg-cache-invalidate with cache keys that were previously registered, and each app instance will remove those keys locally.
            self.metrics["successful_runs"] += 1
        else:
            self.metrics["failed_runs"] += 1
        
        # Calculate average run time
        if self.metrics["pipeline_runs"] > 0:
            self.metrics["average_run_time"] = (
                self.metrics["total_processing_time"] / self.metrics["pipeline_runs"]
            )
        
        # Log run summary
        status = "SUCCESS" if success else "FAILURE"
        logger.info(
            f"Pipeline run {status}: "
            f"Entities: {entities_count}, "
            f"Relationships: {relationships_count}, "
            f"Time: {run_time:.2f}s, "
            f"Quality Score: {validation_results.get('quality_score', 0.0):.2f}"
        )
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current pipeline metrics."""
        return {
            "timestamp": datetime.now().isoformat(),
            "metrics": self.metrics.copy(),
            "performance": {
                "entities_per_second": (
                    self.metrics["entities_processed"] / 
                    max(self.metrics["total_processing_time"], 1)
                ),
                "relationships_per_second": (
                    self.metrics["relationships_processed"] / 
                    max(self.metrics["total_processing_time"], 1)
                ),
                "success_rate": (
                    self.metrics["successful_runs"] / 
                    max(self.metrics["pipeline_runs"], 1)
                )
            }
        }
    
    def reset_metrics(self):
        """Reset all metrics."""
        self.metrics = {
            "pipeline_runs": 0,
            "total_processing_time": 0.0,
            "entities_processed": 0,
            "relationships_processed": 0,
            "successful_runs": 0,
            "failed_runs": 0,
            "average_run_time": 0.0
        }
        logger.info("Pipeline metrics reset")
```

## Pipeline Orchestration

### Main Pipeline Controller

```python
import asyncio
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)

class KGPopulationPipeline:
    def __init__(
        self,
        source_connectors: Dict[str, Any],
        preprocessor: TextPreprocessor,
        entity_extractor: EntityExtractor,
        relationship_extractor: RelationshipExtractor,
        validator: QualityValidator,
        transformer: SchemaTransformer,
        loader: Neo4jLoader,
        monitor: PipelineMonitor
    ):
        self.source_connectors = source_connectors
        self.preprocessor = preprocessor
        self.entity_extractor = entity_extractor
        self.relationship_extractor = relationship_extractor
        self.validator = validator
        self.transformer = transformer
        self.loader = loader
        self.monitor = monitor
    
    async def run_pipeline(
        self,
        source_type: str,
        query: str,
        max_documents: int = 100,
        entity_types: Optional[List[str]] = None,
        relationship_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Run the complete KG population pipeline."""
        self.monitor.start_pipeline_run()
        
        try:
            # 1. Fetch documents from source
            logger.info(f"Fetching documents from {source_type} with query: {query}")
            documents = await self._fetch_documents(
                source_type, query, max_documents
            )
            
            if not documents:
                logger.warning("No documents fetched from source")
                self.monitor.end_pipeline_run(
                    success=True,
                    entities_count=0,
                    relationships_count=0,
                    validation_results={"quality_score": 0.0}
                )
                return {
                    "success": True,
                    "documents_processed": 0,
                    "entities_extracted": 0,
                    "relationships_extracted": 0,
                    "quality_score": 0.0
                }
            
            # 2. Process documents through pipeline
            pipeline_results = await self._process_documents(
                documents, entity_types, relationship_types
            )
            
            # 3. Load results into Neo4j
            load_results = await self._load_into_neo4j(pipeline_results)
            
            # 4. End monitoring
            self.monitor.end_pipeline_run(
                success=True,
                entities_count=len(pipeline_results.get("entities", [])),
                relationships_count=len(pipeline_results.get("relationships", [])),
                validation_results=pipeline_results.get("validation_results", {})
            )
            
            return {
                "success": True,
                "documents_processed": len(documents),
                "entities_loaded": load_results.get("entities_loaded", 0),
                "relationships_loaded": load_results.get("relationships_loaded", 0),
                "quality_score": pipeline_results.get("validation_results", {}).get("quality_score", 0.0),
                "processing_time": pipeline_results.get("processing_time", 0)
            }
            
        except Exception as e:
            logger.error(f"Pipeline execution failed: {e}")
            self.monitor.end_pipeline_run(
                success=False,
                entities_count=0,
                relationships_count=0,
                validation_results={"quality_score": 0.0}
            )
            raise
    
    async def _fetch_documents(
        self,
        source_type: str,
        query: str,
        max_documents: int
    ) -> List[Dict[str, Any]]:
        """Fetch documents from specified source."""
        connector = self.source_connectors.get(source_type)
        if not connector:
            raise ValueError(f"Unknown source type: {source_type}")
        
        if source_type == "pubmed":
            return await connector.fetch_articles(query, max_results=max_documents)
        elif source_type == "europepmc":
            return await connector.search_articles(query, max_results=max_documents)
        elif source_type == "guidelines":
            return await connector.fetch_guidelines(query)
        else:
            raise ValueError(f"Unsupported source type: {source_type}")
    
    async def _process_documents(
        self,
        documents: List[Dict[str, Any]],
        entity_types: Optional[List[str]],
        relationship_types: Optional[List[str]]
    ) -> Dict[str, Any]:
        """Process documents through the pipeline."""
        start_time = time.time()
        
        all_entities = []
        all_relationships = []
        validation_results_list = []
        
        # Process documents concurrently
        semaphore = asyncio.Semaphore(10)  # Limit concurrent processing
        
        async def process_document(document):
            async with semaphore:
                return await self._process_single_document(
                    document, entity_types, relationship_types
                )
        
        tasks = [process_document(doc) for doc in documents]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Collect results
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Error processing document: {result}")
                continue
            if result:
                all_entities.extend(result.get("entities", []))
                all_relationships.extend(result.get("relationships", []))
                validation_results_list.append(result.get("validation_results", {}))
        
        # Calculate average quality score
        quality_scores = [
            vr.get("quality_score", 0) 
            for vr in validation_results_list 
            if vr
        ]
        avg_quality_score = (
            sum(quality_scores) / len(quality_scores) 
            if quality_scores else 0
        )
        
        processing_time = time.time() - start_time
        
        return {
            "entities": all_entities,
            "relationships": all_relationships,
            "validation_results": {
                "quality_score": avg_quality_score,
                "total_documents": len(documents),
                "processed_documents": len([r for r in results if not isinstance(r, Exception)])
            },
            "processing_time": processing_time
        }
    
    async def _process_single_document(
        self,
        document: Dict[str, Any],
        entity_types: Optional[List[str]],
        relationship_types: Optional[List[str]]
    ) -> Optional[Dict[str, Any]]:
        """Process a single document through the pipeline."""
        try:
            # 1. Preprocess document
            preprocessed_text = self.preprocessor.preprocess_text(
                document.get("abstract", "") + " " + document.get("full_text", "")
            )
            document["preprocessed_text"] = preprocessed_text
            
            # 2. Extract entities
            entities = await self.entity_extractor.extract_entities(
                document, entity_types
            )
            
            # 3. Extract relationships
            relationships = await self.relationship_extractor.extract_relationships(
                document, entities
            )
            
            # 4. Validate extracted knowledge
            validated_entities, validated_relationships, validation_results = await self.validator.validate_knowledge(
                entities, relationships, document
            )
            
            # 5. Transform to KG schema
            transformed_entities = self.transformer.transform_entities(
                validated_entities, document
            )
            transformed_relationships = self.transformer.transform_relationships(
                validated_relationships, document, transformed_entities
            )
            
            return {
                "entities": transformed_entities,
                "relationships": transformed_relationships,
                "validation_results": validation_results,
                "document_id": document.get("id")
            }
            
        except Exception as e:
            logger.error(f"Error processing document {document.get('id')}: {e}")
            return None
    
    async def _load_into_neo4j(
        self,
        pipeline_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Load pipeline results into Neo4j."""
        entities = pipeline_results.get("entities", [])
        relationships = pipeline_results.get("relationships", [])
        
        # Load entities
        entity_load_result = await self.loader.load_entities(entities)
        
        # Load relationships
        relationship_load_result = await self.loader.load_relationships(relationships)
        
        # Create indexes for performance
        await self.loader.create_indexes()
        
        return {
            "entities_loaded": entity_load_result.get("loaded", 0),
            "relationships_loaded": relationship_load_result.get("loaded", 0),
            "entity_errors": len(entity_load_result.get("errors", [])),
            "relationship_errors": len(relationship_load_result.get("errors", []))
        }
```

## Configuration and Management

### Pipeline Configuration

```python
from typing import Dict, Any, List
import os
import yaml

class PipelineConfig:
    def __init__(self, config_file: Optional[str] = None):
        self.config = self._load_config(config_file)
    
    def _load_config(self, config_file: Optional[str]) -> Dict[str, Any]:
        """Load configuration from file or environment variables."""
        if config_file and os.path.exists(config_file):
            with open(config_file, 'r') as f:
                return yaml.safe_load(f)
        
        # Load from environment variables
        return {
            "sources": {
                "pubmed": {
                    "api_key": os.getenv("PUBMED_API_KEY", ""),
                    "max_results": int(os.getenv("PUBMED_MAX_RESULTS", "1000")),
                    "batch_size": int(os.getenv("PUBMED_BATCH_SIZE", "100"))
                },
                "europepmc": {
                    "api_key": os.getenv("EUROPEPMC_API_KEY", ""),
                    "max_results": int(os.getenv("EUROPEPMC_MAX_RESULTS", "1000"))
                }
            },
            "neo4j": {
                "uri": os.getenv("NEO4J_URI", "bolt://localhost:7687"),
                "username": os.getenv("NEO4J_USERNAME", "neo4j"),
                "password": os.getenv("NEO4J_PASSWORD", "password")
            },
            "processing": {
                "max_concurrent_documents": int(os.getenv("MAX_CONCURRENT_DOCS", "10")),
                "entity_confidence_threshold": float(os.getenv("ENTITY_CONF_THRESHOLD", "0.7")),
                "relationship_confidence_threshold": float(os.getenv("REL_CONF_THRESHOLD", "0.6")),
                "batch_size": int(os.getenv("PROCESSING_BATCH_SIZE", "1000"))
            }
        }
    
    def get_source_config(self, source_type: str) -> Dict[str, Any]:
        """Get configuration for a specific source."""
        return self.config.get("sources", {}).get(source_type, {})
    
    def get_neo4j_config(self) -> Dict[str, str]:
        """Get Neo4j configuration."""
        return self.config.get("neo4j", {})
    
    def get_processing_config(self) -> Dict[str, Any]:
        """Get processing configuration."""
        return self.config.get("processing", {})

# Example configuration file (pipeline_config.yaml)
EXAMPLE_CONFIG = """
sources:
  pubmed:
    api_key: "your_pubmed_api_key"
    max_results: 1000
    batch_size: 100
  europepmc:
    api_key: "your_europepmc_api_key"
    max_results: 1000
  guidelines:
    sources: ["cdc", "who", "nih", "aha"]

neo4j:
  uri: "bolt://localhost:7687"
  username: "neo4j"
  password: "your_secure_password"

processing:
  max_concurrent_documents: 10
  entity_confidence_threshold: 0.7
  relationship_confidence_threshold: 0.6
  batch_size: 1000
  enable_validation: true
  enable_transformation: true
"""
```

## Testing Strategy

### Unit Tests

```python
import pytest
from unittest.mock import Mock, AsyncMock, patch

class TestEntityExtractor:
    @pytest.fixture
    def mock_clinical_roberta(self):
        return AsyncMock()
    
    @pytest.fixture
    def extractor(self, mock_clinical_roberta):
        return EntityExtractor(mock_clinical_roberta)
    
    @pytest.mark.asyncio
    async def test_extract_entities_success(self, extractor, mock_clinical_roberta):
        """Test successful entity extraction."""
        # Setup mock response
        mock_entities = [
            {
                "entity_id": "1",
                "text": "diabetes",
                "type": "DISEASE",
                "confidence": 0.95,
                "start": 0,
                "end": 8
            }
        ]
        mock_clinical_roberta.extract_entities.return_value = mock_entities
        
        # Test document
        document = {
            "id": "test_doc_1",
            "abstract": "Patient has diabetes",
            "source": "test"
        }
        
        # Execute extraction
        entities = await extractor.extract_entities(document)
        
        # Verify results
        assert len(entities) == 1
        assert entities[0]["text"] == "diabetes"
        assert entities[0]["type"] == "DISEASE"
        assert entities[0]["confidence"] == 0.95
        assert entities[0]["document_id"] == "test_doc_1"

class TestRelationshipExtractor:
    @pytest.fixture
    def mock_clinical_roberta(self):
        return AsyncMock()
    
    @pytest.fixture
    def extractor(self, mock_clinical_roberta):
        return RelationshipExtractor(mock_clinical_roberta)
    
    @pytest.mark.asyncio
    async def test_extract_relationships_success(self, extractor, mock_clinical_roberta):
        """Test successful relationship extraction."""
        # Setup mock response
        mock_relationships = [
            {
                "source_entity_id": "1",
                "target_entity_id": "2",
                "type": "CAUSES",
                "confidence": 0.87
            }
        ]
        mock_clinical_roberta.extract_relationships.return_value = mock_relationships
        
        # Test document and entities
        document = {
            "id": "test_doc_1",
            "abstract": "Smoking causes lung cancer",
            "source": "test"
        }
        entities = [
            {"entity_id": "1", "text": "smoking"},
            {"entity_id": "2", "text": "lung cancer"}
        ]
        
        # Execute extraction
        relationships = await extractor.extract_relationships(document, entities)
        
        # Verify results
        assert len(relationships) == 1
        assert relationships[0]["source_entity_id"] == "1"
        assert relationships[0]["target_entity_id"] == "2"
        assert relationships[0]["type"] == "CAUSES"
        assert relationships[0]["confidence"] == 0.87
        assert relationships[0]["document_id"] == "test_doc_1"

class TestQualityValidator:
    @pytest.fixture
    def validator(self):
        return QualityValidator()
    
    @pytest.mark.asyncio
    async def test_validate_entity_success(self, validator):
        """Test successful entity validation."""
        entity = {
            "entity_id": "1",
            "text": "diabetes",
            "type": "DISEASE",
            "confidence": 0.95,
            "start": 0,
            "end": 8
        }
        document = {"id": "test_doc_1"}
        
        is_valid, issues = await validator._validate_entity(entity, document)
        
        assert is_valid == True
        assert len(issues) == 0
    
    @pytest.mark.asyncio
    async def test_validate_entity_low_confidence(self, validator):
        """Test entity validation with low confidence."""
        entity = {
            "entity_id": "1",
            "text": "diabetes",
            "type": "DISEASE",
            "confidence": 0.3,  # Below threshold
            "start": 0,
            "end": 8
        }
        document = {"id": "test_doc_1"}
        
        is_valid, issues = await validator._validate_entity(entity, document)
        
        assert is_valid == False
        assert len(issues) == 1
        assert "Low confidence" in issues[0]

class TestSchemaTransformer:
    @pytest.fixture
    def transformer(self):
        return SchemaTransformer()
    
    def test_transform_single_entity_success(self, transformer):
        """Test successful entity transformation."""
        entity = {
            "entity_id": "1",
            "text": "Type 2 Diabetes",
            "type": "DISEASE",
            "confidence": 0.95,
            "icd_codes": ["E11.9"],
            "snomed_id": "73211009"
        }
        document = {
            "id": "test_doc_1",
            "title": "Diabetes Research Paper"
        }
        
        transformed = transformer._transform_single_entity(entity, document)
        
        assert transformed is not None
        assert transformed["name"] == "Type 2 Diabetes"
        assert transformed["type"] == "Disease"
        assert "E11.9" in transformed["icd_codes"]
        assert transformed["snomed_id"] == "73211009"
        assert transformed["source_document_id"] == "test_doc_1"

class TestNeo4jLoader:
    @pytest.fixture
    def mock_driver(self):
        return AsyncMock()
    
    @pytest.fixture
    def loader(self, mock_driver):
        loader = Neo4jLoader("bolt://localhost:7687", "neo4j", "password")
        loader.driver = mock_driver
        return loader
    
    @pytest.mark.asyncio
    async def test_load_entities_success(self, loader, mock_driver):
        """Test successful entity loading."""
        # Setup mock session
        mock_session = AsyncMock()
        mock_driver.session.return_value.__aenter__.return_value = mock_session
        mock_session.run.return_value.single.return_value = {"count": 2}
        
        # Test entities
        entities = [
            {"id": "1", "name": "diabetes", "type": "Disease"},
            {"id": "2", "name": "insulin", "type": "Drug"}
        ]
        
        # Execute loading
        result = await loader.load_entities(entities)
        
        # Verify results
        assert result["loaded"] == 2
        assert len(result["errors"]) == 0
        mock_session.run.assert_called_once()
```

## Deployment and Operations

### Docker Configuration

```dockerfile
# Dockerfile for KG Population Pipeline
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

# Create directories for data and logs
RUN mkdir -p /data/import /data/export /logs

# Expose port for monitoring
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health')" || exit 1

# Command to run the pipeline service
CMD ["python", "pipeline_service.py"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  kg-pipeline:
    build: .
    container_name: clinical-corvus-kg-pipeline
    ports:
      - "8000:8000"
    volumes:
      - ./data:/data
      - ./logs:/logs
      - ./config:/config
    environment:
      - NEO4J_URI=${NEO4J_URI}
      - NEO4J_USERNAME=${NEO4J_USERNAME}
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
      - PUBMED_API_KEY=${PUBMED_API_KEY}
      - EUROPEPMC_API_KEY=${EUROPEPMC_API_KEY}
    depends_on:
      - neo4j
    restart: unless-stopped
  
  neo4j:
    image: neo4j:5.12-enterprise
    container_name: clinical-corvus-neo4j
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - ./neo4j/data:/data
      - ./neo4j/logs:/logs
      - ./neo4j/plugins:/plugins
    environment:
      - NEO4J_AUTH=${NEO4J_USERNAME}/${NEO4J_PASSWORD}
      - NEO4J_apoc_export_file_enabled=true
      - NEO4J_apoc_import_file_enabled=true
      - NEO4J_apoc_import_file_use__neo4j__config=true
      - NEO4J_PLUGINS=["apoc"]
    restart: unless-stopped
```

### Kubernetes Deployment

```yaml
# kg-pipeline-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kg-pipeline
  labels:
    app: clinical-corvus
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kg-pipeline
  template:
    metadata:
      labels:
        app: kg-pipeline
    spec:
      containers:
      - name: kg-pipeline
        image: clinicalcorvus/kg-pipeline:latest
        ports:
        - containerPort: 8000
        env:
        - name: NEO4J_URI
          valueFrom:
            secretKeyRef:
              name: neo4j-secret
              key: uri
        - name: NEO4J_USERNAME
          valueFrom:
            secretKeyRef:
              name: neo4j-secret
              key: username
        - name: NEO4J_PASSWORD
          valueFrom:
            secretKeyRef:
              name: neo4j-secret
              key: password
        - name: PUBMED_API_KEY
          valueFrom:
            secretKeyRef:
              name: pubmed-secret
              key: api-key
        volumeMounts:
        - name: data-volume
          mountPath: /data
        - name: config-volume
          mountPath: /config
          readOnly: true
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 60
          periodSeconds: 30
      volumes:
      - name: data-volume
        persistentVolumeClaim:
          claimName: kg-pipeline-pvc
      - name: config-volume
        configMap:
          name: kg-pipeline-config
---
apiVersion: v1
kind: Service
metadata:
  name: kg-pipeline-service
spec:
  selector:
    app: kg-pipeline
  ports:
  - port: 8000
    targetPort: 8000
  type: ClusterIP
```

## Implementation Roadmap

### Phase 1: Core Infrastructure
- [ ] Implement source connectors for PubMed and EuropePMC
- [ ] Create preprocessing and normalization components
- [ ] Integrate Clinical RoBERTa for entity extraction
- [ ] Set up Neo4j database connection and basic loading

### Phase 2: Enhancement
- [ ] Add relationship extraction capabilities
- [ ] Implement quality validation layer
- [ ] Add schema transformation components
- [ ] Implement monitoring and metrics collection

### Phase 3: Integration
- [ ] Integrate with Clinical Corvus application
- [ ] Add support for clinical guidelines and protocols
- [ ] Implement batch processing and scheduling
- [ ] Add error handling and retry mechanisms

### Phase 4: Optimization
- [ ] Optimize performance for large-scale processing
- [ ] Add caching mechanisms
- [ ] Implement parallel processing
- [ ] Add advanced monitoring and alerting

### Phase 5: Testing and Deployment
- [ ] Unit testing for all components
- [ ] Integration testing with full pipeline
- [ ] Performance testing and optimization
- [ ] Production deployment and monitoring

This KG population pipeline design provides a comprehensive framework for ingesting curated medical sources into the Clinical Corvus Knowledge Graph, ensuring high-quality, validated knowledge extraction and population.

