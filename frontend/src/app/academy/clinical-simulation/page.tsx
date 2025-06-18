"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { ArrowRight, MessageSquare, Users, CheckCircle, HelpCircle, Lightbulb, FileText, PlayCircle, User, Bot, ChevronRight, RefreshCw, Send, Target, ArrowUpRight, Brain, BookOpen, Zap, List } from "lucide-react";
import { IntegratedWorkflowCard, WorkflowStep } from '@/components/academy/IntegratedWorkflowCard';
import Link from "next/link";
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import ReactMarkdown from 'react-markdown';

// Placeholder visual para etapas não implementadas
function getVisualPlaceholderForStep(step: string) {
  return (
    <div className="text-gray-400 italic text-center p-4 border rounded bg-gray-50">
      Em breve <b>{step}</b>.
    </div>
  );
}

// Placeholder textual para Textarea
function getPlaceholderTextForStep(step: string) {
  return `Digite sua resposta para o passo ${step}...`;
}

// Helper function for difficulty border color
function getDifficultyBorderColor(difficulty: 'Básico' | 'Intermediário' | 'Avançado'): string {
  switch (difficulty) {
    case 'Básico':
      return 'border-l-green-500';
    case 'Intermediário':
      return 'border-l-yellow-500';
    case 'Avançado':
      return 'border-l-red-500';
    default:
      return 'border-l-gray-300'; 
  }
}

// Define this array BEFORE the ClinicalSimulationPage component
const snappsWorkflowSteps: WorkflowStep[] = [
  {
    id: 'select-case',
    title: '1. Selecione um Caso',
    description: 'Escolha um caso clínico da biblioteca para iniciar a simulação.',
    icon: PlayCircle,
  },
  {
    id: 'summarize-case',
    title: 'S - Sumarizar',
    description: 'Resume a história e achados relevantes do caso selecionado.',
    icon: FileText,
  },
  {
    id: 'narrow-ddx',
    title: 'N - Afunilar DDx',
    description: 'Apresente 2-3 diagnósticos diferenciais principais.',
    icon: Target,
  },
  {
    id: 'analyze-ddx',
    title: 'A - Analisar DDx',
    description: 'Analise e compare os diagnósticos diferenciais.',
    icon: Brain,
  },
  {
    id: 'probe-preceptor',
    title: 'P - Sondar Preceptor',
    description: 'Faça perguntas ao Dr. Corvus para esclarecer dúvidas.',
    icon: MessageSquare,
  },
  {
    id: 'plan-management',
    title: 'P - Planejar Manejo',
    description: 'Defina um plano de investigação e manejo para o paciente.',
    icon: List,
  },
  {
    id: 'select-learning',
    title: 'S - Selecionar Aprendizado',
    description: 'Selecione um tópico de aprendizado relacionado ao caso.',
    icon: BookOpen,
  },
];

// --- Simulation starter function ---
function startSimulation(clinicalCase: typeof sampleCases[0]) {
  // TODO: Replace with routing or simulation logic
  console.log('Iniciando simulação para o caso:', clinicalCase);
}

// Define interfaces for SNAPPS framework
interface SNAPPSStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  userInput?: string;
  response?: string;
}

// Interfaces melhoradas para outputs BAML de cada step
interface SnappsAnalysisOutput {
  response: string;
}

interface SummaryFeedbackOutput {
  feedback_strengths: string[];
  feedback_improvements: string[];
  missing_elements: string[];
  overall_assessment: string;
  next_step_guidance: string;
  socratic_questions: string[];
  disclaimer: string;
}

interface DifferentialAnalysisOutput {
  ddx_evaluation: {
    diagnosis: string;
    plausibility: 'Alta' | 'Moderada' | 'Baixa';
    supporting_findings: string[];
    contradicting_findings: string[];
  }[];
  missing_differentials: string[];
  prioritization_feedback: string;
  socratic_questions: string[];
  next_step_guidance: string;
  disclaimer: string;
}

interface ProbeResponseOutput {
  answers_to_questions: { question: string; answer: string; rationale: string; }[];
  additional_considerations: string[];
  counter_questions: string[];
  knowledge_gaps_identified: string[];
  learning_resources: string[];
  disclaimer: string;
}

interface PlanEvaluationOutput {
  plan_strengths: string[];
  plan_gaps: string[];
  investigation_priorities: string[];
  management_considerations: string[];
  safety_concerns: string[];
  cost_effectiveness_notes: string[];
  guidelines_alignment: string;
  next_step_guidance: string;
  disclaimer: string;
}

interface SessionSummaryOutput {
  overall_performance: string;
  key_strengths: string[];
  areas_for_development: string[];
  learning_objectives_met: string[];
  recommended_study_topics: string[];
  metacognitive_insights: string[];
  next_cases_suggestions: string[];
  disclaimer: string;
}

interface ClinicalCase {
  id: string;
  title: string;
  brief: string;
  fullDescription: string;
  demographics: string;
  chiefComplaint: string;
  presentingHistory: string;
  physicalExam: string;
  vitalSigns: string;
  difficulty: 'Básico' | 'Intermediário' | 'Avançado';
  expectedDifferentials?: string[];
  learningObjectives?: string[];
  expertAnalysis?: {
    keyFindings: string[];
    redFlags: string[];
    workupPriority: string[];
  };
}

const snappsFrameworkSteps = [
  {
    value: "step-1",
    title: "S - Summarize (Resumir)",
    description: "O estudante resume a história e os achados relevantes do caso de forma concisa e organizada.",
    tools: ["Avaliação da clareza pelo Dr. Corvus", "Uso de termos médicos adequados"]
  },
  {
    value: "step-2",
    title: "N - Narrow (Restringir)",
    description: "O estudante apresenta 2-3 diagnósticos diferenciais principais (DDx) baseados no resumo.",
    tools: ["Dr. Corvus questiona a priorização e lógica via AnalyzeDifferentialDiagnoses_SNAPPS"]
  },
  {
    value: "step-3",
    title: "A - Analyze (Analisar)",
    description: "O estudante analisa os DDx, comparando e contrastando os achados do caso que suportam ou refutam cada um.",
    tools: ["Dr. Corvus facilita a comparação, pedindo justificativas"]
  },
  {
    value: "step-4",
    title: "P - Probe (Sondar o Preceptor)",
    description: "O estudante faz perguntas ao Dr. Corvus sobre o caso, o DDx, ou lacunas no seu conhecimento.",
    tools: ["Dr. Corvus responde usando conhecimento médico especializado"]
  },
  {
    value: "step-5",
    title: "P - Plan (Planejar)",
    description: "O estudante define um plano de investigação e manejo para o paciente.",
    tools: ["Dr. Corvus pode pedir o racional e compará-lo com diretrizes"]
  },
  {
    value: "step-6",
    title: "S - Select (Selecionar um Tópico)",
    description: "O estudante identifica um tópico de aprendizado relevante que surgiu durante o caso.",
    tools: ["Dr. Corvus pode sugerir leituras ou outros módulos da Academia"]
  }
];

// Biblioteca de casos clínicos predefinidos
const sampleCases: ClinicalCase[] = [
  {
    id: 'case-1',
    title: 'Dor Torácica Aguda',
    brief: 'Homem, 52 anos, dor torácica opressiva há 2h',
    fullDescription: 'Paciente masculino, 52 anos, tabagista, hipertenso, procura o pronto-socorro com quadro de dor torácica opressiva, de início súbito há 2 horas, irradiando para braço esquerdo e mandíbula.',
    demographics: 'Homem, 52 anos, tabagista (20 maços/ano), hipertensão arterial em uso de losartana',
    chiefComplaint: 'Dor no peito há 2 horas',
    presentingHistory: 'Dor torácica opressiva, 8/10, início súbito durante atividade física leve, irradia para braço esquerdo e mandíbula, associada a sudorese fria e náusea. Nega dispneia ou síncope.',
    physicalExam: 'Paciente ansioso, sudoreico. Ausculta cardíaca: ritmo regular, bulhas normofonéticas, sem sopros. Ausculta pulmonar: murmúrio vesicular presente bilateralmente.',
    vitalSigns: 'PA: 160/100 mmHg, FC: 95 bpm, FR: 20 irpm, Sat O2: 98% (ar ambiente), Temp: 36.5°C',
    difficulty: 'Intermediário',
    expectedDifferentials: [
      'Infarto Agudo do Miocárdio',
      'Angina Instável',
      'Embolia Pulmonar',
      'Dissecção Aórtica',
      'Pericardite'
    ],
    learningObjectives: [
      'Reconhecer apresentação típica de síndrome coronariana aguda',
      'Avaliar fatores de risco cardiovascular',
      'Priorizar investigações urgentes',
      'Aplicar protocolos de dor torácica'
    ],
    expertAnalysis: {
      keyFindings: [
        'Dor típica de isquemia miocárdica',
        'Fatores de risco: tabagismo, HAS, sexo masculino, idade',
        'Sinais autonômicos: sudorese, náusea',
        'Hipertensão reativa ao stress/dor'
      ],
      redFlags: [
        'Dor irradiando para braço e mandíbula',
        'Início súbito durante esforço',
        'Sinais autonômicos presentes',
        'Múltiplos fatores de risco cardiovascular'
      ],
      workupPriority: [
        'ECG de 12 derivações urgente',
        'Troponina seriada',
        'Radiografia de tórax',
        'Acesso venoso e monitorização cardíaca'
      ]
    }
  },
  {
    id: 'case-2',
    title: 'Dispneia Progressiva',
    brief: 'Mulher, 68 anos, falta de ar aos esforços há 3 semanas',
    fullDescription: 'Paciente feminina, 68 anos, ex-tabagista, com história de DPOC, apresenta dispneia progressiva aos esforços nas últimas 3 semanas, evoluindo para dispneia de repouso.',
    demographics: 'Mulher, 68 anos, ex-tabagista (40 maços/ano, parou há 5 anos), DPOC diagnosticada, aposentada',
    chiefComplaint: 'Falta de ar que tem piorado',
    presentingHistory: 'Dispneia progressiva iniciada há 3 semanas, inicialmente aos grandes esforços, agora presente ao repouso. Tosse seca ocasional, nega febre ou produção de escarro. Relata edema em membros inferiores há 1 semana.',
    physicalExam: 'Paciente em regular estado geral, taquipneica. Ausculta pulmonar: diminuição do murmúrio vesicular em bases, sem ruídos adventícios. Ausculta cardíaca: taquicardia, B3 presente. Edema 2+/4+ em MMII.',
    vitalSigns: 'PA: 110/70 mmHg, FC: 110 bpm, FR: 28 irpm, Sat O2: 92% (ar ambiente), Temp: 36.2°C',
    difficulty: 'Avançado',
    expectedDifferentials: [
      'Insuficiência Cardíaca Descompensada',
      'Exacerbação de DPOC',
      'Embolia Pulmonar',
      'Pneumonia',
      'Cor Pulmonale'
    ],
    learningObjectives: [
      'Diferenciar causas cardíacas vs pulmonares de dispneia',
      'Reconhecer sinais de insuficiência cardíaca',
      'Avaliar progressão de doença crônica',
      'Integrar achados clínicos complexos'
    ],
    expertAnalysis: {
      keyFindings: [
        'Dispneia progressiva com padrão de evolução',
        'B3 presente sugerindo IC',
        'Edema periférico bilateral',
        'Hipoxemia leve',
        'História de DPOC prévia'
      ],
      redFlags: [
        'Dispneia de repouso',
        'Evolução progressiva rápida',
        'Sinais de congestão sistêmica',
        'Dessaturação ao ar ambiente'
      ],
      workupPriority: [
        'BNP ou NT-proBNP',
        'Ecocardiograma',
        'Radiografia de tórax',
        'Gasometria arterial',
        'Hemograma e bioquímica'
      ]
    }
  },
  {
    id: 'case-3',
    title: 'Cefaleia Intensa',
    brief: 'Mulher, 35 anos, dor de cabeça súbita e intensa',
    fullDescription: 'Paciente feminina, 35 anos, hígida, apresenta cefaleia de início súbito, de forte intensidade, descrita como "a pior dor de cabeça da vida".',
    demographics: 'Mulher, 35 anos, saudável, professora, sem medicações habituais',
    chiefComplaint: 'Dor de cabeça muito forte que começou de repente',
    presentingHistory: 'Cefaleia súbita há 4 horas, 10/10, holocraniana, sem fatores desencadeantes identificados. Associada a náusea, vômito e fotofobia. Nega trauma, febre ou sinais neurológicos focais.',
    physicalExam: 'Paciente em sofrimento devido à dor, fotofóbica. Sinais vitais estáveis. Exame neurológico: consciente, orientada, pupilas isocóricas e fotorreagentes, sem déficits motores ou sensitivos. Sinais meníngeos negativos.',
    vitalSigns: 'PA: 140/85 mmHg, FC: 88 bpm, FR: 18 irpm, Sat O2: 99% (ar ambiente), Temp: 36.8°C',
    difficulty: 'Básico',
    expectedDifferentials: [
      'Hemorragia Subaracnóidea',
      'Enxaqueca Severa',
      'Meningite',
      'Cefaleia Tensional Severa',
      'Hipertensão Intracraniana'
    ],
    learningObjectives: [
      'Reconhecer red flags em cefaleia aguda',
      'Diferenciar cefaleia primária vs secundária',
      'Aplicar investigação apropriada para cefaleia em trovoada',
      'Avaliar necessidade de neuroimagem urgente'
    ],
    expertAnalysis: {
      keyFindings: [
        'Cefaleia "em trovoada" - início súbito',
        'Intensidade máxima descrita pelo paciente',
        'Sintomas associados: náusea, vômito, fotofobia',
        'Ausência de sinais meníngeos (ainda)',
        'Paciente jovem previamente hígida'
      ],
      redFlags: [
        'Início súbito ("pior cefaleia da vida")',
        'Intensidade 10/10',
        'Primeiro episódio em paciente jovem',
        'Náusea e vômito associados'
      ],
      workupPriority: [
        'TC de crânio urgente sem contraste',
        'Se TC normal: punção lombar',
        'Analgesia adequada',
        'Avaliação neurológica seriada'
      ]
    }
  }
];

export default function ClinicalSimulationPage() {
  const { getToken, isLoaded: authIsLoaded } = useAuth();
    // Estado principal da simulação
  const [activeView, setActiveView] = useState<'overview' | 'simulation'>('overview');
  const [selectedCase, setSelectedCase] = useState<ClinicalCase | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [snappsSteps, setSnappsSteps] = useState<SNAPPSStep[]>([
    { id: 'summarize', title: 'S - Summarize', description: 'Resume a história e achados relevantes', completed: false },
    { id: 'narrow', title: 'N - Narrow', description: 'Apresente 2-3 diagnósticos diferenciais principais', completed: false },
    { id: 'analyze', title: 'A - Analyze', description: 'Analise e compare os diagnósticos diferenciais', completed: false },
    { id: 'probe', title: 'P - Probe', description: 'Faça perguntas ao Dr. Corvus', completed: false },
    { id: 'plan', title: 'P - Plan', description: 'Defina um plano de investigação e manejo', completed: false },
    { id: 'select', title: 'S - Select', description: 'Selecione um tópico de aprendizado', completed: false }
  ]);
  
  // Estado para inputs do usuário
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepLoadingStates, setStepLoadingStates] = useState<Record<number, boolean>>({});
  const [showSubmitSuccess, setShowSubmitSuccess] = useState(false);
  const [activeSnappsWorkflowStep, setActiveSnappsWorkflowStep] = useState<string>(snappsWorkflowSteps[0].id);
  const [completedSnappsWorkflowSteps, setCompletedSnappsWorkflowSteps] = useState<string[]>([]);
  
  // Estado para ddx específico (usado no step 2)
  const [differentialDiagnoses, setDifferentialDiagnoses] = useState<string[]>(['', '', '']);
  
  // Estado para contexto da sessão (para passar entre steps)
  const [sessionContext, setSessionContext] = useState<{
    summary?: string;
    differentials?: string[];
    analysis?: string;
    probeQuestions?: string;
    plan?: string;
  }>({});
  
  // Referência para scroll automático
  const responseRef = useRef<HTMLDivElement>(null);

  // Auto-scroll quando uma resposta é recebida
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [snappsSteps]);
  
  if (!authIsLoaded) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-12">
        <section className="text-center py-10 academy-gradient-header rounded-xl border border-primary/20 shadow-lg">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center justify-center mb-4">
            <RefreshCw className="h-10 w-10 md:h-12 md:w-12 mr-3 text-white animate-spin" />
            Simulação Clínica Integrada
          </h1>
          <p className="mt-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            Carregando o ambiente de simulação clínica...
          </p>
        </section>
        {/* Placeholder for 7 tabs */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-300 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }


  const startSimulation = (clinicalCase: ClinicalCase) => {
    setSelectedCase(clinicalCase);
    setCurrentStep(0);
    setActiveView('simulation');
    // Reset todos os steps
    setSnappsSteps(prev => prev.map(step => ({ ...step, completed: false, userInput: '', response: '' })));
    setCurrentInput('');
    setDifferentialDiagnoses(['', '', '']);
    setSessionContext({});
    setError(null);
  };

  const setStepLoading = (stepIndex: number, isLoading: boolean) => {
    setStepLoadingStates(prev => ({
      ...prev,
      [stepIndex]: isLoading
    }));
  };

  const handleStepSubmit = async (stepIndex: number) => {
    if (!selectedCase || !authIsLoaded) return;
    
    setStepLoading(stepIndex, true);
    setError(null);

    const token = await getToken();
    if (!token) {
      setError('Erro de autenticação. Faça login novamente.');
      setStepLoading(stepIndex, false);
      return;
    }

    try {
      let response;
      let updatedSessionContext = { ...sessionContext };

      switch (stepIndex) {
        case 0: { // S - Summarize
          const payload = {
            case_description: `${selectedCase.fullDescription} ${selectedCase.presentingHistory}`,
            student_summary: currentInput,
            case_context: {
              demographics: selectedCase.demographics,
              chief_complaint: selectedCase.chiefComplaint,
              physical_exam: selectedCase.physicalExam,
              vital_signs: selectedCase.vitalSigns
            }
          };

          response = await fetch('/api/clinical-assistant/evaluate-summary-snapps', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }

          const summaryData: SummaryFeedbackOutput = await response.json();
          
          updatedSessionContext.summary = currentInput;
          setSessionContext(updatedSessionContext);

            const updatedSteps = [...snappsSteps];
            updatedSteps[stepIndex] = {
              ...updatedSteps[stepIndex],
              completed: true,
              userInput: currentInput,
            response: formatSummaryResponse(summaryData)
            };
            setSnappsSteps(updatedSteps);
            setShowSubmitSuccess(true);
            setTimeout(() => setShowSubmitSuccess(false), 2000);
            setCurrentStep(1);
            setCurrentInput('');
          break;
        }

        case 1: { // N - Narrow - DDx
          const validDdx = differentialDiagnoses.filter(dx => dx.trim() !== '');
          if (validDdx.length < 2) {
            setError('Por favor, insira pelo menos 2 diagnósticos diferenciais.');
            setStepLoading(stepIndex, false);
            return;
          }

          const payload = {
            case_summary: updatedSessionContext.summary || selectedCase.fullDescription,
            student_differential_diagnoses: validDdx,
            case_context: {
              expected_differentials: selectedCase.expectedDifferentials || [],
              learning_objectives: selectedCase.learningObjectives || []
            }
          };

          response = await fetch('/api/clinical-assistant/analyze-differential-diagnoses-snapps', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }

          const ddxData: DifferentialAnalysisOutput = await response.json();
          
          updatedSessionContext.differentials = validDdx;
          setSessionContext(updatedSessionContext);

          const updatedSteps = [...snappsSteps];
          updatedSteps[stepIndex] = {
            ...updatedSteps[stepIndex],
            completed: true,
            userInput: validDdx.join(', '),
            response: formatDifferentialResponse(ddxData)
          };
          setSnappsSteps(updatedSteps);
          setShowSubmitSuccess(true);
          setTimeout(() => setShowSubmitSuccess(false), 2000);
          setCurrentStep(2);
          setDifferentialDiagnoses(['', '', '']);
          break;
        }

        case 2: { // A - Analyze
          const payload = {
            case_summary: updatedSessionContext.summary || selectedCase.fullDescription,
            differential_diagnoses: updatedSessionContext.differentials || [],
            student_analysis: currentInput,
            case_context: {
              expert_analysis: selectedCase.expertAnalysis
            }
          };

          response = await fetch('/api/clinical-assistant/facilitate-ddx-analysis-snapps', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }

          const analysisData = await response.json();
          
          updatedSessionContext.analysis = currentInput;
          setSessionContext(updatedSessionContext);

            const updatedSteps = [...snappsSteps];
            updatedSteps[stepIndex] = {
              ...updatedSteps[stepIndex],
              completed: true,
              userInput: currentInput,
            response: analysisData.response
            };
            setSnappsSteps(updatedSteps);
          setShowSubmitSuccess(true);
          setTimeout(() => setShowSubmitSuccess(false), 2000);
          setCurrentStep(3);
          setCurrentInput('');
          break;
        }

        case 3: { // P - Probe
          const payload = {
            case_summary: updatedSessionContext.summary || selectedCase.fullDescription,
            session_context: updatedSessionContext,
            student_questions: currentInput,
            case_data: selectedCase
          };

          response = await fetch('/api/clinical-assistant/answer-probe-questions-snapps', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }

          const probeData: ProbeResponseOutput = await response.json();
          
          updatedSessionContext.probeQuestions = currentInput;
          setSessionContext(updatedSessionContext);

          const updatedSteps = [...snappsSteps];
          updatedSteps[stepIndex] = {
            ...updatedSteps[stepIndex],
            completed: true,
            userInput: currentInput,
            response: formatProbeResponse(probeData)
          };
          setSnappsSteps(updatedSteps);
          setShowSubmitSuccess(true);
          setTimeout(() => setShowSubmitSuccess(false), 2000);
          setCurrentStep(4);
            setCurrentInput('');
          break;
      }

        case 4: { // P - Plan
          const payload = {
            case_summary: updatedSessionContext.summary || selectedCase.fullDescription,
            session_context: updatedSessionContext,
            student_plan: currentInput,
            case_data: selectedCase
          };

          response = await fetch('/api/clinical-assistant/evaluate-management-plan-snapps', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
        }

          const planData: PlanEvaluationOutput = await response.json();
          
          updatedSessionContext.plan = currentInput;
          setSessionContext(updatedSessionContext);
        
        const updatedSteps = [...snappsSteps];
        updatedSteps[stepIndex] = {
          ...updatedSteps[stepIndex],
          completed: true,
            userInput: currentInput,
            response: formatPlanResponse(planData)
        };
        setSnappsSteps(updatedSteps);
          setShowSubmitSuccess(true);
          setTimeout(() => setShowSubmitSuccess(false), 2000);
          setCurrentStep(5);
          setCurrentInput('');
          break;
        }

        case 5: { // S - Select
          const payload = {
            full_session_context: updatedSessionContext,
            student_selected_topic: currentInput,
            case_data: selectedCase,
            session_history: snappsSteps
          };

          response = await fetch('/api/clinical-assistant/provide-session-summary-snapps', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error(`Erro na API: ${response.status}`);
          }

          const summaryData: SessionSummaryOutput = await response.json();

          const updatedSteps = [...snappsSteps];
          updatedSteps[stepIndex] = {
            ...updatedSteps[stepIndex],
            completed: true,
            userInput: currentInput,
            response: formatSessionSummary(summaryData)
          };
          setSnappsSteps(updatedSteps);
          setShowSubmitSuccess(true);
          setTimeout(() => setShowSubmitSuccess(false), 2000);
          setCurrentInput('');
          break;
        }

        default:
          throw new Error('Step não implementado');
      }

    } catch (err) {
      console.error('Erro no step SNAPPS:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido na análise');
    } finally {
      setStepLoading(stepIndex, false);
    }
  };

  // Funções de formatação de resposta
  const formatSummaryResponse = (data: SummaryFeedbackOutput): string => {
    return `**Dr. Corvus - Feedback sobre seu Resumo:**

**Pontos Fortes:**
${data.feedback_strengths.map(item => `• ${item}`).join('\n')}

**Áreas para Melhorar:**
${data.feedback_improvements.map(item => `• ${item}`).join('\n')}

${data.missing_elements.length > 0 ? `**Elementos Importantes Ausentes:**
${data.missing_elements.map(item => `• ${item}`).join('\n')}

` : ''}**Avaliação Geral:** ${data.overall_assessment}

**Perguntas Socráticas para Reflexão:**
${data.socratic_questions.map(q => `• ${q}`).join('\n')}

**Próximo Passo:** ${data.next_step_guidance}`;
  };

  const formatDifferentialResponse = (data: DifferentialAnalysisOutput): string => {
    let response = `**Dr. Corvus - Análise dos seus Diagnósticos Diferenciais:**

**Avaliação dos seus Diagnósticos:**
`;
    
    data.ddx_evaluation.forEach(ddx => {
      response += `
**${ddx.diagnosis}** (Plausibilidade: ${ddx.plausibility})
- Achados que suportam: ${ddx.supporting_findings.join(', ')}
- Achados que contradizem: ${ddx.contradicting_findings.join(', ')}
`;
    });

    if (data.missing_differentials.length > 0) {
      response += `
**Diagnósticos que você pode ter perdido:**
${data.missing_differentials.map(d => `• ${d}`).join('\n')}
`;
    }

    response += `
**Feedback sobre Priorização:** ${data.prioritization_feedback}

**Perguntas Socráticas:**
${data.socratic_questions.map(q => `• ${q}`).join('\n')}

**Próximo Passo:** ${data.next_step_guidance}`;

    return response;
  };

  const formatProbeResponse = (data: ProbeResponseOutput): string => {
    let response = `**Dr. Corvus - Respostas às suas Perguntas:**

`;
    
    data.answers_to_questions.forEach(item => {
      response += `**Pergunta:** ${item.question}
**Resposta:** ${item.answer}
**Rationale:** ${item.rationale}

`;
    });

    if (data.additional_considerations.length > 0) {
      response += `**Considerações Adicionais:**
${data.additional_considerations.map(c => `• ${c}`).join('\n')}

`;
    }

    if (data.counter_questions.length > 0) {
      response += `**Perguntas para Você Refletir:**
${data.counter_questions.map(q => `• ${q}`).join('\n')}

`;
    }

    if (data.knowledge_gaps_identified.length > 0) {
      response += `**Lacunas de Conhecimento Identificadas:**
${data.knowledge_gaps_identified.map(gap => `• ${gap}`).join('\n')}

`;
    }

    if (data.learning_resources.length > 0) {
      response += `**Recursos de Aprendizado Sugeridos:**
${data.learning_resources.map(resource => `• ${resource}`).join('\n')}`;
    }

    return response;
  };

  const formatPlanResponse = (data: PlanEvaluationOutput): string => {
    return `**Dr. Corvus - Avaliação do seu Plano:**

**Pontos Fortes do Plano:**
${data.plan_strengths.map(item => `• ${item}`).join('\n')}

${data.plan_gaps.length > 0 ? `**Lacunas Identificadas:**
${data.plan_gaps.map(item => `• ${item}`).join('\n')}

` : ''}**Prioridades de Investigação:**
${data.investigation_priorities.map(item => `• ${item}`).join('\n')}

**Considerações de Manejo:**
${data.management_considerations.map(item => `• ${item}`).join('\n')}

${data.safety_concerns.length > 0 ? `**Questões de Segurança:**
${data.safety_concerns.map(item => `• ${item}`).join('\n')}

` : ''}**Alinhamento com Diretrizes:** ${data.guidelines_alignment}

**Próximo Passo:** ${data.next_step_guidance}`;
  };

  const formatSessionSummary = (data: SessionSummaryOutput): string => {
    return `** Parabéns! Simulação SNAPPS Concluída**

**Dr. Corvus - Resumo da sua Performance:**

**Avaliação Geral:** ${data.overall_performance}

**Seus Pontos Fortes:**
${data.key_strengths.map(item => `• ${item}`).join('\n')}

**Áreas para Desenvolvimento:**
${data.areas_for_development.map(item => `• ${item}`).join('\n')}

**Objetivos de Aprendizado Alcançados:**
${data.learning_objectives_met.map(item => `• ${item}`).join('\n')}

**Tópicos Recomendados para Estudo:**
${data.recommended_study_topics.map(item => `• ${item}`).join('\n')}

**Insights Metacognitivos:**
${data.metacognitive_insights.map(item => `• ${item}`).join('\n')}

**Próximos Casos Sugeridos:**
${data.next_cases_suggestions.map(item => `• ${item}`).join('\n')}

Excelente trabalho! Continue praticando para aprimorar suas habilidades de raciocínio clínico.`;
  };

  const resetSimulation = () => {
    setActiveView('overview');
    setSelectedCase(null);
    setCurrentStep(0);
    setSnappsSteps(prev => prev.map(step => ({ ...step, completed: false, userInput: '', response: '' })));
    setCurrentInput('');
    setDifferentialDiagnoses(['', '', '']);
    setSessionContext({});
    setError(null);
  };

  if (activeView === 'simulation' && selectedCase) {
    // Icon mapping for SNAPPS steps
    const snappStepIconMap: Record<string, React.ElementType> = {
      summarize: List,
      narrow: Users,
      analyze: Brain,
      probe: HelpCircle,
      plan: Zap,
      select: BookOpen,
    };

    const currentWorkflowSteps: WorkflowStep[] = snappsSteps.map(step => ({
      id: step.id,
      title: step.title,
      description: step.description,
      icon: snappStepIconMap[step.id] || Lightbulb, // Fallback icon
    }));

    return (
      <div className="container mx-auto p-4 md:p-8 space-y-6">
        {/* Header da simulação */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Simulação SNAPPS em Andamento</h1>
            <p className="text-muted-foreground">Caso: {selectedCase.title}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="default" onClick={resetSimulation}>
              Novo Caso
            </Button>
            <Button variant="default" onClick={() => setActiveView('overview')}>
              Visão Geral
            </Button>
          </div>
        </div>

        {/* Integrated Workflow Card for SNAPPS */}
        <div className="mb-6"> {/* Wrapper div for margin */}
          <IntegratedWorkflowCard
            title="Simulação Clínica SNAPPS"
            subtitle="Siga os passos para analisar o caso clínico e desenvolver seu raciocínio."
            mainIcon={PlayCircle}
            steps={currentWorkflowSteps}
            activeStepId={snappsSteps[currentStep]?.id}
            completedSteps={snappsSteps.filter(s => s.completed).map(s => s.id)}
            onStepClick={(stepId) => {
              // SNAPPS progression is linear via the 'Enviar Resposta' button.
              // This click handler is mostly for potential future use or consistency.
              console.log("Workflow step clicked:", stepId);
            }}
            themeColorName="blue"
            totalSteps={snappsSteps.length}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Informações do caso */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Informações do Caso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm">Demografia</h4>
                <p className="text-sm text-muted-foreground">{selectedCase.demographics}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Queixa Principal</h4>
                <p className="text-sm text-muted-foreground">{selectedCase.chiefComplaint}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm">História</h4>
                <p className="text-sm text-muted-foreground">{selectedCase.presentingHistory}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Exame Físico</h4>
                <p className="text-sm text-muted-foreground">{selectedCase.physicalExam}</p>
              </div>
              <div>
                <h4 className="font-semibold text-sm">Sinais Vitais</h4>
                <p className="text-sm text-muted-foreground">{selectedCase.vitalSigns}</p>
              </div>
            </CardContent>
          </Card>

          {/* Área de trabalho */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step atual */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white mr-3 font-bold">
                    {snappsSteps[currentStep]?.title.charAt(0)}
                  </span>
                  {snappsSteps[currentStep]?.title}
                </CardTitle>
                <CardDescription>
                  {snappsSteps[currentStep]?.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {currentStep === 1 ? (
                  // Interface especial para diagnósticos diferenciais
                  <div className="space-y-4">
                    <label className="text-sm font-medium">Seus 3 principais diagnósticos diferenciais:</label>
                    {differentialDiagnoses.map((dx, index) => (
                      <div key={index} className="space-y-1">
                        <label className="text-xs text-muted-foreground">Diagnóstico {index + 1}:</label>
                        <Input
                          value={dx}
                          onChange={(e) => {
                            const newDx = [...differentialDiagnoses];
                            newDx[index] = e.target.value;
                            setDifferentialDiagnoses(newDx);
                          }}
                          placeholder={`Ex: ${index === 0 ? 'Infarto agudo do miocárdio' : index === 1 ? 'Angina instável' : 'Embolia pulmonar'}`}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  // Interface padrão para outros steps
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sua resposta:</label>
                    <Textarea
                      value={currentInput}
                      onChange={(e) => setCurrentInput(e.target.value)}
                      placeholder={getPlaceholderTextForStep(snappsSteps[currentStep]?.title || `Passo ${currentStep + 1}`)}
                      className="min-h-[120px]"
                    />
                  </div>
                )}

                {error && (
                  <Alert variant="destructive">
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  onClick={() => handleStepSubmit(currentStep)}
                  disabled={stepLoadingStates[currentStep] || showSubmitSuccess || (currentStep !== 1 && !currentInput.trim()) || (currentStep === 1 && differentialDiagnoses.filter(dx => dx.trim()).length < 2)}
                  className="w-full"
                >
                  {stepLoadingStates[currentStep] ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Dr. Corvus está analisando...
                    </>
                  ) : showSubmitSuccess ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                      Enviado!
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Resposta
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Histórico de respostas */}
            {snappsSteps.some(step => step.completed) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Histórico da Sessão
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {snappsSteps.filter(step => step.completed).map((step, index) => (
                    <div key={step.id} className="space-y-3" ref={index === snappsSteps.filter(s => s.completed).length - 1 ? responseRef : undefined}>
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="font-semibold text-sm">{step.title}</span>
                      </div>
                      <div className="ml-6 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm">{step.userInput}</p>
                      </div>
                      
                      <div className="flex items-center">
                        <Bot className="h-4 w-4 mr-2 text-green-500" />
                        <span className="font-semibold text-sm">Dr. Corvus</span>
                      </div>
                      <div className="ml-6 p-3 bg-green-50 rounded-md">
                        <div className="text-sm prose prose-blue max-w-none">
                          <ReactMarkdown>{step.response}</ReactMarkdown>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Vista de visão geral (interface original + seleção de casos)
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-12">
      {/* Updated Header Section */}
      <section className="text-center py-10 academy-gradient-header rounded-xl border border-primary/20 shadow-lg">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center justify-center mb-4">
          <Users className="h-16 w-16 md:h-16 md:w-16 ml-8 mr-0 text-white" />
          Simulação Clínica Integrada (Framework SNAPPS)
        </h1>
        <p className="mt-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
          Pratique o processo diagnóstico completo de forma estruturada e receba feedback iterativo.
        </p>
      </section>

      <Tabs defaultValue="simulator" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 gap-2 bg-cyan-50 p-1 rounded-lg border border-cyan-200">
          <TabsTrigger value="simulator" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-cyan-100 data-[state=inactive]:text-cyan-700 rounded-md px-3 py-2 text-sm font-medium transition-all">Simulador Interativo</TabsTrigger>
          <TabsTrigger value="framework" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-cyan-100 data-[state=inactive]:text-cyan-700 rounded-md px-3 py-2 text-sm font-medium transition-all">Sobre o Framework</TabsTrigger>
        </TabsList>

        <TabsContent value="simulator" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PlayCircle className="h-6 w-6 mr-2 text-blue-600" />
                Escolha um Caso Clínico
              </CardTitle>
              <CardDescription>
                Selecione um caso da nossa biblioteca para iniciar sua simulação SNAPPS com o Dr. Corvus.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sampleCases.map((clinicalCase) => (
                  <Card 
                    key={clinicalCase.id} 
                    className={`cursor-pointer hover:shadow-lg transition-shadow duration-300 border-2 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75 rounded-lg overflow-hidden border-l-4 ${getDifficultyBorderColor(clinicalCase.difficulty)}`}
                    onClick={() => startSimulation(clinicalCase)}
                    tabIndex={0}
                    onKeyPress={(e) => { if (e.key === 'Enter' || e.key === ' ') startSimulation(clinicalCase); }}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{clinicalCase.title}</CardTitle>
                        <Badge variant={clinicalCase.difficulty === 'Básico' ? 'secondary' : clinicalCase.difficulty === 'Intermediário' ? 'default' : 'destructive'}>
                          {clinicalCase.difficulty}
                        </Badge>
                      </div>
                      <CardDescription>{clinicalCase.brief}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4">{clinicalCase.fullDescription}</p>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        onClick={() => startSimulation(clinicalCase)}
                        className="w-full"
                      >
                        <PlayCircle className="mr-2 h-4 w-4" />
                        Iniciar Simulação
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
    
        <TabsContent value="framework">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-6 w-6 mr-2 text-blue-600" />
                Framework SNAPPS
              </CardTitle>
              <CardDescription>
                Entenda como funciona o framework SNAPPS para apresentação de casos clínicos e receba feedback iterativo do Dr. Corvus.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-center">As 6 Etapas do SNAPPS</h3>
                <Accordion type="single" className="w-full">
                  {snappsFrameworkSteps.map((step, index) => (
                    <AccordionItem value={step.value} key={index}>
                      <AccordionTrigger className="text-lg hover:no-underline">
                        <div className="flex items-center">
                          <span className={`flex items-center justify-center h-8 w-8 rounded-full bg-blue-500 text-white mr-3 font-bold text-md`}>{step.title.charAt(0)}</span>
                          {step.title}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pl-12 pr-4 pb-4">
                        <p className="text-muted-foreground mb-2">{step.description}</p>
                        <h4 className="font-medium text-sm mb-1">Ferramentas/Interação com Dr. Corvus:</h4>
                        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                          {step.tools.map((tool: string, i: number) => <li key={i}>{tool}</li>)}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
          
              <div className="mt-8 p-4 border rounded-md bg-sky-50 border-sky-200">
                <div className="flex items-center">
                    <Lightbulb className="h-5 w-5 mr-2 text-sky-600" />
                    <h3 className="text-md font-semibold text-sky-700">Como Funciona a Simulação</h3>
                </div>
                <p className="text-sm text-sky-600 mt-1">
                  A interface de simulação permite que você trabalhe cada etapa do SNAPPS de forma interativa. Dr. Corvus, utilizando ferramentas especializadas fornece feedback socrático e respostas contextuais para guiar seu aprendizado.
                </p>
                <ul className="text-xs text-sky-600 mt-2 space-y-1">
                  <li>• <strong>Feedback em tempo real:</strong> Cada submissão é analisada pelo Dr. Corvus</li>
                  <li>• <strong>Abordagem socrática:</strong> Perguntas que estimulam o pensamento crítico</li>
                  <li>• <strong>Progressão estruturada:</strong> Avance apenas após completar cada etapa</li>
                  <li>• <strong>Histórico completo:</strong> Revise toda a conversa com o Dr. Corvus</li>
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex-col items-start space-y-2">
                <p className="text-xs text-muted-foreground italic">Feedback contínuo e perguntas socráticas são fornecidas pelo Dr. Corvus em cada etapa.</p>
            </CardFooter>
        </Card>
        </TabsContent>
      </Tabs>

      {/* Recursos Adicionais */}
      <section className="mt-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Recursos Adicionais</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Users className="h-5 w-5 mr-2 text-blue-500" />
                Biblioteca de Casos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Casos clínicos estruturados com diferentes níveis de complexidade e feedback especializado.
              </p>
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">Básico</Badge>
                <Badge variant="outline" className="text-xs">Intermediário</Badge>
                <Badge variant="outline" className="text-xs">Avançado</Badge>
              </div>
              <Button variant="default" size="sm" disabled className="mt-4">
                <ArrowRight className="h-4 w-4 mr-2" />
                Expansão em Breve
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Target className="h-5 w-5 mr-2 text-green-500" />
                Análise de Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Relatórios detalhados sobre seu progresso nas competências SNAPPS e áreas de melhoria.
              </p>
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">Raciocínio Clínico</Badge>
                <Badge variant="outline" className="text-xs">Diagnóstico Diferencial</Badge>
                <Badge variant="outline" className="text-xs">Plano Terapêutico</Badge>
              </div>
              <Button variant="default" size="sm" disabled className="mt-4">
                <ArrowRight className="h-4 w-4 mr-2" />
                Em Breve
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-purple-500" />
                Material de Estudo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Recursos educacionais baseados nos tópicos identificados durante suas simulações SNAPPS.
              </p>
              <div className="space-y-2">
                <Badge variant="outline" className="text-xs">Guidelines</Badge>
                <Badge variant="outline" className="text-xs">Artigos</Badge>
                <Badge variant="outline" className="text-xs">Vídeos</Badge>
              </div>
              <Button variant="default" size="sm" disabled className="mt-4">
                <ArrowRight className="h-4 w-4 mr-2" />
                Em Breve
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

            {/* Dica de Integração - Movida para antes dos próximos passos */}
            <div className="mt-12 p-6 border rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200 shadow-sm">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                  <Lightbulb className="h-6 w-6 text-amber-700" />
                </div>
                <div>
                  <h5 className="font-bold text-amber-800 mb-2 text-lg">Dica de Integração</h5>
                  <p className="text-sm text-amber-700 leading-relaxed">
                    <strong>Framework SNAPPS:</strong> o framework SNAPPS é uma ferramenta interativa que permite que você pratique e desenvolva suas competências clínicas de forma estruturada, possibilitando que você treine sua capacidade de raciocínio clínico.
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

          <div className="p-5 bg-white rounded-xl border border-blue-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔎</span>
              </div>
              <h4 className="font-bold text-blue-800 text-lg">Diagnóstico Diferencial</h4>
            </div>
            <p className="text-sm text-gray-600 mb-4 text-center leading-relaxed">
              Explore diagnósticos diferenciais e desenvolva habilidades de raciocínio clínico.
            </p>
            <div className="text-center">
              <Link href="/academy/differential-diagnosis">
                <Button 
                  size="sm" 
                  variant="default"
                  className="px-4 py-2 w-full font-medium"
                >
                  Diagnóstico Diferencial →
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
          <strong>Aviso Importante:</strong> As simulações clínicas SNAPPS são destinadas para fins educacionais e desenvolvimento de habilidades clínicas. 
          O feedback do Dr. Corvus é baseado em princípios educacionais e não substitui supervisão clínica real ou julgamento médico profissional.
        </AlertDescription>
      </Alert>
      </div>
  )
}
