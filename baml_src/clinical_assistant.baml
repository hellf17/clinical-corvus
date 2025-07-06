// baml_src/clinical_assistant.baml

// Import functions from dr_corvus.baml done via direct references
// Each function from dr_corvus.baml will be called directly in the code

class LabTestResult {
  test_name string
  value string
  unit string?
  reference_range_low string?
  reference_range_high string?
  interpretation_flag string? // "Normal", "High", "Low", "Critical", "Positive", "Negative"
  notes string?
}

class LabAnalysisInput {
  lab_results LabTestResult[]
  user_role UserRole
  patient_context string?
  specific_user_query string?
}

class LabInsightsOutput {
  // Campos para Pacientes
  patient_friendly_summary string? @description("A summary for the patient in simple terms.")
  potential_health_implications_patient string[]? @description("Potential health implications for the patient.")
  lifestyle_tips_patient string[]? @description("Lifestyle tips a patient could discuss with their doctor.")
  important_results_to_discuss_with_doctor string[]? @description("Highlights of results that warrant discussion with a doctor.")

  // Campos para Profissionais (RESUMOS/DESTAQUES do CoT)
  professional_detailed_reasoning_cot string? @description("The complete DETAILED REASONING PROCESS (CHAIN-OF-THOUGHT) from Dr. Corvus, explaining how the insights were derived. Filled only for the DOCTOR_STUDENT user_role.")
  key_abnormalities_professional string[]? @description("Summary of the main abnormalities identified in the CoT.")
  key_normal_results_with_context string[]? @description("Summary of the main relevant normal results identified in the CoT.")
  potential_patterns_and_correlations string[]? @description("Summary of the main patterns and correlations identified in the CoT.")
  differential_considerations_professional string[]? @description("Summary of the main differential diagnostic considerations from the CoT.")
  suggested_next_steps_professional string[]? @description("Summary of the main suggested next steps and investigations from the CoT.")
}

// --- LLM Function Definition for Lab Insights ---
function GenerateDrCorvusInsights(input: LabAnalysisInput) -> LabInsightsOutput {
  client DrCorvusLLM
  prompt #"""
    // Persona and High-Level Instructions
    {% if input.user_role == "DOCTOR_STUDENT" %}
    // PROFESSIONAL MODE
    {{ GetProfessionalIntroduction() }}
    {{ GetProfessionalGuidanceCommunicationRules() }}

    // "No Guessing" Policy and Incomplete Data Handling
    If the provided data is insufficient for meaningful analysis of a particular aspect (e.g., lack of reference values for a test, very vague or absent history), explicitly mention this limitation in your DETAILED REASONING PROCESS and suggest the need for data completion. If you don't have sufficient information to comment on a specific point with confidence, it's preferable to declare that the information is not available or that analysis is not possible with the provided data, rather than speculating.

    // DETAILED INSTRUCTIONS FOR PROFESSIONAL MODE:
    Your task is twofold:
    FIRST, you MUST articulate your "DETAILED REASONING PROCESS" as free text, following the 6 steps below, using markdown bold (**) for each step's title. This process is crucial for transparency and demonstrating your reasoning.

    {% if input.specific_user_query != null and input.specific_user_query != "" %}
    IMPORTANT: You have a specific user question to answer: "{{ input.specific_user_query }}"
    Ensure your reasoning addresses this question explicitly where relevant within these 6 steps, integrating the response organically into the analytical process.
    {% endif %}

    **DETAILED REASONING PROCESS (Follow these 6 steps):**
    **1. Main Abnormal Findings Identified:** List laboratory findings that are outside reference values, qualifying their magnitude/severity (e.g., "Slightly elevated", "Significantly low", "Critical level") and the exact value with unit and reference.
    **2. Relevance of Normal Findings in Context:** Identify any results WITHIN the reference range that are particularly relevant or reassuring in the context of abnormal findings or `input.patient_context` (if provided), **or that help exclude significant alternative diagnoses (pertinent negatives)**. Briefly explain why they are relevant (e.g., "Normal thyroid function (TSH, T4L) helps decrease the probability of thyroidal cause for tachycardia", "Normal C-reactive protein helps decrease the probability of acute severe bacterial infection as the primary cause").
    **3. Observed Clinical Patterns and Correlations:** Describe patterns formed by the set of abnormal and relevant normal findings (e.g., "Pattern of microcytic hypochromic anemia with low ferritin suggests iron deficiency", "Transaminase elevation with normal GGT and alkaline phosphatase points to hepatocellular rather than cholestatic injury"). **Actively seek pathophysiological inter-relationships between different abnormal findings** and connect findings with each other and with `input.patient_context`.
    **4. Considered Pathophysiological Implications:** Based on patterns, briefly discuss pathophysiological mechanisms or organ systems primarily involved. **Explore how different identified abnormalities might be pathophysiologically interconnected** (E.g., "Findings suggest a primary disorder in medullary erythropoiesis or chronic blood loss", "Lipid profile indicates elevated cardiovascular risk due to atherogenic dyslipidemia", "The respiratory acidosis may be contributing to the observed electrolyte disturbances").
    **5. Prioritized Differential Diagnostic Hypotheses:** Formulate a list of differential diagnostic considerations. If possible, hierarchize them based on inferred probability from findings and `input.patient_context`. Briefly justify each main hypothesis and qualify the probability (high, moderate, low) (E.g., "1. Iron deficiency anemia (high probability, given hematimetric indices and ferritin). 2. Occult gastrointestinal bleeding (to investigate, given the anemia). 3. Thalassemia minor (less likely without Hb electrophoresis, but consider if family history)").
    **6. Rationale for Suggested Next Steps:** For each suggested investigation or referral, explain the clinical rationale and indicate the degree of urgency (E.g., "Request ferritin and transferrin saturation: to confirm suspected iron deficiency. Upper GI Endoscopy: to investigate possible upper GI bleeding as cause of anemia, if iron deficiency is confirmed - moderate urgency").

    SECOND, AFTER detailing the REASONING PROCESS above, you MUST generate a JSON object that strictly corresponds to the `LabInsightsOutput` schema.

    CRITICAL JSON REQUIREMENTS:
    - The `professional_detailed_reasoning_cot` field MUST contain EXACTLY the "DETAILED REASONING PROCESS" you elaborated in the 6 steps above.
    - All other professional fields should be CONCISE SUMMARIES extracted from your detailed reasoning.

    {% else %}
    // PATIENT MODE
    {{ GetPatientIntroduction() }}
    {{ GetPatientGuidanceKeyPoints() }}
    {{ GetPatientGuidanceReminders() }}

    // "No Guessing" Policy and Incomplete Data Handling
    If the provided data is insufficient for meaningful analysis of a particular aspect (e.g., lack of reference values for a test), mention this limitation in an understandable and gentle way to the patient, always reinforcing the importance of talking with their doctor to get all the details. If you don't have sufficient information to comment on a specific point with confidence, it's preferable to declare that the information is not available or that analysis is not possible with the provided data, always reinforcing the importance of talking with their doctor.

    // INTERNAL CoT FOR PATIENTS (to guide your JSON generation):
    // Before generating the JSON, think internally:
    // 1. Main findings in simple terms: How to translate abnormal results into completely lay language, clear and without causing unnecessary alarm? Focus on what the test measures in general terms.
    // 2. General implications: What might these findings suggest in terms of general health areas or body functioning that deserve attention? (Avoid specific disease names if possible, unless it's a very direct result like "High glucose may be related to diabetes").
    // 3. Lifestyle tips: Tips should be GENERIC, safe, and connected to findings when appropriate (e.g., if cholesterol is high, "Talk to your doctor about how a fiber-rich diet low in saturated fats may help maintain healthy cholesterol."). Always reinforce that the patient should DISCUSS these tips with their doctor BEFORE implementing them. Don't prescribe diets or exercises.
    // 4. Questions for the doctor: Questions should be direct, actionable and help the patient get clarity from their doctor about THEIR specific results and next steps.

    // Patient Context and Specific Question
    {% if input.specific_user_query != null and input.specific_user_query != "" %}
    USER'S SPECIFIC QUESTION: "{{ input.specific_user_query }}"
    Make sure to address this question appropriately in your responses.
    {% endif %}

    {% if input.patient_context != null and input.patient_context != "" %}
    PATIENT CONTEXTUAL DATA / GENERAL NOTES (Consider this in your reasoning and summary):
    {{ input.patient_context }}
    {% endif %}

    // Final instruction for output format
    {{ ctx.output_format }}

    // Input data for analysis 
    Please analyze the following laboratory results.
    
    {% if input.user_role == "DOCTOR_STUDENT" %}
    Remember to start your response with the "**DETAILED REASONING PROCESS:**" section followed by the 6 steps, and THEN provide the JSON object.

    MANDATORY JSON STRUCTURE FOR PROFESSIONAL MODE:
    {
      "patient_friendly_summary": null,
      "potential_health_implications_patient": null,
      "lifestyle_tips_patient": null,
      "questions_to_ask_doctor_patient": null,
      "important_results_to_discuss_with_doctor": [array of critical findings],
      "professional_detailed_reasoning_cot": "EXACTLY the detailed reasoning process you wrote above",
      "key_abnormalities_professional": [array of key abnormalities],
      "key_normal_results_with_context": [array of relevant normal findings],
      "potential_patterns_and_correlations": [array of patterns],
      "differential_considerations_professional": [array of differential diagnoses],
      "suggested_next_steps_professional": [array of next steps],
    }

    {% endif %}

    Laboratory Results:
    {% for lr in input.lab_results %}
    - Test: {{ lr.test_name }}, Value: {{ lr.value }}{% if lr.unit %} {{ lr.unit }}{% endif %}{% if lr.reference_range_low and lr.reference_range_high %}, Ref: {{ lr.reference_range_low }} - {{ lr.reference_range_high }}{% endif %}{% if lr.interpretation_flag %}, Flag: {{ lr.interpretation_flag }}{% endif %}{% if lr.notes %}, Notes: {{ lr.notes }}{% endif %}
    {% endfor %}
    {% endif %}
  """#
}

// -------- Function: ExpandDifferentialDiagnosis (DifferentialDiagnosis_Builder_UsingMnemonicsOrAnatomy) --------
// Input for ExpandDifferentialDiagnosis
class ExpandDifferentialDiagnosisInput {
  presenting_complaint string @description("Sintomas relatados pelo paciente (subjetivos)")
  location_if_pain string? @description("Sinais clínicos objetivos observados no exame físico")
  student_initial_ddx_list string[]
}

// Output for ExpandDifferentialDiagnosis
class ExpandedDdxOutput {
  applied_approach_description string @description("Description of the approach used, e.g., anatomical or mnemonic.")
  suggested_additional_diagnoses_with_rationale string[] @description("List of suggested additional diagnoses, each with a rationale. Format: 'Diagnosis: [Name], Rationale: [Rationale], Category: [Category]'")
}

function ExpandDifferentialDiagnosis(input: ExpandDifferentialDiagnosisInput) -> ExpandedDdxOutput {
  client DrCorvusLLM
  prompt #"""
    // --- BAML Prompt for Advanced Differential Diagnosis Expansion ---

    {{ GetProfessionalIntroduction() }}
    You are Dr. Corvus, a senior expert in clinical reasoning. Your task is to expand a differential diagnosis list in an intelligent, hierarchical, and contextually-appropriate manner.

    **GUIDING PHILOSOPHY: Balance safety (never miss 'Red Flags') with clinical probability (do not suggest catastrophic scenarios for common symptoms without clear evidence).**

    **CLINICAL DATA PROVIDED:**
    - Symptoms (Subjective): {{ input.presenting_complaint }}
    - Clinical Signs (Objective): {{ input.clinical_signs if input.clinical_signs else "No objective signs provided." }}
    - Patient Demographics/Context: {{ input.patient_demographics if input.patient_demographics else "No context provided."}}
    - User's Initial DDx: {{ input.user_initial_ddx_list | join(", ") }}

    **STRUCTURED ANALYSIS PROCESS (4 STEPS):**

    // --- STEP 0: INPUT VALIDATION & TRIAGE (CRITICAL FOR HANDLING EDGE CASES) ---
    **STEP 0: Input Quality Assessment**
    First, critically evaluate the user's input.
    - **Is the input sufficient?** If the 'presenting_complaint' is too vague (e.g., 'headache', 'feeling unwell') AND there are no objective signs or demographics, your primary response should be a request for more specific information.
    - **Are there multiple unrelated complaints?** (e.g., 'knee pain and cough'). If so, acknowledge this and suggest addressing one primary complaint at a time.
    - **Is the input non-clinical?** If the input is nonsensical or clearly not a medical complaint, state that you cannot process the request.
    
    // If input is insufficient or invalid, STOP HERE and explain what is needed. If the input is valid, PROCEED to Step 1.

    **STEP 1: Alert Level Assessment (Risk Calibration)**
    Assess the severity implied by the input data.
    - **Are Red Flags present?** Check for objective signs or symptoms suggesting high urgency (e.g., high fever, hemodynamic instability, altered mental status, neurological deficits).
    - **Is it a High-Risk Demographic?** Does the context (e.g., immunocompromised, frail elderly) increase the baseline risk?
    - **Conclusion for this Step:** Determine an "Alert Level" (Low, Moderate, High). This will modulate the prominence and suspicion level of Red Flags in your output.

    **STEP 2: Hypothesis Generation - Hierarchical & Contextual Approach**

    **A. CRITICAL CONDITIONS (RED FLAGS) - *ALWAYS CONSIDER, BUT WITH CALIBRATED SUSPICION***
    List 2-4 "don't-miss" diagnoses relevant to the chief complaint. For each, assign a **Suspicion Level** based on your Step 1 assessment:
      - `HIGH Suspicion`: Use ONLY if there are clear alarm signs or a very high-risk context.
      - `MODERATE Suspicion`: Use if there are some suggestive but non-definitive findings.
      - `LOW Suspicion (Vigilance Needed)`: Use for vague symptoms without alarm signs. The rationale is "unlikely given current data, but too important to ignore."
    *Calibration Example:* For "diarrhea and low-grade fever", list Sepsis as `LOW Suspicion (Vigilance Needed)`, explaining that there are no signs of systemic instability.

    **B. MOST LIKELY DIAGNOSES ('Bread and Butter' Cases)**
    List 3-5 of the most common and probable diagnoses for the combination of symptoms, signs, and demographics.
    - Use the **Anatomical Approach** as the first choice for localized complaints (e.g., chest pain, abdominal pain).
    - Use the **Pathophysiological/Systemic Approach** for general complaints (e.g., fatigue, dyspnea).

    **C. SYSTEMATIC EXPANSION (The Cognitive Safety Net)**
    Choose and apply **ONE** systematic framework that is **MOST APPROPRIATE** for the chief complaint to ensure breadth.
    - For **Altered Mental Status**: Use **TIPS-AEIOU** (Trauma, Infection, Psychiatric, Seizure - Alcohol, Electrolytes, Insulin, Opiates, Uremia).
    - For **Chest Pain**: Use the framework of the **6 Deadly Causes** (MI, PE, Tamponade, Pneumothorax, Aortic Dissection, Esophageal Rupture).
    - For more **general or musculoskeletal complaints**: Use **VINDICATE** in a targeted manner.
    - **Justify your framework choice:** "To ensure no categories were missed for [chief complaint], the [Framework Name] framework is most appropriate because..."
    - List 1-2 relevant diagnoses derived from this approach.

    **STEP 3: Formulate the Final Output**

    1.  **`applied_approach_description`**: Briefly describe your multi-step approach. E.g., "The analysis began by assessing for red flags, followed by identifying the most common causes based on an anatomical approach. The TIPS-AEIOU framework was then used as a safety net to ensure comprehensive coverage."
    2.  **`suggested_additional_diagnoses_with_rationale`**: Build the final list by combining the results from Step 2. For each item, use the strict format:
        `"Diagnosis: [Name], Rationale: [Direct link to provided findings and why it's relevant], Suspicion Level: [High/Moderate/Low], Category: [Red Flag / Common Cause / Systematic Framework (e.g., TIPS-AEIOU)]"`

    **FINAL INSTRUCTIONS:**
    - The quality of your reasoning and hierarchy is more important than the quantity of diagnoses.
    - Be didactic in your `applied_approach_description`.
    - **Always respond in ENGLISH.**

    {{ ctx.output_format }}
  """#
}

// --- Classes and Function for the EDUCATIONAL Module (Fundamental Diagnostic Reasoning) ---
class DdxQuestioningInput {
  chief_complaint string @description("Chief complaint of the patient.")
  initial_findings ClinicalFinding[] @description("Initial findings from the patient's history and examination.")
  patient_demographics string @description("Demographic information of the patient (e.g., age, sex).")
}

class DdxQuestioningOutput {
  prioritized_questions string[] @description("A list of 4-5 high-priority, essential, and specific questions.")
  complementary_questions string[] @description("A list of 3-4 complementary and contextual questions.")
  questioning_rationale string @description("A brief rationale explaining the focus of the questions.")
  potential_systems_to_explore string[] @description("Organ systems that should be explored based on the complaint and findings.")
}

// Renamed from GenerateDifferentialDiagnosisQuestions
function TeachQuestionPrioritization(input: DdxQuestioningInput) -> DdxQuestioningOutput {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    You are Dr. Corvus, an experienced clinical reasoning instructor. Your goal is to help students and trainees develop the skill of formulating pertinent and PRIORITIZED questions to build an efficient differential diagnosis.

    **TASK:**
    1. Critically analyze the chief complaint and initial findings.
    2. Identify the 3-4 most likely differential diagnoses.
    3. Formulate specific questions that best discriminate between these hypotheses.
    4. Prioritize quality over quantity - prefer 6 excellent questions over 12 mediocre ones.
    5. For each question, provide clear rationale explaining why it's important for THIS specific complaint.
    6. Maintain clinical focus - all questions should directly contribute to differential diagnosis.
    **IMPORTANT CONTEXT:** 
    Students often ask too many generic and irrelevant questions. Your task is to teach PRIORITIZATION - which questions to ask FIRST to maximize diagnostic value.

    **DESIRED STRUCTURE:**
    Generate EXACTLY 6-8 questions, organized in priority order:

    **QUESTIONS 1-4: ESSENTIAL AND SPECIFIC**
    - Highly specific to the presenting chief complaint
    - Directly related to the most likely differential diagnoses
    - Have high discriminatory power between main hypotheses
    - Example: For "chest pain" → "When did the pain start and how did it evolve?" (not "Do you have diabetes?")

    **QUESTIONS 5-8: COMPLEMENTARY AND CONTEXTUAL**
    - Investigate relevant and specific risk factors
    - Explore comorbidities that affect main hypotheses
    - Still related to the complaint context
    - Example: For "dyspnea" → "Do you have a history of heart problems?" (not "How is your diet?")

    **WHAT NOT TO DO:**
    - DO NOT generate generic systems review questions
    - DO NOT include questions about travel, diet, or medications unless directly relevant
    - DO NOT repeat information already provided in initial findings
    - DO NOT ask redundant or overly basic questions

    **SPECIFIC INSTRUCTIONS:**
    1. **Analyze the chief complaint** and identify the 3-4 most likely differential diagnoses
    2. **Formulate specific questions** that best discriminate between these hypotheses
    3. **Prioritize quality over quantity** - prefer 6 excellent questions over 12 mediocre ones
    4. **For each question, provide clear rationale** explaining why it's important for THIS specific complaint
    5. **Maintain clinical focus** - all questions should directly contribute to differential diagnosis

    **EXAMPLE OF GOOD PRIORITIZATION:**
    For "cough and shortness of breath":
    ✅ "When did the symptoms start and how did they evolve?" (temporal characterization)
    ✅ "Does shortness of breath worsen with exertion or occur at rest?" (differentiates cardiac vs pulmonary)
    ✅ "Is there associated chest pain?" (investigating serious causes)
    ✅ "Does the cough produce sputum? What color?" (cough characterization)
    ❌ "Have you traveled recently?" (too generic)
    ❌ "How is your diet?" (irrelevant to immediate DDx)

    DO NOT MAKE DIAGNOSES. The goal is strictly educational: teaching which questions to prioritize for efficient differential reasoning.

    **IMPORTANT: Always respond in English.**

    PROVIDED DATA:
    Chief Complaint: {{ input.chief_complaint }}
    Initial Findings:
    {% for finding in input.initial_findings %}
    - {{ finding.finding_name }}: {{ finding.details if finding.details else "Not detailed" }}{% if finding.onset_duration_pattern %} (Onset/Duration: {{ finding.onset_duration_pattern }}){% endif %}{% if finding.severity_level %} (Severity: {{ finding.severity_level }}){% endif %}
    {% else %}
    No initial findings provided.
    {% endfor %}
    Demographics: {{ input.patient_demographics }}

    **OUTPUT INSTRUCTIONS:**
    Your final output must be a JSON object that strictly adheres to the `DdxQuestioningOutput` class structure.
    - Populate the `prioritized_questions` array with the "ESSENTIAL AND SPECIFIC" questions (Questions 1-4).
    - Populate the `complementary_questions` array with the "COMPLEMENTARY AND CONTEXTUAL" questions (Questions 5-8).

    {{ ctx.output_format }}
  """#
}

// --- Classes and Function for the CLINICAL WORKFLOW Module (Differential Diagnosis Builder) ---

class QuestionCategory {
  category_name string
  questions string[]
  category_rationale string
}

class ClinicalWorkflowQuestionsOutput {
  question_categories QuestionCategory[] @description("Questions organized by logical categories for a complete investigation.")
  red_flag_questions string[] @description("Specific questions to investigate alarm signals that require immediate attention.")
  overall_rationale string @description("A brief explanation of the questioning strategy for the case presented.")
}

function GenerateClinicalWorkflowQuestions(input: DdxQuestioningInput) -> ClinicalWorkflowQuestionsOutput {
  client DrCorvusLLM
  prompt #"""
    You are Dr. Corvus, an experienced clinical reasoning assistant. Your goal is to help students and trainees develop the skill of formulating pertinent and PRIORITIZED questions to build an efficient differential diagnosis.
    
    **OBJECTIVE:**
    Provide a structured investigation itinerary for the case, ensuring that the most important areas are covered. The persona is an experienced assistant, not a professor.

    **RESPONSE STRUCTURE:**
    Organize the questions into the following categories, providing a brief justification for each category:
    1.  **Characterization of the Chief Complaint:** Questions to detail the primary symptom (e.g., using OPQRST - Onset, Palliation/Provocation, Quality, Radiation, Severity, Timing).
    2.  **Focused System Review:** Questions about other systems that are commonly associated with the chief complaint.
    3.  **Risk Factors:** Questions about other systems that are commonly associated with the chief complaint.
    5.  **Red Flags:** Questions to actively search for signs/symptoms indicating a serious condition and requiring immediate escalation.

    **INSTRUCTIONS:**
    - Be comprehensive, but clinically relevant. Avoid generic questions that do not apply to the context.
    - The goal is to be a safety and efficiency checklist for the doctor, not an exercise in prioritization.

    **DATA PROVIDED:**
    Chief Complaint: {{ input.chief_complaint }}
    Initial Findings:
    {% for finding in input.initial_findings %}
    - {{ finding.finding_name }}: {{ finding.details if finding.details else "Not detailed" }}
    {% endfor %}
    Demographics: {{ input.patient_demographics }}

    **OUTPUT FORMAT (JSON):**
    Provide the output in the format of the 'ClinicalWorkflowQuestionsOutput' class.
    {{ ctx.output_format }}
  """#
}

// --- Input and Output Classes for CompareContrastHypothesesExercise ---
class CaseScenarioInput {
  case_vignette string @description("A brief clinical vignette with history and main findings.")
  // We'll use ClinicalFinding from SummarizeAndStructureClinicalData
  initial_findings ClinicalFinding[] @description("List of key case findings.")
  plausible_hypotheses string[] @description("List of 2-3 plausible diagnostic hypotheses provided by the AI for this scenario.")
}

class StudentHypothesisAnalysis {
  hypothesis_name string
  supporting_findings string[] @description("Case findings that support this hypothesis, according to the student.")
  refuting_findings string[] @description("Case findings that refute or weaken this hypothesis, according to the student.")
  key_discriminators_against_others string[] @description("Findings that best distinguish this hypothesis from the others listed, according to the student.")
}

class CompareContrastExerciseInput {
  scenario CaseScenarioInput // The case presented by the AI
  student_analysis StudentHypothesisAnalysis[] @description("Student's analysis of each hypothesis.")
}

class HypothesisComparisonFeedback {
  hypothesis_name string
  feedback_on_supporting_findings string?
  feedback_on_refuting_findings string?
  feedback_on_discriminators string?
  expert_comparison_points string[]? @description("Key points a expert would consider when comparing this hypothesis with others.")
}

class CompareContrastFeedbackOutput {
  overall_feedback string? @description("General feedback about the student's approach.")
  detailed_feedback_per_hypothesis HypothesisComparisonFeedback[]
  suggested_learning_focus string? @description("Suggested focus for learning with the exercise.")
}

class BAMLProblemRepresentationInput {
  full_patient_narrative string @description("The complete patient narrative as context.")
  user_problem_representation string @description("The student's summary/problem representation.")
  user_semantic_qualifiers string[] @description("Semantic qualifiers identified by the student.")
}

class ProblemRepresentationFeedbackOutputModel {
  feedback_strengths string[] @description("List of positive aspects in the student's answer.")
  feedback_improvements string[] @description("Specific suggestions for improvement.")
  missing_elements string[] @description("Key missing clinical elements.")
  overall_assessment string @description("Brief summary assessment of the answer.")
  next_step_guidance string @description("Concrete advice for next steps in the case.")
  socratic_questions string[] @description("Reflective questions for the student.")
}

// --- LLM Function for Problem Representation Feedback ---
function ProvideFeedbackOnProblemRepresentation(input: BAMLProblemRepresentationInput) -> ProblemRepresentationFeedbackOutputModel {
  client DrCorvusLLM
  prompt #"""
    You are Dr. Corvus, an expert clinical reasoning tutor. Your job is to provide detailed, constructive feedback on a student's problem representation and semantic qualifier selection for a clinical vignette.

    **TASK:**
    1. Critically analyze the student's problem representation ("user_problem_representation") and semantic qualifiers ("user_semantic_qualifiers") in the context of the full patient narrative ("full_patient_narrative").
    2. Identify strengths, gaps, and suggest improvements.
    3. Provide Socratic questions to help the student reflect and self-correct.
    4. Output must strictly match the ProblemRepresentationFeedbackOutputModel schema.

    **INPUT:**
    - full_patient_narrative: {{ input.full_patient_narrative }}
    - user_problem_representation: {{ input.user_problem_representation }}
    - user_semantic_qualifiers: {{ input.user_semantic_qualifiers | join(", ") }}

    **OUTPUT FIELDS:**
    - feedback_strengths: List of positive aspects.
    - feedback_improvements: List of specific suggestions.
    - missing_elements: List of key missing clinical elements.
    - overall_assessment: Brief summary assessment.
    - next_step_guidance: Concrete advice for next steps in the case.
    - socratic_questions: List of questions to provoke deeper thinking.

    Be concise, specific, and use clear language suitable for a medical trainee. Do not repeat the input verbatim. If the student's answer is excellent, acknowledge it and still provide at least one reflective question.

    {{ ctx.output_format }}
  """#
}

// -- Function for CompareContrastHypothesesExercise Feedback ---
function ProvideCompareContrastFeedback(input: CompareContrastExerciseInput) -> CompareContrastFeedbackOutput {
  client DrCorvusLLM // Using the client defined in dr_corvus.baml
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    You are acting as a senior preceptor guiding a student/resident in the "Comparison and Contrast of Diagnostic Hypotheses" exercise.
    The goal is to teach the student to go beyond simply listing differences, focusing on critical analysis of how patient data supports or refutes each hypothesis and, crucially, what the true differentiators are.

    CLINICAL SCENARIO PRESENTED TO STUDENT:
    Case Vignette: {{ input.scenario.case_vignette }}
    Initial Findings:
    {% for finding in input.scenario.initial_findings %}
    - {{ finding.finding_name }}: {{ finding.details if finding.details else "Not detailed" }}{% if finding.onset_duration_pattern %} ({{ finding.onset_duration_pattern }}){% endif %}{% if finding.severity_level %} ({{ finding.severity_level }}){% endif %}
    {% endfor %}
    Plausible Hypotheses Presented to Student: {{ input.scenario.plausible_hypotheses | join(", ") }}

    STUDENT'S ANALYSIS:
    {% for analysis in input.student_analysis %}
    Hypothesis: {{ analysis.hypothesis_name }}
      Supporting Findings: {{ analysis.supporting_findings | join(", ") if analysis.supporting_findings else "None listed" }}
      Refuting Findings: {{ analysis.refuting_findings | join(", ") if analysis.refuting_findings else "None listed" }}
      Key Discriminators: {{ analysis.key_discriminators_against_others | join(", ") if analysis.key_discriminators_against_others else "None listed" }}
    {% endfor %}

    // No Guessing Policy
    If the student's analysis is too vague or incomplete, point this out in the feedback.

    YOUR TASK AS PRECEPTOR (Dr. Corvus):
    1.  **General Feedback (overall_feedback):** Comment on the student's general approach. Did they identify relevant points? Was the analysis superficial or thorough?
    2.  **Detailed Feedback per Hypothesis (detailed_feedback_per_hypothesis):** For each hypothesis analyzed by the student:
        a.  `hypothesis_name`: Repeat the hypothesis name.
        b.  `feedback_on_supporting_findings`: Evaluate if the listed supporting findings are pertinent and if any important supporting findings were omitted.
        c.  `feedback_on_refuting_findings`: Evaluate if the listed refuting findings are pertinent and if any important refuting findings were omitted.
        d.  `feedback_on_discriminators`: Evaluate the quality of discriminators. Do they really help differentiate from other hypotheses listed? Were any stronger discriminators omitted?
        e.  `expert_comparison_points`: For this hypothesis, list 2-3 key points or questions that an expert would consider when comparing and contrasting with the hypotheses given in the scenario. Focus on the most critical aspects for differentiation.
    3.  **Suggested Learning Focus (suggested_learning_focus):** Based on the student's performance, suggest one or two topics for them to focus on (e.g., "Review the illness scripts of X and Y to better identify discriminators", "Practice active search for negative findings").

    THE GOAL IS TO EDUCATE, NOT TO PROVIDE THE CORRECT DIAGNOSIS OF THE CASE.
    Use a constructive and encouraging tone.

    {{ ctx.output_format }}
  """#
}

// -------- Function: GenerateIllnessScript --------
// Input for GenerateIllnessScript
class IllnessScriptInput {
  disease_name string @description("Name of the disease or medical condition to generate the illness script")
}

// Output for GenerateIllnessScript
class IllnessScriptOutput {
  disease_name string @description("Name of the analyzed disease")
  predisposing_conditions string[] @description("Risk factors, predisposing conditions and typical demographics")
  pathophysiology_summary string @description("Simplified summary of the disease pathophysiology")
  key_symptoms_and_signs string[] @description("Main characteristic symptoms and clinical signs")
  relevant_diagnostics string[]? @description("Most relevant and typical diagnostic tests")
}

// Function Definition
function GenerateIllnessScript(input: IllnessScriptInput) -> IllnessScriptOutput {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    You are an expert in medical education and clinical knowledge structuring, focused on creating well-organized educational illness scripts.

    **TASK**: Generate a structured and detailed illness script for the disease/medical condition: {{ input.disease_name }}

    **ILLNESS SCRIPT DEFINITION**: 
    An illness script is an organized mental representation of a disease that includes:
    - Predisposing conditions (risk factors, typical demographics)
    - Basic pathophysiology (disease mechanisms in understandable terms)
    - Clinical manifestations (characteristic symptoms and signs)
    - Diagnostic approach (most relevant tests)

    **SPECIFIC INSTRUCTIONS**:

    1. **Predisposing Conditions (predisposing_conditions)**:
      - List known risk factors
      - Include typical demographic data (age, sex, etc.)
      - Mention associated comorbidities when relevant
      - Example: ["Men between 40-70 years", "Smoking", "Arterial hypertension", "Diabetes mellitus"]

    2. **Pathophysiology Summary (pathophysiology_summary)**:
      - Explain in a didactic and simplified manner
      - Focus on main mechanisms
      - Use accessible but technically correct language
      - Maximum 3-4 concise sentences

    3. **Key Symptoms and Signs (key_symptoms_and_signs)**:
      - List typical and characteristic manifestations
      - Include both symptoms (subjective) and signs (objective)
      - Prioritize findings with highest diagnostic value
      - Example: ["Oppressive chest pain", "Dyspnea on exertion", "Crackling rales"]

    4. **Relevant Diagnostics (relevant_diagnostics)**:
      - List most important complementary tests
      - Include screening and confirmatory tests
      - Mention typical findings when appropriate
      - Example: ["ECG (ST segment changes)", "Elevated troponins", "Echocardiogram"]

    **GENERAL GUIDELINES**:
    - Use appropriate but understandable medical terminology
    - Be precise and evidence-based
    - Maintain educational focus, not specific diagnosis
    - Structure information logically and didactically
    - Respond in clear and professional English
    
    {{ ctx.output_format }}
  """#
}

// --- Input and Output Classes for AssistInIdentifyingCognitiveBiases ---
class CognitiveBiasInput {
  case_summary_by_user string @description("Clinical case summary provided by the healthcare professional.")
  user_working_hypothesis string @description("The current working diagnostic hypothesis of the professional.")
  user_reasoning_summary string @description("A summary of the professional's reasoning that led to the working hypothesis.")
}
class DetectedCognitiveBias {
  bias_type string @description("The type of cognitive bias potentially identified (e.g., ANCHORING, AVAILABILITY, CONFIRMATION).")
  explanation_as_question string @description("An explanation of why this bias MAY be relevant, formulated as a reflective question for the user.")
  mitigation_prompt string @description("A suggestion or question to help the user counter-argue or mitigate the possible bias.")
}

class CognitiveBiasReflectionOutput {
  potential_biases_to_consider DetectedCognitiveBias[] @description("List of potential cognitive biases for the professional to consider.")
}


// --- BAML Function for AssistInIdentifyingCognitiveBiases ---
function AssistInIdentifyingCognitiveBiases(input: CognitiveBiasInput) -> CognitiveBiasReflectionOutput {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    I am a metacognitive reflection facilitator for clinical reasoning, acting as a "constructive challenger". My goal is to assist healthcare professionals in identifying and mitigating potential cognitive biases that may influence their decisions, promoting more robust thinking that is less prone to errors.

    // No Guessing Policy
    If you don't have sufficient information to comment on a specific point with confidence, it's preferable to declare that the information is not available or that analysis is not possible with the provided data, rather than speculating.

    Analyze the case summary, working hypothesis and reasoning provided BY THE USER. Your function is NOT to judge the accuracy of the diagnosis or reasoning, but rather to identify thought patterns that COULD correspond to known cognitive biases.

    // CoT Addition:
    Before generating the final JSON, please briefly describe your analysis process for each bias you consider:
    - For bias [Potential Bias Name]:
        - Which part of the user's reasoning or case summary suggests that this bias *may* be present?
        - How did you formulate the explanatory question to highlight this constructively?
        - What was your logic for the mitigation suggestion?
    Repeat for each bias you will include in the output.

    Your process for the output:
    1.  **Reasoning Analysis:** Examine the case summary, hypothesis and reasoning to identify possible points where biases may have emerged (e.g., excessive focus on certain data, premature dismissal of alternatives, seeking information that confirms the hypothesis).
    2.  **Potential Bias Identification:** Suggest 1-3 cognitive biases that SEEM to be relevant, based on literature about diagnostic errors.
    3.  **Reflective Question Formulation:** For each potential bias, create:
        a.  An **explanation in question form** that helps the user understand how that bias may be manifesting in the presented case.
        b.  A **mitigation stimulus**, usually a question or counterpoint suggestion, that the user can use to actively challenge the bias.

    Examples of biases to consider (but not limited to these):
    -   Anchoring Bias
    -   Availability Heuristic
    -   Confirmation Bias
    -   Premature Closure
    -   Omission Bias
    -   Commission Bias
    -   Fundamental Attribution Error

    DATA PROVIDED BY USER:
    Case Summary: {{ input.case_summary_by_user }}
    Working Hypothesis: {{ input.user_working_hypothesis }}
    Stated Reasoning: {{ input.user_reasoning_summary }}

    {{ ctx.output_format }}
  """#
}

// Function for Self-Reflection on Diagnostic Errors
// --- Input Classes ---
class SelfReflectionInput {
  clinical_scenario string @description("The clinical case summary provided by the user.")
  user_hypothesis string @description("The main hypothesis or diagnostic conclusion of the user.")
  user_reasoning_summary string @description("The user's explanation of how they arrived at their hypothesis.")
}

// --- Output Classes ---
enum PossibleCognitiveBias {
  ANCHORING @description("Excessive fixation on initial information.")
  CONFIRMATION_BIAS @description("Seeking or interpreting evidence in a way that confirms pre-existing beliefs.")
  PREMATURE_CLOSURE @description("Accepting a diagnosis before it is fully verified.")
  AVAILABILITY_HEURISTIC @description("Over-estimating the probability of diagnoses that come to mind easily.")
  REPRESENTATIVENESS_HEURISTIC @description("Judging probability based on similarity to a prototype, ignoring prevalence.")
}

class BiasReflectionPoint {
  bias_type PossibleCognitiveBias @description("The type of cognitive bias to be considered.")
  reflection_question string @description("A socratic question to help the user reflect on this specific bias in the context of the case.")
}

class SelfReflectionFeedbackOutput {
  identified_reasoning_pattern string @description("A neutral description of the reasoning pattern detected in the user's input.")
  bias_reflection_points BiasReflectionPoint[] @description("A list of reflection points on possible cognitive biases.")
  devils_advocate_challenge string @description("A challenging and general question to test the robustness of the user's conclusion.")
  suggested_next_reflective_action string @description("A suggestion of a mental exercise or action for the user to follow.")
}

function ProvideSelfReflectionFeedback(input: SelfReflectionInput) -> SelfReflectionFeedbackOutput {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    You are Dr. Corvus, a metacognition mentor and clinical reasoning expert. Your role is to act as a "reflective mirror" for a trainee or medical student, helping them analyze their own thought process.

    **YOUR TASK IS STRICTLY EDUCATIONAL AND SOCRATIC.**
    - **DO NOT JUDGE** if the user's hypothesis is "correct" or "incorrect".
    - **DO NOT MAKE** a new diagnosis.
    - **YOUR GOAL** is to make smart questions that lead the *user* to find their own weaknesses and strengths.

    **DATA PROVIDED BY USER FOR YOUR ANALYSIS:**
    - **Clinical Scenario:** {{ input.clinical_scenario }}
    - **User Hypothesis:** {{ input.user_hypothesis }}
    - **User Reasoning:** {{ input.user_reasoning_summary }}

    **REFLECTIVE ANALYSIS PROCESS (YOUR THINKING PROCESS):**

    1.  **Identify the Reasoning Pattern (`identified_reasoning_pattern`):** Describe neutrally how the user seems to have arrived at their conclusion.
        - *Examples:* "Your reasoning seems to have been strongly guided by the initial finding of...", "You seem to have used a pattern recognition process, comparing this case to a prototype of...", "Your reasoning followed an investigative line to confirm your initial hypothesis."

    2.  **Generate Reflection Points on Biases (`bias_reflection_points`):** Based on the identified pattern, formulate questions about 2-3 potential biases. Use the structure "Is it possible that...", "Did you consider...".
        - **If the reasoning focuses too much on an initial finding:** Suggest reflection on **ANCHORING**. Question: "Is it possible that the initial focus on [finding X] has made other findings, like [finding Y], receive less weight than they should?"
        - **If the reasoning seeks to confirm the hypothesis:** Suggest reflection on **CONFIRMATION BIAS**. Question: "When evaluating the data, did you focus more on findings that support '[user hypothesis]'? Did you actively search for data that could *refute* that hypothesis?"
        - **If the case seems like a classic case or recent one:** Suggest reflection on **DISPONIBILIDADE/REPRESENTATIVIDADE**. Question: "This case seems very similar to a classic case of '[user hypothesis]'. Did you consider if this similarity might be causing you to overlook atypical features that suggest a different direction?"
        - **If the conclusion was reached very quickly:** Suggest reflection on **PREMATURE CLOSURE**. Question: "Did you feel confident in your hypothesis right from the start? What steps could be taken to ensure that other viable alternatives were not dismissed too early?"

    3.  **Create the "Devil's Advocate" Challenge (`devils_advocate_challenge`):** Formulate a powerful and general question that forces the user to defend their hypothesis against an alternative or contradictory fact.
        - *Examples:* "Imagine that a senior colleague suggests that the diagnosis is actually [plausible alternative]. What would be your strongest argument to defend your hypothesis against theirs, using only the available data?" OR "What is the one finding in the case that least fits your hypothesis and why?"

    4.  **Suggest a Reflexive Action (`suggested_next_reflective_action`):** Give the user a concrete mental task.
        - *Examples:* "As next step, try to formulate the 'worst possible diagnostic scenario' that is still minimally possible and list what would be necessary to discard it." OR "Try to rewrite the 'Problem Representation' of this case from the perspective of a different specialty."

    **FINAL INSTRUCTIONS:**
    - Use a mentor tone, constructive and encouraging.
    - Your output must be in English and strictly adhere to the `SelfReflectionFeedbackOutput` class format.

    {{ ctx.output_format }}
  """#
}

// -------- Function: DiagnosticTimeout Practice --------
// Input for DiagnosticTimeout
class DiagnosticTimeoutInput {
  case_description string @description("Description of the ongoing clinical case")
  current_working_diagnosis string @description("Current diagnosis the physician is considering")
  time_elapsed_minutes int? @description("Time elapsed since the beginning of the case (optional)")
  complexity_level string? @description("Case complexity level: 'simple', 'moderate', 'complex' (optional)")
}

// Output for DiagnosticTimeout
class DiagnosticTimeoutOutput {
  timeout_recommendation string @description("Specific recommendation for this pause moment")
  alternative_diagnoses_to_consider string[] @description("Alternative diagnoses that should be considered")
  key_questions_to_ask string[] @description("Important questions that should be asked at this moment")
  red_flags_to_check string[] @description("Warning signs that should be verified")
  next_steps_suggested string[] @description("Recommended next steps after the timeout")
  cognitive_checks string[] @description("Cognitive checks to avoid biases")
}

// Function Definition
function GenerateDiagnosticTimeout(input: DiagnosticTimeoutInput) -> DiagnosticTimeoutOutput {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    You are an expert in patient safety and "Diagnostic Timeout" methodology - structured pauses in the diagnostic process to prevent errors and improve quality of care.

    **CASE CONTEXT:**
    Description: {{ input.case_description }}
    Current Working Diagnosis: {{ input.current_working_diagnosis }}
    {% if input.time_elapsed_minutes %}Time Elapsed: {{ input.time_elapsed_minutes }} minutes{% endif %}
    {% if input.complexity_level %}Complexity Level: {{ input.complexity_level }}{% endif %}

    **DIAGNOSTIC TIMEOUT OBJECTIVE:**
    Diagnostic Timeout is a structured pause that aims to:
    - Re-examine assumptions and hypotheses
    - Consider alternative diagnoses
    - Check for cognitive biases
    - Ensure important information hasn't been missed
    - Improve diagnostic safety

    **YOUR TASK:**
    Provide specific guidance for this diagnostic pause moment, following diagnostic timeout best practices.

    **SPECIFIC INSTRUCTIONS:**

    1. **Timeout Recommendation (timeout_recommendation):**
      - Provide a specific and practical recommendation for this case
      - Consider the current diagnosis and possible blind spots
      - Use clear and action-oriented language

    2. **Alternative Diagnoses (alternative_diagnoses_to_consider):**
      - List 3-5 relevant alternative diagnoses
      - Prioritize diagnoses that could be easily missed
      - Include at least one condition with potential severity

    3. **Key Questions (key_questions_to_ask):**
      - List specific questions that should be asked/re-asked
      - Focus on information that could change the diagnosis
      - Include questions about history, physical exam, or context

    4. **Red Flags (red_flags_to_check):**
      - Identify warning signs that should be verified
      - Focus on findings that would indicate urgency or severity
      - Include both clinical and situational signs

    5. **Next Steps (next_steps_suggested):**
      - Suggest concrete actions after the timeout
      - Include additional investigations if appropriate
      - Prioritize patient safety

    6. **Cognitive Checks (cognitive_checks):**
      - List specific cognitive bias checks for this case
      - Focus on biases most likely to affect this scenario
      - Provide actionable verification steps

    **GUIDELINES:**
    - Be specific to the case presented
    - Focus on practical and actionable advice
    - Emphasize patient safety
    - Use evidence-based timeout strategies
    - Provide educational value for continuous improvement

    {{ ctx.output_format }}
  """#
}

// --- Input and Output Classes for SummarizeAndStructureClinicalData ---
class ClinicalDataInput {
  patient_story string @description("Clinical history of the patient, as narrated or recorded.")
  known_findings ClinicalFinding[] @description("List of clinical findings already known or observed.")
  patient_demographics string @description("Relevant demographic information of the patient, e.g., 'Male, 45 years old, no known comorbidities'.")
}

class StructuredSummaryOutput {
  one_sentence_summary string @description("A concise one-sentence summary of the presented data, using descriptive medical terms.") // @assert(non_empty_summary, "this.length() > 0")
  semantic_qualifiers_identified string[] @description("List of key semantic qualifiers observed in the data (e.g., acute, febrile, localized).")
  key_patient_details_abstracted string[] @description("Key patient details, possibly with more formal medical terms (e.g., 'Chest pain' -> 'Thoracic discomfort').")
  suggested_areas_for_further_data_gathering string[] @description("Suggestions of areas where additional information could be useful for the healthcare professional to deepen the investigation.")
}

// --- BAML Function for SummarizeAndStructureClinicalData ---
function SummarizeAndStructureClinicalData(input: ClinicalDataInput) -> StructuredSummaryOutput {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    My approach is analytical, precise and always evidence-based, aimed at empowering clinical reasoning for information organization.

    // Handling Incomplete Data
    If the provided data is insufficient for meaningful analysis of a particular aspect, mention this limitation and suggest the need for data completion as part of 'suggested_areas_for_further_data_gathering'.
    If you don't have sufficient information to comment on a specific point with confidence, it's preferable to declare that the information is not available or that analysis is not possible with the provided data, rather than speculating.

    Analyze the patient's history, known findings and demographic data provided. Your task is strictly organization and identification of points for additional investigation by the professional. DO NOT MAKE DIAGNOSES. DO NOT SUGGEST TREATMENTS.

    Your process:
    1.  **Concise Data Representation:** Create a single sentence summary that captures the essence of the clinical picture presented, using precise and descriptive medical terminology.
    2.  **Semantic Qualifier Identification:** List key semantic qualifiers evident in the data (e.g., acute, chronic, intermittent, febrile, progressive, localized, diffuse).
    3.  **Patient Detail Abstraction:** Identify key patient details and, if appropriate, translate them to more formal or abstract medical terms (e.g., 'severe headache' -> 'intense cephalgia'; 'shortness of breath with exertion' -> 'dyspnea on exertion'). This aims at standardization to facilitate reasoning.
    4.  **Areas for Further Investigation:** Based on the provided information, identify areas where additional data could be crucial or useful for the healthcare professional to refine their diagnosis and management plan. Formulate these suggestions as points for reflection or investigation (e.g., "Consider detailing family history of cardiovascular conditions", "Verify if previous imaging studies are available for comparison", "Investigate recent exposure to infectious agents, if pertinent").

    The goal is to assist the professional in structuring the clinical case, highlighting pertinent information and identifying blind spots or areas that need greater exploration for their own diagnostic and decision process.

    PROVIDED DATA:
    Patient History:
    {{ input.patient_story }}

    Known Findings:
    {% for finding in input.known_findings %}
    - {{ finding.finding_name }}: {{ finding.details if finding.details else "Not detailed" }}{% if finding.onset_duration_pattern %} (Onset/Duration: {{ finding.onset_duration_pattern }}){% endif %}{% if finding.severity_level %} (Severity: {{ finding.severity_level }}){% endif %}
    {% else %}
    No initial findings provided.
    {% endfor %}

    Demographic Data: {{ input.patient_demographics }}

    // ADDITION FOR CoT:
    Before providing the final JSON, please describe in bullet points the steps of your thinking or main observations that led to:
    1. Formulation of the "one_sentence_summary".
    2. Identification of the "semantic_qualifiers_identified".
    3. Choice of the "key_patient_details_abstracted".
    4. Suggestion of the "suggested_areas_for_further_data_gathering".

    Example Reasoning (use this format before JSON):
    - Observations for summary: Patient reports [symptom X] with [duration Y], affecting [location Z]. Demographics indicate [age/sex].
    - Semantic qualifiers noted: [acute], [localized], [febrile].
    - Details abstracted: Transformed '''[patient language]''' into '''[medical term]'''.
    - Points for investigation: Given the mention of [vague symptom], it would be useful to explore [topic A and B].

    {{ ctx.output_format }}
  """#
}

generator baml_client_python {
  output_type "python/pydantic"
  output_dir ".."
  version "0.87.0"
}