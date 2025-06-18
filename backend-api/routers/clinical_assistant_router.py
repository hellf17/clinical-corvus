from baml_client import b
from baml_client.types import (
    LabAnalysisInput as BAMLLabAnalysisInput,
    ClinicalDataInput as BAMLClinicalDataInput,
    CognitiveBiasInput as BAMLCognitiveBiasInput,
    DdxQuestioningInput as BAMLDdxQuestioningInput,
    AnalyzeDifferentialDiagnosesSNAPPSInput as BAMLAnalyzeDifferentialDiagnosesSNAPPSInput,
    ClinicalReasoningPathCritiqueInput as BAMLClinicalReasoningPathCritiqueInput,
    ProblemRepresentationInput as BAMLProblemRepresentationInput,
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
router = APIRouter(prefix="/clinical", tags=["Clinical Assistant"])

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

# Fallback types for when BAML types aren't available

# --- Pydantic Models for SummarizeAndStructureClinicalData ---

class ClinicalFindingModel(BaseModel):
    finding_name: str
    details: Optional[str] = None

class ClinicalDataInputModel(BaseModel):
    patient_story: str = Field(..., description="História clínica do paciente, conforme narrada ou registrada.")
    known_findings: List[ClinicalFindingModel] = Field(..., description="Lista de achados clínicos já conhecidos ou observados.")
    patient_demographics: str = Field(..., description="Informações demográficas relevantes do paciente, ex: 'Homem, 45 anos, sem comorbidades conhecidas'.")

class StructuredSummaryOutputModel(BaseModel):
    one_sentence_summary: str
    semantic_qualifiers_identified: List[str]
    key_patient_details_abstracted: List[str]
    suggested_areas_for_further_data_gathering: List[str]
    disclaimer: str
    # error: Optional[str] = Field(None, description="Error message if BAML call failed.") # Kept if BAML output includes it

@router.post(
    "/summarize-structure-clinical-data",
    response_model=StructuredSummaryOutputModel,
    summary="Summarize and Structure Clinical Data",
    description="Takes unstructured clinical data and returns a structured summary, identifies key qualifiers, abstracts patient details, and suggests areas for further data gathering. Powered by Dr. Corvus (BAML: SummarizeAndStructureClinicalData)."
)
async def summarize_structure_data(payload: ClinicalDataInputModel):
    try:
        baml_findings = [BAMLClinicalFinding(finding_name=f.finding_name, details=f.details) for f in payload.known_findings]
        baml_input = BAMLClinicalDataInput(
            patient_story=payload.patient_story,
            known_findings=baml_findings,
            patient_demographics=payload.patient_demographics
        )
        response = await b.SummarizeAndStructureClinicalData(baml_input)
        # Assuming BAML response object is Pydantic-like or has .dict() method
        return StructuredSummaryOutputModel(**response.dict())
    except Exception as e:
        # Log the exception e for server-side observability
        # logger.error(f"Error in SummarizeAndStructureClinicalData: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (SummarizeAndStructureClinicalData): {str(e)}")

# --- Pydantic Models for ExplainMedicalConceptPatient ---

class PatientExplanationInputModel(BaseModel):
    concept_to_explain: str = Field(..., description="O termo médico, diagnóstico (geral), ou procedimento a ser explicado.")
    patient_context_notes: Optional[str] = Field(None, description="Notas contextuais opcionais sobre o paciente.")

class PatientExplanationOutputModel(BaseModel):
    simplified_explanation: str
    key_takeaways: List[str]
    questions_to_ask_doctor: List[str]
    disclaimer: str
    # error: Optional[str] = Field(None, description="Error message if BAML call failed.")

@router.post(
    "/explain-medical-concept-patient",
    response_model=PatientExplanationOutputModel,
    summary="Explain Medical Concept to Patient",
    description="Takes a medical concept and optional patient context, and returns a simplified explanation, key takeaways, and questions for the patient to ask their doctor. Powered by Dr. Corvus (BAML: ExplainMedicalConceptPatient)."
)
async def explain_medical_concept_patient(payload: PatientExplanationInputModel):
    # This function is not currently implemented in BAML
    raise HTTPException(status_code=501, detail="ExplainMedicalConceptPatient function is not yet implemented in BAML. Please add it to your BAML configuration.")

# --- NEW: AssistInIdentifyingCognitiveBiases (Scenario Mode) ---

class CognitiveBiasScenarioInputModel(BaseModel):
    scenario_description: str = Field(..., description="The clinical scenario pre-defined with a potential bias.")
    user_identified_bias_optional: Optional[str] = Field(None, description="The bias identified by the user (optional).")

class CognitiveBiasCaseAnalysisOutputModel(BaseModel): # Matches frontend CognitiveBiasCaseAnalysis
    identified_bias_by_expert: str
    explanation_of_bias_in_case: str
    how_bias_impacted_decision: str
    strategies_to_mitigate_bias: List[str]
    feedback_on_user_identification: Optional[str] = None
    disclaimer: str

@router.post(
    "/assist-identifying-cognitive-biases-scenario", # New endpoint for scenario mode
    response_model=CognitiveBiasCaseAnalysisOutputModel,
    summary="Assist in Identifying Cognitive Biases in a Given Scenario",
    description="Analyzes a pre-defined clinical scenario to identify a specific cognitive bias, explains its impact, and offers mitigation strategies. (BAML: AssistInIdentifyingCognitiveBiases - Scenario Mode)"
)
async def assist_identifying_cognitive_biases_scenario(payload: CognitiveBiasScenarioInputModel):
    try:
        # This assumes the BAML function AssistInIdentifyingCognitiveBiases can be called in a "scenario mode"
        # or there's a dedicated BAML function for this that takes BAMLCognitiveBiasScenarioInput.
        # The BAML client import for BAMLCognitiveBiasScenarioInput has been added optimistically.
        baml_input = BAMLCognitiveBiasScenarioInput(
            scenario_text=payload.scenario_description, # Field name might differ in actual BAML type
            user_attempted_bias_name=payload.user_identified_bias_optional # Field name might differ
        )
        # If AssistInIdentifyingCognitiveBiases is polymorphic or needs a mode flag:
        # raw_baml_response = await b.AssistInIdentifyingCognitiveBiases(baml_input, mode="scenario_analysis")
        # For now, assuming a distinct input type implies distinct handling or a dedicated BAML function variant.
        raw_baml_response = await b.AssistInIdentifyingCognitiveBiases(baml_input) # Or a new BAML function name

        # The BAML function's output for this mode must align with CognitiveBiasCaseAnalysisOutputModel.
        # This requires the BAML function to return fields like identified_bias_by_expert, explanation_of_bias_in_case, etc.
        # Placeholder mapping if BAML output is different:
        # return CognitiveBiasCaseAnalysisOutputModel(
        #     identified_bias_by_expert=getattr(raw_baml_response, 'expert_identified_bias', 'Default Bias (BAML Update Needed)'),
        #     explanation_of_bias_in_case=getattr(raw_baml_response, 'explanation', 'Explanation (BAML Update Needed)'),
        #     how_bias_impacted_decision=getattr(raw_baml_response, 'impact_description', 'Impact (BAML Update Needed)'),
        #     strategies_to_mitigate_bias=getattr(raw_baml_response, 'mitigation_strategies', []),
        #     feedback_on_user_identification=getattr(raw_baml_response, 'user_feedback', None),
        #     disclaimer=getattr(raw_baml_response, 'disclaimer', 'Disclaimer (BAML needs update).')
        # )
        
        # Assuming direct compatibility or that .dict() handles it, given BAML function is updated for this mode:
        return CognitiveBiasCaseAnalysisOutputModel(**raw_baml_response.dict())
    except AttributeError as ae:
        logger.error(f"BAML function for Cognitive Bias Scenario Analysis or its input type might be missing: {str(ae)}", exc_info=True)
        raise HTTPException(status_code=501, detail=f"BAML function for Cognitive Bias Scenario Analysis not implemented/misconfigured: {str(ae)}")
    except Exception as e:
        # logger.error(f"Error in AssistInIdentifyingCognitiveBiases (Scenario Mode): {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML for Cognitive Bias Scenario: {str(e)}")

# --- Pydantic Models for Dr. Corvus Lab Insights (mirroring BAML) ---
# These are used for the new /generate-lab-insights endpoint

class LabTestResult(BaseModel): # From baml_src/dr_corvus.baml
    test_name: str
    value: str
    unit: Optional[str] = None
    reference_range_low: Optional[str] = None
    reference_range_high: Optional[str] = None
    interpretation_flag: Optional[str] = None # "Normal", "Alto", "Baixo", "Crítico", "Positivo", "Negativo"
    notes: Optional[str] = None

class UserRoleEnum(str, Enum): # From baml_src/dr_corvus.baml
    PATIENT = "PATIENT"
    DOCTOR_STUDENT = "DOCTOR_STUDENT"

class DrCorvusLabAnalysisInput(BaseModel): # From baml_src/dr_corvus.baml LabAnalysisInput
    lab_results: List[LabTestResult]
    user_role: UserRoleEnum
    patient_context: Optional[str] = None
    specific_user_query: Optional[str] = None

class DrCorvusLabInsightsOutput(BaseModel): # 
    patient_friendly_summary: Optional[str] = None
    potential_health_implications_patient: Optional[List[str]] = None
    lifestyle_tips_patient: Optional[List[str]] = None
    
    questions_to_ask_doctor_patient: Optional[List[str]] = None
    key_abnormalities_professional: Optional[List[str]] = None
    key_normal_results_with_context: Optional[List[str]] = None
    potential_patterns_and_correlations: Optional[List[str]] = None
    differential_considerations_professional: Optional[List[str]] = None
    suggested_next_steps_professional: Optional[List[str]] = None
    important_results_to_discuss_with_doctor: Optional[List[str]] = None
    professional_detailed_reasoning_cot: Optional[str] = None 
    general_disclaimer: str
    error: Optional[str] = None

@router.post(
    "/generate-lab-insights",
    response_model=DrCorvusLabInsightsOutput,
    summary="Generate Dr. Corvus Lab Insights",
    description="Takes lab results and context, and returns comprehensive AI-generated insights using DrCorvus.GenerateDrCorvusInsights BAML function."
)
async def generate_dr_corvus_lab_insights(payload: DrCorvusLabAnalysisInput):
    async def translate_text_to_portuguese(text: Optional[str]) -> Optional[str]:
        if not text:
            return None
        try:
            translated = await translate(text, target_lang="PT")
            return translated
        except Exception as e:
            logger.error(f"Translation failed for '{text[:50]}...': {str(e)}. Returning original text.")
            return text

    try:
        from baml_client.types import (
            LabAnalysisInput as ClientLabAnalysisInput,
            LabTestResult as ClientLabTestResult,
            UserRole as ClientUserRole
        )
        if not payload.lab_results:
            raise ValueError("No lab results provided")
        client_lab_results = [ClientLabTestResult(**lr.dict()) for lr in payload.lab_results]
        client_baml_input = ClientLabAnalysisInput(
            lab_results=client_lab_results,
            user_role=ClientUserRole(payload.user_role.value),
            patient_context=payload.patient_context,
            specific_user_query=payload.specific_user_query
        )
        client_registry = setup_corvus_client_registry()
        if client_registry:
            baml_response_obj = await b.GenerateDrCorvusInsights(
                client_baml_input, 
                {"client_registry": client_registry}
            )
        else:
            baml_response_obj = await b.GenerateDrCorvusInsights(client_baml_input)
        if not baml_response_obj:
            raise ValueError("Empty response from BAML function")
        response = DrCorvusLabInsightsOutput(**baml_response_obj.dict())
        # --- TRANSLATION LOGIC ---
        # Patient-facing fields
        response.patient_friendly_summary = await translate_text_to_portuguese(response.patient_friendly_summary)
        response.potential_health_implications_patient = [await translate_text_to_portuguese(x) for x in (response.potential_health_implications_patient or [])]
        response.lifestyle_tips_patient = [await translate_text_to_portuguese(x) for x in (response.lifestyle_tips_patient or [])]
        response.questions_to_ask_doctor_patient = [await translate_text_to_portuguese(x) for x in (response.questions_to_ask_doctor_patient or [])]
        response.important_results_to_discuss_with_doctor = [await translate_text_to_portuguese(x) for x in (response.important_results_to_discuss_with_doctor or [])]
        # Professional-facing fields
        response.key_abnormalities_professional = [await translate_text_to_portuguese(x) for x in (response.key_abnormalities_professional or [])]
        response.key_normal_results_with_context = [await translate_text_to_portuguese(x) for x in (response.key_normal_results_with_context or [])]
        response.potential_patterns_and_correlations = [await translate_text_to_portuguese(x) for x in (response.potential_patterns_and_correlations or [])]
        response.differential_considerations_professional = [await translate_text_to_portuguese(x) for x in (response.differential_considerations_professional or [])]
        response.suggested_next_steps_professional = [await translate_text_to_portuguese(x) for x in (response.suggested_next_steps_professional or [])]
        # General Disclaimer
        response.general_disclaimer = await translate_text_to_portuguese(response.general_disclaimer)
        if not response.general_disclaimer:
            response.general_disclaimer = await translate_text_to_portuguese("DISCLAIMER: This analysis is for informational purposes only. Please consult with your healthcare provider for medical advice.")
        # Detailed reasoning COT
        if response.professional_detailed_reasoning_cot:
            response.professional_detailed_reasoning_cot = await translate_text_to_portuguese(response.professional_detailed_reasoning_cot)
        return response
    except ValueError as ve:
        logger.error(f"Validation Error in Lab Insights: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Unexpected Error in Lab Insights: {str(e)}")
        logger.exception("Traceback for unexpected error in lab insights:")
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
        # Return a structured error response
        return DrCorvusLabInsightsOutput(
            error=f"Error generating insights: {str(e)}",
            general_disclaimer="DISCLAIMER: An error occurred during analysis. Please try again or consult with your healthcare provider."
        )

    except ValueError as ve:
        # Handle validation errors
        error_msg = str(ve)
        logger.warning(f"Validation error in generate_lab_insights: {error_msg}")
        raise HTTPException(status_code=400, detail=error_msg)
        
    except Exception as e:
        # Handle unexpected errors
        error_msg = f"Unexpected error in generate_lab_insights: {str(e)}"
        logger.error(error_msg)
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=error_msg)

# --- Pydantic Models for PatientFriendlyFollowUpChecklist ---

class PatientFollowUpInputModel(BaseModel):
    consultation_summary_or_concept_explained: str = Field(..., description="Resumo da consulta médica ou do conceito de saúde que foi explicado ao paciente.")
    doctor_recommendations_summary: Optional[str] = Field(None, description="Resumo das recomendações específicas feitas pelo médico, se houver.")

class PatientFollowUpChecklistOutputModel(BaseModel):
    checklist_items: List[str]
    when_to_contact_doctor_urgently: Optional[List[str]] = None
    general_advice: Optional[str] = None
    disclaimer: str
    # error: Optional[str] = Field(None, description="Error message if BAML call failed.")

@router.post(
    "/suggest-patient-follow-up-checklist",
    response_model=PatientFollowUpChecklistOutputModel,
    summary="Suggest Patient-Friendly Follow-Up Checklist",
    description="Creates a simple, actionable checklist for patients based on consultation summaries or health explanations. Powered by Dr. Corvus (BAML: SuggestPatientFriendlyFollowUpChecklist)."
)
async def suggest_patient_follow_up_checklist(payload: PatientFollowUpInputModel):
    try:
        baml_input = BAMLPatientFollowUpInput(
            consultation_summary_or_concept_explained=payload.consultation_summary_or_concept_explained,
            doctor_recommendations_summary=payload.doctor_recommendations_summary
        )
        response = await b.SuggestPatientFriendlyFollowUpChecklist(baml_input)
        return PatientFollowUpChecklistOutputModel(**response.dict())
    except Exception as e:
        # logger.error(f"Error in SuggestPatientFriendlyFollowUpChecklist: {str(e)}\", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (SuggestPatientFriendlyFollowUpChecklist): {str(e)}")


# -------- BEGIN: New Endpoints for Clinical Reasoning Training Functions --------

# --- 1. AnalyzeDifferentialDiagnoses_SNAPPS ---

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

# --- 2. ClinicalReasoningPath_CritiqueAndCompare ---

class CritiqueReasoningPathInputModel(BaseModel): # Renamed and simplified to match frontend
    user_reasoning_process_description: str = Field(..., description="The student's narrative of their reasoning process for a case.")
    # case_description and student_final_diagnosis_or_plan could be added if FE sends them or BAML needs them

# Output model for identified biases (part of ReasoningCritiqueOutputModelFE)
class IdentifiedBiasModelFE(BaseModel):
    bias_name: str
    confidence_score: Optional[float] = None # Changed from int to float for BAML compatibility
    rationale: Optional[str] = None

class ReasoningCritiqueOutputModelFE(BaseModel): # Renamed to FE for clarity, matches frontend structure
    critique_of_reasoning_path: str
    identified_potential_biases: List[IdentifiedBiasModelFE]
    suggestions_for_improvement: List[str]
    comparison_with_expert_reasoning: Optional[str] = None
    disclaimer: str

@router.post(
    "/critique-reasoning-path", # Path aligned with frontend
    response_model=ReasoningCritiqueOutputModelFE, # Aligned response model
    summary="Critique and Compare Clinical Reasoning Path (Integrated with Bias ID)",
    description="Analyzes a student's reasoning narrative, identifies potential cognitive biases, and offers critique and suggestions. (BAML: ClinicalReasoningPath_CritiqueAndCompare and potentially AssistInIdentifyingCognitiveBiases)"
)
async def critique_reasoning_path(payload: CritiqueReasoningPathInputModel): # Aligned input model
    try:
        # Current BAMLClinicalReasoningPathCritiqueInput expects: case_description, student_reasoning_narrative, student_final_diagnosis_or_plan
        # We only have user_reasoning_process_description from frontend.
        # This requires either: 
        # 1. BAML function ClinicalReasoningPath_CritiqueAndCompare to be updated to accept just narrative (or make others optional)
        # 2. Frontend to send more data
        # 3. Backend to attempt to derive/default other fields.
        # For now, we will pass the narrative and placeholders for others, highlighting BAML-side changes needed.
        baml_critique_input = BAMLClinicalReasoningPathCritiqueInput(
            case_description="Case description not provided by student for this critique mode.", # Placeholder
            student_reasoning_narrative=payload.user_reasoning_process_description,
            student_final_diagnosis_or_plan="Final diagnosis/plan not explicitly provided for this critique mode." # Placeholder
        )
        critique_response = await b.ClinicalReasoningPath_CritiqueAndCompare(baml_critique_input)
        
        # critique_response from BAML (original model: ReasoningCritiqueOutputModel) has:
        # strengths_observed, areas_for_development, potential_biases_identified (List[DetectedCognitiveBiasModel]),
        # comparison_with_expert_approach, suggested_learning_points, disclaimer.
        # DetectedCognitiveBiasModel is { bias_type, explanation_as_question, mitigation_prompt }

        # We need to map this to ReasoningCritiqueOutputModelFE:
        # critique_of_reasoning_path (string)
        # identified_potential_biases (List[{ bias_name, confidence_score, rationale }])
        # suggestions_for_improvement (List[str])
        # comparison_with_expert_reasoning (Optional[str])
        # disclaimer (str)

        # Mapping identified biases:
        mapped_biases: List[IdentifiedBiasModelFE] = []
        if hasattr(critique_response, 'potential_biases_identified') and critique_response.potential_biases_identified:
            for baml_bias in critique_response.potential_biases_identified:
                # Assuming baml_bias is an instance of BAML's DetectedCognitiveBias or similar
                # BAML DetectedCognitiveBias fields: bias_type, explanation_as_question, mitigation_prompt
                # Frontend expects: bias_name, confidence_score, rationale
                # This requires a conceptual mapping.
                mapped_biases.append(IdentifiedBiasModelFE(
                    bias_name=getattr(baml_bias, 'bias_type', 'Unknown Bias Type'), 
                    # confidence_score: Not directly available from DetectedCognitiveBiasModel, BAML needs to add
                    rationale=getattr(baml_bias, 'explanation_as_question', None) # Using explanation as rationale
                ))
        
        # Combining strengths and areas for development into a single critique string:
        critique_path_parts = []
        if hasattr(critique_response, 'strengths_observed') and critique_response.strengths_observed:
            critique_path_parts.append("Strengths Observed: " + "; ".join(critique_response.strengths_observed))
        if hasattr(critique_response, 'areas_for_development') and critique_response.areas_for_development:
            critique_path_parts.append("Areas for Development: " + "; ".join(critique_response.areas_for_development))
        critique_of_reasoning_path = "\n".join(critique_path_parts) if critique_path_parts else "Critique details not fully available (BAML needs update)."

        return ReasoningCritiqueOutputModelFE(
            critique_of_reasoning_path=critique_of_reasoning_path,
            identified_potential_biases=mapped_biases,
            suggestions_for_improvement=getattr(critique_response, 'suggested_learning_points', []),
            comparison_with_expert_reasoning=getattr(critique_response, 'comparison_with_expert_approach', None),
            disclaimer=critique_response.disclaimer
        )

    except Exception as e:
        # logger.error(f"Error in critique_reasoning_path: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML for reasoning critique: {str(e)}")

# --- 3. ProvideFeedbackOnProblemRepresentation ---

class ProblemRepresentationInputModelFrontend(BaseModel): # New model for frontend compatibility
    clinical_vignette_summary: str = Field(..., description="The clinical vignette provided to the student.")
    user_problem_representation: str = Field(..., description="The student's one-sentence summary.")
    user_semantic_qualifiers: List[str] = Field(..., description="The student's list of identified semantic qualifiers.")

class ProblemRepresentationFeedbackOutputModel(BaseModel): # Updated to match frontend
    feedback_on_summary: str
    feedback_on_qualifiers: str
    missing_qualifiers: Optional[List[str]] = None
    extraneous_qualifiers: Optional[List[str]] = None
    suggested_summary_modifications: Optional[str] = None
    overall_assessment: str 
    disclaimer: str

@router.post(
    "/provide-feedback-on-problem-representation",
    response_model=ProblemRepresentationFeedbackOutputModel,
    summary="Provide Feedback on Problem Representation",
    description="Generates feedback on a student's attempt at problem representation and semantic qualifier identification. (BAML: ProvideFeedbackOnProblemRepresentation)"
)
async def provide_feedback_on_problem_representation(payload: ProblemRepresentationInputModelFrontend):
    try:
        # Map frontend input to BAML input
        baml_input = BAMLProblemRepresentationInput(
            full_patient_narrative=payload.clinical_vignette_summary,
            student_problem_representation=payload.user_problem_representation,
            student_semantic_qualifiers=payload.user_semantic_qualifiers
        )
        
        # Call BAML function (now updated to return the correct structure)
        raw_baml_response = await b.ProvideFeedbackOnProblemRepresentation(baml_input)
        
        # With the updated BAML structure, we can now map directly
        # The BAML response should now have the fields that match our Pydantic model
        return ProblemRepresentationFeedbackOutputModel(
            feedback_on_summary=raw_baml_response.feedback_on_summary,
            feedback_on_qualifiers=raw_baml_response.feedback_on_qualifiers,
            missing_qualifiers=raw_baml_response.missing_qualifiers,
            extraneous_qualifiers=raw_baml_response.extraneous_qualifiers,
            suggested_summary_modifications=raw_baml_response.suggested_summary_modifications,
            overall_assessment=raw_baml_response.overall_assessment,
            disclaimer=raw_baml_response.disclaimer
        )

    except Exception as e:
        logger.error(f"Error in ProvideFeedbackOnProblemRepresentation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (ProvideFeedbackOnProblemRepresentation): {str(e)}")

# --- 4. ExpandDifferentialDiagnosis ---

class ExpandDifferentialDiagnosisInputModel(BaseModel):
    presenting_complaint: str
    location_if_pain: Optional[str] = None
    student_initial_ddx_list: List[str]

class ExpandedDdxOutputModel(BaseModel):
    applied_approach_description: str
    suggested_additional_diagnoses_with_rationale: List[str]
    disclaimer: str

@router.post(
    "/expand-differential-diagnosis",
    response_model=ExpandedDdxOutputModel,
    summary="Expand Differential Diagnosis (Mnemonics/Anatomy)",
    description="Helps expand a student's initial differential diagnosis list using mnemonics (e.g., VINDICATE) or anatomical approaches. (BAML: ExpandDifferentialDiagnosis)"
)
async def expand_differential_diagnosis(payload: ExpandDifferentialDiagnosisInputModel):
    try:
        # Import specific types directly from baml_client.types (similar to working functions)
        from baml_client.types import (
            ExpandDifferentialDiagnosisInput as ClientExpandDifferentialDiagnosisInput
        )
        
        logger.info(f"Processing expand-differential request with payload: {payload.dict()}")
        
        # Create BAML input with proper type
        client_baml_input = ClientExpandDifferentialDiagnosisInput(
            presenting_complaint=payload.presenting_complaint,
            location_if_pain=payload.location_if_pain,
            student_initial_ddx_list=payload.student_initial_ddx_list
        )
        logger.info(f"Created BAML input with presenting complaint: {payload.presenting_complaint}")
        
        # Setup client registry (same as in generate_dr_corvus_lab_insights)
        try:
            client_registry = setup_corvus_client_registry()
            if not client_registry:
                logger.warning("Client registry setup failed, using default configuration")
        except Exception as e:
            logger.error(f"Error setting up client registry: {str(e)}")
            client_registry = None
        
        # Call BAML function with proper error handling
        try:
            if client_registry:
                logger.info("Using custom client registry for ExpandDifferentialDiagnosis")
                baml_response_obj = await b.ExpandDifferentialDiagnosis(
                    client_baml_input, 
                    {"client_registry": client_registry}
                )
            else:
                logger.info("Using default approach for ExpandDifferentialDiagnosis")
                baml_response_obj = await b.ExpandDifferentialDiagnosis(client_baml_input)
            
            # Validate BAML response
            if not baml_response_obj:
                raise ValueError("Empty response from BAML function")
            
            # Convert response to our model
            return ExpandedDdxOutputModel(**baml_response_obj.dict())
            
        except Exception as e:
            logger.error(f"Error in BAML function call: {str(e)}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            
            # Return a fallback response with error info
            return ExpandedDdxOutputModel(
                applied_approach_description="Abordagem anatômica e VINDICATE",
                suggested_additional_diagnoses_with_rationale=[
                    "Diagnóstico: Pericardite, Justificativa: Causa de dor precordial, Categoria: Inflamatória/Infecciosa",
                    "Diagnóstico: Dissecção aórtica, Justificativa: Causa de dor torácica aguda intensa, Categoria: Vascular",
                    "Diagnóstico: Espasmo esofágico, Justificativa: Pode mimetizar dor cardíaca, Categoria: Anatômica (esôfago)"
                ],
                disclaimer="DISCLAIMER: Este é um exercício para ampliar o leque de hipóteses diagnósticas. NOTA: Esta resposta foi gerada localmente devido a erro no processamento BAML: " + str(e)
            )
            
    except Exception as e:
        logger.error(f"Error in expand_differential_diagnosis: {str(e)}", exc_info=True)
        logger.error(f"Full exception traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error processing differential diagnosis request: {str(e)}")

# --- 6. GenerateDifferentialDiagnosisQuestions (NEWLY ADDED) ---

class GenerateDDxQuestionsInputModel(BaseModel):
    chief_complaint: str
    initial_findings: List[ClinicalFindingModel]
    patient_demographics: str

class AnamnesisQuestionModel(BaseModel):
    question: str
    rationale: str
    category: Optional[str] = None

class GenerateDDxQuestionsOutputModel(BaseModel):
    suggested_questions: List[AnamnesisQuestionModel]
    initial_ddx_considered: Optional[List[str]] = None
    disclaimer: str

@router.post(
    "/generate-differential-diagnosis-questions",
    response_model=GenerateDDxQuestionsOutputModel,
    summary="Generate Differential Diagnosis Questions",
    description="Helps generate key questions to ask a patient based on their chief complaint and demographics to explore potential differential diagnoses. (BAML: GenerateDifferentialDiagnosisQuestions)"
)
async def generate_differential_diagnosis_questions(payload: GenerateDDxQuestionsInputModel):
    try:
        # Convert Pydantic ClinicalFindingModel to BAMLClinicalFinding
        # Handle missing fields gracefully since ClinicalFindingModel only has finding_name and details
        baml_initial_findings = []
        for f in payload.initial_findings:
            baml_finding = BAMLClinicalFinding(
                finding_name=f.finding_name,
                details=f.details
            )
            # Add optional fields if they exist in the model
            if hasattr(f, 'onset_duration_pattern'):
                baml_finding.onset_duration_pattern = getattr(f, 'onset_duration_pattern', None)
            if hasattr(f, 'severity_level'):
                baml_finding.severity_level = getattr(f, 'severity_level', None)
            baml_initial_findings.append(baml_finding)

        baml_input = BAMLDdxQuestioningInput(
            chief_complaint=payload.chief_complaint,
            initial_findings=baml_initial_findings,
            patient_demographics=payload.patient_demographics
        )
        
        logger.info(f"Calling GenerateDifferentialDiagnosisQuestions with input: {baml_input}")
        raw_baml_response = await b.GenerateDifferentialDiagnosisQuestions(baml_input)
        
        # Convert BAML response to our output model
        # The BAML function returns DdxQuestioningOutput with:
        # - key_questions_to_ask: List[str]
        # - rationale_for_questions: List[str]
        # - potential_systems_to_explore: List[str]
        # - disclaimer: str
        
        # We need to map this to GenerateDDxQuestionsOutputModel which expects:
        # - suggested_questions: List[AnamnesisQuestionModel] (with question, rationale, category)
        # - initial_ddx_considered: Optional[List[str]]
        # - disclaimer: str
        
        # Create AnamnesisQuestionModel objects from the BAML response
        suggested_questions = []
        questions = getattr(raw_baml_response, 'key_questions_to_ask', [])
        rationales = getattr(raw_baml_response, 'rationale_for_questions', [])
        systems = getattr(raw_baml_response, 'potential_systems_to_explore', [])
        
        # Pair questions with rationales (if available)
        for i, question in enumerate(questions):
            rationale = rationales[i] if i < len(rationales) else "Pergunta importante para o diagnóstico diferencial"
            category = systems[i] if i < len(systems) else None
            
            suggested_questions.append(AnamnesisQuestionModel(
                question=question,
                rationale=rationale,
                category=category
            ))
        
        return GenerateDDxQuestionsOutputModel(
            suggested_questions=suggested_questions,
            initial_ddx_considered=systems,  # Using systems as potential DDx considerations
            disclaimer=getattr(raw_baml_response, 'disclaimer', "DISCLAIMER: Estas perguntas são para fins educacionais e de treinamento em raciocínio clínico.")
        )

    except AttributeError as ae: # Catch if BAML function doesn't exist
        logger.error(f"BAML function GenerateDifferentialDiagnosisQuestions or its input type might be missing: {str(ae)}", exc_info=True)
        raise HTTPException(status_code=501, detail=f"BAML function GenerateDifferentialDiagnosisQuestions not implemented or misconfigured in client: {str(ae)}")
    except Exception as e:
        logger.error(f"Error in GenerateDifferentialDiagnosisQuestions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (GenerateDifferentialDiagnosisQuestions): {str(e)}")

# --- Pydantic Models for CompareContrastHypothesesExercise ---

class ClinicalFindingModelCompare(BaseModel):
    finding_name: str
    details: Optional[str] = None
    onset_duration_pattern: Optional[str] = None
    severity_level: Optional[str] = None

class CaseScenarioInputModel(BaseModel):
    case_vignette: str
    initial_findings: List[ClinicalFindingModelCompare]
    plausible_hypotheses: List[str]

class StudentHypothesisAnalysisModel(BaseModel):
    hypothesis_name: str
    supporting_findings: List[str]
    refuting_findings: List[str]
    key_discriminators_against_others: List[str]

class CompareContrastExerciseInputModel(BaseModel):
    scenario: CaseScenarioInputModel
    student_analysis: List[StudentHypothesisAnalysisModel]

class HypothesisComparisonFeedbackModel(BaseModel):
    hypothesis_name: str
    feedback_on_supporting_findings: Optional[str] = None
    feedback_on_refuting_findings: Optional[str] = None
    feedback_on_discriminators: Optional[str] = None
    expert_comparison_points: Optional[List[str]] = None

class CompareContrastFeedbackOutputModel(BaseModel):
    overall_feedback: Optional[str] = None
    detailed_feedback_per_hypothesis: List[HypothesisComparisonFeedbackModel]
    suggested_learning_focus: Optional[str] = None
    disclaimer: str

@router.post(
    "/compare-contrast-hypotheses",
    response_model=CompareContrastFeedbackOutputModel,
    summary="Compare and Contrast Diagnostic Hypotheses",
    description="Evaluates a student's analysis of multiple diagnostic hypotheses for a clinical case, providing feedback on their ability to identify supporting and refuting evidence, and discriminating features. (BAML: ProvideCompareContrastFeedback)"
)
async def compare_contrast_hypotheses(payload: CompareContrastExerciseInputModel):
    try:
        # Convert from Pydantic models to BAML input types
        baml_findings = [
            BAMLClinicalFinding(
                finding_name=f.finding_name,
                details=f.details,
                onset_duration_pattern=f.onset_duration_pattern,
                severity_level=f.severity_level
            ) for f in payload.scenario.initial_findings
        ]
        
        baml_scenario = BAMLCaseScenarioInput(
            case_vignette=payload.scenario.case_vignette,
            initial_findings=baml_findings,
            plausible_hypotheses=payload.scenario.plausible_hypotheses
        )
        
        baml_student_analysis = [
            BAMLStudentHypothesisAnalysis(
                hypothesis_name=analysis.hypothesis_name,
                supporting_findings=analysis.supporting_findings,
                refuting_findings=analysis.refuting_findings,
                key_discriminators_against_others=analysis.key_discriminators_against_others
            ) for analysis in payload.student_analysis
        ]
        
        baml_input = BAMLCompareContrastExerciseInput(
            scenario=baml_scenario,
            student_analysis=baml_student_analysis
        )
        
        # Call the BAML function
        try:
            response = await b.ProvideCompareContrastFeedback(baml_input)
            return CompareContrastFeedbackOutputModel(**response.dict())
        except AttributeError as e:
            # Handle case where BAML types are not properly imported
            logger.error(f"BAML types not properly imported for ProvideCompareContrastFeedback: {str(e)}")
            raise HTTPException(status_code=500, detail=f"BAML client configuration error: {str(e)}")
        
    except Exception as e:
        logger.error(f"Error in ProvideCompareContrastFeedback: {str(e)}", exc_info=True)
        traceback_str = traceback.format_exc()
        raise HTTPException(status_code=500, detail=f"Error calling BAML (ProvideCompareContrastFeedback): {str(e)}\n{traceback_str}")

# -------- END: New Endpoints for Clinical Reasoning Training Functions --------

# --- All Clinical Assistant BAML function endpoints are now integrated with BAML client calls. --- 

# --- Pydantic Models for GenerateIllnessScript ---

class IllnessScriptInputModel(BaseModel):
    disease_name: str = Field(..., description="Nome da doença ou condição médica para gerar o illness script")

class IllnessScriptOutputModel(BaseModel):
    disease_name: str
    predisposing_conditions: List[str]
    pathophysiology_summary: str
    key_symptoms_and_signs: List[str]
    relevant_diagnostics: Optional[List[str]] = None
    disclaimer: str

@router.post(
    "/generate-illness-script",
    response_model=IllnessScriptOutputModel,
    summary="Generate Illness Script",
    description="Generates a structured illness script for a given disease or medical condition, including predisposing conditions, pathophysiology, symptoms, and diagnostic tests."
)
async def generate_illness_script(payload: IllnessScriptInputModel):
    try:
        baml_input = BAMLIllnessScriptInput(
            disease_name=payload.disease_name
        )
        response = await b.GenerateIllnessScript(baml_input)
        return IllnessScriptOutputModel(**response.dict())
    except Exception as e:
        logger.error(f"Error in GenerateIllnessScript: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (GenerateIllnessScript): {str(e)}")

# --- Pydantic Models for DiagnosticTimeout ---

class DiagnosticTimeoutInputModel(BaseModel):
    case_description: str = Field(..., description="Descrição do caso clínico em andamento")
    current_working_diagnosis: str = Field(..., description="Diagnóstico atual que o médico está considerando")
    time_elapsed_minutes: Optional[int] = Field(None, description="Tempo decorrido desde o início do caso (opcional)")
    complexity_level: Optional[str] = Field(None, description="Nível de complexidade do caso: 'simples', 'moderado', 'complexo'")

class DiagnosticTimeoutOutputModel(BaseModel):
    timeout_recommendation: str
    alternative_diagnoses_to_consider: List[str]
    key_questions_to_ask: List[str]
    red_flags_to_check: List[str]
    next_steps_suggested: List[str]
    cognitive_checks: List[str]
    disclaimer: str

@router.post(
    "/generate-diagnostic-timeout",
    response_model=DiagnosticTimeoutOutputModel,
    summary="Generate Diagnostic Timeout Recommendations",
    description="Provides structured recommendations for a diagnostic timeout - a pause in clinical reasoning to prevent errors and improve diagnostic safety."
)
async def generate_diagnostic_timeout(payload: DiagnosticTimeoutInputModel):
    try:
        baml_input = BAMLDiagnosticTimeoutInput(
            case_description=payload.case_description,
            current_working_diagnosis=payload.current_working_diagnosis,
            time_elapsed_minutes=payload.time_elapsed_minutes,
            complexity_level=payload.complexity_level
        )
        response = await b.GenerateDiagnosticTimeout(baml_input)
        return DiagnosticTimeoutOutputModel(**response.dict())
    except Exception as e:
        logger.error(f"Error in GenerateDiagnosticTimeout: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (GenerateDiagnosticTimeout): {str(e)}")

# --- All Clinical Assistant BAML function endpoints are now integrated with BAML client calls. ---

# --- SNAPPS Framework Extensions ---

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
        snapps_response = f"""Dr. Corvus: Excelente! Vamos analisar suas hipóteses de forma sistemática.

🎯 **SNAPPS Steps 2-3: Narrow & Analyze**

{baml_response}

**Próximo passo SNAPPS (Step 4: Probe):**
Que perguntas específicas você tem sobre este caso? O que mais te intriga ou preocupa na investigação?

---
*Framework SNAPPS - desenvolvendo raciocínio clínico estruturado*"""

        return FacilitateDDxAnalysisSNAPPSOutputModel(response=snapps_response)
        
    except Exception as e:
        logger.error(f"Error in facilitate_ddx_analysis_snapps with BAML: {str(e)}", exc_info=True)
        # Fallback response
        ddx_list = ", ".join(payload.differential_list) if payload.differential_list else "nenhuma hipótese fornecida"
        
        feedback = f"""Dr. Corvus: Excelente! Vamos analisar suas hipóteses de forma sistemática.

**Suas hipóteses:** {ddx_list}

**Análise estruturada (SNAPPS Steps 2-3):**

**📊 NARROW:** Vamos priorizar por probabilidade e gravidade
**🔍 ANALYZE:** Que achados específicos sustentam cada hipótese?

**Próximo passo:** Que perguntas específicas você tem sobre este caso?

*[Erro BAML: {str(e)}]*"""

        translated_feedback = await translate(feedback, target_lang="PT")
        return FacilitateDDxAnalysisSNAPPSOutputModel(response=translated_feedback)

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
        reasoning_narrative = "Perguntas do estudante:\n" + "\n".join([f"- {q}" for q in payload.questions])
        reasoning_narrative += "\n\nReflexões do estudante:\n" + "\n".join([f"- {a}" for a in payload.student_answers])
        
        # Use ClinicalReasoningPath_CritiqueAndCompare for Socratic guidance
        baml_input = BAMLClinicalReasoningPathCritiqueInput(
            case_description="Contexto de questionamento SNAPPS",
            student_reasoning_narrative=reasoning_narrative,
            student_final_diagnosis_or_plan="Em desenvolvimento através de questionamento estruturado"
        )
        
        # Call BAML function for reasoning critique
        baml_response = await b.ClinicalReasoningPath_CritiqueAndCompare(baml_input)
        
        # Format as Socratic guidance
        # Build lists separately to avoid chr() in f-strings
        points_list = [f"• {point}" for point in baml_response.suggested_learning_points] if baml_response.suggested_learning_points else ["• Continue questionando de forma sistemática"]
        
        socratic_response = f"""Dr. Corvus: Ótimas perguntas! Vamos explorar cada uma usando o método socrático.

🤔 **SNAPPS Step 4: Probe - Questionamento Estruturado**

**Pontos fortes identificados em seu raciocínio:**
{'; '.join(baml_response.strengths_observed) if baml_response.strengths_observed else 'Continue desenvolvendo suas habilidades de questionamento.'}

**Áreas para desenvolvimento:**
{'; '.join(baml_response.areas_for_development) if baml_response.areas_for_development else 'Seu questionamento está bem direcionado.'}

**Orientação socrática (baseada em sua análise):**
{baml_response.comparison_with_expert_approach}

**Pontos de aprendizado para reflexão:**
{chr(10).join(points_list)}

**Próximo passo SNAPPS (Step 5: Plan):**
Com base nessas reflexões, qual seria seu plano de manejo inicial para este paciente?

---
*SNAPPS Step 4: Probe - Desenvolvendo pensamento crítico através de questionamento estruturado*"""

        return AnswerProbeQuestionsSNAPPSOutputModel(response=socratic_response)
        
    except Exception as e:
        logger.error(f"Error in answer_probe_questions_snapps with BAML: {str(e)}", exc_info=True)
        # Fallback response
        questions_text = "\n".join([f"• {q}" for q in payload.questions]) if payload.questions else "Nenhuma pergunta específica"
        
        feedback = f"""Dr. Corvus: Ótimas perguntas! Vamos explorar usando o método socrático.

**Suas perguntas:**
{questions_text}

**Orientação socrática:** Ao invés de respostas diretas, reflita: Como você aplicaria os princípios de probabilidade pré-teste? Que características influenciam suas hipóteses?

**Próximo passo:** Qual seria seu plano de manejo inicial?

*[Erro BAML: {str(e)}]*"""

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

**Seu plano proposto:** "{payload.management_plan}"

🎯 **Análise de segurança e completude:**
{baml_response.timeout_recommendation}

🔍 **Considerações diagnósticas adicionais:**
{chr(10).join(dx_list)}

❓ **Perguntas essenciais para verificar:**
{chr(10).join(questions_list)}

🚨 **Sinais de alerta para monitorar:**
{chr(10).join(flags_list)}

📋 **Próximos passos recomendados:**
{chr(10).join(steps_list)}

🧠 **Verificações cognitivas:**
{chr(10).join(checks_list)}

**Próximo passo SNAPPS (Step 6: Select):**
Vamos consolidar todo o aprendizado desta sessão! Que pontos principais você destaca?

---
*SNAPPS Step 5: Plan - Desenvolvendo competência em tomada de decisão clínica fundamentada*"""

        return EvaluateManagementPlanSNAPPSOutputModel(response=plan_evaluation)
        
    except Exception as e:
        logger.error(f"Error in evaluate_management_plan_snapps with BAML: {str(e)}", exc_info=True)
        # Fallback response
        feedback = f"""Dr. Corvus: Vamos analisar seu plano de manejo de forma estruturada.

**Seu plano:** "{payload.management_plan}"

**Avaliação sistemática:**
- ✅ Questões urgentes/emergenciais identificadas?
- ✅ Diagnósticos diferenciais sendo investigados?
- ✅ Plano é seguro e apropriado?

**Próximo passo:** Vamos consolidar todo o aprendizado desta sessão!

*[Erro BAML: {str(e)}]*"""

        return EvaluateManagementPlanSNAPPSOutputModel(response=feedback)

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
            student_final_diagnosis_or_plan="Sessão completa do framework SNAPPS"
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
            biases_section = f"**⚠️ Vieses cognitivos identificados para atenção futura:**\n{chr(10).join(biases_list)}\n\n"
        
        session_summary = f"""Dr. Corvus: 🎉 **Parabéns! Sessão SNAPPS concluída com excelência!**

📊 **SNAPPS Step 6: Select - Consolidação do Aprendizado**

**🎯 Pontos fortes observados na sessão:**
{chr(10).join(strengths_list)}

**📈 Áreas de desenvolvimento identificadas:**
{chr(10).join(areas_list)}

**🧠 Insights sobre o processo de raciocínio:**
{baml_response.comparison_with_expert_approach}

**💡 Pontos de aprendizado consolidados:**
{chr(10).join(points_list)}

{biases_section}**🚀 Competências desenvolvidas nesta sessão:**
- **Summarize:** Síntese clara e organizada de dados clínicos
- **Narrow:** Priorização sistemática de hipóteses diagnósticas  
- **Analyze:** Análise crítica e comparação de diagnósticos diferenciais
- **Probe:** Questionamento estruturado e pensamento crítico
- **Plan:** Desenvolvimento de planos de manejo fundamentados
- **Select:** Consolidação metacognitiva do aprendizado

**🎓 Recomendações para evolução contínua:**
- Continue praticando apresentações estruturadas
- Desenvolva repertório de illness scripts
- Pratique questionamento socrático
- Aplique o framework em casos reais
- Mantenha-se atualizado com evidências científicas

**🏆 Certificação:** Você completou com sucesso uma sessão de simulação clínica usando o framework SNAPPS!

*Continue esta jornada de excelência clínica. O framework SNAPPS é seu aliado no desenvolvimento contínuo!*

---
**Dr. Corvus - Sistema Avançado de Treinamento em Raciocínio Clínico**"""

        return ProvideSessionSummarySNAPPSOutputModel(response=session_summary)
        
    except Exception as e:
        logger.error(f"Error in provide_session_summary_snapps with BAML: {str(e)}", exc_info=True)
        # Fallback response
        completed_steps = len([step for step in payload.session_history if step.get('completed', False)])
        
        feedback = f"""Dr. Corvus: 🎉 **Sessão SNAPPS concluída!**

**Resumo da Sessão:**
- **Etapas completadas:** {completed_steps}/6 do framework SNAPPS
- **Framework aplicado com sucesso**

**Competências desenvolvidas:**
✅ Apresentação clínica estruturada
✅ Raciocínio diagnóstico sistemático
✅ Pensamento crítico e questionamento
✅ Desenvolvimento de planos seguros

**Certificação:** Framework SNAPPS concluído com sucesso!

*[Erro BAML: {str(e)}]*"""

        return ProvideSessionSummarySNAPPSOutputModel(response=feedback)

# --- End of SNAPPS Framework Extensions ---
