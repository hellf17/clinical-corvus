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
  // The complete clinical reasoning process with enhanced formatting and section highlighting
  professional_detailed_reasoning_cot string @description("The complete 6-step clinical reasoning process with clear markdown formatting and section dividers.")
  // Objective clinical summary with key actionable information
  clinical_summary string @description("Concise, objective summary of critical findings, top differential diagnoses, and immediate next steps for clinical decision-making.")
  // Critical results requiring immediate discussion
  important_results_to_discuss_with_doctor string[] @description("Key findings that warrant immediate medical attention.")
}

// --- LLM Function Definition for Lab Insights ---
function GenerateDrCorvusInsights(input: LabAnalysisInput) -> LabInsightsOutput {
  client HighPriorityClient
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    {{ GetProfessionalGuidanceCommunicationRules() }}

    If the provided data is insufficient for meaningful analysis, explicitly mention this limitation and suggest the need for data completion.

    {% if input.specific_user_query != null and input.specific_user_query != "" %}
    SPECIFIC QUESTION: "{{ input.specific_user_query }}" - Address this throughout your analysis.
    {% endif %}

    {% if input.patient_context != null and input.patient_context != "" %}
    PATIENT CONTEXT: {{ input.patient_context }}
    {% endif %}

    **DETAILED CLINICAL REASONING:**
    Format your reasoning with clear markdown sections using horizontal dividers (---) between steps for enhanced readability:

    **## 1. ABNORMAL FINDINGS IDENTIFIED**
    List values outside reference ranges with exact values, units, references, and severity assessment (mild/moderate/severe/critical).
    
    ---
    **## 2. RELEVANT NORMAL VALUES**
    Note normal results that help exclude differentials or provide important clinical context (pertinent negatives).
    
    ---
    **## 3. CLINICAL PATTERNS & CORRELATIONS**
    Describe pathophysiological relationships and patterns connecting the abnormal findings.
    
    ---
    **## 4. PATHOPHYSIOLOGICAL MECHANISMS**
    Explain underlying mechanisms and organ system involvement based on the observed patterns.
    
    ---
    **## 5. DIFFERENTIAL DIAGNOSES**
    List probable diagnoses hierarchically (High/Moderate/Low probability) with clinical justification.
    
    ---
    **## 6. RECOMMENDED NEXT STEPS**
    Suggest investigations and interventions with clinical rationale and urgency level.

    **CLINICAL SUMMARY:**
    After the detailed reasoning, provide a concise objective summary (2-3 paragraphs max) covering:
    - Most critical abnormal findings requiring immediate attention
    - Top 2-3 differential diagnoses with likelihood
    - Immediate next steps with urgency level
    - Any red flags or time-sensitive issues

    // Final instruction for output format
    {{ ctx.output_format }}

    // Input data for analysis 
    Please analyze the following laboratory results.

    Laboratory Results:
    {% for lr in input.lab_results %}
    - Test: {{ lr.test_name }}, Value: {{ lr.value }}{% if lr.unit %} {{ lr.unit }}{% endif %}{% if lr.reference_range_low and lr.reference_range_high %}, Ref: {{ lr.reference_range_low }} - {{ lr.reference_range_high }}{% endif %}{% if lr.interpretation_flag %}, Flag: {{ lr.interpretation_flag }}{% endif %}{% if lr.notes %}, Notes: {{ lr.notes }}{% endif %}
    {% endfor %}
  """#
}

// -------- Function: ExpandDifferentialDiagnosis (DifferentialDiagnosis_Builder_UsingMnemonicsOrAnatomy) --------
// --- Refined Classes ---

class ExpandDifferentialDiagnosisInput {
  presenting_complaint string @description("Main complaint and the patient’s subjective symptoms.")
  clinical_signs string? @description("Objective clinical signs and physical exam findings.")
  patient_demographics string? @description("Relevant context: age, sex, comorbidities, risk factors.")
  user_initial_ddx_list string[] @description("The user's initial list of differential diagnoses.")
}

enum SuspicionLevel {
  HIGH @description("High clinical suspicion, requires immediate action.")
  MODERATE @description("Moderate suspicion, requires prioritized investigation.")
  LOW @description("Low suspicion, but should be monitored or actively ruled out.")
}

enum DiagnosisCategory {
  RED_FLAG @description("Critical condition that must not be missed.")
  MOST_LIKELY @description("Common and highly probable diagnosis.")
  SYSTEMATIC_EXPANSION @description("Diagnosis considered through a systematic framework to ensure breadth.")
}

class ExpandedDiagnosis {
  diagnosis_name string
  rationale string @description("Concise rationale connecting the patient's data to this hypothesis.")
  suspicion_level SuspicionLevel
  category DiagnosisCategory
}

class ExpandedDdxOutput {
  applied_approach_description string @description("Description of the hierarchical reasoning process used.")
  suggested_diagnoses ExpandedDiagnosis[]
}


// --- Restructured BAML Function ---

function ExpandDifferentialDiagnosis(input: ExpandDifferentialDiagnosisInput) -> ExpandedDdxOutput {
  client DrCorvusLLM
  prompt #"""
    You are Dr. Corvus, a senior physician and expert in clinical reasoning. Your task is to intelligently expand a differential diagnosis (Ddx) list in a hierarchical and clinically safe manner.

    **GUIDING PHILOSOPHY:** An expert's Ddx is a tool for action. It prioritizes danger and probability. The goal is not to list everything but to create a mental map for investigation.

    **PROVIDED CLINICAL DATA:**
    - Main Complaint and Symptoms: {{ input.presenting_complaint }}
    - Objective Clinical Signs: {{ input.clinical_signs if input.clinical_signs else "No objective signs provided." }}
    - Demographics and Context: {{ input.patient_demographics if input.patient_demographics else "No context provided." }}
    - User's Initial Ddx: {{ input.user_initial_ddx_list | join(", ") }}

    **STRUCTURED REASONING PROCESS (3 LAYERS):**

    **LAYER 1: CRITICAL CONDITIONS (RED FLAGS)**
    First, always consider life- or integrity-threatening conditions, even if less likely.
    - Based on the main complaint (e.g., "chest pain", "sudden headache"), list 2–3 diagnoses that “must not be missed.”
    - For each, assign a **Suspicion Level** (High, Moderate, Low) based on the patient data.
    *Calibration Example:* For "headache", Subarachnoid Hemorrhage is a Red Flag. If the patient describes it as "the worst headache of their life", suspicion is HIGH. If the headache is chronic and without warning signs, suspicion is LOW, but the condition is still listed as a Red Flag to be ruled out.

    **LAYER 2: MOST LIKELY DIAGNOSES (THE “WORKHORSES”)**
    Based on epidemiology and the full set of patient data, list 3–4 of the most common causes.
    - Use the **Anatomical Approach** for localized complaints (e.g., abdominal pain -> which organs are in the lower right quadrant?).
    - Use the **Pathophysiological Approach** for systemic complaints (e.g., dyspnea -> cardiac, pulmonary, or hematologic cause?).
    - The rationale here should be about probability. E.g., “For a young patient with these symptoms, this is the most common cause.”

    **LAYER 3: SYSTEMATIC EXPANSION (THE COGNITIVE SAFETY NET)**
    To avoid premature closure, apply a systematic framework to uncover less obvious diagnoses. Choose and justify the most appropriate framework.
    - For general complaints, **VINDICATE** (Vascular, Inflammatory, Neoplastic, Degenerative/Drugs, Idiopathic, Congenital, Autoimmune, Traumatic, Endocrine) is a good option.
    - For specific neurological complaints, other approaches may be more appropriate.
    - **Instruction:** Select 1–2 categories from the framework that are most relevant to the case and suggest 1 diagnosis for each. Do not blindly apply the entire mnemonic.
    *Example:* For chronic joint pain in a young patient, “Have you considered Autoimmune causes (A from VINDICATE), such as Lupus, or Inflammatory causes (I), such as reactive arthritis?”

    **OUTPUT FORMATTING:**

    1.  **`applied_approach_description`**: Describe your 3-layered approach. E.g., “The analysis was structured in a risk-based hierarchy: first, critical conditions (Red Flags) were considered; then, the most probable causes for the patient’s profile; and finally, a systematic expansion using the VINDICATE framework to ensure a broad Ddx.”
    2.  **`suggested_diagnoses`**: Build the final list combining the results of all three layers. Use the structure of the `ExpandedDiagnosis` class for each item.

    **FINAL INSTRUCTIONS:**
    - The quality of your hierarchical reasoning is more important than the quantity of diagnoses.
    - Ignore the user’s initial Ddx if it’s of low quality, but try to incorporate it into your structure if relevant.
    - Be didactic in your description of the approach.

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
    4.  **Red Flags:** Questions to actively search for signs/symptoms indicating a serious condition and requiring immediate escalation.

    **INSTRUCTIONS:**
    - Be comprehensive, but clinically relevant. Avoid generic questions that do not apply to the context.
    - The goal is to be a safety and efficiency checklist for the doctor, not an exercise in prioritization.
    - You MUST provide an "overall_rationale" field that explains your questioning strategy for this specific case.
    - All fields in the ClinicalWorkflowQuestionsOutput class are required.

    **DATA PROVIDED:**
    Chief Complaint: {{ input.chief_complaint }}
    Initial Findings:
    {% for finding in input.initial_findings %}
    - {{ finding.finding_name }}: {{ finding.details if finding.details else "Not detailed" }}
    {% endfor %}
    Demographics: {{ input.patient_demographics }}

    **OUTPUT FORMAT (JSON):**
    Provide the output in the format of the 'ClinicalWorkflowQuestionsOutput' class.
    
    Your response must include ALL of the following fields:
    - question_categories: Array of QuestionCategory objects with category_name, questions (array of strings), and category_rationale
    - red_flag_questions: Array of strings with critical questions to investigate serious conditions
    - overall_rationale: A brief explanation of your questioning strategy for this case
    
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
  case_summary_by_user string? @description("Clinical case summary provided by the healthcare professional for custom scenarios.")
  case_vignette_id string? @description("The identifier for a pre-defined case vignette.")
  user_identified_biases string[] @description("The cognitive biases identified by the user.")
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
    {% if input.case_summary_by_user %}
    Case Summary: {{ input.case_summary_by_user }}
    {% elif input.case_vignette_id %}
    Case Vignette ID: {{ input.case_vignette_id }}
    // Note to LLM: The full vignette text corresponding to this ID is provided in the context.
    // You should analyze the vignette as if it were the case summary.
    {% endif %}
    User Identified Biases: {{ input.user_identified_biases | join(", ") }}

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
    - CRITICAL: Ensure valid JSON syntax with proper commas between all fields.

    PossibleCognitiveBias
    ----
    - ANCHORING: Excessive fixation on initial information.
    - CONFIRMATION_BIAS: Seeking or interpreting evidence in a way that confirms pre-existing beliefs.
    - PREMATURE_CLOSURE: Accepting a diagnosis before it is fully verified.
    - AVAILABILITY_HEURISTIC: Over-estimating the probability of diagnoses that come to mind easily.
    - REPRESENTATIVENESS_HEURISTIC: Judging probability based on similarity to a prototype, ignoring prevalence.

    Answer in JSON using this schema:
    {
      // A neutral description of the reasoning pattern detected in the user's input.
      identified_reasoning_pattern: string,
      // A list of reflection points on possible cognitive biases.
      bias_reflection_points: [
        {
          // The type of cognitive bias to be considered.
          bias_type: PossibleCognitiveBias,
          // A socratic question to help the user reflect on this specific bias in the context of the case.
          reflection_question: string,
        }
      ],
      // A challenging and general question to test the robustness of the user's conclusion.
      devils_advocate_challenge: string,
      // A suggestion of a mental exercise or action for the user to follow.
      suggested_next_reflective_action: string,
    }
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

// --- New Matrix-Based Hypothesis Comparison Classes and Function ---
enum HypothesisFindingEvaluation {
  SUPPORTS @description("The finding supports this hypothesis")
  NEUTRAL @description("The finding is neutral for this hypothesis")
  REFUTES @description("The finding refutes this hypothesis")
}

class HypothesisFindingAnalysis {
  finding_name string @description("Name of the clinical finding")
  hypothesis_name string @description("Name of the hypothesis being evaluated")
  student_evaluation HypothesisFindingEvaluation @description("Student's evaluation of how the finding relates to the hypothesis")
  student_rationale string? @description("Optional rationale for the student's evaluation")
}

class ExpertHypothesisFindingAnalysis {
  finding_name string @description("Name of the clinical finding")
  hypothesis_name string @description("Name of the hypothesis being evaluated")
  expert_evaluation HypothesisFindingEvaluation @description("Expert's evaluation of how the finding relates to the hypothesis")
  expert_rationale string @description("Expert's rationale for the evaluation")
}

class CompareContrastMatrixInput {
  scenario CaseScenarioInput @description("The case scenario for analysis")
  student_matrix_analysis HypothesisFindingAnalysis[] @description("Student's matrix analysis of findings vs hypotheses")
  student_chosen_discriminator string @description("The finding the student selected as the key discriminator")
}

class MatrixFeedbackOutput {
  overall_matrix_feedback string @description("General feedback on the student's matrix analysis")
  discriminator_feedback string @description("Feedback on the student's choice of key discriminator")
  expert_matrix_analysis ExpertHypothesisFindingAnalysis[] @description("Expert's matrix analysis for comparison")
  expert_recommended_discriminator string @description("Expert's recommended key discriminator")
  expert_discriminator_rationale string @description("Rationale for the expert's discriminator choice")
  learning_focus_suggestions string[] @description("Specific learning topics the student should focus on")
  matrix_accuracy_score float? @description("Overall accuracy score for the student's matrix (0-1)")
}

function ProvideMatrixFeedback(input: CompareContrastMatrixInput) -> MatrixFeedbackOutput {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    You are Dr. Corvus, an experienced clinical reasoning preceptor. The student has completed a "Findings vs. Hypotheses" matrix exercise where each clinical finding was classified as "Supports", "Neutral", or "Refutes" for each diagnostic hypothesis.

    **CLINICAL SCENARIO:**
    Vignette: {{ input.scenario.case_vignette }}
    
    Key Findings:
    {% for finding in input.scenario.initial_findings %}
    - {{ finding.finding_name }}{% if finding.details %}: {{ finding.details }}{% endif %}{% if finding.onset_duration_pattern %} ({{ finding.onset_duration_pattern }}){% endif %}{% if finding.severity_level %}, {{ finding.severity_level }}{% endif %}
    {% endfor %}
    
    Hypotheses to Analyze: {{ input.scenario.plausible_hypotheses | join(", ") }}

    **STUDENT'S MATRIX ANALYSIS:**
    {% for analysis in input.student_matrix_analysis %}
    - Finding "{{ analysis.finding_name }}" was classified as "{{ analysis.student_evaluation }}" for hypothesis "{{ analysis.hypothesis_name }}"{% if analysis.student_rationale %} (Rationale: {{ analysis.student_rationale }}){% endif %}
    {% endfor %}

    **STUDENT'S CHOSEN KEY DISCRIMINATOR:** "{{ input.student_chosen_discriminator }}"

    **YOUR TASK AS PRECEPTOR:**

    1. **Evaluate Overall Matrix (overall_matrix_feedback):** Provide feedback on the overall accuracy of the student's classifications. Highlight significant correct classifications and identify significant errors. Be specific about which relationships were well-identified and which were poorly evaluated.

    2. **Evaluate Discriminator Choice (discriminator_feedback):** Was the student's choice ideal? Is there a stronger discriminator? Explain why the choice was good or how it could be improved.

    3. **Generate Expert Matrix (expert_matrix_analysis):** Provide your own classification for each cell of the matrix, including a clear rationale for each evaluation. Focus on the most important relationships for differential diagnosis.

    4. **Recommend Expert Discriminator (expert_recommended_discriminator and expert_discriminator_rationale):** Which finding would you consider the most powerful discriminator? Explain why this finding is superior for differentiating between the hypotheses.

    5. **Suggest Learning Focus (learning_focus_suggestions):** Based on patterns of errors and successes, suggest 2-3 specific topics for study (e.g., "Review urinary symptoms of cystitis", "Study the pathophysiology of referred pain").

    6. **Calculate Accuracy Score (matrix_accuracy_score):** Assign an accuracy score from 0.0 to 1.0 based on the overall accuracy of the student's matrix.

    **PEDAGOGICAL GUIDELINES:**
    - Maintain a constructive and encouraging tone.
    - Be specific in your examples.
    - Focus on the thought PROCESS, not just the outcome.
    - Explain the reasoning behind correct classifications.
    - Use didactic language appropriate for students.

    {{ ctx.output_format }}
  """#
}

generator baml_client_python {
  output_type "python/pydantic"
  output_dir ".."
  version "0.87.0"
}