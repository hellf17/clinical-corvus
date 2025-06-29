'use client';

import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Loader2, Sparkles, AlertTriangle, Lightbulb, Search, HelpCircle, Flag, ListChecks, Brain, ChevronLeft, Info, RefreshCw, FileText, Users, Zap, List, ArrowRight, BookOpen, Network } from 'lucide-react';
import { IntegratedWorkflowCard, WorkflowStep } from '@/components/academy/IntegratedWorkflowCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import Link from 'next/link';

// Interfaces baseadas no BAML
interface ExpandDifferentialDiagnosisInput {
  presenting_complaint: string;
  location_if_pain?: string;
  student_initial_ddx_list: string[];
}

interface SuggestedDiagnosis {
  diagnosis: string;
  rationale: string;
  category: string;
  suspicion_level?: string;
}

interface ExpandedDdxOutput {
  applied_approach_description: string;
  red_flags: SuggestedDiagnosis[];
  systematic_diagnoses: SuggestedDiagnosis[];
  disclaimer: string;
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
  disclaimer: string;
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
  const [selectedCaseKey, setSelectedCaseKey] = useState<string>('basic');
  const [currentCase, setCurrentCase] = useState<CaseScenarioInput>(clinicalCases.basic);
  const [studentAnalysis, setStudentAnalysis] = useState<StudentHypothesisAnalysis[]>([]);
  const [hypothesisFeedback, setHypothesisFeedback] = useState<CompareContrastFeedbackOutput | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('expand-ddx');

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
        student_initial_ddx_list: ddxList,
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
    setSelectedCaseKey(caseKey);
    setCurrentCase(clinicalCases[caseKey]);
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
          <Card>
            <form onSubmit={handleSubmitExpandDdx}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="h-6 w-6 mr-2 text-yellow-500" />
                  Ferramenta: Expandindo o Diagnóstico Diferencial
                </CardTitle>
                <CardDescription>
                  Utilize abordagens sistemáticas (anatômica, mnemônicos como VINDICATE e outros) para não esquecer diagnósticos importantes.
                  Insira os sintomas, sinais clínicos e seus diagnósticos diferenciais iniciais.
                  Dr. Corvus sugerirá categorias e diagnósticos adicionais.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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

                {isLoading && <ExpandedDdxSkeleton />}
                {expandedDdx && (
                  <div className="mt-6 space-y-6">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                          <span className="text-blue-600 font-bold text-sm">🧠</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold mb-2 text-blue-800">Estratégia do Dr. Corvus</h3>
                          <p className="text-sm text-blue-700 leading-relaxed">
                            O raciocínio clínico eficaz combina múltiplas abordagens complementares: primeiro identifica e prioriza condições de maior gravidade que necessitam investigação urgente, depois aplica métodos sistemáticos (anatômicos, fisiopatológicos e epidemiológicos) para garantir amplitude diagnóstica sem perder o foco na relevância clínica específica do caso apresentado.
                          </p>
                        </div>
                      </div>
                    </div>

                    {(expandedDdx.red_flags.length > 0 || expandedDdx.systematic_diagnoses.length > 0) ? (
                      <div className="space-y-6">
                        {/* Red Flags - Diagnósticos Urgentes */}
                        {expandedDdx.red_flags.length > 0 && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center mb-3">
                              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                                <Flag className="w-5 h-5 text-red-600" />
                              </div>
                              <h4 className="font-semibold text-red-800 text-lg">Red Flags - Considerar PRIMEIRO</h4>
                            </div>
                            <p className="text-sm text-red-700 mb-4">
                              Condições potencialmente graves que requerem atenção imediata.
                            </p>
                            <div className="space-y-3">
                              {expandedDdx.red_flags.map((item, index) => (
                                <div key={`red-flag-${index}`} className="bg-white/70 p-3 rounded-md border border-red-100">
                                  <div className="flex items-start">
                                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                                      <span className="text-red-700 font-semibold text-xs">{index + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-medium text-red-900 text-base leading-relaxed">{item.diagnosis}</p>
                                      <div className="mt-2 p-2 bg-red-50/50 rounded-sm border-l-4 border-red-300">
                                        <p className="text-sm text-red-700">
                                          <span className="font-semibold">💡 Racional:</span> {item.rationale}
                                        </p>
                                      </div>
                                      {item.suspicion_level && (
                                        <Badge variant="destructive" className="mt-2 text-xs">
                                          {item.suspicion_level}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Diagnósticos Sistemáticos */}
                        {expandedDdx.systematic_diagnoses.length > 0 && (
                          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <div className="flex items-center mb-3">
                              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-3">
                                <ListChecks className="w-5 h-5 text-amber-600" />
                              </div>
                              <h4 className="font-semibold text-amber-800 text-lg">Expansão Sistemática</h4>
                            </div>
                            <p className="text-sm text-amber-700 mb-4">
                              Diagnósticos adicionais baseados em abordagens sistemáticas para garantir uma avaliação completa.
                            </p>
                            <div className="space-y-3">
                              {expandedDdx.systematic_diagnoses.map((item, index) => (
                                <div key={`systematic-${index}`} className="bg-white/70 p-3 rounded-md border border-amber-100">
                                  <div className="flex items-start">
                                    <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                                      <span className="text-amber-700 font-semibold text-xs">{index + 1}</span>
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-1">
                                        <p className="font-medium text-amber-900 text-base leading-relaxed">{item.diagnosis}</p>
                                        {item.suspicion_level && (
                                          <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50 whitespace-nowrap">
                                            {item.suspicion_level}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="mt-2 p-2 bg-amber-50/50 rounded-sm border-l-4 border-amber-300">
                                        <p className="text-sm text-amber-800">
                                          <span className="font-semibold">💡 Racional:</span> {item.rationale}
                                        </p>
                                      </div>
                                      <Badge variant="outline" className="mt-2 text-xs border-amber-300 text-amber-700">
                                        {item.category}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum diagnóstico adicional foi sugerido com base nas informações fornecidas.</p>
                    )}
                    
                    <p className="text-xs italic text-muted-foreground">{expandedDdx.disclaimer}</p>
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
          <Card>
            <form onSubmit={handleSubmitGenerateQuestions}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="h-6 w-6 mr-2 text-blue-500" />
                  Ferramenta: Gerar Perguntas para Diagnóstico Diferencial
                </CardTitle>
                <CardDescription>
                  Aprenda a fazer as perguntas certas para cada queixa. Insira a queixa principal e dados demográficos do paciente.
                  Dr. Corvus sugerirá perguntas essenciais para explorar possíveis diagnósticos diferenciais.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                
                {questionsLoading && <GeneratedQuestionsSkeleton />}
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
          <Card>
            <form onSubmit={handleSubmitAnalysis}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-6 w-6 mr-2 text-purple-500" />
                  Exercício: Comparando e Contrastando Hipóteses
                </CardTitle>
                <CardDescription>
                  Analise o caso e identifique os achados que suportam ou refutam cada hipótese diagnóstica, além das características que melhor discriminam cada hipótese das demais.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Seletor de Casos Clínicos */}
                <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-indigo-600 font-bold text-sm">📚</span>
                    </div>
                    <h3 className="text-lg font-semibold text-indigo-800">Selecione um Caso Clínico</h3>
                  </div>
                  <p className="text-sm text-indigo-700 mb-4">
                    Escolha um caso de acordo com seu nível de experiência para praticar a análise comparativa de hipóteses diagnósticas.
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
                      <span className="text-indigo-600 mr-2">{getDifficultyInfo(selectedCaseKey).icon}</span>
                      <span className="font-semibold text-indigo-800 text-sm">
                        Caso Atual: {getDifficultyInfo(selectedCaseKey).label}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-600">
                      {getDifficultyInfo(selectedCaseKey).description}
                    </p>
                  </div>
                </div>
                
                {/* Apresentação do Caso */}
                <div className="p-4 border rounded-md bg-secondary/20">
                  <h3 className="text-lg font-semibold mb-2">Caso Clínico:</h3>
                  <p className="mb-4">{currentCase.case_vignette}</p>
                  
                  <h4 className="font-medium mb-2">Achados Principais:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {currentCase.initial_findings.map((finding, idx) => (
                      <li key={idx} className="text-base">
                        <span className="font-medium">{finding.finding_name}</span>
                        {finding.details && <span>: {finding.details}</span>}
                        {finding.onset_duration_pattern && <span> ({finding.onset_duration_pattern})</span>}
                        {finding.severity_level && <span>, {finding.severity_level}</span>}
                      </li>
                    ))}
                  </ul>
                  
                  <h4 className="font-medium mt-4 mb-2">Hipóteses a Analisar:</h4>
                  <div className="flex flex-wrap gap-2">
                    {currentCase.plausible_hypotheses.map((hypothesis, idx) => (
                      <Badge key={idx} variant="outline" className="text-base">
                        {hypothesis}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {/* Formulários de Análise para cada Hipótese */}
                <div className="space-y-6">
                  <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-indigo-600 font-bold text-sm">📝</span>
                      </div>
                      <h3 className="text-lg font-semibold text-indigo-800">Sua Análise das Hipóteses</h3>
                    </div>
                    <p className="text-sm text-indigo-700">
                      Para cada hipótese, identifique os achados que a suportam, refutam e as características que a distinguem das demais.
                    </p>
                  </div>

                  {studentAnalysis.map((analysis, index) => (
                    <div key={index} className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
                      <div className="flex items-center mb-6">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <span className="text-blue-700 font-semibold text-sm">{index + 1}</span>
                        </div>
                        <h3 className="text-xl font-semibold text-blue-900">{analysis.hypothesis_name}</h3>
                      </div>
                      
                      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                        {/* Achados de Suporte */}
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <span className="text-green-600 mr-2 text-lg">✅</span>
                            <label htmlFor={`supporting-${index}`} className="text-sm font-semibold text-green-800">
                              Achados que SUPORTAM
                          </label>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-md p-3">
                          <Textarea 
                            id={`supporting-${index}`} 
                            placeholder="• Achado clínico 1&#10;• Achado clínico 2&#10;• Achado clínico 3&#10;&#10;Dica: Liste dados objetivos e subjetivos que fortalecem esta hipótese"
                            rows={4}
                            className="border-0 bg-transparent resize-none focus:ring-0 text-sm"
                            value={analysis.supporting_findings.join('\n')}
                            onChange={(e) => handleAnalysisChange(index, 'supporting_findings', parseTextToArray(e.target.value))}
                            disabled={isAnalysisLoading}
                          />
                          </div>
                          <p className="text-xs text-green-600">Liste os achados que apoiam esta hipótese</p>
                        </div>
                        
                        {/* Achados de Refutação */}
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <span className="text-red-600 mr-2 text-lg">❌</span>
                            <label htmlFor={`refuting-${index}`} className="text-sm font-semibold text-red-800">
                              Achados que REFUTAM
                          </label>
                          </div>
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <Textarea 
                            id={`refuting-${index}`} 
                            placeholder="• Achado inconsistente 1&#10;• Achado inconsistente 2&#10;• Achado inconsistente 3&#10;&#10;Dica: Considere dados que não se encaixam no padrão típico desta condição"
                            rows={4}
                            className="border-0 bg-transparent resize-none focus:ring-0 text-sm"
                            value={analysis.refuting_findings.join('\n')}
                            onChange={(e) => handleAnalysisChange(index, 'refuting_findings', parseTextToArray(e.target.value))}
                            disabled={isAnalysisLoading}
                          />
                          </div>
                          <p className="text-xs text-red-600">Liste os achados que enfraquecem esta hipótese</p>
                        </div>
                        
                        {/* Discriminadores */}
                        <div className="space-y-3">
                          <div className="flex items-center">
                            <span className="text-yellow-600 mr-2 text-lg">🎯</span>
                            <label htmlFor={`discriminators-${index}`} className="text-sm font-semibold text-yellow-800">
                              DISCRIMINADORES Chave
                          </label>
                          </div>
                          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <Textarea 
                            id={`discriminators-${index}`} 
                            placeholder="• Característica distintiva 1&#10;• Característica distintiva 2&#10;• Característica distintiva 3&#10;&#10;Dica: O que diferencia ESTA hipótese das outras listadas?"
                            rows={4}
                            className="border-0 bg-transparent resize-none focus:ring-0 text-sm"
                            value={analysis.key_discriminators_against_others.join('\n')}
                            onChange={(e) => handleAnalysisChange(index, 'key_discriminators_against_others', parseTextToArray(e.target.value))}
                            disabled={isAnalysisLoading}
                          />
                          </div>
                          <p className="text-xs text-yellow-600">Características que distinguem das outras hipóteses</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <Button type="submit" disabled={isAnalysisLoading || !authIsLoaded} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                  {isAnalysisLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Analisando hipóteses...
                    </>
                  ) : "Analisar Hipóteses"}
                </Button>
                
                {isAnalysisLoading && <HypothesisAnalysisSkeleton />}
                {analysisError && (
                  <Alert variant="destructive" className="mt-4">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Ops! Algo deu errado</AlertTitle>
                    <AlertDescription className="mt-2">
                      {analysisError}
                      <br />
                      <span className="text-sm mt-2 block">Se o problema persistir, tente recarregar a página ou entre em contato conosco.</span>
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Exibição do Feedback da Análise */}
                {hypothesisFeedback && (
                  <div className="mt-8 space-y-6">
                    {/* Feedback Geral */}
                      {hypothesisFeedback.overall_feedback && (
                      <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                        <div className="flex items-start">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-purple-600 font-bold text-sm">👨‍⚕️</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold mb-2 text-purple-800">Feedback Geral do Dr. Corvus</h3>
                            <p className="text-sm text-purple-700 leading-relaxed">{hypothesisFeedback.overall_feedback}</p>
                          </div>
                        </div>
                        </div>
                      )}
                      
                    {/* Análise Detalhada por Hipótese */}
                    <div className="space-y-4">
                      <h4 className="text-lg font-semibold text-primary">Análise Detalhada por Hipótese:</h4>
                        {hypothesisFeedback.detailed_feedback_per_hypothesis.map((feedback, idx) => (
                        <div key={idx} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                          <div className="flex items-center mb-4">
                            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <span className="text-blue-700 font-semibold text-xs">{idx + 1}</span>
                            </div>
                            <h5 className="text-lg font-semibold text-blue-900">{feedback.hypothesis_name}</h5>
                          </div>
                          
                          <div className="space-y-4">
                            {feedback.feedback_on_supporting_findings && (
                              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                <div className="flex items-center mb-2">
                                  <span className="text-green-600 mr-2">✅</span>
                                  <h6 className="font-medium text-green-800">Achados de Suporte</h6>
                                </div>
                                <p className="text-sm text-green-700">{feedback.feedback_on_supporting_findings}</p>
                              </div>
                            )}
                            
                            {feedback.feedback_on_refuting_findings && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <div className="flex items-center mb-2">
                                  <span className="text-red-600 mr-2">❌</span>
                                  <h6 className="font-medium text-red-800">Achados de Refutação</h6>
                                </div>
                                <p className="text-sm text-red-700">{feedback.feedback_on_refuting_findings}</p>
                              </div>
                            )}
                            
                            {feedback.feedback_on_discriminators && (
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                <div className="flex items-center mb-2">
                                  <span className="text-yellow-600 mr-2">🎯</span>
                                  <h6 className="font-medium text-yellow-800">Discriminadores</h6>
                                </div>
                                <p className="text-sm text-yellow-700">{feedback.feedback_on_discriminators}</p>
                              </div>
                            )}
                            
                            {feedback.expert_comparison_points && feedback.expert_comparison_points.length > 0 && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                                <div className="flex items-center mb-2">
                                  <span className="text-blue-600 mr-2">🧠</span>
                                  <h6 className="font-medium text-blue-800">Pontos de Comparação do Expert</h6>
                                </div>
                                <ul className="text-sm text-blue-700 space-y-1">
                                  {feedback.expert_comparison_points.map((point, pointIdx) => (
                                    <li key={pointIdx} className="flex items-start">
                                      <span className="text-blue-500 mr-2 mt-1">•</span>
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          </div>
                        ))}
                      </div>
                      
                    {/* Sugestão de Foco para Aprendizado */}
                      {hypothesisFeedback.suggested_learning_focus && (
                      <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
                        <div className="flex items-start">
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-emerald-600 font-bold text-sm">📚</span>
                          </div>
                          <div>
                            <h4 className="font-semibold text-emerald-800 mb-2">Sugestão de Foco para Aprendizado</h4>
                            <p className="text-sm text-emerald-700 leading-relaxed">{hypothesisFeedback.suggested_learning_focus}</p>
                          </div>
                        </div>
                        </div>
                      )}
                      
                    <p className="text-xs italic text-muted-foreground">{hypothesisFeedback.disclaimer}</p>
                  </div>
                )}
              </CardContent>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dica de Integração - Movida para antes dos próximos passos */}
      <div className="mt-12 p-6 border rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-sm">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
            <Lightbulb className="h-6 w-6 text-amber-700" />
          </div>
          <div>
            <h5 className="font-bold text-amber-800 mb-2 text-lg">Dica de Integração Diagnóstica</h5>
            <p className="text-sm text-amber-700 leading-relaxed">
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