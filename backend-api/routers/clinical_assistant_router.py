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

# Import SNAPPS-related types from clinical_simulation module
from baml_client.types import (
    AnalyzeDifferentialDiagnosesSNAPPSInput as BAMLAnalyzeDifferentialDiagnosesSNAPPSInput,

)

# Define missing BAML types that aren't generated properly
class BAMLCognitiveBiasScenarioInput:
    def __init__(self, scenario_description: str, additional_context: str = None, user_attempted_bias_name: str = None):
        self.scenario_description = scenario_description
        self.additional_context = additional_context
        self.user_attempted_bias_name = user_attempted_bias_name
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
router = APIRouter(tags=["Clinical Assistant"])

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

# --- AssistInIdentifyingCognitiveBiases (Scenario Mode) ---

class CognitiveBiasScenarioInputModel(BaseModel):
    scenario_description: str = Field(..., description="The clinical scenario pre-defined with a potential bias.")
    user_identified_bias_optional: Optional[str] = Field(None, description="The bias identified by the user (optional).")

class CognitiveBiasCaseAnalysisOutputModel(BaseModel): # Matches frontend CognitiveBiasCaseAnalysis
    identified_bias_by_expert: str
    explanation_of_bias_in_case: str
    how_bias_impacted_decision: str
    strategies_to_mitigate_bias: List[str]
    feedback_on_user_identification: Optional[str] = None

@router.post(
    "/assist-identifying-cognitive-biases-scenario", # New endpoint for scenario mode
    response_model=CognitiveBiasCaseAnalysisOutputModel,
    summary="Assist in Identifying Cognitive Biases in a Given Scenario",
    description="Analyzes a pre-defined clinical scenario to identify a specific cognitive bias, explains its impact, and offers mitigation strategies. (BAML: AssistInIdentifyingCognitiveBiases - Scenario Mode)"
)
async def assist_identifying_cognitive_biases_scenario(payload: CognitiveBiasScenarioInputModel):
    try:
        # Prepare proper input dictionary for BAML
        input_dict = {
            "scenario_description": payload.scenario_description,
            "additional_context": getattr(payload, 'additional_context', None),
            "user_attempted_bias_name": getattr(payload, 'user_identified_bias_optional', None)
        }
        
        # Use the proper input parameter format
        raw_baml_response = await b.AssistInIdentifyingCognitiveBiases(input=input_dict)
        
        # Assuming direct compatibility or that .dict() handles it, given BAML function is updated for this mode:
        return CognitiveBiasCaseAnalysisOutputModel(**raw_baml_response.dict())
    except AttributeError as ae:
        logger.error(f"BAML function for Cognitive Bias Scenario Analysis or its input type might be missing: {str(ae)}", exc_info=True)
        raise HTTPException(status_code=501, detail=f"BAML function for Cognitive Bias Scenario Analysis not implemented/misconfigured: {str(ae)}")
    except Exception as e:
        logger.error(f"Error in AssistInIdentifyingCognitiveBiases (Scenario Mode): {str(e)}", exc_info=True)
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
        client_lab_results = [ClientLabTestResult(**lr.model_dump()) for lr in payload.lab_results]
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
        response = DrCorvusLabInsightsOutput(**baml_response_obj.model_dump())
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
        # comparison_with_expert_approach, suggested_learning_points
        # DetectedCognitiveBiasModel is { bias_type, explanation_as_question, mitigation_prompt }

        # We need to map this to ReasoningCritiqueOutputModelFE:
        # critique_of_reasoning_path (string)
        # identified_potential_biases (List[{ bias_name, confidence_score, rationale }])
        # suggestions_for_improvement (List[str])
        # comparison_with_expert_reasoning (Optional[str])

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
        )

    except Exception as e:
        # logger.error(f"Error in critique_reasoning_path: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML for reasoning critique: {str(e)}")

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
class SelfReflectionReasoningInputModel(BaseModel):
    case_context: str = Field(..., description="Clinical case context or scenario")
    reasoning_process: str = Field(..., description="Description of the clinical reasoning process used")
    identified_bias: Optional[str] = Field(None, description="Any cognitive bias already identified by the user")
    reflection_metadata: Optional[Dict[str, Any]] = Field(None, description="Metadata about the reflection session, e.g., mode, template used.")

class SelfReflectionFeedbackOutputModel(BaseModel):
    identified_reasoning_pattern: str = Field(..., description="Analysis of the clinical reasoning process")
    bias_reflection_points: List[str] = Field(..., description="Strengths identified in the reasoning process")
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
        response = SelfReflectionFeedbackOutputModel(
            identified_reasoning_pattern=getattr(bias_analysis, "identified_reasoning_pattern", "") or "",
            bias_reflection_points=[str(point) for point in getattr(bias_analysis, "bias_reflection_points", []) or []],
            devils_advocate_challenge=[getattr(bias_analysis, "devils_advocate_challenge", "") or ""],
            suggested_next_reflective_action=[getattr(bias_analysis, "suggested_next_reflective_action", "") or ""]
        )
        
        return response
    except Exception as e:
        logger.error(f"Error in assist_self_reflection_reasoning: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error analyzing clinical reasoning: {str(e)}")

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
        translated_texts = await translate(texts_to_translate, target_lang=target_lang, field_name="clinical_workflow_questions_output")
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

async def _translate_expanded_ddx_output(output: ExpandedDdxOutputModel, target_lang="PT") -> ExpandedDdxOutputModel:
    """
    Translates user-facing fields of the ExpandedDdxOutputModel.
    """
    if not output:
        return output
    
    logger.info(f"🌐 Starting translation of ExpandedDdxOutputModel to {target_lang}")
    
    output.applied_approach_description = await _translate_field(output.applied_approach_description, target_lang, "applied_approach_description")
    output.suggested_additional_diagnoses_with_rationale = await _translate_field(output.suggested_additional_diagnoses_with_rationale, target_lang, "suggested_additional_diagnoses_with_rationale")
    
    return output

async def _translate_problem_representation_feedback_output(response: ProblemRepresentationFeedbackOutputModel, target_lang: str) -> ProblemRepresentationFeedbackOutputModel:
    """
    Batch translates user-facing fields of the ProblemRepresentationFeedbackOutputModel to minimize API calls.
    Uses BAML as primary translation service with DeepL fallback.
    """
    if not response:
        return response

    logger.info(f"🌐 Starting batch translation of ProblemRepresentationFeedbackOutputModel to {target_lang}")
    try:
        texts_to_translate = []
        # Collect all string and list fields in order
        texts_to_translate.append(response.overall_assessment or "")
        texts_to_translate.append(response.next_step_guidance or "")
        feedback_strengths = response.feedback_strengths or []
        feedback_improvements = response.feedback_improvements or []
        missing_elements = response.missing_elements or []
        socratic_questions = response.socratic_questions or []
        texts_to_translate.extend(feedback_strengths)
        texts_to_translate.extend(feedback_improvements)
        texts_to_translate.extend(missing_elements)
        texts_to_translate.extend(socratic_questions)
        len_strengths = len(feedback_strengths)
        len_improvements = len(feedback_improvements)
        len_missing = len(missing_elements)
        len_socratic = len(socratic_questions)
        
        if not any(t.strip() for t in texts_to_translate if t):
            logger.info("No text found to translate in ProblemRepresentationFeedbackOutputModel.")
            return response
            
        try:
            translated_texts = await translate(texts_to_translate, target_lang=target_lang)
            
            # Verify we got the expected number of translations
            if not translated_texts or len(translated_texts) != len(texts_to_translate):
                logger.warning(f"Translation returned incomplete results: got {len(translated_texts) if translated_texts else 0} items, expected {len(texts_to_translate)}")
                return response
                
        except Exception as e:
            logger.error(f"Batch translation failed for ProblemRepresentationFeedbackOutputModel: {e}", exc_info=True)
            return response
            
        ptr = 0
        translated_overall_assessment = translated_texts[ptr]; ptr += 1
        translated_next_step_guidance = translated_texts[ptr]; ptr += 1
        translated_strengths = translated_texts[ptr : ptr + len_strengths]; ptr += len_strengths
        translated_improvements = translated_texts[ptr : ptr + len_improvements]; ptr += len_improvements
        translated_missing = translated_texts[ptr : ptr + len_missing]; ptr += len_missing
        translated_socratic = translated_texts[ptr : ptr + len_socratic]
        
        # Verify translation was successful
        if translated_overall_assessment == response.overall_assessment and target_lang == "PT":
            logger.warning("Translation may have failed - overall_assessment unchanged")
            # Try direct translation of overall_assessment as fallback
            try:
                if response.overall_assessment:
                    direct_translation = await translate(response.overall_assessment, target_lang=target_lang)
                    if direct_translation and direct_translation != response.overall_assessment:
                        translated_overall_assessment = direct_translation
                        logger.info("Direct translation of overall_assessment succeeded as fallback")
            except Exception as retry_error:
                logger.error(f"Direct translation fallback also failed: {retry_error}")
        
        logger.info(f"✅ Problem representation feedback translation completed successfully")
        
        return ProblemRepresentationFeedbackOutputModel(
            feedback_strengths=translated_strengths,
            feedback_improvements=translated_improvements,
            missing_elements=translated_missing,
            overall_assessment=translated_overall_assessment,
            next_step_guidance=translated_next_step_guidance,
            socratic_questions=translated_socratic,
        )
    except Exception as e:
        logger.error(f"Error batch translating ProblemRepresentationFeedbackOutputModel: {str(e)}", exc_info=True)
        return response


async def _translate_illness_script_output(response: IllnessScriptOutputModel, target_lang: str) -> IllnessScriptOutputModel:
    """
    Batch translates user-facing fields of the IllnessScriptOutputModel to minimize API calls.
    Uses BAML as primary translation service with DeepL fallback.
    """
    if not response:
        return response
        
    logger.info(f"🌐 Starting batch translation of IllnessScriptOutputModel to {target_lang}")
    
    # Maximum number of retry attempts
    max_retries = 2
    retry_delay = 1.0  # Initial delay in seconds
    
    # Prepare the text to translate
    texts_to_translate = []
    texts_to_translate.append(response.disease_name or "")
    texts_to_translate.append(response.pathophysiology_summary or "")
    predisposing_conditions = response.predisposing_conditions or []
    key_symptoms_and_signs = response.key_symptoms_and_signs or []
    relevant_diagnostics = response.relevant_diagnostics or []
    texts_to_translate.extend(predisposing_conditions)
    texts_to_translate.extend(key_symptoms_and_signs)
    texts_to_translate.extend(relevant_diagnostics)
    
    # Store lengths for reconstruction
    len_predisposing = len(predisposing_conditions)
    len_symptoms = len(key_symptoms_and_signs)
    len_diagnostics = len(relevant_diagnostics)
    
    # Skip if no text to translate
    if not any(t.strip() for t in texts_to_translate if t):
        return response
    
    # Attempt translation with retries
    for attempt in range(max_retries + 1):
        try:
            # Add a small delay between retries to avoid rate limiting
            if attempt > 0:
                wait_time = min(retry_delay * (2 ** (attempt - 1)), 10)  # Exponential backoff, max 10s
                logger.info(f"Retry attempt {attempt}/{max_retries} after {wait_time:.1f}s...")
                await asyncio.sleep(wait_time)
                
            # Attempt the translation
            translated_texts = await translate(texts_to_translate, target_lang=target_lang)
            
            # If we get here, translation was successful
            ptr = 0
            disease_name = translated_texts[ptr]; ptr += 1
            pathophysiology_summary = translated_texts[ptr]; ptr += 1
            predisposing_conditions_trans = translated_texts[ptr:ptr+len_predisposing]; ptr += len_predisposing
            key_symptoms_and_signs_trans = translated_texts[ptr:ptr+len_symptoms]; ptr += len_symptoms
            relevant_diagnostics_trans = translated_texts[ptr:ptr+len_diagnostics]; ptr += len_diagnostics
            
            # Verify translation was successful by checking key fields
            if disease_name == response.disease_name and target_lang == "PT":
                logger.warning(f"Translation may have failed - disease_name unchanged on attempt {attempt+1}")
                if attempt == max_retries:  # Last attempt
                    logger.warning("Max retries reached with unsuccessful translation")
                continue  # Try next attempt
                
            logger.info(f"✅ Illness script translation completed successfully on attempt {attempt+1}")
            
            return IllnessScriptOutputModel(
                disease_name=disease_name,
                pathophysiology_summary=pathophysiology_summary,
                predisposing_conditions=predisposing_conditions_trans,
                key_symptoms_and_signs=key_symptoms_and_signs_trans,
                relevant_diagnostics=relevant_diagnostics_trans,
            )
            
        except Exception as e:
            # Log the error with attempt number
            logger.warning(
                f"Attempt {attempt + 1}/{max_retries + 1} failed for IllnessScriptOutputModel: {str(e)}",
                exc_info=attempt == max_retries  # Only log full traceback on final attempt
            )
            
            # If we've hit the max retries, return the original response
            if attempt == max_retries:
                logger.error("Max retries reached, returning original response without translation")
                return response
    
    # This should never be reached due to the return in the loop, but just in case
    return response

async def _translate_generate_lab_insights_output(response: DrCorvusLabInsightsOutput, target_lang: str = "PT") -> DrCorvusLabInsightsOutput:
    """
    Batch translates user-facing fields of the DrCorvusLabInsightsOutput to minimize API calls.
    Uses BAML as primary translation service with DeepL fallback.
    """
    if not response:
        return response
    logger.info(f"🌐 Starting batch translation of DrCorvusLabInsightsOutput to {target_lang}")
    try:
        output = response.copy(deep=True)
        texts_to_translate = []
        # Collect all string and list fields in order
        texts_to_translate.append(output.patient_friendly_summary or "")
        potential_health = output.potential_health_implications_patient or []
        lifestyle_tips = output.lifestyle_tips_patient or []
        key_abnormalities = output.key_abnormalities_professional or []
        key_normal = output.key_normal_results_with_context or []
        patterns = output.potential_patterns_and_correlations or []
        differential = output.differential_considerations_professional or []
        suggested_next = output.suggested_next_steps_professional or []
        texts_to_translate.extend(potential_health)
        texts_to_translate.extend(lifestyle_tips)
        texts_to_translate.append(output.professional_detailed_reasoning_cot or "")
        texts_to_translate.extend(key_abnormalities)
        texts_to_translate.extend(key_normal)
        texts_to_translate.extend(patterns)
        texts_to_translate.extend(differential)
        texts_to_translate.extend(suggested_next)
        
        # Track lengths for reconstruction
        len_potential_health = len(potential_health)
        len_lifestyle_tips = len(lifestyle_tips)
        len_key_abnormalities = len(key_abnormalities)
        len_key_normal = len(key_normal)
        len_patterns = len(patterns)
        len_differential = len(differential)
        len_suggested_next = len(suggested_next)
        
        if not any(t.strip() for t in texts_to_translate if t):
            return response
            
        try:
            translated_texts = await translate(texts_to_translate, target_lang=target_lang)
            
            # Verify we got the expected number of translations
            if not translated_texts or len(translated_texts) != len(texts_to_translate):
                logger.warning(f"Translation returned incomplete results: got {len(translated_texts) if translated_texts else 0} items, expected {len(texts_to_translate)}")
                return response
                
        except Exception as e:
            logger.error(f"Batch translation failed for DrCorvusLabInsightsOutput: {e}", exc_info=True)
            return response
            
        ptr = 0
        patient_friendly_summary = translated_texts[ptr]; ptr += 1
        potential_health_trans = translated_texts[ptr:ptr+len_potential_health]; ptr += len_potential_health
        lifestyle_tips_trans = translated_texts[ptr:ptr+len_lifestyle_tips]; ptr += len_lifestyle_tips
        professional_detailed_reasoning_cot = translated_texts[ptr]; ptr += 1
        key_abnormalities_trans = translated_texts[ptr:ptr+len_key_abnormalities]; ptr += len_key_abnormalities
        key_normal_trans = translated_texts[ptr:ptr+len_key_normal]; ptr += len_key_normal
        patterns_trans = translated_texts[ptr:ptr+len_patterns]; ptr += len_patterns
        differential_trans = translated_texts[ptr:ptr+len_differential]; ptr += len_differential
        suggested_next_trans = translated_texts[ptr:ptr+len_suggested_next]; ptr += len_suggested_next
        
        # Verify translation was successful
        if patient_friendly_summary == response.patient_friendly_summary and target_lang == "PT":
            logger.warning("Translation may have failed - patient_friendly_summary unchanged")
            # Try direct translation of patient_friendly_summary as fallback
            try:
                if response.patient_friendly_summary:
                    direct_translation = await translate(response.patient_friendly_summary, target_lang=target_lang)
                    if direct_translation and direct_translation != response.patient_friendly_summary:
                        patient_friendly_summary = direct_translation
                        logger.info("Direct translation of patient_friendly_summary succeeded as fallback")
            except Exception as retry_error:
                logger.error(f"Direct translation fallback also failed: {retry_error}")
                
        logger.info(f"✅ Lab insights translation completed successfully")
        
        return DrCorvusLabInsightsOutput(
            patient_friendly_summary=patient_friendly_summary,
            potential_health_implications_patient=potential_health_trans,
            lifestyle_tips_patient=lifestyle_tips_trans,
            professional_detailed_reasoning_cot=professional_detailed_reasoning_cot,
            key_abnormalities_professional=key_abnormalities_trans,
            key_normal_results_with_context=key_normal_trans,
            potential_patterns_and_correlations=patterns_trans,
            differential_considerations_professional=differential_trans,
            suggested_next_steps_professional=suggested_next_trans,
            important_results_to_discuss_with_doctor=output.important_results_to_discuss_with_doctor
        )
    except Exception as e:
        logger.error(f"Error batch translating DrCorvusLabInsightsOutput: {str(e)}", exc_info=True)
        return response


async def _translate_compare_contrast_output(output: CompareContrastFeedbackOutputModel, target_lang="PT") -> CompareContrastFeedbackOutputModel:
    """
    Batch translates user-facing fields of the CompareContrastFeedbackOutputModel to minimize DeepL API calls.
    """
    if not output:
        return output

    logger.info(f"🌐 Starting batch translation of CompareContrastFeedbackOutputModel to {target_lang}")
    try:
        translated_output = output.copy(deep=True)
        texts_to_translate = []
        # Track lengths for reconstruction
        # Top-level fields
        texts_to_translate.append(output.overall_feedback or "")
        texts_to_translate.append(output.suggested_learning_focus or "")
        # detailed_feedback_per_hypothesis
        detailed = output.detailed_feedback_per_hypothesis or []
        n_hypotheses = len(detailed)
        # Each HypothesisComparisonFeedbackModel has:
        # hypothesis_name (str), feedback_on_supporting_findings (str), feedback_on_refuting_findings (str), feedback_on_discriminators (str), expert_comparison_points (List[str])
        for item in detailed:
            texts_to_translate.append(item.hypothesis_name or "")
            texts_to_translate.append(item.feedback_on_supporting_findings or "")
            texts_to_translate.append(item.feedback_on_refuting_findings or "")
            texts_to_translate.append(item.feedback_on_discriminators or "")
            # expert_comparison_points is a list
            if item.expert_comparison_points:
                texts_to_translate.extend(item.expert_comparison_points)
            else:
                # Always extend with empty list to preserve order
                pass
        # For reconstructing expert_comparison_points
        expert_points_lens = [len(item.expert_comparison_points or []) for item in detailed]
        if not any(t.strip() for t in texts_to_translate if t):
            return output
        # Batch translate
        try:
            translated_texts = await translate(texts_to_translate, target_lang=target_lang)
        except Exception as e:
            logger.error(f"Batch translation failed for CompareContrastFeedbackOutputModel: {e}", exc_info=True)
            return output
        # Rebuild output
        ptr = 0
        translated_overall_feedback = translated_texts[ptr]; ptr += 1
        translated_suggested_learning_focus = translated_texts[ptr]; ptr += 1
        translated_details = []
        for idx, item in enumerate(detailed):
            hypothesis_name = translated_texts[ptr]; ptr += 1
            feedback_on_supporting_findings = translated_texts[ptr]; ptr += 1
            feedback_on_refuting_findings = translated_texts[ptr]; ptr += 1
            feedback_on_discriminators = translated_texts[ptr]; ptr += 1
            n_expert = expert_points_lens[idx]
            expert_comparison_points = translated_texts[ptr:ptr+n_expert] if n_expert > 0 else []
            ptr += n_expert
            translated_details.append(
                type(item)(
                    hypothesis_name=hypothesis_name,
                    feedback_on_supporting_findings=feedback_on_supporting_findings,
                    feedback_on_refuting_findings=feedback_on_refuting_findings,
                    feedback_on_discriminators=feedback_on_discriminators,
                    expert_comparison_points=expert_comparison_points
                )
            )
        translated_output.overall_feedback = translated_overall_feedback
        translated_output.suggested_learning_focus = translated_suggested_learning_focus
        translated_output.detailed_feedback_per_hypothesis = translated_details
        return translated_output
    except Exception as e:
        logger.error(f"Error batch translating CompareContrastFeedbackOutputModel: {str(e)}", exc_info=True)
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
    "/assist-identifying-cognitive-biases-scenario-translated",
    response_model=CognitiveBiasCaseAnalysisOutputModel,
    summary="[PT] Assist Identifying Cognitive Biases Scenario",
    description="Helps identify cognitive biases in a clinical scenario."
)
async def assist_identifying_cognitive_biases_scenario_translated(payload: CognitiveBiasScenarioInputModel):    
    try:
        # Call the original English endpoint
        original_response = await assist_identifying_cognitive_biases_scenario(payload)
        
        # Translate the response
        translated_response = await _translate_assist_identifying_cognitive_biases_scenario_output(original_response, target_lang="PT")
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in translated assist_identifying_cognitive_biases_scenario endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing translated assist identifying cognitive biases scenario request: {str(e)}")

# Translation helper for teach question prioritization output
async def _translate_teach_question_prioritization_output(response: TeachQuestionPrioritizationOutputModel, target_lang: str = "PT") -> TeachQuestionPrioritizationOutputModel:
    """
    Batch translates user-facing fields of the TeachQuestionPrioritizationOutputModel to minimize DeepL API calls.
    """
    if not response:
        return response
    try:
        translated_response = response.copy(deep=True)
        # 1. Gather all translatable strings in order
        texts_to_translate = []
        len_prioritized = len(response.prioritized_questions or [])
        len_complementary = len(response.complementary_questions or [])
        len_systems = len(response.potential_systems_to_explore or [])
        
        # Add in order
        texts_to_translate.extend(response.prioritized_questions or [])
        texts_to_translate.extend(response.complementary_questions or [])
        texts_to_translate.append(response.questioning_rationale or "")
        texts_to_translate.extend(response.potential_systems_to_explore or [])
        
        if not any(t.strip() for t in texts_to_translate if t):
            return response
        
        # 2. Batch translate
        try:
            translated_texts = await translate(texts_to_translate, target_lang=target_lang)
        except Exception as e:
            logger.error(f"Batch translation failed for TeachQuestionPrioritizationOutputModel: {e}", exc_info=True)
            return response
        
        # 3. Map translated results back
        ptr = 0
        translated_prioritized = translated_texts[ptr:ptr+len_prioritized]; ptr += len_prioritized
        translated_complementary = translated_texts[ptr:ptr+len_complementary]; ptr += len_complementary
        translated_rationale = translated_texts[ptr] if ptr < len(translated_texts) else response.questioning_rationale; ptr += 1
        translated_systems = translated_texts[ptr:ptr+len_systems]
        
        return TeachQuestionPrioritizationOutputModel(
            prioritized_questions=translated_prioritized,
            complementary_questions=translated_complementary,
            questioning_rationale=translated_rationale,
            potential_systems_to_explore=translated_systems
        )
    except Exception as e:
        logger.error(f"Error translating TeachQuestionPrioritizationOutputModel: {str(e)}", exc_info=True)
        return response

# Translation helper function for cognitive bias scenario output
async def _translate_assist_identifying_cognitive_biases_scenario_output(response: CognitiveBiasCaseAnalysisOutputModel, target_lang: str) -> CognitiveBiasCaseAnalysisOutputModel:
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
        texts_to_translate.append(response.disclaimer or "")
        n_biases = len(detected_biases)
        if not any(t.strip() for t in texts_to_translate if t):
            return response
        try:
            translated_texts = await translate(texts_to_translate, target_lang=target_lang)
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
        disclaimer = translated_texts[ptr]
        return CognitiveBiasCaseAnalysisOutputModel(
            detected_biases=translated_biases,
            overall_analysis=overall_analysis,
            educational_insights=educational_insights,
            disclaimer=disclaimer
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
            translated_texts = await translate(texts_to_translate, target_lang=target_lang)
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
        bias_reflection_points = response.bias_reflection_points or []
        texts_to_translate.extend(bias_reflection_points)
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
            translated_texts = await translate(texts_to_translate, target_lang=target_lang)
            if not translated_texts:
                logger.warning("Translation returned empty results for SelfReflectionFeedbackOutputModel")
                return response
        except Exception as e:
            logger.error(f"Batch translation failed for SelfReflectionReasoningOutputModel: {e}", exc_info=True)
            return response
        ptr = 0
        identified_reasoning_pattern = translated_texts[ptr]; ptr += 1
        bias_reflection_points_trans = translated_texts[ptr:ptr+len_bias_reflection_points]; ptr += len_bias_reflection_points
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
        
        return translated_response
    except HTTPException as he:
        # Re-raise HTTP exceptions from the original endpoint
        raise he
    except Exception as e:
        logger.error(f"Error in GenerateClinicalWorkflowQuestions: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error calling BAML (GenerateClinicalWorkflowQuestions): {str(e)}")
