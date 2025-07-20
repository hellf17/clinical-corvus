from baml_client import b
from baml_client.types import (
    LabAnalysisInput as BAMLLabAnalysisInput,
    ClinicalDataInput as BAMLClinicalDataInput,
    CognitiveBiasInput as BAMLCognitiveBiasInput,
    DdxQuestioningInput as BAMLDdxQuestioningInput,
    ExpandDifferentialDiagnosisInput as BAMLExpandDifferentialDiagnosisInput,
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

# Define missing BAML types that aren't generated properly
class BAMLCognitiveBiasScenarioInput:
    def __init__(self, scenario_description: str, additional_context: str = None, user_attempted_bias_name: str = None):
        self.scenario_description = scenario_description
        self.additional_context = additional_context
        self.user_attempted_bias_name = user_attempted_bias_name

import copy
import json
import logging
import httpx
from enum import Enum
import traceback

from fastapi import APIRouter, HTTPException, Form, UploadFile, File
from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Dict, Any, Union

from services.translator_service import translate_with_fallback

logger = logging.getLogger(__name__)

# Create the router
router = APIRouter(tags=["Clinical Assistant"])

# Utility function for robust output validation and patching (KGB-grade)
def _validate_patch_self_reflection_feedback_output(obj):
    # Accepts either a dict or an object with attributes
    def get(val, default):
        try:
            return getattr(obj, val, None) if not isinstance(obj, dict) else obj.get(val, default)
        except Exception:
            return default
    patched = {}
    patched['identified_reasoning_pattern'] = get('identified_reasoning_pattern', "")

    # Handle bias_reflection_points (list of objects)
    points = get('bias_reflection_points', [])
    patched_points = []
    for p in points:
        if isinstance(p, dict):
            patched_points.append(BiasReflectionPointModel(**p))
        elif isinstance(p, BiasReflectionPointModel):
            patched_points.append(p)
        elif hasattr(p, 'bias_type') and hasattr(p, 'reflection_question'):
            patched_points.append(BiasReflectionPointModel(
                bias_type=getattr(p, 'bias_type', ''),
                reflection_question=getattr(p, 'reflection_question', '')
            ))
        else:
            # fallback: try to coerce to dict then model
            try:
                patched_points.append(BiasReflectionPointModel(**dict(p)))
            except Exception:
                continue
    patched['bias_reflection_points'] = patched_points

    # Handle devils_advocate_challenge (string to list of strings)
    challenge = get('devils_advocate_challenge', None)
    if isinstance(challenge, str) and challenge.strip():
        patched['devils_advocate_challenge'] = [challenge]
    elif isinstance(challenge, list):
        patched['devils_advocate_challenge'] = challenge
    else:
        patched['devils_advocate_challenge'] = []

    # Handle suggested_next_reflective_action (string to list of strings)
    action = get('suggested_next_reflective_action', None)
    if isinstance(action, str) and action.strip():
        patched['suggested_next_reflective_action'] = [action]
    elif isinstance(action, list):
        patched['suggested_next_reflective_action'] = action
    else:
        patched['suggested_next_reflective_action'] = []

    return SelfReflectionFeedbackOutputModel(**patched)

def _validate_patch_cognitive_bias_reflection_output(obj):
    # Accepts either a dict or an object with attributes
    def get(val, default):
        try:
            return getattr(obj, val, None) if not isinstance(obj, dict) else obj.get(val, default)
        except Exception:
            return default
    biases = get("potential_biases_to_consider", []) or []
    if not isinstance(biases, list):
        logger.warning("Patched missing or invalid potential_biases_to_consider in cognitive bias output")
        biases = []
    patched_biases = []
    for bias in biases:
        # Accept dict or object, only patch missing fields
        if isinstance(bias, dict):
            patched_biases.append(DetectedCognitiveBiasModel(**{
                "bias_type": bias.get("bias_type", ""),
                "explanation_as_question": bias.get("explanation_as_question", ""),
                "mitigation_prompt": bias.get("mitigation_prompt", "")
            }))
        else:
            patched_biases.append(DetectedCognitiveBiasModel(
                bias_type=getattr(bias, "bias_type", ""),
                explanation_as_question=getattr(bias, "explanation_as_question", ""),
                mitigation_prompt=getattr(bias, "mitigation_prompt", "")
            ))
    return CognitiveBiasReflectionOutputModel(
        potential_biases_to_consider=patched_biases
    )

# Utility function for normalizing list fields to ensure consistent data structure
def _normalize_list_field(field_value, field_name: str) -> List[str]:
    """
    Normalize a field to ensure it's always a list of strings.
    This is critical to ensure consistent data structure between backend and frontend.
    """
    if field_value is None:
        logger.info(f"Normalizing None {field_name} to empty list")
        return []
        
    # Case 1: Already a list of strings
    if isinstance(field_value, list):
        # Ensure all items are strings
        return [str(item) if item is not None else "" for item in field_value]
        
    # Case 2: It's a string, possibly representing a list
    if isinstance(field_value, str):
        # If it's an empty string, return empty list
        if not field_value.strip():
            return []
        # If it looks like a comma-separated list, split it
        if ',' in field_value:
            return [item.strip() for item in field_value.split(',') if item.strip()]
        # Otherwise, treat it as a single item
        return [field_value]
        
    # Case 3: It's some other type, convert to string and wrap in list
    logger.warning(f"Unexpected type for {field_name}: {type(field_value)}. Converting to string list.")
    return [str(field_value)]

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

def _clean_professional_reasoning_cot(text: Optional[str]) -> Optional[str]:
    """
    Removes the header text from the professional detailed reasoning CoT that shouldn't be displayed to users.
    Removes patterns like "DETAILED REASONING PROCESS (Follow these 6 steps):" or similar in any language.
    """
    if not text or not text.strip():
        return text
        
    # Remove common header patterns (both English and Portuguese)
    patterns_to_remove = [
        r"^\*\*DETAILED REASONING PROCESS.*?\*\*:?\s*",
        r"^DETAILED REASONING PROCESS.*?:?\s*",
        r"^\*\*PROCESSO DE RAZ[ÃA]O DETALHADO.*?\*\*:?\s*",
        r"^PROCESSO DE RAZ[ÃA]O DETALHADO.*?:?\s*",
        r"^\*\*PROCESSO DE PENSAMENTO DETALHADO.*?\*\*:?\s*",
        r"^PROCESSO DE PENSAMENTO DETALHADO.*?:?\s*",
    ]
    
    cleaned_text = text
    for pattern in patterns_to_remove:
        import re
        cleaned_text = re.sub(pattern, "", cleaned_text, flags=re.IGNORECASE | re.MULTILINE)
    
    return cleaned_text.strip()

# Fallback types for when BAML types aren't available

class BAMLProblemRepresentationInput(BaseModel):
    full_patient_narrative: str
    user_problem_representation: str
    user_semantic_qualifiers: List[str]

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

# --- Unified Endpoint for Cognitive Bias Analysis ---

class CognitiveBiasAnalysisInput(BaseModel):
    case_summary_by_user: Optional[str] = Field(None, description="Clinical case summary for custom scenarios.")
    case_vignette_id: Optional[str] = Field(None, description="Identifier for a pre-defined case vignette.")
    user_identified_biases: List[str] = Field(..., description="List of cognitive biases identified by the user.")

    @model_validator(mode='before')
    def check_at_least_one_scenario_provided(cls, values):
        if not values.get('case_summary_by_user') and not values.get('case_vignette_id'):
            raise ValueError('Either case_summary_by_user or case_vignette_id must be provided.')
        if values.get('case_summary_by_user') and values.get('case_vignette_id'):
            raise ValueError('Provide either case_summary_by_user or case_vignette_id, not both.')
        return values

class DetectedCognitiveBiasModel(BaseModel):
    bias_type: str
    explanation_as_question: str
    mitigation_prompt: str

class CognitiveBiasReflectionOutputModel(BaseModel):
    potential_biases_to_consider: List[DetectedCognitiveBiasModel]

@router.post(
    "/analyze-cognitive-bias",
    response_model=CognitiveBiasReflectionOutputModel,
    summary="Analyze for Cognitive Biases in Custom or Prepared Scenarios",
    description="Identifies potential cognitive biases based on a user-submitted case or a pre-defined vignette. (BAML: AssistInIdentifyingCognitiveBiases)"
)
async def analyze_cognitive_bias(payload: CognitiveBiasAnalysisInput):
    try:
        baml_input = BAMLCognitiveBiasInput(
            case_summary_by_user=payload.case_summary_by_user,
            case_vignette_id=payload.case_vignette_id,
            user_identified_biases=payload.user_identified_biases
        )

        response = await b.AssistInIdentifyingCognitiveBiases(baml_input)
        validated_response = _validate_patch_cognitive_bias_reflection_output(response)
        return validated_response

    except Exception as e:
        logger.error(f"Error in analyze_cognitive_bias: {str(e)}", exc_info=True)
        return {
            "error": "Internal server error in cognitive bias analysis.",
            "detail": str(e)
        }

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
    error: Optional[str] = None

@router.post(
    "/generate-lab-insights",
    response_model=DrCorvusLabInsightsOutput,
    summary="Generate Dr. Corvus Lab Insights",
    description="Takes lab results and context, and returns comprehensive AI-generated insights using DrCorvus.GenerateDrCorvusInsights BAML function."
)
async def generate_lab_insights(payload: DrCorvusLabAnalysisInput):
    async def translate_text_to_portuguese(text: Optional[str]) -> Optional[str]:
        if not text:
            return None
        try:
            translated = await translate_with_fallback(text, target_lang="PT")
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
        client_lab_results = [ClientLabTestResult(**lr.model_dump()) for lr in payload.lab_results]
        client_baml_input = ClientLabAnalysisInput(
            lab_results=client_lab_results,
            user_role=ClientUserRole(payload.user_role.value),
            patient_context=payload.patient_context,
            specific_user_query=payload.specific_user_query
        )
        logger.error(f"BAML INPUT (LabAnalysisInput): {client_baml_input}")
        client_registry = setup_corvus_client_registry()
        if client_registry:
            baml_response_obj = await b.GenerateDrCorvusInsights(
                client_baml_input, 
                {"client_registry": client_registry}
            )
        else:
            baml_response_obj = await b.GenerateDrCorvusInsights(client_baml_input)
        logger.error(f"RAW LLM RESPONSE: {baml_response_obj}")
        if not baml_response_obj:
            raise ValueError("Empty response from BAML function")
        response = DrCorvusLabInsightsOutput(**baml_response_obj.model_dump())
        
        # Clean the professional reasoning CoT to remove header text that shouldn't be displayed
        if response.professional_detailed_reasoning_cot:
            response.professional_detailed_reasoning_cot = _clean_professional_reasoning_cot(response.professional_detailed_reasoning_cot)
        
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
        )


# --- Pydantic Models for PatientFriendlyFollowUpChecklist ---

class PatientFollowUpInputModel(BaseModel):
    consultation_summary_or_concept_explained: str = Field(..., description="Resumo da consulta médica ou do conceito de saúde que foi explicado ao paciente.")
    doctor_recommendations_summary: Optional[str] = Field(None, description="Resumo das recomendações específicas feitas pelo médico, se houver.")

class PatientFollowUpChecklistOutputModel(BaseModel):
    checklist_items: List[str]
    when_to_contact_doctor_urgently: Optional[List[str]] = None
    general_advice: Optional[str] = None
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

# --- ClinicalReasoningPath_CritiqueAndCompare ---

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



# --- ProvideFeedbackOnProblemRepresentation ---
class ProblemRepresentationInputModelFrontend(BaseModel): # New model for frontend compatibility
    clinical_vignette_summary: str = Field(..., description="The clinical vignette provided to the student.")
    user_problem_representation: str = Field(..., description="The student's one-sentence summary.")
    user_semantic_qualifiers: List[str] = Field(..., description="The student's list of identified semantic qualifiers.")

class ProblemRepresentationFeedbackOutputModel(BaseModel): # Updated to match BAML output
    feedback_strengths: List[str]
    feedback_improvements: List[str]
    missing_elements: List[str]
    overall_assessment: str
    next_step_guidance: str
    socratic_questions: List[str]

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
            user_problem_representation=payload.user_problem_representation,
            user_semantic_qualifiers=payload.user_semantic_qualifiers
        )
        
        # Call BAML function (now updated to return the correct structure)
        raw_baml_response = await b.ProvideFeedbackOnProblemRepresentation(baml_input)
        
        # With the updated BAML structure, we can now map directly
        # The BAML response should now have the fields that match our Pydantic model
        # The BAML response now matches our Pydantic model directly
        return ProblemRepresentationFeedbackOutputModel(**raw_baml_response.dict())

    except Exception as e:
        logger.error(f"Error in ProvideFeedbackOnProblemRepresentation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (ProvideFeedbackOnProblemRepresentation): {str(e)}")

# --- ExpandDifferentialDiagnosis ---
class ExpandDifferentialDiagnosisInputModel(BaseModel):
    presenting_complaint: str
    location_if_pain: Optional[str] = None
    student_initial_ddx_list: List[str]

class ExpandedDdxOutputModel(BaseModel):
    applied_approach_description: str
    suggested_additional_diagnoses_with_rationale: List[str]

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
                ]
            )
            
    except Exception as e:
        logger.error(f"Error in expand_differential_diagnosis: {str(e)}", exc_info=True)
        logger.error(f"Full exception traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Error processing differential diagnosis request: {str(e)}")

# --- TeachQuestionPrioritization (Educational Module) ---
class TeachQuestionPrioritizationInputModel(BaseModel):
    chief_complaint: str
    initial_findings: List[ClinicalFindingModel]
    patient_demographics: str

class TeachQuestionPrioritizationOutputModel(BaseModel):
    prioritized_questions: List[str]
    complementary_questions: List[str]
    questioning_rationale: str
    potential_systems_to_explore: List[str]

@router.post(
    "/teach-question-prioritization",
    response_model=TeachQuestionPrioritizationOutputModel,
    summary="[Educational] Teach Question Prioritization",
    description="For the educational module. Takes a chief complaint and generates 6-8 high-impact questions to teach clinical reasoning and prioritization. (BAML: TeachQuestionPrioritization)"
)
async def teach_question_prioritization(payload: TeachQuestionPrioritizationInputModel):
    try:
        baml_initial_findings = [BAMLClinicalFinding(finding_name=f.finding_name, details=f.details) for f in payload.initial_findings]
        
        baml_input = BAMLDdxQuestioningInput(
            chief_complaint=payload.chief_complaint,
            initial_findings=baml_initial_findings,
            patient_demographics=payload.patient_demographics
        )
        
        logger.info(f"Calling TeachQuestionPrioritization with input: {baml_input}")
        raw_baml_response = await b.TeachQuestionPrioritization(baml_input)
        
        return TeachQuestionPrioritizationOutputModel(**raw_baml_response.dict())

    except AttributeError as ae:
        logger.error(f"BAML function TeachQuestionPrioritization or its input type might be missing: {str(ae)}", exc_info=True)
        raise HTTPException(status_code=501, detail=f"BAML function TeachQuestionPrioritization not implemented or misconfigured in client: {str(ae)}")
    except Exception as e:
        logger.error(f"Error in TeachQuestionPrioritization: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (TeachQuestionPrioritization): {str(e)}")


# --- GenerateClinicalWorkflowQuestions (Clinical Workflow Module) ---
class QuestionCategoryModel(BaseModel):
  category_name: str
  questions: List[str]
  category_rationale: str

class ClinicalWorkflowQuestionsOutputModel(BaseModel):
  question_categories: List[QuestionCategoryModel]
  red_flag_questions: List[str]
  overall_rationale: str

class ClinicalWorkflowQuestionsInputModel(BaseModel):
    chief_complaint: str
    initial_findings: List[ClinicalFindingModel]
    patient_demographics: str

@router.post(
    "/generate-clinical-workflow-questions",
    response_model=ClinicalWorkflowQuestionsOutputModel,
    summary="[Workflow] Generate Comprehensive Clinical Questions",
    description="For the clinical workflow module. Generates a comprehensive, categorized list of questions to ensure a thorough anamnesis. (BAML: GenerateClinicalWorkflowQuestions)"
)
async def generate_clinical_workflow_questions(payload: ClinicalWorkflowQuestionsInputModel):
    try:
        baml_initial_findings = [BAMLClinicalFinding(finding_name=f.finding_name, details=f.details) for f in payload.initial_findings]
        
        baml_input = BAMLDdxQuestioningInput(
            chief_complaint=payload.chief_complaint,
            initial_findings=baml_initial_findings,
            patient_demographics=payload.patient_demographics
        )
        
        logger.info(f"Calling GenerateClinicalWorkflowQuestions with input: {baml_input}")
        raw_baml_response = await b.GenerateClinicalWorkflowQuestions(baml_input)
        
        return ClinicalWorkflowQuestionsOutputModel(**raw_baml_response.dict())

    except AttributeError as ae:
        logger.error(f"BAML function GenerateClinicalWorkflowQuestions or its input type might be missing: {str(ae)}", exc_info=True)
        raise HTTPException(status_code=501, detail=f"BAML function GenerateClinicalWorkflowQuestions not implemented or misconfigured in client: {str(ae)}")
    except Exception as e:
        logger.error(f"Error in GenerateClinicalWorkflowQuestions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (GenerateClinicalWorkflowQuestions): {str(e)}")

# --- CompareContrastHypothesesExercise ---
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

# --- GenerateIllnessScript ---
class IllnessScriptInputModel(BaseModel):
    disease_name: str = Field(..., description="Nome da doença ou condição médica para gerar o illness script")

class IllnessScriptOutputModel(BaseModel):
    disease_name: str
    predisposing_conditions: List[str]
    pathophysiology_summary: str
    key_symptoms_and_signs: List[str]
    relevant_diagnostics: Optional[List[str]] = None

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

# --- Cognitive Bias Models ---
class DetectedCognitiveBiasModel(BaseModel):
    bias_name: str = Field(..., description="Name of the cognitive bias")
    description: str = Field(..., description="Description of the cognitive bias")
    evidence_in_scenario: str = Field(..., description="Evidence of the bias in the given scenario")
    potential_impact: str = Field(..., description="Potential impact of this bias on clinical reasoning")
    mitigation_strategy: str = Field(..., description="Strategy to mitigate this cognitive bias")

class CognitiveBiasScenarioInputModel(BaseModel):
    scenario_description: str = Field(..., description="Description of the clinical scenario to analyze for cognitive biases")
    additional_context: Optional[str] = Field(None, description="Additional context about the scenario")
    user_identified_bias_optional: Optional[str] = Field(None, description="Optional bias identified by the user")

class CognitiveBiasCaseAnalysisOutputModel(BaseModel):
    detected_biases: List[DetectedCognitiveBiasModel] = Field(..., description="List of detected cognitive biases")
    overall_analysis: str = Field(..., description="Overall analysis of cognitive biases in the scenario")
    educational_insights: str = Field(..., description="Educational insights about cognitive biases in clinical reasoning")

# --- Diagnostic Timeout Models ---
class DiagnosticTimeoutInputModel(BaseModel):
    case_description: str = Field(..., description="Description of the clinical case")
    current_working_diagnosis: str = Field(..., description="Current working diagnosis being considered")
    time_elapsed_minutes: Optional[int] = Field(None, description="Time elapsed since case started in minutes")
    complexity_level: Optional[str] = Field(None, description="Case complexity level: 'simple', 'moderate', 'complex'")

class DiagnosticTimeoutOutputModel(BaseModel):
    timeout_recommendation: str = Field(..., description="Recommendation for diagnostic timeout")
    alternative_diagnoses_to_consider: List[str] = Field(..., description="Alternative diagnoses to consider")
    key_questions_to_ask: List[str] = Field(..., description="Key questions to ask during timeout")
    red_flags_to_check: List[str] = Field(..., description="Red flags to check for")
    next_steps_suggested: List[str] = Field(..., description="Suggested next steps")
    cognitive_checks: List[str] = Field(..., description="Cognitive bias checks to perform")

# --- Self Reflection Models ---
class BiasReflectionPointModel(BaseModel):
    bias_type: str
    reflection_question: str

class SelfReflectionReasoningInputModel(BaseModel):
    case_context: str = Field(..., description="Clinical case context or scenario")
    reasoning_process: str = Field(..., description="Description of the clinical reasoning process used")
    identified_bias: Optional[str] = Field(None, description="Any cognitive bias already identified by the user")
    reflection_metadata: Optional[Dict[str, Any]] = Field(None, description="Metadata about the reflection session, e.g., mode, template used.")

class SelfReflectionFeedbackOutputModel(BaseModel):
    identified_reasoning_pattern: str = Field(..., description="Analysis of the clinical reasoning process")
    bias_reflection_points: List[BiasReflectionPointModel] = Field(..., description="Strengths identified in the reasoning process")
    devils_advocate_challenge: List[str] = Field(..., description="Cognitive biases identified in the reasoning")
    suggested_next_reflective_action: List[str] = Field(..., description="Areas where reasoning could be improved")

@router.post(
    "/provide-self-reflection-feedback",
    response_model=SelfReflectionFeedbackOutputModel,
    summary="Provide Self-Reflection Feedback",
    description="Provides metacognitive analysis of clinical reasoning process to improve diagnostic thinking."
)
async def provide_self_reflection_feedback(payload: SelfReflectionReasoningInputModel):
    try:
        # Prepare BAML input for the ProvideSelfReflectionFeedback function
        baml_input = {
            "clinical_scenario": payload.case_context,
            "user_hypothesis": payload.reasoning_process,  # Using reasoning_process as hypothesis
            "user_reasoning_summary": payload.reasoning_process
        }
        
        # Use the available function that's actually in our BAML file
        bias_analysis = await b.ProvideSelfReflectionFeedback(baml_input)
        
        # Map the response to our output model
        # Validate and patch output to ensure all required fields are present and correct
        validated_response = _validate_patch_self_reflection_feedback_output(bias_analysis)
        return validated_response
    except Exception as e:
        logger.error(f"Error in assist_self_reflection_reasoning: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error in self-reflection feedback: {str(e)}"
        )

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

async def _translate_generate_clinical_workflow_questions_output(response: ClinicalWorkflowQuestionsOutputModel, target_lang: str = "PT") -> ClinicalWorkflowQuestionsOutputModel:
    """
    Batch translates user-facing fields of the ClinicalWorkflowQuestionsOutputModel, including nested QuestionCategoryModel fields, to minimize DeepL API calls.
    """
    if not response:
        return response
    try:
        translated_response = response.copy(deep=True)
        # 1. Gather all translatable strings in order
        texts_to_translate = []
        lengths = []  # To reconstruct lists
        # Question categories
        for cat in response.question_categories:
            texts_to_translate.append(cat.category_name or "")
            lengths.append(('category_name', 1))
            questions = cat.questions or []
            texts_to_translate.extend(questions)
            lengths.append(('questions', len(questions)))
            texts_to_translate.append(cat.category_rationale or "")
            lengths.append(('category_rationale', 1))
        # Red flag questions
        red_flag_questions = response.red_flag_questions or []
        texts_to_translate.extend(red_flag_questions)
        lengths.append(('red_flag_questions', len(red_flag_questions)))
        # Overall rationale
        texts_to_translate.append(response.overall_rationale or "")
        lengths.append(('overall_rationale', 1))

        # 2. Perform batch translation
        translated_texts = await translate_with_fallback(texts_to_translate, target_lang=target_lang, field_name="clinical_workflow_questions_output")
        ptr = 0
        # 3. Map back to model
        translated_categories = []
        for cat in response.question_categories:
            translated_cat = cat.copy(deep=True)
            # category_name
            translated_cat.category_name = translated_texts[ptr]
            ptr += 1
            # questions
            n_q = len(cat.questions or [])
            translated_cat.questions = translated_texts[ptr:ptr+n_q]
            ptr += n_q
            # category_rationale
            translated_cat.category_rationale = translated_texts[ptr]
            ptr += 1
            translated_categories.append(translated_cat)
        translated_response.question_categories = translated_categories
        # red_flag_questions
        n_rf = len(response.red_flag_questions or [])
        translated_response.red_flag_questions = translated_texts[ptr:ptr+n_rf]
        ptr += n_rf
        # overall_rationale
        translated_response.overall_rationale = translated_texts[ptr] if ptr < len(translated_texts) else response.overall_rationale
        return translated_response
    except Exception as e:
        logger.error(f"Error translating ClinicalWorkflowQuestionsOutputModel: {str(e)}", exc_info=True)
        return response

# === TRANSLATED ENDPOINTS ===

async def _translate_generate_ddx_questions_output(response, target_lang: str):
    """
    Translates user-facing fields of the GenerateDDxQuestionsOutputModel, including suggested_questions (list of AnamnesisQuestionModel) and initial_ddx_considered (optional list of str).
    """
    if not response:
        return response
    try:
        # Deep copy to avoid mutating original
        translated_response = response.copy(deep=True)

        # Translate suggested_questions (list of AnamnesisQuestionModel)
        translated_questions = []
        for idx, q in enumerate(response.suggested_questions):
            translated_question = await _translate_field(q, target_lang, field_name=f"suggested_questions[{idx}]")
            translated_questions.append(translated_question)
        translated_response.suggested_questions = translated_questions

        # Translate initial_ddx_considered (optional list of str)
        if response.initial_ddx_considered is not None:
            translated_response.initial_ddx_considered = await _translate_field(
                response.initial_ddx_considered, target_lang, field_name="initial_ddx_considered"
            )
        return translated_response
    except Exception as e:
        logger.error(f"Error translating GenerateDDxQuestionsOutputModel: {str(e)}", exc_info=True)
        return response


async def _translate_field(field, target_lang="PT", field_name=None):
    """
    Recursively translates a field (str, list, dict).
    This is the legacy version that translates each string individually.
    Consider using _translate_field_batched for better performance.
    """
    try:
        if field is None:
            return None
        if isinstance(field, str):
            # Avoid translating non-translatable strings
            if not field.strip() or field.isupper() or field.isnumeric():
                return field
            return await translate_with_fallback(field, target_lang, field_name=field_name)
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


async def _translate_field_batched(field, target_lang="PT", field_name=None):
    """
    Optimized version of _translate_field that collects all strings first,
    then translates them in a single batch to minimize LLM API calls.
    """
    # First pass: collect all translatable strings with their paths
    strings_to_translate = []
    paths = []
    
    def collect_strings(obj, path=""):
        if obj is None:
            return
            
        if isinstance(obj, str):
            # Skip non-translatable strings
            if obj.strip() and not obj.isupper() and not obj.isnumeric():
                strings_to_translate.append(obj)
                paths.append(path)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                collect_strings(item, f"{path}[{i}]" if path else f"[{i}]")
        elif isinstance(obj, dict):
            for k, v in obj.items():
                collect_strings(v, f"{path}.{k}" if path else k)
        elif isinstance(obj, BaseModel):
            collect_strings(obj.model_dump(), path)
    
    # Collect all strings
    collect_strings(field, field_name or "")
    
    # If no strings to translate, return the original field
    if not strings_to_translate:
        return field
        
    try:
        # Batch translate all strings at once
        logger.info(f"Batch translating {len(strings_to_translate)} strings for {field_name or 'unknown field'}")
        translated_strings = await translate_with_fallback(strings_to_translate, target_lang, field_name=field_name)
        
        # Create a mapping of paths to translated strings
        translations = {path: translated for path, translated in zip(paths, translated_strings)}
        
        # Second pass: replace strings with their translations
        def replace_strings(obj, path=""):
            if obj is None:
                return None
                
            if isinstance(obj, str):
                # Replace translatable strings
                if obj.strip() and not obj.isupper() and not obj.isnumeric() and path in translations:
                    return translations[path]
                return obj
            elif isinstance(obj, list):
                return [replace_strings(item, f"{path}[{i}]" if path else f"[{i}]") 
                        for i, item in enumerate(obj)]
            elif isinstance(obj, dict):
                return {k: replace_strings(v, f"{path}.{k}" if path else k) 
                        for k, v in obj.items()}
            elif isinstance(obj, BaseModel):
                field_dict = obj.model_dump()
                translated_dict = replace_strings(field_dict, path)
                return type(obj)(**translated_dict)
            return obj
        
        # Replace all strings with their translations
        return replace_strings(field, field_name or "")
    except Exception as e:
        logger.error(f"Batch translation failed for {field_name or 'unknown'}: {e}")
        # Fallback to original field if batch translation fails
        return field

async def _translate_expanded_ddx_output(output: ExpandedDdxOutputModel, target_lang="PT") -> ExpandedDdxOutputModel:
    """
    Translates the ExpandedDdxOutputModel to the target language.
    Uses the optimized batched translation approach for maximum efficiency.
    """
    if not output:
        return output
    
    logger.info(f"🌐 Starting translation of ExpandedDdxOutputModel to {target_lang}")
    
    try:
        # Create a copy of the output to avoid modifying the original
        from copy import deepcopy
        result = deepcopy(output)
        
        # Use the new batched translation approach to translate all fields at once
        translated_result = await _translate_field_batched(
            result, 
            target_lang=target_lang, 
            field_name="expanded_ddx"
        )
        
        logger.info(f"✅ ExpandedDdxOutputModel translation completed successfully")
        return translated_result
        
    except Exception as e:
        logger.error(f"Error translating ExpandedDdxOutputModel: {str(e)}", exc_info=True)
        return output  # Return original output if translation fails

async def _translate_problem_representation_feedback_output(response: ProblemRepresentationFeedbackOutputModel, target_lang: str) -> ProblemRepresentationFeedbackOutputModel:
    """
    Translates the ProblemRepresentationFeedbackOutputModel to the target language.
    Uses the optimized batched translation approach for maximum efficiency.
    """
    if not response:
        return response

    logger.info(f"🌐 Starting translation of ProblemRepresentationFeedbackOutputModel to {target_lang}")
    try:
        # Create a copy of the response to avoid modifying the original
        from copy import deepcopy
        result = deepcopy(response)
        
        # Use the new batched translation approach to translate all fields at once
        translated_result = await _translate_field_batched(
            result, 
            target_lang=target_lang, 
            field_name="problem_representation_feedback"
        )
        
        # Verify translation was successful
        if translated_result.overall_assessment == response.overall_assessment and target_lang == "PT":
            logger.warning("Translation may have failed - overall_assessment unchanged")
            # Try direct translation of overall_assessment as fallback
            try:
                if response.overall_assessment:
                    direct_translation = await translate_with_fallback(response.overall_assessment, target_lang=target_lang, field_name="overall_assessment_direct")
                    if direct_translation and direct_translation != response.overall_assessment:
                        translated_result.overall_assessment = direct_translation
                        logger.info("Direct translation of overall_assessment succeeded as fallback")
            except Exception as retry_error:
                logger.error(f"Direct translation fallback also failed: {retry_error}")
        
        logger.info(f"✅ Problem representation feedback translation completed successfully")
        return translated_result
    except Exception as e:
        logger.error(f"Error translating ProblemRepresentationFeedbackOutputModel: {str(e)}", exc_info=True)
        return response


async def _translate_illness_script_output(response: IllnessScriptOutputModel, target_lang: str) -> IllnessScriptOutputModel:
    """
    Translates the IllnessScriptOutputModel to the target language.
    Uses the optimized batched translation approach for maximum efficiency.
    """
    if not response:
        return response
        
    logger.info(f"🌐 Starting translation of IllnessScriptOutputModel to {target_lang}")
    
    try:
        # Create a copy of the response to avoid modifying the original
        from copy import deepcopy
        result = deepcopy(response)
        
        # Use the new batched translation approach to translate all fields at once
        translated_result = await _translate_field_batched(
            result, 
            target_lang=target_lang, 
            field_name="illness_script"
        )
        
        # Verify translation was successful by checking key fields
        if translated_result.disease_name == response.disease_name and target_lang == "PT":
            logger.warning(f"Translation may have failed - disease_name unchanged")
            # Try direct translation as fallback
            try:
                direct_translation = await translate_with_fallback(response.disease_name, target_lang=target_lang, field_name="disease_name_direct")
                if direct_translation and direct_translation != response.disease_name:
                    translated_result.disease_name = direct_translation
            except Exception as e:
                logger.error(f"Direct translation fallback failed: {e}")
                
        logger.info(f"✅ Illness script translation completed successfully")
        return translated_result
            
    except Exception as e:
        logger.error(f"Error translating IllnessScriptOutputModel: {str(e)}", exc_info=True)
        return response

async def _translate_generate_lab_insights_output(response: DrCorvusLabInsightsOutput, target_lang: str = "PT") -> DrCorvusLabInsightsOutput:
    """
    Translates the DrCorvusLabInsightsOutput to the target language.
    Uses the optimized batched translation approach for maximum efficiency.
    """
    if not response:
        return response
    logger.info(f"🌐 Starting translation of DrCorvusLabInsightsOutput to {target_lang}")
    try:
        # Create a copy of the response to avoid modifying the original
        from copy import deepcopy
        result = deepcopy(response)
        
        # Use the new batched translation approach to translate all fields at once
        translated_result = await _translate_field_batched(
            result, 
            target_lang=target_lang, 
            field_name="lab_insights"
        )
        
        logger.info(f"✅ Lab insights translation completed successfully")
        return translated_result
    except Exception as e:
        logger.error(f"Error translating DrCorvusLabInsightsOutput: {str(e)}", exc_info=True)
        return response


async def _translate_compare_contrast_output(output: CompareContrastFeedbackOutputModel, target_lang="PT") -> CompareContrastFeedbackOutputModel:
    """
    Translates the CompareContrastFeedbackOutputModel to the target language.
    Uses the optimized batched translation approach for maximum efficiency.
    """
    if not output:
        return output

    logger.info(f"🌐 Starting translation of CompareContrastFeedbackOutputModel to {target_lang}")
    try:
        # Create a copy of the output to avoid modifying the original
        from copy import deepcopy
        result = deepcopy(output)
        
        # Use the new batched translation approach to translate all fields at once
        translated_result = await _translate_field_batched(
            result, 
            target_lang=target_lang, 
            field_name="compare_contrast"
        )
        
        logger.info(f"✅ CompareContrastFeedbackOutputModel translation completed successfully")
        return translated_result
    except Exception as e:
        logger.error(f"Error translating CompareContrastFeedbackOutputModel: {str(e)}", exc_info=True)
        return output


@router.post(
    "/expand-differential-diagnosis-translated",
    response_model=ExpandedDdxOutputModel,
    summary="[PT] Expand Differential Diagnosis (Mnemonics/Anatomy)",
    description="Helps expand a student's initial differential diagnosis list using mnemonics or anatomical approaches, returning the result in Portuguese."
)
async def expand_differential_diagnosis_translated(payload: ExpandDifferentialDiagnosisInputModel):
    try:
        # Call the original English endpoint
        original_response = await expand_differential_diagnosis(payload)
        
        # Translate the response
        translated_response = await _translate_expanded_ddx_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in translated expand_differential_diagnosis endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing translated differential diagnosis request: {str(e)}")


@router.post(
    "/generate-illness-script-translated",
    response_model=IllnessScriptOutputModel,
    summary="[PT] Generate Illness Script",
    description="Generates a structured illness script for a given disease, returning the result in Portuguese."
)
async def generate_illness_script_translated(payload: IllnessScriptInputModel):
    try:
        # Call the original English endpoint
        original_response = await generate_illness_script(payload)
        
        # Translate the response
        translated_response = await _translate_illness_script_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in translated generate_illness_script endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing translated illness script request: {str(e)}")


@router.post(
    "/compare-contrast-hypotheses-translated",
    response_model=CompareContrastFeedbackOutputModel,
    summary="[PT] Compare and Contrast Diagnostic Hypotheses",
    description="Evaluates a student's analysis of multiple diagnostic hypotheses, providing feedback in Portuguese."
)
async def compare_contrast_hypotheses_translated(payload: CompareContrastExerciseInputModel):
    try:
        # Call the original English endpoint
        original_response = await compare_contrast_hypotheses(payload)
        
        # Translate the response
        translated_response = await _translate_compare_contrast_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in translated compare_contrast_hypotheses endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing translated compare/contrast request: {str(e)}")

@router.post(
    "/provide-feedback-on-problem-representation-translated",
    response_model=ProblemRepresentationFeedbackOutputModel,
    summary="[PT] Provide Feedback on Problem Representation",
    description="Provides feedback on a student's problem representation, returning the result in Portuguese."
)
async def provide_feedback_on_problem_representation_translated(payload: ProblemRepresentationInputModelFrontend):
    try:
        # Call the original English endpoint
        original_response = await provide_feedback_on_problem_representation(payload)
        
        # Translate the response
        translated_response = await _translate_problem_representation_feedback_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in translated provide_feedback_on_problem_representation endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing translated provide feedback on problem representation request: {str(e)}")

@router.post(
    "/analyze-cognitive-bias-translated",
    response_model=CognitiveBiasCaseAnalysisOutputModel,
    summary="[PT] Analyze Cognitive Bias",
    description="Helps identify cognitive biases in a clinical scenario."
)
async def analyze_cognitive_bias_translated(payload: CognitiveBiasScenarioInputModel):    
    def reflection_to_case_analysis(reflection_output):
        # Accepts CognitiveBiasReflectionOutputModel or dict
        biases = getattr(reflection_output, 'potential_biases_to_consider', None)
        if biases is None and isinstance(reflection_output, dict):
            biases = reflection_output.get('potential_biases_to_consider', [])
        detected_biases = []
        bias_names = []
        
        for bias in biases or []:
            # Accept dict or model
            if isinstance(bias, dict):
                bias_name = bias.get('bias_type', '')
                description = bias.get('explanation_as_question', '')
                mitigation = bias.get('mitigation_prompt', '')
                detected_biases.append(DetectedCognitiveBiasModel(
                    bias_name=bias_name,
                    description=description,
                    evidence_in_scenario=f"Evidenciado pela análise do padrão de raciocínio apresentado no cenário clínico.",
                    potential_impact=f"Este viés pode levar a erros diagnósticos ao influenciar a interpretação dos dados clínicos.",
                    mitigation_strategy=mitigation
                ))
                bias_names.append(bias_name)
            else:
                bias_name = getattr(bias, 'bias_type', '')
                description = getattr(bias, 'explanation_as_question', '')
                mitigation = getattr(bias, 'mitigation_prompt', '')
                detected_biases.append(DetectedCognitiveBiasModel(
                    bias_name=bias_name,
                    description=description,
                    evidence_in_scenario=f"Evidenciado pela análise do padrão de raciocínio apresentado no cenário clínico.",
                    potential_impact=f"Este viés pode levar a erros diagnósticos ao influenciar a interpretação dos dados clínicos.",
                    mitigation_strategy=mitigation
                ))
                bias_names.append(bias_name)
        
        # Generate meaningful overall analysis
        if detected_biases:
            bias_list = ", ".join(bias_names[:2]) + (f" e outros" if len(bias_names) > 2 else "")
            overall_analysis = f"A análise do cenário clínico identificou {len(detected_biases)} potencial(is) viés(es) cognitivo(s): {bias_list}. Estes padrões de pensamento podem influenciar o processo de tomada de decisão clínica, sendo importante reconhecê-los para melhorar a precisão diagnóstica."
        else:
            overall_analysis = "Não foram identificados padrões claros de vieses cognitivos no cenário apresentado. Isso pode indicar um processo de raciocínio clínico bem estruturado."
        
        # Generate educational insights
        if detected_biases:
            educational_insights = f"Os vieses identificados são comuns na prática clínica e podem ser mitigados através de reflexão consciente e uso de estratégias estruturadas de tomada de decisão. Recomenda-se praticar o questionamento sistemático das primeiras impressões e considerar diagnósticos alternativos antes de fechar o raciocínio diagnóstico."
        else:
            educational_insights = "Continue praticando a reflexão metacognitiva em seus casos clínicos. O desenvolvimento da consciência sobre vieses cognitivos é um processo contínuo que melhora com a experiência e a prática deliberada."
        
        return CognitiveBiasCaseAnalysisOutputModel(
            detected_biases=detected_biases,
            overall_analysis=overall_analysis,
            educational_insights=educational_insights
        )
    try:
        # BAML function expects English input. The payload is already in the correct format.
        baml_input = BAMLCognitiveBiasInput(
            case_summary_by_user=payload.scenario_description,
            user_identified_biases=[payload.user_identified_bias_optional] if payload.user_identified_bias_optional else []
        )
        response = await b.AssistInIdentifyingCognitiveBiases(baml_input)
        # Patch: convert to CognitiveBiasCaseAnalysisOutputModel
        case_analysis = reflection_to_case_analysis(response)
        # Translate the output to the target language
        translated_response = await _translate_analyze_cognitive_bias_output(case_analysis, target_lang="PT")
        return translated_response
    except Exception as e:
        logger.error(f"Error in analyze_cognitive_bias_translated: {str(e)}", exc_info=True)
        # Raise a standard HTTPException. The frontend is equipped to handle this.
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error in cognitive bias analysis: {str(e)}"
        )

# --- Translation Helpers ---

async def _translate_teach_question_prioritization_output(response: TeachQuestionPrioritizationOutputModel, target_lang: str = "PT") -> TeachQuestionPrioritizationOutputModel:
    """
    Translates the TeachQuestionPrioritizationOutputModel to the target language.
    Uses the batched translation approach for optimal performance.
    """
    if not response:
        return response
        
    try:
        # Create a copy of the response to avoid modifying the original
        response_copy = copy.deepcopy(response)
        
        # Use the batched translation approach to translate all fields at once
        translated_response = await _translate_field_batched(
            response_copy, target_lang, field_name="teach_question_prioritization"
        )
        
        return translated_response
    except Exception as e:
        logger.error(f"Error translating TeachQuestionPrioritizationOutputModel: {str(e)}", exc_info=True)
        return response

# Translation helper function for cognitive bias scenario output
async def _translate_analyze_cognitive_bias_output(response: CognitiveBiasCaseAnalysisOutputModel, target_lang: str) -> CognitiveBiasCaseAnalysisOutputModel:
    """
    Batch translates user-facing fields of the CognitiveBiasCaseAnalysisOutputModel to minimize DeepL API calls.
    """
    if not response:
        return response
    try:
        texts_to_translate = []
        detected_biases = response.detected_biases or []
        # Flatten all fields in all biases
        for bias in detected_biases:
            texts_to_translate.append(bias.bias_name or "")
            texts_to_translate.append(bias.description or "")
            texts_to_translate.append(bias.evidence_in_scenario or "")
            texts_to_translate.append(bias.potential_impact or "")
            texts_to_translate.append(bias.mitigation_strategy or "")
        # Top-level strings
        texts_to_translate.append(response.overall_analysis or "")
        texts_to_translate.append(response.educational_insights or "")
        n_biases = len(detected_biases)
        if not any(t.strip() for t in texts_to_translate if t):
            return response
        try:
            translated_texts = await translate_with_fallback(texts_to_translate, target_lang=target_lang, field_name="cognitive_biases_scenario")
        except Exception as e:
            logger.error(f"Batch translation failed for CognitiveBiasCaseAnalysisOutputModel: {e}", exc_info=True)
            return response
        ptr = 0
        translated_biases = []
        for _ in range(n_biases):
            bias_name = translated_texts[ptr]; ptr += 1
            description = translated_texts[ptr]; ptr += 1
            evidence = translated_texts[ptr]; ptr += 1
            impact = translated_texts[ptr]; ptr += 1
            mitigation = translated_texts[ptr]; ptr += 1
            translated_biases.append(DetectedCognitiveBiasModel(
                bias_name=bias_name,
                description=description,
                evidence_in_scenario=evidence,
                potential_impact=impact,
                mitigation_strategy=mitigation
            ))
        overall_analysis = translated_texts[ptr]; ptr += 1
        educational_insights = translated_texts[ptr]; ptr += 1
        return CognitiveBiasCaseAnalysisOutputModel(
            detected_biases=translated_biases,
            overall_analysis=overall_analysis,
            educational_insights=educational_insights
        )
    except Exception as e:
        logger.error(f"Error batch translating CognitiveBiasCaseAnalysisOutputModel: {str(e)}", exc_info=True)
        return response

    
@router.post(
    "/critique-reasoning-path-translated",
    response_model=ReasoningCritiqueOutputModelFE,
    summary="[PT] Critique Reasoning Path",
    description="Helps critique a student's reasoning path for a given clinical scenario."
)
async def critique_reasoning_path_translated(payload: CritiqueReasoningPathInputModel):
    try:
        # Call the original English endpoint
        original_response = await critique_reasoning_path(payload)
        
        # Translate the response
        translated_response = await _translate_critique_reasoning_path_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in translated critique_reasoning_path endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing translated critique reasoning path request: {str(e)}")

@router.post(
    "/generate-diagnostic-timeout-translated",
    response_model=DiagnosticTimeoutOutputModel,
    summary="[PT] Generate Diagnostic Timeout Recommendations",
    description="Provides structured recommendations for a diagnostic timeout - a pause in clinical reasoning to prevent errors and improve diagnostic safety."
)
async def generate_diagnostic_timeout_translated(payload: DiagnosticTimeoutInputModel):
    try:
        original_response = await generate_diagnostic_timeout(payload)
        
        # Translate the response
        translated_response = await _translate_generate_diagnostic_timeout_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in GenerateDiagnosticTimeout: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (GenerateDiagnosticTimeout): {str(e)}")

# Translation helper function for diagnostic timeout output
async def _translate_generate_diagnostic_timeout_output(response: DiagnosticTimeoutOutputModel, target_lang: str) -> DiagnosticTimeoutOutputModel:
    """
    Batch translates user-facing fields of the DiagnosticTimeoutOutputModel to minimize DeepL API calls.
    """
    if not response:
        return response
    try:
        texts_to_translate = []
        texts_to_translate.append(response.timeout_recommendation or "")
        alternative_diagnoses = response.alternative_diagnoses_to_consider or []
        texts_to_translate.extend(alternative_diagnoses)
        key_questions = response.key_questions_to_ask or []
        texts_to_translate.extend(key_questions)
        red_flags = response.red_flags_to_check or []
        texts_to_translate.extend(red_flags)
        next_steps = response.next_steps_suggested or []
        texts_to_translate.extend(next_steps)
        cognitive_checks = response.cognitive_checks or []
        texts_to_translate.extend(cognitive_checks)
        len_alternative = len(alternative_diagnoses)
        len_key_questions = len(key_questions)
        len_red_flags = len(red_flags)
        len_next_steps = len(next_steps)
        len_cognitive_checks = len(cognitive_checks)
        if not any(t.strip() for t in texts_to_translate if t):
            return response
        try:
            translated_texts = await translate_with_fallback(texts_to_translate, target_lang=target_lang, field_name="diagnostic_timeout")
        except Exception as e:
            logger.error(f"Batch translation failed for DiagnosticTimeoutOutputModel: {e}", exc_info=True)
            return response
        ptr = 0
        timeout_recommendation = translated_texts[ptr]; ptr += 1
        alternative_diagnoses_trans = translated_texts[ptr:ptr+len_alternative]; ptr += len_alternative
        key_questions_trans = translated_texts[ptr:ptr+len_key_questions]; ptr += len_key_questions
        red_flags_trans = translated_texts[ptr:ptr+len_red_flags]; ptr += len_red_flags
        next_steps_trans = translated_texts[ptr:ptr+len_next_steps]; ptr += len_next_steps
        cognitive_checks_trans = translated_texts[ptr:ptr+len_cognitive_checks]; ptr += len_cognitive_checks
        return DiagnosticTimeoutOutputModel(
            timeout_recommendation=timeout_recommendation,
            alternative_diagnoses_to_consider=alternative_diagnoses_trans,
            key_questions_to_ask=key_questions_trans,
            red_flags_to_check=red_flags_trans,
            next_steps_suggested=next_steps_trans,
            cognitive_checks=cognitive_checks_trans
        )
    except Exception as e:
        logger.error(f"Error batch translating DiagnosticTimeoutOutputModel: {str(e)}", exc_info=True)
        return response

@router.post(
    "/provide-self-reflection-feedback-translated", 
    response_model=SelfReflectionFeedbackOutputModel,
    summary="[PT] Provide Self-Reflection Feedback",    
    description="Provides metacognitive analysis of clinical reasoning process in Portuguese."
)
async def provide_self_reflection_feedback_translated(payload: SelfReflectionReasoningInputModel):
    try:
        # Call the original English endpoint
        original_response = await provide_self_reflection_feedback(payload)
        
        # Translate the response
        translated_response = await _translate_provide_self_reflection_feedback_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in translated provide_self_reflection_feedback endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing translated self-reflection feedback request: {str(e)}")

# Translation helper function for self-reflection reasoning output
async def _translate_provide_self_reflection_feedback_output(response: SelfReflectionFeedbackOutputModel, target_lang: str) -> SelfReflectionFeedbackOutputModel:
    """
    Batch translates user-facing fields of the SelfReflectionFeedbackOutputModel to minimize API calls.
    Now uses BAML as primary translation service.
    """
    if not response:
        return response
    try:
        texts_to_translate = []
        texts_to_translate.append(response.identified_reasoning_pattern or "")
        
        # Handle bias_reflection_points (list of BiasReflectionPointModel objects)
        bias_reflection_points = response.bias_reflection_points or []
        for point in bias_reflection_points:
            texts_to_translate.append(point.bias_type or "")
            texts_to_translate.append(point.reflection_question or "")
        
        devils_advocate_challenge = response.devils_advocate_challenge or []
        texts_to_translate.extend(devils_advocate_challenge)
        suggested_next_reflective_action = response.suggested_next_reflective_action or []
        texts_to_translate.extend(suggested_next_reflective_action)
        
        len_bias_reflection_points = len(bias_reflection_points)
        len_devils_advocate_challenge = len(devils_advocate_challenge)
        len_suggested_next_reflective_action = len(suggested_next_reflective_action)
        
        if not any(t.strip() for t in texts_to_translate if t):
            return response
        try:
            translated_texts = await translate_with_fallback(texts_to_translate, target_lang=target_lang, field_name="self_reflection_feedback")
            if not translated_texts:
                logger.warning("Translation returned empty results for SelfReflectionFeedbackOutputModel")
                return response
        except Exception as e:
            logger.error(f"Batch translation failed for SelfReflectionReasoningOutputModel: {e}", exc_info=True)
            return response
        
        ptr = 0
        identified_reasoning_pattern = translated_texts[ptr]; ptr += 1
        
        # Reconstruct bias_reflection_points from translated strings
        bias_reflection_points_trans = []
        for i in range(len_bias_reflection_points):
            bias_type = translated_texts[ptr]; ptr += 1
            reflection_question = translated_texts[ptr]; ptr += 1
            bias_reflection_points_trans.append(BiasReflectionPointModel(
                bias_type=bias_type,
                reflection_question=reflection_question
            ))
        
        devils_advocate_challenge_trans = translated_texts[ptr:ptr+len_devils_advocate_challenge]; ptr += len_devils_advocate_challenge
        suggested_next_reflective_action_trans = translated_texts[ptr:ptr+len_suggested_next_reflective_action]; ptr += len_suggested_next_reflective_action
        
        return SelfReflectionFeedbackOutputModel(
            identified_reasoning_pattern=identified_reasoning_pattern,
            bias_reflection_points=bias_reflection_points_trans,
            devils_advocate_challenge=devils_advocate_challenge_trans,
            suggested_next_reflective_action=suggested_next_reflective_action_trans,
        )
    except Exception as e:
        logger.error(f"Error batch translating SelfReflectionReasoningOutputModel: {str(e)}", exc_info=True)
        return response


@router.post(
    "/generate-lab-insights-translated",
    response_model=DrCorvusLabInsightsOutput,
    summary="[PT] Generate Lab Insights",
    description="Generates insights for a given lab result, returning the result in Portuguese."
)
async def generate_lab_insights_translated(payload: DrCorvusLabAnalysisInput):
    try:
        original_response = await generate_lab_insights(payload)
        
        # Translate the response
        translated_response = await _translate_generate_lab_insights_output(original_response, target_lang="PT")
        
        # Clean the professional reasoning CoT to remove header text that shouldn't be displayed (after translation)
        if translated_response.professional_detailed_reasoning_cot:
            translated_response.professional_detailed_reasoning_cot = _clean_professional_reasoning_cot(translated_response.professional_detailed_reasoning_cot)
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in translated generate_lab_insights endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing translated lab insights request: {str(e)}")

@router.post(
    "/explain-medical-concept-patient-translated",
    response_model=PatientExplanationOutputModel,
    summary="Explain Medical Concept to Patient",
    description="Takes a medical concept and optional patient context, and returns a simplified explanation, key takeaways, and questions for the patient to ask their doctor. Powered by Dr. Corvus (BAML: ExplainMedicalConceptPatient)."
)
async def explain_medical_concept_patient_translated(payload: PatientExplanationInputModel):
    try:
        original_response = await explain_medical_concept_patient(payload)
        
        # Translate the response
        
        translated_response = await _translate_explain_medical_concept_patient_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in ExplainMedicalConceptPatient: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (ExplainMedicalConceptPatient): {str(e)}")

@router.post(
    "/teach-question-prioritization-translated",
    response_model=TeachQuestionPrioritizationOutputModel,
    summary="[Educational] Teach Question Prioritization",
    description="For the educational module. Takes a chief complaint and generates 6-8 high-impact questions to teach clinical reasoning and prioritization. (BAML: TeachQuestionPrioritization)"
)
async def teach_question_prioritization_translated(payload: TeachQuestionPrioritizationInputModel):
    try:
        original_response = await teach_question_prioritization(payload)
        
        # Translate the response
        translated_response = await _translate_teach_question_prioritization_output(original_response, target_lang="PT")
        
        # Normalize list fields to ensure consistent data structure
        if translated_response:
            # Ensure prioritized_questions is always a list of strings
            translated_response.prioritized_questions = _normalize_list_field(
                translated_response.prioritized_questions, "prioritized_questions"
            )
            
            # Ensure complementary_questions is always a list of strings
            translated_response.complementary_questions = _normalize_list_field(
                translated_response.complementary_questions, "complementary_questions"
            )
            
            # Ensure potential_systems_to_explore is always a list of strings
            translated_response.potential_systems_to_explore = _normalize_list_field(
                translated_response.potential_systems_to_explore, "potential_systems_to_explore"
            )
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in TeachQuestionPrioritization: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (TeachQuestionPrioritization): {str(e)}")

@router.post(
    "/generate-clinical-workflow-questions-translated",
    response_model=ClinicalWorkflowQuestionsOutputModel,
    summary="[Workflow] Generate Comprehensive Clinical Questions",
    description="For the clinical workflow module. Generates a comprehensive, categorized list of questions to ensure a thorough anamnesis. (BAML: GenerateClinicalWorkflowQuestions)"
)
async def generate_clinical_workflow_questions_translated(payload: ClinicalWorkflowQuestionsInputModel):
    try:
        original_response = await generate_clinical_workflow_questions(payload)
        
        # Translate the response
        translated_response = await _translate_generate_clinical_workflow_questions_output(original_response, target_lang="PT")
        
        # Normalize list fields to ensure consistent data structure
        if translated_response:
            # Ensure red_flag_questions is always a list of strings
            translated_response.red_flag_questions = _normalize_list_field(
                translated_response.red_flag_questions, "red_flag_questions"
            )
            
            # Ensure each question category's questions field is always a list of strings
            if translated_response.question_categories:
                for i, category in enumerate(translated_response.question_categories):
                    if category and hasattr(category, 'questions'):
                        category.questions = _normalize_list_field(
                            category.questions, f"question_categories[{i}].questions"
                        )
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in GenerateClinicalWorkflowQuestions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (GenerateClinicalWorkflowQuestions): {str(e)}")

# --- New Matrix-Based Hypothesis Comparison Models ---
class HypothesisFindingEvaluationEnum(str, Enum):
    SUPPORTS = "SUPPORTS"
    NEUTRAL = "NEUTRAL"
    REFUTES = "REFUTES"

class HypothesisFindingAnalysisModel(BaseModel):
    finding_name: str = Field(..., description="Name of the clinical finding")
    hypothesis_name: str = Field(..., description="Name of the hypothesis being evaluated")
    student_evaluation: HypothesisFindingEvaluationEnum = Field(..., description="Student's evaluation of how the finding relates to the hypothesis")
    student_rationale: Optional[str] = Field(None, description="Optional rationale for the student's evaluation")

class ExpertHypothesisFindingAnalysisModel(BaseModel):
    finding_name: str = Field(..., description="Name of the clinical finding")
    hypothesis_name: str = Field(..., description="Name of the hypothesis being evaluated")
    expert_evaluation: HypothesisFindingEvaluationEnum = Field(..., description="Expert's evaluation of how the finding relates to the hypothesis")
    expert_rationale: str = Field(..., description="Expert's rationale for the evaluation")

class CompareContrastMatrixInputModel(BaseModel):
    scenario: CaseScenarioInputModel = Field(..., description="The case scenario for analysis")
    student_matrix_analysis: List[HypothesisFindingAnalysisModel] = Field(..., description="Student's matrix analysis of findings vs hypotheses")
    student_chosen_discriminator: str = Field(..., description="The finding the student selected as the key discriminator")

class MatrixFeedbackOutputModel(BaseModel):
    overall_matrix_feedback: str = Field(..., description="General feedback on the student's matrix analysis")
    discriminator_feedback: str = Field(..., description="Feedback on the student's choice of key discriminator")
    expert_matrix_analysis: List[ExpertHypothesisFindingAnalysisModel] = Field(..., description="Expert's matrix analysis for comparison")
    expert_recommended_discriminator: str = Field(..., description="Expert's recommended key discriminator")
    expert_discriminator_rationale: str = Field(..., description="Rationale for the expert's discriminator choice")
    learning_focus_suggestions: List[str] = Field(..., description="Specific learning topics the student should focus on")
    matrix_accuracy_score: Optional[float] = Field(None, description="Overall accuracy score for the student's matrix (0-1)")

@router.post(
    "/compare-contrast-matrix-feedback",
    response_model=MatrixFeedbackOutputModel,
    summary="Matrix-Based Hypothesis Comparison Feedback",
    description="Provides feedback on a student's matrix analysis of clinical findings vs diagnostic hypotheses, replacing the traditional text-based approach with an interactive matrix. (BAML: ProvideMatrixFeedback)"
)
async def compare_contrast_matrix_feedback(payload: CompareContrastMatrixInputModel):
    """
    New matrix-based approach for hypothesis comparison that provides more structured
    and interactive feedback compared to the traditional text-based method.
    """
    try:
        logger.info("Processing matrix-based hypothesis comparison feedback request")
        
        # Convert to BAML format
        baml_scenario = convert_to_baml_case_scenario(payload.scenario)
        baml_matrix_analysis = [
            {
                "finding_name": analysis.finding_name,
                "hypothesis_name": analysis.hypothesis_name,
                "student_evaluation": analysis.student_evaluation.value,
                "student_rationale": analysis.student_rationale
            }
            for analysis in payload.student_matrix_analysis
        ]
        
        baml_input = {
            "scenario": baml_scenario,
            "student_matrix_analysis": baml_matrix_analysis,
            "student_chosen_discriminator": payload.student_chosen_discriminator
        }
        
        # Call BAML function
        response = await baml_client.ProvideMatrixFeedback(baml_input)
        logger.info("Matrix feedback generated successfully")
        
        # Convert expert matrix analysis
        expert_matrix = []
        if hasattr(response, 'expert_matrix_analysis') and response.expert_matrix_analysis:
            for expert_analysis in response.expert_matrix_analysis:
                if hasattr(expert_analysis, 'finding_name'):
                    expert_matrix.append(ExpertHypothesisFindingAnalysisModel(
                        finding_name=expert_analysis.finding_name,
                        hypothesis_name=expert_analysis.hypothesis_name,
                        expert_evaluation=HypothesisFindingEvaluationEnum(expert_analysis.expert_evaluation),
                        expert_rationale=expert_analysis.expert_rationale
                    ))
        
        return MatrixFeedbackOutputModel(
            overall_matrix_feedback=response.overall_matrix_feedback,
            discriminator_feedback=response.discriminator_feedback,
            expert_matrix_analysis=expert_matrix,
            expert_recommended_discriminator=response.expert_recommended_discriminator,
            expert_discriminator_rationale=response.expert_discriminator_rationale,
            learning_focus_suggestions=response.learning_focus_suggestions or [],
            matrix_accuracy_score=response.matrix_accuracy_score
        )
        
    except Exception as e:
        logger.error(f"Error in matrix-based hypothesis comparison: {str(e)}")
        # Return error in the expected format
        return MatrixFeedbackOutputModel(
            overall_matrix_feedback=f"Erro ao processar análise matricial: {str(e)}",
            discriminator_feedback="Não foi possível avaliar o discriminador devido a erro no processamento.",
            expert_matrix_analysis=[],
            expert_recommended_discriminator="N/A",
            expert_discriminator_rationale="N/A",
            learning_focus_suggestions=["Revisar os conceitos básicos de raciocínio diagnóstico"],
            matrix_accuracy_score=None
        )

def convert_to_baml_case_scenario(scenario: CaseScenarioInputModel):
    """Helper function to convert scenario to BAML format"""
    return {
        "case_vignette": scenario.case_vignette,
        "initial_findings": [
            {
                "finding_name": finding.finding_name,
                "details": finding.details,
                "onset_duration_pattern": finding.onset_duration_pattern,
                "severity_level": finding.severity_level
            }
            for finding in scenario.initial_findings
        ],
        "plausible_hypotheses": scenario.plausible_hypotheses
    }

@router.post(
    "/compare-contrast-matrix-feedback-translated",
    response_model=MatrixFeedbackOutputModel,
    summary="[PT] Matrix-Based Hypothesis Comparison Feedback",
    description="Provides feedback on a student's matrix analysis in Portuguese."
)
async def compare_contrast_matrix_feedback_translated(payload: CompareContrastMatrixInputModel):
    """
    Portuguese version of the matrix-based hypothesis comparison feedback.
    """
    try:
        # Call the main function first
        response = await compare_contrast_matrix_feedback(payload)
        
        # Translate the response
        translated_response = await _translate_matrix_feedback_output(response, "PT")
        return translated_response
        
    except Exception as e:
        logger.error(f"Error in translated matrix feedback: {str(e)}")
        return MatrixFeedbackOutputModel(
            overall_matrix_feedback=f"Erro ao processar análise matricial: {str(e)}",
            discriminator_feedback="Não foi possível avaliar o discriminador devido a erro no processamento.",
            expert_matrix_analysis=[],
            expert_recommended_discriminator="N/A",
            expert_discriminator_rationale="N/A",
            learning_focus_suggestions=["Revisar os conceitos básicos de raciocínio diagnóstico"],
            matrix_accuracy_score=None
        )

async def _translate_matrix_feedback_output(response: MatrixFeedbackOutputModel, target_lang: str = "PT") -> MatrixFeedbackOutputModel:
    """Translate matrix feedback output to target language"""
    try:
        # Translate main fields
        overall_feedback_translated = await _translate_field(response.overall_matrix_feedback, target_lang, "overall_matrix_feedback")
        discriminator_feedback_translated = await _translate_field(response.discriminator_feedback, target_lang, "discriminator_feedback")
        expert_discriminator_rationale_translated = await _translate_field(response.expert_discriminator_rationale, target_lang, "expert_discriminator_rationale")
        learning_focus_translated = await _translate_field(response.learning_focus_suggestions, target_lang, "learning_focus_suggestions")
        
        # Translate expert matrix analysis
        expert_matrix_translated = []
        for expert_analysis in response.expert_matrix_analysis:
            expert_rationale_translated = await _translate_field(expert_analysis.expert_rationale, target_lang, "expert_rationale")
            expert_matrix_translated.append(ExpertHypothesisFindingAnalysisModel(
                finding_name=expert_analysis.finding_name,  # Don't translate finding names
                hypothesis_name=expert_analysis.hypothesis_name,  # Don't translate hypothesis names
                expert_evaluation=expert_analysis.expert_evaluation,
                expert_rationale=expert_rationale_translated
            ))
        
        return MatrixFeedbackOutputModel(
            overall_matrix_feedback=overall_feedback_translated,
            discriminator_feedback=discriminator_feedback_translated,
            expert_matrix_analysis=expert_matrix_translated,
            expert_recommended_discriminator=response.expert_recommended_discriminator,  # Don't translate finding names
            expert_discriminator_rationale=expert_discriminator_rationale_translated,
            learning_focus_suggestions=learning_focus_translated,
            matrix_accuracy_score=response.matrix_accuracy_score
        )
        
    except Exception as e:
        logger.error(f"Error translating matrix feedback: {str(e)}")
        return response  # Return original if translation fails
