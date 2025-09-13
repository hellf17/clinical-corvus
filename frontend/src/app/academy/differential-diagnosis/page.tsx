'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { ListPlus, RefreshCw, Info, Brain, Users, HelpCircle, ArrowRight, Lightbulb, BookOpen, Search, Target, ListChecks, Zap, List, Network } from 'lucide-react';
import Link from "next/link";
import MatrixHypothesisComparison from '@/components/academy/MatrixHypothesisComparison';
import { IntegratedWorkflowCard, WorkflowStep } from '@/components/academy/IntegratedWorkflowCard';

// Interfaces baseadas no BAML
interface ExpandDifferentialDiagnosisInput {
  presenting_complaint: string;
  location_if_pain?: string;
  user_initial_ddx_list: string[];
}

interface ExpandedDdxOutput {
  applied_approach_description: string;
  suggested_additional_diagnoses_with_rationale: string[];
}

// Interfaces para o gerador de perguntas de diagnóstico diferencial
interface ClinicalFindingInput {
  finding_name: string;
  details?: string;
  onset_duration_pattern?: string;
  severity_level?: string;
}

interface GenerateDDxQuestionsInput {
  chief_complaint: string;
  initial_findings: ClinicalFindingInput[];
  patient_demographics: string;
}

interface GenerateDDxQuestionsOutput {
  prioritized_questions: string[];
  complementary_questions: string[];
  questioning_rationale: string;
  potential_systems_to_explore: string[];
}

interface QuestionCategory {
  category_name: string;
  questions: string[];
  category_rationale: string;
}

interface ClinicalWorkflowQuestionsOutput {
  question_categories: QuestionCategory[];
  red_flag_questions: string[];
  overall_rationale: string;
}

// Interfaces para Compare and Contrast Hypotheses
interface CaseScenarioInput {
  case_vignette: string;
  initial_findings: ClinicalFindingInput[];
  plausible_hypotheses: string[];
}

interface StudentHypothesisAnalysis {
  hypothesis_name: string;
  supporting_findings: string[];
  refuting_findings: string[];
  key_discriminators_against_others: string[];
}

interface CompareContrastExerciseInput {
  scenario: CaseScenarioInput;
  student_analysis: StudentHypothesisAnalysis[];
}

interface HypothesisComparisonFeedback {
  hypothesis_name: string;
  feedback_on_supporting_findings?: string;
  feedback_on_refuting_findings?: string;
  feedback_on_discriminators?: string;
  expert_comparison_points?: string[];
}

interface CompareContrastFeedbackOutput {
  overall_feedback?: string;
  detailed_feedback_per_hypothesis: HypothesisComparisonFeedback[];
  suggested_learning_focus?: string;
}

// Add interfaces for the new matrix approach near the other interfaces
interface HypothesisFindingAnalysis {
  finding_name: string;
  hypothesis_name: string;
  student_evaluation: 'SUPPORTS' | 'NEUTRAL' | 'REFUTES';
  student_rationale?: string;
}

interface ExpertHypothesisFindingAnalysis {
  finding_name: string;
  hypothesis_name: string;
  expert_evaluation: 'SUPPORTS' | 'NEUTRAL' | 'REFUTES';
  expert_rationale: string;
}

interface MatrixFeedbackOutput {
  overall_matrix_feedback: string;
  discriminator_feedback: string;
  expert_matrix_analysis: ExpertHypothesisFindingAnalysis[];
  expert_recommended_discriminator: string;
  expert_discriminator_rationale: string;
  learning_focus_suggestions: string[];
  matrix_accuracy_score?: number;
}

// Sample cases for different difficulty levels
const clinicalCases: { [key: string]: CaseScenarioInput } = {
  basic: {
    case_vignette: "Paciente feminina, 25 anos, previamente hígida, apresenta-se com dor abdominal em cólica no quadrante inferior direito há 8 horas, acompanhada de náuseas e dois episódios de vômito. Refere que a dor iniciou difusamente ao redor do umbigo e depois migrou para a fossa ilíaca direita. Ao exame físico: febril (38.2°C), abdome com dor à palpação em ponto de McBurney, sinal de Blumberg positivo.",
  initial_findings: [
      { finding_name: "Dor abdominal migratória", details: "Iniciou periumbilical, depois FID", onset_duration_pattern: "8 horas de evolução", severity_level: "Moderada a intensa" },
      { finding_name: "Náuseas e vômitos", details: "2 episódios", onset_duration_pattern: "Associados à dor" },
      { finding_name: "Febre", details: "38.2°C" },
      { finding_name: "Sinal de Blumberg", details: "Positivo em FID" },
      { finding_name: "Dor em ponto de McBurney", details: "Palpação dolorosa" }
    ],
    plausible_hypotheses: ["Apendicite Aguda", "Cistite", "Cólica Renal"]
  },
  
  intermediate: {
    case_vignette: "Homem, 55 anos, diabético e hipertenso, chega ao PS com dor torácica intensa que iniciou há 3 horas durante atividade física. Dor em aperto, irradiando para braço esquerdo e mandíbula. Sudorese profusa, náuseas. Nega dispneia significativa. PA: 160/95 mmHg, FC: 95 bpm. ECG mostra elevação do segmento ST em DII, DIII e aVF.",
    initial_findings: [
      { finding_name: "Dor torácica", details: "Intensa, em aperto, irradiando para braço esquerdo e mandíbula", onset_duration_pattern: "3 horas, durante exercício", severity_level: "Intensa" },
      { finding_name: "Sudorese profusa", onset_duration_pattern: "Associada à dor" },
      { finding_name: "Náuseas", onset_duration_pattern: "Associadas" },
      { finding_name: "Hipertensão arterial", details: "PA: 160/95 mmHg" },
      { finding_name: "Elevação de ST", details: "Em DII, DIII e aVF no ECG" }
    ],
    plausible_hypotheses: ["IAM de Parede Inferior", "Angina Instável", "Pericardite Aguda"]
  },
  
  advanced: {
    case_vignette: "Mulher, 45 anos, com histórico de lúpus eritematoso sistêmico, apresenta quadro de 5 dias de febre (39°C), dor torácica pleurítica, dispneia progressiva e tosse seca. Relata também artralgia em punhos e joelhos. Ao exame: frequência respiratória 28 ipm, estertores crepitantes em base pulmonar esquerda, rash malar discreta. Raio-X de tórax mostra infiltrado em lobo inferior esquerdo.",
    initial_findings: [
      { finding_name: "Febre persistente", details: "39°C", onset_duration_pattern: "5 dias", severity_level: "Alta" },
      { finding_name: "Dor torácica pleurítica", onset_duration_pattern: "5 dias", severity_level: "Moderada" },
      { finding_name: "Dispneia progressiva", onset_duration_pattern: "5 dias, progressiva" },
      { finding_name: "Artralgia", details: "Punhos e joelhos" },
      { finding_name: "Estertores crepitantes", details: "Base pulmonar esquerda" },
      { finding_name: "Infiltrado pulmonar", details: "Lobo inferior esquerdo no RX" }
    ],
    plausible_hypotheses: ["Pneumonia Bacteriana", "Pneumonite Lúpica", "Embolia Pulmonar"]
  },
  
  expert: {
    case_vignette: "Homem, 72 anos, ex-tabagista, com DPOC conhecida, apresenta piora da dispneia usual há 2 semanas, associada a dor torácica vaga, fadiga progressiva e perda ponderal não intencional de 4 kg em 2 meses. Nega febre. Ao exame: emagrecido, linfonodomegalia cervical palpável, diminuição do murmúrio vesicular em ápice direito, baqueteamento digital discreto. TC de tórax revela massa pulmonar em lobo superior direito com linfonodos mediastinais aumentados.",
    initial_findings: [
      { finding_name: "Piora da dispneia", details: "Sobre dispneia basal (DPOC)", onset_duration_pattern: "2 semanas", severity_level: "Progressiva" },
      { finding_name: "Dor torácica vaga", onset_duration_pattern: "2 semanas" },
      { finding_name: "Perda ponderal", details: "4 kg", onset_duration_pattern: "2 meses", severity_level: "Não intencional" },
      { finding_name: "Linfonodomegalia cervical", details: "Palpável" },
      { finding_name: "Massa pulmonar", details: "Lobo superior direito na TC" },
      { finding_name: "Linfonodos mediastinais", details: "Aumentados na TC" }
    ],
    plausible_hypotheses: ["Carcinoma Brônquico", "Linfoma Pulmonar", "Tuberculose Pulmonar"]
  }
};

// Componente de Loading Skeleton para diagnósticos expandidos
const ExpandedDdxSkeleton = () => (
  <div className="mt-6 space-y-6 animate-pulse">
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-start">
        <div className="w-8 h-8 bg-gray-300 rounded-full mr-3 flex-shrink-0"></div>
        <div className="flex-1">
          <div className="h-5 bg-gray-300 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-300 rounded w-full mb-1"></div>
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        </div>
      </div>
    </div>
    <div className="space-y-4">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="h-5 bg-gray-300 rounded w-1/2 mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-4/5"></div>
          <div className="h-4 bg-gray-300 rounded w-3/5"></div>
        </div>
      </div>
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <div className="h-5 bg-gray-300 rounded w-1/2 mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-300 rounded w-full"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  </div>
);

// Componente de Loading para perguntas geradas
const GeneratedQuestionsSkeleton = () => (
  <div className="mt-6 p-4 border rounded-md bg-gray-50 border-gray-200 space-y-4 animate-pulse">
    <div className="h-6 bg-gray-300 rounded w-2/5"></div>
    <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
      <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
      <div className="h-3 bg-gray-300 rounded w-4/5 mb-2"></div>
      <div className="space-y-2">
        <div className="p-2 bg-yellow-100 rounded border-l-4 border-yellow-400">
          <div className="h-4 bg-gray-300 rounded w-3/4 mb-1"></div>
          <div className="h-3 bg-gray-300 rounded w-5/6"></div>
        </div>
        <div className="p-2 bg-yellow-100 rounded border-l-4 border-yellow-400">
          <div className="h-4 bg-gray-300 rounded w-4/5 mb-1"></div>
          <div className="h-3 bg-gray-300 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  </div>
);

// Componente de Loading para análise de hipóteses
const HypothesisAnalysisSkeleton = () => (
  <div className="mt-6 p-4 border rounded-md bg-gray-50 border-gray-200 space-y-4 animate-pulse">
    <div className="h-6 bg-gray-300 rounded w-1/3"></div>
    <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 bg-white border border-gray-200 rounded-lg">
          <div className="flex items-center mb-4">
            <div className="w-6 h-6 bg-gray-300 rounded-full mr-3"></div>
            <div className="h-5 bg-gray-300 rounded w-1/4"></div>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-full"></div>
            </div>
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-gray-300 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function DifferentialDiagnosisPage() {
  const { isLoaded: authIsLoaded, userId, getToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados para o formulário "Expandindo o DDx"
  const [symptoms, setSymptoms] = useState(''); // Sintomas (subjetivos)
  const [clinicalSigns, setClinicalSigns] = useState(''); // Sinais clínicos (objetivos)
  const [initialDiagnoses, setInitialDiagnoses] = useState(''); // String, cada diagnóstico em nova linha
  const [expandedDdx, setExpandedDdx] = useState<ExpandedDdxOutput | null>(null);
  const [caseVignette, setCaseVignette] = useState('Um paciente de 45 anos apresenta-se ao pronto-socorro com dor torácica há 2 horas. A dor é descrita como &quot;em aperto&quot; e irradia para o braço esquerdo.');

  // Estados para o formulário "Gerar Perguntas para DDx"
  const [chiefComplaintQuestions, setChiefComplaintQuestions] = useState('');
  const [patientDemographics, setPatientDemographics] = useState('');
  const [initialFindingsQuestions, setInitialFindingsQuestions] = useState('');
  const [generatedQuestions, setGeneratedQuestions] = useState<ClinicalWorkflowQuestionsOutput | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  // Estados para o formulário "Comparando Hipóteses"
  const [selectedCaseKey, setSelectedCaseKey] = useState<keyof typeof clinicalCases>('basicAbdominal');
  const [currentCase, setCurrentCase] = useState<CaseScenarioInput>(clinicalCases.basic);
  const [studentAnalysis, setStudentAnalysis] = useState<StudentHypothesisAnalysis[]>([]);
  const [hypothesisFeedback, setHypothesisFeedback] = useState<CompareContrastFeedbackOutput | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('expand-ddx');

  // Estados para "Matriz de Comparação de Hipóteses" (nova abordagem)
  const [matrixAnalysis, setMatrixAnalysis] = useState<HypothesisFindingAnalysis[]>([]);
  const [selectedDiscriminator, setSelectedDiscriminator] = useState<string>('');
  const [matrixFeedback, setMatrixFeedback] = useState<MatrixFeedbackOutput | null>(null);
  const [isMatrixLoading, setIsMatrixLoading] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  const initializeMatrix = useCallback(() => {
    const newMatrix: HypothesisFindingAnalysis[] = [];
    currentCase.initial_findings.forEach(finding => {
      currentCase.plausible_hypotheses.forEach(hypothesis => {
        newMatrix.push({
          finding_name: finding.finding_name,
          hypothesis_name: hypothesis,
          student_evaluation: 'NEUTRAL', // Default to neutral
          student_rationale: undefined
        });
      });
    });
    setMatrixAnalysis(newMatrix);
    setSelectedDiscriminator('');
    setMatrixFeedback(null);
    setMatrixError(null);
  }, [currentCase]);

  // Initialize matrix when case changes
  useEffect(() => {
    initializeMatrix();
  }, [initializeMatrix]);

  const handleMatrixCellChange = (findingName: string, hypothesisName: string, evaluation: 'SUPPORTS' | 'NEUTRAL' | 'REFUTES') => {
    setMatrixAnalysis(prev => 
      prev.map(item => 
        item.finding_name === findingName && item.hypothesis_name === hypothesisName
          ? { ...item, student_evaluation: evaluation }
          : item
      )
    );
  };

  const handleSubmitMatrixAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMatrixLoading(true);
    setMatrixError(null);
    setMatrixFeedback(null);

    try {
      if (!selectedDiscriminator.trim()) {
        throw new Error('Por favor, selecione o achado discriminador chave.');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Autenticação necessária. Por favor, faça login.');
      }

      const response = await fetch('/api/clinical-assistant/compare-contrast-matrix-feedback-translated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          scenario: {
            case_vignette: currentCase.case_vignette,
            initial_findings: currentCase.initial_findings,
            plausible_hypotheses: currentCase.plausible_hypotheses
          },
          student_matrix_analysis: matrixAnalysis,
          student_chosen_discriminator: selectedDiscriminator,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data: MatrixFeedbackOutput = await response.json();
      setMatrixFeedback(data);
    } catch (err) {
      setMatrixError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
    } finally {
      setIsMatrixLoading(false);
    }
  };

  const getEvaluationIcon = (evaluation: 'SUPPORTS' | 'NEUTRAL' | 'REFUTES') => {
    switch (evaluation) {
      case 'SUPPORTS': return '✅';
      case 'NEUTRAL': return '⚪';
      case 'REFUTES': return '❌';
      default: return '⚪';
    }
  };

  const getEvaluationColor = (evaluation: 'SUPPORTS' | 'NEUTRAL' | 'REFUTES') => {
    switch (evaluation) {
      case 'SUPPORTS': return 'text-green-600 bg-green-50 border-green-200';
      case 'NEUTRAL': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'REFUTES': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleSubmitExpandDdx = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setExpandedDdx(null);

    try {
      // Enhanced input validation
      if (!symptoms.trim()) {
        throw new Error('Por favor, insira os sintomas do paciente.');
      }
      if (symptoms.trim().length < 5) {
        throw new Error('Por favor, descreva os sintomas de forma mais detalhada (mínimo 5 caracteres).');
      }
      if (!initialDiagnoses.trim()) {
        throw new Error('Por favor, insira ao menos um diagnóstico diferencial inicial.');
      }
      
      const ddxList = initialDiagnoses.split('\n').map(d => d.trim()).filter(d => d.length > 0);
      if (ddxList.length === 0) {
        throw new Error('Por favor, insira ao menos um diagnóstico diferencial válido.');
      }
      if (ddxList.length > 10) {
        throw new Error('Por favor, limite a lista inicial a no máximo 10 diagnósticos diferenciais.');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Erro de autenticação. Por favor, faça login novamente.');
      }

      const input: ExpandDifferentialDiagnosisInput = {
        presenting_complaint: symptoms.trim(),
        location_if_pain: clinicalSigns.trim() || undefined,
        user_initial_ddx_list: ddxList,
      };

      const response = await fetch('/api/clinical-assistant/expand-differential-diagnosis-translated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          detail: 'Falha ao processar a solicitação. Tente novamente.',
          error: 'Erro de conexão com o servidor.' 
        }));
        
        // Better error message handling
        const errorMessage = errorData.error || errorData.detail || errorData.message || 
          `Falha ao expandir o diagnóstico diferencial (status: ${response.status}).`;
        throw new Error(errorMessage);
      }

      const data: ExpandedDdxOutput = await response.json();
      console.log('Received data from backend:', data);
      setExpandedDdx(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.';
      setError(errorMessage);
      console.error("Error in handleSubmitExpandDdx:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para lidar com o envio do formulário de perguntas para DDx
  const handleSubmitGenerateQuestions = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionsLoading(true);
    setQuestionsError(null);
    setGeneratedQuestions(null);

    try {
      // Enhanced input validation
      if (!chiefComplaintQuestions.trim()) {
        throw new Error('Por favor, insira a queixa principal do paciente.');
      }
      if (chiefComplaintQuestions.trim().length < 3) {
        throw new Error('A queixa principal deve ter pelo menos 3 caracteres.');
      }
      if (!patientDemographics.trim()) {
        throw new Error('Por favor, insira os dados demográficos do paciente.');
      }
      if (patientDemographics.trim().length < 5) {
        throw new Error('Os dados demográficos devem ser mais detalhados (ex: idade, sexo, comorbidades).');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Erro de autenticação. Por favor, faça login novamente.');
      }

      // Process initial findings - better handling of optional field
      const findingsArray = initialFindingsQuestions.trim() 
        ? initialFindingsQuestions.split('\n')
            .map(f => f.trim())
            .filter(f => f.length > 0)
            .map(finding => ({ finding_name: finding }))
        : [];

      const input: GenerateDDxQuestionsInput = {
        chief_complaint: chiefComplaintQuestions.trim(),
        initial_findings: findingsArray,
        patient_demographics: patientDemographics.trim(),
      };

      const response = await fetch('/api/clinical-assistant/generate-clinical-workflow-questions-translated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          detail: 'Falha ao processar a solicitação. Tente novamente.',
          error: 'Erro de conexão com o servidor.' 
        }));
        
        // Better error message handling
        const errorMessage = errorData.error || errorData.detail || errorData.message || 
          `Falha ao gerar perguntas para diagnóstico diferencial (status: ${response.status}).`;
        throw new Error(errorMessage);
      }

      const data: ClinicalWorkflowQuestionsOutput = await response.json();
      setGeneratedQuestions(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.';
      setQuestionsError(errorMessage);
      console.error("Error in handleSubmitGenerateQuestions:", err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  // Inicializa studentAnalysis com base nas hipóteses do caso atual
  React.useEffect(() => {
    if (currentCase) {
      const initialAnalysis = currentCase.plausible_hypotheses.map(hypothesis => ({
        hypothesis_name: hypothesis,
        supporting_findings: [],
        refuting_findings: [],
        key_discriminators_against_others: []
      }));
      setStudentAnalysis(initialAnalysis);
    }
  }, [currentCase]);

  // Manipulação de mudanças nas análises de hipóteses do estudante
  const handleAnalysisChange = (index: number, field: keyof StudentHypothesisAnalysis, value: string[]) => {
    const updatedAnalysis = [...studentAnalysis];
    updatedAnalysis[index] = {
      ...updatedAnalysis[index],
      [field]: value
    };
    setStudentAnalysis(updatedAnalysis);
  };

  // Converter string de texto em array para os campos de análise
  const parseTextToArray = (text: string): string[] => {
    return text.split('\n').map(item => item.trim()).filter(item => item.length > 0);
  };

  // Função para enviar a análise do estudante
  const handleSubmitAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAnalysisLoading(true);
    setAnalysisError(null);
    setHypothesisFeedback(null);

    try {
      // Enhanced validation - check if at least one hypothesis has some analysis
      const hasAnyAnalysis = studentAnalysis.some(analysis => 
        analysis.supporting_findings.length > 0 || 
        analysis.refuting_findings.length > 0 || 
        analysis.key_discriminators_against_others.length > 0
      );

      if (!hasAnyAnalysis) {
        throw new Error('Por favor, preencha ao menos um campo de análise para pelo menos uma hipótese antes de enviar.');
      }

      // Validate that each hypothesis has at least something filled
      const emptyHypotheses = studentAnalysis.filter(analysis => 
        analysis.supporting_findings.length === 0 && 
        analysis.refuting_findings.length === 0 && 
        analysis.key_discriminators_against_others.length === 0
      );

      if (emptyHypotheses.length === studentAnalysis.length) {
        throw new Error('Por favor, analise pelo menos uma hipótese antes de enviar.');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Erro de autenticação. Por favor, faça login novamente.');
      }

      const input: CompareContrastExerciseInput = {
        scenario: currentCase,
        student_analysis: studentAnalysis,
      };

      const response = await fetch('/api/clinical-assistant/compare-contrast-hypotheses-translated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          detail: 'Falha ao processar a solicitação. Tente novamente.',
          error: 'Erro de conexão com o servidor.' 
        }));
        
        // Better error message handling
        const errorMessage = errorData.error || errorData.detail || errorData.message || 
          `Falha ao obter feedback da análise (status: ${response.status}).`;
        throw new Error(errorMessage);
      }

      const data: CompareContrastFeedbackOutput = await response.json();
      setHypothesisFeedback(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.';
      setAnalysisError(errorMessage);
      console.error("Error in handleSubmitAnalysis:", err);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  // Função para trocar de caso clínico
  const handleCaseChange = (caseKey: string) => {
    setSelectedCaseKey(caseKey as keyof typeof clinicalCases);
    setCurrentCase(clinicalCases[caseKey as keyof typeof clinicalCases]);
    setHypothesisFeedback(null);
    setAnalysisError(null);
  };

  // Função para obter informações sobre o nível de dificuldade
  const getDifficultyInfo = (caseKey: string) => {
    const difficultyMap = {
      basic: { label: 'Básico', color: 'green', icon: '🟢', description: 'Apresentação clássica, diagnóstico mais direto' },
      intermediate: { label: 'Intermediário', color: 'blue', icon: '🔵', description: 'Múltiplas variáveis, requer correlação clínica' },
      advanced: { label: 'Avançado', color: 'orange', icon: '🟠', description: 'Comorbidades complexas, diagnóstico diferencial desafiador' },
      expert: { label: 'Expert', color: 'red', icon: '🔴', description: 'Apresentação atípica, alta complexidade diagnóstica' }
    };
    return difficultyMap[caseKey as keyof typeof difficultyMap] || difficultyMap.basic;
  };

  if (!authIsLoaded) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-12">
        <section className="text-center py-10 academy-gradient-header rounded-xl border border-primary/20 shadow-lg">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center justify-center mb-4">
              <RefreshCw className="h-10 w-10 md:h-12 md:w-12 mr-3 text-white animate-spin" />
              Diagnóstico Diferencial
            </h1>
            <p className="mt-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Carregando ferramentas para análise de hipóteses...
            </p>
          </div>
        </section>
        {/* Placeholder for tabs, matching the 3 tabs on this page */}
        <div className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-gray-200/50 p-1 rounded-lg border border-gray-300/50 animate-pulse">
            <div className="h-10 bg-gray-300/70 rounded-md"></div>
            <div className="h-10 bg-gray-300/70 rounded-md"></div>
            <div className="h-10 bg-gray-300/70 rounded-md"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12">
      {/* Updated Header Section */}
      <section className="text-center py-10 academy-gradient-header rounded-xl border border-primary/20 shadow-lg">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center justify-center mb-4">
            <Search className="h-10 w-10 md:h-12 md:w-12 mr-3 text-white" />
            Diagnóstico Diferencial
          </h1>
          <p className="mt-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Domine a arte de gerar, priorizar e testar hipóteses diagnósticas através de abordagens sistemáticas e ferramentas interativas.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
              <Search className="h-4 w-4 mr-2" />
              Expansão Sistemática
            </div>
            <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
              <HelpCircle className="h-4 w-4 mr-2" />
              Perguntas Direcionadas
            </div>
            <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Comparação de Hipóteses
            </div>
          </div>
        </div>
      </section>

        {/* Workflow Integration Section - Using IntegratedWorkflowCard */}
        {(() => {
        const ddxWorkflowSteps: WorkflowStep[] = [
          {
            id: 'expand-ddx',
            icon: Search,
            title: '1. Expandir DDx',
            description: 'Amplie sua lista de hipóteses',
            targetIcon: ArrowRight,
          },
          {
            id: 'generate-questions',
            icon: HelpCircle,
            title: '2. Gerar Perguntas',
            description: 'Formule questões para refinar',
            targetIcon: ArrowRight,
          },
          {
            id: 'compare-hypotheses',
            icon: Users, // Using Users as per tab icon, could be CompareArrows or similar too
            title: '3. Comparar Hipóteses',
            description: 'Analise e diferencie suas opções',
            targetIcon: List, // Or CheckSquare for final step
          },
        ];

        return (
          <IntegratedWorkflowCard
            title="Fluxo Integrado de Diagnóstico Diferencial"
            subtitle="Navegue pelas etapas para construir e refinar suas hipóteses diagnósticas."
            steps={ddxWorkflowSteps}
            activeStepId={activeTab}
            completedSteps={[]} // Placeholder, implement if needed
            onStepClick={setActiveTab}
            themeColorName="purple"
            totalSteps={3}
            mainIcon={Network} // Or another suitable icon like ListChecks
            // integrationInfo={...} // Optional: Can add specific integration info here
          />
        );
      })()}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 bg-purple-50 p-1 rounded-lg border border-purple-200">
          <TabsTrigger 
            value="expand-ddx" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-purple-100 data-[state=inactive]:text-purple-700 rounded-md px-3 py-2 text-sm font-medium transition-all"
          >
            <Search className="h-4 w-4 mr-2" />
            Expandindo o DDx
          </TabsTrigger>
          <TabsTrigger 
            value="generate-questions" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-purple-100 data-[state=inactive]:text-purple-700 rounded-md px-3 py-2 text-sm font-medium transition-all"
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Gerar Perguntas para DDx
          </TabsTrigger>
          <TabsTrigger 
            value="compare-hypotheses" 
            className="data-[state=active]:bg-purple-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-purple-100 data-[state=inactive]:text-purple-700 rounded-md px-3 py-2 text-sm font-medium transition-all"
          >
            <Users className="h-4 w-4 mr-2" />
            Comparando Hipóteses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expand-ddx">
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <form onSubmit={handleSubmitExpandDdx}>
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                  <Lightbulb className="h-6 w-6 mr-2 text-purple-500" />
                  Ferramenta: Expandindo o Diagnóstico Diferencial
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Utilize abordagens sistemáticas (anatômica, mnemônicos como VINDICATE e outros) para não esquecer diagnósticos importantes.
                  Insira os sintomas, sinais clínicos e seus diagnósticos diferenciais iniciais.
                  Dr. Corvus sugerirá categorias e diagnósticos adicionais.
                </CardDescription>
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <Search className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-gray-500">Expansão sistemática de hipóteses</span>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 space-y-6">
                <div>
                  <label htmlFor="symptoms" className="block text-sm font-medium mb-1">
                    Sintomas (Subjetivos) <span className="text-red-500">*</span>
                  </label>
                  <Textarea 
                    id="symptoms" 
                    placeholder="Ex: Dor torácica opressiva, Dispneia aos esforços, Náuseas, Palpitações"
                    rows={3}
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    disabled={isLoading}
                    required 
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Sintomas relatados pelo paciente (o que ele sente)
                  </p>
                </div>
                <div>
                  <label htmlFor="clinicalSigns" className="block text-sm font-medium mb-1">
                    Sinais Clínicos (Objetivos)
                  </label>
                  <Textarea 
                    id="clinicalSigns" 
                    placeholder="Ex: Sinal de Blumberg positivo, Sopro cardíaco, Icterícia, Febre (38.5°C)"
                    rows={3}
                    value={clinicalSigns}
                    onChange={(e) => setClinicalSigns(e.target.value)}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Achados objetivos do exame físico e sinais vitais
                  </p>
                </div>
                <div>
                  <label htmlFor="initialDiagnoses" className="block text-sm font-medium mb-1">
                    Seus Diagnósticos Diferenciais Iniciais <span className="text-red-500">*</span>
                  </label>
                  <Textarea 
                    id="initialDiagnoses" 
                    placeholder="Digite um diagnóstico por linha, ex:&#10;Infarto Agudo do Miocárdio&#10;Angina Instável&#10;Embolia Pulmonar"
                    rows={4} 
                    value={initialDiagnoses}
                    onChange={(e) => setInitialDiagnoses(e.target.value)}
                    disabled={isLoading}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Máximo de 10 diagnósticos diferenciais</p>
                </div>
                <Button type="submit" disabled={isLoading || !authIsLoaded} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                  {isLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analisando...
                    </>
                  ) : "Expandir DDx com Dr. Corvus"}
                </Button>
                
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Ops! Algo deu errado</AlertTitle>
                    <AlertDescription className="mt-2">
                      {error}
                      <br />
                      <span className="text-sm mt-2 block">Se o problema persistir, tente recarregar a página ou entre em contato conosco.</span>
                    </AlertDescription>
                  </Alert>
                )}

                {isLoading && !expandedDdx && (
                    <div className="mt-6 flex flex-col items-center justify-center py-12 space-y-6 animate-fade-in">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin">
                                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full animate-pulse border-t-transparent"></div>
                            </div>
                            <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-purple-600 animate-pulse" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-lg font-semibold text-gray-700 animate-pulse">Dr. Corvus está expandindo o diagnóstico...</p>
                            <p className="text-sm text-gray-500">Aguarde enquanto analisamos e expandimos as hipóteses.</p>
                        </div>
                        <div className="w-80 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full animate-pulse transition-all duration-1000" style={{ width: '75%' }}></div>
                        </div>
                    </div>
                )}
                {expandedDdx && (
                  <div className="mt-8 space-y-8">
                    {/* Enhanced Header with Modern Design */}
                    <div className="flex items-center space-x-4 mb-8">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h6a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
                          Análise Expandida por Dr. Corvus
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Diagnósticos diferenciais expandidos com abordagem sistemática
                        </p>
                      </div>
                    </div>

                    {expandedDdx.suggested_additional_diagnoses_with_rationale && expandedDdx.suggested_additional_diagnoses_with_rationale.length > 0 ? (
                      <div className="space-y-8">
                        {/* Strategy Section - Enhanced */}
                        <div className="group relative overflow-hidden bg-gradient-to-br from-white via-indigo-50/30 to-purple-50/50 dark:from-gray-800 dark:via-indigo-900/10 dark:to-purple-900/20 rounded-2xl p-8 border-2 border-indigo-200/50 dark:border-indigo-800/30 shadow-lg hover:shadow-2xl transition-all duration-500">
                          {/* Background Pattern */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-indigo-50/40 to-purple-50/60 dark:from-gray-800/60 dark:via-indigo-900/20 dark:to-purple-900/30"></div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-200/20 to-purple-200/20 rounded-full -mr-16 -mt-16"></div>
                          
                          <div className="relative">
                            {/* Header */}
                            <div className="flex items-center space-x-4 mb-6">
                              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-indigo-800 dark:text-indigo-300 leading-tight">
                                  Estratégia do Dr. Corvus
                                </h3>
                                <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">
                                  Abordagem sistemática aplicada ao caso
                                </p>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 dark:from-indigo-900/30 dark:via-purple-900/30 dark:to-pink-900/30 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50">
                              <p className="text-indigo-800 dark:text-indigo-300 leading-relaxed font-medium">
                                {expandedDdx.applied_approach_description}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Diagnoses Section - Enhanced */}
                        <div className="group relative overflow-hidden bg-gradient-to-br from-white via-emerald-50/30 to-teal-50/50 dark:from-gray-800 dark:via-emerald-900/10 dark:to-teal-900/20 rounded-2xl p-8 border-2 border-emerald-200/50 dark:border-emerald-800/30 shadow-lg hover:shadow-2xl transition-all duration-500">
                          {/* Background Pattern */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-emerald-50/40 to-teal-50/60 dark:from-gray-800/60 dark:via-emerald-900/20 dark:to-teal-900/30"></div>
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 rounded-full -mr-16 -mt-16"></div>
                          
                          <div className="relative">
                            {/* Header */}
                            <div className="flex items-center space-x-4 mb-8">
                              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                </svg>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-300 leading-tight">
                                  Diagnósticos Adicionais Sugeridos
                                </h3>
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                                  Hipóteses identificadas pela análise sistemática
                                </p>
                              </div>
                            </div>

                            {/* Diagnoses Grid */}
                            <div className="space-y-6">
                              {expandedDdx.suggested_additional_diagnoses_with_rationale.map((diagnosisString, index) => (
                                <div
                                  key={index}
                                  className="group/item relative overflow-hidden p-6 bg-gradient-to-br from-white via-emerald-50/50 to-teal-50/50 dark:from-gray-700 dark:via-emerald-900/20 dark:to-teal-900/20 rounded-xl border-2 border-emerald-200/50 dark:border-emerald-800/50 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-[1.02]"
                                >
                                  {/* Background Pattern */}
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/70 via-emerald-50/50 to-teal-50/70 dark:from-gray-700/70 dark:via-emerald-900/30 dark:to-teal-900/50"></div>
                                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-200/20 to-teal-200/20 rounded-full -mr-10 -mt-10"></div>
                                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-200/0 via-emerald-200/30 to-emerald-200/0 translate-x-[-100%] group-hover/item:translate-x-[100%] transition-transform duration-700"></div>
                                  
                                  <div className="relative">
                                    {/* Item Header */}
                                    <div className="flex items-start space-x-4 mb-4">
                                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md group-hover/item:shadow-lg transition-all duration-300">
                                        {index + 1}
                                      </div>
                                      <div className="flex-1">
                                        <div className="w-16 h-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mb-3"></div>
                                      </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4 bg-gradient-to-r from-emerald-100 via-teal-100 to-cyan-100 dark:from-emerald-900/30 dark:via-teal-900/30 dark:to-cyan-900/30 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
                                      <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed font-medium">
                                        {diagnosisString}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-red-900/20 rounded-2xl border-2 border-amber-200/50 dark:border-amber-800/30 shadow-lg text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="text-lg font-medium text-amber-800 dark:text-amber-300 mb-2">
                          Análise Completa
                        </p>
                        <p className="text-sm text-amber-700 dark:text-amber-400 leading-relaxed max-w-md mx-auto">
                          Nenhum diagnóstico adicional foi sugerido com base nas informações fornecidas. Sua lista inicial parece abrangente para o caso apresentado.
                        </p>
                      </div>
                    )}
                  </div>
                )}
                
                {!expandedDdx && !isLoading && !error && (
                  <div className="mt-6 p-4 border rounded-md bg-blue-50 border-blue-200">
                    <div className="flex items-center">
                        <HelpCircle className="h-5 w-5 mr-2 text-blue-600" />
                        <h3 className="text-md font-semibold text-blue-700">Pronto para expandir?</h3>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                      Preencha os campos acima e clique em "Expandir DDx com Dr. Corvus" para receber sugestões baseadas em abordagens sistemáticas.
                    </p>
                  </div>
                )}
              </CardContent>
            </form>
          </Card>
        </TabsContent>

        {/* Nova Tab: Gerar Perguntas para DDx */}
        <TabsContent value="generate-questions">
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <form onSubmit={handleSubmitGenerateQuestions}>
              <CardHeader className="relative z-10">
                <CardTitle className="flex items-center text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                  <Search className="h-6 w-6 mr-2 text-purple-500" />
                  Ferramenta: Gerar Perguntas para Diagnóstico Diferencial
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Aprenda a fazer as perguntas certas para cada queixa. Insira a queixa principal e dados demográficos do paciente.
                  Dr. Corvus sugerirá perguntas essenciais para explorar possíveis diagnósticos diferenciais.
                </CardDescription>
                <div className="flex items-center justify-center space-x-2 mt-4">
                  <HelpCircle className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm text-gray-500">Geração inteligente de perguntas</span>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 space-y-6">
                <div>
                  <label htmlFor="chiefComplaintQuestions" className="block text-sm font-medium mb-1">Queixa Principal <span className="text-red-500">*</span></label>
                  <Input 
                    id="chiefComplaintQuestions" 
                    placeholder="Ex: Dor abdominal, Dispneia, Tontura" 
                    value={chiefComplaintQuestions}
                    onChange={(e) => setChiefComplaintQuestions(e.target.value)}
                    disabled={questionsLoading}
                    required 
                  />
                </div>
                <div>
                  <label htmlFor="patientDemographics" className="block text-sm font-medium mb-1">Dados Demográficos do Paciente <span className="text-red-500">*</span></label>
                  <Input 
                    id="patientDemographics" 
                    placeholder="Ex: Homem, 65 anos, tabagista, hipertenso" 
                    value={patientDemographics}
                    onChange={(e) => setPatientDemographics(e.target.value)}
                    disabled={questionsLoading}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Inclua idade, sexo e comorbidades relevantes</p>
                </div>
                <div>
                  <label htmlFor="initialFindingsQuestions" className="block text-sm font-medium mb-1">Achados Iniciais Observados (um por linha, opcional)</label>
                  <Textarea 
                    id="initialFindingsQuestions" 
                    placeholder="Ex:\nFebre\nProstração\nLesões cutâneas"
                    rows={3} 
                    value={initialFindingsQuestions}
                    onChange={(e) => setInitialFindingsQuestions(e.target.value)}
                    disabled={questionsLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Opcional: achados já identificados no exame físico ou anamnese</p>
                </div>
                <Button type="submit" disabled={questionsLoading || !authIsLoaded} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                  {questionsLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Gerando perguntas...
                    </>
                  ) : "Gerar Perguntas-Chave"}
                </Button>
                
                {questionsLoading && !generatedQuestions && (
                    <div className="mt-6 flex flex-col items-center justify-center py-12 space-y-6 animate-fade-in">
                        <div className="relative">
                            <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin">
                                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full animate-pulse border-t-transparent"></div>
                            </div>
                            <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-purple-600 animate-pulse" />
                        </div>
                        <div className="text-center space-y-2">
                            <p className="text-lg font-semibold text-gray-700 animate-pulse">Dr. Corvus está gerando perguntas...</p>
                            <p className="text-sm text-gray-500">Aguarde enquanto preparamos as questões para o diagnóstico.</p>
                        </div>
                        <div className="w-80 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full animate-pulse transition-all duration-1000" style={{ width: '75%' }}></div>
                        </div>
                    </div>
                )}
                {questionsError && (
                  <Alert variant="destructive" className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Ops! Algo deu errado</AlertTitle>
                    <AlertDescription className="mt-2">
                      {questionsError}
                      <br />
                      <span className="text-sm mt-2 block">Se o problema persistir, tente recarregar a página ou entre em contato conosco.</span>
                    </AlertDescription>
                  </Alert>
                )}

                {generatedQuestions && (
                  <div className="mt-6">
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="h-5 w-5 text-blue-600" />
                      <AlertTitle className="font-semibold text-blue-800">Estratégia de Investigação</AlertTitle>
                      <AlertDescription className="text-blue-700">
                        {generatedQuestions.overall_rationale}
                      </AlertDescription>
                    </Alert>

                    {generatedQuestions.red_flag_questions && generatedQuestions.red_flag_questions.length > 0 && (
                      <Card className="mt-4 border-red-500 bg-red-50">
                        <CardHeader>
                          <CardTitle className="text-red-700 flex items-center">
                            <Zap className="mr-2 h-5 w-5" /> Sinais de Alarme (Red Flags)
                          </CardTitle>
                          <CardDescription className="text-red-600">
                            Estas perguntas são cruciais para investigar condições graves que requerem atenção imediata.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="list-disc pl-5 space-y-2 text-sm text-red-900">
                            {generatedQuestions.red_flag_questions.map((q, i) => (
                              <li key={`red-flag-${i}`}>{q}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    )}

                    <div className="mt-4 space-y-4">
                      {generatedQuestions.question_categories.map((category, i) => (
                        <Card key={`category-${i}`} className="bg-white">
                          <CardHeader>
                            <CardTitle className="text-lg text-gray-800">{category.category_name}</CardTitle>
                            <CardDescription className="italic">{category.category_rationale}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-gray-700">
                              {category.questions.map((q, j) => (
                                <li key={`q-${i}-${j}`}>{q}</li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
                
                {!generatedQuestions && !questionsLoading && !questionsError && (
                  <div className="mt-6 p-4 border rounded-md bg-blue-50 border-blue-200">
                    <div className="flex items-center">
                        <HelpCircle className="h-5 w-5 mr-2 text-blue-600" />
                        <h3 className="text-md font-semibold text-blue-700">Pronto para aprender a fazer perguntas?</h3>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                      Insira a queixa principal do paciente e clique em "Gerar Perguntas com Dr. Corvus" para ver quais perguntas são essenciais para a investigação desse caso.
                    </p>
                  </div>
                )}
              </CardContent>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="compare-hypotheses">
          <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center text-2xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent">
                <Brain className="h-6 w-6 mr-2 text-purple-500" />
                Matriz de Análise: Achados vs. Hipóteses
              </CardTitle>
              <CardDescription className="text-gray-600">
                Para cada achado clínico, avalie como ele se relaciona com cada hipótese diagnóstica. Em seguida, identifique o achado mais decisivo.
              </CardDescription>
              <div className="flex items-center justify-center space-x-2 mt-4">
                <Users className="h-5 w-5 text-yellow-500" />
                <span className="text-sm text-gray-500">Análise sistemática e interativa</span>
              </div>
            </CardHeader>

            {/* Seletor de Casos Clínicos */}
            <CardContent className="relative z-10">
              <div className="p-4 bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg mb-6">
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-purple-600 font-bold text-sm">📚</span>
                  </div>
                  <h3 className="text-lg font-semibold text-purple-800">Selecione um Caso Clínico</h3>
                </div>
                <p className="text-sm text-purple-700 mb-4">
                  Escolha um caso para praticar a análise matricial de hipóteses diagnósticas.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {Object.entries(clinicalCases).map(([caseKey, caseData]) => {
                    const diffInfo = getDifficultyInfo(caseKey);
                    const isSelected = selectedCaseKey === caseKey;
                    
                    return (
                      <button
                        key={caseKey}
                        onClick={() => handleCaseChange(caseKey)}
                        className={`p-3 rounded-lg border-2 transition-all duration-200 text-left ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                            : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-25'
                        }`}
                      >
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">{diffInfo.icon}</span>
                          <span className={`font-semibold text-sm ${
                            isSelected ? 'text-indigo-800' : 'text-gray-700'
                          }`}>
                            {diffInfo.label}
                          </span>
                        </div>
                        <p className={`text-xs leading-relaxed ${
                          isSelected ? 'text-indigo-600' : 'text-gray-600'
                        }`}>
                          {diffInfo.description}
                        </p>
                        {isSelected && (
                          <div className="mt-2 flex items-center">
                            <span className="text-indigo-500 text-xs font-medium">✓ Selecionado</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-4 p-3 bg-white/50 border border-indigo-100 rounded-md">
                  <div className="flex items-center mb-1">
                    <span className="text-indigo-600 mr-2">{getDifficultyInfo(selectedCaseKey as string).icon}</span>
                    <span className="font-semibold text-indigo-800 text-sm">
                      Caso Atual: {getDifficultyInfo(selectedCaseKey as string).label}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-600">
                    {getDifficultyInfo(selectedCaseKey as string).description}
                  </p>
                </div>
              </div>
            </CardContent>

            <MatrixHypothesisComparison
              currentCase={currentCase}
              matrixAnalysis={matrixAnalysis}
              selectedDiscriminator={selectedDiscriminator}
              matrixFeedback={matrixFeedback}
              isMatrixLoading={isMatrixLoading}
              matrixError={matrixError}
              authIsLoaded={authIsLoaded}
              onMatrixCellChange={handleMatrixCellChange}
              onDiscriminatorChange={setSelectedDiscriminator}
              onSubmitAnalysis={handleSubmitMatrixAnalysis}
            />
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dica de Integração - Movida para antes dos próximos passos */}
      <div className="mt-12 p-6 border rounded-lg bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200 shadow-sm">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
            <Lightbulb className="h-6 w-6 text-purple-700" />
          </div>
          <div>
            <h5 className="font-bold text-purple-800 mb-2 text-lg">Dica de Integração Diagnóstica</h5>
            <p className="text-sm text-purple-700 leading-relaxed">
              <strong>Conecte os Pontos:</strong> Use as ferramentas de expansão de DDx para brainstorm. Depois, gere perguntas direcionadas para coletar dados que diferenciem suas hipóteses. Finalmente, compare e contraste para refinar sua lista e chegar a um diagnóstico provável. A MBE pode ajudar a encontrar a prevalência e a acurácia dos testes para suas hipóteses.
            </p>
          </div>
        </div>
      </div>

      {/* Próximos Passos na Sua Jornada de Aprendizado - Seta removida */}
      <div className="mt-12 p-6 border rounded-lg bg-gradient-to-r from-blue-50 via-purple-50 to-teal-50 border-blue-200 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Próximos Passos na Sua Jornada de Aprendizado
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="p-5 bg-white rounded-xl border border-purple-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="font-bold text-purple-800 text-lg">Medicina Baseada em Evidências</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4 text-center leading-relaxed">
              Aprenda a buscar, avaliar e aplicar evidências científicas para complementar seu raciocínio diagnóstico.
            </p>
            <div className="text-center">
              <Link href="/academy/evidence-based-medicine">
                <Button 
                  size="sm" 
                  variant="default"
                  className="px-4 py-2 w-full font-medium"
                >
                  Explorar MBE →
                </Button>
              </Link>
            </div>
          </div>

          <div className="p-5 bg-white rounded-xl border border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🧠</span>
              </div>
              <h4 className="font-bold text-blue-800 text-lg">Metacognição e Erros Diagnósticos</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4 text-center leading-relaxed">
              Desenvolva autoconsciência sobre seu processo de raciocínio e aprenda a evitar vieses cognitivos.
            </p>
            <div className="text-center">
              <Link href="/academy/metacognition-diagnostic-errors">
                <Button 
                  size="sm" 
                  variant="default"
                  className="px-4 py-2 w-full font-medium"
                >
                  Metacognição →
                </Button>
              </Link>
            </div>
          </div>

          <div className="p-5 bg-white rounded-xl border border-teal-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🎯</span>
              </div>
              <h4 className="font-bold text-teal-800 text-lg">Simulação Clínica (SNAPPS)</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4 text-center leading-relaxed">
              Pratique casos clínicos integrados usando o framework SNAPPS para consolidar todo seu aprendizado.
            </p>
            <div className="text-center">
              <Link href="/academy/clinical-simulation">
                <Button 
                  size="sm" 
                  variant="default"
                  className="px-4 py-2 w-full font-medium"
                >
                  SNAPPS →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
          <Link href="/academy">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <ArrowRight className="mr-2 h-4 w-4 transform rotate-180" /> Voltar para a Academia
            </Button>
          </Link>
      </div>

      {/* Disclaimer */}
      <Alert className="mt-8">
        <AlertDescription className="text-sm">
          <strong>Aviso Importante:</strong> As ferramentas de diagnóstico diferencial são destinadas para fins educacionais e desenvolvimento do raciocínio clínico. 
          Sempre considere diretrizes clínicas, contexto do paciente e consulte supervisão médica apropriada na prática clínica real.
        </AlertDescription>
      </Alert>
    </div>
  );
} 