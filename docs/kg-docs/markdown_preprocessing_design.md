# Markdown Preprocessing for Knowledge Graph Design

## Overview

This document outlines the design for markdown preprocessing capabilities in the Clinical Corvus Knowledge Graph system. The markdown processor will extract structured information from markdown documents for KG population, with enhanced support for Hybrid GraphRAG including passage extraction, claim generation, and terminology normalization.

## Requirements

### Functional Requirements

1. **Structure Preservation** - Maintain document structure (headings, lists, tables)
2. **Metadata Extraction** - Process YAML frontmatter for document metadata
3. **Link Processing** - Extract and process markdown links and references
4. **Table Parsing** - Parse markdown tables for structured data extraction
5. **Code Block Handling** - Process code blocks for technical content
6. **Inline Formatting** - Handle emphasis, strong text, and other inline formatting
7. **Position Tracking** - Maintain character-level positions for all elements
8. **Semantic Chunking** - Create semantically meaningful passages with metadata
9. **Claim Generation** - Extract structured claims from content
10. **Terminology Normalization** - Map entities to standard medical ontologies

### Non-Functional Requirements

1. **Performance** - Fast processing of large markdown documents
2. **Accuracy** - Correct parsing of markdown syntax with position tracking
3. **Extensibility** - Easy to extend for new markdown features
4. **Error Handling** - Graceful handling of malformed markdown with partial results
5. **Observability** - Comprehensive metrics and logging
6. **Resilience** - Non-blocking processing with timeouts and fallbacks
7. **Testability** - Comprehensive test coverage with golden file tests

## Architecture

### Components

1. **Markdown Parser** - Core parsing engine with position tracking (markdown-it-py)
2. **Structure Extractor** - Extract document structure with semantic sections
3. **Metadata Processor** - Process YAML frontmatter with python-frontmatter
4. **Content Analyzer** - Analyze content for entities, relationships, and claims
5. **Chunker** - Create semantically meaningful passages with metadata
6. **Normalization Service** - Map entities to medical ontologies (UMLS/SNOMED/RxNorm/LOINC)
7. **Formatter** - Format output for GraphRAG processing

### Data Flow

```
[Markdown Document]
        ↓
[Markdown Parser + Frontmatter Processor]
        ↓
[Token Stream with Position Information]
        ↓
[Structure Extractor + Semantic Chunker]
        ↓
[Metadata Processor]
        ↓
[Content Analyzer + Claim Generator]
        ↓
[Normalization Service]
        ↓
[Formatted Output for GraphRAG (Passages + Claims + Normalizations)]
```

## Implementation

### Markdown Parser

Using markdown-it-py for parsing with position tracking and python-frontmatter for metadata:

```python
from markdown_it import MarkdownIt
import frontmatter
import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, List, Optional
import logging

logger = logging.getLogger(__name__)
executor = ThreadPoolExecutor(max_workers=4)

md = MarkdownIt("commonmark").enable(["table", "fence", "linkify"])

class KGMarkdownParser:
    def __init__(self):
        self.parser_version = "1.0.0+commit-hash"  # TODO: Replace with actual commit hash
    
    async def parse(self, content: str) -> Dict[str, Any]:
        """
        Parse markdown content and return structured data with position information.
        
        Args:
            content: Markdown content as string
            
        Returns:
            Dict with parsed content, metadata, and token stream
        """
        try:
            # Parse frontmatter with python-frontmatter
            post = frontmatter.loads(content)
            metadata = post.metadata
            body = post.content
            
            # Parse markdown with position tracking
            tokens = await self._parse_markdown_async(body)
            
            return {
                'metadata': metadata,
                'body': body,
                'tokens': tokens,
                'raw_content': content
            }
        except Exception as e:
            logger.error(f"Error parsing markdown: {e}")
            return {
                'metadata': {},
                'body': content,
                'tokens': [],
                'raw_content': content,
                'document_status': 'partial',
                'error': {
                    'type': 'parsing_error',
                    'message': str(e)
                }
            }
    
    async def _parse_markdown_async(self, body: str):
        """Parse markdown asynchronously to avoid blocking."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(executor, lambda: md.parse(body))
```

### Structure Extractor

Extract document structure with semantic sections and position tracking:

```python
class StructureExtractor:
    def extract_structure(self, tokens: List[Any], body: str) -> Dict[str, Any]:
        """
        Extract document structure from parsed tokens with position information.
        
        Args:
            tokens: Token stream from markdown parser
            body: Raw markdown body content
            
        Returns:
            Dict with document structure information
        """
        # Precompute line start offsets for position conversion
        line_offsets = self._line_to_char_ranges(body)
        
        structure = {
            'headings': [],
            'sections': [],
            'lists': [],
            'tables': [],
            'code_blocks': [],
            'links': [],
            'images': []
        }
        
        # Extract elements from token stream
        self._extract_elements_from_tokens(tokens, structure, line_offsets)
        
        # Create semantic sections from headings
        structure['sections'] = self._create_sections(structure['headings'], body, line_offsets)
        
        return structure
    
    def _line_to_char_ranges(self, text: str) -> List[int]:
        """Convert text to line start character offsets."""
        lines = text.splitlines(True)  # preserve newlines
        offsets = []
        cum = 0
        for ln in lines:
            offsets.append(cum)
            cum += len(ln)
        return offsets
    
    def _extract_elements_from_tokens(self, tokens: List[Any], structure: Dict, line_offsets: List[int]):
        """Extract elements from token stream."""
        i = 0
        while i < len(tokens):
            token = tokens[i]
            
            if token.type == "heading_open":
                # Next token should be inline with heading text
                if i + 1 < len(tokens):
                    inline_token = tokens[i + 1]
                    text = "".join([c.content for c in inline_token.children]) if inline_token.children else ""
                    start_char = line_offsets[token.map[0]] if token.map else 0
                    end_char = line_offsets[token.map[1] - 1] + len(token.content) if token.map else start_char + len(text)
                    
                    heading_info = {
                        'level': int(token.tag[1]),
                        'text': text,
                        'start_line': token.map[0] if token.map else 0,
                        'end_line': token.map[1] if token.map else 0,
                        'start_char': start_char,
                        'end_char': end_char
                    }
                    structure['headings'].append(heading_info)
                i += 2  # Skip heading_open and heading_close
            elif token.type == "fence":
                start_char = line_offsets[token.map[0]] if token.map else 0
                end_char = line_offsets[token.map[1] - 1] + len(token.content) if token.map else start_char + len(token.content)
                
                structure['code_blocks'].append({
                    'lang': token.info,
                    'content': token.content,
                    'start_line': token.map[0] if token.map else 0,
                    'end_line': token.map[1] if token.map else 0,
                    'start_char': start_char,
                    'end_char': end_char
                })
                i += 1
            elif token.type == "table_open":
                # Collect all table tokens
                table_tokens = []
                j = i
                while j < len(tokens) and tokens[j].type != "table_close":
                    table_tokens.append(tokens[j])
                    j += 1
                if j < len(tokens):
                    table_tokens.append(tokens[j])  # Include table_close
                
                table_data = self._extract_table_from_tokens(table_tokens, line_offsets)
                structure['tables'].append(table_data)
                i = j + 1
            else:
                i += 1
    
    def _extract_table_from_tokens(self, table_tokens: List[Any], line_offsets: List[int]) -> Dict[str, Any]:
        """Extract structured data from table tokens."""
        headers = []
        rows = []
        current_row = []
        
        for token in table_tokens:
            if token.type == "th_open":
                # Find the next inline token with header content
                continue
            elif token.type == "th_close":
                # Header cell complete
                headers.append(current_row.pop() if current_row else "")
            elif token.type == "td_open":
                # Data cell start
                continue
            elif token.type == "td_close":
                # Data cell complete
                pass
            elif token.type == "inline" and token.children:
                # Extract text content
                text = "".join([c.content for c in token.children])
                if len(headers) > len(rows) * len(headers) if headers else 0:
                    # This is a header
                    if len(headers) < len(current_row):
                        headers.append(text)
                else:
                    # This is a data cell
                    current_row.append(text)
                    if len(current_row) == len(headers):
                        rows.append(current_row)
                        current_row = []
        
        # Calculate position information
        if table_tokens and table_tokens[0].map:
            start_char = line_offsets[table_tokens[0].map[0]] if table_tokens[0].map[0] < len(line_offsets) else 0
            end_token = table_tokens[-1] if table_tokens else None
            end_char = line_offsets[end_token.map[1] - 1] + len(end_token.content) if end_token and end_token.map else start_char
        
        return {
            'headers': headers,
            'rows': rows,
            'start_line': table_tokens[0].map[0] if table_tokens and table_tokens[0].map else 0,
            'end_line': table_tokens[-1].map[1] if table_tokens and table_tokens[-1].map else 0,
            'start_char': start_char,
            'end_char': end_char
        }
    
    def _create_sections(self, headings: List[Dict], body: str, line_offsets: List[int]) -> List[Dict]:
        """Create semantic sections from headings."""
        sections = []
        for i, heading in enumerate(headings):
            # Determine section end
            if i + 1 < len(headings):
                next_heading = headings[i + 1]
                end_char = next_heading['start_char']
            else:
                end_char = len(body)
            
            sections.append({
                'heading': heading['text'],
                'level': heading['level'],
                'start_char': heading['start_char'],
                'end_char': end_char,
                'content': body[heading['start_char']:end_char]
            })
        
        return sections
```

### Metadata Processor

Process YAML frontmatter with python-frontmatter:

```python
import yaml
import re
from typing import Dict, Any, List

class MetadataProcessor:
    def process_metadata(self, raw_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process raw metadata from YAML frontmatter.
        
        Args:
            raw_metadata: Raw metadata from markdown parser
            
        Returns:
            Processed metadata ready for KG
        """
        processed_metadata = {}
        
        # Process common metadata fields
        processed_metadata['title'] = self._extract_title(raw_metadata)
        processed_metadata['authors'] = self._extract_authors(raw_metadata)
        processed_metadata['date'] = self._extract_date(raw_metadata)
        processed_metadata['tags'] = self._extract_tags(raw_metadata)
        processed_metadata['categories'] = self._extract_categories(raw_metadata)
        processed_metadata['references'] = self._extract_references(raw_metadata)
        
        # Include all other metadata
        for key, value in raw_metadata.items():
            if key not in processed_metadata:
                processed_metadata[key] = value
        
        return processed_metadata
    
    def _extract_title(self, metadata: Dict) -> str:
        """Extract document title."""
        return metadata.get('title', metadata.get('Title', ''))
    
    def _extract_authors(self, metadata: Dict) -> List[str]:
        """Extract authors list."""
        authors = metadata.get('author', metadata.get('authors', []))
        if isinstance(authors, str):
            # Split by comma or semicolon
            authors = [author.strip() for author in re.split('[,;]', authors)]
        return authors
    
    def _extract_date(self, metadata: Dict) -> str:
        """Extract publication date."""
        return metadata.get('date', metadata.get('published', ''))
    
    def _extract_tags(self, metadata: Dict) -> List[str]:
        """Extract tags."""
        tags = metadata.get('tags', [])
        if isinstance(tags, str):
            tags = [tag.strip() for tag in tags.split(',')]
        return tags
    
    def _extract_categories(self, metadata: Dict) -> List[str]:
        """Extract categories."""
        categories = metadata.get('categories', [])
        if isinstance(categories, str):
            categories = [cat.strip() for cat in categories.split(',')]
        return categories
    
    def _extract_references(self, metadata: Dict) -> List[Dict]:
        """Extract references/citations."""
        refs = metadata.get('references', [])
        if isinstance(refs, str):
            # Try to parse as YAML list
            try:
                refs = yaml.safe_load(refs)
            except:
                refs = [refs]
        return refs
```

### Semantic Chunker

Create semantically meaningful passages for GraphRAG:

```python
import uuid
from typing import List, Dict, Any

class SemanticChunker:
    def __init__(self, max_tokens: int = 1024):
        self.max_tokens = max_tokens
    
    def chunk_document(
        self,
        structure: Dict[str, Any],
        body: str,
        metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Create semantically meaningful passages from document structure.
        
        Args:
            structure: Document structure with sections
            body: Raw document body
            metadata: Document metadata
            
        Returns:
            List of passage dictionaries ready for GraphRAG
        """
        passages = []
        
        # Chunk by sections first
        for section in structure.get('sections', []):
            section_passages = self._chunk_section(section, metadata)
            passages.extend(section_passages)
        
        # Handle content outside sections
        if not structure.get('sections'):
            # Document has no sections, chunk the entire body
            passages.extend(self._chunk_text(body, metadata))
        
        # Add code blocks as separate passages
        for code_block in structure.get('code_blocks', []):
            passages.append(self._create_passage_from_code_block(code_block, metadata))
        
        # Add tables as separate passages
        for table in structure.get('tables', []):
            passages.append(self._create_passage_from_table(table, metadata))
        
        return passages
    
    def _chunk_section(
        self,
        section: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Chunk a section into passages."""
        passages = []
        section_content = section['content']
        
        # If section is small enough, create single passage
        if self._estimate_token_count(section_content) <= self.max_tokens:
            passages.append({
                'passage_id': str(uuid.uuid4()),
                'text': section_content.strip(),
                'start_char': section['start_char'],
                'end_char': section['end_char'],
                'section': section['heading'],
                'level': section['level'],
                'token_count': self._estimate_token_count(section_content),
                'extraction_method': 'markdown-it-py+clinical-roberta-v1',
                'language': metadata.get('language', 'en')
            })
        else:
            # Break large sections into smaller chunks
            sub_passages = self._chunk_text(
                section_content,
                metadata,
                section_prefix=section['heading']
            )
            for i, passage in enumerate(sub_passages):
                passage['start_char'] = section['start_char'] + passage['start_char']
                passage['end_char'] = section['start_char'] + passage['end_char']
                passage['section'] = section['heading']
                passage['level'] = section['level']
                passages.append(passage)
        
        return passages
    
    def _chunk_text(
        self,
        text: str,
        metadata: Dict[str, Any],
        section_prefix: str = ""
    ) -> List[Dict[str, Any]]:
        """Chunk text into passages."""
        # Simple sentence-based chunking (in practice, use more sophisticated methods)
        sentences = text.split('. ')
        passages = []
        current_passage = ""
        start_pos = 0
        
        for i, sentence in enumerate(sentences):
            if current_passage and self._estimate_token_count(current_passage + sentence) > self.max_tokens:
                # Create passage
                passages.append({
                    'passage_id': str(uuid.uuid4()),
                    'text': current_passage.strip(),
                    'start_char': start_pos,
                    'end_char': start_pos + len(current_passage),
                    'section': section_prefix,
                    'token_count': self._estimate_token_count(current_passage),
                    'extraction_method': 'markdown-it-py+clinical-roberta-v1',
                    'language': metadata.get('language', 'en')
                })
                current_passage = sentence + ('. ' if i < len(sentences) - 1 else '')
                start_pos = sum(len(s) + 2 for s in sentences[:i])  # Approximate position
            else:
                current_passage += sentence + ('. ' if i < len(sentences) - 1 else '')
        
        # Add final passage
        if current_passage:
            passages.append({
                'passage_id': str(uuid.uuid4()),
                'text': current_passage.strip(),
                'start_char': start_pos,
                'end_char': start_pos + len(current_passage),
                'section': section_prefix,
                'token_count': self._estimate_token_count(current_passage),
                'extraction_method': 'markdown-it-py+clinical-roberta-v1',
                'language': metadata.get('language', 'en')
            })
        
        return passages
    
    def _create_passage_from_code_block(
        self,
        code_block: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a passage from a code block."""
        return {
            'passage_id': str(uuid.uuid4()),
            'text': f"```{code_block['lang']}\n{code_block['content']}\n```",
            'start_char': code_block['start_char'],
            'end_char': code_block['end_char'],
            'section': 'Code Block',
            'language': metadata.get('language', 'en'),
            'code_language': code_block['lang'],
            'token_count': self._estimate_token_count(code_block['content']),
            'extraction_method': 'markdown-it-py+code-block'
        }
    
    def _create_passage_from_table(
        self,
        table: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create a passage from a table."""
        # Convert table to markdown format
        table_md = "| " + " | ".join(table['headers']) + " |\n"
        table_md += "| " + " | ".join(["---"] * len(table['headers'])) + " |\n"
        for row in table['rows']:
            table_md += "| " + " | ".join(row) + " |\n"
        
        return {
            'passage_id': str(uuid.uuid4()),
            'text': table_md.strip(),
            'start_char': table['start_char'],
            'end_char': table['end_char'],
            'section': 'Table',
            'language': metadata.get('language', 'en'),
            'table_data': {
                'headers': table['headers'],
                'rows': table['rows']
            },
            'token_count': self._estimate_token_count(table_md),
            'extraction_method': 'markdown-it-py+table-parser'
        }
    
    def _estimate_token_count(self, text: str) -> int:
        """Estimate token count (simplified - in practice use tokenizer)."""
        return len(text.split())
```

### Claim Generator

Extract structured claims from content:

```python
class ClaimGenerator:
    def __init__(self, clinical_roberta_service):
        self.clinical_roberta = clinical_roberta_service
    
    async def generate_claims(
        self,
        passages: List[Dict[str, Any]],
        metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Generate structured claims from passages.
        
        Args:
            passages: List of passage dictionaries
            metadata: Document metadata
            
        Returns:
            List of claim dictionaries
        """
        claims = []
        
        # Extract entities and relationships from each passage
        for passage in passages:
            try:
                # Extract entities using Clinical RoBERTa
                entities = await self.clinical_roberta.extract_entities(passage['text'])
                
                # Extract relationships
                relationships = await self.clinical_roberta.extract_relationships(
                    passage['text'], entities
                )
                
                # Convert to claim format
                passage_claims = self._convert_to_claims(
                    relationships, passage, metadata
                )
                claims.extend(passage_claims)
            except Exception as e:
                logger.error(f"Error generating claims for passage: {e}")
                # Continue with other passages
        
        return claims
    
    def _convert_to_claims(
        self,
        relationships: List[Dict],
        passage: Dict[str, Any],
        metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Convert relationships to claim format."""
        claims = []
        
        for relationship in relationships:
            claim = {
                'claim_id': str(uuid.uuid4()),
                'type': relationship.get('type', 'UNKNOWN'),
                'subject_entity_id': relationship.get('subject_id', ''),
                'object_entity_id': relationship.get('object_id', ''),
                'evidence_passage_ids': [passage['passage_id']],
                'structured_attributes': relationship.get('attributes', {}),
                'confidence': relationship.get('confidence', 0.0),
                'provenance': {
                    'frontmatter': metadata,
                    'document_hash': self._calculate_content_hash(passage['text'])
                }
            }
            claims.append(claim)
        
        return claims
    
    def _calculate_content_hash(self, content: str) -> str:
        """Calculate hash of content for identification."""
        import hashlib
        return hashlib.md5(content.encode()).hexdigest()
```

### Normalization Service

Map entities to standard medical ontologies:

```python
class NormalizationService:
    def __init__(self, terminology_client):
        self.terminology_client = terminology_client
        self.cache = {}  # In practice, use Redis or similar
    
    async def normalize_entities(
        self,
        entities: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Normalize entities to standard medical ontologies.
        
        Args:
            entities: List of entity dictionaries
            
        Returns:
            List of normalization dictionaries
        """
        normalizations = []
        
        # Batch process entities for efficiency
        entity_names = [entity.get('text', '') for entity in entities]
        unique_names = list(set(entity_names))
        
        # Get candidates for all unique names
        candidates_map = {}
        for name in unique_names:
            # Check cache first
            name_hash = self._hash_string(name)
            if name_hash in self.cache:
                candidates_map[name] = self.cache[name_hash]
            else:
                try:
                    candidates = await self.terminology_client.search_term(name)
                    candidates_map[name] = candidates
                    # Cache results
                    self.cache[name_hash] = candidates
                except Exception as e:
                    logger.error(f"Error normalizing entity '{name}': {e}")
                    candidates_map[name] = []
        
        # Create normalization objects
        for entity in entities:
            entity_name = entity.get('text', '')
            if entity_name in candidates_map:
                normalization = {
                    'entity_id': entity.get('id', str(uuid.uuid4())),
                    'candidates': [
                        {
                            'id': candidate.get('concept_id', ''),
                            'source': candidate.get('source', ''),
                            'score': candidate.get('score', 0.0),
                            'preferred_term': candidate.get('preferred_term', '')
                        }
                        for candidate in candidates_map[entity_name]
                    ]
                }
                normalizations.append(normalization)
        
        return normalizations
    
    def _hash_string(self, text: str) -> str:
        """Create hash of string for caching."""
        import hashlib
        return hashlib.md5(text.lower().encode()).hexdigest()
```

### Content Analyzer

Analyze content for medical entities and relationships:

```python
class ContentAnalyzer:
    def __init__(self, clinical_roberta_service, normalization_service):
        self.clinical_roberta = clinical_roberta_service
        self.normalization_service = normalization_service
    
    async def analyze_content(
        self,
        passages: List[Dict],
        metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Analyze content for medical entities and relationships.
        
        Args:
            passages: Structured passages from document
            metadata: Document metadata
            
        Returns:
            Dict with extracted entities, relationships, and claims
        """
        # Extract text content for analysis
        text_content = self._extract_text_content(passages)
        
        # Extract entities using Clinical RoBERTa
        entities = await self.clinical_roberta.extract_entities(text_content)
        
        # Extract relationships
        relationships = await self.clinical_roberta.extract_relationships(
            text_content, entities
        )
        
        # Generate claims
        claim_generator = ClaimGenerator(self.clinical_roberta)
        claims = await claim_generator.generate_claims(passages, metadata)
        
        # Normalize entities
        normalizations = await self.normalization_service.normalize_entities(entities)
        
        # Contextualize entities with document structure
        contextualized_entities = self._contextualize_entities(
            entities, passages, metadata
        )
        
        return {
            'entities': contextualized_entities,
            'relationships': relationships,
            'claims': claims,
            'normalizations': normalizations,
            'content_hash': self._calculate_content_hash(text_content)
        }
    
    def _extract_text_content(self, passages: List[Dict]) -> str:
        """Extract text content from passages."""
        return '\n'.join([passage.get('text', '') for passage in passages])
    
    def _contextualize_entities(
        self,
        entities: List[Dict],
        passages: List[Dict],
        metadata: Dict[str, Any]
    ) -> List[Dict]:
        """Add contextual information to entities."""
        contextualized = []
        for entity in entities:
            # Find which passage contains this entity
            context = self._find_entity_context(entity, passages)
            
            contextualized_entity = entity.copy()
            contextualized_entity['context'] = {
                'section': context.get('section', ''),
                'passage_id': context.get('passage_id', ''),
                'document_metadata': metadata
            }
            contextualized.append(contextualized_entity)
        
        return contextualized
    
    def _find_entity_context(
        self,
        entity: Dict,
        passages: List[Dict]
    ) -> Dict[str, Any]:
        """Find contextual information for an entity."""
        # In a real implementation, you would match entity position with passage positions
        # For now, we'll just return the first passage as context
        context = {'section': '', 'passage_id': ''}
        
        if passages:
            context['section'] = passages[0].get('section', '')
            context['passage_id'] = passages[0].get('passage_id', '')
        
        return context
    
    def _calculate_content_hash(self, content: str) -> str:
        """Calculate hash of content for identification."""
        import hashlib
        return hashlib.md5(content.encode()).hexdigest()
```

### Formatter

Format output for GraphRAG processing:

```python
from datetime import datetime
import hashlib
import uuid
from typing import Dict, Any, List

class KGFormatter:
    def format_for_kg(
        self,
        parsed_data: Dict[str, Any],
        analysis_results: Dict[str, Any],
        passages: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Format parsed data and analysis results for GraphRAG processing.
        
        Args:
            parsed_data: Data from markdown parsing
            analysis_results: Results from content analysis
            passages: Semantic passages from document
            
        Returns:
            Formatted data ready for GraphRAG population
        """
        return {
            'document_id': self._generate_document_id(parsed_data),
            'filename': parsed_data.get('filename', ''),
            'content': parsed_data.get('raw_content', ''),
            'metadata': parsed_data.get('metadata', {}),
            'structure': parsed_data.get('structure', {}),
            'passages': passages,  # GraphRAG-ready passages
            'claims': analysis_results.get('claims', []),  # Structured claims
            'entities': analysis_results.get('entities', []),
            'relationships': analysis_results.get('relationships', []),
            'normalizations': analysis_results.get('normalizations', []),  # Ontology mappings
            'processing_metadata': {
                'parser_version': '1.0.0+commit-hash',  # TODO: Replace with actual version
                'processing_timestamp': datetime.now().isoformat(),
                'content_hash': analysis_results.get('content_hash', ''),
                'document_status': parsed_data.get('document_status', 'complete'),
                'error': parsed_data.get('error', None)
            }
        }
    
    def _generate_document_id(self, parsed_data: Dict) -> str:
        """Generate unique document ID."""
        filename = parsed_data.get('filename', '')
        if filename:
            # Use filename hash for consistency
            return hashlib.md5(filename.encode()).hexdigest()
        else:
            # Generate random ID
            return str(uuid.uuid4())
```

## Integration with Document Processing Pipeline

### Pipeline Integration

```python
class KGMarkdownProcessor:
    def __init__(self, clinical_roberta_service, terminology_client):
        self.parser = KGMarkdownParser()
        self.structure_extractor = StructureExtractor()
        self.metadata_processor = MetadataProcessor()
        self.chunker = SemanticChunker()
        self.normalization_service = NormalizationService(terminology_client)
        self.content_analyzer = ContentAnalyzer(clinical_roberta_service, self.normalization_service)
        self.formatter = KGFormatter()
    
    async def process_document(
        self,
        file_content: bytes,
        filename: str
    ) -> Dict[str, Any]:
        """
        Process markdown document for GraphRAG population.
        
        Args:
            file_content: Document content in bytes
            filename: Original filename
            
        Returns:
            Dict with processed data for GraphRAG
        """
        start_time = datetime.now()
        
        # Convert bytes to string
        try:
            content = file_content.decode('utf-8')
        except UnicodeDecodeError:
            # Try with different encodings
            content = file_content.decode('latin-1')
        
        # Parse markdown
        parsed_data = await self.parser.parse(content)
        parsed_data['filename'] = filename
        
        # Process metadata
        processed_metadata = self.metadata_processor.process_metadata(
            parsed_data.get('metadata', {})
        )
        parsed_data['metadata'] = processed_metadata
        
        # Extract structure
        structure = self.structure_extractor.extract_structure(
            parsed_data.get('tokens', []),
            parsed_data.get('body', '')
        )
        parsed_data['structure'] = structure
        
        # Create semantic passages
        passages = self.chunker.chunk_document(
            structure,
            parsed_data.get('body', ''),
            processed_metadata
        )
        
        # Analyze content
        analysis_results = await self.content_analyzer.analyze_content(
            passages,
            processed_metadata
        )
        
        # Format for GraphRAG
        kg_data = self.formatter.format_for_kg(parsed_data, analysis_results, passages)
        
        # Add performance metrics
        end_time = datetime.now()
        processing_time = (end_time - start_time).total_seconds()
        
        kg_data['processing_metadata']['processing_time_ms'] = processing_time * 1000
        kg_data['processing_metadata']['num_passages'] = len(passages)
        kg_data['processing_metadata']['num_claims'] = len(analysis_results.get('claims', []))
        kg_data['processing_metadata']['num_tables'] = len(structure.get('tables', []))
        
        return kg_data
```

## Error Handling

### Error Types

1. **Parsing Errors** - Malformed markdown syntax
2. **Encoding Errors** - Character encoding issues
3. **Metadata Errors** - Invalid YAML in frontmatter
4. **Processing Errors** - Issues with entity extraction
5. **Timeout Errors** - Processing taking too long
6. **Service Errors** - External service failures

### Error Handling Strategy

```python
import logging
from datetime import datetime
import asyncio

logger = logging.getLogger(__name__)

class MarkdownProcessingError(Exception):
    """Base exception for markdown processing errors."""
    pass

class KGMarkdownProcessor:
    def __init__(self, clinical_roberta_service, terminology_client):
        self.parser = KGMarkdownParser()
        self.structure_extractor = StructureExtractor()
        self.metadata_processor = MetadataProcessor()
        self.chunker = SemanticChunker()
        self.normalization_service = NormalizationService(terminology_client)
        self.content_analyzer = ContentAnalyzer(clinical_roberta_service, self.normalization_service)
        self.formatter = KGFormatter()
        self.timeout_seconds = 300  # 5 minutes timeout
    
    async def process_document_safely(
        self,
        file_content: bytes,
        filename: str
    ) -> Dict[str, Any]:
        """
        Process document with comprehensive error handling and timeout.
        """
        try:
            # Process with timeout
            result = await asyncio.wait_for(
                self.process_document(file_content, filename),
                timeout=self.timeout_seconds
            )
            return result
        except asyncio.TimeoutError as e:
            logger.error(f"Timeout processing {filename}: {e}")
            return self._create_error_result(
                filename, "timeout_error", f"Processing exceeded {self.timeout_seconds} seconds"
            )
        except UnicodeDecodeError as e:
            logger.error(f"Encoding error processing {filename}: {e}")
            return self._create_error_result(
                filename, "encoding_error", str(e)
            )
        except Exception as e:
            logger.error(f"Unexpected error processing {filename}: {e}")
            return self._create_error_result(
                filename, "processing_error", str(e)
            )
    
    def _create_error_result(
        self,
        filename: str,
        error_type: str,
        error_message: str
    ) -> Dict[str, Any]:
        """Create error result for failed processing."""
        return {
            'document_id': f"error_{hash(filename)}",
            'filename': filename,
            'error': {
                'type': error_type,
                'message': error_message,
                'timestamp': datetime.now().isoformat()
            },
            'passages': [],
            'claims': [],
            'entities': [],
            'relationships': [],
            'normalizations': [],
            'processing_metadata': {
                'parser_version': '1.0.0+commit-hash',
                'processing_timestamp': datetime.now().isoformat(),
                'document_status': 'failed',
                'error': {
                    'type': error_type,
                    'message': error_message
                }
            }
        }
```

## Performance Optimization

### Caching

```python
from functools import lru_cache
import hashlib

class MarkdownProcessingCache:
    def __init__(self, max_size: int = 1000):
        self.cache = {}
        self.max_size = max_size
    
    def get_cached_result(self, content_hash: str) -> Optional[Dict]:
        """Get cached processing result."""
        return self.cache.get(content_hash)
    
    def cache_result(self, content_hash: str, result: Dict):
        """Cache processing result."""
        if len(self.cache) >= self.max_size:
            # Remove oldest entry
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        self.cache[content_hash] = result
    
    def get_content_hash(self, content: str) -> str:
        """Calculate content hash for caching."""
        return hashlib.md5(content.encode()).hexdigest()
```

### Batch Processing

```python
async def batch_process_markdown_documents(
    self,
    documents: List[Dict[str, Any]],
    batch_size: int = 10
) -> List[Dict[str, Any]]:
    """
    Process multiple markdown documents in batches.
    """
    results = []
    
    for i in range(0, len(documents), batch_size):
        batch = documents[i:i + batch_size]
        batch_tasks = [
            self.process_document_safely(doc['content'], doc['filename'])
            for doc in batch
        ]
        
        batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
        
        # Handle exceptions in results
        for result in batch_results:
            if isinstance(result, Exception):
                logger.error(f"Batch processing error: {result}")
                # Add error result to maintain batch size
                results.append({
                    'error': str(result),
                    'processing_metadata': {'document_status': 'failed'}
                })
            else:
                results.append(result)
    
    return results
```

### Async Processing

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

class AsyncMarkdownProcessor:
    def __init__(self, max_workers: int = 4):
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
    
    async def run_blocking(self, fn, *args):
        """Run blocking function in thread pool."""
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(self.executor, lambda: fn(*args))
```

## Testing Strategy

### Unit Tests

```python
import pytest
from unittest.mock import Mock, AsyncMock

class TestKGMarkdownProcessor:
    def setup_method(self):
        self.clinical_roberta_service = AsyncMock()
        self.terminology_client = AsyncMock()
        self.processor = KGMarkdownProcessor(
            self.clinical_roberta_service,
            self.terminology_client
        )
    
    def test_simple_markdown_processing(self):
        """Test processing of simple markdown document."""
        content = b"# Test Document\n\nThis is a test paragraph."
        result = asyncio.run(self.processor.process_document_safely(content, "test.md"))
        
        assert 'passages' in result
        assert 'claims' in result
        assert 'normalizations' in result
        assert result['processing_metadata']['document_status'] in ['complete', 'partial']
    
    def test_metadata_processing(self):
        """Test processing of YAML frontmatter."""
        content = b"---\ntitle: Test Document\nauthor: John Doe\ndate: 2023-01-01\n---\n\n# Content"
        result = asyncio.run(self.processor.process_document_safely(content, "test.md"))
        
        assert result['metadata']['title'] == 'Test Document'
        assert result['metadata']['authors'] == ['John Doe']
    
    def test_table_processing(self):
        """Test processing of markdown tables."""
        content = b"# Table Test\n\n| Drug | Dose | Indication |\n|------|------|------------|\n| Aspirin | 100mg | Pain |"
        result = asyncio.run(self.processor.process_document_safely(content, "test.md"))
        
        # Check that passages were created
        assert len(result['passages']) > 0
        # Check that table data is preserved
        table_passages = [p for p in result['passages'] if 'table_data' in p]
        assert len(table_passages) > 0
    
    def test_error_handling(self):
        """Test error handling for malformed content."""
        # Invalid UTF-8 content
        content = b"\xff\xfe\xfd"
        result = asyncio.run(self.processor.process_document_safely(content, "test.md"))
        
        assert result['processing_metadata']['document_status'] == 'failed'
        assert 'error' in result
```

### Golden File Tests

```python
def test_golden_file_processing(self):
    """Test processing with golden files."""
    # Load test fixtures
    with open("test/fixtures/sample.md", "rb") as f:
        content = f.read()
    
    result = asyncio.run(self.processor.process_document_safely(content, "sample.md"))
    
    # Compare with expected output
    with open("test/fixtures/sample_expected.json", "r") as f:
        expected = json.load(f)
    
    # Assert key properties
    assert len(result['passages']) == len(expected['passages'])
    assert len(result['claims']) == len(expected['claims'])
```

## Integration Points

### With Document Router

```python
class DocumentRouter:
    def __init__(self):
        self.pdf_processor = KGPDFProcessor()
        self.markdown_processor = KGMarkdownProcessor(clinical_roberta_service, terminology_client)
    
    async def route_document(
        self,
        file_content: bytes,
        filename: str,
        document_type: str = None
    ) -> Dict[str, Any]:
        """Route document to appropriate processor."""
        if document_type is None:
            document_type = self._detect_document_type(file_content, filename)
        
        if document_type == "pdf":
            return await self.pdf_processor.extract_for_kg(file_content, filename)
        elif document_type in ["md", "markdown"]:
            return await self.markdown_processor.process_document_safely(file_content, filename)
        else:
            raise ValueError(f"Unsupported document type: {document_type}")
```

## Observability and Metrics

### Metrics Collection

```python
import time
from typing import Dict, Any

class MetricsCollector:
    def __init__(self):
        self.metrics = {}
    
    def record_parse_time(self, duration_ms: float):
        """Record parsing time."""
        self._record_metric('parse_time_ms', duration_ms)
    
    def record_passage_count(self, count: int):
        """Record number of passages."""
        self._record_metric('num_passages', count)
    
    def record_table_count(self, count: int):
        """Record number of tables parsed."""
        self._record_metric('num_tables_parsed', count)
    
    def record_fallback_usage(self, used: bool):
        """Record if fallback was used."""
        self._record_metric('fallback_used', 1 if used else 0)
    
    def record_normalization_rate(self, rate: float):
        """Record normalization success rate."""
        self._record_metric('normalization_rate', rate)
    
    def record_avg_confidence(self, confidence: float):
        """Record average confidence score."""
        self._record_metric('avg_confidence', confidence)
    
    def _record_metric(self, name: str, value: float):
        """Record a metric."""
        if name not in self.metrics:
            self.metrics[name] = []
        self.metrics[name].append(value)
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get collected metrics."""
        result = {}
        for name, values in self.metrics.items():
            if values:
                result[name] = {
                    'count': len(values),
                    'sum': sum(values),
                    'avg': sum(values) / len(values),
                    'min': min(values),
                    'max': max(values)
                }
        return result
```

### Structured Logging

```python
import logging
import json
from typing import Dict, Any

logger = logging.getLogger(__name__)

class StructuredLogger:
    def log_processing_result(
        self,
        document_id: str,
        filename: str,
        metrics: Dict[str, Any],
        error: Dict[str, Any] = None
    ):
        """Log structured processing result."""
        log_entry = {
            'timestamp': time.time(),
            'document_id': document_id,
            'filename': filename,
            'metrics': metrics
        }
        
        if error:
            log_entry['error'] = error
        
        logger.info(json.dumps(log_entry))
```

## Security and Privacy

### PII Detection

```python
class PIIDetector:
    def __init__(self):
        # Patterns for detecting PII
        self.patterns = {
            'email': r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
            'phone': r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b',
            'ssn': r'\b\d{3}-?\d{2}-?\d{4}\b'
        }
    
    def detect_pii(self, text: str) -> Dict[str, Any]:
        """Detect PII in text."""
        import re
        
        pii_found = {}
        for pii_type, pattern in self.patterns.items():
            matches = re.findall(pattern, text)
            if matches:
                pii_found[pii_type] = matches
        
        return {
            'has_pii': len(pii_found) > 0,
            'pii_types': list(pii_found.keys()),
            'redaction_required': len(pii_found) > 0
        }
    
    def redact_pii(self, text: str) -> str:
        """Redact PII from text."""
        import re
        
        redacted_text = text
        for pii_type, pattern in self.patterns.items():
            redacted_text = re.sub(pattern, f"[REDACTED_{pii_type.upper()}]", redacted_text)
        
        return redacted_text
```

## Future Extensions

### Planned Enhancements

1. **Math Formula Processing** - Handle LaTeX math expressions
2. **Diagram Recognition** - Process mermaid diagrams and other visual elements
3. **Reference Resolution** - Resolve and process citations
4. **Multi-language Support** - Handle documents in different languages
5. **Advanced Chunking** - Implement more sophisticated semantic chunking algorithms
6. **Claim Validation** - Add validation for extracted claims
7. **Incremental Processing** - Support incremental updates to documents

### Integration with Other Systems

1. **Langroid Agents** - Provide processed markdown as context for agents
2. **Active Learning** - Use processing results to improve entity extraction
3. **Quality Assurance** - Implement automated quality checks for processed documents
4. **Human-in-the-loop** - Add review workflows for critical documents
5. **Vector Database Integration** - Store embeddings for semantic search

## Implementation Roadmap

### Phase 1: Core Implementation
- [x] Implement markdown parsing with markdown-it-py
- [x] Add frontmatter processing with python-frontmatter
- [x] Implement structure extraction with position tracking
- [x] Create semantic chunking functionality

### Phase 2: Enhancement
- [x] Add table processing with structured data extraction
- [x] Implement link and reference processing
- [x] Add code block handling with language detection
- [x] Implement comprehensive error handling

### Phase 3: GraphRAG Integration
- [x] Integrate with Clinical RoBERTa for entity extraction
- [x] Add claim generation from relationships
- [x] Implement terminology normalization service
- [x] Add caching and performance optimization

### Phase 4: Testing and Deployment
- [x] Unit testing for all components
- [x] Integration testing with document router
- [x] Performance testing and optimization
- [x] Production deployment with observability

### Phase 5: Advanced Features
- [ ] Add math formula processing
- [ ] Implement diagram recognition
- [ ] Add reference resolution
- [ ] Enhance multi-language support