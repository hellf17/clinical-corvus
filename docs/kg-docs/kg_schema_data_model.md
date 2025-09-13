# Knowledge Graph Schema and Data Model Design 
## Overview 
This document outlines the schema and data model design for the Clinical Corvus Knowledge Graph. The schema defines the structure of nodes, relationships, and properties that will be used to represent medical knowledge in the Neo4j database. ## Design Principles ### Core Principles 1. **Medical Accuracy** - Schema based on established medical ontologies and standards 2. **Extensibility** - Flexible design to accommodate new entity types and relationships 3. **Interoperability** - Alignment with medical standards (SNOMED CT, UMLS, MeSH) 4. **Performance** - Optimized for query performance and scalability 5. **Consistency** - Standardized naming conventions and property structures ### Modeling Approach 1. **Node-Centric Design** - Entities as nodes with rich properties 2. **Relationship-Rich Structure** - Multiple relationship types with properties 3. **Hierarchical Organization** - Taxonomies for entity classification 4. **Temporal Awareness** - Time-based properties for evolving knowledge 5. **Evidence-Based** - Confidence scores and source tracking ## Node Types ### Core Medical Entities #### Disease
cypher
// Unique + existence
CREATE CONSTRAINT disease_id_unique IF NOT EXISTS
FOR (d:Disease) REQUIRE d.id IS UNIQUE;

CREATE CONSTRAINT disease_name_not_null IF NOT EXISTS
FOR (d:Disease) REQUIRE d.name IS NOT NULL;

// B-tree index
CREATE INDEX disease_name IF NOT EXISTS
FOR (d:Disease) ON (d.name);

// Full-text index (use procedure)
CALL db.index.fulltext.createNodeIndex(
  'disease_fulltext', ['Disease'], ['name','description','synonyms']
);

Node Properties:
- id: String (UUID)
- name: String (Primary name)
- synonyms: List[String] (Alternative names)
- description: String (Detailed description)
- icd_codes: List[String] (ICD-10/ICD-11 codes)
- snomed_id: String (SNOMED CT concept ID)
- umls_id: String (UMLS concept ID)
- mesh_id: String (MeSH descriptor ID)
- category: String (Disease category - e.g., "Infectious", "Chronic", "Genetic")
- prevalence: String (Population prevalence information)
- incidence: String (Incidence rate information)
- mortality_rate: Float (Mortality rate if applicable)
- created_date: DateTime
- updated_date: DateTime
- confidence: Float (0.0-1.0 confidence score)
- source: String (Source of information)
- version: String (Schema version)
#### Drug
cypher
// Unique + existence
CREATE CONSTRAINT drug_id_unique IF NOT EXISTS
FOR (d:Drug) REQUIRE d.id IS UNIQUE;

CREATE CONSTRAINT drug_name_not_null IF NOT EXISTS
FOR (d:Drug) REQUIRE d.name IS NOT NULL;

// B-tree index
CREATE INDEX drug_name IF NOT EXISTS
FOR (d:Drug) ON (d.name);

// Full-text index (use procedure)
CALL db.index.fulltext.createNodeIndex(
  'drug_fulltext', ['Drug'], ['name','description','synonyms']
);

Node Properties:
- id: String (UUID)
- name: String (Primary name)
- synonyms: List[String] (Alternative names)
- description: String (Detailed description)
- atc_codes: List[String] (ATC classification codes)
- rxnorm_id: String (RxNorm concept ID)
- umls_id: String (UMLS concept ID)
- mesh_id: String (MeSH descriptor ID)
- drugbank_id: String (DrugBank ID)
- category: String (Drug category - e.g., "Antibiotic", "Analgesic", "Antihypertensive")
- mechanism_of_action: String (Mechanism of action)
- pharmacokinetics: String (Pharmacokinetic properties)
- contraindications: List[String] (Contraindicated conditions)
- pregnancy_category: String (Pregnancy safety category)
- created_date: DateTime
- updated_date: DateTime
- confidence: Float (0.0-1.0 confidence score)
- source: String (Source of information)
- version: String (Schema version)
#### Symptom
cypher
// Unique + existence
CREATE CONSTRAINT symptom_id_unique IF NOT EXISTS
FOR (s:Symptom) REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT symptom_name_not_null IF NOT EXISTS
FOR (s:Symptom) REQUIRE s.name IS NOT NULL;

// B-tree index
CREATE INDEX symptom_name IF NOT EXISTS
FOR (s:Symptom) ON (s.name);

// Full-text index (use procedure)
CALL db.index.fulltext.createNodeIndex(
  'symptom_fulltext', ['Symptom'], ['name','description','synonyms']
);

Node Properties:
- id: String (UUID)
- name: String (Primary name)
- synonyms: List[String] (Alternative names)
- description: String (Detailed description)
- snomed_id: String (SNOMED CT concept ID)
- umls_id: String (UMLS concept ID)
- mesh_id: String (MeSH descriptor ID)
- category: String (Symptom category - e.g., "Constitutional", "Respiratory", "Neurological")
- body_system: String (Associated body system)
- severity_scale: String (Severity measurement scale)
- created_date: DateTime
- updated_date: DateTime
- confidence: Float (0.0-1.0 confidence score)
- source: String (Source of information)
- version: String (Schema version)
#### Procedure
cypher
// Unique + existence
CREATE CONSTRAINT procedure_id_unique IF NOT EXISTS
FOR (p:Procedure) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT procedure_name_not_null IF NOT EXISTS
FOR (p:Procedure) REQUIRE p.name IS NOT NULL;

// B-tree index
CREATE INDEX procedure_name IF NOT EXISTS
FOR (p:Procedure) ON (p.name);

// Full-text index (use procedure)
CALL db.index.fulltext.createNodeIndex(
  'procedure_fulltext', ['Procedure'], ['name','description','synonyms']
);

Node Properties:
- id: String (UUID)
- name: String (Primary name)
- synonyms: List[String] (Alternative names)
- description: String (Detailed description)
- cpt_codes: List[String] (CPT codes)
- snomed_id: String (SNOMED CT concept ID)
- umls_id: String (UMLS concept ID)
- mesh_id: String (MeSH descriptor ID)
- category: String (Procedure category - e.g., "Surgical", "Diagnostic", "Therapeutic")
- body_system: String (Associated body system)
- specialty: String (Medical specialty)
- duration: String (Typical duration)
- anesthesia_required: Boolean (Whether anesthesia is typically required)
- created_date: DateTime
- updated_date: DateTime
- confidence: Float (0.0-1.0 confidence score)
- source: String (Source of information)
- version: String (Schema version)
#### Anatomy
cypher
// Unique + existence
CREATE CONSTRAINT anatomy_id_unique IF NOT EXISTS
FOR (a:Anatomy) REQUIRE a.id IS UNIQUE;

CREATE CONSTRAINT anatomy_name_not_null IF NOT EXISTS
FOR (a:Anatomy) REQUIRE a.name IS NOT NULL;

// B-tree index
CREATE INDEX anatomy_name IF NOT EXISTS
FOR (a:Anatomy) ON (a.name);

// Full-text index (use procedure)
CALL db.index.fulltext.createNodeIndex(
  'anatomy_fulltext', ['Anatomy'], ['name','description','synonyms']
);

Node Properties:
- id: String (UUID)
- name: String (Primary name)
- synonyms: List[String] (Alternative names)
- description: String (Detailed description)
- snomed_id: String (SNOMED CT concept ID)
- umls_id: String (UMLS concept ID)
- mesh_id: String (MeSH descriptor ID)
- fma_id: String (Foundational Model of Anatomy ID)
- category: String (Anatomy category - e.g., "Organ", "System", "Structure")
- body_system: String (Associated body system)
- laterality: String (Left/Right/Bilateral)
- created_date: DateTime
- updated_date: DateTime
- confidence: Float (0.0-1.0 confidence score)
- source: String (Source of information)
- version: String (Schema version)
### Supporting Entities 
#### Gene
cypher
// Unique + existence
CREATE CONSTRAINT gene_id_unique IF NOT EXISTS
FOR (g:Gene) REQUIRE g.id IS UNIQUE;

CREATE CONSTRAINT gene_name_not_null IF NOT EXISTS
FOR (g:Gene) REQUIRE g.name IS NOT NULL;

// B-tree index
CREATE INDEX gene_name IF NOT EXISTS
FOR (g:Gene) ON (g.name);

// Full-text index (use procedure)
CALL db.index.fulltext.createNodeIndex(
  'gene_fulltext', ['Gene'], ['name','description','synonyms']
);

Node Properties:
- id: String (UUID)
- name: String (Primary name)
- synonyms: List[String] (Alternative names)
- description: String (Detailed description)
- hgnc_id: String (HGNC ID)
- ensembl_id: String (Ensembl gene ID)
- ncbi_gene_id: String (NCBI Gene ID)
- uniprot_id: String (UniProt ID)
- chromosome: String (Chromosome location)
- location_start: Integer (Start position)
- location_end: Integer (End position)
- strand: String (DNA strand)
- created_date: DateTime
- updated_date: DateTime
- confidence: Float (0.0-1.0 confidence score)
- source: String (Source of information)
- version: String (Schema version)
#### Protein
cypher
// Unique + existence
CREATE CONSTRAINT protein_id_unique IF NOT EXISTS
FOR (p:Protein) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT protein_name_not_null IF NOT EXISTS
FOR (p:Protein) REQUIRE p.name IS NOT NULL;

// B-tree index
CREATE INDEX protein_name IF NOT EXISTS
FOR (p:Protein) ON (p.name);

// Full-text index (use procedure)
CALL db.index.fulltext.createNodeIndex(
  'protein_fulltext', ['Protein'], ['name','description','synonyms']
);

Node Properties:
- id: String (UUID)
- name: String (Primary name)
- synonyms: List[String] (Alternative names)
- description: String (Detailed description)
- uniprot_id: String (UniProt ID)
- ensembl_id: String (Ensembl protein ID)
- ncbi_protein_id: String (NCBI Protein ID)
- gene_id: String (Associated gene ID)
- molecular_weight: Float (Molecular weight in kDa)
- function: String (Protein function)
- created_date: DateTime
- updated_date: DateTime
- confidence: Float (0.0-1.0 confidence score)
- source: String (Source of information)
- version: String (Schema version)
#### MedicalStudy
cypher
// Unique + existence
CREATE CONSTRAINT study_id_unique IF NOT EXISTS
FOR (s:MedicalStudy) REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT study_title_not_null IF NOT EXISTS
FOR (s:MedicalStudy) REQUIRE s.title IS NOT NULL;

// B-tree index
CREATE INDEX study_title IF NOT EXISTS
FOR (s:MedicalStudy) ON (s.title);

// Full-text index (use procedure)
CALL db.index.fulltext.createNodeIndex(
  'study_fulltext', ['MedicalStudy'], ['title','abstract','authors']
);

Node Properties:
- id: String (UUID)
- title: String (Study title)
- abstract: String (Study abstract)
- publication_date: Date (Publication date)
- journal: String (Journal name)
- authors: List[String] (Author names)
- doi: String (Digital Object Identifier)
- pmid: String (PubMed ID)
- pmcid: String (PubMed Central ID)
- study_type: String (Study type - e.g., "RCT", "Cohort", "Case-Control")
- sample_size: Integer (Number of participants)
- duration: String (Study duration)
- funding_source: String (Funding source)
- conflict_of_interest: String (Conflict of interest statement)
- created_date: DateTime
- updated_date: DateTime
- confidence: Float (0.0-1.0 confidence score)
- source: String (Source of information)
- version: String (Schema version)
#### Guideline
cypher
// Unique + existence
CREATE CONSTRAINT guideline_id_unique IF NOT EXISTS
FOR (g:Guideline) REQUIRE g.id IS UNIQUE;

CREATE CONSTRAINT guideline_title_not_null IF NOT EXISTS
FOR (g:Guideline) REQUIRE g.title IS NOT NULL;

// B-tree index
CREATE INDEX guideline_title IF NOT EXISTS
FOR (g:Guideline) ON (g.title);

// Full-text index (use procedure)
CALL db.index.fulltext.createNodeIndex(
  'guideline_fulltext', ['Guideline'], ['title','organization','recommendations']
);

Node Properties:
- id: String (UUID)
- title: String (Guideline title)
- organization: String (Issuing organization)
- publication_date: Date (Publication date)
- version: String (Guideline version)
- url: String (Official URL)
- recommendations: List[String] (Key recommendations)
- target_population: String (Target population)
- evidence_level: String (Evidence level - e.g., "A", "B", "C")
- last_reviewed: Date (Last review date)
- created_date: DateTime
- updated_date: DateTime
- confidence: Float (0.0-1.0 confidence score)
- source: String (Source of information)
### Claim
cypher
// Unique + existence
CREATE CONSTRAINT claim_id_unique IF NOT EXISTS
FOR (c:Claim) REQUIRE c.id IS UNIQUE;

CREATE CONSTRAINT claim_type_not_null IF NOT EXISTS
FOR (c:Claim) REQUIRE c.type IS NOT NULL;

// B-tree index
CREATE INDEX claim_type IF NOT EXISTS
FOR (c:Claim) ON (c.type, c.polarity);

Node Properties:
- id: String (UUID)
- type: String (Claim type - e.g., "TREATS", "CAUSES", "SIDE_EFFECT")
- polarity: String (Claim polarity - "supports" or "refutes")
- confidence: Float (0.0-1.0 confidence score)
- evidence_level: String (Evidence level - e.g., "A", "B", "C", "D")
- valid_from: Date (When the fact was true in the world)
- valid_to: Date (When the fact stopped being true in the world)
- recorded_at: DateTime (When the fact was recorded/observed)
- dose_amount: Float (Dosage amount)
- dose_unit: String (Dosage unit - UCUM code)
- route: String (Route of administration)
- frequency: String (Frequency of administration)
- duration_value: Integer (Duration value)
- duration_unit: String (Duration unit)
- population: String (Target population)
- schema_version: String (Schema version)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)
### SourceDocument
cypher
// Unique + existence
CREATE CONSTRAINT source_document_id_unique IF NOT EXISTS
FOR (s:SourceDocument) REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT source_document_hash_not_null IF NOT EXISTS
FOR (s:SourceDocument) REQUIRE s.hash IS NOT NULL;

// B-tree index
CREATE INDEX source_document_doi IF NOT EXISTS
FOR (s:SourceDocument) ON (s.doi);

CREATE INDEX source_document_pmid IF NOT EXISTS
FOR (s:SourceDocument) ON (s.pmid);

Node Properties:
- id: String (UUID)
- doi: String (Digital Object Identifier)
- pmid: String (PubMed ID)
- url: String (URL to the document)
- hash: String (Document hash for deduplication)
- title: String (Document title)
- authors: List[String] (Author names)
- publication_date: Date (Publication date)
- journal: String (Journal name)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)
### Extraction
cypher
// Unique + existence
CREATE CONSTRAINT extraction_id_unique IF NOT EXISTS
FOR (e:Extraction) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT extraction_model_not_null IF NOT EXISTS
FOR (e:Extraction) REQUIRE e.model IS NOT NULL;

Node Properties:
- id: String (UUID)
- model: String (Model used for extraction - e.g., "ClinicalRoBERTa")
- version: String (Model version)
- prompt_hash: String (Hash of the prompt used)
- run_id: String (Run identifier)
- timestamp: DateTime (Extraction timestamp)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)
### Passage
cypher
// Unique + existence
CREATE CONSTRAINT passage_id_unique IF NOT EXISTS
FOR (p:Passage) REQUIRE p.id IS UNIQUE;

// B-tree index
CREATE INDEX passage_section IF NOT EXISTS
FOR (p:Passage) ON (p.section);

// Vector index for GraphRAG alignment
CREATE INDEX passage_embedding IF NOT EXISTS
FOR (p:Passage) ON (p.embedding)
OPTIONS { indexConfig: {
  `vector.dimensions`: 1536,
  `vector.similarity_function`: 'cosine',
  `vector.hnsw.m`: 16,
  `vector.hnsw.ef_construction`: 128
}};

Node Properties:
- id: String (UUID)
- text: String (Passage text)
- token_count: Integer (Number of tokens in the passage)
- section: String (Section of the document)
- page: Integer (Page number)
- embedding: List[Float] (Vector embedding for semantic search)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)
## Relationship Types ### Core Medical Relationships #### ASSERTS
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Drug|Disease|Symptom|Procedure|Anatomy|Gene|Protein)-[:ASSERTS]->(Claim)
#### SUBJECT
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Claim)-[:SUBJECT]->(Drug|Disease|Symptom|Procedure|Anatomy|Gene|Protein)
#### OBJECT
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Claim)-[:OBJECT]->(Drug|Disease|Symptom|Procedure|Anatomy|Gene|Protein)
#### SUPPORTED_BY
cypher
Relationship Properties:
- id: String (UUID)
- pages: String (Page numbers if applicable)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Claim)-[:SUPPORTED_BY]->(MedicalStudy|Guideline)
#### EXTRACTED_BY
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Claim)-[:EXTRACTED_BY]->(Extraction)
#### DERIVED_FROM
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Claim)-[:DERIVED_FROM]->(SourceDocument)
#### REFUTES
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Claim)-[:REFUTES]->(Claim)
#### HAS_PASSAGE
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (SourceDocument)-[:HAS_PASSAGE]->(Passage)
#### ABOUT
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Passage)-[:ABOUT]->(Drug|Disease|Symptom|Procedure|Anatomy|Gene|Protein|Claim)
#### HAS_TOP_SYMPTOM
cypher
Relationship Properties:
- id: String (UUID)
- score: Float (Relevance score)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Disease)-[:HAS_TOP_SYMPTOM]->(Symptom)
#### HAS_CONTRAINDICATION
cypher
Relationship Properties:
- id: String (UUID)
- severity: String (Severity level - Mild, Moderate, Severe)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Drug)-[:HAS_CONTRAINDICATION]->(Disease)
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Drug|Disease|Symptom|Procedure|Anatomy|Gene|Protein)-[:ASSERTS]->(Claim)
#### SUBJECT
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Claim)-[:SUBJECT]->(Drug|Disease|Symptom|Procedure|Anatomy|Gene|Protein)
#### OBJECT
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Claim)-[:OBJECT]->(Drug|Disease|Symptom|Procedure|Anatomy|Gene|Protein)
#### SUPPORTED_BY
cypher
Relationship Properties:
- id: String (UUID)
- pages: String (Page numbers if applicable)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Claim)-[:SUPPORTED_BY]->(MedicalStudy|Guideline)
#### EXTRACTED_BY
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Claim)-[:EXTRACTED_BY]->(Extraction)
#### DERIVED_FROM
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Claim)-[:DERIVED_FROM]->(SourceDocument)
#### REFUTES
cypher
Relationship Properties:
- id: String (UUID)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Claim)-[:REFUTES]->(Claim)
#### CAUSES
cypher
Relationship Properties:
- id: String (UUID)
- evidence_level: String (Evidence level - I, II, III, IV)
- confidence: Float (0.0-1.0 confidence score)
- strength: String (Relationship strength - Strong, Moderate, Weak)
- mechanism: String (Mechanism of causation)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- study_id: String (Supporting study ID)
- version: String (Schema version)

Pattern: (Disease)-[:CAUSES]->(Symptom)
#### TREATS
cypher
Relationship Properties:
- id: String (UUID)
- evidence_level: String (Evidence level - I, II, III, IV)
- confidence: Float (0.0-1.0 confidence score)
- efficacy: Float (Efficacy score 0.0-1.0)
- dosage_recommendation: String (Dosage recommendation)
- route_of_administration: String (Route of administration)
- frequency: String (Frequency of administration)
- duration: String (Typical treatment duration)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- study_id: String (Supporting study ID)
- version: String (Schema version)

Pattern: (Drug)-[:TREATS]->(Disease)
#### SIDE_EFFECT
cypher
Relationship Properties:
- id: String (UUID)
- evidence_level: String (Evidence level - I, II, III, IV)
- confidence: Float (0.0-1.0 confidence score)
- frequency: String (Frequency of occurrence)
- severity: String (Severity level - Mild, Moderate, Severe)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- study_id: String (Supporting study ID)
- version: String (Schema version)

Pattern: (Drug)-[:SIDE_EFFECT]->(Symptom)
#### ASSOCIATED_WITH
cypher
Relationship Properties:
- id: String (UUID)
- evidence_level: String (Evidence level - I, II, III, IV)
- confidence: Float (0.0-1.0 confidence score)
- association_type: String (Type of association)
- strength: String (Association strength)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- study_id: String (Supporting study ID)
- version: String (Schema version)

Pattern: (Entity)-[:ASSOCIATED_WITH]->(Entity)
#### CONTRAINDICATED
cypher
Relationship Properties:
- id: String (UUID)
- evidence_level: String (Evidence level - I, II, III, IV)
- confidence: Float (0.0-1.0 confidence score)
- reason: String (Reason for contraindication)
- severity: String (Severity of contraindication)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- study_id: String (Supporting study ID)
- version: String (Schema version)

Pattern: (Drug)-[:CONTRAINDICATED]->(Disease)
#### DIAGNOSES
cypher
Relationship Properties:
- id: String (UUID)
- evidence_level: String (Evidence level - I, II, III, IV)
- confidence: Float (0.0-1.0 confidence score)
- sensitivity: Float (Sensitivity of diagnostic test)
- specificity: Float (Specificity of diagnostic test)
- positive_predictive_value: Float (Positive predictive value)
- negative_predictive_value: Float (Negative predictive value)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- study_id: String (Supporting study ID)
- version: String (Schema version)

Pattern: (Procedure)-[:DIAGNOSES]->(Disease)
### Temporal Relationships #### PRECEDES
cypher
Relationship Properties:
- id: String (UUID)
- confidence: Float (0.0-1.0 confidence score)
- temporal_order: Integer (Order in sequence)
- time_interval: String (Time interval between events)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Event)-[:PRECEDES]->(Event)
#### FOLLOWS
cypher
Relationship Properties:
- id: String (UUID)
- confidence: Float (0.0-1.0 confidence score)
- temporal_order: Integer (Order in sequence)
- time_interval: String (Time interval between events)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Event)-[:FOLLOWS]->(Event)
### Knowledge Relationships #### REFERENCES
cypher
Relationship Properties:
- id: String (UUID)
- confidence: Float (0.0-1.0 confidence score)
- citation_context: String (Context of citation)
- page_numbers: String (Page numbers if applicable)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Entity)-[:REFERENCES]->(MedicalStudy)
#### CONTRADICTS
cypher
Relationship Properties:
- id: String (UUID)
- confidence: Float (0.0-1.0 confidence score)
- contradiction_type: String (Type of contradiction)
- resolution_status: String (Status of contradiction resolution)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Entity)-[:CONTRADICTS]->(Entity)
#### SUPPORTS
cypher
Relationship Properties:
- id: String (UUID)
- confidence: Float (0.0-1.0 confidence score)
- supporting_evidence: String (Description of supporting evidence)
- created_date: DateTime
- updated_date: DateTime
- source: String (Source of information)
- version: String (Schema version)

Pattern: (Study)-[:SUPPORTS]->(Claim)
## Hierarchical Structures ### Disease Hierarchy
cypher
// Create disease categories and subcategories
CREATE CONSTRAINT disease_category_unique FOR (dc:DiseaseCategory) REQUIRE dc.name IS UNIQUE

Node Properties for DiseaseCategory:
- id: String (UUID)
- name: String (Category name)
- description: String (Category description)
- parent_category: String (Parent category ID)
- level: Integer (Hierarchy level)
- created_date: DateTime
- updated_date: DateTime

Relationship: (DiseaseCategory)-[:SUBCATEGORY_OF]->(DiseaseCategory)
### Drug Hierarchy
cypher
// Create drug categories and classifications
CREATE CONSTRAINT drug_category_unique FOR (dc:DrugCategory) REQUIRE dc.name IS UNIQUE

Node Properties for DrugCategory:
- id: String (UUID)
- name: String (Category name)
- description: String (Category description)
- parent_category: String (Parent category ID)
- level: Integer (Hierarchy level)
- atc_code: String (ATC classification code)
- created_date: DateTime
- updated_date: DateTime

Relationship: (DrugCategory)-[:SUBCATEGORY_OF]->(DrugCategory)
### Anatomy Hierarchy
cypher
// Create anatomy system hierarchy
CREATE CONSTRAINT anatomy_system_unique FOR (as:AnatomySystem) REQUIRE as.name IS UNIQUE

Node Properties for AnatomySystem:
- id: String (UUID)
- name: String (System name)
- description: String (System description)
- parent_system: String (Parent system ID)
- level: Integer (Hierarchy level)
- created_date: DateTime
- updated_date: DateTime

Relationship: (AnatomySystem)-[:PART_OF]->(AnatomySystem)
## Indexing Strategy ### Primary Indexes
cypher
// Node indexes have been defined with each node type above
// Only create additional indexes here for cross-cutting concerns

// Unique constraints have been defined with each node type above
// Only create additional constraints here for cross-cutting concerns
### Full-Text Indexes
cypher
// Full-text indexes have been defined with each node type above
// Only create additional full-text indexes here for cross-cutting concerns
### Relationship Indexes
cypher
// Indexes for relationship properties
// Only index relationship properties that appear in WHERE/ORDER BY clauses
CREATE INDEX relationship_confidence IF NOT EXISTS
FOR ()-[r:CLAIM_RELATIONSHIP]-() ON (r.confidence);

CREATE INDEX relationship_evidence_level IF NOT EXISTS
FOR ()-[r:CLAIM_RELATIONSHIP]-() ON (r.evidence_level);

CREATE INDEX relationship_created_date IF NOT EXISTS
FOR ()-[r:CLAIM_RELATIONSHIP]-() ON (r.created_date);
## Data Quality and Validation ### Confidence Scoring
cypher
// Confidence levels for entities and relationships
// 0.9-1.0: High confidence (peer-reviewed studies, established guidelines)
// 0.7-0.9: Medium confidence (observational studies, consensus)
// 0.5-0.7: Low confidence (preliminary evidence, expert opinion)
// 0.0-0.5: Very low confidence (theoretical, anecdotal)
### Evidence Levels
cypher
// Evidence levels based on study design
// I: Evidence from systematic reviews or RCTs
// II: Evidence from well-designed controlled trials without randomization
// III: Evidence from well-designed case-control or cohort studies
// IV: Evidence from multiple time series or dramatic results in uncontrolled experiments
// V: Evidence from expert committee reports or opinions
### Source Tracking
cypher
// Source types
// peer_reviewed: Peer-reviewed journal article
// guideline: Clinical practice guideline
// textbook: Medical textbook
// database: Medical database (UMLS, MeSH, etc.)
// expert_opinion: Expert opinion or consensus
// clinical_trial: Clinical trial registry
## Schema Evolution ### Versioning Strategy
cypher
// Each node and relationship has a version property
// Schema versions follow semantic versioning (MAJOR.MINOR.PATCH)
// MAJOR: Breaking changes to schema structure
// MINOR: Backward-compatible additions
// PATCH: Backward-compatible bug fixes
### Migration Framework
cypher
// Migration scripts for schema updates
// Version tracking in metadata nodes
// Backward compatibility maintained during migrations
// Rollback procedures for failed migrations
## Integration with Standards ### Medical Ontologies
cypher
// Integration with:
// - SNOMED CT for clinical concepts
// - UMLS for unified medical language
// - MeSH for medical subject headings
// - ICD for disease classification
// - RxNorm for drug names
// - LOINC for laboratory tests
// - ATC for drug classification
// - HGNC for gene names
// - UniProt for protein information
### Interoperability
cypher
// FHIR resource mapping
// HL7 v2/v3 compatibility
// DICOM integration for imaging
// HL7 CDA for clinical documents
// IEEE standards compliance
## Performance Considerations ### Query Optimization
cypher
// Pre-computed relationship paths
// Materialized views for common queries
// Caching strategies for frequent lookups
// Partitioning for large datasets
// Query hints for complex traversals
### Storage Optimization
cypher
// Property compression for large text fields
// Relationship clustering for related entities
// Index-only scans where possible
// Memory-mapped storage for frequently accessed nodes
## Security and Privacy ### Data Protection
cypher
// No patient-specific data in KG
// De-identification of case studies
// Access control for sensitive information
// Audit logging for data access
// Encryption at rest and in transit

// Note: In Neo4j 5 causal clusters, there is no "master" node.
// The cluster uses a Raft leader for coordination.
### Compliance
cypher
// HIPAA compliance for US data
// GDPR compliance for EU data
// LGPD compliance for Brazilian data
// FDA regulations for medical devices
// ISO 27001 for information security
## Monitoring and Maintenance ### Health Checks
cypher
// Schema validation queries
// Data quality metrics
// Performance benchmarking
// Consistency checks
// Backup verification
### Maintenance Procedures
cypher
// Regular index rebuilding
// Statistics updates
// Data archiving
// Schema validation
// Performance tuning
## Implementation Roadmap 
### Phase 1: Core Schema - [ ] Define core entity nodes (Disease, Drug, Symptom, Procedure, Anatomy) - [ ] Implement core relationships (CAUSES, TREATS, SIDE_EFFECT, ASSOCIATED_WITH) - [ ] Create basic indexing strategy - [ ] Implement data quality framework ### Phase 2: Extended Schema - [ ] Add supporting entities (Gene, Protein, MedicalStudy, Guideline) - [ ] Implement temporal relationships (PRECEDES, FOLLOWS) - [ ] Add knowledge relationships (REFERENCES, CONTRADICTS, SUPPORTS) - [ ] Create hierarchical structures ### Phase 3: Optimization - [ ] Implement advanced indexing - [ ] Add full-text search capabilities - [ ] Optimize query performance - [ ] Implement caching strategies ### Phase 4: Standards Integration - [ ] Integrate with medical ontologies - [ ] Implement interoperability standards - [ ] Add compliance features - [ ] Implement security measures ## Testing Strategy ### Unit Testing
cypher
// Test node creation and validation
// Test relationship creation and validation
// Test indexing and query performance
// Test data quality constraints
### Integration Testing
cypher
// Test cross-entity relationships
// Test hierarchical queries
// Test temporal relationship queries
// Test evidence-based queries
### Performance Testing
cypher
// Test query response times
// Test concurrent access performance
// Test large dataset handling
// Test index performance
## Controlled Vocabularies
### Evidence Levels
The knowledge graph uses a standardized evidence level system:
- A: High quality evidence (systematic reviews, RCTs)
- B: Moderate quality evidence (cohort studies, case-control studies)
- C: Low quality evidence (case series, expert opinion)
- D: Very low quality evidence (theoretical, anecdotal)

### Severity Levels
Standardized severity levels are used across the knowledge graph:
- Mild: Minimal impact on daily activities
- Moderate: Noticeable impact on daily activities
- Severe: Significant impact on daily activities, may require medical intervention

### Relationship Strength
Relationship strength is categorized as:
- Strong: Well-established relationship with high confidence
- Moderate: Likely relationship with moderate confidence
- Weak: Possible relationship with low confidence

### Frequency
Frequency of occurrence or administration is described as:
- Rare: <1%
- Uncommon: 1-5%
- Common: 5-50%
- Frequent: >50%

These controlled vocabularies ensure consistency in data representation and enable more accurate querying and analysis.
## Future Extensions 
### Planned Enhancements 
1. **Machine Learning Integration** - AI-powered relationship discovery 2. **Real-time Updates** - Streaming data integration 3. **Multi-language Support** - Internationalization of medical terms 4. **Visualization Tools** - Interactive graph exploration 5. **API Gateway** - RESTful access to KG queries ### Research Applications 1. **Drug Discovery** - Computational drug repurposing 2. **Disease Modeling** - Pathway analysis and modeling 3. **Clinical Decision Support** - Evidence-based recommendations 4. **Medical Education** - Interactive learning tools 5. **Public Health** - Epidemiological analysis This schema and data model provides a comprehensive foundation for the Clinical Corvus Knowledge Graph, enabling rich medical knowledge representation while maintaining performance, scalability, and standards compliance.

## Identity and Equivalence
### Canonical IDs
Each entity type in the knowledge graph uses canonical identifiers from established medical ontologies:
- Disease: UMLS CUI (umls_id)
- Drug: RxNorm ID (rxnorm_id)
- Symptom: SNOMED CT ID (snomed_id)
- Procedure: SNOMED CT ID (snomed_id)
- Anatomy: SNOMED CT ID (snomed_id)
- Gene: HGNC ID (hgnc_id)
- Protein: UniProt ID (uniprot_id)
- MedicalStudy: PMID (pmid) or DOI (doi)
- Guideline: DOI (doi) or official URL (url)

### SAME_AS Relationships
To handle entities that are equivalent across different ontologies, the knowledge graph uses SAME_AS relationships:
Pattern: (Entity)-[:SAME_AS]->(Entity)

### Merge Policy
During curation, when duplicate entities are identified, they should be merged onto a canonical node:
1. Select the entity with the most complete information as the canonical node
2. Keep alternative IDs in arrays on the canonical node
3. Redirect all relationships to the canonical node
4. Preserve provenance information for each source

Cypher example for merging duplicate diseases:
// When merging a duplicate disease onto a canonical disease
MATCH (canonical:Disease {umls_id:'C0011849'})
MATCH (duplicate:Disease {snomed_id:'73211009'})
// Transfer properties from duplicate to canonical
SET canonical.snomed_id = duplicate.snomed_id
SET canonical.alt_ids = apoc.coll.toSet(coalesce(canonical.alt_ids, []) + [duplicate.umls_id])
// Redirect relationships
MATCH (n)-[r]->(duplicate)
MERGE (n)-[new_r:MERGED_RELATION]->(canonical)
SET new_r = r
DELETE r
// Delete the duplicate node
DETACH DELETE duplicate