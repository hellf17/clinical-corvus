import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

# Try to import Langroid, set flag based on availability
try:
    import langroid as lr
    from langroid.agent.tool_agent import ToolAgent
    from langroid.agent.tools.orchestration import DoneMessage
    LANGROID_AVAILABLE = True
except ImportError as e:
    logging.warning(f"Langroid not available: {e}")
    LANGROID_AVAILABLE = False
    # Create dummy classes for when Langroid is not available
    class ToolAgent:
        def __init__(self, config):
            self.config = config
    
    class DoneMessage:
        pass
    
    # Create dummy lr namespace
    class lr:
        class agent:
            class ToolMessage:
                pass
        class ChatAgentConfig:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

# Import BAML types and client conditionally
try:
    from baml_client import b
    from baml_client.types import (
        IllnessScriptInput,
        IllnessScriptOutput,
        ExpandDifferentialDiagnosisInput,
        ExpandedDdxOutput,
        DdxQuestioningInput,
        ClinicalWorkflowQuestionsOutput,
        ClinicalScenarioInput,
        PICOFormulationOutput,
        ResearchTaskInput,
        FormulatedSearchStrategyOutput,
        RawSearchResultItem,
        SynthesizedResearchOutput,
        PDFAnalysisInput,
        PDFAnalysisOutput,
        EvidenceAnalysisData,
        EvidenceAppraisalOutput as GradeEvidenceAppraisalOutput,
        DiagnosticTimeoutInput,
        DiagnosticTimeoutOutput,
        SelfReflectionInput,
        SelfReflectionFeedbackOutput,
        LabAnalysisInput,
        LabInsightsOutput,
        ResearchSourceType
    )
    BAML_AVAILABLE = True
    logger.info("BAML client available for academy tools")
except ImportError as e:
    logger.warning(f"BAML client not available for academy tools: {e}")
    BAML_AVAILABLE = False
    b = None
    # Set all BAML types to None
    IllnessScriptInput = None
    IllnessScriptOutput = None
    ExpandDifferentialDiagnosisInput = None
    ExpandedDdxOutput = None
    DdxQuestioningInput = None
    ClinicalWorkflowQuestionsOutput = None
    ClinicalScenarioInput = None
    PICOFormulationOutput = None
    ResearchTaskInput = None
    FormulatedSearchStrategyOutput = None
    RawSearchResultItem = None
    SynthesizedResearchOutput = None
    PDFAnalysisInput = None
    PDFAnalysisOutput = None
    EvidenceAnalysisData = None
    GradeEvidenceAppraisalOutput = None
    DiagnosticTimeoutInput = None
    DiagnosticTimeoutOutput = None
    SelfReflectionInput = None
    SelfReflectionFeedbackOutput = None
    LabAnalysisInput = None
    LabInsightsOutput = None
    ResearchSourceType = None

# --- Langroid Tools for Academy Functions ---

class GenerateIllnessScriptTool(lr.agent.ToolMessage if LANGROID_AVAILABLE else object):
    """
    Ferramenta para gerar um "illness script" estruturado para uma doença específica.
    """
    request: str = "generate_illness_script"
    purpose: str = """
    Gera um "illness script" estruturado para uma doença ou condição médica específica.
    Use esta ferramenta quando precisar de uma representação organizada de uma doença,
    incluindo fatores predisponentes, fisiopatologia, sinais e sintomas chave,
    e diagnósticos relevantes.
    """
    disease_name: str = Field(..., description="Nome da doença ou condição médica para a qual gerar o illness script.")

class ExpandDifferentialDiagnosisTool(lr.agent.ToolMessage if LANGROID_AVAILABLE else object):
    """
    Ferramenta para expandir uma lista de diagnósticos diferenciais usando abordagens sistemáticas.
    """
    request: str = "expand_differential_diagnosis"
    purpose: str = """
    Expande uma lista inicial de diagnósticos diferenciais para uma que inclua
    condições críticas, mais prováveis e expandidas sistematicamente, usando
    abordagens como VINDICATE ou anatômicas.
    """
    presenting_complaint: str = Field(..., description="Queixa principal e sintomas subjetivos do paciente.")
    clinical_signs: Optional[str] = Field(None, description="Sinais clínicos objetivos e achados do exame físico.")
    patient_demographics: Optional[str] = Field(None, description="Contexto relevante do paciente: idade, sexo, comorbidades, fatores de risco.")
    user_initial_ddx_list: List[str] = Field(..., description="Lista inicial de diagnósticos diferenciais fornecida pelo usuário.")

class GenerateClinicalWorkflowQuestionsTool(lr.agent.ToolMessage if LANGROID_AVAILABLE else object):
    """
    Ferramenta para gerar perguntas-chave para o diagnóstico diferencial.
    """
    request: str = "generate_clinical_workflow_questions"
    purpose: str = """
    Gera perguntas essenciais e priorizadas para auxiliar na construção do
    diagnóstico diferencial, focando em caracterização da queixa, revisão
    focada de sistemas, fatores de risco e sinais de alarme (red flags).
    """
    chief_complaint: str = Field(..., description="Queixa principal do paciente.")
    initial_findings: List[Dict[str, str]] = Field(..., description="Achados iniciais da história e exame do paciente (lista de dicionários com 'finding_name', 'details', etc.).")
    patient_demographics: str = Field(..., description="Informações demográficas do paciente (ex: idade, sexo).")

class FormulatePICOQuestionTool(lr.agent.ToolMessage if LANGROID_AVAILABLE else object):
    """
    Ferramenta para formular uma questão PICO estruturada a partir de um cenário clínico.
    """
    request: str = "formulate_pico_question"
    purpose: str = """
    Analisa um cenário clínico e o transforma em uma questão PICO (População, Intervenção,
    Comparação, Desfecho) bem estruturada para facilitar a busca de evidências.
    """
    clinical_scenario: str = Field(..., description="Descrição do cenário clínico ou da dúvida do usuário.")
    additional_context: Optional[str] = Field(None, description="Contexto adicional sobre o paciente ou situação clínica.")

class FormulateDeepResearchStrategyTool(lr.agent.ToolMessage if LANGROID_AVAILABLE else object):
    """
    Ferramenta para formular uma estratégia de pesquisa profunda para evidências médicas.
    """
    request: str = "formulate_deep_research_strategy"
    purpose: str = """
    Analisa uma questão de pesquisa e formula uma estratégia abrangente e eficaz
    para a busca de evidências em múltiplas fontes, incluindo PubMed, web e diretrizes.
    """
    user_original_query: str = Field(..., description="A pergunta de pesquisa original do usuário.")
    research_focus: Optional[str] = Field(None, description="Foco específico da pesquisa (ex: 'tratamento', 'diagnóstico', 'prognóstico').")
    target_audience: Optional[str] = Field(None, description="Público-alvo (ex: 'estudante de medicina', 'médico praticante').")

class SynthesizeDeepResearchTool(lr.agent.ToolMessage if LANGROID_AVAILABLE else object):
    """
    Ferramenta para sintetizar resultados de pesquisa profunda em um relatório estruturado.
    """
    request: str = "synthesize_deep_research"
    purpose: str = """
    Sintetiza resultados de pesquisa coletados de múltiplas fontes em um relatório
    detalhado, incluindo resumo executivo, achados chave por tema, implicações
    clínicas e avaliação da qualidade da evidência.
    """
    original_query: str = Field(..., description="A pergunta de pesquisa original que gerou os resultados.")
    search_results: List[Dict[str, Any]] = Field(..., description="Lista de dicionários contendo os resultados brutos da pesquisa.")

class AnalyzePDFDocumentTool(lr.agent.ToolMessage if LANGROID_AVAILABLE else object):
    """
    Ferramenta para analisar documentos PDF médicos e extrair dados estruturados.
    """
    request: str = "analyze_pdf_document"
    purpose: str = """
    Extrai e estrutura informações de um documento PDF médico, como objetivo do estudo,
    design, população, intervenções, resultados chave e conclusões.
    """
    pdf_content: str = Field(..., description="Conteúdo de texto extraído do PDF.")
    analysis_focus: Optional[str] = Field(None, description="Foco específico para a análise (ex: 'metodologia', 'resultados').")
    clinical_question: Optional[str] = Field(None, description="Pergunta clínica para avaliar o PDF (contexto).")
    source_type: Optional[str] = Field(None, description="Tipo de fonte (ex: 'journal_article', 'clinical_guideline').")
    publication_year: Optional[int] = Field(None, description="Ano de publicação do documento.")

class GenerateEvidenceAppraisalTool(lr.agent.ToolMessage if LANGROID_AVAILABLE else object):
    """
    Ferramenta para realizar a avaliação crítica de evidências médicas (GRADE framework).
    """
    request: str = "generate_evidence_appraisal"
    purpose: str = """
    Avalia criticamente a evidência extraída de um estudo médico, utilizando o
    framework GRADE para determinar a qualidade da evidência e a força da recomendação,
    identificando vieses e fornecendo recomendações para a prática.
    """
    extracted_data: Dict[str, Any] = Field(..., description="Dados estruturados extraídos de um artigo médico.")
    clinical_question: Optional[str] = Field(None, description="Pergunta clínica que o estudo tenta responder (contexto).")

class GenerateDiagnosticTimeoutTool(lr.agent.ToolMessage if LANGROID_AVAILABLE else object):
    """
    Ferramenta para sugerir um "diagnostic timeout" em um caso clínico.
    """
    request: str = "generate_diagnostic_timeout"
    purpose: str = """
    Fornece orientações estruturadas para uma pausa ("diagnostic timeout") no processo
    diagnóstico, sugerindo diagnósticos alternativos, perguntas chave, sinais de alarme
    e verificações cognitivas para evitar vieses.
    """
    case_description: str = Field(..., description="Descrição do caso clínico em andamento.")
    current_working_diagnosis: str = Field(..., description="Diagnóstico atual que o médico está considerando.")
    time_elapsed_minutes: Optional[int] = Field(None, description="Tempo decorrido desde o início do caso em minutos.")
    complexity_level: Optional[str] = Field(None, description="Nível de complexidade do caso: 'simple', 'moderate', 'complex'.")

class ProvideSelfReflectionFeedbackTool(lr.agent.ToolMessage if LANGROID_AVAILABLE else object):
    """
    Ferramenta para fornecer feedback de auto-reflexão sobre o raciocínio diagnóstico.
    """
    request: str = "provide_self_reflection_feedback"
    purpose: str = """
    Ajuda o usuário a refletir sobre seu próprio processo de pensamento diagnóstico,
    identificando padrões de raciocínio, pontos de reflexão sobre vieses cognitivos,
    e desafios para testar a robustez de suas conclusões.
    """
    clinical_scenario: str = Field(..., description="Resumo do caso clínico fornecido pelo usuário.")
    user_hypothesis: str = Field(..., description="A principal hipótese ou conclusão diagnóstica do usuário.")
    user_reasoning_summary: str = Field(..., description="A explicação do usuário sobre como chegou à sua hipótese.")

class GenerateDrCorvusInsightsTool(lr.agent.ToolMessage if LANGROID_AVAILABLE else object):
    """
    Ferramenta para gerar insights clínicos a partir de resultados de exames laboratoriais.
    """
    request: str = "generate_dr_corvus_insights"
    purpose: str = """
    Analisa resultados de exames laboratoriais, identifica achados anormais,
    fornece interpretação fisiopatológica, sugere diagnósticos diferenciais
    e recomenda próximos passos, tudo em um formato de raciocínio clínico estruturado.
    """
    lab_results: List[Dict[str, Any]] = Field(..., description="Lista de dicionários contendo os resultados dos exames laboratoriais.")
    user_role: str = Field(..., description="Papel do usuário: 'PATIENT' ou 'DOCTOR_STUDENT'.")
    patient_context: Optional[str] = Field(None, description="Contexto adicional do paciente.")
    specific_user_query: Optional[str] = Field(None, description="Pergunta específica do usuário sobre os resultados.")


# --- Langroid Agent for Academy Tools ---

class ClinicalAcademyAgent(ToolAgent):
    """
    Agente Langroid especializado em fornecer ferramentas e feedback
    para o aprendizado do raciocínio clínico na Academia.
    """
    def __init__(self, config: lr.ChatAgentConfig):
        super().__init__(config)
        
    async def generate_illness_script(self, msg: GenerateIllnessScriptTool) -> str:
        try:
            logger.info(f"Generating illness script for: {msg.disease_name}")
            baml_input = IllnessScriptInput(disease_name=msg.disease_name)
            result: IllnessScriptOutput = await b.GenerateIllnessScript(baml_input)
            
            # Format the output for the agent
            formatted_output = f"""
            **Illness Script para: {result.disease_name}**
            - **Condições Predisponentes:** {', '.join(result.predisposing_conditions)}
            - **Fisiopatologia:** {result.pathophysiology_summary}
            - **Sintomas e Sinais Chave:** {', '.join(result.key_symptoms_and_signs)}
            - **Diagnósticos Relevantes:** {', '.join(result.relevant_diagnostics or ['N/A'])}
            """
            logger.info("Illness script generated successfully.")
            return formatted_output
        except Exception as e:
            logger.error(f"Error generating illness script: {e}")
            return f"Error generating illness script: {str(e)}"
            
    async def expand_differential_diagnosis(self, msg: ExpandDifferentialDiagnosisTool) -> str:
        try:
            logger.info(f"Expanding differential diagnosis for: {msg.presenting_complaint}")
            baml_input = ExpandDifferentialDiagnosisInput(
                presenting_complaint=msg.presenting_complaint,
                clinical_signs=msg.clinical_signs,
                patient_demographics=msg.patient_demographics,
                user_initial_ddx_list=msg.user_initial_ddx_list
            )
            result: ExpandedDdxOutput = await b.ExpandDifferentialDiagnosis(baml_input)
            
            formatted_output = f"""
            **Expansão do Diagnóstico Diferencial:**
            - **Abordagem Aplicada:** {result.applied_approach_description}
            - **Diagnósticos Sugeridos:**
            """
            for ddx in result.suggested_diagnoses:
                formatted_output += f"""
                - **{ddx.diagnosis_name}** ({ddx.suspicion_level.value}): {ddx.rationale}
                """
            logger.info("Differential diagnosis expanded successfully.")
            return formatted_output
        except Exception as e:
            logger.error(f"Error expanding differential diagnosis: {e}")
            return f"Error expanding differential diagnosis: {str(e)}"

    async def generate_clinical_workflow_questions(self, msg: GenerateClinicalWorkflowQuestionsTool) -> str:
        try:
            logger.info(f"Generating clinical workflow questions for: {msg.chief_complaint}")
            
            # Ensure initial_findings is correctly mapped to BAML's ClinicalFinding
            baml_initial_findings = [
                b.ClinicalFinding(
                    finding_name=f['finding_name'],
                    details=f.get('details'),
                    onset_duration_pattern=f.get('onset_duration_pattern'),
                    severity_level=f.get('severity_level')
                ) for f in msg.initial_findings
            ]

            baml_input = DdxQuestioningInput(
                chief_complaint=msg.chief_complaint,
                initial_findings=baml_initial_findings,
                patient_demographics=msg.patient_demographics
            )
            result: ClinicalWorkflowQuestionsOutput = await b.GenerateClinicalWorkflowQuestions(baml_input)
            
            formatted_output = f"""
            **Perguntas para Diagnóstico Diferencial:**
            - **Racional Geral:** {result.overall_rationale}
            - **Sinais de Alarme (Red Flags):** {', '.join(result.red_flag_questions)}
            """
            for category in result.question_categories:
                formatted_output += f"""
                - **{category.category_name}** ({category.category_rationale}):
                  {'; '.join(category.questions)}
                """
            logger.info("Clinical workflow questions generated successfully.")
            return formatted_output
        except Exception as e:
            logger.error(f"Error generating clinical workflow questions: {e}")
            return f"Error generating clinical workflow questions: {str(e)}"

    async def formulate_pico_question(self, msg: FormulatePICOQuestionTool) -> str:
        try:
            logger.info(f"Formulating PICO question for: {msg.clinical_scenario}")
            baml_input = ClinicalScenarioInput(
                clinical_scenario=msg.clinical_scenario,
                additional_context=msg.additional_context
            )
            result: PICOFormulationOutput = await b.FormulateEvidenceBasedPICOQuestion(baml_input)
            
            formatted_output = f"""
            **Questão PICO Formulada:**
            - **P (População):** {result.structured_pico_question.patient_population}
            - **I (Intervenção):** {result.structured_pico_question.intervention}
            - **C (Comparação):** {result.structured_pico_question.comparison or 'N/A'}
            - **O (Desfecho):** {result.structured_pico_question.outcome}
            - **T (Tempo):** {result.structured_pico_question.time_frame or 'N/A'}
            - **S (Tipo de Estudo):** {result.structured_pico_question.study_type or 'N/A'}
            
            **Questão Completa:** {result.structured_question}
            **Explicação:** {result.explanation}
            **Sugestões de Termos de Busca:** {', '.join(result.search_terms_suggestions)}
            """
            logger.info("PICO question formulated successfully.")
            return formatted_output
        except Exception as e:
            logger.error(f"Error formulating PICO question: {e}")
            return f"Error formulating PICO question: {str(e)}"

    async def formulate_deep_research_strategy(self, msg: FormulateDeepResearchStrategyTool) -> str:
        try:
            logger.info(f"Formulating deep research strategy for: {msg.user_original_query}")
            baml_input = ResearchTaskInput(
                user_original_query=msg.user_original_query,
                research_focus=msg.research_focus,
                target_audience=msg.target_audience
            )
            result: FormulatedSearchStrategyOutput = await b.FormulateDeepResearchStrategy(baml_input)
            
            formatted_output = f"""
            **Estratégia de Pesquisa Profunda Formulada:**
            - **Query Refinada para Síntese:** {result.refined_query_for_llm_synthesis}
            - **Racional da Busca:** {result.search_rationale}
            - **Tipos de Evidência Esperados:** {', '.join(result.expected_evidence_types)}
            - **Parâmetros de Busca por Fonte:**
            """
            for param in result.search_parameters_list:
                formatted_output += f"""
                -- **Fonte:** {param.source.value}
                   - **Query:** {param.query_string}
                   - **Max Resultados:** {param.max_results}
                   - **Racional:** {param.rationale or 'N/A'}
                """
            logger.info("Deep research strategy formulated successfully.")
            return formatted_output
        except Exception as e:
            logger.error(f"Error formulating deep research strategy: {e}")
            return f"Error formulating deep research strategy: {str(e)}"

    async def synthesize_deep_research(self, msg: SynthesizeDeepResearchTool) -> str:
        try:
            logger.info(f"Synthesizing deep research results for: {msg.original_query}")
            
            # Convert dicts to RawSearchResultItem BAML types
            baml_search_results = []
            for res_dict in msg.search_results:
                try:
                    # Attempt to map string source to enum, default if not found
                    source_enum = ResearchSourceType._member_map_.get(res_dict.get("source", "").upper(), ResearchSourceType.WEB_SEARCH_BRAVE)
                    baml_search_results.append(RawSearchResultItem(
                        source=source_enum,
                        title=res_dict.get("title"),
                        url=res_dict.get("url"),
                        snippet_or_abstract=res_dict.get("snippet_or_abstract"),
                        publication_date=res_dict.get("publication_date"),
                        authors=res_dict.get("authors"),
                        journal=res_dict.get("journal"),
                        pmid=res_dict.get("pmid"),
                        doi=res_dict.get("doi"),
                        study_type=res_dict.get("study_type"),
                        citation_count=res_dict.get("citation_count"),
                        relevance_score=res_dict.get("relevance_score"),
                        composite_impact_score=res_dict.get("composite_impact_score"),
                        academic_source_name=res_dict.get("academic_source_name")
                    ))
                except Exception as inner_e:
                    logger.warning(f"Failed to convert search result item to BAML type: {res_dict}. Error: {inner_e}")
                    continue

            # Assuming SynthesizeDeepResearch can take RawSearchResultItem list directly
            result: SynthesizedResearchOutput = await b.SynthesizeDeepResearch(
                original_query=msg.original_query,
                search_results=baml_search_results
            )
            
            formatted_output = f"""
            **Síntese de Pesquisa Profunda:**
            - **Resumo Executivo:** {result.executive_summary}
            - **Implicações Clínicas:** {'; '.join(result.clinical_implications or ['N/A'])}
            - **Lacunas na Pesquisa:** {'; '.join(result.research_gaps_identified or ['N/A'])}
            - **Avaliação da Qualidade da Evidência:** {result.evidence_quality_assessment}
            - **Achados Chave por Tema:**
            """
            for theme in result.key_findings_by_theme:
                formatted_output += f"""
                -- **Tema:** {theme.theme_name} (Força: {theme.strength_of_evidence})
                   - **Achados:** {'; '.join(theme.key_findings)}
                """
            formatted_output += f"""
            **Referências Relevantes (Top 5):**
            """
            for ref in result.relevant_references[:5]:
                formatted_output += f"""
                - {ref.title} ({ref.journal}, {ref.publication_date})
                """
            logger.info("Deep research results synthesized successfully.")
            return formatted_output
        except Exception as e:
            logger.error(f"Error synthesizing deep research results: {e}")
            return f"Error synthesizing deep research results: {str(e)}"

    async def analyze_pdf_document(self, msg: AnalyzePDFDocumentTool) -> str:
        try:
            logger.info(f"Analyzing PDF document with focus: {msg.analysis_focus}")
            baml_input = PDFAnalysisInput(
                pdf_content=msg.pdf_content,
                analysis_focus=msg.analysis_focus,
                clinical_question=msg.clinical_question
            )
            result: PDFAnalysisOutput = await b.AnalyzePDFDocument(baml_input)
            
            formatted_output = f"""
            **Análise de Documento PDF:**
            - **Tipo de Documento:** {result.document_type}
            - **Resumo da Metodologia:** {result.methodology_summary}
            - **Relevância Clínica:** {result.clinical_relevance}
            - **Qualidade da Evidência:** {result.evidence_quality}
            - **Achados Chave:** {'; '.join(result.key_findings)}
            - **Limitações:** {'; '.join(result.limitations)}
            """
            logger.info("PDF document analyzed successfully.")
            return formatted_output
        except Exception as e:
            logger.error(f"Error analyzing PDF document: {e}")
            return f"Error analyzing PDF document: {str(e)}"

    async def generate_evidence_appraisal(self, msg: GenerateEvidenceAppraisalTool) -> str:
        try:
            logger.info(f"Generating evidence appraisal for clinical question: {msg.clinical_question}")
            
            # Convert dict to EvidenceAnalysisData BAML type
            baml_extracted_data = EvidenceAnalysisData(
                study_objective=msg.extracted_data.get("study_objective"),
                study_design=msg.extracted_data.get("study_design"),
                population=msg.extracted_data.get("population"),
                interventions=msg.extracted_data.get("interventions"),
                primary_outcomes=msg.extracted_data.get("primary_outcomes"),
                key_results=msg.extracted_data.get("key_results"),
                authors_conclusions=msg.extracted_data.get("authors_conclusions"),
                authors_acknowledged_limitations=msg.extracted_data.get("authors_acknowledged_limitations")
            )

            result: GradeEvidenceAppraisalOutput = await b.GenerateEvidenceAppraisal(
                extracted_data=baml_extracted_data,
                clinical_question=msg.clinical_question
            )
            
            formatted_output = f"""
            **Avaliação de Evidência (Framework GRADE):**
            - **Qualidade Geral da Evidência:** {result.grade_summary.overall_quality.value}
            - **Força da Recomendação:** {result.grade_summary.recommendation_strength.value}
            - **Resumo dos Achados:** {result.grade_summary.summary_of_findings}
            - **Recomendação para a Prática:** {result.practice_recommendations.clinical_application}
            - **Advertências da Evidência:** {result.practice_recommendations.evidence_caveats}
            - **Fatores de Qualidade:**
            """
            for qf in result.quality_factors:
                formatted_output += f"""
                -- **{qf.factor_name}** ({qf.assessment.value}): {qf.justification}
                """
            formatted_output += f"""
            - **Análise de Vieses:**
            """
            for ba in result.bias_analysis:
                formatted_output += f"""
                -- **{ba.bias_type}**: {ba.potential_impact} (Sugestão: {ba.actionable_suggestion})
                """
            logger.info("Evidence appraisal generated successfully.")
            return formatted_output
        except Exception as e:
            logger.error(f"Error generating evidence appraisal: {e}")
            return f"Error generating evidence appraisal: {str(e)}"

    async def generate_diagnostic_timeout(self, msg: GenerateDiagnosticTimeoutTool) -> str:
        try:
            logger.info(f"Generating diagnostic timeout for: {msg.case_description}")
            baml_input = DiagnosticTimeoutInput(
                case_description=msg.case_description,
                current_working_diagnosis=msg.current_working_diagnosis,
                time_elapsed_minutes=msg.time_elapsed_minutes,
                complexity_level=msg.complexity_level
            )
            result: DiagnosticTimeoutOutput = await b.GenerateDiagnosticTimeout(baml_input)
            
            formatted_output = f"""
            **Sugestão de Diagnostic Timeout:**
            - **Recomendação:** {result.timeout_recommendation}
            - **Diagnósticos Alternativos a Considerar:** {'; '.join(result.alternative_diagnoses_to_consider)}
            - **Perguntas Chave a Fazer:** {'; '.join(result.key_questions_to_ask)}
            - **Sinais de Alarme a Verificar:** {'; '.join(result.red_flags_to_check)}
            - **Próximos Passos Sugeridos:** {'; '.join(result.next_steps_suggested)}
            - **Verificações Cognitivas:** {'; '.join(result.cognitive_checks)}
            """
            logger.info("Diagnostic timeout generated successfully.")
            return formatted_output
        except Exception as e:
            logger.error(f"Error generating diagnostic timeout: {e}")
            return f"Error generating diagnostic timeout: {str(e)}"

    async def provide_self_reflection_feedback(self, msg: ProvideSelfReflectionFeedbackTool) -> str:
        try:
            logger.info(f"Providing self-reflection feedback for: {msg.user_hypothesis}")
            baml_input = SelfReflectionInput(
                clinical_scenario=msg.clinical_scenario,
                user_hypothesis=msg.user_hypothesis,
                user_reasoning_summary=msg.user_reasoning_summary
            )
            result: SelfReflectionFeedbackOutput = await b.ProvideSelfReflectionFeedback(baml_input)
            
            formatted_output = f"""
            **Feedback de Auto-Reflexão:**
            - **Padrão de Raciocínio Identificado:** {result.identified_reasoning_pattern}
            - **Pontos de Reflexão sobre Vieses:**
            """
            for bias_point in result.bias_reflection_points:
                formatted_output += f"""
                -- **Viés:** {bias_point.bias_type.value}
                   - **Questão para Reflexão:** {bias_point.reflection_question}
                """
            formatted_output += f"""
            - **Desafio do Advogado do Diabo:** {result.devils_advocate_challenge}
            - **Próxima Ação Reflexiva Sugerida:** {result.suggested_next_reflective_action}
            """
            logger.info("Self-reflection feedback provided successfully.")
            return formatted_output
        except Exception as e:
            logger.error(f"Error providing self-reflection feedback: {e}")
            return f"Error providing self-reflection feedback: {str(e)}"

    async def generate_dr_corvus_insights(self, msg: GenerateDrCorvusInsightsTool) -> str:
        try:
            logger.info(f"Generating Dr. Corvus insights for lab results.")
            
            # Convert list of dicts to list of LabTestResult BAML types
            baml_lab_results = []
            for lr_dict in msg.lab_results:
                baml_lab_results.append(b.LabTestResult(
                    test_name=lr_dict.get("test_name"),
                    value=lr_dict.get("value"),
                    unit=lr_dict.get("unit"),
                    reference_range_low=lr_dict.get("reference_range_low"),
                    reference_range_high=lr_dict.get("reference_range_high"),
                    interpretation_flag=lr_dict.get("interpretation_flag"),
                    notes=lr_dict.get("notes")
                ))

            baml_input = LabAnalysisInput(
                lab_results=baml_lab_results,
                user_role=b.UserRole[msg.user_role.upper()], # Ensure enum conversion
                patient_context=msg.patient_context,
                specific_user_query=msg.specific_user_query
            )
            result: LabInsightsOutput = await b.GenerateDrCorvusInsights(baml_input)
            
            formatted_output = f"""
            **Insights do Dr. Corvus (Análise Laboratorial):**
            - **Resumo Clínico:** {result.clinical_summary}
            - **Resultados Importantes para Discutir com Médico:** {'; '.join(result.important_results_to_discuss_with_doctor)}
            
            **Raciocínio Clínico Detalhado:**
            {result.professional_detailed_reasoning_cot}
            """
            logger.info("Dr. Corvus insights generated successfully.")
            return formatted_output
        except Exception as e:
            logger.error(f"Error generating Dr. Corvus insights: {e}")
            return f"Error generating Dr. Corvus insights: {str(e)}"

def create_clinical_academy_agent():
    """Cria e configura um agente de academia clínica."""
    
    if not LANGROID_AVAILABLE:
        logger.warning("Langroid not available, returning simplified academy agent")
        # Return a simple mock agent when Langroid is not available
        class MockAgent:
            def __init__(self):
                pass
            async def agent_response(self, query: str) -> str:
                return f"Academy agent response (simplified mode): {query}"
        return MockAgent()
    
    config = lr.ChatAgentConfig(
        name="Clinical Academy Agent",
        system_message="""
        Você é o Dr. Corvus, um agente especializado em auxiliar estudantes e profissionais
        de saúde no aprimoramento do raciocínio clínico através de ferramentas interativas
        da Academia Clínica.

        Sua missão é fornecer feedback estruturado, gerar insights e simulações
        que ajudem o usuário a desenvolver habilidades em:
        - Construção de "Illness Scripts"
        - Expansão de Diagnósticos Diferenciais
        - Geração de Perguntas Clínicas
        - Formulação de Questões PICO
        - Pesquisa e Análise de Evidências
        - Exercícios de "Diagnostic Timeout" e Auto-Reflexão
        - Análise de Exames Laboratoriais

        Sempre utilize as ferramentas disponíveis para responder às solicitações
        do usuário, guiando-o através dos conceitos da medicina baseada em evidências
        e do raciocínio diagnóstico. Seja didático, encorajador e preciso.

        FERRAMENTAS DISPONÍVEIS:
        - generate_illness_script: Gera um "illness script" para uma doença.
        - expand_differential_diagnosis: Expande uma lista de diagnósticos diferenciais.
        - generate_clinical_workflow_questions: Gera perguntas para o diagnóstico diferencial.
        - formulate_pico_question: Formula uma questão PICO.
        - formulate_deep_research_strategy: Formula uma estratégia de pesquisa profunda.
        - synthesize_deep_research: Sintetiza resultados de pesquisa profunda.
        - analyze_pdf_document: Analisa documentos PDF médicos.
        - generate_evidence_appraisal: Avalia criticamente evidências médicas (GRADE).
        - generate_diagnostic_timeout: Sugere um "diagnostic timeout".
        - provide_self_reflection_feedback: Feedback de auto-reflexão.
        - generate_dr_corvus_insights: Gera insights a partir de exames laboratoriais.

        Ao interagir com o usuário, sempre tente mapear a intenção dele a uma das
        ferramentas disponíveis. Se a ferramenta retornar um resultado, apresente-o
        de forma clara e concisa. Se precisar de mais informações para usar uma ferramenta,
        solicite-as ao usuário de forma específica.
        """,
        use_tools=True, # Important: enable tool usage
        use_functions_api=True,
        vecdb=None,
    )
    
    agent = ClinicalAcademyAgent(config)
    
    # Habilitar todas as ferramentas
    agent.enable_message(GenerateIllnessScriptTool)
    agent.enable_message(ExpandDifferentialDiagnosisTool)
    agent.enable_message(GenerateClinicalWorkflowQuestionsTool)
    agent.enable_message(FormulatePICOQuestionTool)
    agent.enable_message(FormulateDeepResearchStrategyTool)
    agent.enable_message(SynthesizeDeepResearchTool)
    agent.enable_message(AnalyzePDFDocumentTool)
    agent.enable_message(GenerateEvidenceAppraisalTool)
    agent.enable_message(GenerateDiagnosticTimeoutTool)
    agent.enable_message(ProvideSelfReflectionFeedbackTool)
    agent.enable_message(GenerateDrCorvusInsightsTool)
    
    return agent