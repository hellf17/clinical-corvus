# Knowledge Graph Query and Retrieval System Design

## Overview

This document outlines the design for the Knowledge Graph (KG) query and retrieval system in Clinical Corvus. The system provides advanced querying capabilities for medical knowledge with support for entity search, relationship traversal, and complex graph queries.

## System Architecture

### Core Components

1. **Query Parser** - Parse and validate user queries
2. **Query Planner** - Plan execution strategy for complex queries
3. **Query Executor** - Execute queries against the Neo4j database
4. **Result Formatter** - Format results for different output formats
5. **Query Cache** - Cache frequent queries for performance
6. **Access Control** - Enforce security and privacy controls

### Data Flow

```
[User Query]
     ↓
[Query Parser]
     ↓
[Query Planner]
     ↓
[Query Executor] ←→ [Neo4j Database]
     ↓
[Result Formatter]
     ↓
[Query Cache]
     ↓
[Access Control]
     ↓
[Formatted Results]
```

## Implementation

### Query Parser

```python
import re
from typing import Dict, Any, List, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class QueryType(Enum):
    ENTITY_SEARCH = "entity_search"
    RELATIONSHIP_QUERY = "relationship_query"
    GRAPH_TRAVERSAL = "graph_traversal"
    COMPLEX_QUERY = "complex_query"
    PATH_FINDING = "path_finding"

class QueryParser:
    def __init__(self):
        # Define query patterns
        self.patterns = {
            "entity_search": [
                r"find (?:all )?(entities|diseases|drugs|symptoms|procedures)",
                r"search for (?:medical )?(entities|concepts)",
                r"what are the ([a-zA-Z]+) related to"
            ],
            "relationship_query": [
                r"find (?:the )?(relationship|connection|link) between",
                r"how (?:is|are) (.+) (?:related|connected) to",
                r"what (?:is|are) the (?:relationship|connection) of"
            ],
            "graph_traversal": [
                r"(?:traverse|explore) (?:the )?graph from",
                r"find (?:all )?(?:connected|related) (?:entities|nodes)",
                r"show (?:me )?the (?:network|graph) around"
            ],
            "path_finding": [
                r"find (?:the )?path from (.+) to (.+)",
                r"how (?:can|do) (?:we )?get from (.+) to (.+)",
                r"shortest path between (.+) and (.+)"
            ]
        }
    
    def parse_query(self, query_text: str) -> Dict[str, Any]:
        """
        Parse user query and determine query type and parameters.
        
        Args:
            query_text: User query text
            
        Returns:
            Dict with parsed query information
        """
        query_text = query_text.strip()
        
        # Determine query type
        query_type = self._determine_query_type(query_text)
        
        # Extract parameters based on query type
        parameters = self._extract_parameters(query_text, query_type)
        
        # Validate parameters
        validation_result = self._validate_parameters(parameters, query_type)
        
        return {
            "original_query": query_text,
            "query_type": query_type.value if query_type else None,
            "parameters": parameters,
            "validation": validation_result
        }
    
    def _determine_query_type(self, query_text: str) -> Optional[QueryType]:
        """Determine query type based on query text."""
        query_lower = query_text.lower()
        
        # Check each pattern type
        for query_type, patterns in self.patterns.items():
            for pattern in patterns:
                if re.search(pattern, query_lower):
                    return QueryType(query_type)
        
        # Default to entity search for simple queries
        if len(query_text.split()) <= 5:
            return QueryType.ENTITY_SEARCH
        
        # Default to complex query for longer queries
        return QueryType.COMPLEX_QUERY
    
    def _extract_parameters(
        self,
        query_text: str,
        query_type: QueryType
    ) -> Dict[str, Any]:
        """Extract parameters based on query type."""
        parameters = {"query_text": query_text}
        
        if query_type == QueryType.ENTITY_SEARCH:
            parameters.update(self._extract_entity_search_params(query_text))
        elif query_type == QueryType.RELATIONSHIP_QUERY:
            parameters.update(self._extract_relationship_params(query_text))
        elif query_type == QueryType.GRAPH_TRAVERSAL:
            parameters.update(self._extract_traversal_params(query_text))
        elif query_type == QueryType.PATH_FINDING:
            parameters.update(self._extract_path_params(query_text))
        
        return parameters
    
    def _extract_entity_search_params(self, query_text: str) -> Dict[str, Any]:
        """Extract parameters for entity search."""
        params = {}
        
        # Extract entity types
        entity_types = re.findall(
            r"(disease|drug|symptom|procedure|anatomy|gene|protein)", 
            query_text.lower()
        )
        if entity_types:
            params["entity_types"] = list(set(entity_types))
        
        # Extract search terms
        # Remove common words and extract potential entities
        common_words = {
            "find", "search", "for", "the", "what", "are", "is", "a", "an",
            "in", "of", "to", "and", "or", "with", "by", "on", "at", "from"
        }
        
        words = [word.strip(".,!?;:") for word in query_text.lower().split()]
        search_terms = [word for word in words if word not in common_words and len(word) > 2]
        if search_terms:
            params["search_terms"] = search_terms
        
        return params
    
    def _extract_relationship_params(self, query_text: str) -> Dict[str, Any]:
        """Extract parameters for relationship queries."""
        params = {}
        
        # Extract entities mentioned in relationship context
        # Look for "between X and Y" or "X related to Y" patterns
        between_match = re.search(r"between ([^,]+) and ([^.!?]+)", query_text, re.IGNORECASE)
        if between_match:
            params["source_entity"] = between_match.group(1).strip()
            params["target_entity"] = between_match.group(2).strip()
        
        related_match = re.search(r"(.+) (?:related|connected) to (.+)", query_text, re.IGNORECASE)
        if related_match and "source_entity" not in params:
            params["source_entity"] = related_match.group(1).strip()
            params["target_entity"] = related_match.group(2).strip()
        
        # Extract relationship types if mentioned
        rel_types = re.findall(
            r"(causes|treats|side_effect|associated_with|contraindicated|diagnoses|prevents|manifestation)",
            query_text.lower()
        )
        if rel_types:
            params["relationship_types"] = list(set(rel_types))
        
        return params
    
    def _extract_traversal_params(self, query_text: str) -> Dict[str, Any]:
        """Extract parameters for graph traversal."""
        params = {}
        
        # Extract starting entity
        from_match = re.search(r"from ([^.!?]+)", query_text, re.IGNORECASE)
        if from_match:
            params["start_entity"] = from_match.group(1).strip()
        
        # Extract traversal depth
        depth_match = re.search(r"(?:depth|level)s? (\d+)", query_text, re.IGNORECASE)
        if depth_match:
            params["max_depth"] = int(depth_match.group(1))
        else:
            params["max_depth"] = 3  # Default depth
        
        return params
    
    def _extract_path_params(self, query_text: str) -> Dict[str, Any]:
        """Extract parameters for path finding."""
        params = {}
        
        # Extract source and target entities
        path_match = re.search(r"(?:from|between) ([^,]+) (?:to|and) ([^.!?]+)", query_text, re.IGNORECASE)
        if path_match:
            params["source_entity"] = path_match.group(1).strip()
            params["target_entity"] = path_match.group(2).strip()
        
        return params
    
    def _validate_parameters(
        self,
        parameters: Dict[str, Any],
        query_type: QueryType
    ) -> Dict[str, Any]:
        """Validate extracted parameters."""
        validation = {
            "valid": True,
            "errors": [],
            "warnings": []
        }
        
        # Check for required parameters
        if query_type == QueryType.ENTITY_SEARCH:
            if not parameters.get("search_terms") and not parameters.get("entity_types"):
                validation["warnings"].append("No search terms or entity types specified")
        
        elif query_type in [QueryType.RELATIONSHIP_QUERY, QueryType.PATH_FINDING]:
            if not parameters.get("source_entity") or not parameters.get("target_entity"):
                validation["valid"] = False
                validation["errors"].append("Both source and target entities are required")
        
        elif query_type == QueryType.GRAPH_TRAVERSAL:
            if not parameters.get("start_entity"):
                validation["valid"] = False
                validation["errors"].append("Starting entity is required for traversal")
        
        # Validate parameter values
        if "max_depth" in parameters:
            max_depth = parameters["max_depth"]
            if max_depth < 1 or max_depth > 10:
                validation["warnings"].append("Traversal depth should be between 1 and 10")
        
        return validation
```

### Query Planner

```python
from typing import Dict, Any, List, Optional
import asyncio
import logging

logger = logging.getLogger(__name__)

class QueryPlan:
    def __init__(self, query_type: str, steps: List[Dict[str, Any]]):
        self.query_type = query_type
        self.steps = steps
        self.optimized = False
    
    def add_step(self, step: Dict[str, Any]):
        """Add a step to the query plan."""
        self.steps.append(step)
    
    def optimize(self):
        """Optimize the query plan."""
        # Simple optimization: reorder steps for efficiency
        # In practice, this would be more sophisticated
        self.optimized = True
        logger.info("Query plan optimized")

class QueryPlanner:
    def __init__(self, kg_interface):
        self.kg_interface = kg_interface
    
    async def create_plan(self, parsed_query: Dict[str, Any]) -> QueryPlan:
        """
        Create execution plan for parsed query.
        
        Args:
            parsed_query: Parsed query information
            
        Returns:
            QueryPlan object
        """
        query_type = parsed_query.get("query_type")
        parameters = parsed_query.get("parameters", {})
        
        if query_type == "entity_search":
            plan = await self._plan_entity_search(parameters)
        elif query_type == "relationship_query":
            plan = await self._plan_relationship_query(parameters)
        elif query_type == "graph_traversal":
            plan = await self._plan_graph_traversal(parameters)
        elif query_type == "path_finding":
            plan = await self._plan_path_finding(parameters)
        else:
            plan = await self._plan_complex_query(parameters)
        
        # Optimize the plan
        plan.optimize()
        
        return plan
    
    async def _plan_entity_search(self, parameters: Dict[str, Any]) -> QueryPlan:
        """Create plan for entity search."""
        steps = [
            {
                "type": "entity_search",
                "description": "Search for entities in knowledge graph",
                "parameters": {
                    "search_terms": parameters.get("search_terms", []),
                    "entity_types": parameters.get("entity_types", []),
                    "limit": parameters.get("limit", 50)
                }
            }
        ]
        
        return QueryPlan("entity_search", steps)
    
    async def _plan_relationship_query(self, parameters: Dict[str, Any]) -> QueryPlan:
        """Create plan for relationship query."""
        steps = [
            {
                "type": "entity_lookup",
                "description": "Find source entity",
                "parameters": {
                    "entity_name": parameters.get("source_entity")
                }
            },
            {
                "type": "entity_lookup",
                "description": "Find target entity",
                "parameters": {
                    "entity_name": parameters.get("target_entity")
                }
            },
            {
                "type": "relationship_search",
                "description": "Find relationships between entities",
                "parameters": {
                    "source_entity_id": "{step_0_result.id}",
                    "target_entity_id": "{step_1_result.id}",
                    "relationship_types": parameters.get("relationship_types", [])
                }
            }
        ]
        
        return QueryPlan("relationship_query", steps)
    
    async def _plan_graph_traversal(self, parameters: Dict[str, Any]) -> QueryPlan:
        """Create plan for graph traversal."""
        steps = [
            {
                "type": "entity_lookup",
                "description": "Find starting entity",
                "parameters": {
                    "entity_name": parameters.get("start_entity")
                }
            },
            {
                "type": "graph_traversal",
                "description": "Traverse graph from starting entity",
                "parameters": {
                    "start_entity_id": "{step_0_result.id}",
                    "max_depth": parameters.get("max_depth", 3),
                    "relationship_filters": parameters.get("relationship_filters", {})
                }
            }
        ]
        
        return QueryPlan("graph_traversal", steps)
    
    async def _plan_path_finding(self, parameters: Dict[str, Any]) -> QueryPlan:
        """Create plan for path finding."""
        steps = [
            {
                "type": "entity_lookup",
                "description": "Find source entity",
                "parameters": {
                    "entity_name": parameters.get("source_entity")
                }
            },
            {
                "type": "entity_lookup",
                "description": "Find target entity",
                "parameters": {
                    "entity_name": parameters.get("target_entity")
                }
            },
            {
                "type": "path_finding",
                "description": "Find shortest path between entities",
                "parameters": {
                    "source_entity_id": "{step_0_result.id}",
                    "target_entity_id": "{step_1_result.id}",
                    "max_depth": parameters.get("max_depth", 5)
                }
            }
        ]
        
        return QueryPlan("path_finding", steps)
    
    async def _plan_complex_query(self, parameters: Dict[str, Any]) -> QueryPlan:
        """Create plan for complex queries."""
        # For complex queries, break them down into simpler steps
        steps = [
            {
                "type": "fulltext_search",
                "description": "Initial full-text search",
                "parameters": {
                    "query": parameters.get("query_text", ""),
                    "limit": 100
                }
            },
            {
                "type": "entity_extraction",
                "description": "Extract entities from search results",
                "parameters": {
                    "content": "{step_0_result.content}"
                }
            },
            {
                "type": "relationship_analysis",
                "description": "Analyze relationships between extracted entities",
                "parameters": {
                    "entities": "{step_1_result.entities}"
                }
            }
        ]
        
        return QueryPlan("complex_query", steps)
```

### Query Executor

```python
import neo4j
from typing import Dict, Any, List, Optional
import asyncio
import logging

logger = logging.getLogger(__name__)

class QueryExecutor:
    def __init__(self, kg_interface):
        self.kg_interface = kg_interface
    
    async def execute_plan(
        self,
        query_plan: QueryPlan,
        parsed_query: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Execute query plan and return results.
        
        Args:
            query_plan: Query plan to execute
            parsed_query: Original parsed query
            
        Returns:
            Query execution results
        """
        start_time = asyncio.get_event_loop().time()
        
        results = {}
        step_results = {}
        
        try:
            # Execute each step in the plan
            for i, step in enumerate(query_plan.steps):
                step_result = await self._execute_step(step, step_results)
                step_results[f"step_{i}"] = step_result
                step_results[f"step_{i}_result"] = step_result
            
            # Combine results
            results = self._combine_step_results(step_results, query_plan)
            
            # Calculate execution time
            execution_time = asyncio.get_event_loop().time() - start_time
            
            return {
                "success": True,
                "results": results,
                "execution_time": execution_time,
                "steps_executed": len(query_plan.steps),
                "query_info": {
                    "original_query": parsed_query.get("original_query", ""),
                    "query_type": parsed_query.get("query_type", ""),
                    "parameters": parsed_query.get("parameters", {})
                }
            }
            
        except Exception as e:
            logger.error(f"Query execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "execution_time": asyncio.get_event_loop().time() - start_time,
                "query_info": {
                    "original_query": parsed_query.get("original_query", ""),
                    "query_type": parsed_query.get("query_type", ""),
                    "parameters": parsed_query.get("parameters", {})
                }
            }
    
    async def _execute_step(
        self,
        step: Dict[str, Any],
        previous_results: Dict[str, Any]
    ) -> Any:
        """Execute a single step in the query plan."""
        step_type = step["type"]
        parameters = step["parameters"]
        
        # Substitute placeholders with actual values
        resolved_params = self._resolve_placeholders(parameters, previous_results)
        
        logger.info(f"Executing step: {step_type} with params: {resolved_params}")
        
        if step_type == "entity_search":
            return await self._execute_entity_search(resolved_params)
        elif step_type == "entity_lookup":
            return await self._execute_entity_lookup(resolved_params)
        elif step_type == "relationship_search":
            return await self._execute_relationship_search(resolved_params)
        elif step_type == "graph_traversal":
            return await self._execute_graph_traversal(resolved_params)
        elif step_type == "path_finding":
            return await self._execute_path_finding(resolved_params)
        elif step_type == "fulltext_search":
            return await self._execute_fulltext_search(resolved_params)
        elif step_type == "entity_extraction":
            return await self._execute_entity_extraction(resolved_params)
        elif step_type == "relationship_analysis":
            return await self._execute_relationship_analysis(resolved_params)
        else:
            raise ValueError(f"Unknown step type: {step_type}")
    
    def _resolve_placeholders(
        self,
        parameters: Dict[str, Any],
        previous_results: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Resolve placeholders in parameters with actual values."""
        resolved = {}
        
        for key, value in parameters.items():
            if isinstance(value, str) and value.startswith("{") and value.endswith("}"):
                # This is a placeholder, resolve it
                placeholder = value[1:-1]  # Remove braces
                if placeholder in previous_results:
                    resolved[key] = previous_results[placeholder]
                else:
                    resolved[key] = value  # Keep original if not found
            else:
                resolved[key] = value
        
        return resolved
    
    async def _execute_entity_search(self, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute entity search step."""
        search_terms = parameters.get("search_terms", [])
        entity_types = parameters.get("entity_types", [])
        limit = parameters.get("limit", 50)
        
        # Combine search terms for full-text search
        query = " ".join(search_terms) if search_terms else ""
        
        return await self.kg_interface.search_entities(
            query=query,
            entity_types=entity_types,
            limit=limit
        )
    
    async def _execute_entity_lookup(self, parameters: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Execute entity lookup step."""
        entity_name = parameters.get("entity_name")
        if not entity_name:
            return None
        
        # Search for exact match first
        results = await self.kg_interface.search_entities(
            query=entity_name,
            limit=1
        )
        
        if results:
            return results[0]
        
        # If no exact match, try fuzzy search
        # (Implementation would depend on fuzzy matching capabilities)
        return None
    
    async def _execute_relationship_search(self, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute relationship search step."""
        source_entity_id = parameters.get("source_entity_id")
        target_entity_id = parameters.get("target_entity_id")
        relationship_types = parameters.get("relationship_types", [])
        
        return await self.kg_interface.find_relationships(
            source_entity_id=source_entity_id,
            target_entity_id=target_entity_id,
            relation_types=relationship_types
        )
    
    async def _execute_graph_traversal(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute graph traversal step."""
        start_entity_id = parameters.get("start_entity_id")
        max_depth = parameters.get("max_depth", 3)
        relationship_filters = parameters.get("relationship_filters", {})
        
        if not start_entity_id:
            return {"nodes": [], "relationships": []}
        
        return await self.kg_interface.traverse_graph(
            start_entity_id=start_entity_id,
            max_depth=max_depth,
            relationship_filters=relationship_filters
        )
    
    async def _execute_path_finding(self, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute path finding step."""
        source_entity_id = parameters.get("source_entity_id")
        target_entity_id = parameters.get("target_entity_id")
        max_depth = parameters.get("max_depth", 5)
        
        if not source_entity_id or not target_entity_id:
            return []
        
        # Use Neo4j's built-in shortest path algorithm
        async with self.kg_interface.driver.session() as session:
            query = """
            MATCH (source), (target)
            WHERE id(source) = $source_id AND id(target) = $target_id
            MATCH path = shortestPath((source)-[*..$max_depth]-(target))
            RETURN path
            """
            
            result = await session.run(
                query,
                source_id=int(source_entity_id),
                target_id=int(target_entity_id),
                max_depth=max_depth
            )
            
            paths = []
            async for record in result:
                path = record["path"]
                # Convert path to serializable format
                path_data = {
                    "nodes": [{"id": node.id, "properties": dict(node.items())} for node in path.nodes],
                    "relationships": [
                        {
                            "id": rel.id,
                            "type": rel.type,
                            "properties": dict(rel.items()),
                            "start_node": rel.start_node.id,
                            "end_node": rel.end_node.id
                        }
                        for rel in path.relationships
                    ]
                }
                paths.append(path_data)
            
            return paths
    
    async def _execute_fulltext_search(self, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute full-text search step."""
        query = parameters.get("query", "")
        limit = parameters.get("limit", 100)
        
        # This would typically search across multiple indices or stores
        # For now, we'll search the KG fulltext index
        return await self.kg_interface.search_entities(
            query=query,
            limit=limit
        )
    
    async def _execute_entity_extraction(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute entity extraction step."""
        # This would typically use NLP models like Clinical RoBERTa
        # For now, we'll return a placeholder
        content = parameters.get("content", "")
        
        # Simple keyword-based entity extraction (placeholder)
        import re
        
        # Extract potential medical entities
        diseases = re.findall(r'\b(diabetes|hypertension|cancer|heart disease|asthma)\b', content, re.IGNORECASE)
        drugs = re.findall(r'\b(aspirin|insulin|metformin|lisinopril|atorvastatin)\b', content, re.IGNORECASE)
        
        return {
            "entities": {
                "diseases": list(set(diseases)),
                "drugs": list(set(drugs))
            }
        }
    
    async def _execute_relationship_analysis(self, parameters: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute relationship analysis step."""
        entities = parameters.get("entities", {})
        
        # Analyze relationships between extracted entities
        # This is a simplified implementation
        relationships = []
        
        diseases = entities.get("diseases", [])
        drugs = entities.get("drugs", [])
        
        # Create potential relationships
        for disease in diseases:
            for drug in drugs:
                relationships.append({
                    "source": disease,
                    "target": drug,
                    "type": "POTENTIAL_TREATMENT",
                    "confidence": 0.7
                })
        
        return relationships
    
    def _combine_step_results(
        self,
        step_results: Dict[str, Any],
        query_plan: QueryPlan
    ) -> Dict[str, Any]:
        """Combine results from all steps."""
        # The final result is typically from the last step
        last_step_key = f"step_{len(query_plan.steps) - 1}_result"
        if last_step_key in step_results:
            return step_results[last_step_key]
        
        # If no final result, combine all step results
        combined = {}
        for key, value in step_results.items():
            if key.startswith("step_") and key.endswith("_result"):
                step_index = int(key.split("_")[1])
                combined[f"step_{step_index}"] = value
        
        return combined
```

### Result Formatter

```python
from typing import Dict, Any, List, Union
import json
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ResultFormatter:
    def __init__(self):
        self.supported_formats = ["json", "table", "graph", "text"]
    
    def format_results(
        self,
        execution_results: Dict[str, Any],
        output_format: str = "json",
        include_metadata: bool = True
    ) -> Union[str, Dict[str, Any]]:
        """
        Format query results for output.
        
        Args:
            execution_results: Results from query execution
            output_format: Desired output format
            include_metadata: Whether to include execution metadata
            
        Returns:
            Formatted results
        """
        if not execution_results.get("success", False):
            return self._format_error(execution_results, output_format)
        
        results = execution_results.get("results", {})
        
        if output_format == "json":
            return self._format_json(results, execution_results, include_metadata)
        elif output_format == "table":
            return self._format_table(results, execution_results, include_metadata)
        elif output_format == "graph":
            return self._format_graph(results, execution_results, include_metadata)
        elif output_format == "text":
            return self._format_text(results, execution_results, include_metadata)
        else:
            # Default to JSON
            return self._format_json(results, execution_results, include_metadata)
    
    def _format_json(
        self,
        results: Any,
        execution_results: Dict[str, Any],
        include_metadata: bool
    ) -> Dict[str, Any]:
        """Format results as JSON."""
        formatted = {
            "data": results
        }
        
        if include_metadata:
            formatted["metadata"] = {
                "query_info": execution_results.get("query_info", {}),
                "execution_time": execution_results.get("execution_time", 0),
                "steps_executed": execution_results.get("steps_executed", 0),
                "timestamp": datetime.now().isoformat()
            }
        
        return formatted
    
    def _format_table(
        self,
        results: Any,
        execution_results: Dict[str, Any],
        include_metadata: bool
    ) -> str:
        """Format results as a text table."""
        if isinstance(results, list):
            return self._format_list_as_table(results, execution_results, include_metadata)
        elif isinstance(results, dict):
            return self._format_dict_as_table(results, execution_results, include_metadata)
        else:
            return str(results)
    
    def _format_list_as_table(
        self,
        results: List[Dict[str, Any]],
        execution_results: Dict[str, Any],
        include_metadata: bool
    ) -> str:
        """Format list of results as a table."""
        if not results:
            return "No results found."
        
        # Determine columns from first result
        if isinstance(results[0], dict):
            columns = list(results[0].keys())
        else:
            columns = ["value"]
        
        # Create table header
        header = " | ".join(f"{col:^15}" for col in columns)
        separator = "-+-".join("-" * 15 for _ in columns)
        
        # Create table rows
        rows = []
        for result in results[:20]:  # Limit to 20 rows
            if isinstance(result, dict):
                row_values = [str(result.get(col, ""))[:15] for col in columns]
            else:
                row_values = [str(result)[:15]]
            rows.append(" | ".join(f"{val:<15}" for val in row_values))
        
        # Combine table parts
        table_parts = [header, separator] + rows
        
        if include_metadata:
            metadata = execution_results.get("metadata", {})
            table_parts.append("")
            table_parts.append(f"Execution time: {metadata.get('execution_time', 0):.2f}s")
            table_parts.append(f"Results count: {len(results)}")
        
        return "\n".join(table_parts)
    
    def _format_dict_as_table(
        self,
        results: Dict[str, Any],
        execution_results: Dict[str, Any],
        include_metadata: bool
    ) -> str:
        """Format dictionary results as a table."""
        # Convert dict to key-value pairs
        rows = []
        for key, value in list(results.items())[:20]:  # Limit to 20 items
            if isinstance(value, (list, dict)):
                value_str = json.dumps(value, indent=2, default=str)[:50] + "..."
            else:
                value_str = str(value)
            rows.append([str(key)[:20], value_str[:50]])
        
        # Create table
        header = f"{'Key':<20} | {'Value':<50}"
        separator = "-" * 20 + "-+-" + "-" * 50
        
        table_rows = [header, separator]
        for row in rows:
            table_rows.append(f"{row[0]:<20} | {row[1]:<50}")
        
        if include_metadata:
            metadata = execution_results.get("metadata", {})
            table_rows.append("")
            table_rows.append(f"Execution time: {metadata.get('execution_time', 0):.2f}s")
        
        return "\n".join(table_rows)
    
    def _format_graph(
        self,
        results: Any,
        execution_results: Dict[str, Any],
        include_metadata: bool
    ) -> Dict[str, Any]:
        """Format results as a graph structure."""
        # This format is primarily for visualization tools
        graph_data = {
            "nodes": [],
            "edges": [],
            "metadata": {}
        }
        
        if isinstance(results, dict):
            if "nodes" in results and "relationships" in results:
                # Already in graph format
                graph_data["nodes"] = results["nodes"]
                graph_data["edges"] = results["relationships"]
            else:
                # Convert dict to graph format
                for key, value in results.items():
                    node = {
                        "id": key,
                        "label": key,
                        "properties": {"value": value}
                    }
                    graph_data["nodes"].append(node)
        elif isinstance(results, list):
            # Convert list to graph format
            for i, item in enumerate(results):
                if isinstance(item, dict):
                    node = {
                        "id": f"item_{i}",
                        "label": item.get("type", "Item"),
                        "properties": item
                    }
                    graph_data["nodes"].append(node)
                else:
                    node = {
                        "id": f"item_{i}",
                        "label": "Item",
                        "properties": {"value": item}
                    }
                    graph_data["nodes"].append(node)
        
        if include_metadata:
            graph_data["metadata"] = execution_results.get("metadata", {})
        
        return graph_data
    
    def _format_text(
        self,
        results: Any,
        execution_results: Dict[str, Any],
        include_metadata: bool
    ) -> str:
        """Format results as plain text."""
        lines = []
        
        if isinstance(results, list):
            for i, item in enumerate(results[:20]):  # Limit to 20 items
                lines.append(f"Result {i + 1}:")
                if isinstance(item, dict):
                    for key, value in item.items():
                        lines.append(f"  {key}: {value}")
                else:
                    lines.append(f"  {item}")
                lines.append("")
        elif isinstance(results, dict):
            for key, value in results.items():
                if isinstance(value, (list, dict)):
                    lines.append(f"{key}:")
                    lines.append(json.dumps(value, indent=2, default=str))
                else:
                    lines.append(f"{key}: {value}")
                lines.append("")
        else:
            lines.append(str(results))
        
        if include_metadata:
            metadata = execution_results.get("metadata", {})
            lines.append(f"--- Metadata ---")
            lines.append(f"Execution time: {metadata.get('execution_time', 0):.2f} seconds")
            lines.append(f"Steps executed: {metadata.get('steps_executed', 0)}")
            lines.append(f"Timestamp: {metadata.get('timestamp', 'N/A')}")
        
        return "\n".join(lines)
    
    def _format_error(
        self,
        execution_results: Dict[str, Any],
        output_format: str
    ) -> Union[str, Dict[str, Any]]:
        """Format error results."""
        error_info = {
            "error": execution_results.get("error", "Unknown error"),
            "success": False
        }
        
        if output_format == "json":
            return error_info
        else:
            return f"Error: {error_info['error']}"
```

### Query Cache

```python
import hashlib
import json
import time
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class QueryCache:
    def __init__(self, max_size: int = 1000, ttl: int = 3600):
        """
        Initialize query cache.
        
        Args:
            max_size: Maximum number of cached items
            ttl: Time to live in seconds
        """
        self.max_size = max_size
        self.ttl = ttl
        self.cache = {}  # key -> (value, timestamp)
        self.access_order = []  # For LRU eviction
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get cached value for key.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        if key not in self.cache:
            return None
        
        value, timestamp = self.cache[key]
        
        # Check if expired
        if time.time() - timestamp > self.ttl:
            self._remove(key)
            return None
        
        # Update access order for LRU
        self._update_access_order(key)
        
        return value
    
    def set(self, key: str, value: Any):
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
        """
        # Remove oldest items if cache is full
        if len(self.cache) >= self.max_size:
            self._evict_lru()
        
        self.cache[key] = (value, time.time())
        self._update_access_order(key)
        
        logger.debug(f"Cached query result for key: {key}")
    
    def generate_key(self, query_info: Dict[str, Any]) -> str:
        """
        Generate cache key for query information.
        
        Args:
            query_info: Query information
            
        Returns:
            Cache key
        """
        # Create deterministic key from query info
        key_data = {
            "query_type": query_info.get("query_type"),
            "parameters": query_info.get("parameters", {}),
            "format": query_info.get("format", "json")
        }
        
        # Sort dict keys for deterministic hashing
        key_json = json.dumps(key_data, sort_keys=True, default=str)
        return hashlib.md5(key_json.encode()).hexdigest()
    
    def invalidate(self, key: str):
        """
        Invalidate cache entry.
        
        Args:
            key: Cache key to invalidate
        """
        self._remove(key)
    
    def clear(self):
        """Clear entire cache."""
        self.cache.clear()
        self.access_order.clear()
        logger.info("Query cache cleared")
    
    def _update_access_order(self, key: str):
        """Update access order for LRU."""
        if key in self.access_order:
            self.access_order.remove(key)
        self.access_order.append(key)
    
    def _remove(self, key: str):
        """Remove key from cache."""
        if key in self.cache:
            del self.cache[key]
        if key in self.access_order:
            self.access_order.remove(key)
    
    def _evict_lru(self):
        """Evict least recently used item."""
        if self.access_order:
            lru_key = self.access_order.pop(0)
            if lru_key in self.cache:
                del self.cache[lru_key]
            logger.debug(f"Evicted LRU cache entry: {lru_key}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "size": len(self.cache),
            "max_size": self.max_size,
            "ttl": self.ttl
        }
```

### Access Control

```python
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class AccessControl:
    def __init__(self):
        # Define access levels
        self.access_levels = {
            "public": 1,
            "authenticated": 2,
            "doctor": 3,
            "researcher": 4,
            "admin": 5
        }
        
        # Define query type restrictions
        self.query_restrictions = {
            "entity_search": "public",
            "relationship_query": "authenticated",
            "graph_traversal": "doctor",
            "path_finding": "researcher",
            "complex_query": "researcher"
        }
    
    def check_access(
        self,
        user_role: str,
        query_type: str,
        query_parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Check if user has access to perform query.
        
        Args:
            user_role: User's role
            query_type: Type of query
            query_parameters: Query parameters
            
        Returns:
            Access check result
        """
        # Get required access level for query type
        required_level_str = self.query_restrictions.get(
            query_type, "authenticated"
        )
        required_level = self.access_levels.get(required_level_str, 2)
        
        # Get user's access level
        user_level = self.access_levels.get(user_role, 1)
        
        # Check access
        has_access = user_level >= required_level
        
        # Additional checks for sensitive data
        sensitivity_check = self._check_data_sensitivity(
            query_parameters, user_role
        )
        
        if not sensitivity_check["allowed"]:
            has_access = False
        
        return {
            "allowed": has_access,
            "required_level": required_level_str,
            "user_level": user_role,
            "sensitivity_check": sensitivity_check
        }
    
    def _check_data_sensitivity(
        self,
        query_parameters: Dict[str, Any],
        user_role: str
    ) -> Dict[str, Any]:
        """
        Check for sensitive data access.
        
        Args:
            query_parameters: Query parameters
            user_role: User's role
            
        Returns:
            Sensitivity check result
        """
        # Check for patient data access
        if "patient_id" in query_parameters:
            if user_role not in ["doctor", "admin"]:
                return {
                    "allowed": False,
                    "reason": "Patient data access requires doctor or admin role"
                }
        
        # Check for research data access
        if any(param in query_parameters for param in ["study_id", "trial_id"]):
            if user_role not in ["researcher", "admin"]:
                return {
                    "allowed": False,
                    "reason": "Research data access requires researcher or admin role"
                }
        
        # Check for administrative data access
        if any(param in query_parameters for param in ["user_id", "admin"]):
            if user_role != "admin":
                return {
                    "allowed": False,
                    "reason": "Administrative data access requires admin role"
                }
        
        return {
            "allowed": True,
            "reason": "No sensitive data access restrictions"
        }
    
    def filter_results(
        self,
        results: Any,
        user_role: str,
        query_parameters: Dict[str, Any]
    ) -> Any:
        """
        Filter results based on user access level.
        
        Args:
            results: Query results
            user_role: User's role
            query_parameters: Query parameters
            
        Returns:
            Filtered results
        """
        # For now, return results as-is
        # In practice, this would filter out sensitive information
        # based on user role and data sensitivity
        return results
```

## Integration with Clinical Corvus

### API Endpoints

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import asyncio

router = APIRouter()

class KGQueryRequest(BaseModel):
    query: str
    query_type: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    output_format: Optional[str] = "json"
    include_metadata: Optional[bool] = True
    user_role: Optional[str] = "public"

class KGQueryResponse(BaseModel):
    success: bool
    data: Any
    metadata: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

@router.post("/api/kg/query", response_model=KGQueryResponse)
async def kg_query(request: KGQueryRequest):
    """Execute Knowledge Graph query."""
    try:
        # Get KG query system components
        query_system = await get_kg_query_system()
        
        # Check access
        access_check = query_system.access_control.check_access(
            request.user_role,
            request.query_type or "entity_search",
            request.parameters or {}
        )
        
        if not access_check["allowed"]:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied: {access_check['sensitivity_check']['reason']}"
            )
        
        # Check cache first
        cache_key = query_system.cache.generate_key({
            "query_type": request.query_type,
            "parameters": request.parameters,
            "format": request.output_format
        })
        
        cached_result = query_system.cache.get(cache_key)
        if cached_result:
            logger.info("Returning cached query result")
            return KGQueryResponse(**cached_result)
        
        # Parse query
        parsed_query = query_system.parser.parse_query(request.query)
        
        # Validate query
        if not parsed_query["validation"]["valid"]:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid query: {parsed_query['validation']['errors']}"
            )
        
        # Create execution plan
        query_plan = await query_system.planner.create_plan(parsed_query)
        
        # Execute query
        execution_results = await query_system.executor.execute_plan(
            query_plan, parsed_query
        )
        
        # Format results
        formatted_results = query_system.formatter.format_results(
            execution_results,
            request.output_format,
            request.include_metadata
        )
        
        # Cache results
        query_system.cache.set(cache_key, {
            "success": True,
            "data": formatted_results,
            "metadata": execution_results.get("metadata", {})
        })
        
        # Apply access control filtering
        filtered_results = query_system.access_control.filter_results(
            formatted_results,
            request.user_role,
            request.parameters or {}
        )
        
        return KGQueryResponse(
            success=execution_results["success"],
            data=filtered_results,
            metadata=execution_results.get("metadata"),
            error=execution_results.get("error")
        )
        
    except Exception as e:
        logger.error(f"KG query error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error executing KG query: {str(e)}"
        )

class KGQuerySystem:
    def __init__(self):
        self.parser = QueryParser()
        self.planner = None
        self.executor = None
        self.formatter = ResultFormatter()
        self.cache = QueryCache()
        self.access_control = AccessControl()
    
    async def initialize(self, kg_interface):
        """Initialize query system with KG interface."""
        self.planner = QueryPlanner(kg_interface)
        self.executor = QueryExecutor(kg_interface)

# Global query system instance
kg_query_system = None

async def get_kg_query_system():
    """Get KG query system instance."""
    global kg_query_system
    
    if kg_query_system is None:
        # Get KG interface
        kg_interface = await get_kg_interface()
        
        # Initialize query system
        kg_query_system = KGQuerySystem()
        await kg_query_system.initialize(kg_interface)
    
    return kg_query_system
```

## Performance Optimization

### Query Optimization

```python
class QueryOptimizer:
    def __init__(self):
        self.optimization_rules = [
            self._optimize_entity_search,
            self._optimize_relationship_queries,
            self._optimize_traversal_depth,
            self._optimize_result_limiting
        ]
    
    def optimize_plan(self, query_plan: QueryPlan) -> QueryPlan:
        """Apply optimization rules to query plan."""
        optimized_plan = query_plan
        
        for rule in self.optimization_rules:
            optimized_plan = rule(optimized_plan)
        
        optimized_plan.optimized = True
        return optimized_plan
    
    def _optimize_entity_search(self, query_plan: QueryPlan) -> QueryPlan:
        """Optimize entity search queries."""
        if query_plan.query_type != "entity_search":
            return query_plan
        
        # Add indexing hints if available
        for step in query_plan.steps:
            if step["type"] == "entity_search":
                # Add fulltext index hint
                step["hints"] = ["use_fulltext_index"]
                
                # Limit results for better performance
                if step["parameters"].get("limit", 100) > 1000:
                    step["parameters"]["limit"] = 1000
        
        return query_plan
    
    def _optimize_relationship_queries(self, query_plan: QueryPlan) -> QueryPlan:
        """Optimize relationship queries."""
        if query_plan.query_type != "relationship_query":
            return query_plan
        
        # Add relationship index hints
        for step in query_plan.steps:
            if step["type"] == "relationship_search":
                step["hints"] = ["use_relationship_index"]
        
        return query_plan
    
    def _optimize_traversal_depth(self, query_plan: QueryPlan) -> QueryPlan:
        """Optimize graph traversal depth."""
        if query_plan.query_type != "graph_traversal":
            return query_plan
        
        # Limit traversal depth for performance
        for step in query_plan.steps:
            if step["type"] == "graph_traversal":
                max_depth = step["parameters"].get("max_depth", 3)
                if max_depth > 5:
                    step["parameters"]["max_depth"] = 5
                    step["warnings"] = ["Traversal depth limited to 5 for performance"]
        
        return query_plan
    
    def _optimize_result_limiting(self, query_plan: QueryPlan) -> QueryPlan:
        """Optimize result limiting."""
        # Add default limits to prevent excessive results
        for step in query_plan.steps:
            if "parameters" in step and "limit" not in step["parameters"]:
                step["parameters"]["limit"] = 1000
        
        return query_plan
```

### Monitoring and Metrics

```python
import time
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class KGQueryMetrics:
    def __init__(self):
        self.query_count = 0
        self.successful_queries = 0
        self.failed_queries = 0
        self.total_execution_time = 0.0
        self.cache_hits = 0
        self.cache_misses = 0
        self.query_types = {}
    
    def record_query(
        self,
        success: bool,
        execution_time: float,
        query_type: str,
        cache_hit: bool = False
    ):
        """Record query execution metrics."""
        self.query_count += 1
        
        if success:
            self.successful_queries += 1
        else:
            self.failed_queries += 1
        
        self.total_execution_time += execution_time
        
        if cache_hit:
            self.cache_hits += 1
        else:
            self.cache_misses += 1
        
        # Track query type distribution
        if query_type not in self.query_types:
            self.query_types[query_type] = 0
        self.query_types[query_type] += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current metrics."""
        total_queries = self.successful_queries + self.failed_queries
        success_rate = (self.successful_queries / total_queries) if total_queries > 0 else 0
        average_execution_time = (self.total_execution_time / total_queries) if total_queries > 0 else 0
        cache_hit_rate = (self.cache_hits / (self.cache_hits + self.cache_misses)) if (self.cache_hits + self.cache_misses) > 0 else 0
        
        return {
            "total_queries": self.query_count,
            "successful_queries": self.successful_queries,
            "failed_queries": self.failed_queries,
            "success_rate": success_rate,
            "average_execution_time": average_execution_time,
            "cache_hits": self.cache_hits,
            "cache_misses": self.cache_misses,
            "cache_hit_rate": cache_hit_rate,
            "query_type_distribution": self.query_types
        }
    
    def reset_metrics(self):
        """Reset all metrics."""
        self.__init__()

# Global metrics instance
metrics = KGQueryMetrics()

# Decorator for monitoring
def monitor_query(func):
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        cache_hit = False
        
        try:
            # Check if this is a cached query
            if hasattr(args[0], 'cache_key'):
                cache_hit = args[0].cache.get(args[0].cache_key) is not None
            
            result = await func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # Record successful query
            metrics.record_query(
                success=True,
                execution_time=execution_time,
                query_type=getattr(args[0], 'query_type', 'unknown'),
                cache_hit=cache_hit
            )
            
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            
            # Record failed query
            metrics.record_query(
                success=False,
                execution_time=execution_time,
                query_type=getattr(args[0], 'query_type', 'unknown')
            )
            
            raise
    return wrapper
```

## Testing Strategy

### Unit Tests

```python
import pytest
from unittest.mock import Mock, AsyncMock

class TestQueryParser:
    @pytest.fixture
    def parser(self):
        return QueryParser()
    
    def test_entity_search_parsing(self, parser):
        """Test entity search query parsing."""
        query_text = "Find all diseases related to diabetes"
        result = parser.parse_query(query_text)
        
        assert result["query_type"] == "entity_search"
        assert "diabetes" in result["parameters"]["search_terms"]
        assert "diseases" in result["parameters"]["entity_types"]
    
    def test_relationship_query_parsing(self, parser):
        """Test relationship query parsing."""
        query_text = "Find the relationship between diabetes and insulin"
        result = parser.parse_query(query_text)
        
        assert result["query_type"] == "relationship_query"
        assert result["parameters"]["source_entity"] == "diabetes"
        assert result["parameters"]["target_entity"] == "insulin"
    
    def test_graph_traversal_parsing(self, parser):
        """Test graph traversal query parsing."""
        query_text = "Traverse the graph from diabetes with depth 3"
        result = parser.parse_query(query_text)
        
        assert result["query_type"] == "graph_traversal"
        assert result["parameters"]["start_entity"] == "diabetes"
        assert result["parameters"]["max_depth"] == 3

class TestQueryExecutor:
    @pytest.mark.asyncio
    async def test_entity_search_execution(self):
        """Test entity search execution."""
        # Create mock KG interface
        mock_kg = AsyncMock()
        mock_kg.search_entities.return_value = [
            {"id": "1", "name": "Type 1 Diabetes"},
            {"id": "2", "name": "Type 2 Diabetes"}
        ]
        
        executor = QueryExecutor(mock_kg)
        
        # Create simple query plan
        plan = QueryPlan("entity_search", [
            {
                "type": "entity_search",
                "parameters": {
                    "search_terms": ["diabetes"],
                    "limit": 10
                }
            }
        ])
        
        # Execute plan
        parsed_query = {
            "original_query": "Find diabetes",
            "query_type": "entity_search",
            "parameters": {"search_terms": ["diabetes"]}
        }
        
        result = await executor.execute_plan(plan, parsed_query)
        
        # Verify results
        assert result["success"] == True
        assert len(result["results"]) == 2
        mock_kg.search_entities.assert_called_once()

class TestResultFormatter:
    def test_json_formatting(self):
        """Test JSON result formatting."""
        formatter = ResultFormatter()
        
        results = [{"id": "1", "name": "Diabetes"}]
        execution_results = {
            "success": True,
            "results": results,
            "execution_time": 0.1
        }
        
        formatted = formatter.format_results(execution_results, "json")
        
        assert "data" in formatted
        assert formatted["data"] == results
        assert "metadata" in formatted

class TestQueryCache:
    def test_cache_operations(self):
        """Test cache set/get operations."""
        cache = QueryCache(max_size=5, ttl=1)
        
        # Test setting and getting
        cache.set("key1", "value1")
        assert cache.get("key1") == "value1"
        
        # Test cache miss
        assert cache.get("nonexistent") is None
        
        # Test cache eviction
        for i in range(10):
            cache.set(f"key{i}", f"value{i}")
        
        # Should have at most 5 items
        cached_items = sum(1 for key in [f"key{i}" for i in range(10)] if cache.get(key) is not None)
        assert cached_items <= 5
```

## Deployment Considerations

### Configuration

```python
# config.py
import os

class KGQueryConfig:
    # Query Parser Configuration
    MAX_QUERY_LENGTH = int(os.getenv("MAX_QUERY_LENGTH", "1000"))
    ALLOWED_QUERY_TYPES = os.getenv(
        "ALLOWED_QUERY_TYPES",
        "entity_search,relationship_query,graph_traversal,path_finding,complex_query"
    ).split(",")
    
    # Cache Configuration
    QUERY_CACHE_SIZE = int(os.getenv("QUERY_CACHE_SIZE", "1000"))
    QUERY_CACHE_TTL = int(os.getenv("QUERY_CACHE_TTL", "3600"))  # 1 hour
    
    # Performance Configuration
    DEFAULT_QUERY_LIMIT = int(os.getenv("DEFAULT_QUERY_LIMIT", "100"))
    MAX_QUERY_LIMIT = int(os.getenv("MAX_QUERY_LIMIT", "10000"))
    MAX_TRAVERSAL_DEPTH = int(os.getenv("MAX_TRAVERSAL_DEPTH", "5"))
    
    # Access Control Configuration
    DEFAULT_USER_ROLE = os.getenv("DEFAULT_USER_ROLE", "public")
    
    # Logging Configuration
    QUERY_LOGGING_ENABLED = os.getenv("QUERY_LOGGING_ENABLED", "true").lower() == "true"
    DETAILED_QUERY_LOGGING = os.getenv("DETAILED_QUERY_LOGGING", "false").lower() == "true"
```

### Health Checks

```python
@router.get("/api/kg/health")
async def kg_health_check():
    """Health check endpoint for KG query system."""
    try:
        # Check if KG is accessible
        kg_interface = await get_kg_interface()
        async with kg_interface.driver.session() as session:
            await session.run("RETURN 1")
        
        # Check cache status
        cache_stats = kg_query_system.cache.get_stats() if kg_query_system else {}
        
        # Get metrics
        current_metrics = metrics.get_metrics()
        
        return {
            "status": "healthy",
            "kg_connection": "ok",
            "cache_stats": cache_stats,
            "metrics": current_metrics,
            "timestamp": time.time()
        }
    except Exception as e:
        logger.error(f"KG health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": time.time()
        }
```

## Future Extensions

### Planned Enhancements

1. **Natural Language Query Interface** - More sophisticated NLP for query understanding
2. **Query Suggestions** - Intelligent query completion and suggestions
3. **Query History** - User query history and favorites
4. **Advanced Visualization** - Interactive graph visualization tools
5. **Query Templates** - Predefined query templates for common use cases

### Integration Points

1. **Clinical Decision Support** - Integration with clinical reasoning systems
2. **Research Assistant** - Connection to research tools and databases
3. **Patient Portal** - Secure patient data access through KG queries
4. **Medical Education** - Educational query patterns and examples

## Implementation Roadmap

### Phase 1: Core Implementation
- [ ] Implement query parser with basic pattern matching
- [ ] Create query planner with simple execution plans
- [ ] Implement query executor with Neo4j integration
- [ ] Add result formatter for multiple output formats

### Phase 2: Enhancement
- [ ] Add query cache with LRU eviction
- [ ] Implement access control and security features
- [ ] Add performance monitoring and metrics
- [ ] Implement query optimization rules

### Phase 3: Advanced Features
- [ ] Add natural language query processing
- [ ] Implement query suggestions and auto-completion
- [ ] Add advanced visualization capabilities
- [ ] Implement query templates and examples

### Phase 4: Testing and Deployment
- [ ] Unit testing for all components
- [ ] Integration testing with Neo4j database
- [ ] Performance testing and optimization
- [ ] Production deployment and monitoring