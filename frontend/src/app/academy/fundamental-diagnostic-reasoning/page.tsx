"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Brain, MessageSquareQuote, Lightbulb, FileText, Stethoscope, ListChecks, Users, HelpCircle, ArrowRight, RefreshCw, Star, PlusCircle, BrainCircuit, ShieldCheck } from "lucide-react";
import { IntegratedWorkflowCard, WorkflowStep } from '@/components/academy/IntegratedWorkflowCard';
import Link from "next/link";
import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';

// Componente de Tooltip para Glossário
const GlossaryTooltip = ({ term, definition, children }: { 
  term: string; 
  definition: string; 
  children: React.ReactNode 
}) => {
  return (
    <span className="relative group cursor-help">
      <span className="underline decoration-dotted decoration-blue-400 text-blue-600">
        {children}
      </span>
      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 w-64 text-center block">
        <strong>{term}:</strong> {definition}
        <span className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900 inline-block"></span>
      </span>
    </span>
  );
};

// Interfaces for BAML function outputs
interface ProblemRepresentationFeedback {
  feedback_strengths: string[];
  feedback_improvements: string[];
  missing_elements: string[];
  overall_assessment: string;
  next_step_guidance: string;
  socratic_questions: string[];
}

// Updated interface for Illness Script based on clinical knowledge structuring
interface IllnessScriptOutput {
  disease_name: string;
  predisposing_conditions: string[];
  pathophysiology_summary: string;
  key_symptoms_and_signs: string[];
  relevant_diagnostics?: string[];
  disclaimer: string;
}

interface TeachQuestionPrioritizationOutput {
  prioritized_questions: string[];
  complementary_questions: string[];
  questioning_rationale: string;
  potential_systems_to_explore: string[];
}

// Componente de Loading Skeleton para feedbacks
const FeedbackSkeleton = () => (
  <div className="mt-6 p-4 border rounded-md bg-gray-50 border-gray-200 space-y-3 animate-pulse">
    <div className="h-6 bg-gray-300 rounded w-1/3"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-300 rounded w-full"></div>
      <div className="h-4 bg-gray-300 rounded w-3/4"></div>
      <div className="h-4 bg-gray-300 rounded w-5/6"></div>
    </div>
    <div className="h-4 bg-gray-300 rounded w-1/2"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-300 rounded w-full"></div>
      <div className="h-4 bg-gray-300 rounded w-2/3"></div>
    </div>
  </div>
);

// Componente de Loading para Illness Scripts
const IllnessScriptSkeleton = () => (
  <div className="mt-6 p-4 border rounded-md bg-gray-50 border-gray-200 space-y-4 animate-pulse">
    <div className="h-6 bg-gray-300 rounded w-1/2"></div>
    <div className="space-y-3">
      <div>
        <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
        <div className="space-y-1">
          <div className="h-3 bg-gray-300 rounded w-3/4"></div>
          <div className="h-3 bg-gray-300 rounded w-2/3"></div>
        </div>
      </div>
      <div>
        <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-full"></div>
      </div>
      <div>
        <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
        <div className="space-y-1">
          <div className="h-3 bg-gray-300 rounded w-4/5"></div>
          <div className="h-3 bg-gray-300 rounded w-3/5"></div>
          <div className="h-3 bg-gray-300 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  </div>
);

// Componente de Loading para Perguntas de Anamnese
const AnamnesisQuestionsSkeleton = () => (
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

export default function FundamentalDiagnosticReasoningPage() {
  const [activeTab, setActiveTab] = useState('reasoning-types');
  const { getToken, isLoaded: authIsLoaded } = useAuth();

  // Biblioteca de vinhetas clínicas
  const clinicalVignettes = [
    {
      id: 1,
      title: "Dor Torácica (Básico)",
      difficulty: "Básico",
      content: "Paciente masculino, 65 anos, diabético e hipertenso, apresenta-se com dor torácica \"opressiva\" iniciada há 2 horas, irradiando para o braço esquerdo, acompanhada de sudorese e náuseas."
    },
    {
      id: 2,
      title: "Dispneia Progressiva (Intermediário)",
      difficulty: "Intermediário", 
      content: "Mulher de 72 anos, ex-tabagista, com história de DPOC, procura PS com dispneia progressiva há 1 semana, inicialmente aos esforços e agora em repouso. Refere edema em MMII há 3 dias, tosse seca ocasional e nega febre. Ao exame: taquipneica, estertores finos em bases pulmonares, B3 audível, edema 2+/4+ em MMII."
    },
    {
      id: 3,
      title: "Cefaleia + Alterações Visuais (Avançado)",
      difficulty: "Avançado",
      content: "Homem de 45 anos, previamente hígido, procura PS com cefaleia holocraniana de início súbito há 6 horas, intensidade 9/10, acompanhada de náuseas, vômitos e diplopia. Nega trauma recente. Exame neurológico: consciente, orientado, pupilas anisocóricas (direita > esquerda), paresia do III nervo craniano à direita, rigidez de nuca presente."
    }
  ];

  // Estados para "Representação do Problema"
  const [selectedVignetteId, setSelectedVignetteId] = useState(1);
  const [clinicalVignettePR, setClinicalVignettePR] = useState(clinicalVignettes[0].content);
  const [oneSentenceSummaryPR, setOneSentenceSummaryPR] = useState('');
  const [semanticQualifiersPR, setSemanticQualifiersPR] = useState('agudo, febril, progressivo, opressiva, etc.');
  const [feedbackPR, setFeedbackPR] = useState<ProblemRepresentationFeedback | null>(null);
  const [isLoadingPR, setIsLoadingPR] = useState(false);
  const [errorPR, setErrorPR] = useState<string | null>(null);

  // Handle vignette selection
  const handleVignetteChange = (vignetteId: number) => {
    const selectedVignette = clinicalVignettes.find(v => v.id === vignetteId);
    if (selectedVignette) {
      setSelectedVignetteId(vignetteId);
      setClinicalVignettePR(selectedVignette.content);
      // Reset form when changing vignettes
      setOneSentenceSummaryPR('');
      setSemanticQualifiersPR('');
      setFeedbackPR(null);
      setErrorPR(null);
    }
  };

  // Estados para "Construção de Illness Scripts"
  const [diseaseForScript, setDiseaseForScript] = useState('');
  const [illnessScript, setIllnessScript] = useState<IllnessScriptOutput | null>(null);
  const [isLoadingIS, setIsLoadingIS] = useState(false);
  const [errorIS, setErrorIS] = useState<string | null>(null);

  // Estados para "Exercício de Construção Reverso"
  const [showReverseExercise, setShowReverseExercise] = useState(false);
  const [reverseExerciseScenarios] = useState([
    {
      id: 1,
      title: "Cenário Cardiovascular",
      findings: [
        "👤 Paciente: Homem, 60 anos, fumante",
        "🔍 Sintomas: Dor torácica aos esforços há 3 meses",
        "📊 Fatores: HAS, dislipidemia, sedentarismo",
        "🩺 Exame: Sopro sistólico em foco aórtico",
        "📈 Curso: Piora progressiva, limitação funcional"
      ],
      correctAnswer: "Doença Arterial Coronariana",
      difficulty: "Intermediário"
    },
    {
      id: 2,
      title: "Cenário Infeccioso",
      findings: [
        "👤 Paciente: Mulher, 25 anos, previamente hígida",
        "🔍 Sintomas: Febre, disúria, urgência miccional",
        "📊 Fatores: Vida sexual ativa, uso de DIU",
        "🩺 Exame: Dor suprapúbica, Giordano negativo",
        "📈 Curso: Início agudo há 2 dias"
      ],
      correctAnswer: "Infecção do Trato Urinário Baixo (Cistite)",
      difficulty: "Básico"
    }
  ]);
  const [selectedScenario, setSelectedScenario] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [showScenarioResult, setShowScenarioResult] = useState(false);

  // Estados para "Comparação de Scripts"
  const [showComparison, setShowComparison] = useState(false);
  const [disease1, setDisease1] = useState('');
  const [disease2, setDisease2] = useState('');
  const [comparisonScript1, setComparisonScript1] = useState<IllnessScriptOutput | null>(null);
  const [comparisonScript2, setComparisonScript2] = useState<IllnessScriptOutput | null>(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);

  // Estados para "Coleta de Dados Direcionada"
  const [mainComplaintCD, setMainComplaintCD] = useState('');
  const [demographicsCD, setDemographicsCD] = useState('');
  const [initialFindingsCD, setInitialFindingsCD] = useState('');
  const [anamnesisQuestions, setAnamnesisQuestions] = useState<TeachQuestionPrioritizationOutput | null>(null);
  const [isLoadingCD, setIsLoadingCD] = useState(false);
  const [errorCD, setErrorCD] = useState<string | null>(null);

  // Estados para o quiz interativo
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);

  const handleSubmitProblemRepresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingPR(true);
    setErrorPR(null);
    setFeedbackPR(null);

    try {
      if (!oneSentenceSummaryPR.trim() || !semanticQualifiersPR.trim()) {
        throw new Error('Por favor, preencha todos os campos obrigatórios.');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Autenticação necessária. Por favor, faça login.');
      }

      const qualifiersList = semanticQualifiersPR.split(',').map(q => q.trim()).filter(Boolean);

      const response = await fetch('/api/clinical-assistant/provide-feedback-on-problem-representation-translated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clinical_vignette_summary: clinicalVignettePR,
          user_problem_representation: oneSentenceSummaryPR,
          user_semantic_qualifiers: qualifiersList,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFeedbackPR(data);
    } catch (err) {
      setErrorPR(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
    } finally {
      setIsLoadingPR(false);
    }
  };

  const handleSubmitIllnessScript = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingIS(true);
    setErrorIS(null);
    setIllnessScript(null);
    try {
      if (!diseaseForScript.trim()) throw new Error('Por favor, insira o nome da doença.');
      const token = await getToken();
      if (!token) throw new Error('Autenticação necessária.');

      const response = await fetch('/api/clinical-assistant/generate-illness-script-translated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ disease_name: diseaseForScript }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Falha ao gerar o illness script.');
      }
      setIllnessScript(await response.json());
    } catch (err) {
      setErrorIS(err instanceof Error ? err.message : 'Ocorreu um erro.');
    } finally {
      setIsLoadingIS(false);
    }
  };

  const handleCompareScripts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingComparison(true);
    setComparisonError(null);
    setComparisonScript1(null);
    setComparisonScript2(null);
    try {
      if (!disease1.trim() || !disease2.trim()) throw new Error('Por favor, insira o nome das duas doenças.');
      const token = await getToken();
      if (!token) throw new Error('Autenticação necessária.');

      const fetchScript = async (diseaseName: string) => {
        const response = await fetch('/api/clinical-assistant/generate-illness-script-translated', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ disease_name: diseaseName }),
        });
        if (!response.ok) throw new Error(`Falha ao buscar script para ${diseaseName}`);
        return response.json();
      };

      const [script1, script2] = await Promise.all([fetchScript(disease1), fetchScript(disease2)]);
      setComparisonScript1(script1);
      setComparisonScript2(script2);
    } catch (err) {
      setComparisonError(err instanceof Error ? err.message : 'Ocorreu um erro na comparação.');
    } finally {
      setIsLoadingComparison(false);
    }
  };

  const handleReverseExerciseSubmit = () => {
    setShowScenarioResult(true);
  };

  const handleNextScenario = () => {
    setShowScenarioResult(false);
    setStudentAnswer('');
    setSelectedScenario((prev) => (prev + 1) % reverseExerciseScenarios.length);
  };

  const handleQuizAnswer = (answer: string) => {
    setQuizAnswer(answer);
    setShowQuizResult(true);
  };

  const resetQuiz = () => {
    setQuizAnswer(null);
    setShowQuizResult(false);
  };

  const handleSubmitAnamnesis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoadingCD(true);
    setErrorCD(null);
    setAnamnesisQuestions(null);

    try {
      if (!mainComplaintCD.trim() || !demographicsCD.trim()) {
        throw new Error('Por favor, preencha a queixa principal e os dados demográficos.');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Autenticação necessária. Por favor, faça login.');
      }

      const response = await fetch('/api/clinical-assistant/teach-question-prioritization-translated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          chief_complaint: mainComplaintCD,
          demographics: demographicsCD,
          initial_findings: initialFindingsCD,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data: TeachQuestionPrioritizationOutput = await response.json();
      setAnamnesisQuestions(data);

    } catch (err) {
      setErrorCD(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
    } finally {
      setIsLoadingCD(false);
    }
  };

  const fdrWorkflowSteps: WorkflowStep[] = [
    { id: 'reasoning-types', title: 'Tipos de Raciocínio', icon: Users, description: 'Entenda os modelos mentais do diagnóstico.' },
    { id: 'problem-representation', title: 'Representação do Problema', icon: MessageSquareQuote, description: 'Aprenda a resumir e qualificar um caso.' },
    { id: 'illness-scripts', title: 'Illness Scripts', icon: FileText, description: 'Construa e compare roteiros de doenças.' },
    { id: 'data-collection', title: 'Coleta de Dados', icon: Stethoscope, description: 'Pratique a coleta de informações direcionadas.' },
  ];

  return (
  <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="mb-12"> {/* Wrapper for spacing */}
        <IntegratedWorkflowCard
          title="Raciocínio Diagnóstico Fundamental"
          subtitle="Explore os pilares do pensamento clínico e aprimore suas habilidades."
          mainIcon={Brain} 
          steps={fdrWorkflowSteps}
          activeStepId={activeTab}
          completedSteps={[]} // No completion tracking for now
          onStepClick={(stepId) => setActiveTab(stepId)}
          themeColorName="blue"
          totalSteps={fdrWorkflowSteps.length}
        />
      </div>

    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-blue-50 p-1 rounded-lg border border-blue-200">
        <TabsTrigger value="reasoning-types" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-blue-100 data-[state=inactive]:text-blue-700 rounded-md px-3 py-2 text-sm font-medium transition-all">
          <Users className="h-4 w-4 mr-2" />
          Tipos de Raciocínio
        </TabsTrigger>
        <TabsTrigger value="problem-representation" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-blue-100 data-[state=inactive]:text-blue-700 rounded-md px-3 py-2 text-sm font-medium transition-all">
          <MessageSquareQuote className="h-4 w-4 mr-2" />
          Representação do Problema
        </TabsTrigger>
        <TabsTrigger value="illness-scripts" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-blue-100 data-[state=inactive]:text-blue-700 rounded-md px-3 py-2 text-sm font-medium transition-all">
          <FileText className="h-4 w-4 mr-2" />
          Illness Scripts
        </TabsTrigger>
        <TabsTrigger value="data-collection" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-blue-100 data-[state=inactive]:text-blue-700 rounded-md px-3 py-2 text-sm font-medium transition-all">
          <Stethoscope className="h-4 w-4 mr-2" />
          Coleta de Dados
        </TabsTrigger>
      </TabsList>

      <TabsContent value="reasoning-types">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-6 w-6 mr-2 text-teal-500" />
              Raciocínio Abdutivo, Dedutivo e Indutivo na Prática
            </CardTitle>
            <CardDescription>
              Entenda os diferentes tipos de raciocínio diagnóstico e como aplicá-los na prática clínica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-md">
                <h3 className="font-semibold text-blue-700 mb-2 flex items-center">
                  <Badge className="mr-2 bg-blue-100 text-blue-800 hover:bg-blue-200">Abdutivo</Badge>
                  Gerando Hipóteses
                </h3>
                <p className="text-base text-muted-foreground">Criando explicações plausíveis para observações clínicas. É o ponto de partida do diagnóstico.</p>
                <ul className="list-disc pl-5 mt-2 text-base">
                  <li>Parte dos dados para possíveis explicações</li>
                  <li>Usa conhecimento de padrões e doenças</li>
                  <li>Ex: "Esse paciente tem febre e tosse produtiva, pode ser pneumonia"</li>
                </ul>
              </div>

              <div className="p-4 border rounded-md">
                <h3 className="font-semibold text-blue-700 mb-2 flex items-center">
                  <Badge className="mr-2 bg-blue-100 text-blue-800 hover:bg-blue-200">Dedutivo</Badge>
                  Testando Hipóteses
                </h3>
                <p className="text-base text-muted-foreground">Partindo de hipóteses para prever achados e testá-los contra observações.</p>
                <ul className="list-disc pl-5 mt-2 text-base">
                  <li>Parte da hipótese para prever dados</li>
                  <li>Se hipótese X, esperaríamos achados Y</li>
                  <li>Ex: "Se for pneumonia, esperaríamos estertores na ausculta"</li>
                </ul>
              </div>

              <div className="p-4 border rounded-md">
                <h3 className="font-semibold text-blue-700 mb-2 flex items-center">
                  <Badge className="mr-2 bg-blue-100 text-blue-800 hover:bg-blue-200">Indutivo</Badge>
                  Generalizando Padrões
                </h3>
                <p className="text-base text-muted-foreground">Identificando padrões a partir de múltiplas observações para formular conclusões gerais.</p>
                <ul className="list-disc pl-5 mt-2 text-base">
                  <li>Parte de casos específicos para princípios gerais</li>
                  <li>Baseado em experiência clínica acumulada</li>
                  <li>Ex: "A maioria dos pacientes com esses sintomas responde bem a este tratamento"</li>
                </ul>
              </div>
            </div>

            {/* Exemplos práticos para análise */}
            <div className="mt-6">
              <h3 className="font-semibold text-lg mb-3">Exemplos de Casos para Análise de Raciocínio</h3>
              
              <div className="border rounded-md p-4 mb-4">
                <h4 className="font-lg font-bold text-primary mb-2">Caso 1: Dor Abdominal</h4>
                <p className="text-justify text-base mb-3">
                  Paciente de 25 anos com dor em fossa ilíaca direita há 24h, associada a náuseas, anorexia e febre baixa. 
                  Exame físico revela dor à descompressão em FID (sinal de Blumberg positivo).
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-base">
                  <div className="p-2 bg-green-50 rounded">
                    <span className="font-semibold text-green-700">Raciocínio Abdutivo:</span>
                    <p>A combinação de dor em FID, Blumberg +, febre e náuseas sugere apendicite aguda como hipótese principal. Diagnósticos alternativos incluem adenite mesentérica, diverticulite cecal e doença inflamatória pélvica.</p>
                  </div>
                  
                  <div className="p-2 bg-blue-50 rounded">
                    <span className="font-semibold text-blue-700">Raciocínio Dedutivo:</span>
                    <p>Se for apendicite aguda, esperaríamos: leucocitose, PCR elevada, dor na manobra do psoas, e possivelmente visualização do apêndice inflamado na ultrassonografia. Vamos testar essas predições.</p>
                  </div>
                  
                  <div className="p-2 bg-purple-50 rounded">
                    <span className="font-semibold text-purple-700">Raciocínio Indutivo:</span>
                    <p>Baseado em casos anteriores similares, a ausência de alteração do trânsito intestinal e a localização precisa da dor aumentam a probabilidade de apendicite vs. outras causas de dor abdominal.</p>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-md p-4">
                <h4 className="font-lg font-bold text-primary mb-2">Caso 2: Cefaleia</h4>
                <p className="text-justify text-base mb-3">
                  Mulher de 35 anos com história de cefaleias recorrentes há 3 anos. Dor pulsátil, unilateral, 
                  associada a fotofobia e náuseas. Piora com atividade física. Duração típica de 24h.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-base">
                  <div className="p-2 bg-green-50 rounded">
                    <span className="font-semibold text-green-700">Raciocínio Abdutivo:</span>
                    <p>Cefaleia pulsátil, unilateral, com fotofobia e agravada por atividade física sugere fortemente migrânea. Alternativas incluem cefaleia tensional, cefaleia em salvas, ou secundária a sinusite.</p>
                  </div>
                  
                  <div className="p-2 bg-blue-50 rounded">
                    <span className="font-semibold text-blue-700">Raciocínio Dedutivo:</span>
                    <p>Se for migrânea, espera-se ausência de sinais de alarme, história familiar positiva, melhora com triptanos, e exame neurológico normal. Vamos verificar esses critérios.</p>
                  </div>
                  
                  <div className="p-2 bg-purple-50 rounded">
                    <span className="font-semibold text-purple-700">Raciocínio Indutivo:</span>
                    <p>A experiência mostra que pacientes com este perfil de cefaleia (mulher jovem, características clássicas) raramente têm causas secundárias graves, apoiando a hipótese de migrânea com base em padrões típicos.</p>
                  </div>
                </div>
              </div>
            </div>

              {/* Quiz interativo */}
              <div className="mt-6 p-4 border rounded-md bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
                <div className="flex items-center mb-3">
                  <HelpCircle className="h-5 w-5 mr-2 text-blue-600" />
                  <h4 className="font-semibold text-blue-700">Teste Seu Entendimento</h4>
                </div>
                <p className="text-sm text-blue-600 mb-3">
                  <strong>Pergunta:</strong> No Caso 1 (Dor Abdominal), a afirmação <em>"Baseado em casos anteriores similares, a ausência de alteração do trânsito intestinal... aumenta a probabilidade de apendicite"</em> representa qual tipo de raciocínio?
                </p>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleQuizAnswer('A')}
                    className={`w-full text-left p-2 rounded border transition-colors text-sm ${
                      quizAnswer === 'A' 
                        ? 'bg-blue-100 border-blue-300' 
                        : 'border-transparent hover:bg-blue-100 hover:border-blue-300'
                    }`}
                  >
                    A) Abdutivo - porque gera uma nova hipótese
                  </button>
                  <button 
                    onClick={() => handleQuizAnswer('B')}
                    className={`w-full text-left p-2 rounded border transition-colors text-sm ${
                      quizAnswer === 'B' 
                        ? 'bg-blue-100 border-blue-300' 
                        : 'border-transparent hover:bg-blue-100 hover:border-blue-300'
                    }`}
                  >
                    B) Dedutivo - porque testa uma predição específica
                  </button>
                  <button 
                    onClick={() => handleQuizAnswer('C')}
                    className={`w-full text-left p-2 rounded border transition-colors text-sm ${
                      quizAnswer === 'C' 
                        ? 'bg-blue-100 border-blue-300' 
                        : 'border-transparent hover:bg-blue-100 hover:border-blue-300'
                    }`}
                  >
                    C) Indutivo - porque usa experiência clínica acumulada
                  </button>
                </div>
                
                {showQuizResult && (
                  <div className="mt-4 p-3 border rounded-md bg-green-50 border-green-200">
                    <h5 className="font-semibold text-green-800 mb-2">
                      {quizAnswer === 'C' ? '✅ Correto!' : '❌ Resposta Incorreta'}
                    </h5>
                    <p className="text-sm text-green-700 mb-2">
                      <strong>Resposta correta:</strong> C) Indutivo - porque usa experiência clínica acumulada
                    </p>
                    <p className="text-xs text-green-600 mb-2">
                      <strong>Explicação:</strong> A afirmação "baseado em casos anteriores similares" indica raciocínio indutivo, 
                      que generaliza padrões a partir de múltiplas observações clínicas acumuladas ao longo da experiência.
                    </p>
                    <button 
                      onClick={resetQuiz}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Tentar novamente
                    </button>
                  </div>
                )}
                
                <p className="text-xs text-blue-500 mt-2 italic">💡 Dica: Pense sobre qual tipo de raciocínio se baseia em padrões observados em múltiplos casos anteriores.</p>
              </div>
            </CardContent>
            <CardFooter>
              <p className="text-sm text-muted-foreground italic">Esta seção integra conceitos de filosofia da ciência com prática clínica cotidiana.</p>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="problem-representation">
          <Card>
            <form onSubmit={handleSubmitProblemRepresentation}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquareQuote className="h-6 w-6 mr-2 text-blue-500" />
                  Representação do Problema & Qualificadores Semânticos
                </CardTitle>
                <CardDescription>
                  Aprenda a criar um resumo conciso e identificar qualificadores semânticos essenciais para um diagnóstico preciso.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 text-primary">Teoria Breve: A Essência da Representação do Problema</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Uma boa representação do problema é uma frase concisa que captura os elementos chave do caso clínico. Os{' '}
                    <GlossaryTooltip 
                      term="Qualificadores Semânticos" 
                      definition="Termos padronizados que descrevem características específicas da doença (temporalidade, qualidade, intensidade, etc.) ajudando na categorização diagnóstica"
                    >
                      qualificadores semânticos
                    </GlossaryTooltip>{' '}
                    são termos padronizados que descrevem características da doença (ex: agudo vs. crônico, início súbito vs. gradual, dor em queimação vs. pontada).
                  </p>
                </div>

                {/* Exemplos Comparativos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 border rounded-md bg-green-50 border-green-200">
                    <h4 className="font-semibold text-green-700 mb-2 flex items-center">
                      ✅ Exemplo de BOA Representação
                    </h4>
                    <div className="text-sm">
                      <p className="font-medium text-green-800 mb-1">Caso:</p>
                      <p className="text-green-600 mb-2 italic">"Homem de 65 anos com DM e HAS apresenta dor torácica opressiva há 2h, irradiando para braço esquerdo, com sudorese e náuseas."</p>
                      
                      <p className="font-medium text-green-800 mb-1">Representação:</p>
                      <p className="text-green-700 font-medium">"Síndrome coronariana aguda em paciente de alto risco cardiovascular."</p>
                      
                      <p className="font-medium text-green-800 mb-1 mt-2">Qualificadores:</p>
                      <p className="text-green-700">agudo, opressivo, irradiado, cardiovascular, isquêmico</p>
                      
                      <p className="text-xs text-green-600 mt-2">
                        ✅ <strong>Por que é boa:</strong> Abstrata, captura o padrão clínico essencial, inclui contexto de risco.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 border rounded-md bg-red-50 border-red-200">
                    <h4 className="font-semibold text-red-700 mb-2 flex items-center">
                      ❌ Exemplo de MÁ Representação
                    </h4>
                    <div className="text-sm">
                      <p className="font-medium text-red-800 mb-1">Mesmo Caso:</p>
                      <p className="text-red-600 mb-2 italic">"Homem de 65 anos com DM e HAS apresenta dor torácica opressiva há 2h, irradiando para braço esquerdo, com sudorese e náuseas."</p>
                      
                      <p className="font-medium text-red-800 mb-1">Representação:</p>
                      <p className="text-red-700 font-medium">"Homem diabético e hipertenso com dor no peito que começou hoje cedo."</p>
                      
                      <p className="font-medium text-red-800 mb-1 mt-2">Qualificadores:</p>
                      <p className="text-red-700">masculino, diabético, hipertenso, doloroso, matinal</p>
                      
                      <p className="text-xs text-red-600 mt-2">
                        ❌ <strong>Por que é ruim:</strong> Muito específica, não captura o padrão clínico, qualificadores irrelevantes.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-md bg-amber-50 border-amber-200">
                  <div className="flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-amber-600" />
                      <h3 className="text-md font-semibold text-amber-700">Laboratório de Prática</h3>
                  </div>
                  <p className="text-sm text-amber-600 mt-1 mb-3">
                    Leia a vinheta clínica abaixo, escreva seu resumo e liste os qualificadores semânticos. Dr. Corvus fornecerá feedback.
                  </p>
                  
                  <div className="space-y-4">
                    {/* Seletor de Vinhetas */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Escolha uma Vinheta Clínica:</label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {clinicalVignettes.map((vignette) => (
                          <button
                            key={vignette.id}
                            type="button"
                            onClick={() => handleVignetteChange(vignette.id)}
                            className={`p-3 text-left border rounded-md transition-all hover:shadow-md ${
                              selectedVignetteId === vignette.id
                                ? 'border-amber-400 bg-amber-50 shadow-md'
                                : 'border-gray-200 bg-white hover:border-amber-200'
                            }`}
                          >
                            <div className="font-medium text-sm">{vignette.title}</div>
                            <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                              vignette.difficulty === 'Básico' ? 'bg-green-100 text-green-700' :
                              vignette.difficulty === 'Intermediário' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {vignette.difficulty}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label htmlFor="clinicalVignettePR" className="block text-sm font-medium mb-1">Vinheta Clínica Selecionada:</label>
                      <Textarea id="clinicalVignettePR" placeholder="Vinheta clínica..." value={clinicalVignettePR} onChange={(e) => setClinicalVignettePR(e.target.value)} rows={4} readOnly className="bg-white/50" />
                      <p className="text-xs text-muted-foreground mt-1">💡 Experimente diferentes níveis de dificuldade para praticar suas habilidades.</p>
                    </div>
                    <div>
                      <label htmlFor="oneSentenceSummaryPR" className="block text-sm font-medium mb-1">Seu "One-Sentence Summary": <span className="text-red-500">*</span></label>
                      <Input 
                        id="oneSentenceSummaryPR" 
                        placeholder="Escreva o resumo abstrato aqui..." 
                        value={oneSentenceSummaryPR} 
                        onChange={(e) => setOneSentenceSummaryPR(e.target.value)} 
                        disabled={isLoadingPR}
                        required 
                      />
                      <p className="text-xs text-muted-foreground mt-1">Mínimo de 10 caracteres para análise adequada</p>
                    </div>
                    <div>
                      <label htmlFor="semanticQualifiersPR" className="block text-sm font-medium mb-1">Seus Qualificadores Semânticos (separados por vírgula): <span className="text-red-500">*</span></label>
                      <Input 
                        id="semanticQualifiersPR" 
                        placeholder="Ex: agudo, febril, progressivo..." 
                        value={semanticQualifiersPR} 
                        onChange={(e) => setSemanticQualifiersPR(e.target.value)} 
                        disabled={isLoadingPR}
                        required 
                      />
                      <p className="text-xs text-muted-foreground mt-1">Inclua pelo menos características temporais, qualitativas ou de severidade</p>
                    </div>
                    <Button type="submit" disabled={isLoadingPR || !authIsLoaded} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                      {isLoadingPR ? (
                        <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Analisando...</>
                      ) : (
                        <><Users className="mr-2 h-4 w-4" /> Obter Feedback do Dr. Corvus</>
                      )}
                    </Button>
                  </div>

                  {errorPR && (
                    <Alert variant="destructive" className="mt-4">
                      <HelpCircle className="h-4 w-4" />
                      <AlertTitle>Ops! Algo deu errado</AlertTitle>
                      <AlertDescription className="mt-2">
                        {errorPR}
                        <br />
                        <span className="text-sm mt-2 block">Se o problema persistir, tente recarregar a página ou entre em contato conosco.</span>
                      </AlertDescription>
                    </Alert>
                  )}
                  {isLoadingPR && <FeedbackSkeleton />}
                  {feedbackPR && (
                    <div className="mt-6 p-6 border rounded-lg bg-white shadow-md space-y-6">
                      <h4 className="font-bold text-xl text-gray-800 mb-2">Análise da Representação do Problema</h4>

                      <div>
                        <h5 className="font-semibold text-lg text-gray-700 border-b pb-2 mb-3">Avaliação Geral</h5>
                        <p className="text-gray-600 italic">{feedbackPR.overall_assessment}</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                          <h5 className="font-semibold text-md text-green-800 mb-2">Pontos Fortes</h5>
                          <ul className="list-disc list-inside text-green-700 space-y-1">
                            {feedbackPR.feedback_strengths.map((item, index) => <li key={`strength-${index}`}>{item}</li>)}
                          </ul>
                        </div>
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <h5 className="font-semibold text-md text-yellow-800 mb-2">Pontos a Melhorar</h5>
                          <ul className="list-disc list-inside text-yellow-700 space-y-1">
                            {feedbackPR.feedback_improvements.map((item, index) => <li key={`improvement-${index}`}>{item}</li>)}
                          </ul>
                        </div>
                      </div>

                      <div>
                        <h5 className="font-semibold text-lg text-gray-700 border-b pb-2 mb-3">Elementos Ausentes</h5>
                        <ul className="list-disc list-inside text-red-700 space-y-1">
                          {feedbackPR.missing_elements.map((item, index) => <li key={`missing-${index}`}>{item}</li>)}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-semibold text-lg text-gray-700 border-b pb-2 mb-3">Orientações para Próximo Passo</h5>
                        <p className="text-gray-600">{feedbackPR.next_step_guidance}</p>
                      </div>

                      <div>
                        <h5 className="font-semibold text-lg text-blue-800 border-b border-blue-200 pb-2 mb-3">Perguntas Socráticas para Reflexão</h5>
                        <ul className="list-decimal list-inside text-blue-700 space-y-2">
                          {feedbackPR.socratic_questions.map((item, index) => <li key={`socratic-${index}`}>{item}</li>)}
                        </ul>
                      </div>

                    </div>
                  )}
                  {!feedbackPR && !isLoadingPR && !errorPR && (
                      <div className="mt-6 p-4 border rounded-md bg-sky-50 border-sky-200">
                        <div className="flex items-center">
                          <HelpCircle className="h-5 w-5 mr-2 text-sky-600" />
                          <h3 className="text-md font-semibold text-sky-700">Pronto para o feedback?</h3>
                        </div>
                        <p className="text-sm text-sky-600 mt-1">
                          Preencha os campos acima e clique em "Obter Feedback do Dr. Corvus" para uma análise da sua representação do problema.
                        </p>
                      </div>
                    )}
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground italic">Esta ferramenta fornece feedback personalizado do Dr. Corvus sobre a qualidade da representação do problema clínico.</p>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="illness-scripts">
          <Card>
            <form onSubmit={handleSubmitIllnessScript}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="h-6 w-6 mr-2 text-green-500" />
                  Construção de "Illness Scripts"
                </CardTitle>
                <CardDescription>
                  Entenda e explore os "scripts de doença" para reconhecer padrões clínicos.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 text-primary">Teoria Breve: O que são "Illness Scripts"?</h3>
                  <p className="text-sm text-muted-foreground">
                    <GlossaryTooltip 
                      term="Illness Scripts" 
                      definition="Representações mentais organizadas de doenças que incluem fatores predisponentes, fisiopatologia e manifestações clínicas, facilitando o reconhecimento de padrões"
                    >
                      "Illness scripts"
                    </GlossaryTooltip>{' '}
                    são representações mentais organizadas de doenças, incluindo:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    <li><strong>Condições Predisponentes:</strong> Fatores de risco e demografia.</li>
                    <li><strong>Fisiopatologia:</strong> Mecanismos da doença (de forma simplificada).</li>
                    <li><strong>Consequências Clínicas:</strong> Sinais, sintomas, curso esperado.</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-md bg-sky-50 border-sky-200">
                  <div className="flex items-center">
                      <Lightbulb className="h-5 w-5 mr-2 text-sky-600" />
                      <h3 className="text-md font-semibold text-sky-700">Ferramenta de Exploração</h3>
                  </div>
                   <p className="text-sm text-sky-600 mt-1 mb-3">
                    Digite uma doença para Dr. Corvus apresentar o "illness script" típico.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="diseaseForScript" className="block text-sm font-medium mb-1">Nome da Doença: <span className="text-red-500">*</span></label>
                      <Input 
                        id="diseaseForScript" 
                        placeholder="Ex: Pneumonia Comunitária" 
                        value={diseaseForScript} 
                        onChange={(e) => setDiseaseForScript(e.target.value)} 
                        disabled={isLoadingIS}
                        required 
                      />
                      <p className="text-xs text-muted-foreground mt-1">Entre 3 e 100 caracteres</p>
                    </div>
                    <Button type="submit" disabled={isLoadingIS || !authIsLoaded} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                      {isLoadingIS ? (
                        <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Buscando Script...</>
                      ) : (
                        <><FileText className="mr-2 h-4 w-4" /> Buscar Illness Script</>
                      )}
                    </Button>
                  </div>

                  {errorIS && (
                    <Alert variant="destructive" className="mt-4">
                      <HelpCircle className="h-4 w-4" />
                      <AlertTitle>Ops! Algo deu errado</AlertTitle>
                      <AlertDescription className="mt-2">
                        {errorIS}
                        <br />
                        <span className="text-sm mt-2 block">Se o problema persistir, tente recarregar a página ou entre em contato conosco.</span>
                      </AlertDescription>
                    </Alert>
                  )}
                  {isLoadingIS && <IllnessScriptSkeleton />}
                  {illnessScript && (
                     <div className="mt-6 p-4 border rounded-md bg-green-50 border-green-200 space-y-3">
                      <h4 className="text-lg font-semibold text-green-800">Illness Script para: {illnessScript.disease_name}</h4>
                      <div>
                        <p className="font-semibold text-green-700">Condições Predisponentes:</p>
                        {illnessScript.predisposing_conditions.length > 0 ? (
                            <ul className="list-disc pl-5 text-sm text-green-600">
                                {illnessScript.predisposing_conditions.map((item, index) => <li key={`cond-${index}`}>{item}</li>)}
                            </ul>
                        ) : <p className="text-sm text-green-600">N/A</p>}
                      </div>
                      <div>
                        <p className="font-semibold text-green-700">Resumo da Fisiopatologia:</p>
                        <p className="text-sm text-green-600 whitespace-pre-wrap">{illnessScript.pathophysiology_summary || "N/A"}</p>
                      </div>
                      <div>
                        <p className="font-semibold text-green-700">Sintomas e Sinais Chave:</p>
                        {illnessScript.key_symptoms_and_signs.length > 0 ? (
                            <ul className="list-disc pl-5 text-sm text-green-600">
                                {illnessScript.key_symptoms_and_signs.map((item, index) => <li key={`symp-${index}`}>{item}</li>)}
                            </ul>
                        ) : <p className="text-sm text-green-600">N/A</p>}
                      </div>
                      {illnessScript.relevant_diagnostics && illnessScript.relevant_diagnostics.length > 0 && (
                        <div>
                            <p className="font-semibold text-green-700">Diagnósticos Relevantes/Testes:</p>
                            <ul className="list-disc pl-5 text-sm text-green-600">
                                {illnessScript.relevant_diagnostics.map((item, index) => <li key={`diag-${index}`}>{item}</li>)}
                            </ul>
                        </div>
                      )}
                      <p className="text-xs italic mt-2 text-muted-foreground">{illnessScript.disclaimer}</p>
                    </div>
                  )}
                  {!illnessScript && !isLoadingIS && !errorIS && (
                    <div className="mt-6 p-4 border rounded-md bg-sky-50 border-sky-200">
                        <div className="flex items-center">
                        <HelpCircle className="h-5 w-5 mr-2 text-sky-600" />
                        <h3 className="text-md font-semibold text-sky-700">Pronto para explorar?</h3>
                        </div>
                        <p className="text-sm text-sky-600 mt-1">
                        Digite o nome de uma doença e clique em "Buscar Illness Script" para ver suas características principais.
                        </p>
                    </div>
                  )}
                </div>
                
                <div className="mt-6 p-4 border rounded-md bg-purple-50 border-purple-200">
                     <div className="flex items-center">
                        <HelpCircle className="h-5 w-5 mr-2 text-purple-600" />
                        <h3 className="text-md font-semibold text-purple-700">Exercício de Construção Reverso</h3>
                     </div>
                    <p className="text-sm text-purple-600 mt-1 mb-3">
                      Dr. Corvus apresenta achados clínicos. Você deve inferir a doença subjacente.
                    </p>
                    
                    {!showReverseExercise ? (
                      <Button 
                        onClick={() => setShowReverseExercise(true)} 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Brain className="mr-2 h-4 w-4" />
                        Iniciar Exercício Reverso
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-3 bg-white rounded border">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-purple-800">
                              {reverseExerciseScenarios[selectedScenario].title}
                            </h4>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              reverseExerciseScenarios[selectedScenario].difficulty === 'Básico' 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {reverseExerciseScenarios[selectedScenario].difficulty}
                            </span>
                          </div>
                          
                          <div className="space-y-1 mb-3">
                            <p className="text-sm font-medium text-purple-700">Achados Clínicos:</p>
                            {reverseExerciseScenarios[selectedScenario].findings.map((finding, idx) => (
                              <p key={idx} className="text-sm text-purple-600">
                                {finding}
                              </p>
                            ))}
                          </div>
                          
                          {!showScenarioResult && (
                            <>
                              <div className="mb-2">
                                <label className="block text-sm font-medium text-purple-700 mb-1">
                                  Qual doença/condição você suspeita?
                                </label>
                                <Input
                                  value={studentAnswer}
                                  onChange={(e) => setStudentAnswer(e.target.value)}
                                  placeholder="Digite sua hipótese diagnóstica..."
                                  className="mb-2"
                                />
                              </div>
                              <Button 
                                onClick={handleReverseExerciseSubmit}
                                disabled={!studentAnswer.trim()}
                                size="sm"
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                Verificar Resposta
                              </Button>
                            </>
                          )}
                          
                          {showScenarioResult && (
                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                              <p className="text-sm font-medium text-green-800 mb-1">
                                ✅ Resposta Esperada: {reverseExerciseScenarios[selectedScenario].correctAnswer}
                              </p>
                              <p className="text-sm text-green-700 mb-1">
                                <strong>Sua Resposta:</strong> {studentAnswer}
                              </p>
                              <p className="text-xs text-green-600">
                                💡 Compare sua resposta com a esperada. As variações de nomenclatura são normais!
                              </p>
                              <div className="mt-2 space-x-2">
                                <Button 
                                  onClick={handleNextScenario}
                                  size="sm"
                                  variant="outline"
                                >
                                  Próximo Cenário
                                </Button>
                                <Button 
                                  onClick={() => setShowReverseExercise(false)}
                                  size="sm"
                                  variant="ghost"
                                >
                                  Fechar Exercício
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>

                {/* Ferramenta de Comparação de Scripts */}
                <div className="mt-6 p-4 border rounded-md bg-teal-50 border-teal-200">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 mr-2 text-teal-600" />
                    <h3 className="text-md font-semibold text-teal-700">Comparação de Scripts</h3>
                  </div>
                  <p className="text-sm text-teal-600 mt-1 mb-3">
                    Compare dois illness scripts lado a lado para identificar características discriminatórias.
                  </p>
                  
                  {!showComparison ? (
                    <Button 
                      onClick={() => setShowComparison(true)} 
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Iniciar Comparação
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-teal-700 mb-1">
                            Primeira Doença:
                          </label>
                          <Input
                            value={disease1}
                            onChange={(e) => setDisease1(e.target.value)}
                            placeholder="Ex: Gota"
                            className="mb-2"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-teal-700 mb-1">
                            Segunda Doença:
                          </label>
                          <Input
                            value={disease2}
                            onChange={(e) => setDisease2(e.target.value)}
                            placeholder="Ex: Artrite Séptica"
                            className="mb-2"
                          />
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          onClick={handleCompareScripts}
                          disabled={!disease1.trim() || !disease2.trim() || isLoadingComparison}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {isLoadingComparison ? (
                            <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Comparando...</>
                          ) : (
                            <><Users className="mr-2 h-4 w-4" /> Comparar Scripts</>
                          )}
                        </Button>
                        <Button 
                          onClick={() => setShowComparison(false)}
                          variant="outline"
                          size="sm"
                        >
                          Fechar
                        </Button>
                      </div>

                      {comparisonError && (
                        <Alert variant="destructive" className="mt-4">
                          <HelpCircle className="h-4 w-4" />
                          <AlertTitle>Erro na Comparação</AlertTitle>
                          <AlertDescription>{comparisonError}</AlertDescription>
                        </Alert>
                      )}

                      {comparisonScript1 && comparisonScript2 && (
                        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Script 1 */}
                          <div className="p-4 border rounded-md bg-blue-50 border-blue-200">
                            <h4 className="text-lg font-semibold text-blue-800 mb-3">
                              📋 {comparisonScript1.disease_name}
                            </h4>
                            
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="font-semibold text-blue-700">Predisponentes:</p>
                                <ul className="list-disc pl-4 text-blue-600">
                                  {comparisonScript1.predisposing_conditions.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div>
                                <p className="font-semibold text-blue-700">Sintomas/Sinais:</p>
                                <ul className="list-disc pl-4 text-blue-600">
                                  {comparisonScript1.key_symptoms_and_signs.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div>
                                <p className="font-semibold text-blue-700">Fisiopatologia:</p>
                                <p className="text-blue-600 text-xs">{comparisonScript1.pathophysiology_summary}</p>
                              </div>
                            </div>
                          </div>

                          {/* Script 2 */}
                          <div className="p-4 border rounded-md bg-orange-50 border-orange-200">
                            <h4 className="text-lg font-semibold text-orange-800 mb-3">
                              📋 {comparisonScript2.disease_name}
                            </h4>
                            
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="font-semibold text-orange-700">Predisponentes:</p>
                                <ul className="list-disc pl-4 text-orange-600">
                                  {comparisonScript2.predisposing_conditions.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div>
                                <p className="font-semibold text-orange-700">Sintomas/Sinais:</p>
                                <ul className="list-disc pl-4 text-orange-600">
                                  {comparisonScript2.key_symptoms_and_signs.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              </div>
                              
                              <div>
                                <p className="font-semibold text-orange-700">Fisiopatologia:</p>
                                <p className="text-orange-600 text-xs">{comparisonScript2.pathophysiology_summary}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground italic">Esta ferramenta ajuda a construir illness scripts estruturados para melhor reconhecimento de padrões clínicos.</p>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="data-collection">
          <Card>
            <form onSubmit={handleSubmitAnamnesis}>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Stethoscope className="h-6 w-6 mr-2 text-red-500" />
                  Coleta de Dados Direcionada (Anamnese e Exame Físico)
                </CardTitle>
                <CardDescription>
                  Aprenda a realizar uma coleta de dados eficiente, guiada por hipóteses diagnósticas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2 text-primary">Teoria Breve: Coleta de Dados Guiada por Hipóteses</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    O "Hypothesis-Driven Physical Exam (HDPE)" e uma anamnese direcionada focam na coleta de informações que ajudam a confirmar ou refutar suas hipóteses diagnósticas, tornando o processo mais eficiente e relevante.
                  </p>
                </div>

                <div className="p-4 border rounded-md bg-indigo-50 border-indigo-200">
                  <div className="flex items-center">
                      <ListChecks className="h-5 w-5 mr-2 text-indigo-600" />
                      <h3 className="text-md font-semibold text-indigo-700">Simulador de Anamnese</h3>
                  </div>
                  <p className="text-sm text-indigo-600 mt-1 mb-3">
                    Receba uma queixa principal e dados demográficos. Dr. Corvus ajudará a gerar perguntas-chave.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="mainComplaintCD" className="block text-sm font-medium mb-1">Queixa Principal: <span className="text-red-500">*</span></label>
                      <Input 
                        id="mainComplaintCD" 
                        placeholder="Ex: Dor torácica" 
                        value={mainComplaintCD} 
                        onChange={(e) => setMainComplaintCD(e.target.value)} 
                        disabled={isLoadingCD}
                        required 
                      />
                      <p className="text-xs text-muted-foreground mt-1">Mínimo de 3 caracteres</p>
                    </div>
                    <div>
                      <label htmlFor="initialFindingsCD" className="block text-sm font-medium mb-1">Achados Iniciais:</label>
                      <Input 
                        id="initialFindingsCD" 
                        placeholder="Ex: leucocitose, PCR elevada" 
                        value={initialFindingsCD} 
                        onChange={(e) => setInitialFindingsCD(e.target.value)} 
                        disabled={isLoadingCD}
                      />
                      <p className="text-xs text-muted-foreground mt-1">💡 Liste achados clínicos já conhecidos (separados por vírgula). Opcional.</p>
                    </div>
                    <div>
                      <label htmlFor="demographicsCD" className="block text-sm font-medium mb-1">Dados Demográficos:</label>
                      <Input 
                        id="demographicsCD" 
                        placeholder="Ex: Homem, 55 anos, fumante, HAS, DM2" 
                        value={demographicsCD} 
                        onChange={(e) => setDemographicsCD(e.target.value)} 
                        disabled={isLoadingCD}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Inclua idade, sexo e comorbidades relevantes (opcional)</p>
                    </div>
                    <Button type="submit" disabled={isLoadingCD || !authIsLoaded} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white">
                      {isLoadingCD ? (
                        <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Gerando Perguntas...</>
                      ) : (
                        <><Lightbulb className="mr-2 h-4 w-4" /> Gerar Perguntas-Chave</>
                      )}
                    </Button>
                  </div>

                  {errorCD && (
                    <Alert variant="destructive" className="mt-4">
                      <HelpCircle className="h-4 w-4" />
                      <AlertTitle>Erro ao Gerar Perguntas</AlertTitle>
                      <AlertDescription>{errorCD}</AlertDescription>
                    </Alert>
                  )}
                  {isLoadingCD && <AnamnesisQuestionsSkeleton />}
                  {anamnesisQuestions && (
                    <div className="mt-6 p-4 border rounded-md bg-green-50 border-green-200 space-y-4">
                        <h4 className="text-lg font-semibold text-green-800">Perguntas Sugeridas por Dr. Corvus:</h4>

                        {/* Prioritized Questions */}
                        {anamnesisQuestions.prioritized_questions && anamnesisQuestions.prioritized_questions.length > 0 && (
                          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <h5 className="font-semibold text-yellow-800 mb-2 flex items-center">
                              <Star className="h-5 w-5 mr-2 text-yellow-500" /> Perguntas Prioritárias (faça PRIMEIRO)
                            </h5>
                            {anamnesisQuestions.questioning_rationale && (
                                <div className="text-xs text-yellow-700 mb-3 italic bg-yellow-100 p-2 rounded">
                                    💡 {anamnesisQuestions.questioning_rationale}
                                </div>
                            )}
                            <ul className="space-y-2">
                              {anamnesisQuestions.prioritized_questions.map((question, index) => (
                                <li key={`priority-${index}`} className="p-2 bg-yellow-100 rounded-md border-l-4 border-yellow-400">
                                  <p className="font-medium text-yellow-900">
                                    {index + 1}. {question}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Complementary Questions */}
                        {anamnesisQuestions.complementary_questions && anamnesisQuestions.complementary_questions.length > 0 && (
                          <div className="p-4 bg-sky-50 border border-sky-200 rounded-lg">
                            <h5 className="font-semibold text-sky-800 mb-2 flex items-center">
                              <PlusCircle className="h-5 w-5 mr-2 text-sky-500" /> Perguntas Complementares
                            </h5>
                            <div className="text-xs text-sky-700 mb-3">
                              Explore outras possibilidades e complete o quadro clínico com estas perguntas adicionais:
                            </div>
                            <ul className="space-y-2">
                              {anamnesisQuestions.complementary_questions.map((question, index) => (
                                <li key={`complementary-${index}`} className="p-2 bg-sky-100 rounded-md border-l-4 border-sky-400">
                                  <p className="font-medium text-sky-900">
                                    {question}
                                  </p>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Potential Systems to Explore */}
                        {anamnesisQuestions.potential_systems_to_explore && anamnesisQuestions.potential_systems_to_explore.length > 0 && (
                            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                                <h5 className="font-semibold text-purple-800 mb-2 flex items-center">
                                    <BrainCircuit className="h-5 w-5 mr-2 text-purple-500" /> Sistemas Potenciais a Explorar
                                </h5>
                                <div className="flex flex-wrap gap-2">
                                    {anamnesisQuestions.potential_systems_to_explore.map((system, index) => (
                                        <Badge key={`system-${index}`} variant="secondary" className="bg-purple-100 text-purple-800 border border-purple-200 text-sm font-normal">
                                            {system}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {(!anamnesisQuestions.prioritized_questions || anamnesisQuestions.prioritized_questions.length === 0) &&
                        (!anamnesisQuestions.complementary_questions || anamnesisQuestions.complementary_questions.length === 0) && (
                            <p className="text-sm text-green-600">Nenhuma pergunta específica gerada com base nos dados fornecidos.</p>
                        )}
                      </div>
                  )}
                  {!anamnesisQuestions && !isLoadingCD && !errorCD && (
                    <div className="mt-6 p-4 border rounded-md bg-sky-50 border-sky-200">
                        <div className="flex items-center">
                        <HelpCircle className="h-5 w-5 mr-2 text-sky-600" />
                        <h3 className="text-md font-semibold text-sky-700">Pronto para a anamnese guiada?</h3>
                        </div>
                        <p className="text-sm text-sky-600 mt-1">
                        Insira a queixa principal e dados demográficos para receber sugestões de perguntas-chave do Dr. Corvus.
                        </p>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter>
                <p className="text-xs text-muted-foreground italic">Esta ferramenta gera perguntas direcionadas para uma anamnese mais eficiente e focada.</p>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dica de Integração - Movida para antes dos próximos passos */}
      <div className="mt-12 p-6 border rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-sm">
        <div className="flex items-start">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
            <span className="text-lg">💡</span>
          </div>
          <div>
            <h5 className="font-bold text-amber-800 mb-2 text-lg">Dica de Integração</h5>
            <p className="text-sm text-amber-700 leading-relaxed">
              <strong>Conecte os conceitos:</strong> Use os qualificadores semânticos que você aprendeu aqui quando buscar evidências na MBE. 
              Seus illness scripts ajudarão na identificação de vieses no módulo de Metacognição. 
              E todas essas habilidades se integram perfeitamente no framework SNAPPS!
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 w-full font-medium"
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
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 w-full font-medium"
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
              <Link href="/clinical-simulation">
                <Button 
                  size="sm" 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 w-full font-medium"
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
            <Button variant="outline" className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600">
              <ArrowRight className="mr-2 h-4 w-4 transform rotate-180" /> Voltar para a Academia
            </Button>
          </Link>
      </div>

      {/* Disclaimer */}
      <Alert className="mt-8">
        <AlertDescription className="text-sm">
          <strong>Aviso Importante:</strong> As ferramentas de raciocínio diagnóstico são destinadas para fins educacionais e desenvolvimento do raciocínio clínico. 
          Sempre considere diretrizes clínicas, contexto do paciente e consulte supervisão médica apropriada na prática clínica real.
        </AlertDescription>
      </Alert>
    </div>
  );
} 