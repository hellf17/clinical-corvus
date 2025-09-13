"""
Clinical Research Agent - MVP Implementation

This agent leverages existing robust infrastructure to provide clinical research capabilities:
- SimpleAutonomousResearchService for comprehensive research
- BAML functions for clinical reasoning and lab analysis
- Patient context integration
- Langroid ToolAgent for orchestration (when available)

Note: This implementation is designed to work with or without Langroid installed.
When Langroid is not available, it provides direct method access for integration.
"""

import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)

# Import existing services
try:
    from services.simple_autonomous_research import SimpleAutonomousResearchService
    SIMPLE_AUTONOMOUS_AVAILABLE = True
    logger.info("SimpleAutonomousResearchService available")
except ImportError as e:
    logger.warning(f"SimpleAutonomousResearchService not available - research functionality limited: {e}")
    SIMPLE_AUTONOMOUS_AVAILABLE = False
    SimpleAutonomousResearchService = None

# Import BAML client and types
try:
    from baml_client import b
    from baml_client.types import (
        ResearchTaskInput, LabAnalysisInput, ClinicalDataInput,
        IllnessScriptInput, IllnessScriptOutput,
        ExpandDifferentialDiagnosisInput, ExpandedDdxOutput,
        DdxQuestioningInput, ClinicalWorkflowQuestionsOutput,
        ClinicalScenarioInput, PICOFormulationOutput,
        FormulatedSearchStrategyOutput, RawSearchResultItem,
        SynthesizedResearchOutput, PDFAnalysisInput, PDFAnalysisOutput,
        EvidenceAnalysisData, EvidenceAppraisalOutput as GradeEvidenceAppraisalOutput,
        DiagnosticTimeoutInput, DiagnosticTimeoutOutput,
        SelfReflectionInput, SelfReflectionFeedbackOutput,
        LabInsightsOutput # Already imported but for clarity
    )
    BAML_AVAILABLE = True
    logger.info("BAML client available")
except ImportError as e:
    logger.warning(f"BAML client not available - using mock implementations: {e}")
    BAML_AVAILABLE = False
    b = None
    ResearchTaskInput = None
    LabAnalysisInput = None
    ClinicalDataInput = None
    # Mock other BAML types as None as well
    IllnessScriptInput, IllnessScriptOutput = None, None
    ExpandDifferentialDiagnosisInput, ExpandedDdxOutput = None, None
    DdxQuestioningInput, ClinicalWorkflowQuestionsOutput = None, None
    ClinicalScenarioInput, PICOFormulationOutput = None, None
    FormulatedSearchStrategyOutput, RawSearchResultItem = None, None
    SynthesizedResearchOutput, PDFAnalysisInput, PDFAnalysisOutput = None, None, None
    EvidenceAnalysisData, GradeEvidenceAppraisalOutput = None, None
    DiagnosticTimeoutInput, DiagnosticTimeoutOutput = None, None
    SelfReflectionInput, SelfReflectionFeedbackOutput = None, None
    LabInsightsOutput = None

# Try to import Langroid, but provide fallback if not available
try:
    import langroid as lr
    from langroid.agent.tool_agent import ToolAgent
    LANGROID_AVAILABLE = True
    logger.info("Langroid available - using full ToolAgent functionality")
except ImportError:
    logger.warning("Langroid not available - using simplified agent implementation")
    LANGROID_AVAILABLE = False

    # Create a minimal base class for compatibility
    class ToolAgent:
        def __init__(self, config=None):
            self.config = config if config is not None else {}

        def enable_tools(self, tools):
            pass

        def enable_message(self, message):
            pass

# Import the new Academy Tools
from agents.academy_tools import (
    GenerateIllnessScriptTool,
    ExpandDifferentialDiagnosisTool,
    GenerateClinicalWorkflowQuestionsTool,
    FormulatePICOQuestionTool,
    FormulateDeepResearchStrategyTool,
    SynthesizeDeepResearchTool,
    AnalyzePDFDocumentTool,
    GenerateEvidenceAppraisalTool,
    GenerateDiagnosticTimeoutTool,
    ProvideSelfReflectionFeedbackTool,
    GenerateDrCorvusInsightsTool, # Already imported but for consistency in tool list
)

class ClinicalResearchAgent(ToolAgent):
    """
    MVP Agent: Leverages existing research system + adds clinical thinking

    This agent integrates with:
    - SimpleAutonomousResearchService for autonomous research
    - BAML functions for clinical reasoning and lab analysis
    - Existing patient management for context
    """

    def __init__(self, config=None):
        super().__init__(config)

        # Initialize existing research service if available
        if SIMPLE_AUTONOMOUS_AVAILABLE:
            self.research_service = SimpleAutonomousResearchService()
            logger.info("SimpleAutonomousResearchService initialized")
        else:
            self.research_service = None
            logger.warning("SimpleAutonomousResearchService not available")

        # Enable tools that leverage existing infrastructure (if Langroid available)
        # Instantiate the ClinicalAcademyAgent to access its tools
        from .academy_tools import create_clinical_academy_agent
        self.academy_agent = create_clinical_academy_agent()

        if LANGROID_AVAILABLE:
            # Enable the tools from the academy agent
            self.enable_message(GenerateIllnessScriptTool)
            self.enable_message(ExpandDifferentialDiagnosisTool)
            self.enable_message(GenerateClinicalWorkflowQuestionsTool)
            self.enable_message(FormulatePICOQuestionTool)
            self.enable_message(FormulateDeepResearchStrategyTool)
            self.enable_message(SynthesizeDeepResearchTool)
            self.enable_message(AnalyzePDFDocumentTool)
            self.enable_message(GenerateEvidenceAppraisalTool)
            self.enable_message(GenerateDiagnosticTimeoutTool)
            self.enable_message(ProvideSelfReflectionFeedbackTool)
            self.enable_message(GenerateDrCorvusInsightsTool)

        # Log initialization status
        available_components = []
        if LANGROID_AVAILABLE:
            available_components.append("Langroid")
        if SIMPLE_AUTONOMOUS_AVAILABLE:
            available_components.append("SimpleAutonomousResearchService")
        if BAML_AVAILABLE:
            available_components.append("BAML")

        logger.info(f"ClinicalResearchAgent initialized with: {', '.join(available_components)}")

    async def handle_clinical_query(
        self,
        query: str,
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for clinical queries - MVP Implementation
        
        Intelligently routes to:
        1. SimpleAutonomousResearchService for research queries
        2. BAML functions for clinical analysis
        3. ClinicalAcademyAgent for complex clinical reasoning
        """
        try:
            logger.info(f"Processing clinical query: {query[:100]}...")

            # Use enhanced query analysis
            analysis = await self._analyze_clinical_query(query, patient_context)
            
            # MVP Routing Strategy based on analysis
            if analysis.get("needs_research", False):
                logger.info("Query requires research - using SimpleAutonomousResearchService")
                return await self._handle_research_query(query, analysis, patient_context)
                
            elif analysis.get("needs_lab_analysis", False):
                logger.info("Query requires lab analysis - using BAML GenerateDrCorvusInsights")
                return await self._handle_lab_analysis(query, analysis, patient_context)
                
            elif analysis.get("query_type") == "clinical_reasoning":
                logger.info("Query requires clinical reasoning - delegating to ClinicalAcademyAgent")
                response = await self.academy_agent.agent_response(query)
                return {
                    "result": response.content,
                    "query_type": "clinical_reasoning",
                    "agent_type": "clinical_research",
                    "service_used": "ClinicalAcademyAgent"
                }
            else:
                # Default to academy agent for general clinical queries
                logger.info("General clinical query - delegating to ClinicalAcademyAgent")
                response = await self.academy_agent.agent_response(query)
                return {
                    "result": response.content,
                    "query_type": "general_clinical",
                    "agent_type": "clinical_research",
                    "service_used": "ClinicalAcademyAgent"
                }

        except Exception as e:
            logger.error(f"Error in handle_clinical_query: {e}", exc_info=True)
            return {
                "error": str(e),
                "query": query,
                "agent_type": "clinical_research"
            }

    async def _analyze_clinical_query(
        self,
        query: str,
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Enhanced clinical query analysis for MVP routing decisions
        
        Uses both heuristic analysis and patient context to determine routing
        """
        try:
            query_lower = query.lower()
            
            analysis = {
                "needs_research": False,
                "needs_lab_analysis": False,
                "needs_clinical_reasoning": False,
                "query_type": "general",
                "confidence": 0.8,
                "research_indicators": [],
                "lab_indicators": [],
                "clinical_reasoning_indicators": []
            }

            # Enhanced research indicators
            research_keywords = [
                "evidence", "literature", "study", "research", "systematic review",
                "meta-analysis", "randomized trial", "clinical trial", "guideline",
                "cochrane", "pubmed", "treatment efficacy", "comparative effectiveness",
                "systematic review", "evidence based", "clinical guidelines"
            ]
            
            research_found = [kw for kw in research_keywords if kw in query_lower]
            if research_found:
                analysis["needs_research"] = True
                analysis["query_type"] = "research"
                analysis["research_indicators"] = research_found
                analysis["confidence"] = 0.9

            # Enhanced lab analysis indicators
            lab_keywords = [
                "lab", "laboratory", "blood", "test", "analysis", "result", "values",
                "hemoglobin", "creatinine", "glucose", "electrolyte", "chemistry",
                "complete blood count", "cbc", "bmp", "cmp", "lipid panel",
                "liver function", "kidney function", "cardiac enzymes"
            ]
            
            lab_found = [kw for kw in lab_keywords if kw in query_lower]
            if lab_found and patient_context and patient_context.get("recent_labs"):
                analysis["needs_lab_analysis"] = True
                analysis["query_type"] = "lab_analysis"
                analysis["lab_indicators"] = lab_found
                analysis["confidence"] = 0.95

            # Clinical reasoning indicators
            reasoning_keywords = [
                "differential diagnosis", "ddx", "diagnosis", "diagnostic", "symptoms",
                "clinical reasoning", "illness script", "pathophysiology", "presentation",
                "assessment", "clinical thinking", "case analysis", "workup"
            ]
            
            reasoning_found = [kw for kw in reasoning_keywords if kw in query_lower]
            if reasoning_found:
                analysis["needs_clinical_reasoning"] = True
                analysis["query_type"] = "clinical_reasoning"
                analysis["clinical_reasoning_indicators"] = reasoning_found
                analysis["confidence"] = 0.85

            # Patient context influence on routing
            if patient_context:
                if patient_context.get("abnormal_labs") and not analysis["needs_lab_analysis"]:
                    # Patient has abnormal labs, might benefit from lab analysis
                    analysis["needs_lab_analysis"] = True
                    analysis["query_type"] = "lab_analysis"
                    analysis["lab_indicators"].append("patient_has_abnormal_labs")
                    
                if patient_context.get("recent_concerns") and not analysis["needs_clinical_reasoning"]:
                    # Patient has recent concerns, might benefit from clinical reasoning
                    analysis["needs_clinical_reasoning"] = True
                    analysis["query_type"] = "clinical_reasoning"
                    analysis["clinical_reasoning_indicators"].append("patient_has_recent_concerns")

            logger.info(f"Enhanced query analysis: {analysis}")
            return analysis

        except Exception as e:
            logger.error(f"Error in enhanced query analysis: {e}", exc_info=True)
            return {
                "needs_research": True,  # Default to research for safety
                "needs_lab_analysis": False,
                "needs_clinical_reasoning": False,
                "query_type": "general",
                "confidence": 0.5,
                "error": str(e)
            }

    async def _handle_research_query(
        self,
        query: str,
        analysis: Dict[str, Any],
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Enhanced research query handling using SimpleAutonomousResearchService
        
        Integrates patient context and research indicators for better results
        """
        if not SIMPLE_AUTONOMOUS_AVAILABLE:
            logger.warning("SimpleAutonomousResearchService not available - using fallback")
            return await self._research_fallback(query, patient_context)

        try:
            logger.info("Executing comprehensive research using SimpleAutonomousResearchService")

            # Enhanced research input with patient context
            research_input = await self._create_enhanced_research_input(
                query, analysis, patient_context
            )

            # Use existing autonomous research service with proper context management
            async with SimpleAutonomousResearchService(research_mode="comprehensive") as service:
                result = await service.conduct_autonomous_research(research_input)

            # Process and format results for clinical context
            formatted_result = await self._format_research_results(result, patient_context)

            return {
                "result": formatted_result,
                "query_type": "research",
                "agent_type": "clinical_research",
                "service_used": "SimpleAutonomousResearchService",
                "search_duration": getattr(result, 'search_duration_seconds', 0),
                "sources_consulted": getattr(result, 'research_metrics', {}).get('sources_consulted', []),
                "patient_context_applied": patient_context is not None
            }

        except Exception as e:
            logger.error(f"Error in enhanced research query handling: {e}", exc_info=True)
            return await self._research_fallback(query, patient_context, error=str(e))

    async def _create_enhanced_research_input(
        self,
        query: str,
        analysis: Dict[str, Any],
        patient_context: Optional[Dict[str, Any]] = None
    ) -> 'ResearchTaskInput':
        """Create enhanced research input with patient context"""
        try:
            if not BAML_AVAILABLE or not ResearchTaskInput:
                raise ImportError("BAML not available for ResearchTaskInput")

            # Enhance query with patient context if available
            enhanced_query = query
            if patient_context:
                demographics = patient_context.get("demographics", {})
                age = demographics.get("age")
                gender = demographics.get("gender")
                primary_dx = demographics.get("primary_diagnosis")
                
                context_parts = []
                if age and gender:
                    context_parts.append(f"{age}-year-old {gender}")
                if primary_dx:
                    context_parts.append(f"with {primary_dx}")
                    
                if context_parts:
                    enhanced_query = f"{query} (Patient context: {', '.join(context_parts)})"

            # Attempt to generate PICO if research indicators suggest it
            pico_question = None
            if analysis.get("research_indicators") and BAML_AVAILABLE:
                try:
                    from baml_client.types import ResearchTaskInput as PICOInput
                    pico_input = PICOInput(
                        user_original_query=enhanced_query,
                        patient_population=demographics.get("primary_diagnosis", "adult patients") if patient_context else "adult patients"
                    )
                    pico_result = await b.FormulateEvidenceBasedPICOQuestion(pico_input)
                    pico_question = pico_result
                    logger.info(f"Generated PICO question for research: {pico_question}")
                except Exception as e:
                    logger.warning(f"Could not generate PICO question: {e}")

            # Use the imported type from the top level
            return ResearchTaskInput(
                user_original_query=enhanced_query,
                pico_question=pico_question,
                quality_filters_applied=["peer_reviewed", "systematic_reviews"],
                date_range_searched="last_5_years",
                language_filters_applied=["english", "portuguese"]
            )

        except Exception as e:
            logger.warning(f"Error creating enhanced research input: {e}")
            # Fallback to simple research input
            return type('SimpleResearchInput', (), {
                'user_original_query': query,
                'pico_question': None,
                'quality_filters_applied': [],
                'date_range_searched': None,
                'language_filters_applied': ["english"]
            })()

    async def _format_research_results(
        self,
        result: Any,
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Format research results with clinical context"""
        try:
            if not result:
                return {"error": "No research results obtained"}

            formatted = {
                "executive_summary": getattr(result, 'executive_summary', ''),
                "detailed_results": getattr(result, 'detailed_results', ''),
                "key_findings": getattr(result, 'key_findings_by_theme', []),
                "clinical_implications": getattr(result, 'clinical_implications', []),
                "evidence_quality": getattr(result, 'evidence_quality_assessment', ''),
                "relevant_references": getattr(result, 'relevant_references', []),
                "research_gaps": getattr(result, 'research_gaps_identified', []),
                "limitations": getattr(result, 'limitations', [])
            }

            # Add patient-specific contextualization if available
            if patient_context:
                formatted["patient_specific_notes"] = await self._generate_patient_specific_notes(
                    formatted, patient_context
                )

            return formatted

        except Exception as e:
            logger.error(f"Error formatting research results: {e}")
            return {"error": f"Error formatting results: {str(e)}"}

    async def _generate_patient_specific_notes(
        self,
        research_results: Dict[str, Any],
        patient_context: Dict[str, Any]
    ) -> List[str]:
        """Generate patient-specific notes from research results"""
        try:
            notes = []
            demographics = patient_context.get("demographics", {})
            
            # Age-specific considerations
            age = demographics.get("age")
            if age:
                if age > 65:
                    notes.append("Consider geriatric-specific dosing and drug interactions")
                elif age < 18:
                    notes.append("Pediatric considerations may apply")

            # Medication interaction considerations
            medications = patient_context.get("medications", [])
            if medications:
                med_names = [med.get("name", "") for med in medications]
                notes.append(f"Current medications to consider: {', '.join(med_names[:3])}")

            # Lab value considerations
            abnormal_labs = patient_context.get("abnormal_labs", [])
            if abnormal_labs:
                lab_names = [lab.get("test_name", "") for lab in abnormal_labs]
                notes.append(f"Abnormal labs to monitor: {', '.join(lab_names[:3])}")

            return notes
            
        except Exception as e:
            logger.warning(f"Error generating patient-specific notes: {e}")
            return []

    async def _research_fallback(
        self,
        query: str,
        patient_context: Optional[Dict[str, Any]] = None,
        error: str = None
    ) -> Dict[str, Any]:
        """Fallback research response when service is unavailable"""
        logger.info("Using research fallback - delegating to ClinicalAcademyAgent")
        try:
            response = await self.academy_agent.agent_response(f"Research query: {query}")
            return {
                "result": {
                    "executive_summary": response.content,
                    "detailed_results": "Research conducted using clinical reasoning agent due to service limitation",
                    "key_findings": ["Clinical reasoning applied in absence of literature search"],
                    "limitations": ["Full literature search not available"] + ([f"Error: {error}"] if error else [])
                },
                "query_type": "research_fallback",
                "agent_type": "clinical_research",
                "service_used": "ClinicalAcademyAgent",
                "fallback_reason": error or "SimpleAutonomousResearchService not available"
            }
        except Exception as e:
            return {
                "error": f"Research fallback failed: {str(e)}",
                "query": query,
                "agent_type": "clinical_research"
            }

    async def _handle_lab_analysis(
        self,
        query: str,
        analysis: Dict[str, Any],
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Handle lab analysis queries using existing BAML functions
        """
        if not BAML_AVAILABLE or not b:
            return {
                "error": "BAML client not available for lab analysis",
                "query": query,
                "agent_type": "clinical_research",
                "mock_response": True,
                "mock_lab_analysis": {
                    "summary": f"Mock lab analysis for: {query}",
                    "abnormal_findings": ["Mock abnormal finding 1", "Mock abnormal finding 2"],
                    "recommendations": ["Mock recommendation 1", "Mock recommendation 2"]
                }
            }

        try:
            logger.info("Executing lab analysis using existing BAML functions")

            # Use existing BAML GenerateDrCorvusInsights function
            # This would need to be adapted based on available lab data
            lab_data = analysis.get("lab_data", {})
            patient_info = patient_context or {}

            # Call existing BAML function
            insights = await b.GenerateDrCorvusInsights(
                lab_results=lab_data,
                patient_context=patient_info,
                additional_context=query
            )

            return {
                "result": insights,
                "query_type": "lab_analysis",
                "agent_type": "clinical_research",
                "service_used": "BAML_GenerateDrCorvusInsights"
            }

        except Exception as e:
            logger.error(f"Error in lab analysis handling: {e}", exc_info=True)
            return {
                "error": f"Lab analysis failed: {str(e)}",
                "query": query,
                "agent_type": "clinical_research"
            }

    async def _handle_clinical_reasoning(
        self,
        query: str,
        analysis: Dict[str, Any],
        patient_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Handle general clinical reasoning using existing BAML functions
        """
        if not BAML_AVAILABLE or not b or not ClinicalDataInput:
            return {
                "error": "BAML client not available for clinical reasoning",
                "query": query,
                "agent_type": "clinical_research",
                "mock_response": True,
                "mock_reasoning": {
                    "assessment": f"Mock clinical assessment for: {query}",
                    "differential_diagnosis": ["Mock diagnosis 1", "Mock diagnosis 2", "Mock diagnosis 3"],
                    "next_steps": ["Mock step 1", "Mock step 2"]
                }
            }

        try:
            logger.info("Executing clinical reasoning using existing BAML functions")

            # Extract patient demographics from context
            demographics = ""
            if patient_context:
                age = patient_context.get("age", "")
                gender = patient_context.get("gender", "")
                primary_diagnosis = patient_context.get("primary_diagnosis", "")
                demographics = f"Age: {age}, Gender: {gender}, Primary Diagnosis: {primary_diagnosis}"

            # Create clinical data input for BAML
            clinical_data = ClinicalDataInput(
                patient_story=query,
                known_findings=[],  # Could be enhanced to extract findings
                patient_demographics=demographics
            )

            # Use SummarizeAndStructureClinicalData for clinical reasoning
            reasoning_result = await b.SummarizeAndStructureClinicalData(clinical_data)

            return {
                "result": {
                    "assessment": reasoning_result.one_sentence_summary,
                    "semantic_qualifiers": reasoning_result.semantic_qualifiers_identified,
                    "key_details": reasoning_result.key_patient_details_abstracted,
                    "suggestions": reasoning_result.suggested_areas_for_further_data_gathering
                },
                "query_type": "clinical_reasoning",
                "agent_type": "clinical_research",
                "service_used": "BAML_SummarizeAndStructureClinicalData"
            }

        except Exception as e:
            logger.error(f"Error in clinical reasoning handling: {e}", exc_info=True)
            return {
                "error": f"Clinical reasoning failed: {str(e)}",
                "query": query,
                "agent_type": "clinical_research"
            }

    # Tool methods that can be called by Langroid

    async def formulate_pico_question(self, query: str) -> str:
        """
        Tool method for PICO question formulation that chains into autonomous research.
        """
        try:
            logger.info(f"Formulating PICO question for query: {query}")
            # Use BAML to formulate the PICO question
            pico_result = await b.FormulateEvidenceBasedPICOQuestion(
                clinical_question=query,
                patient_population="adult patients" # Default, can be enhanced
            )
            
            pico_question = pico_result.formattedQuestion
            logger.info(f"PICO question formulated: {pico_question}")

            # Chain to autonomous_research with the formatted PICO question
            logger.info("Chaining to autonomous_research with PICO question.")
            research_result = await self.autonomous_research(pico_question)
            
            return f"PICO Question: {pico_question}\n\n{research_result}"

        except Exception as e:
            return f"PICO formulation and research failed: {str(e)}"

    async def autonomous_research(self, query: str) -> str:
        """
        Tool method for autonomous research
        """
        try:
            result = await self._handle_research_query(query, {"needs_research": True})
            return f"Research completed: {result.get('result', {}).get('executive_summary', 'No summary available')}"
        except Exception as e:
            return f"Research failed: {str(e)}"

    async def quick_research(self, query: str) -> str:
        """
        Tool method for quick research using simplified service
        """
        try:
            # Use quick mode of existing service
            quick_service = SimpleAutonomousResearchService(research_mode="quick")
            research_input = ResearchTaskInput(
                user_original_query=query,
                quality_filters_applied=[],
                date_range_searched=None,
                language_filters_applied=["english"]
            )

            async with quick_service as service:
                result = await service.conduct_autonomous_research(research_input)

            return f"Quick research completed: {result.executive_summary}"
        except Exception as e:
            return f"Quick research failed: {str(e)}"

    async def analyze_lab_results(self, lab_data: Dict[str, Any]) -> str:
        """
        Tool method for lab analysis
        """
        try:
            result = await self._handle_lab_analysis(
                "Analyze these lab results",
                {"needs_lab_analysis": True, "lab_data": lab_data}
            )
            return f"Lab analysis completed: {result.get('result', {}).get('summary', 'Analysis complete')}"
        except Exception as e:
            return f"Lab analysis failed: {str(e)}"

    async def clinical_reasoning(self, clinical_case: str) -> str:
        """
        Tool method for clinical reasoning
        """
        try:
            result = await self._handle_clinical_reasoning(clinical_case, {})
            return f"Clinical reasoning completed: {result.get('result', {}).get('assessment', 'Reasoning complete')}"
        except Exception as e:
            return f"Clinical reasoning failed: {str(e)}"

    async def patient_context(self, patient_id: str) -> str:
        """
        Tool method for patient context integration
        """
        try:
            # This would integrate with existing patient service
            # For now, return a placeholder
            return f"Patient context retrieved for ID: {patient_id}"
        except Exception as e:
            return f"Patient context retrieval failed: {str(e)}"


def create_clinical_research_agent() -> ClinicalResearchAgent:
    """
    Factory function to create and configure the ClinicalResearchAgent
    """
    if LANGROID_AVAILABLE:
        config = lr.ChatAgentConfig(
            name="Dr. Corvus Clinical Research Agent",
            system_message="""
            You are Dr. Corvus, a clinical research assistant that leverages existing robust infrastructure.

            Your capabilities:
            - Autonomous research using comprehensive multi-source search
            - Quick research for faster results
            - Lab result analysis and interpretation
            - Clinical reasoning and case analysis
            - Patient context integration

            Always use the most appropriate tool for the user's query:
            - autonomous_research: For comprehensive evidence-based research
            - quick_research: For faster research with fewer sources
            - analyze_lab_results: For laboratory result interpretation
            - clinical_reasoning: For clinical case analysis and reasoning
            - patient_context: For integrating patient-specific information

            Provide clear, clinically relevant responses based on the best available evidence.
            """,
            use_tools=True,
            use_functions_api=True,
        )

        agent = ClinicalResearchAgent(config)

        # Enable all tools
        agent.enable_message("autonomous_research")
        agent.enable_message("quick_research")
        agent.enable_message("analyze_lab_results")
        agent.enable_message("clinical_reasoning")
        agent.enable_message("patient_context")

        return agent
    else:
        # Create agent without Langroid configuration
        logger.info("Creating ClinicalResearchAgent without Langroid - using direct method access")
        return ClinicalResearchAgent()