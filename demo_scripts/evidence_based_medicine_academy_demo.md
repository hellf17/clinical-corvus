# Clinical Corvus: Evidence-Based Medicine Academy Module Demo Script

## Module: Evidence-Based Medicine Academy
**Location:** `frontend/src/app/academy/evidence-based-medicine/page.tsx`
**Components:**
*   Formulação PICO: `frontend/src/components/academy/research/PICOFormulationComponent.tsx`
*   Pesquisa Avançada: `frontend/src/components/academy/research/DeepResearchComponent.tsx`
*   Análise de Evidências: `frontend/src/components/academy/research/UnifiedEvidenceAnalysisComponent.tsx`

---

## 1. Audience

This demo script is tailored for:
*   **Beta Testers:** To gather feedback on functionality, usability, and workflow.
*   **Investors:** To showcase the platform's innovation, market potential, and AI capabilities.
*   **Healthcare Professionals (Doctors):** To demonstrate how Clinical Corvus enhances clinical decision-making and efficiency.
*   **Medical Students:** To highlight the educational value and practical application of evidence-based medicine.

## 2. Technical Preparation

*   Ensure Clinical Corvus backend and frontend services are running.
*   Verify `NEXT_PUBLIC_BACKEND_URL` is correctly configured in `frontend/.env.local`.
*   Confirm API keys for OpenRouter, DeepL, PubMed, Europe PMC, and Lens.org are set in `backend-api/.env`.
*   Have a stable internet connection for external API calls.
*   Prepare a few clinical scenarios or questions to use as examples for PICO formulation and research.
*   Have a sample PDF research paper ready for the "Análise de Evidências" tab.

## 3. Demo Flow & Script

**Overall Goal:** Demonstrate the seamless workflow of formulating a clinical question, conducting advanced research, and critically appraising evidence within the Clinical Corvus Academy. Emphasize AI assistance and educational value.

---

### **Introduction (2 minutes)**

**Presenter:** "Welcome to Clinical Corvus. Today, we'll explore the Evidence-Based Medicine Academy module, a powerful tool designed to empower healthcare professionals and students in mastering evidence-based practice. This module integrates advanced AI to streamline the process of formulating clinical questions, conducting comprehensive research, and critically analyzing scientific evidence."

**Key Points:**
*   Clinical Corvus as a "Clinical Co-pilot."
*   Focus on evidence-based medicine.
*   Highlight AI integration for efficiency and accuracy.
*   Briefly mention the three tabs: PICO Formulation, Advanced Research, and Evidence Analysis.

---

### **Tab 1: "Formulação PICO" (PICOFormulationComponent.tsx)**

**Timing:** 5-7 minutes

**Objective:** Demonstrate AI-assisted PICO question formulation, emphasizing clarity and research feasibility.

**Live Demonstration Instructions:**
1.  Navigate to the "Academy" section and select "Evidence-Based Medicine."
2.  Ensure the "Formulação PICO" tab is active.
3.  **Scenario Example:** "Let's imagine a medical student or a doctor is trying to formulate a research question about the effectiveness of a new treatment. Instead of struggling with the precise wording, Clinical Corvus can assist."
4.  Input a broad clinical question or scenario into the provided text area.
    *   **Example Input:** "How effective is cognitive behavioral therapy for anxiety in adolescents?"
5.  Click the "Gerar PICO" (Generate PICO) button.
6.  Observe the AI-generated PICO question.
7.  Discuss the structured output: Population (P), Intervention (I), Comparison (C), Outcome (O).
8.  Highlight the AI's ability to refine vague inputs into clear, researchable questions.
9.  **Workflow Integration:** Show how the generated PICO question can be easily copied or directly transferred to the "Pesquisa Avançada" tab (if direct transfer is implemented, otherwise mention copy-paste).

**Presenter Script:**
"Here in 'Formulação PICO,' our AI acts as your co-pilot. You provide a general clinical query, and Dr. Corvus, our AI, transforms it into a perfectly structured PICO question. This is crucial for initiating effective evidence-based research. Notice how it breaks down the question into Population, Intervention, Comparison, and Outcome, ensuring clarity and guiding your subsequent literature search. This structured approach is fundamental for both clinical practice and academic research."

**Technical Notes:**
*   Ensure the backend API endpoint `/api/research/formulate-pico-translated` is responsive.
*   Show the clear, concise output.

---

### **Tab 2: "Pesquisa Avançada" (DeepResearchComponent.tsx)**

**Timing:** 8-10 minutes

**Objective:** Showcase the comprehensive evidence search capabilities, including multi-source integration and AI-powered synthesis.

**Live Demonstration Instructions:**
1.  Switch to the "Pesquisa Avançada" tab.
2.  Paste the PICO question generated in the previous step (or use a pre-prepared one).
    *   **Example Input (from PICO):** "In adolescents with anxiety disorders (P), is cognitive behavioral therapy (I) more effective than no treatment or standard care (C) in reducing anxiety symptoms (O)?"
3.  Initiate the search.
4.  Explain that Clinical Corvus queries multiple reputable medical databases, leveraging specialized backend services for comprehensive coverage.
    *   **Under the Hood:** We integrate directly with **PubMed** (via `unified_pubmed_service`) and **Europe PMC** (via `europe_pmc_service`), accessing millions of publications, including full-text articles, preprints, and grey literature.
5.  Observe the search results, highlighting key information like titles, abstracts, and publication details. Notice the enriched metadata.
    *   **Under the Hood:** Each result is enhanced by our **Unified Metrics Service** (`unified_metrics_service`), which aggregates bibliometric data from sources like Altmetric, NIH iCite, Web of Science, OpenCitations, and Semantic Scholar. This provides a composite impact score and classification, giving you a holistic view of an article's influence.
6.  **AI Synthesis & Deduplication:** Point out the AI-generated summary or key insights from the search results (if available).
    *   **Under the Hood:** Our **CiteSource Service** (`cite_source_service`) intelligently deduplicates results across all queried databases, ensuring you see unique, high-quality evidence. It also assesses the overall search quality and provides recommendations.
7.  Discuss how this feature saves time for busy clinicians and students by providing a concise overview of relevant literature and ensuring data integrity.
8.  **Workflow Integration:** Explain that promising articles can be selected for deeper analysis in the "Análise de Evidências" tab.

**Presenter Script:**
"Now that we have a well-defined PICO question, we move to 'Pesquisa Avançada.' This isn't just a simple search engine; Clinical Corvus integrates deeply with leading medical databases like PubMed and Europe PMC, powered by our dedicated backend services. Our Unified Metrics Service then enriches each result with a comprehensive impact score, drawing data from multiple bibliometric sources. Furthermore, our CiteSource Service intelligently deduplicates and curates these findings, ensuring you receive a clean, high-quality set of unique evidence. This saves you hours of sifting through countless articles and is invaluable for staying current with the latest research and making informed clinical decisions."

**Technical Notes:**
*   Ensure the backend API endpoint `/api/research/quick-search-translated` or `/api/research/autonomous-translated` is working.
*   Demonstrate the speed and relevance of the search results.

---

### **Tab 3: "Análise de Evidências" (UnifiedEvidenceAnalysisComponent.tsx)**

**Timing:** 10-12 minutes

**Objective:** Demonstrate the critical appraisal of evidence, including text analysis and PDF upload, emphasizing the AI's ability to extract and analyze key information.

**Live Demonstration Instructions:**
1.  Switch to the "Análise de Evidências" tab.
2.  **Option A (Text Input):** Copy and paste the abstract or a relevant section of a research paper into the text area.
    *   **Example:** An abstract from a randomized controlled trial on CBT for anxiety.
3.  **Option B (PDF Upload):** Upload a sample PDF research paper.
    *   **Example:** A full-text PDF of a clinical trial.
4.  Click the "Analisar Evidência" (Analyze Evidence) button.
5.  Observe the AI-generated analysis.
6.  Discuss the output:
    *   **Key Findings:** AI's summary of the study's main conclusions.
    *   **Methodology Critique:** AI's assessment of study design, limitations, and potential biases (e.g., sample size, blinding, statistical methods).
    *   **Clinical Relevance:** How the findings apply to clinical practice.
    *   **Recommendations:** AI's suggestions for further research or clinical application.
7.  Emphasize how this feature helps students understand research methodology and helps doctors quickly assess the validity and applicability of new studies, backed by robust backend analysis.

**Presenter Script:**
"Finally, in 'Análise de Evidências,' Clinical Corvus truly shines as an educational and clinical tool. Whether you paste an abstract or upload an entire PDF, our AI performs a critical appraisal of the evidence. This is like having an expert biostatistician and clinical epidemiologist at your fingertips, guiding you through the nuances of research interpretation. For students, it's an unparalleled learning experience in critical appraisal; for doctors, it's a rapid way to ensure the evidence they're considering is robust and applicable."

**Technical Notes:**
*   Ensure the backend API endpoints `/api/research/unified-evidence-analysis-translated` (for text) and `/api/research/unified-evidence-analysis-from-pdf-translated` (for PDF) are functional.
*   Highlight the accuracy and depth of the AI's analysis.

---

### **Workflow Integration & Conclusion (3 minutes)**

**Presenter:** "As you've seen, these three modules are not isolated; they form a cohesive workflow. You can start by formulating a precise PICO question, use that question to conduct a targeted and comprehensive search across multiple databases, and then critically analyze the most promising evidence, whether it's a text abstract or a full PDF. This integrated approach ensures that healthcare professionals can rapidly access and apply the best available evidence, while students gain hands-on experience in the complete evidence-based medicine cycle."

**Key Takeaways:**
*   Seamless workflow from question to analysis.
*   AI as an intelligent assistant, not a replacement.
*   Empowering evidence-based decision-making.
*   Enhancing medical education and clinical practice.

**Q&A:** Open the floor for questions.

---

## 4. Emphasis Points

*   **AI as a Co-pilot:** Stress that AI augments human intelligence, providing structured assistance and insights, not replacing clinical judgment.
*   **Educational Value:** For students, highlight the practical application of theoretical knowledge in EBM.
*   **Clinical Utility:** For doctors, emphasize time-saving, access to up-to-date evidence, and enhanced decision support.
*   **Evidence-Based Practice:** Reinforce the core principle of integrating clinical expertise, patient values, and the best available research evidence.
*   **Data Privacy:** Briefly mention that all AI processing uses de-identified data to ensure patient privacy (if applicable to this module's data flow).

## 5. Potential Questions & Answers

*   **Q:** How accurate is the AI's analysis?
    *   **A:** "Our AI models are trained on vast amounts of medical literature and clinical data. While highly accurate, they are designed to assist and provide insights, not to make final decisions. Clinical judgment always remains paramount."
*   **Q:** Can I save my PICO questions or research results?
    *   **A:** "Yes, Clinical Corvus includes features for saving and organizing your research, allowing you to revisit and build upon your work." (If implemented, otherwise state it's a planned feature).
*   **Q:** What databases does Clinical Corvus integrate with?
    *   **A:** "We integrate with leading medical and scientific databases such as PubMed, Europe PMC, and Lens.org, ensuring a comprehensive search across a wide range of published literature."
*   **Q:** Is this tool suitable for all medical specialties?
    *   **A:** "The principles of evidence-based medicine are universal. While our examples might focus on general medicine, the tools are designed to be adaptable and beneficial across all medical specialties."