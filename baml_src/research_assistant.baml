// baml_src/dr_corvus_research.baml
// Deep Research functionality for Dr. Corvus

// --- Enums and Core Classes ---

enum ResearchSourceType {
  PUBMED @description("PubMed database search")
  EUROPE_PMC @description("Europe PMC database with full-text articles, preprints and grey literature")
  LENS_SCHOLARLY @description("Lens.org scholarly database with comprehensive academic literature and patents")
  WEB_SEARCH_BRAVE @description("General web search using Brave Search API for broad discovery")
  COCHRANE @description("Cochrane Library for systematic reviews")
  CLINICAL_TRIALS_GOV @description("ClinicalTrials.gov for registered trials")
  ACADEMIC_GOOGLE_SCHOLAR @description("Google Scholar search results")
  ACADEMIC_NCBI @description("NCBI sources like PubMed Central or NCBI Bookshelf")
  ACADEMIC_ELITE_JOURNAL @description("Results from targeted searches in elite medical journals")
  ACADEMIC_DATABASE_GENERAL @description("Results from other academic databases like ScienceDirect, MedRxiv")
  GUIDELINE_RESOURCE @description("Clinical guidelines or resources from medical societies or official bodies found via web search")
  PREPRINT @description("Preprint servers and early-stage research publications")
}

enum StudyTypeFilter {
  ALL @description("All study types")
  SYSTEMATIC_REVIEW @description("Systematic reviews and meta-analyses")
  RANDOMIZED_CONTROLLED_TRIAL @description("Randomized controlled trials")
  COHORT_STUDY @description("Cohort studies")
  CASE_CONTROL @description("Case-control studies")
  CLINICAL_TRIAL @description("Clinical trials")
  REVIEW @description("Review articles")
}

class PICOQuestion {
  patient_population string @description("P - Population/Patient/Problem: Who are the patients or what is the problem?")
  intervention string @description("I - Intervention: What is the intervention, exposure, diagnostic test, or etiological agent being considered?")
  comparison string? @description("C - Comparison: What is the intervention being compared to? (can be 'no intervention', 'placebo', 'standard treatment', etc.)")
  outcome string @description("O - Outcome: What is the clinical outcome of interest being measured or evaluated?")
  time_frame string? @description("T - Timeframe (optional): What is the time period for the outcome?")
  study_type string? @description("S - Study Type (optional): What is the best type of study to answer this question?")
}

class SearchParameters {
  source ResearchSourceType @description("The research source to search")
  query_string string @description("Optimized search query for the specific source")
  max_results int? @description("Maximum number of results to retrieve")
  study_type_filter StudyTypeFilter? @description("Filter by study type")
  date_range_years int? @description("Limit to publications within last N years")
  language_filter string? @description("Language filter (e.g., 'eng' for English)")
  rationale string? @description("Explanation of why this search strategy was chosen")
}

class ResearchTaskInput {
  user_original_query string @description("The original research question from the user")
  pico_question PICOQuestion? @description("Structured PICO question if provided")
  research_focus string? @description("Specific focus area (e.g., 'treatment', 'diagnosis', 'prognosis')")
  target_audience string? @description("Target audience (e.g., 'medical_student', 'practicing_physician')")
  research_mode string? @description("The mode of research to conduct: 'quick' for a faster, focused search, or 'comprehensive' for a more in-depth analysis. Defaults to 'comprehensive'.")
}

class FormulatedSearchStrategyOutput {
  refined_query_for_llm_synthesis string @description("Refined query for final synthesis, using the full, expanded terms, not the abbreviations.")
  search_parameters_list SearchParameters[] @description("List of search parameters for different sources")
  search_rationale string @description("Explanation of the search strategy")
  expected_evidence_types string[] @description("Types of evidence expected to be found")

}

class RawSearchResultItem {
  source ResearchSourceType @description("Source of this result")
  title string @description("Title of the article/document")
  url string? @description("URL to the full article")
  snippet_or_abstract string @description("Abstract or snippet of the content")
  publication_date string? @description("Publication date")
  authors string[]? @description("List of authors")
  journal string? @description("Journal name")
  pmid string? @description("PubMed ID if applicable")
  doi string? @description("DOI if available")
  study_type string? @description("Type of study (if identifiable)")
  citation_count int? @description("Number of citations (if available)")
  relevance_score float? @description("Calculated relevance score of the item to the query (0.0-1.0)")
  composite_impact_score float? @description("Overall bibliometric impact score if available (0.0-1.0)")
  academic_source_name string? @description("Specific academic source if applicable (e.g., 'google_scholar', 'ncbi_pmc')")
}

class EvidenceTheme {
  theme_name string @description("Name of the evidence theme")
  key_findings string[] @description("Key findings under this theme")
  strength_of_evidence string @description("Assessment of evidence strength")
  supporting_studies_count int @description("Number of studies supporting this theme")
}

class ResearchMetrics {
  total_articles_analyzed int @description("Total number of articles analyzed during the research")
  sources_consulted string[] @description("List of sources consulted (e.g., PubMed, Cochrane, etc.)")
  search_duration_seconds float @description("Time taken to complete the research in seconds")
  quality_filters_applied string[] @description("Quality filters that were applied during the search (e.g., ['RCT', 'Systematic Review'])")
  date_range_searched string? @description("Date range of the articles searched (e.g., '2020-2024', or 'last 5 years')")
  language_filters_applied string[]? @description("Language filters applied during the search (e.g., ['en', 'pt'])")
  search_strategy_summary string? @description("A brief summary explaining the rationale behind the applied search strategy and filters")
  unique_journals_found int @description("Number of unique journals found in the results")
  high_impact_studies_count int @description("Number of high-impact studies found")
  recent_studies_count int @description("Number of recent studies (within last 3 years)")
  systematic_reviews_count int @description("Number of systematic reviews found")
  rct_count int @description("Number of randomized controlled trials found")
  cite_source_metrics CiteSourceMetrics? @description("CiteSource quality and deduplication metrics if available")
}

class SynthesizedResearchOutput {
  original_query string @description("The original research question")
  executive_summary string @description("High-level summary of findings")
  professional_detailed_reasoning_cot string @description("Detailed chain-of-thought reasoning for professionals with narrative summary of the research findings, providing more granularity than the executive summary")
  clinical_implications string[] @description("Clinical implications of the findings")
  key_findings_by_theme EvidenceTheme[] @description("Findings organized by themes")
  research_gaps_identified string[] @description("Identified gaps in current research")
  evidence_quality_assessment string @description("Overall assessment of evidence quality")
  relevant_references RawSearchResultItem[] @description("Most relevant references found")
  research_metrics ResearchMetrics? @description("Detailed metrics about the research process for transparency")
  search_duration_seconds float? @description("Total duration of the search process in seconds")

}

// --- PDF Analysis Classes for Evidence Appraisal ---

class PDFAnalysisInput {
  pdf_content string @description("Extracted text content from PDF")
  analysis_focus string? @description("Specific focus for analysis (e.g., 'methodology', 'results', 'clinical_implications')")
  clinical_question string? @description("Clinical question to evaluate the PDF against")
}

class PDFAnalysisOutput {
  document_type string @description("Type of document (e.g., 'research_article', 'systematic_review', 'clinical_guideline')")
  key_findings string[] @description("Main findings from the document")
  methodology_summary string @description("Summary of methodology used")
  clinical_relevance string @description("Assessment of clinical relevance")
  evidence_quality string @description("Assessment of evidence quality")
  recommendations string[] @description("Key recommendations or conclusions")
  limitations string[] @description("Identified limitations")
  structured_summary string @description("Structured summary of the document")
}

// --- PICO Question Formulation ---
class ClinicalScenarioInput {
  clinical_scenario string @description("Description of the clinical scenario or user's doubt.")
  additional_context string? @description("Additional context about the patient or clinical situation.")
}

class PICOFormulationOutput {
  structured_pico_question PICOQuestion @description("Structured PICO question generated.")
  explanation string @description("Explanation of how the PICO question was formulated.")
  pico_derivation_reasoning string @description("Detailed chain-of-thought reasoning for identifying each PICO component.")
  search_terms_suggestions string[] @description("Search term suggestions for this PICO question, ideally in English for international databases, including MeSH terms if applicable.")
  boolean_search_strategies string[] @description("Suggested Boolean search combinations (AND, OR) that reflect the formulated PICO question.")
  alternative_pico_formulations string[]? @description("Alternative PICO formulations, if applicable.")
  recommended_study_types string[] @description("Recommended study types that would best answer this PICO question.")
}

class SimplifiedQueryOutput {
  simplified_query string @description("A simplified query for PubMed, focusing on essential keywords, MeSH terms, and core concepts, designed to maximize relevant results.")
}

// --- BAML Functions ---
function ExtractPubMedKeywords(complex_query: string) -> SimplifiedQueryOutput {
  client DrCorvusLLM
  prompt #"
    As an expert medical librarian and search strategist, your task is to simplify a complex, AI-generated PubMed query into its essential components to maximize search recall while maintaining relevance.

    Analyze the following complex query:
    ---
    {{ complex_query }}
    ---

    **Instructions:**
    1.  **Identify Core Concepts:** Extract the primary medical concepts (diseases, interventions, patient populations, outcomes).
    2.  **Prioritize Preserving MeSH Terms & Syntax, with Nuance for Recall:**
        - Your primary goal is to retain existing MeSH terms (e.g., `[MeSH Major Topic]`, `[MeSH]`, `[Publication Type]`, `[PDat]`) with their precise casing and quoting (e.g., `"time to treatment"[MeSH]`).
        - HOWEVER, if the input query (especially if AI-generated) is overly complex, uses highly specific MeSH tags (like `[MeSH Major Topic]` for too many concepts), or includes very restrictive filters (like narrow date ranges or multiple specific publication types) that are likely to severely limit recall and result in few or zero hits, you HAVE PERMISSION to:
            - Broaden MeSH terms (e.g., change `[MeSH Major Topic]` to `[MeSH]`).
            - Remove or generalize overly restrictive filters (e.g., remove a `last 1 year[PDat]` or change `randomized controlled trial[PT]` to a broader `clinical study[PT]` or remove it if multiple specific PTs are present).
            - Simplify the query's boolean structure if it's excessively nested or uses too many AND clauses for an initial search.
        - The objective is to strike a balance: preserve valuable MeSH precision where appropriate, but simplify and broaden when the input query is clearly too narrow for good initial recall.
        - CRITICAL FOR PUBMED: Ensure all MeSH tags are cased correctly as `[MeSH]` (e.g., `atrial fibrillation[MeSH]`), `[MeSH Major Topic]`, `[Publication Type]`, etc. Using incorrect casing like `[Mesh]` or `[mesh]` WILL RESULT IN ZERO HITS.
        - Example of fixing incorrect casing: An input like `("Atrial Fibrillation"[Mesh])` MUST be corrected to `("Atrial Fibrillation"[MeSH])`.
        - Multi-word MeSH terms should be enclosed in double quotes, e.g., `"Atrial Fibrillation"[MeSH]`. Single-word MeSH terms (e.g., `Anticoagulants[MeSH]`) do not strictly require quotes, though their presence is usually harmless. The primary focus is correct tag casing.
        - For user-provided queries or PICO-based fallbacks that are often simpler, focus on identifying core concepts and translating them to appropriate MeSH terms (prefer general `[MeSH]` unless the user explicitly used a major topic tag) and text words. Avoid *adding* overly specific tags like `[MeSH Major Topic]` to a simple user query unless the user themselves included such specificity.
    3.  **Retain Boolean Logic:** Keep the core boolean operators (AND, OR, NOT) that structure the relationship between the core concepts.
    4.  **Simplify and Generalize:**
        - If the input PubMed query is intended for an initial broad search and contains 3 or more distinct concept groups joined by 'AND' (e.g., (Concept A OR a1) AND (Concept B OR b1) AND (Concept C OR c1)), you SHOULD prioritize reducing the number of 'AND'ed clauses to improve recall. For example, simplify to `(Concept A OR a1) AND (Concept B OR b1)` by retaining the two most central concept groups. The goal is to prevent zero results on the first pass due to excessive specificity.
        - Remove overly restrictive terms or filters that might cause zero results (e.g., very specific date ranges like `last 1 year[PDat]` might be too narrow, but `last 5 years[PDat]` is often acceptable).
        - Replace overly specific, non-standard synonyms with more general, widely accepted terms or MeSH terms if possible.
        - Eliminate conversational language, redundant words, or overly complex nested parentheses if they don't add value.
    5.  **Output:** Produce a single, clean, simplified query string ready for PubMed.

    **Example:**
    - **Complex Query:** `(((("atrial fibrillation"[MeSH Major Topic]) AND ("subarachnoid hemorrhage"[MeSH Major Topic] OR "SAH")) AND (("anticoagulants"[MeSH Major Topic] OR "warfarin" OR "dabigatran" OR "rivaroxaban" OR "apixaban" OR "edoxaban"))) AND (("restarting" OR "timing" OR "reintroduction" OR "resumption"))) AND (humans[MeSH]) AND (("systematic review"[Publication Type] OR "guideline"[Publication Type])))`
    - **Simplified Query:** `("atrial fibrillation"[MeSH Major Topic] AND "subarachnoid hemorrhage"[MeSH Major Topic]) AND (anticoagulants[MeSH Major Topic] OR warfarin OR dabigatran OR rivaroxaban OR apixaban) AND (restarting OR timing OR reintroduction) AND (systematic review[PT] OR guideline[PT])`

    Your goal is to create a query that an expert researcher would use: precise yet broad enough to capture the most relevant literature.

    {{ ctx.output_format }}
  "#
}
function FormulateDeepResearchStrategy(input: ResearchTaskInput) -> FormulatedSearchStrategyOutput {
  client DrCorvusLLM
  prompt #"
    I am an expert in medical database search strategies and evidence-based research formulation.

    Your task is to analyze the user's research question and formulate a comprehensive and effective search strategy. Follow these steps precisely.

    ORIGINAL USER QUERY: {{ input.user_original_query }}
    {% if input.pico_question %}
    STRUCTURED PICO QUESTION:
    - Population: {{ input.pico_question.patient_population if input.pico_question.patient_population else "Not specified" }}
    - Intervention: {{ input.pico_question.intervention if input.pico_question.intervention else "Not specified" }}
    - Comparison: {{ input.pico_question.comparison if input.pico_question.comparison else "Not specified" }}
    - Outcome: {{ input.pico_question.outcome if input.pico_question.outcome else "Not specified" }}
    {% endif %}
    {% if input.research_focus %}RESEARCH FOCUS: {{ input.research_focus }}{% endif %}
    {% if input.target_audience %}TARGET AUDIENCE: {{ input.target_audience }}{% endif %}

    **STEP-BY-STEP STRATEGY FORMULATION:**

    **Step 1: Query Analysis & Refinement**
    - Refine the user's query into a clear, specific question suitable for a final synthesis by another AI. This is the `refined_query_for_llm_synthesis`.
    - Identify key concepts, synonyms, and MeSH terms from the expanded query.

    **Step 2: Multi-Source Evidence Strategy Formulation**
    **A) PubMed Database Search (Tier 1 - VERY Broad Initial Search for Maximum Recall):**
    - Your ABSOLUTE PRIORITY for this first PubMed query is to maximize RECALL. Aim for a large set of potentially relevant articles. Precision is secondary at this stage.
    - Construct a SIMPLE query using only 2-3 core concepts from the user's request (e.g., the main condition and primary intervention, or condition and key outcome).
    - Use broad MeSH terms (`[MeSH]`) combined with general text word synonyms using OR.
    - CRITICAL: Use a MAXIMUM of 1 (ONE) or at most 2 (TWO) `AND` clauses. Often, a single `AND` combining two broad concept groups is best.
    - AVOID constructing queries with 3 or more `AND` clauses for this initial step, as it severely limits recall.
    - Example for user query 'Quando reiniciar anticoagulante em paciente com FA e HSA?':
        - *INCORRECT (too many ANDs for initial broad search):* `(atrial fibrillation[MeSH] OR AFib) AND (subarachnoid hemorrhage[MeSH] OR SAH) AND (anticoagulants[MeSH]) AND (timing OR restart)`
        - *PREFERRED (example 1 - focus on condition & event):* `(atrial fibrillation[MeSH] OR AFib OR AF) AND (subarachnoid hemorrhage[MeSH] OR SAH)`
        - *PREFERRED (example 2 - focus on event & intervention):* `(subarachnoid hemorrhage[MeSH] OR SAH) AND (anticoagulants[MeSH] OR warfarin) AND (timing OR restart)`
    Choose the simpler form that best captures the core of the question for a wide initial net. Subsequent, more targeted searches can add precision.
    - AVOID specific publication type filters like `systematic review[PT]` or `meta-analysis[PT]` in this *initial* broad query. If any publication filter is used, make it very general (e.g., `review[PT]` or `clinical study[PT]`) or omit it entirely.
    - AVOID date filters unless the user's query is extremely time-sensitive (e.g., "latest guidelines in the last year").
    - Syntax Example (VERY Broad Search): `(main_condition[MeSH] OR synonym_condition) AND (key_intervention_or_outcome[MeSH] OR synonym_intervention_or_outcome)` OR simply `(main_concept1[MeSH] OR synonym1) AND (main_concept2[MeSH] OR synonym2) AND (review[PT] OR clinical study[PT])`
    - Rationale: This very broad search casts the widest possible net. Subsequent AI synthesis steps will filter and refine these results. We need more raw material first.
    - CRITICAL: For all PubMed searches, ensure the `SearchParameters` object includes `language_filter: "eng"` AND `max_results: 20`.
    
    **B) Brave Web Search (for Guidelines & Current Information):**
    - Target official medical society guidelines
    - Search for recent consensus statements and position papers
    - Include year markers (2025, 2024, 2023, 2022) for currency
    - Target specific organizations (e.g., "AHA guidelines", "ESC recommendations", "WHO guidelines")
    - Search patterns: "[condition] guidelines 2025 [medical society]", "[intervention] consensus statement 2023"
    - Look for .org, .gov, and official medical society domains
    - Include terms like "clinical practice guidelines", "expert consensus", "position statement"
    - Aim to retrieve a comprehensive set of results: specify `max_results: 15` for Brave Web Search strategies.
    
    **C) Clinical Guidelines Lookup:**
    - Search for evidence-based clinical guidelines from authoritative sources
    - Target major medical societies, government health agencies, and international organizations
    - Focus on recently updated guidelines (within last 2-3 years)
    - Look for condition-specific and intervention-specific recommendations
    - Aim for focused results: specify `max_results: 15` for Clinical Guideline Lookup strategies.
    - CRITICAL: For these "Clinical Guidelines Lookup" strategies, ensure the `SearchParameters` object uses `source: GUIDELINE_RESOURCE`.

    **D) Academic Google Scholar Search (for Broader Academic Scope):**
    - Utilize Google Scholar to find a wide range of academic literature, including articles, theses, preprints, and abstracts from academic publishers, professional societies, online repositories, universities, and other scholarly websites.
    - Formulate queries that are somewhat broader than PubMed queries, as Google Scholar's indexing is different. Keywords and key phrases are effective.
    - Consider this source for finding emerging research or perspectives not yet in major databases.
    - Aim for a moderate number of results: specify `max_results: 10` for Google Scholar search strategies.
    - Ensure the `SearchParameters` object uses `source: ACADEMIC_GOOGLE_SCHOLAR`.

    - For each strategy formulated in `search_parameters_list`, ensure the `SearchParameters` object is complete, including an appropriate `max_results` value as discussed (e.g., 20 for PubMed, 15 for Brave, 15 for Guidelines, 10 for Google Scholar).

    3. **Source-Specific Optimization Strategies:**

    **PubMed Advanced Techniques:**
    - Use MeSH Major Topic [majr] for precision
    - Combine publication types: [systematic review[PT] OR meta-analysis[PT] OR randomized controlled trial[PT]]
    - Apply temporal restrictions intelligently
    - Use field-specific searches: [tiab] for title/abstract, [au] for authors
    
    **Brave Search Best Practices:**
    - Use specific medical terminology combined with "guidelines", "consensus", "recommendations"
    - Include professional organizations: "American College of Cardiology", "European Society of", "World Health Organization"
    - Add temporal qualifiers: "updated 2024", "revised guidelines", "latest recommendations"
    - Target high-authority medical domains like: site:acc.org, site:escardio.org, site:who.int
    - Search for specific document types: "clinical practice guidelines PDF", "consensus statement", "position paper"
    
    **Clinical Guidelines Strategy:**
    - Query should target the specific condition or intervention
    - Look for nationally and internationally recognized guidelines
    - Prioritize evidence-based recommendations with clear grading systems
    - Focus on guidelines from major medical societies relevant to the clinical question
    - CRITICAL: When formulating parameters for this strategy, ensure the `SearchParameters` object uses `source: GUIDELINE_RESOURCE`.

    4. **Quality and Evidence Hierarchy:**
    - For treatment questions: Meta-analyses > RCTs > Prospective cohorts > Guidelines
    - For diagnostic questions: Systematic reviews of diagnostic accuracy > Prospective diagnostic studies
    - For guidelines: Recent updates from major societies > Older recommendations
    - Prioritize evidence from last 3-5 years unless seeking foundational studies

    5. **Integrated Search Rationale:**
    - Each search should complement the others:
      - PubMed: Primary research evidence and systematic reviews
      - Brave Search: Current guidelines, consensus statements, and emerging recommendations
      - Guidelines Lookup: Authoritative clinical practice recommendations

    **COMPREHENSIVE EXAMPLES:**

    **For Heart Failure Management:**
    - PubMed (VERY Broad Initial Search): "(heart failure[MeSH] OR cardiac failure) AND (therapeutics[MeSH] OR drug therapy OR new treatments OR management)"  // No specific publication types, very broad intervention/management terms
    - Brave: "heart failure guidelines 2024 AHA ACC ESC consensus recommendations management"
    - Guidelines: "heart failure clinical practice guidelines evidence-based recommendations"
    - Google Scholar: "heart failure management clinical guidelines 2024 AHA ACC ESC recommendations"

    **For Sepsis Management:**
    - PubMed: "(sepsis[MeSH Major Topic] OR septic shock[MeSH]) AND (fluid therapy[MeSH] OR vasopressor agents[MeSH]) AND (mortality[MeSH] OR organ dysfunction scores[MeSH]) AND humans[MeSH] AND (last 3 years[PDat] OR systematic review[PT])"
    - Brave: "sepsis guidelines 2024 surviving sepsis campaign recommendations"
    - Guidelines: "sepsis management clinical guidelines early goal-directed therapy"
    - Google Scholar: "sepsis management clinical guidelines 2024 recommendations treatment"
    
    **Now, apply this structured thinking to the user's query.**

    {{ ctx.output_format }}
  "#
}

function AnalyzePDFDocument(input: PDFAnalysisInput) -> PDFAnalysisOutput {
  client DrCorvusLLM
  prompt #"
    {{ GetProfessionalIntroduction() }}
    I am an expert in the critical analysis of medical and scientific documents. Your task is to meticulously analyze the provided document content and structure your findings into a precise JSON format.

    {% if input.clinical_question %}
    REFERENCE CLINICAL QUESTION: {{ input.clinical_question }}
    {% endif %}
    {% if input.analysis_focus %}
    ANALYSIS FOCUS: {{ input.analysis_focus }}
    {% endif %}

    DOCUMENT CONTENT FOR ANALYSIS:
    ---
    {{ input.pdf_content }}
    ---

    **ANALYSIS AND OUTPUT INSTRUCTIONS:**
    Based on the document content, you must generate a JSON object that strictly adheres to the following structure. Populate each field with a thorough and well-reasoned analysis.

    **1. Document Type (`document_type`):**
    - Analyze the document's structure, tone, and content.
    - Classify it into one of the following categories: 'research_article', 'systematic_review', 'meta_analysis', 'clinical_guideline', 'case_report', 'editorial', 'review_article', or 'other'.
    - Provide only the classification string.

    **2. Methodology Summary (`methodology_summary`):**
    - Describe the study design (e.g., RCT, cohort study, cross-sectional).
    - Detail the participant selection process, sample size, and key demographics.
    - Explain the interventions or exposures studied.
    - Summarize the primary and secondary outcomes measured.
    - Provide a concise but comprehensive summary of the methodology.

    **3. Key Findings (`key_findings`):**
    - Extract the most important results and data from the document.
    - Present these as a list of clear and concise strings.
    - Each string should represent a distinct, significant finding.

    **4. Clinical Relevance (`clinical_relevance`):**
    - Assess the practical implications of the findings for clinical practice.
    - How might these results change patient management, diagnostic approaches, or treatment protocols?
    - If a clinical question was provided, directly address how the findings answer that question.

    **5. Evidence Quality (`evidence_quality`):**
    - Critically evaluate the strength and reliability of the evidence.
    - Consider the study design's position in the evidence hierarchy.
    - Assess the risk of bias (e.g., selection bias, performance bias, detection bias).
    - Comment on the statistical power and the precision of the results (e.g., confidence intervals).

    **6. Recommendations (`recommendations`):**
    - List the explicit recommendations or conclusions made by the authors.
    - These should be direct quotes or close paraphrases of the authors' concluding statements.

    **7. Limitations (`limitations`):**
    - Identify and list the limitations acknowledged by the authors.
    - Add any other critical limitations you have identified during your analysis.

    **8. Structured Summary (`structured_summary`):**
    - Provide a comprehensive, structured summary of the entire document.
    - This summary should integrate all the points above into a coherent narrative, suitable for a busy clinician to quickly understand the paper's essence. Start with a one-sentence takeaway, followed by a more detailed breakdown.

    **CRITICAL:** Your entire response must be in English and conform to the JSON output format specified by the function's return type.

    {{ ctx.output_format }}
  "#
}

function SynthesizeDeepResearchSimple(original_query: string, search_results: RawSearchResultItem[]) -> SynthesizedResearchOutput {
  client DrCorvusLLM
  prompt #"
    You are Dr. Corvus. Create a JSON synthesis for: {{ original_query }}

    CRITICAL: Your response must START IMMEDIATELY with the opening brace { and contain NO OTHER TEXT.
    
    MANDATORY FIELDS (include exactly as shown):
    - original_query
    - executive_summary
    - key_findings_by_theme (array of themes)


    Based on search results: {{ search_results }}

    Output ONLY this JSON structure starting with {
    {
      "original_query": "{{ original_query }}",
      "executive_summary": "[English language summary of findings]",
      "key_findings_by_theme": [
        {
          "theme_name": "[Theme name in English]",
          "key_findings": [
            "[Finding 1 in English]",
            "[Finding 2 in English]"
          ],
          "strength_of_evidence": "[Strength: High/Medium/Low]",
          "supporting_studies_count": 0
        }
      ],
      "relevant_references": [
        {
          "reference_id": 0,
          "title": "[Title of reference]",
          "authors": ["Author1", "Author2"],
          "journal": "[Journal Name]",
          "year": 0,
          "doi": "[DOI if available]",
          "pmid": "[PMID if available]",
          "url": "[URL if available]",
          "study_type": "[Study Type]",
          "snippet_or_abstract": "[Abstract or snippet from input RawSearchResultItem.abstract, if available. Otherwise, a brief generated summary or null.]",
          "relevance_score": 0.0
        }
      ]
    }

    Replace bracketed content with actual English content. Start with { immediately.
    For 'relevant_references', include items from 'search_results' (RawSearchResultItem[]).
    - For each reference, populate 'snippet_or_abstract' using the 'abstract' field from the corresponding input RawSearchResultItem if available. If not, provide a very brief summary or null.
    - Populate 'relevance_score' using the 'relevance_score' field from the input RawSearchResultItem if available. Otherwise, assign a default score (e.g., 0.5) or estimate briefly.
  "#
}


function SynthesizeDeepResearchMinimal(original_query: string, search_results: RawSearchResultItem[]) -> SynthesizedResearchOutput {
  client DrCorvusLLM
  prompt #"
    Generate JSON for: {{ original_query }}
    Data: {{ search_results }}
    
    Output only this exact structure:
    {
      "original_query": "{{ original_query }}",
      "executive_summary": "Summary in English",
      "key_findings_by_theme": [{"theme_name": "Name", "key_findings": ["Finding"], "strength_of_evidence": "Strong", "supporting_studies_count": 1}],
      "evidence_quality_assessment": "Assessment in English",
      "clinical_implications": ["Implication in English"],
      "research_gaps_identified": ["Gap in English"],
      "relevant_references": {{ search_results }}, // For each reference, ensure 'snippet_or_abstract' is populated (from input 'abstract') and 'synthesis_relevance_score' (from input 'relevance_score').
      "search_strategy_used": "Search strategy used through multiple sources including PubMed, clinical guidelines, and high-impact medical journals",
    }

    // Prefer English for all textual content (summaries, implications, gaps, etc.) unless the original_query explicitly requests Portuguese or another language.
  "#
}

function SynthesizeDeepResearch(original_query: string, search_results: RawSearchResultItem[]) -> SynthesizedResearchOutput {
  client DrCorvusLLM
  prompt #"
    You are Dr. Corvus, an expert in Evidence-Based Medicine and systematic literature review. Your task is to provide a comprehensive, critical, and detailed synthesis of scientific literature in English, analyzing ALL available evidence systematically.

    CLINICAL QUESTION: {{ original_query }}
    
    EVIDENCE AVAILABLE: {{ search_results }} ({{ search_results|length }} sources found)
    
    **MANDATORY COMPREHENSIVE ANALYSIS REQUIREMENTS:**
    
    **I. SYSTEMATIC EVIDENCE EVALUATION:**
    - **ANALYZE ALL {{ search_results|length }} SOURCES** systematically, not just a few.
    - If 15+ sources are available, provide a detailed analysis of at least 15-20 key studies.
    - Prioritize systematic reviews, meta-analyses, RCTs, and recent high-impact studies.
    - For each major study: discuss methodology, sample size, key findings, and limitations.
    - Compare methodological approaches across different studies.
    - Identify and discuss contradictions or disagreements between studies.
    
    **II. CRITICAL EVIDENCE APPRAISAL:**
    - Apply GRADE framework principles for evidence quality assessment.
    - Assess risk of bias using appropriate tools (Cochrane, Newcastle-Ottawa).
    - Evaluate study design appropriateness for the research questions.
    - Analyze methodological limitations and their impact on conclusions.
    - Discuss publication bias and selective reporting concerns.
    - Compare effect sizes, confidence intervals, and clinical significance.
    
    **III. DEEP THEMATIC ANALYSIS:**
    - Organize findings into 3-5 major evidence themes.
    - For each theme, analyze supporting evidence from multiple studies.
    - Discuss evidence consistency, quality, and strength across studies.
    - Include specific numbers, percentages, and effect sizes when available.
    - Provide evidence appraisal notes with critical analysis insights.
    
    **IV. ENHANCED RESEARCH TRANSPARENCY:**
    - Document comprehensive search metrics.
    - Be transparent about any limitations in the search process.
    
    **V. CLINICAL INTEGRATION AND IMPLICATIONS:**
    - Provide detailed clinical practice recommendations.
    - Discuss implementation considerations and practical barriers.
    - Address different patient populations and clinical scenarios.
    
    **VI. RESEARCH GAPS AND FUTURE DIRECTIONS:**
    - Identify specific areas where evidence is insufficient.
    - Suggest methodologically appropriate future research.
    
    **CRITICAL SYNTHESIS STANDARDS:**
    - Use evidence grading: "High" (High-quality RCTs, systematic reviews), "Moderate" (good quality studies with some limitations), "Low" (observational studies, limited quality).
    - Include quantitative data: effect sizes, confidence intervals, p-values, number needed to treat.
    - Cite specific studies by author/journal when discussing key findings.
    - Provide a balanced analysis including both benefits and harms.
    - Apply principles from the Cochrane Handbook and GRADE guidelines.

    **DETAILED INSTRUCTIONS FOR 'relevant_references':**
    For each reference included in the 'relevant_references' array, ensure the following fields are accurately populated:
    - `reference_id`: Must be unique for each reference.
    - `title`, `authors`, `journal`, `year`: Populate accurately from the source data.
    - `doi`, `pmid`, `url`: Include if available in the source data.
    - `study_type`: Accurately reflect the type of study.
    - `snippet_or_abstract`: THIS IS CRITICAL. Populate this field.
        - If the input `RawSearchResultItem` for the reference contains an 'abstract' field, use its content directly.
        - If the 'abstract' is missing, but you can generate a concise and relevant summary (1-3 sentences) from the title and other available information (like key findings related to this reference, if discernible), create such a snippet.
        - If no abstract or suitable snippet can be derived, this field can be null, but strive to provide it.
    - `relevance_score`: THIS IS CRITICAL. For each reference you include in the output, ensure its `relevance_score` field (a float value between 0.0 and 1.0) accurately reflects its importance to the `original_query` *after* your deep synthesis.
        - If the input `RawSearchResultItem` has an initial 'relevance_score', use this as a starting point.
        - Critically evaluate the reference's actual contribution. Your final `relevance_score` for the outputted reference should be based on your comprehensive analysis, potentially adjusting the initial score.
        - This score must reflect how directly and significantly the reference addresses the 'original_query'.

    **FINAL OUTPUT FORMAT:**
    Your entire response MUST be a single, valid JSON object that strictly adheres to the output schema.


    {{ ctx.output_format }}
  "#
}

// -------- Enhanced Evidence Appraisal System --------

// Input for Enhanced Evidence Appraisal
class EvidenceAppraisalInput {
  clinical_question_PICO string @description("Clinical question in PICO format")
  evidence_summary_or_abstract string @description("Evidence summary or abstract for evaluation")
  study_type_if_known string? @description("Study type if known")
}

// Bias Assessment Details
class BiasAssessment {
  bias_type string @description("Type of bias (e.g., Selection, Information, Confounding)")
  risk_level string @description("High, Moderate, Low, Unclear")
  explanation string @description("Explanation of the bias assessment")
  mitigation_strategies string[] @description("Suggested strategies to address this bias")
}

// Statistical Analysis Assessment
class StatisticalAssessment {
  sample_size_adequacy string @description("Assessment of sample size adequacy")
  statistical_methods_appropriateness string @description("Appropriateness of statistical methods")
  effect_size_interpretation string @description("Clinical significance of effect size")
  confidence_intervals_assessment string @description("Assessment of confidence intervals")
  p_value_interpretation string @description("Interpretation of p-values and statistical significance")
  multiple_comparisons_concern string? @description("Concerns about multiple comparisons if applicable")
}

// Quality Assessment using established frameworks
class QualityAssessment {
  overall_quality_grade string @description("Overall quality grade (A, B, C, D or High, Moderate, Low, Very Low)")
  methodological_rigor_score string @description("Assessment of methodological rigor")
  risk_of_bias_summary string @description("Summary of risk of bias assessment")
  applicability_concerns string[] @description("Concerns about applicability to target population")
  reporting_quality string @description("Quality of reporting according to guidelines (CONSORT, STROBE, etc.)")
}

// Clinical Application Assessment
class ClinicalApplicationAssessment {
  clinical_relevance string @description("Assessment of clinical relevance")
  patient_population_match string @description("How well the study population matches your clinical question")
  outcome_relevance string @description("Relevance of study outcomes to clinical practice")
  practical_feasibility string @description("Feasibility of implementing findings in practice")
  cost_effectiveness_considerations string? @description("Cost-effectiveness considerations if mentioned")
  ethical_considerations string[] @description("Ethical considerations relevant to application")
}

// Enhanced Evidence Appraisal Output
class EnhancedAppraisalOutput {
  // Basic Study Information
  identified_study_type string @description("Identified or confirmed study type")
  study_design_appropriateness string @description("Appropriateness of study design for the research question")
  
  // Comprehensive Quality Assessment
  quality_assessment QualityAssessment @description("Comprehensive quality assessment")
  
  // Detailed Strengths and Limitations
  methodological_strengths string[] @description("Key methodological strengths")
  methodological_limitations string[] @description("Key methodological limitations")
  
  // Bias Assessment
  bias_assessments BiasAssessment[] @description("Detailed bias assessments")
  overall_bias_risk string @description("Overall risk of bias assessment")
  
  // Statistical Assessment
  statistical_assessment StatisticalAssessment @description("Comprehensive statistical assessment")
  
  // Clinical Application
  clinical_application ClinicalApplicationAssessment @description("Clinical application assessment")
  
  // PICO Alignment
  pico_alignment_assessment string @description("How well the study aligns with the PICO question")
  population_match_percentage string @description("Estimated percentage match with target population")
  intervention_comparability string @description("Comparability of intervention to clinical question")
  outcome_relevance_score string @description("Relevance of outcomes to clinical question")
  
  // Evidence Integration
  strength_of_recommendation string @description("Strength of recommendation based on this evidence")
  level_of_evidence string @description("Level of evidence according to established hierarchies")
  confidence_in_findings string @description("Confidence in the study findings")
  
  // Practical Recommendations
  recommendations_for_practice string[] @description("Specific recommendations for clinical practice")
  areas_requiring_more_research string[] @description("Areas where more research is needed")
  next_steps_for_evidence_evaluation string[] @description("Suggested next steps for further evidence evaluation")
  
  // Critical Considerations
  key_clinical_considerations string[] @description("Key considerations for clinical application")
  potential_harms_or_risks string[] @description("Potential harms or risks to consider")
  patient_preference_factors string[] @description("Factors that might influence patient preferences")
  
  // Context and Limitations
  generalizability_assessment string @description("Assessment of generalizability to broader populations")
  external_validity_concerns string[] @description("Concerns about external validity")
  study_limitations_impact string @description("How study limitations might impact clinical application")
  
  // Professional Development
  learning_points string[] @description("Key learning points for evidence evaluation skills")
  critical_appraisal_checklist string[] @description("Checklist items for future evidence appraisal")
  
  // Meta Information
  evidence_synthesis_date string @description("Date of evidence synthesis")

}

// Enhanced Evidence Appraisal Function
function AssistEvidenceAppraisal(input: EvidenceAppraisalInput) -> EnhancedAppraisalOutput {
  client DrCorvusLLM
  prompt #"
    {{ GetProfessionalIntroduction() }}
    I am Dr. Corvus, an expert in Evidence-Based Medicine, critical literature evaluation, and clinical research methodology. I will provide you with a comprehensive, structured evidence appraisal that leverages advanced evaluation frameworks.

    **CLINICAL QUESTION (PICO FORMAT):**
    {{ input.clinical_question_PICO }}

    **EVIDENCE SUMMARY/ABSTRACT FOR EVALUATION:**
    {{ input.evidence_summary_or_abstract }}

    {% if input.study_type_if_known %}
    **STUDY TYPE (PROVIDED):** {{ input.study_type_if_known }}
    {% endif %}

    **COMPREHENSIVE EVIDENCE APPRAISAL PROCESS:**

    1. **Study Design and Methodology Analysis:**
      - Identify study type and assess design appropriateness
      - Evaluate methodological rigor using established frameworks
      - Assess adherence to reporting guidelines (CONSORT, STROBE, PRISMA, etc.)

    2. **Risk of Bias Assessment:**
      - Systematic evaluation using domain-based approaches
      - Assessment of selection, performance, detection, attrition, and reporting biases
      - Consider bias mitigation strategies employed

    3. **Statistical Analysis Evaluation:**
      - Sample size and power considerations
      - Appropriateness of statistical methods
      - Effect size interpretation and clinical significance
      - Confidence interval assessment and p-value interpretation

    4. **Clinical Relevance and Applicability:**
      - PICO alignment analysis
      - Population comparability assessment
      - Outcome relevance evaluation
      - Practical implementation considerations

    5. **Quality Grading and Evidence Level:**
      - Overall quality assessment using GRADE or similar frameworks
      - Evidence level determination
      - Confidence in effect estimates

    6. **Practice Integration Analysis:**
      - Clinical application recommendations
      - Risk-benefit assessment
      - Patient preference considerations
      - Implementation barriers and facilitators

    7. **Critical Evaluation Skills Development:**
      - Key learning points for evidence evaluation
      - Future appraisal considerations
      - Areas for additional research

    **CRITICAL EVALUATION FRAMEWORKS TO CONSIDER:**
    - GRADE (Grading of Recommendations Assessment, Development and Evaluation)
    - Cochrane Risk of Bias tools
    - CASP (Critical Appraisal Skills Programme) checklists
    - Newcastle-Ottawa Scale for observational studies
    - AMSTAR for systematic reviews

    **STATISTICAL CONSIDERATIONS:**
    - Clinical vs. statistical significance
    - Number needed to treat (NNT) or harm (NNH) if applicable
    - Absolute vs. relative risk measures
    - Confidence interval interpretation
    - Heterogeneity assessment for meta-analyses

    **CLINICAL APPLICATION FACTORS:**
    - Patient population characteristics
    - Healthcare setting considerations
    - Resource requirements
    - Cost-effectiveness implications
    - Ethical considerations

    **RESPONSE STRUCTURE REQUIREMENTS:**
    Provide a comprehensive, structured analysis that helps develop critical evaluation skills while offering practical guidance for evidence application. Use Portuguese for all narrative content, maintaining scientific precision and clarity.
    Your final response must be IN PORTUGUESE AND MATCHING THE OUTPUT FORMAT.

    {{ ctx.output_format }}
  "#
}

// --- PICO Question Formulation ---
function FormulateEvidenceBasedPICOQuestion(input: ClinicalScenarioInput) -> PICOFormulationOutput {
  client DrCorvusLLM
  prompt #"
    {{ GetProfessionalIntroduction() }}
    You are an expert in Evidence-Based Medicine and structured PICO question formulation.

    Your task is to analyze the provided clinical scenario and transform it into a well-structured PICO question to facilitate evidence search.

    CLINICAL SCENARIO PROVIDED:
    {{ input.clinical_scenario }}
    {% if input.additional_context %}
    ADDITIONAL CONTEXT: {{ input.additional_context }}
    {% endif %}

    **PICO FORMULATION PROCESS WITH DETAILED REASONING:**

    FIRST, execute a systematic Chain-of-Thought analysis to identify each PICO component:

    **1. SCENARIO ANALYSIS:**
    - Identify key elements of the clinical scenario
    - Recognize the type of clinical question (therapy, diagnosis, prognosis, etiology, etc.)
    - Consider context and mentioned limitations

    **2. SYSTEMATIC IDENTIFICATION OF PICO ELEMENTS:**

    **P (Population/Patient/Problem):**
    - Who are the specific patients?
    - What relevant demographic characteristics? (age, sex, comorbidities)
    - What is the main clinical condition?
    - Are there implicit inclusion/exclusion criteria?

    **I (Intervention):**
    - What is the intervention, treatment, diagnostic test, or exposure being considered?
    - Is it pharmacological, surgical, diagnostic, or preventive intervention?
    - Are there specifications for dose, duration, technique?

    **C (Comparison):**
    - What is the intervention being compared to?
    - Is it placebo, standard treatment, no intervention, or another intervention?
    - Is the comparison explicit or implicit in the scenario?

    **O (Outcome):**
    - What is the clinical outcome of interest?
    - Is it a primary outcome (mortality, morbidity) or secondary (quality of life)?
    - Are there safety outcomes to consider?

    **T (Time - if applicable):**
    - What is the relevant follow-up period?
    - Are there specific temporal considerations?

    **S (Study Type - if applicable):**
    - What type of study would be most appropriate to answer this question?

    **3. QUESTION FORMULATION:**
    - Combine PICO elements into a clear and searchable question
    - Use precise and standardized medical terminology
    - Ensure the question is specific enough to be searchable, but not so restrictive as to limit results

    **4. SEARCH STRATEGY:**
    - Propose key search terms, preferably in English for international databases
    - Include MeSH terms when applicable
    - Suggest Boolean combinations (AND, OR, NOT) that reflect the formulated PICO question
    - Consider synonyms and terminological variations

    **5. RECOMMENDED STUDY TYPES:**
    - Based on the PICO question, what study types would be most appropriate?
    - Consider the evidence hierarchy for the question type

    **IMPORTANT GUIDELINES:**
    - Use precise and appropriate medical terminology
    - Always respond in English, regardless of the scenario language
    - Be specific enough to be searchable, but not so restrictive as to limit results
    - Consider different study types that could answer the question
    - If the scenario allows multiple interpretations, offer alternative formulations
    - Your final response must be IN PORTUGUESE AND MATCHING THE OUTPUT FORMAT.

    **EXAMPLE PROCESS:**
    Scenario: "Diabetic patient with chest pain"
    
    Reasoning:
    - P: Adults with diabetes mellitus (specific characteristics: age, diabetes type, comorbidities)
    - I: Exercise stress test (diagnostic intervention)
    - C: Resting electrocardiogram (diagnostic comparator)
    - O: Detection of coronary artery disease (diagnostic outcome)
    
    Question: "In adults with diabetes mellitus (P), does exercise stress testing (I) compared to resting electrocardiogram (C) have greater effectiveness in detecting coronary artery disease (O)?"

    **IMPORTANT ABOUT RESPONSE FIELDS:**
    
    - **pico_derivation_reasoning**: Include your detailed thought process for identifying each PICO component, explaining how you arrived at each element from the provided scenario.
    
    - **explanation**: Provide a clear and educational explanation of how the PICO question was formulated, suitable for students and professionals.
    
    - **search_terms_suggestions**: List key terms in English, including MeSH terms when applicable, that would be useful for searching evidence on this question.
    
    - **boolean_search_strategies**: Suggest specific combinations using Boolean operators (e.g., "(diabetes mellitus OR diabetes) AND (chest pain OR angina) AND (exercise test OR stress test)").
    
    - **alternative_pico_formulations**: If the scenario allows different interpretations or approaches, offer alternative PICO question formulations.
    
    - **recommended_study_types**: Based on the PICO question type, indicate which study types would be most appropriate (e.g., RCT for therapy, cohort studies for prognosis, etc.).

    {{ ctx.output_format }}
  "#
}

// --- Specialized Functions for Different Research Types (Example: Clinical Trial Analysis) ---
// --- NEW: CiteSource Integration Classes ---
class CiteSourceMetrics {
  total_sources_consulted int @description("Total number of sources consulted in the research")
  original_results_count int @description("Original number of results before deduplication")
  deduplicated_results_count int @description("Final number of unique results after deduplication")
  deduplication_rate float @description("Rate of deduplication as decimal (0.0 to 1.0)")
  overall_quality_score float @description("Overall quality score of the search (0.0 to 1.0)")
  coverage_score float @description("Coverage score across multiple sources (0.0 to 1.0)")
  diversity_score float @description("Diversity score of source types (0.0 to 1.0)")
  recency_score float @description("Score for recent publications coverage (0.0 to 1.0)")
  impact_score float @description("Score for high-impact studies inclusion (0.0 to 1.0)")
  source_balance_score float @description("Score for balanced contribution across sources (0.0 to 1.0)")
  best_performing_source string @description("Name of the best performing source")
  processing_time_ms float @description("Time taken for CiteSource processing in milliseconds")
  key_quality_insights string[] @description("Key insights about search quality and performance")
}

class SourcePerformanceMetrics {
  source_name string @description("Name of the research source")
  total_results int @description("Total number of results from this source")
  unique_contributions int @description("Number of unique contributions from this source")
  quality_score float @description("Quality score of this source (0.0 to 1.0)")
  response_time_ms float @description("Response time for this source in milliseconds")
  recent_publications_count int @description("Number of recent publications from this source")
  high_impact_count int @description("Number of high-impact studies from this source")
}

class DeduplicationSummary {
  original_count int @description("Original number of results before deduplication")
  deduplicated_count int @description("Final number of unique results")
  removed_duplicates int @description("Number of duplicates removed")
  deduplication_rate float @description("Deduplication rate as decimal (0.0 to 1.0)")
  efficiency_score float @description("Efficiency score of the deduplication process")
}

class CiteSourceAnalysisInput {
  search_results RawSearchResultItem[] @description("Array of search results to analyze")
  query string @description("Original search query for context")
  include_visualization_data bool? @description("Whether to include data for visualizations")
}

class CiteSourceAnalysisOutput {
  deduplication_summary DeduplicationSummary @description("Summary of deduplication results")
  source_performance SourcePerformanceMetrics[] @description("Performance metrics for each source")
  quality_assessment QualityScores @description("Quality assessment scores")
  processing_insights string[] @description("Key insights from the CiteSource processing")
  recommendations string[] @description("Recommendations for improving search strategy")
  deduplicated_results RawSearchResultItem[] @description("Final deduplicated and ranked results")
  processing_metadata ProcessingMetadata @description("Metadata about the processing")

}

class QualityScores {
  overall_score float @description("Overall quality score (0.0 to 1.0)")
  coverage_score float @description("Coverage score across sources (0.0 to 1.0)")
  diversity_score float @description("Diversity score of evidence types (0.0 to 1.0)")
  recency_score float @description("Recency score for recent publications (0.0 to 1.0)")
  impact_score float @description("Impact score for high-quality studies (0.0 to 1.0)")
  source_balance_score float @description("Balance score across sources (0.0 to 1.0)")
}

class ProcessingMetadata {
  total_processing_time_ms float @description("Total processing time in milliseconds")
  sources_analyzed int @description("Number of sources analyzed")
  timestamp string @description("Timestamp of the analysis")
  version string @description("Version of CiteSource processing used")
}

class CiteSourceReportInput {
  query string @description("Research query to analyze")
  max_results int? @description("Maximum results to collect and analyze")
  include_detailed_metrics bool? @description("Whether to include detailed performance metrics")
  include_recommendations bool? @description("Whether to include actionable recommendations")
}

class CiteSourceReportOutput {
  executive_summary ExecutiveSummary @description("High-level summary of CiteSource analysis")
  quality_breakdown QualityScores @description("Detailed quality score breakdown")
  source_analysis SourceAnalysis @description("Analysis of source performance")
  deduplication_analysis DeduplicationAnalysis @description("Analysis of deduplication effectiveness")
  actionable_insights string[] @description("Actionable insights for research optimization")
  benchmark_comparison BenchmarkComparison @description("Comparison with industry benchmarks")
  visual_data_summary VisualDataSummary? @description("Summary of data for visualizations if requested")
  disclaimer string @description("Report disclaimer") // @assert(disclaimer_check, "this.length() > 10")
}

class ExecutiveSummary {
  total_sources_consulted int @description("Total number of sources consulted")
  deduplication_efficiency_rate float @description("Deduplication efficiency as percentage")
  overall_quality_grade string @description("Overall quality grade (A, B, C, D)")
  best_performing_source string @description("Name of best performing source")
  key_strengths string[] @description("Key strengths of the search strategy")
  key_improvement_areas string[] @description("Areas for improvement")
}

class SourceAnalysis {
  source_rankings SourcePerformanceMetrics[] @description("Sources ranked by performance")
  coverage_analysis string @description("Analysis of coverage across sources")
  diversity_assessment string @description("Assessment of source diversity")
  performance_insights string[] @description("Key insights about source performance")
}

class DeduplicationAnalysis {
  efficiency_metrics DeduplicationSummary @description("Deduplication efficiency metrics")
  duplication_patterns string[] @description("Common patterns in duplicates found")
  source_overlap_analysis string @description("Analysis of overlap between sources")
  optimization_suggestions string[] @description("Suggestions for reducing duplicates")
}

class BenchmarkComparison {
  industry_percentile float @description("Percentile ranking against industry benchmarks")
  performance_grade string @description("Performance grade based on benchmarks")
  benchmark_insights string[] @description("Insights from benchmark comparison")
  improvement_targets string[] @description("Specific targets for improvement")
}

class VisualDataSummary {
  chart_data_available bool @description("Whether chart data is available")
  supported_visualizations string[] @description("Types of visualizations supported")
  data_summary string @description("Summary of visualization data")
}

// --- NEW: CiteSource BAML Functions ---

function AnalyzeCiteSourceResults(input: CiteSourceAnalysisInput) -> CiteSourceAnalysisOutput {
  client DrCorvusLLM
  prompt #"
    {{ GetProfessionalIntroduction() }}
    I am an expert in research quality assessment, source evaluation, and bibliometric analysis.

    Your task is to analyze search results that have been processed through CiteSource deduplication and quality assessment, providing insights and recommendations for optimization.

    SEARCH QUERY: {{ input.query }}
    SEARCH RESULTS COUNT: {{ input.search_results|length }}
    
    ANALYSIS REQUIREMENTS:

    1. **Deduplication Assessment:**
       - Evaluate effectiveness of duplicate removal
       - Assess preservation of key information
       - Calculate efficiency metrics

    2. **Source Performance Analysis:**
       - Evaluate contribution and quality of each source
       - Assess response times and reliability
       - Identify best and worst performing sources

    3. **Quality Scoring:**
       - Overall search quality assessment
       - Coverage across multiple sources
       - Diversity of evidence types
       - Recency of publications
       - Impact factor considerations

    4. **Strategic Recommendations:**
       - Specific improvements for search strategy
       - Source optimization suggestions
       - Quality enhancement recommendations

    5. **Processing Insights:**
       - Key findings from the analysis
       - Notable patterns or issues
       - Performance benchmarks

    **EVALUATION CRITERIA:**

    **Source Quality Factors:**
    - Volume and relevance of contributions
    - Uniqueness vs. overlap with other sources
    - Currency of publications
    - Citation metrics and impact factors
    - Full-text availability

    **Deduplication Effectiveness:**
    - Rate of duplicate detection
    - Preservation of bibliographic details
    - Handling of near-duplicates
    - Source attribution maintenance

    **Overall Search Quality:**
    - Comprehensive coverage of topic
    - Balanced representation across sources
    - Inclusion of high-impact studies
    - Temporal coverage appropriateness

    {{ ctx.output_format }}
  "#
}

function GenerateCiteSourceReport(input: CiteSourceReportInput) -> CiteSourceReportOutput {
  client DrCorvusLLM
  prompt #"
    {{ GetProfessionalIntroduction() }}
    I am an expert in bibliometric analysis, research quality assessment, and evidence synthesis optimization.

    Your task is to generate a comprehensive CiteSource quality and performance report based on research conducted with deduplication and multi-source analysis.

    RESEARCH QUERY: {{ input.query }}
    {% if input.max_results %}MAXIMUM RESULTS ANALYZED: {{ input.max_results }}{% endif %}
    {% if input.include_detailed_metrics %}DETAILED METRICS: Requested{% endif %}
    {% if input.include_recommendations %}RECOMMENDATIONS: Requested{% endif %}

    COMPREHENSIVE REPORT GENERATION:

    1. **Executive Summary Creation:**
       - High-level assessment of research quality
       - Key performance indicators
       - Overall grade assignment (A-D scale)
       - Primary strengths and improvement areas

    2. **Quality Breakdown Analysis:**
       - Detailed scoring across all quality dimensions
       - Coverage assessment across sources
       - Evidence diversity evaluation
       - Temporal coverage analysis
       - Impact factor considerations

    3. **Source Performance Evaluation:**
       - Ranking of sources by performance
       - Individual source strengths/weaknesses
       - Response time and reliability assessment
       - Unique contribution analysis

    4. **Deduplication Effectiveness:**
       - Efficiency metrics and rates
       - Pattern analysis in duplicates
       - Source overlap assessment
       - Optimization opportunities

    5. **Benchmark Comparison:**
       - Industry standard comparisons
       - Percentile rankings
       - Performance grading
       - Improvement targets

    6. **Actionable Insights Generation:**
       - Specific optimization recommendations
       - Strategic improvements for future searches
       - Quality enhancement opportunities
       - Technical optimization suggestions

    **QUALITY ASSESSMENT FRAMEWORK:**

    **Grade A (90-100%):** Exceptional research quality
    - Comprehensive multi-source coverage
    - High diversity and recent evidence
    - Optimal deduplication efficiency
    - Strong impact factor representation

    **Grade B (80-89%):** High research quality
    - Good source coverage with minor gaps
    - Adequate diversity and recency
    - Effective deduplication
    - Reasonable impact representation

    **Grade C (70-79%):** Acceptable research quality
    - Basic source coverage achieved
    - Some diversity limitations
    - Standard deduplication performance
    - Mixed impact factor coverage

    **Grade D (Below 70%):** Needs improvement
    - Limited source coverage
    - Poor diversity or recency
    - Inefficient deduplication
    - Low impact factor representation

    **BENCHMARK STANDARDS:**
    - Deduplication Rate: Excellent (<20%), Good (20-35%), Acceptable (35-50%)
    - Coverage Score: Excellent (>80%), Good (65-80%), Acceptable (50-65%)
    - Quality Score: Excellent (>85%), Good (70-85%), Acceptable (60-70%)

    {{ ctx.output_format }}
  "#
}

function OptimizeSearchStrategy(query: string, cite_source_metrics: CiteSourceMetrics) -> FormulatedSearchStrategyOutput {
  client DrCorvusLLM
  prompt #"
    {{ GetProfessionalIntroduction() }}
    I am an expert in search strategy optimization and evidence-based research methodology.

    Based on CiteSource analysis results, I will provide an optimized search strategy to improve research quality and efficiency.

    ORIGINAL QUERY: {{ query }}
    
    CURRENT PERFORMANCE METRICS:
    - Sources Consulted: {{ cite_source_metrics.total_sources_consulted }}
    - Deduplication Rate: {{ cite_source_metrics.deduplication_rate }}
    - Overall Quality Score: {{ cite_source_metrics.overall_quality_score }}
    - Coverage Score: {{ cite_source_metrics.coverage_score }}
    - Diversity Score: {{ cite_source_metrics.diversity_score }}
    - Best Performing Source: {{ cite_source_metrics.best_performing_source }}

    STRATEGY OPTIMIZATION PROCESS:

    1. **Performance Gap Analysis:**
       - Identify underperforming quality dimensions
       - Assess source coverage limitations
       - Evaluate deduplication efficiency issues

    2. **Source Strategy Enhancement:**
       - Add complementary sources for coverage gaps
       - Optimize queries for underperforming sources
       - Include specialized databases if needed

    3. **Query Refinement:**
       - Improve search terms for precision
       - Add MeSH terms or specialized vocabularies
       - Optimize boolean logic for better retrieval

    4. **Quality Improvement Strategies:**
       - Target high-impact journals specifically
       - Include temporal filters for recency
       - Add study type filters for evidence quality

    5. **Efficiency Optimization:**
       - Reduce overlap between sources
       - Optimize search parameters for speed
       - Implement smart filtering strategies

    **OPTIMIZATION TARGETS:**

    **If Coverage Score < 0.7:**
    - Add Europe PMC for full-text coverage
    - Include Lens.org for comprehensive academic content
    - Add specialized medical databases

    **If Diversity Score < 0.6:**
    - Include preprint servers (medRxiv, bioRxiv)
    - Add clinical guidelines databases
    - Include grey literature sources

    **If Deduplication Rate > 0.4:**
    - Refine queries to reduce overlap
    - Use more specific search terms
    - Implement source-specific strategies

    **If Quality Score < 0.7:**
    - Focus on high-impact journals
    - Add temporal restrictions for recency
    - Include systematic review filters

    {{ ctx.output_format }}
  "#
}