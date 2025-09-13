"""
Clinical Discussion Agent - MVP Implementation

This agent enables clinical case discussions with patient context:
- Discusses clinical cases with AI assistance
- Integrates patient data for context-aware discussions
- Uses existing BAML functions for clinical reasoning
- Supports conversational clinical case analysis
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

# Try to import Langroid
try:
    import langroid as lr
    from langroid.agent.chat_agent import ChatAgent
    LANGROID_AVAILABLE = True
    logger.info("Langroid available for ClinicalDiscussionAgent")
except ImportError:
    logger.warning("Langroid not available - using simplified implementation")
    LANGROID_AVAILABLE = False

    # Create minimal base class
    class ChatAgent:
        def __init__(self, config=None):
            self.config = config or {}

# Import PatientContextManager
try:
    from services.patient_context_manager import PatientContextManager, patient_context_manager
    PATIENT_CONTEXT_AVAILABLE = True
except ImportError as e:
    logger.warning(f"PatientContextManager not available: {e}")
    PATIENT_CONTEXT_AVAILABLE = False
    patient_context_manager = None

# Import BAML client
try:
    from baml_client import b
    from baml_client.types import ClinicalDataInput, StructuredSummaryOutput
    BAML_AVAILABLE = True
except ImportError as e:
    logger.warning(f"BAML client not available: {e}")
    BAML_AVAILABLE = False
    b = None
    ClinicalDataInput = None
    StructuredSummaryOutput = None


class ClinicalDiscussionAgent(ChatAgent if LANGROID_AVAILABLE else object):
    """
    Agent for clinical case discussions with patient context.

    This agent enables:
    - Clinical case analysis and discussion
    - Patient context integration
    - Evidence-based clinical reasoning
    - Conversational medical case discussions
    """

    def __init__(self, config=None):
        if LANGROID_AVAILABLE:
            super().__init__(config)
        else:
            self.config = config or {}

        # Initialize patient context manager
        if PATIENT_CONTEXT_AVAILABLE:
            self.patient_context_manager = patient_context_manager
        else:
            self.patient_context_manager = None

        # Instantiate the ClinicalResearchAgent for delegation
        from .clinical_research_agent import ClinicalResearchAgent
        self.research_agent = ClinicalResearchAgent()

        # Initialize conversation memory
        self.conversation_memory: List[Dict[str, Any]] = []
        self.current_patient_context: Optional[Dict[str, Any]] = None
        self.current_case_description: Optional[str] = None

        logger.info("ClinicalDiscussionAgent initialized for MVP")

    async def discuss_clinical_case(
        self,
        case_description: str,
        patient_id: Optional[str] = None,
        user_id: Optional[str] = None,
        include_patient_context: bool = True
    ) -> Dict[str, Any]:
        """
        Main method for clinical case discussion.

        Args:
            case_description: Description of the clinical case
            patient_id: Optional patient ID for context
            user_id: User ID for authorization
            include_patient_context: Whether to include patient data

        Returns:
            Discussion results with analysis and recommendations
        """
        try:
            logger.info(f"Starting clinical case discussion for case: {case_description[:100]}...")

            # Store current case
            self.current_case_description = case_description

            # Get patient context if requested
            patient_context = None
            if include_patient_context and patient_id and user_id and self.patient_context_manager:
                try:
                    patient_context = await self.patient_context_manager.get_patient_context(
                        patient_id, user_id
                    )
                    self.current_patient_context = patient_context
                    logger.info(f"Patient context loaded for patient {patient_id}")
                except Exception as e:
                    logger.warning(f"Could not load patient context: {e}")
                    patient_context = None

            # Analyze the clinical case using BAML
            case_analysis = await self._analyze_clinical_case(case_description, patient_context)
            
            # Generate discussion points
            discussion_points = await self._generate_discussion_points(case_analysis, patient_context)

            # If research is needed, delegate to the research agent
            if case_analysis.get("needs_research", False):
                logger.info("Discussion requires research, delegating to ClinicalResearchAgent")
                research_insights = await self.research_agent.handle_clinical_query(
                    query=case_analysis.get("research_question", case_description),
                    patient_context=patient_context
                )
                discussion_points["research_insights"] = research_insights

            # Store in conversation memory
            conversation_entry = {
                "case_description": case_description,
                "patient_id": patient_id,
                "analysis": case_analysis,
                "discussion": discussion_points,
                "timestamp": datetime.now().isoformat(),
                "patient_context_used": patient_context is not None
            }
            self.conversation_memory.append(conversation_entry)

            # Keep only last 10 conversations
            if len(self.conversation_memory) > 10:
                self.conversation_memory = self.conversation_memory[-10:]

            result = {
                "case_description": case_description,
                "analysis": case_analysis,
                "discussion": discussion_points,
                "patient_context_included": patient_context is not None,
                "conversation_id": len(self.conversation_memory) - 1,
                "agent_type": "clinical_discussion"
            }

            logger.info("Clinical case discussion completed successfully")
            return result

        except Exception as e:
            logger.error(f"Error in clinical case discussion: {e}", exc_info=True)
            return {
                "error": str(e),
                "case_description": case_description,
                "agent_type": "clinical_discussion"
            }

    async def continue_discussion(
        self,
        follow_up_question: str,
        conversation_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Continue an existing clinical discussion.

        Args:
            follow_up_question: Follow-up question or comment
            conversation_id: ID of previous conversation (defaults to last)

        Returns:
            Continued discussion response
        """
        try:
            # Get the relevant conversation
            if conversation_id is None:
                conversation_id = len(self.conversation_memory) - 1

            if conversation_id < 0 or conversation_id >= len(self.conversation_memory):
                return {
                    "error": "Invalid conversation ID",
                    "agent_type": "clinical_discussion"
                }

            previous_conversation = self.conversation_memory[conversation_id]

            # Generate response based on follow-up
            response = await self._generate_follow_up_response(
                follow_up_question,
                previous_conversation
            )

            # Add to conversation memory
            follow_up_entry = {
                "follow_up_question": follow_up_question,
                "response": response,
                "timestamp": datetime.now().isoformat(),
                "conversation_id": conversation_id
            }
            self.conversation_memory.append(follow_up_entry)

            return {
                "follow_up_question": follow_up_question,
                "response": response,
                "conversation_id": conversation_id,
                "agent_type": "clinical_discussion"
            }

        except Exception as e:
            logger.error(f"Error in continue_discussion: {e}", exc_info=True)
            return {
                "error": str(e),
                "agent_type": "clinical_discussion"
            }

    async def _analyze_clinical_case(
        self,
        case_description: str,
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze the clinical case using available tools.
        """
        if not BAML_AVAILABLE or not b or not ClinicalDataInput:
            # Mock analysis when BAML is not available
            return await self._mock_case_analysis(case_description, patient_context)

        try:
            # Use BAML for clinical case analysis
            # Extract patient demographics from context
            demographics = ""
            if patient_context:
                age = patient_context.get("age", "")
                gender = patient_context.get("gender", "")
                primary_diagnosis = patient_context.get("primary_diagnosis", "")
                demographics = f"Age: {age}, Gender: {gender}, Primary Diagnosis: {primary_diagnosis}"

            # Create clinical data input for BAML
            clinical_data = ClinicalDataInput(
                patient_story=case_description,
                known_findings=[],  # Could be enhanced to extract findings
                patient_demographics=demographics
            )

            # Use SummarizeAndStructureClinicalData instead of non-existent AnalyzeClinicalCase
            analysis = await b.SummarizeAndStructureClinicalData(clinical_data)

            # Convert BAML response to expected format
            return {
                "summary": analysis.one_sentence_summary,
                "semantic_qualifiers": analysis.semantic_qualifiers_identified,
                "key_details": analysis.key_patient_details_abstracted,
                "suggestions": analysis.suggested_areas_for_further_data_gathering,
                "needs_research": len(analysis.suggested_areas_for_further_data_gathering) > 0
            }

        except Exception as e:
            logger.error(f"Error in BAML case analysis: {e}")
            return await self._mock_case_analysis(case_description, patient_context)

    async def _mock_case_analysis(
        self,
        case_description: str,
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Provide mock case analysis when BAML is not available.
        """
        logger.info("Using mock case analysis (BAML not available)")

        # Simple keyword-based analysis
        case_lower = case_description.lower()

        analysis = {
            "needs_research": False,
            "case_type": "general",
            "urgency_level": "medium",
            "key_symptoms": [],
            "possible_diagnoses": [],
            "recommended_tests": [],
            "mock_analysis": True
        }

        # Extract potential symptoms
        symptoms_keywords = ["pain", "fever", "cough", "nausea", "fatigue", "shortness of breath"]
        analysis["key_symptoms"] = [
            symptom for symptom in symptoms_keywords
            if symptom in case_lower
        ]

        # Determine if research is needed
        research_keywords = ["evidence", "literature", "study", "guideline", "treatment"]
        analysis["needs_research"] = any(keyword in case_lower for keyword in research_keywords)

        # Mock diagnoses based on symptoms
        if "chest pain" in case_lower:
            analysis["possible_diagnoses"] = ["Acute Coronary Syndrome", "Pulmonary Embolism", "Pneumonia"]
            analysis["recommended_tests"] = ["ECG", "Troponin", "Chest X-ray"]
            analysis["urgency_level"] = "high"
        elif "fever" in case_lower and "cough" in case_lower:
            analysis["possible_diagnoses"] = ["Upper Respiratory Infection", "Pneumonia", "COVID-19"]
            analysis["recommended_tests"] = ["PCR test", "Chest X-ray"]
        else:
            analysis["possible_diagnoses"] = ["Differential diagnosis needed"]
            analysis["recommended_tests"] = ["Comprehensive physical exam"]

        return analysis

    async def _generate_discussion_points(
        self,
        case_analysis: Dict[str, Any],
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate discussion points based on case analysis.
        """
        discussion = {
            "clinical_reasoning": {},
            "differential_diagnosis": {},
            "management_plan": {},
            "patient_specific_considerations": {},
            "follow_up_questions": []
        }

        # Generate clinical reasoning
        discussion["clinical_reasoning"] = {
            "assessment": f"Based on the case presentation, this appears to be a case of {case_analysis.get('case_type', 'complex clinical presentation')}.",
            "key_findings": case_analysis.get("key_symptoms", []),
            "urgency_assessment": case_analysis.get("urgency_level", "medium")
        }

        # Generate differential diagnosis
        discussion["differential_diagnosis"] = {
            "primary_diagnoses": case_analysis.get("possible_diagnoses", []),
            "rationale": "Based on presenting symptoms and clinical pattern",
            "red_flags": self._identify_red_flags(case_analysis)
        }

        # Generate management plan
        discussion["management_plan"] = {
            "immediate_actions": self._generate_immediate_actions(case_analysis),
            "diagnostic_workup": case_analysis.get("recommended_tests", []),
            "treatment_considerations": self._generate_treatment_considerations(case_analysis)
        }

        # Patient-specific considerations
        if patient_context:
            discussion["patient_specific_considerations"] = await self._generate_patient_specific_considerations(
                case_analysis, patient_context
            )
        else:
            discussion["patient_specific_considerations"] = {
                "note": "No patient context provided - general recommendations only"
            }

        # Generate follow-up questions
        discussion["follow_up_questions"] = self._generate_follow_up_questions(case_analysis)

        return discussion

    def _identify_red_flags(self, case_analysis: Dict[str, Any]) -> List[str]:
        """Identify red flag symptoms that require urgent attention."""
        red_flags = []

        symptoms = case_analysis.get("key_symptoms", [])
        urgency = case_analysis.get("urgency_level", "medium")

        if urgency == "high":
            red_flags.append("High urgency case requiring immediate attention")

        if "chest pain" in symptoms:
            red_flags.append("Chest pain - rule out cardiac etiology")
        if "shortness of breath" in symptoms:
            red_flags.append("Shortness of breath - assess respiratory status")
        if "fever" in symptoms and "confusion" in str(case_analysis).lower():
            red_flags.append("Fever with altered mental status - possible sepsis")

        return red_flags if red_flags else ["No immediate red flags identified"]

    def _generate_immediate_actions(self, case_analysis: Dict[str, Any]) -> List[str]:
        """Generate immediate clinical actions."""
        actions = []

        urgency = case_analysis.get("urgency_level", "medium")
        symptoms = case_analysis.get("key_symptoms", [])

        if urgency == "high":
            actions.append("Assess ABCs (Airway, Breathing, Circulation)")
            actions.append("Obtain vital signs")

        if "chest pain" in symptoms:
            actions.append("Obtain ECG within 10 minutes")
            actions.append("Check cardiac enzymes")

        if "fever" in symptoms:
            actions.append("Assess for infection source")
            actions.append("Consider empiric antibiotics if indicated")

        if not actions:
            actions.append("Perform comprehensive physical examination")
            actions.append("Obtain detailed history")

        return actions

    def _generate_treatment_considerations(self, case_analysis: Dict[str, Any]) -> List[str]:
        """Generate treatment considerations."""
        considerations = []

        diagnoses = case_analysis.get("possible_diagnoses", [])

        if "Pneumonia" in diagnoses:
            considerations.append("Consider antibiotic therapy based on local resistance patterns")
        if "Acute Coronary Syndrome" in diagnoses:
            considerations.append("Antiplatelet therapy and cardiology consultation")
        if "Upper Respiratory Infection" in diagnoses:
            considerations.append("Supportive care with hydration and rest")

        if not considerations:
            considerations.append("Treatment based on confirmed diagnosis")
            considerations.append("Consider patient comorbidities and allergies")

        return considerations

    async def _generate_patient_specific_considerations(
        self,
        case_analysis: Dict[str, Any],
        patient_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate patient-specific considerations based on context."""
        considerations = {
            "medication_interactions": [],
            "comorbidities": [],
            "lab_correlations": [],
            "age_considerations": "Not specified"
        }

        # Check medications
        medications = patient_context.get("medications", [])
        if medications:
            considerations["medication_interactions"] = [
                f"Consider interactions with {med['name']}" for med in medications[:3]
            ]

        # Check labs
        labs = patient_context.get("recent_labs", [])
        if labs:
            abnormal_labs = [lab for lab in labs if lab.get("is_abnormal")]
            if abnormal_labs:
                considerations["lab_correlations"] = [
                    f"Correlate with abnormal {lab['test_name']}" for lab in abnormal_labs[:3]
                ]

        # Age considerations
        demographics = patient_context.get("demographics", {})
        age = demographics.get("age")
        if age:
            if age > 65:
                considerations["age_considerations"] = "Geriatric patient - consider polypharmacy and frailty"
            elif age < 18:
                considerations["age_considerations"] = "Pediatric patient - consider age-specific presentations"

        return considerations

    def _generate_follow_up_questions(self, case_analysis: Dict[str, Any]) -> List[str]:
        """Generate follow-up questions for further discussion."""
        questions = []

        symptoms = case_analysis.get("key_symptoms", [])
        diagnoses = case_analysis.get("possible_diagnoses", [])

        if "chest pain" in symptoms:
            questions.append("What is the character, radiation, and timing of the chest pain?")
            questions.append("Are there any associated symptoms like nausea or diaphoresis?")

        if "fever" in symptoms:
            questions.append("What is the maximum temperature and duration of fever?")
            questions.append("Are there any localizing symptoms or signs of infection?")

        if not questions:
            questions.append("Can you provide more details about the patient's symptoms?")
            questions.append("What is the patient's past medical history?")
            questions.append("Are there any relevant family history or social factors?")

        return questions

    async def _suggest_research_questions(self, case_description: str, case_analysis: Dict[str, Any]) -> List[str]:
        """Suggest research questions for evidence-based practice."""
        suggestions = []

        diagnoses = case_analysis.get("possible_diagnoses", [])

        for diagnosis in diagnoses[:3]:  # Limit to top 3
            suggestions.append(f"What is the evidence for {diagnosis} in patients with these symptoms?")
            suggestions.append(f"What are the sensitivity and specificity of diagnostic tests for {diagnosis}?")

        if not suggestions:
            suggestions.append("What is the evidence-based approach to this clinical presentation?")
            suggestions.append("What are the current guidelines for managing similar cases?")

        return suggestions

    async def _generate_follow_up_response(
        self,
        follow_up_question: str,
        previous_conversation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate a response to a follow-up question.
        """
        response = {
            "answer": f"This is a follow-up to your previous case discussion. Regarding: {follow_up_question}",
            "related_to_previous": True,
            "previous_case_summary": previous_conversation.get("case_description", "")[:100] + "...",
            "additional_insights": []
        }

        # Add some basic follow-up logic
        question_lower = follow_up_question.lower()

        if "treatment" in question_lower:
            response["additional_insights"].append("Consider evidence-based treatment guidelines")
        elif "diagnosis" in question_lower:
            response["additional_insights"].append("Review differential diagnosis systematically")
        elif "test" in question_lower:
            response["additional_insights"].append("Order tests based on pre-test probability")

        if not response["additional_insights"]:
            response["additional_insights"].append("This would benefit from clinical research or guidelines review")

        return response

    def get_conversation_history(self, limit: int = 5) -> List[Dict[str, Any]]:
        """Get recent conversation history."""
        return self.conversation_memory[-limit:] if self.conversation_memory else []

    def clear_conversation_history(self):
        """Clear conversation history."""
        self.conversation_memory = []
        logger.info("Conversation history cleared")


def create_clinical_discussion_agent() -> ClinicalDiscussionAgent:
    """
    Factory function to create and configure the ClinicalDiscussionAgent
    """
    if LANGROID_AVAILABLE:
        config = lr.ChatAgentConfig(
            name="Dr. Corvus Clinical Discussion Agent",
            system_message="""
            You are Dr. Corvus, a clinical discussion assistant that helps healthcare professionals
            analyze and discuss clinical cases with evidence-based reasoning.

            Your role is to:
            - Facilitate clinical case discussions
            - Provide evidence-based insights
            - Ask probing questions to enhance clinical reasoning
            - Integrate patient context when available
            - Suggest research questions when evidence is needed

            Always maintain a professional, educational tone and focus on patient-centered care.
            """,
            use_tools=False,  # Discussion agent focuses on conversation
            use_functions_api=False
        )

        agent = ClinicalDiscussionAgent(config)
        return agent
    else:
        logger.info("Creating ClinicalDiscussionAgent without Langroid")
        return ClinicalDiscussionAgent()