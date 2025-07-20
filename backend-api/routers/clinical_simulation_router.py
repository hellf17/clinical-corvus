import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union

from baml_client import b
from baml_client.types import (
    CaseContext as BAMLCaseContext,
    SessionState as BAMLSessionState,
    SNAPPSStep as BAMLSNAPPSStep,
    EvaluateSummaryInput,
    AnalyzeDDxInput,
    FacilitateDDxAnalysisInput,
    AnswerProbeQuestionsInput,
    EvaluateManagementPlanInput,
    ProvideSessionSummaryInput
)
from services.translator_service import translate_with_fallback

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Clinical Simulation"])

# Pydantic models mirroring BAML schemas for data validation and API documentation
class CaseContext(BaseModel):
    demographics: str
    chief_complaint: str
    physical_exam: str
    vital_signs: str
    full_description: str
    expected_differentials: Optional[List[str]] = None
    learning_objectives: Optional[List[str]] = None
    expert_analysis: Optional[str] = None

class SessionState(BaseModel):
    case_context: CaseContext
    student_summary: Optional[str] = None
    student_ddx: Optional[List[str]] = None
    student_analysis: Optional[str] = None
    student_probe_questions: Optional[List[str]] = None
    student_management_plan: Optional[str] = None
    student_selected_topic: Optional[str] = None
    feedback_history: List[str] = Field(default_factory=list)

class InitializeSimulationRequest(BaseModel):
    case_context: CaseContext

class SNAPPSStepRequest(BaseModel):
    session_state: SessionState
    current_step: BAMLSNAPPSStep
    current_input: Union[str, List[str]]

class SNAPPSStepResponse(BaseModel):
    feedback: Dict[str, Any]
    updated_session_state: SessionState

@router.post("/initialize", response_model=SessionState)
async def initialize_simulation(payload: InitializeSimulationRequest):
    """Initializes a new SNAPPS simulation session with the given case context."""
    try:
        # Create a fresh session state
        session_state = SessionState(
            case_context=payload.case_context,
            feedback_history=[]
        )
        return session_state
    except Exception as e:
        logger.error(f"Error initializing simulation: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to initialize simulation session.")

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

@router.post("/snapps-step", response_model=SNAPPSStepResponse)
async def execute_snapps_step(payload: SNAPPSStepRequest):
    """Executes a single step in the SNAPPS simulation, returning feedback and the updated session state."""
    try:
        session_state = BAMLSessionState(**payload.session_state.model_dump())
        current_input = payload.current_input
        current_step = payload.current_step

        feedback = None
        if current_step == BAMLSNAPPSStep.SUMMARIZE:
            session_state.student_summary = current_input
            
            # Create the input object explicitly to match the BAML function signature
            baml_input = EvaluateSummaryInput(
                student_summary=current_input,
                case_context=session_state.case_context
            )
            feedback = await b.EvaluateSummary_SNAPPS(input=baml_input)

        elif current_step == BAMLSNAPPSStep.NARROW:
            # Normalize differential diagnoses to ensure it's always a list of strings
            normalized_ddx = _normalize_list_field(current_input, "student_ddx")
            session_state.student_ddx = normalized_ddx
            
            # Create the input object to match the BAML function signature
            baml_input = AnalyzeDDxInput(
                session_state=session_state,
                student_differential_diagnoses=normalized_ddx
            )
            feedback = await b.AnalyzeDifferentialDiagnoses_SNAPPS(input=baml_input)
        elif current_step == BAMLSNAPPSStep.ANALYZE:
            session_state.student_analysis = current_input
            
            # Create the input object to match the BAML function signature
            baml_input = FacilitateDDxAnalysisInput(
                session_state=session_state,
                student_analysis=current_input
            )
            feedback = await b.FacilitateDDxAnalysis_SNAPPS(input=baml_input)
        elif current_step == BAMLSNAPPSStep.PROBE:
            # Normalize probe questions to ensure it's always a list of strings
            normalized_questions = _normalize_list_field(current_input, "student_probe_questions")
            session_state.student_probe_questions = normalized_questions
            
            # Create the input object to match the BAML function signature
            baml_input = AnswerProbeQuestionsInput(
                session_state=session_state,
                student_questions=normalized_questions
            )
            feedback = await b.AnswerProbeQuestions_SNAPPS(input=baml_input)
        elif current_step == BAMLSNAPPSStep.PLAN:
            session_state.student_management_plan = current_input
            
            # Create the input object to match the BAML function signature
            baml_input = EvaluateManagementPlanInput(
                session_state=session_state,
                student_plan=current_input
            )
            feedback = await b.EvaluateManagementPlan_SNAPPS(input=baml_input)
        elif current_step == BAMLSNAPPSStep.SELECT:
            session_state.student_selected_topic = current_input
            
            # Create the input object to match the BAML function signature  
            baml_input = ProvideSessionSummaryInput(
                session_state=session_state
            )
            # This step in BAML is for the final summary, which takes the whole session
            feedback = await b.ProvideSessionSummary_SNAPPS(input=baml_input)
        else:
            raise HTTPException(status_code=400, detail=f"Invalid SNAPPS step: {current_step}")
        
        # Update the session state with the new feedback
        # Check if feedback is a Pydantic model or a dict
        if hasattr(feedback, 'model_dump_json'):
            session_state.feedback_history.append(feedback.model_dump_json())
            feedback = feedback.model_dump()
        elif isinstance(feedback, dict) and 'feedback_text' in feedback:
            session_state.feedback_history.append(feedback['feedback_text'])
        
        # Convert back to our Pydantic model
        updated_session_state = SessionState(**session_state.model_dump())
        
        return SNAPPSStepResponse(
            feedback=feedback,
            updated_session_state=updated_session_state
        )
    except Exception as e:
        logger.error(f"Error executing SNAPPS step {payload.current_step}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing SNAPPS step: {str(e)}")

@router.post("/snapps-step-translated", response_model=SNAPPSStepResponse)
async def execute_snapps_step_translated(payload: SNAPPSStepRequest, target_lang: str = "PT"):
    """Executes a SNAPPS step and translates the feedback into the target language."""
    try:
        # Reuse the main logic by calling the non-translated endpoint function
        response = await execute_snapps_step(payload)
        
        # Translate the feedback field using batched translation for efficiency
        logger.info(f"🌐 Starting batched translation of SNAPPS feedback to {target_lang}")
        translated_feedback = await _translate_field_batched(response.feedback, target_lang, field_name="feedback")
        
        # Ensure any lists in the translated feedback maintain proper structure
        if isinstance(translated_feedback, dict) and 'recommended_questions' in translated_feedback:
            translated_feedback['recommended_questions'] = _normalize_list_field(
                translated_feedback['recommended_questions'], 'recommended_questions'
            )
            
        response.feedback = translated_feedback
        logger.info(f"✅ SNAPPS feedback translation completed successfully")
        return response

    except HTTPException as e:
        raise e # Re-raise HTTP exceptions from the original function
    except Exception as e:
        logger.error(f"Error in translated SNAPPS step for {payload.current_step}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error processing translated SNAPPS step: {str(e)}")

async def _translate_field(field: Any, target_lang: str, field_name: str = None) -> Any:
    """Recursively translates a field (str, list, dict) using the translation service.
    Legacy version that translates each string individually.
    Consider using _translate_field_batched for better performance.
    """
    try:
        if isinstance(field, str):
            # Avoid translating non-translatable or empty strings
            if not field.strip() or field.isupper() or field.isnumeric() or len(field) < 2:
                return field
            return await translate_with_fallback(field, target_lang, field_name)
        elif isinstance(field, list):
            return [await _translate_field(item, target_lang, f"{field_name}[{i}]") for i, item in enumerate(field)]
        elif isinstance(field, dict):
            return {k: await _translate_field(v, target_lang, f"{field_name}.{k}") for k, v in field.items()}
        elif hasattr(field, 'model_dump'):
            # Handle Pydantic models
            field_dict = field.model_dump()
            translated_dict = await _translate_field(field_dict, target_lang, field_name)
            return type(field)(**translated_dict)
        return field
    except Exception as e:
        logger.error(f"Translation failed for field '{field_name}': {e}")
        return field # Fallback to original value

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
            if obj.strip() and not obj.isupper() and not obj.isnumeric() and len(obj) >= 2:
                strings_to_translate.append(obj)
                paths.append(path)
        elif isinstance(obj, list):
            for i, item in enumerate(obj):
                collect_strings(item, f"{path}[{i}]" if path else f"[{i}]")
        elif isinstance(obj, dict):
            for k, v in obj.items():
                collect_strings(v, f"{path}.{k}" if path else k)
        elif hasattr(obj, 'model_dump'):
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
                if obj.strip() and not obj.isupper() and not obj.isnumeric() and len(obj) >= 2 and path in translations:
                    return translations[path]
                return obj
            elif isinstance(obj, list):
                return [replace_strings(item, f"{path}[{i}]" if path else f"[{i}]") 
                        for i, item in enumerate(obj)]
            elif isinstance(obj, dict):
                return {k: replace_strings(v, f"{path}.{k}" if path else k) 
                        for k, v in obj.items()}
            elif hasattr(obj, 'model_dump'):
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
