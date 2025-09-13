# Contradiction Handling and Evidence Scoring Mechanisms Design

## Overview

This document outlines the design for implementing contradiction handling and evidence scoring mechanisms within the Clinical Corvus Knowledge Graph (KG) system. These mechanisms are crucial for maintaining the quality, reliability, and trustworthiness of the medical knowledge stored in the KG, especially when integrating information from diverse sources.

## Design Principles

### Core Principles

1. **Accuracy**: Ensure the highest possible accuracy in contradiction detection and evidence scoring.
2. **Transparency**: Provide clear explanations for contradiction flags and evidence scores.
3. **Traceability**: Maintain a clear audit trail for all contradiction resolutions and score adjustments.
4. **Human-in-the-Loop**: Integrate human review for complex contradictions and critical evidence scoring decisions.
5. **Adaptability**: Design a flexible system that can adapt to new medical knowledge and evolving evidence standards.
6. **Scalability**: Handle a large volume of knowledge and potential contradictions efficiently.

### Modeling Approach

1. **Probabilistic Scoring**: Assign probabilistic scores to evidence and contradictions.
2. **Context-Aware Analysis**: Consider the context (source, publication date, study design) when assessing evidence and contradictions.
3. **Ontology-Driven**: Leverage KG schema and medical ontologies for semantic understanding of contradictions.
4. **Continuous Learning**: Incorporate feedback loops to improve detection and scoring models over time.

## Contradiction Handling Mechanism

### Purpose

Detect, classify, and manage contradictory information within the Knowledge Graph.

### Types of Contradictions

1. **Direct Factual Contradiction**: Two statements directly assert opposing facts (e.g., "Drug A treats Disease X" vs. "Drug A does not treat Disease X").
2. **Temporal Contradiction**: Information is contradictory due to outdated knowledge (e.g., "Treatment Y is standard" vs. "Treatment Y is no longer recommended due to new findings").
3. **Contextual Contradiction**: Statements appear contradictory but are valid under different contexts (e.g., "Drug Z is safe" vs. "Drug Z causes side effects" - safe for general population vs. causes side effects in specific patient groups).
4. **Quantitative Contradiction**: Numerical values conflict (e.g., different reported efficacy rates for a drug).
5. **Hierarchical Contradiction**: Conflicts within ontological or taxonomic structures (e.g., a disease categorized under two mutually exclusive categories).

### Detection Methods

#### 1. Rule-Based Detection
- **Pattern Matching**: Identify conflicting keywords or phrases (e.g., "contraindicated", "inhibits" vs. "promotes").
- **Negation Detection**: Identify explicit negations (e.g., "not", "no", "absence of").
- **Semantic Rules**: Define rules based on entity types and relationship types (e.g., a drug cannot "cause" a "cure" for the same disease).

#### 2. Machine Learning-Based Detection
- **Textual Entailment Models**: Use NLP models (e.g., fine-tuned Clinical RoBERTa) to identify contradictory sentence pairs.
- **Graph Neural Networks (GNNs)**: Analyze graph patterns to detect structural inconsistencies or logical contradictions in relationships.
- **Conflict Scoring**: Train a model to assign a conflict score to pairs of statements or entities.

#### 3. Temporal Analysis
- **Version Tracking**: Compare information based on `updated_date` and `version` properties in the KG.
- **Recency Bias**: Prioritize newer, higher-quality information over older, potentially outdated information unless otherwise specified.

### Contradiction Resolution Workflow

1. **Detection**: Identify potential contradictions during KG population or through periodic scans.
2. **Flagging**: Mark contradictory entities or relationships with a `contradiction_flag` property and a reference to the contradictory statement(s).
3. **Notification**: Alert human curators or relevant Langroid agents about detected contradictions.
4. **Analysis**: Automated analysis of the contradiction, including:
    - Identifying the conflicting statements/entities.
    - Retrieving supporting evidence for each side.
    - Assessing the evidence score of each conflicting piece of information.
    - Determining the type of contradiction.
5. **Human Review (Optional but Recommended for High-Impact Contradictions)**:
    - Curators review the conflicting information and evidence.
    - They may consult additional sources or domain experts.
    - They decide on the resolution:
        - **Resolve**: One piece of information is deemed correct, the other is marked as `deprecated` or `incorrect`.
        - **Reconcile**: Both pieces of information are valid under different contexts, and the context is explicitly added to the KG.
        - **Dispute**: The contradiction cannot be resolved with current information, requiring further research.
6. **KG Update**: Update KG with resolution status, new properties, or refined relationships.
7. **Audit Trail**: Record all detection, analysis, and resolution steps for transparency and future review.

### Contradiction Properties

Nodes and relationships involved in contradictions will have the following properties:
- `contradiction_flag`: Boolean (true if part of a contradiction)
- `contradicts_id`: List[String] (IDs of conflicting entities/relationships)
- `contradiction_type`: String (e.g., "Direct Factual", "Temporal", "Contextual")
- `resolution_status`: String (e.g., "Pending", "Resolved_Correct", "Resolved_Deprecated", "Reconciled", "Disputed")
- `resolution_notes`: String (Human-provided notes on resolution)
- `last_reviewed`: DateTime (Timestamp of last review)
- `review_by`: String (ID of reviewer)

## Evidence Scoring Mechanism

### Purpose

Quantify the trustworthiness and quality of information in the Knowledge Graph.

### Scoring Factors

1. **Source Credibility**:
    - **Tiered System**: Assign scores based on source type (e.g., Tier 1: systematic reviews, RCTs from top journals; Tier 2: cohort studies, case-control; Tier 3: expert opinion, case reports).
    - **Journal Impact Factor/Ranking**: Higher score for publications in reputable journals.
    - **Author Expertise**: Consider author's reputation and affiliations.
2. **Study Design/Methodology**:
    - **Hierarchy of Evidence**: RCTs > Cohort Studies > Case-Control > Case Series > Expert Opinion.
    - **Methodological Rigor**: Assess bias, sample size, statistical significance, and blinding (where applicable).
3. **Recency**:
    - Newer information may be weighted higher, but not always (e.g., foundational medical principles).
    - Decay function for evidence over time, with rapid decay for rapidly evolving fields.
4. **Replicability/Consensus**:
    - Higher score for findings replicated across multiple independent studies.
    - Consensus among multiple guidelines or expert bodies.
5. **Clinical Significance**:
    - Prioritize findings with high clinical impact.
6. **Data Quality**:
    - Completeness, accuracy, and consistency of the raw data used to derive the knowledge.

### Scoring Algorithm

The `confidence` property (0.0-1.0) on nodes and relationships will represent the overall evidence score. This score will be a composite calculated based on the factors above.

#### Formula (Example)

`Confidence = (W_source * Source_Score) + (W_study * Study_Design_Score) + (W_recency * Recency_Score) + (W_consensus * Consensus_Score) - Penalty_for_Bias`

- `W_x`: Weighting factors (adjustable based on domain and importance).
- `Source_Score`: Derived from source credibility.
- `Study_Design_Score`: Derived from study design/methodology (e.g., 1.0 for RCT, 0.8 for Cohort, etc.).
- `Recency_Score`: Function of publication date relative to current knowledge.
- `Consensus_Score`: Based on number of supporting studies/guidelines.
- `Penalty_for_Bias`: Deductions for detected biases or limitations.

### Automated Scoring

- **Initial Scoring**: Apply initial scores during the KG population pipeline based on metadata (source type, publication date, study design).
- **Update Scoring**: Re-evaluate scores when new supporting or contradicting evidence is ingested.
- **Clinical RoBERTa**: Can be extended to predict evidence levels or confidence scores for extracted entities and relationships.

### Human Feedback Loop

- **Curator Adjustments**: Human curators can manually adjust confidence scores, providing justifications.
- **Feedback Integration**: These manual adjustments will be used to fine-tune the automated scoring model.

## Integration with Knowledge Graph

### Schema Extensions

- **Node Properties**:
    - `confidence`: Float (0.0-1.0) - overall evidence score.
    - `evidence_level`: String (e.g., "I", "II", "III", "IV", "V") - highest level of evidence supporting this knowledge.
    - `source_credibility_score`: Float (0.0-1.0) - score of the primary source.
    - `last_validated`: DateTime - timestamp of last validation.
- **Relationship Properties**:
    - `confidence`: Float (0.0-1.0).
    - `evidence_level`: String.
    - `supporting_study_ids`: List[String] - IDs of `MedicalStudy` nodes supporting this relationship.
    - `contradicting_study_ids`: List[String] - IDs of `MedicalStudy` nodes contradicting this relationship.

### Querying and Retrieval

- **Confidence-Weighted Search**: Queries can prioritize results with higher confidence scores.
- **Contradiction Filtering**: Filter out or highlight information flagged as contradictory or deprecated.
- **Evidence-Based RAG**: The GraphRAG system will use evidence scores to select the most reliable information for LLM context.

## Implementation Roadmap

### Phase 1: Core Scoring and Basic Contradiction Detection
- [ ] Extend KG schema with `confidence`, `evidence_level`, `source_credibility_score` properties for nodes and relationships.
- [ ] Implement initial evidence scoring algorithm based on source type and publication date during KG population.
- [ ] Implement basic rule-based direct factual contradiction detection (e.g., using negation patterns).
- [ ] Add `contradiction_flag` and `contradicts_id` properties to nodes/relationships.
- [ ] Develop a module for logging contradiction detections.

### Phase 2: Enhanced Detection and Resolution Workflow
- [ ] Implement machine learning-based contradiction detection using Clinical RoBERTa (textual entailment).
- [ ] Develop a simple UI or API for human curators to review and resolve contradictions.
- [ ] Implement contradiction resolution logic: mark as `deprecated`, `incorrect`, or `reconciled`.
- [ ] Implement automatic temporal contradiction detection based on `updated_date` and `publication_date`.
- [ ] Refine evidence scoring algorithm to incorporate study design and replicability.

### Phase 3: Advanced Features and Integration
- [ ] Integrate contradiction handling and evidence scoring with the GraphRAG query system (e.g., prioritize high-confidence, non-contradictory results).
- [ ] Implement active learning for contradiction detection models (human feedback improves model).
- [ ] Develop metrics for tracking contradiction rates and resolution efficiency.
- [ ] Implement a full audit trail for all changes related to evidence scores and contradictions.

## Testing Strategy

### Unit Testing
- Test individual scoring functions with various inputs.
- Test rule-based contradiction detection with known contradictory and non-contradictory pairs.
- Test ML-based contradiction detection with annotated datasets.

### Integration Testing
- Test the full pipeline: ingestion -> scoring -> contradiction detection -> KG population.
- Verify that contradictory information is correctly flagged and handled in the KG.
- Test that evidence scores influence search results in the GraphRAG system.

### Data Validation
- Create a "Golden Dataset" of known contradictions and their resolutions for regression testing.
- Regularly audit KG data for consistency and accuracy.

## Future Enhancements

- **Explainable AI for Scoring**: Provide human-readable explanations for why a certain confidence score was assigned.
- **Proactive Contradiction Prevention**: Develop mechanisms to prevent contradictory information from entering the KG.
- **Automated Evidence Synthesis**: AI-driven synthesis of evidence to support complex claims or resolve disputes.
- **Integration with External Validation Services**: Connect to external services for additional validation or peer review.