from baml_client import b
from baml_client.types import (
    LabAnalysisInput as BAMLLabAnalysisInput,
    ClinicalDataInput as BAMLClinicalDataInput,
    CognitiveBiasInput as BAMLCognitiveBiasInput,
    DdxQuestioningInput as BAMLDdxQuestioningInput,
    ExpandDifferentialDiagnosisInput as BAMLExpandDifferentialDiagnosisInput,
    EvidenceAppraisalInput as BAMLEvidenceAppraisalInput,
    CompareContrastExerciseInput as BAMLCompareContrastExerciseInput,
    PatientFollowUpInput as BAMLPatientFollowUpInput,
    ClinicalScenarioInput as BAMLClinicalScenarioInput,
    IllnessScriptInput as BAMLIllnessScriptInput,
    DiagnosticTimeoutInput as BAMLDiagnosticTimeoutInput,
    UserRole,
    LabTestResult as BAMLLabTestResult,
    ClinicalFinding as BAMLClinicalFinding,
    PICOQuestion as BAMLPICOQuestion,
    CaseScenarioInput as BAMLCaseScenarioInput,
    StudentHypothesisAnalysis as BAMLStudentHypothesisAnalysis,
    DetectedCognitiveBias as BAMLDetectedCognitiveBias
)

# Import SNAPPS-related types from clinical_simulation module
from baml_client.types import (
    AnalyzeDifferentialDiagnosesSNAPPSInput as BAMLAnalyzeDifferentialDiagnosesSNAPPSInput,




)

# Define missing BAML types that aren't generated properly
class BAMLCognitiveBiasScenarioInput:
    def __init__(self, scenario_description: str, additional_context: str = None):
        self.scenario_description = scenario_description
        self.additional_context = additional_context
import json
import logging
import httpx
from enum import Enum
import traceback

from fastapi import APIRouter, HTTPException, Form, UploadFile, File
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union

from services.translator_service import translate

logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(prefix="/clinical-simulation", tags=["Clinical Simulation"])

# Utility function for setting up Dr. Corvus client registry
def setup_corvus_client_registry():
    """
    Sets up the client registry for Dr. Corvus BAML functions.
    Returns None if setup fails, allowing fallback to default configuration.
    """
    try:
        # This is a placeholder for client registry setup
        # The actual implementation depends on your BAML client configuration
        # For now, return None to use default configuration
        return None
    except Exception as e:
        logger.warning(f"Could not setup Dr. Corvus client registry: {str(e)}")
        return None

# -------- Endpoints for Clinical Reasoning Training Functions --------

# --- AnalyzeDifferentialDiagnoses_SNAPPS ---

class AnalyzeDifferentialDiagnosesSNAPPSInputModel(BaseModel):
    case_summary: str
    student_differential_diagnoses: List[str]

class AnalyzeDifferentialDiagnosesSNAPPSOutputModel(BaseModel):
    response: str # The BAML function returns a single string

@router.post(
    "/analyze-differential-diagnoses-snapps",
    response_model=AnalyzeDifferentialDiagnosesSNAPPSOutputModel,
    summary="Analyze Differential Diagnoses (SNAPPS Framework)",
    description="Guides a student through analyzing differential diagnoses using the SNAPPS framework, with Dr. Corvus providing Socratic feedback. (BAML: AnalyzeDifferentialDiagnoses_SNAPPS)"
)
async def analyze_differential_diagnoses_snapps(payload: AnalyzeDifferentialDiagnosesSNAPPSInputModel):
    try:
        baml_input = BAMLAnalyzeDifferentialDiagnosesSNAPPSInput(
            case_summary=payload.case_summary,
            student_differential_diagnoses=payload.student_differential_diagnoses
        )
        # The BAML function directly returns a string
        response_str = await b.AnalyzeDifferentialDiagnoses_SNAPPS(baml_input)
        translated_response = await translate(response_str, target_lang="PT")
        return AnalyzeDifferentialDiagnosesSNAPPSOutputModel(response=translated_response)
    except Exception as e:
        # logger.error(f"Error in AnalyzeDifferentialDiagnoses_SNAPPS: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (AnalyzeDifferentialDiagnoses_SNAPPS): {str(e)}")

# --- Answer Probe Questions SNAPPS ---
class AnswerProbeQuestionsSNAPPSInputModel(BaseModel):
    questions: List[str] = Field(..., description="Student's probe questions")
    student_answers: List[str] = Field(..., description="Student's answers to probe questions")

class AnswerProbeQuestionsSNAPPSOutputModel(BaseModel):
    response: str = Field(..., description="Dr. Corvus responses to probe questions")

@router.post(
    "/answer-probe-questions-snapps",
    response_model=AnswerProbeQuestionsSNAPPSOutputModel,
    summary="Answer Probe Questions (SNAPPS Step 4)",
    description="Provides Socratic responses to student probe questions using BAML clinical reasoning functions."
)
async def answer_probe_questions_snapps(payload: AnswerProbeQuestionsSNAPPSInputModel):
    try:
        # Combine questions and answers into a reasoning narrative for BAML analysis
        reasoning_narrative = "Student's questions:\n" + "\n".join([f"- {q}" for q in payload.questions])
        reasoning_narrative += "\n\nStudent's reflections:\n" + "\n".join([f"- {a}" for a in payload.student_answers])
        
        # Use ClinicalReasoningPath_CritiqueAndCompare for Socratic guidance
        baml_input = BAMLClinicalReasoningPathCritiqueInput(
            case_description="Context of SNAPPS question",
            student_reasoning_narrative=reasoning_narrative,
            student_final_diagnosis_or_plan="In development through structured questioning"
        )
        
        # Call BAML function for reasoning critique
        baml_response = await b.ClinicalReasoningPath_CritiqueAndCompare(baml_input)
        
        # Format as Socratic guidance
        # Build lists separately to avoid chr() in f-strings
        points_list = [f"• {point}" for point in baml_response.suggested_learning_points] if baml_response.suggested_learning_points else ["• Continue questionando de forma sistemática"]
        
        socratic_response = f"""Dr. Corvus: Great job! Let's explore each one using the Socratic method.

🤔 **SNAPPS Step 4: Probe - Structured Questioning**

**Strengths identified in your reasoning:**
{'; '.join(baml_response.strengths_observed) if baml_response.strengths_observed else 'Continue developing your questioning skills.'}

**Areas for development:**
{'; '.join(baml_response.areas_for_development) if baml_response.areas_for_development else 'Your questioning is well directed.'}

**Socratic guidance (based on your analysis):**
{baml_response.comparison_with_expert_approach}

**Learning points for reflection:**
{chr(10).join(points_list)}

**Next SNAPPS step (Step 5: Plan):**
Based on these reflections, what would be your initial management plan for this patient?

---
*SNAPPS Step 4: Probe - Developing critical thinking through structured questioning*"""

        return AnswerProbeQuestionsSNAPPSOutputModel(response=socratic_response)
        
    except Exception as e:
        logger.error(f"Error in answer_probe_questions_snapps with BAML: {str(e)}", exc_info=True)
        # Fallback response
        questions_text = "\n".join([f"• {q}" for q in payload.questions]) if payload.questions else "No specific questions provided"
        
        feedback = f"""Dr. Corvus: Great job! Let's explore using the Socratic method.

**Your questions:**
{questions_text}

**Socratic guidance:** Instead of direct answers, reflect: How would you apply pre-test probability principles? What characteristics influence your hypotheses?

**Next SNAPPS step (Step 5: Plan):**
Based on these reflections, what would be your initial management plan for this patient?

*[Error BAML: {str(e)}]*"""

        return AnswerProbeQuestionsSNAPPSOutputModel(response=feedback)

# --- Evaluate Management Plan SNAPPS ---
class EvaluateManagementPlanSNAPPSInputModel(BaseModel):
    management_plan: str = Field(..., description="Student's proposed management plan")
    case_context: str = Field(..., description="Case context")

class EvaluateManagementPlanSNAPPSOutputModel(BaseModel):
    response: str = Field(..., description="Dr. Corvus evaluation of management plan")

@router.post(
    "/evaluate-management-plan-snapps",
    response_model=EvaluateManagementPlanSNAPPSOutputModel,
    summary="Evaluate Management Plan (SNAPPS Step 5)",
    description="Evaluates student's management plan using BAML diagnostic timeout and clinical reasoning functions."
)
async def evaluate_management_plan_snapps(payload: EvaluateManagementPlanSNAPPSInputModel):
    try:
        # Use DiagnosticTimeout BAML function to evaluate the management plan
        # This provides structured evaluation of diagnostic and therapeutic decisions
        baml_input = BAMLDiagnosticTimeoutInput(
            case_description=payload.case_context,
            current_working_diagnosis=payload.management_plan,
            time_elapsed_minutes=None,  # Not relevant for plan evaluation
            complexity_level="moderate"  # Default for educational cases
        )
        
        # Call BAML function for diagnostic timeout guidance
        baml_response = await b.GenerateDiagnosticTimeout(baml_input)
        
        # Format response for SNAPPS plan evaluation
        # Build lists separately to avoid chr() in f-strings
        dx_list = [f"• {dx}" for dx in baml_response.alternative_diagnoses_to_consider] if baml_response.alternative_diagnoses_to_consider else ["• Seu plano considera as principais possibilidades diagnósticas"]
        questions_list = [f"• {q}" for q in baml_response.key_questions_to_ask] if baml_response.key_questions_to_ask else ["• Continue refinando os detalhes"]
        flags_list = [f"• {flag}" for flag in baml_response.red_flags_to_check] if baml_response.red_flags_to_check else ["• Mantenha vigilância clínica apropriada"]
        steps_list = [f"• {step}" for step in baml_response.next_steps_suggested] if baml_response.next_steps_suggested else ["• Prossiga com implementação cuidadosa"]
        checks_list = [f"• {check}" for check in baml_response.cognitive_checks] if baml_response.cognitive_checks else ["• Continue aplicando pensamento crítico"]
        
        plan_evaluation = f"""Dr. Corvus: Vamos analisar seu plano de manejo de forma estruturada!

📋 **SNAPPS Step 5: Plan - Avaliação Sistemática**

**Your proposed management plan:** "{payload.management_plan}"

🎯 **Safety and completeness analysis:**
{baml_response.timeout_recommendation}

🔍 **Additional diagnostic considerations:**
{chr(10).join(dx_list)}

❓ **Key questions to ask:**
{chr(10).join(questions_list)}

🚨 **Red flags to check:**
{chr(10).join(flags_list)}

📋 **Next steps recommended:**
{chr(10).join(steps_list)}

🧠 **Cognitive checks:**
{chr(10).join(checks_list)}

**Next SNAPPS step (Step 6: Select):**
Based on these reflections, what would be your initial management plan for this patient?

---
*SNAPPS Step 5: Plan - Developing competence in clinical decision-making based on evidence*"""

        return EvaluateManagementPlanSNAPPSOutputModel(response=plan_evaluation)
        
    except Exception as e:
        logger.error(f"Error in evaluate_management_plan_snapps with BAML: {str(e)}", exc_info=True)
        # Fallback response
        feedback = f"""Dr. Corvus: Let's analyze your management plan systematically.

**Your management plan:** "{payload.management_plan}"

**Safety and completeness analysis:**
- ✅ Urgent/emergency questions identified?
- ✅ Differential diagnoses being investigated?
- ✅ Plan is safe and appropriate?

**Next SNAPPS step (Step 6: Select):**
Based on these reflections, what would be your initial management plan for this patient?

*[Error BAML: {str(e)}]*"""

        return EvaluateManagementPlanSNAPPSOutputModel(response=feedback)

# --- Evaluate Summary SNAPPS ---
class EvaluateSummarySNAPPSInputModel(BaseModel):
    summary: str = Field(..., description="Student's case summary")
    case_context: str = Field(..., description="Original case context")

class EvaluateSummarySNAPPSOutputModel(BaseModel):
    response: str = Field(..., description="Dr. Corvus feedback on the summary")

@router.post(
    "/evaluate-summary-snapps",
    response_model=EvaluateSummarySNAPPSOutputModel,
    summary="Evaluate Student Summary (SNAPPS Step 1)",
    description="Evaluates a student's case summary in the SNAPPS framework and provides feedback using BAML."
)
async def evaluate_summary_snapps(payload: EvaluateSummarySNAPPSInputModel):
    try:
        # Use the existing ProvideFeedbackOnProblemRepresentation BAML function
        # for educational feedback on case summaries
        baml_input = BAMLProblemRepresentationInput(
            full_patient_narrative=payload.case_context,
            student_problem_representation=payload.summary,
            student_semantic_qualifiers=[]  # For summary evaluation, focus on the narrative
        )
        
        # Call BAML function
        baml_response = await b.ProvideFeedbackOnProblemRepresentation(baml_input)
        
        # Format response in SNAPPS context
        suggestions_section = ""
        if baml_response.suggested_summary_modifications:
            suggestions_section = f"**Sugestões de melhoria:**\n{baml_response.suggested_summary_modifications}\n\n"
        
        snapps_feedback = f"""Dr. Corvus: Obrigado por compartilhar seu resumo do caso! 

📋 **Análise SNAPPS da sua apresentação (Step 1: Summarize):**

**Feedback sobre seu resumo:**
{baml_response.feedback_on_summary}

**Avaliação geral:**
{baml_response.overall_assessment}

{suggestions_section}**Próximo passo SNAPPS (Step 2: Narrow):**
Agora vamos trabalhar suas hipóteses diagnósticas. Quais são suas 3 principais suspeitas para este caso?

---
*Framework SNAPPS para desenvolvimento de habilidades de apresentação clínica estruturada.*"""

        return EvaluateSummarySNAPPSOutputModel(response=snapps_feedback)
        
    except Exception as e:
        logger.error(f"Error in evaluate_summary_snapps with BAML: {str(e)}", exc_info=True)
        # Fallback to educational response
        feedback = f"""Dr. Corvus: Obrigado por compartilhar seu resumo do caso! 

**Seu resumo:** "{payload.summary}"

**Feedback estruturado:**
- **Clareza:** Sua apresentação precisa de análise mais detalhada
- **Completude:** Considere incluir dados demográficos relevantes, queixa principal, histórico relevante e achados objetivos
- **Priorização:** Destaque os achados mais significativos que orientam seu raciocínio

**Próximo passo:** Agora vamos estreitar suas hipóteses diagnósticas. Quais são suas 3 principais hipóteses para este caso?

*Esta é uma simulação educacional usando o framework SNAPPS. [Erro BAML: {str(e)}]*"""

        return EvaluateSummarySNAPPSOutputModel(response=feedback)

# --- Facilitate DDx Analysis SNAPPS ---
class FacilitateDDxAnalysisSNAPPSInputModel(BaseModel):
    case_context: str = Field(..., description="Case context")
    differential_list: List[str] = Field(..., description="Student's differential diagnosis list")

class FacilitateDDxAnalysisSNAPPSOutputModel(BaseModel):
    response: str = Field(..., description="Dr. Corvus guidance on differential analysis")

@router.post(
    "/facilitate-ddx-analysis-snapps",
    response_model=FacilitateDDxAnalysisSNAPPSOutputModel,
    summary="Facilitate Differential Diagnosis Analysis (SNAPPS Step 2-3)",
    description="Guides students through narrowing and analyzing their differential diagnoses using BAML AnalyzeDifferentialDiagnoses_SNAPPS."
)
async def facilitate_ddx_analysis_snapps(payload: FacilitateDDxAnalysisSNAPPSInputModel):
    try:
        # Use the dedicated BAML function for SNAPPS DDx analysis
        baml_input = BAMLAnalyzeDifferentialDiagnosesSNAPPSInput(
            case_summary=payload.case_context,
            student_differential_diagnoses=payload.differential_list
        )
        
        # Call the specialized BAML SNAPPS function
        baml_response = await b.AnalyzeDifferentialDiagnoses_SNAPPS(baml_input)
        
        # Format with SNAPPS framework context
        snapps_response = f"""Dr. Corvus: Great job! Let's analyze your hypotheses systematically.

🎯 **SNAPPS Steps 2-3: Narrow & Analyze**

{baml_response}

**Next SNAPPS step (Step 4: Probe):**
What specific questions do you have about this case? What intrigues or concerns you in the investigation?

---
*Framework SNAPPS - developing structured clinical reasoning*"""

        return FacilitateDDxAnalysisSNAPPSOutputModel(response=snapps_response)
        
    except Exception as e:
        logger.error(f"Error in facilitate_ddx_analysis_snapps with BAML: {str(e)}", exc_info=True)
        # Fallback response
        ddx_list = ", ".join(payload.differential_list) if payload.differential_list else "nenhuma hipótese fornecida"
        
        feedback = f"""Dr. Corvus: Great job! Let's analyze your hypotheses systematically.

**Your hypotheses:** {ddx_list}

**Structured analysis (SNAPPS Steps 2-3):**

**📊 NARROW:** Vamos priorizar por probabilidade e gravidade
**🔍 ANALYZE:** Que achados específicos sustentam cada hipótese?

**Next SNAPPS step (Step 4: Probe):**
What specific questions do you have about this case? What intrigues or concerns you in the investigation?

*[Error BAML: {str(e)}]*"""

    return FacilitateDDxAnalysisSNAPPSOutputModel(response=feedback)


# --- Provide Session Summary SNAPPS ---
class ProvideSessionSummarySNAPPSInputModel(BaseModel):
    session_history: List[Dict[str, Any]] = Field(..., description="Complete session history")
    case_context: str = Field(..., description="Original case context")

class ProvideSessionSummarySNAPPSOutputModel(BaseModel):
    response: str = Field(..., description="Comprehensive session summary and learning points")

@router.post(
    "/provide-session-summary-snapps",
    response_model=ProvideSessionSummarySNAPPSOutputModel,
    summary="Provide Session Summary (SNAPPS Step 6)",
    description="Provides comprehensive session summary using BAML clinical reasoning critique for learning consolidation."
)
async def provide_session_summary_snapps(payload: ProvideSessionSummarySNAPPSInputModel):
    try:
        # Compile the session narrative for BAML analysis
        session_narrative = f"Contexto do caso: {payload.case_context}\n\n"
        session_narrative += "Progresso da sessão SNAPPS:\n"
        
        for i, step in enumerate(payload.session_history):
            step_name = step.get('step_name', f'Step {i+1}')
            step_summary = step.get('summary', 'Não disponível')
            session_narrative += f"{step_name}: {step_summary}\n"
        
        # Use ClinicalReasoningPath_CritiqueAndCompare for comprehensive session analysis
        baml_input = BAMLClinicalReasoningPathCritiqueInput(
            case_description=payload.case_context,
            student_reasoning_narrative=session_narrative,
            student_final_diagnosis_or_plan="Complete SNAPPS framework session"
        )
        
        # Call BAML function for comprehensive reasoning critique
        baml_response = await b.ClinicalReasoningPath_CritiqueAndCompare(baml_input)
        
        # Format comprehensive session summary
        # Build lists separately to avoid chr() in f-strings
        strengths_list = [f"✅ {strength}" for strength in baml_response.strengths_observed] if baml_response.strengths_observed else ["✅ Participação ativa em todas as etapas do framework"]
        areas_list = [f"📚 {area}" for area in baml_response.areas_for_development] if baml_response.areas_for_development else ["📚 Continue praticando o framework SNAPPS"]
        points_list = [f"• {point}" for point in baml_response.suggested_learning_points] if baml_response.suggested_learning_points else ["• Framework SNAPPS aplicado com sucesso"]
        
        # Build biases section if exists
        biases_section = ""
        if baml_response.potential_biases_identified:
            biases_list = [f"• {bias.bias_type}: {bias.explanation_as_question}" for bias in baml_response.potential_biases_identified]
            biases_section = f"**⚠️ Potential biases identified for future attention:**\n{chr(10).join(biases_list)}\n\n"
        
        session_summary = f"""Dr. Corvus: 🎉 **Congratulations! SNAPPS session completed with excellence!**

📊 **SNAPPS Step 6: Select - Consolidation of Learning**

**🎯 Strengths observed in the session:**
{chr(10).join(strengths_list)}

**📈 Areas for development identified:**
{chr(10).join(areas_list)}

**🧠 Insights about the reasoning process:**
{baml_response.comparison_with_expert_approach}

**💡 Learning points consolidated:**
{chr(10).join(points_list)}

{biases_section}**🚀 Competencies developed in this session:**
- **Summarize:** Clear and organized clinical data synthesis
- **Narrow:** Systematic prioritization of diagnostic hypotheses  
- **Analyze:** Critical analysis and comparison of differential diagnoses
- **Probe:** Structured questioning and critical thinking
- **Plan:** Development of evidence-based management plans
- **Select:** Metacognitive consolidation of learning

**🎓 Recommendations for continuous evolution:**
- Continue practicing structured presentations
- Develop illness script repertoire
- Practice structured questioning
- Apply the framework in real cases
- Stay updated with scientific evidence

**🏆 Certification:** You successfully completed a simulation clinical session using the SNAPPS framework!

*Continue this journey of excellence in clinical practice. The SNAPPS framework is your ally in continuous development!*

---
**Dr. Corvus - Advanced Training System in Clinical Reasoning**"""

        return ProvideSessionSummarySNAPPSOutputModel(response=session_summary)
        
    except Exception as e:
        logger.error(f"Error in provide_session_summary_snapps with BAML: {str(e)}", exc_info=True)
        # Fallback response
        completed_steps = len([step for step in payload.session_history if step.get('completed', False)])
        
        feedback = f"""Dr. Corvus: 🎉 **Sessão SNAPPS completed!**

**Session Summary:**
- **Completed Steps:** {completed_steps}/6 of the SNAPPS framework
- **Framework successfully applied**

**Competencies Developed:**
✅ Structured clinical presentation
✅ Systematic diagnostic reasoning
✅ Critical thinking and questioning
✅ Development of safe plans

**Certification:** You successfully completed a simulation clinical session using the SNAPPS framework!

*Continue this journey of excellence in clinical practice. The SNAPPS framework is your ally in continuous development!*

---
**Dr. Corvus - Advanced Training System in Clinical Reasoning**"""

        return ProvideSessionSummarySNAPPSOutputModel(response=feedback)

# --- End of SNAPPS Framework Extensions ---

# === TRANSLATED ENDPOINTS ===

async def _translate_field(field, target_lang="PT", field_name=None):
    """
    Recursively translates a field (str, list, dict).
    """
    try:
        if field is None:
            return None
        if isinstance(field, str):
            # Avoid translating non-translatable strings
            if not field.strip() or field.isupper() or field.isnumeric():
                return field
            return await translate(field, target_lang, field_name=field_name)
        if isinstance(field, list):
            return [await _translate_field(item, target_lang, f"{field_name}[{i}]" if field_name else None)
                    for i, item in enumerate(field)]
        if isinstance(field, dict):
            return {k: await _translate_field(v, target_lang, f"{field_name}.{k}" if field_name else k)
                    for k, v in field.items()}
        if isinstance(field, BaseModel):
            field_dict = field.model_dump()
            translated_dict = await _translate_field(field_dict, target_lang, field_name)
            return type(field)(**translated_dict)
        return field
    except Exception as e:
        logger.error(f"Translation failed for field: {field_name or 'unknown'} | Value: {str(field)[:50]}... | Error: {e}")
        return field  # Fallback to original

@router.post(
    "/analyze-differential-diagnoses-snapps-translated",
    response_model=AnalyzeDifferentialDiagnosesSNAPPSOutputModel,
    summary="Analyze Differential Diagnosis Snapps",
    description="Analyzes a student's differential diagnosis Snapps, returning the result in Portuguese."
)
async def analyze_differential_diagnoses_snapps_translated(payload: AnalyzeDifferentialDiagnosesSNAPPSInputModel):
    try:
        original_response = await analyze_differential_diagnoses_snapps(payload)
        
        # Translate the response
        translated_response = await _translate_analyze_differential_diagnoses_snapps_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in GenerateLabInsights: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (GenerateLabInsights): {str(e)}")

@router.post(
    "/evaluate-summary-snapps-translated",
    response_model=EvaluateSummarySNAPPSOutputModel,
    summary="[PT] Evaluate Summary Snapps",
    description="Evaluates a student's summary of a Snapps, returning the result in Portuguese."
)
async def evaluate_summary_snapps_translated(payload: EvaluateSummarySNAPPSInputModel):
    try:
        original_response = await evaluate_summary_snapps(payload)
        
        # Translate the response
        translated_response = await _translate_evaluate_summary_snapps_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in EvaluateSummarySnapps: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (EvaluateSummarySnapps): {str(e)}")

@router.post(
    "/facilitate-ddx-analysis-snapps-translated",
    response_model=FacilitateDDxAnalysisSNAPPSOutputModel,
    summary="Facilitate DDX Analysis Snapps",
    description="Facilitates a student's differential diagnosis analysis of a Snapps, returning the result in Portuguese."
)
async def facilitate_ddx_analysis_snapps_translated(payload: FacilitateDDxAnalysisSNAPPSInputModel):
    try:
        original_response = await facilitate_ddx_analysis_snapps(payload)
        
        # Translate the response
        translated_response = await _translate_facilitate_ddx_analysis_snapps_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in FacilitateDDxAnalysisSnapps: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (FacilitateDDxAnalysisSnapps): {str(e)}")

@router.post(
    "/evaluate-management-plan-snapps-translated",
    response_model=EvaluateManagementPlanSNAPPSOutputModel,
    summary="[PT] Evaluate Management Plan Snapps",
    description="Evaluates a student's management plan Snapps, returning the result in Portuguese."
)
async def evaluate_management_plan_snapps_translated(payload: EvaluateManagementPlanSNAPPSInputModel):
    try:
        original_response = await evaluate_management_plan_snapps(payload)
        
        # Translate the response
        translated_response = await _translate_evaluate_management_plan_snapps_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in EvaluateManagementPlanSnapps: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (EvaluateManagementPlanSnapps): {str(e)}")

@router.post(
    "/provide-session-summary-snapps-translated",
    response_model=ProvideSessionSummarySNAPPSOutputModel,
    summary="[PT] Provide Session Summary Snapps",
    description="Generates a structured summary of a student's Snapps, returning the result in Portuguese."
)
async def provide_session_summary_snapps_translated(payload: ProvideSessionSummarySNAPPSInputModel):
    try:
        original_response = await provide_session_summary_snapps(payload)
        
        # Translate the response
        translated_response = await _translate_generate_summary_snapps_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in GenerateSummarySNAPPS: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (GenerateSummarySNAPPS): {str(e)}")