// baml_src/clinical_simulation.baml

// --------- ENUMS E CLASSES DE ESTADO DA SESSÃO ---------

enum SNAPPSStep {
  SUMMARIZE
  NARROW
  ANALYZE
  PROBE
  PLAN
  SELECT
}

class SessionState {
  case_context CaseContext
  student_summary string?
  student_ddx string[]?
  student_analysis string?
  student_probe_questions string[]?
  student_management_plan string?
  student_selected_topic string?
  feedback_history string[] @description("A log of all feedback given so far to provide context.")
}

// --------- DATA CLASSES PARA INPUTS E OUTPUTS ---------
class ClinicalFinding {
  finding_name string
  details string?
  onset_duration_pattern string?
  severity_level string?
}

class CaseContext {
  demographics string
  chief_complaint string
  physical_exam string
  vital_signs string
  full_description string
  expected_differentials string[]?
  learning_objectives string[]?
  expert_analysis string?
}

// --- Step 1: Evaluate Summary ---
class EvaluateSummaryInput {
  case_context CaseContext
  student_summary string
}

class SummaryFeedbackOutputModel {
  feedback_strengths string[] @description("Positive aspects of the student's summary.")
  feedback_improvements string[] @description("Specific areas where the summary can be improved.")
  missing_elements string[] @description("Key clinical information that was omitted from the summary.")
  overall_assessment string @description("A brief overall evaluation (e.g., 'Excellent and concise', 'Good start, but lacks key details').")
  next_step_guidance string @description("Guidance on what to focus on for the next step (Narrowing DDx).")
  socratic_questions string[] @description("Questions to make the student reflect on their summary.")
}

// --- Step 2: Analyze Differential Diagnoses ---
class AnalyzeDDxInput {
  session_state SessionState
  student_differential_diagnoses string[]
}

class DdxEvaluation {
  diagnosis string
  plausibility string @description("'Alta', 'Moderada', ou 'Baixa'")
  supporting_findings string[]
  contradicting_findings string[]
}

class DifferentialAnalysisOutputModel {
  ddx_evaluation DdxEvaluation[]
  missing_differentials string[] @description("Important DDx the student may have missed.")
  prioritization_feedback string @description("Feedback on the student's prioritization of their DDx list.")
  socratic_questions string[] @description("Guiding questions about the DDx.")
  next_step_guidance string @description("Guidance for the next step (Analyzing the DDx).")
}

// --- Step 3: Facilitate DDx Analysis ---
class FacilitateDDxAnalysisInput {
  session_state SessionState
  student_analysis string @description("The student's free-text analysis comparing and contrasting the DDx.")
}

class FacilitateDDxAnalysisOutputModel {
  response string @description("A Socratic response that guides the student to deepen their analysis, pointing out strengths and asking probing questions.")
}

// --- Step 4: Answer Probe Questions ---
class AnswerProbeQuestionsInput {
  session_state SessionState
  student_questions string[] @description("The questions the student is asking.")
}

class AnsweredQuestion {
  question string
  answer string
  rationale string
}

class ProbeResponseOutputModel {
  answers_to_questions AnsweredQuestion[]
  additional_considerations string[]
  counter_questions string[] @description("Socratic questions to ask back to the student.")
  knowledge_gaps_identified string[]
  learning_resources string[]
}

// --- Step 5: Evaluate Management Plan ---
class EvaluateManagementPlanInput {
  session_state SessionState
  student_plan string
}

class PlanEvaluationOutputModel {
  plan_strengths string[]
  plan_gaps string[]
  investigation_priorities string[]
  management_considerations string[]
  safety_concerns string[]
  cost_effectiveness_notes string[]
  guidelines_alignment string
  next_step_guidance string
}

// --- Step 6: Provide Session Summary ---
class ProvideSessionSummaryInput {
  session_state SessionState
}

class SessionSummaryOutputModel {
  overall_performance string
  key_strengths string[]
  areas_for_development string[]
  learning_objectives_met string[]
  recommended_study_topics string[]
  metacognitive_insights string[]
  next_cases_suggestions string[]
}

// --------- BAML FUNCTIONS PARA CADA ENDPOINT SNAPPS ---------

// 1. /evaluate-summary-snapps
function EvaluateSummary_SNAPPS(input: EvaluateSummaryInput) -> SummaryFeedbackOutputModel {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    You are a preceptor evaluating a student's case summary (Step 'S' of SNAPPS).
    The goal is to teach them to be concise, accurate, and clinically relevant.

    FULL CASE:
    {{ input.case_context.full_description }}

    STUDENT'S SUMMARY:
    "{{ input.student_summary }}"

    YOUR TASK: Provide structured feedback.
    1.  **Strengths (feedback_strengths):** What did the student do well? (e.g., "Good use of semantic qualifiers", "Correctly identified the main clinical problem").
    2.  **Improvements (feedback_improvements):** What could be better? Be specific. (e.g., "The summary could be more concise", "Try to transform specific details into abstract terms like 'acute coronary syndrome'").
    3.  **Missing Elements (missing_elements):** What crucial information from the case was omitted? (e.g., "You missed mentioning the key risk factors like smoking and hypertension").
    4.  **Overall Assessment (overall_assessment):** A brief, encouraging overall evaluation.
    5.  **Socratic Questions (socratic_questions):** Ask 1-2 questions to make them reflect. (e.g., "What is the single most important finding in this case that must be in the summary?", "How could you phrase this summary to a consultant in under 15 seconds?").
    6.  **Next Step Guidance (next_step_guidance):** Guide them to the next step. (e.g., "Now, based on this summary, what are your top 2-3 differential diagnoses?").

    {{ ctx.output_format }}
  """#
}

// 2. /analyze-differential-diagnoses-snapps
function AnalyzeDifferentialDiagnoses_SNAPPS(input: AnalyzeDDxInput) -> DifferentialAnalysisOutputModel {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    You are a preceptor evaluating a student's differential diagnosis (DDx) list (Step 'N' of SNAPPS).
    The goal is to teach prioritization and clinical reasoning, not just listing possibilities.

    CASE SUMMARY (provided by student in previous step):
    "{{ input.session_state.student_summary }}"

    FULL CASE FOR CONTEXT:
    {{ input.session_state.case_context.full_description }}

    STUDENT'S DDx LIST:
    {% for dx in input.student_differential_diagnoses %}
    - {{ dx }}
    {% endfor %}

    CONTEXT (for your preceptor knowledge):
    {{ input.case_context }}

    YOUR TASK: Provide structured feedback on the student's DDx list.
    1.  **DDx Evaluation (ddx_evaluation):** For each diagnosis the student provided:
        a.  `diagnosis`: The name of the diagnosis.
        b.  `plausibility`: Assess its plausibility as 'Alta', 'Moderada', or 'Baixa' in this specific case.
        c.  `supporting_findings`: Briefly list 1-2 key findings from the case that support it.
        d.  `contradicting_findings`: Briefly list 1-2 findings that argue against it.
    2.  **Missing Differentials (missing_differentials):** List any critical diagnoses they may have missed.
    3.  **Prioritization Feedback (prioritization_feedback):** Comment on the order and relevance of their list. Did they prioritize the most likely or most dangerous conditions?
    4.  **Socratic Questions (socratic_questions):** Ask 1-2 guiding questions. (e.g., "What is the one finding that makes 'X' more likely than 'Y'?", "Is there a 'can't miss' diagnosis you should always consider in this scenario?").
    5.  **Next Step Guidance (next_step_guidance):** Guide them to the next step. (e.g., "Great. Now, pick your top two diagnoses and let's analyze them. How do you differentiate between them based on the case data?").

    {{ ctx.output_format }}
  """#
}

// 3. /facilitate-ddx-analysis-snapps
function FacilitateDDxAnalysis_SNAPPS(input: FacilitateDDxAnalysisInput) -> FacilitateDDxAnalysisOutputModel {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    You are a preceptor facilitating a student's analysis of their DDx (Step 'A' of SNAPPS).
    The goal is to guide them in comparing and contrasting, using evidence from the case.

    CONTEXT:
    The student has provided a summary and a list of differential diagnoses. Now they are analyzing them.
    - Summary: {{ input.session_state.student_summary }}
    - DDx: {{ input.session_state.student_ddx }}
    - Full Case: {{ input.session_state.case_context.full_description }}

    STUDENT'S ANALYSIS:
    "{{ input.student_analysis }}"

    YOUR TASK: Provide a Socratic, guiding response. DO NOT give the answer.
    -   Acknowledge their analysis.
    -   Identify one strength in their reasoning.
    -   Identify one area where their analysis could be deeper.
    -   Ask a specific, probing question that forces them to use case data to differentiate between the top two hypotheses.
    -   Your response should be a single string of text.

    EXAMPLE RESPONSE:
    "That's a good start on the analysis. You correctly pointed out that [student's correct point] supports [Hypothesis A]. However, could you be more specific about how the [specific finding from the case] helps you differentiate between [Hypothesis A] and [Hypothesis B]? What is the pathophysiological reason for that difference?"

    {{ ctx.output_format }}
  """#
}

// 4. /answer-probe-questions-snapps
function AnswerProbeQuestions_SNAPPS(input: AnswerProbeQuestionsInput) -> ProbeResponseOutputModel {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    You are a preceptor answering a student's questions (Step 'P' - Probe of SNAPPS).
    The goal is to answer directly but also stimulate further thinking.

    STUDENT'S QUESTIONS:
    {% for q in input.student_questions %}
    - {{ q }}
    {% endfor %}

    SESSION CONTEXT:
    This is the history of feedback given to the student so far:
    {{ input.session_state.feedback_history | join("\n---\n") }}

    FULL CASE DATA:
    {{ input.session_state.case_context.full_description }}

    YOUR TASK: Provide a structured response.
    1.  **Answers (answers_to_questions):** For each question asked by the student:
        a.  `question`: The student's original question.
        b.  `answer`: Provide a concise, evidence-based answer.
        c.  `rationale`: Briefly explain the reasoning behind your answer.
    2.  **Additional Considerations (additional_considerations):** Based on their questions, what are 1-2 related, important points they haven't considered?
    3.  **Counter Questions (counter_questions):** Ask 1-2 Socratic questions back to them to encourage deeper learning. (e.g., "That's a great question about the ECG. Now, how would your interpretation change if the patient also had hypokalemia?").
    4.  **Knowledge Gaps Identified (knowledge_gaps_identified):** What specific knowledge gaps do their questions reveal?
    5.  **Learning Resources (learning_resources):** Suggest 1-2 specific types of resources to fill those gaps (e.g., "Review the latest AHA guidelines on ACS", "Look up the illness script for pericarditis").

    {{ ctx.output_format }}
  """#
}

// 5. /evaluate-management-plan-snapps
function EvaluateManagementPlan_SNAPPS(input: EvaluateManagementPlanInput) -> PlanEvaluationOutputModel {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    You are a preceptor evaluating a student's management plan (Step 'P' - Plan of SNAPPS).
    The goal is to assess the plan's safety, completeness, and evidence basis.

    CONTEXT:
    The student has analyzed the case and is now proposing a plan.
    This is the history of feedback given to the student so far:
    {{ input.session_state.feedback_history | join("\n---\n") }}

    STUDENT'S PLAN:
    "{{ input.student_plan }}"
    
    FULL CASE DATA:
    {{ input.session_state.case_context.full_description }}

    YOUR TASK: Provide structured feedback on the plan.
    1.  **Strengths (plan_strengths):** What parts of the plan are appropriate and well-justified?
    2.  **Gaps (plan_gaps):** What is missing from the plan (e.g., specific tests, consultations, patient education)?
    3.  **Priorities (investigation_priorities):** Are the diagnostic/investigative steps correctly prioritized? What should be done first?
    4.  **Management (management_considerations):** Are the therapeutic interventions appropriate? Are doses correct?
    5.  **Safety (safety_concerns):** Are there any safety issues with the proposed plan (e.g., drug interactions, contraindications)?
    6.  **Cost-Effectiveness (cost_effectiveness_notes):** Briefly comment on whether the plan is cost-effective.
    7.  **Guidelines (guidelines_alignment):** How does the plan align with current clinical guidelines for the most likely diagnosis?
    8.  **Next Step Guidance (next_step_guidance):** Guide them to the final step. (e.g., "Good plan. Finally, reflecting on this entire case, what is one thing you learned or would do differently next time?").

    {{ ctx.output_format }}

    // In the 'disclaimer' field, use EXACTLY: "Este feedback é para fins educacionais. A implementação de qualquer plano de manejo é de responsabilidade exclusiva do profissional de saúde qualificado."
  """#
}

// 6. /provide-session-summary-snapps
function ProvideSessionSummary_SNAPPS(input: ProvideSessionSummaryInput) -> SessionSummaryOutputModel {
  client DrCorvusLLM
  prompt #"""
    {{ GetProfessionalIntroduction() }}
    You are a preceptor providing a final summary and feedback on a completed SNAPPS session (Step 'S' - Select of SNAPPS).
    The goal is to consolidate learning and encourage self-directed study.

    FULL CASE CONTEXT:
    {{ input.session_state.case_context.full_description }}
    
    SESSION HISTORY:
    {{ input.session_state.feedback_history | join("\n---\n") }}
    
    STUDENT'S SELECTED LEARNING TOPIC (if provided):
    "{{ input.session_state.student_selected_topic if input.session_state.student_selected_topic else "No specific topic selected" }}"

    YOUR TASK: Provide a comprehensive session summary.
    1.  **Overall Performance (overall_performance):** Give a brief, encouraging summary of their work throughout the simulation.
    2.  **Key Strengths (key_strengths):** List 2-3 specific skills the student demonstrated well (e.g., "Excellent initial summary", "Good reasoning in differentiating X from Y").
    3.  **Areas for Development (areas_for_development):** List 2-3 specific skills to focus on for improvement (e.g., "Practice widening the initial DDx", "Focus on asking more probing questions").
    4.  **Learning Objectives Met (learning_objectives_met):** Comment on how the session addressed key learning objectives.
    5.  **Recommended Study Topics (recommended_study_topics):** In addition to the student's selected topic, suggest 1-2 other relevant topics for study.
    6.  **Metacognitive Insights (metacognitive_insights):** Offer one insight about their reasoning process. (e.g., "It seems you may have anchored on the initial finding of X. Remember to always re-evaluate when new data arrives.").
    7.  **Next Cases Suggestions (next_cases_suggestions):** Suggest 1-2 other types of cases that would be good next steps for them.

    {{ ctx.output_format }}
  """#
}