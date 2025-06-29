"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Separator } from "@/components/ui/Separator";
import { Progress } from "@/components/ui/Progress";
import { 
  Library, 
  Search, 
  UserCheck, 
  Zap, 
  Brain, 
  HelpCircle, 
  ArrowRight, 
  RotateCcw, 
  Eye, 
  RefreshCw,
  Target,
  Info,
  ArrowUpRight,
  CheckSquare,
  Filter,
  BookOpen,
  Clock,
  Lightbulb,
  CheckCircle,
  Award,
  TrendingUp,
  AlertTriangle,
  Users,
  PlayCircle,
  FileText,
  Timer,
  BookOpenCheck
} from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';

// Importar os novos componentes especializados
import BiasLibraryComponent from '@/components/academy/metacognition/BiasLibraryComponent';
import CaseBiasAnalysisComponent from '@/components/academy/metacognition/CaseBiasAnalysisComponent';
import SelfReflectionComponent from '@/components/academy/metacognition/SelfReflectionComponent';
import DiagnosticTimeoutComponent from '@/components/academy/metacognition/DiagnosticTimeoutComponent';
import { IntegratedWorkflowCard, WorkflowStep } from '@/components/academy/IntegratedWorkflowCard';

// Define interfaces for BAML function outputs
interface CognitiveBiasCaseAnalysis {
  identified_bias_by_expert: string;
  explanation_of_bias_in_case: string;
  how_bias_impacted_decision: string;
  strategies_to_mitigate_bias: string[];
  feedback_on_user_identification?: string;
}

interface ReasoningCritiqueOutput {
  critique_of_reasoning_path: string;
  identified_potential_biases: Array<{ bias_name: string; confidence_score?: number; rationale?: string }>;
  suggestions_for_improvement: string[];
  comparison_with_expert_reasoning?: string;
}

interface DiagnosticTimeoutOutput {
  timeout_recommendation: string;
  alternative_diagnoses_to_consider: string[];
  key_questions_to_ask: string[];
  red_flags_to_check: string[];
  next_steps_suggested: string[];
  cognitive_checks: string[];
}

// Estado para comunicação entre componentes
interface CrossComponentState {
  identifiedBias?: string;
  caseScenario?: string;
  reasoningProcess?: string;
  biasStrategies?: string[];
  timeoutRecommendations?: DiagnosticTimeoutOutput;
  completedSteps?: string[];
  currentWorkflow?: 'independent' | 'guided';
}

// Definir vinhetas disponíveis
interface CaseVignette {
  id: string;
  title: string;
  scenario: string;
  targetBias: string;
  complexity: 'Simples' | 'Moderado' | 'Complexo';
  specialty: string;
}

// Interface para tracking de progresso
interface LearningProgress {
  biasesStudied: number;
  casesAnalyzed: number;
  reflectionsCompleted: number;
  timeoutsPerformed: number;
  totalScore: number;
  weeklyGoal: number;
}

export default function MetacognitionDiagnosticErrorsPage() {
  const { getToken, isLoaded: authIsLoaded, userId } = useAuth();
  const [activeTab, setActiveTab] = useState("bias-library");
  const [crossComponentState, setCrossComponentState] = useState<CrossComponentState>({
    completedSteps: [],
    currentWorkflow: 'independent'
  });
  const [error, setError] = useState<string | null>(null);
  const [transferNotification, setTransferNotification] = useState<string | null>(null);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [learningProgress, setLearningProgress] = useState<LearningProgress>({
    biasesStudied: 0,
    casesAnalyzed: 0,
    reflectionsCompleted: 0,
    timeoutsPerformed: 0,
    totalScore: 0,
    weeklyGoal: 100
  });

  // Calcular progresso geral
  const calculateOverallProgress = () => {
    const maxSteps = 4;
    const completedSteps = crossComponentState.completedSteps?.length || 0;
    return Math.round((completedSteps / maxSteps) * 100);
  };

  // Função para transferir dados entre componentes com feedback visual aprimorado
  const handleCrossComponentTransfer = (
    sourceTab: string,
    targetTab: string,
    data: Partial<CrossComponentState>
  ) => {
    setCrossComponentState(prev => {
      const newCompletedSteps = prev.completedSteps ? [...prev.completedSteps] : [];
      if (!newCompletedSteps.includes(sourceTab)) {
        newCompletedSteps.push(sourceTab);
      }
      
      return { 
        ...prev, 
        ...data,
        completedSteps: newCompletedSteps
      };
    });
    
    setActiveTab(targetTab);
    
    // Mostrar notificação de transferência aprimorada
    const sourceNames: { [key: string]: string } = {
      "bias-library": "Biblioteca de Vieses",
      "case-analysis": "Análise de Casos",
      "self-reflection": "Auto-Reflexão",
      "diagnostic-timeout": "Diagnostic Timeout"
    };
    
    const targetNames: { [key: string]: string } = {
      "bias-library": "Biblioteca de Vieses",
      "case-analysis": "Análise de Casos", 
      "self-reflection": "Auto-Reflexão",
      "diagnostic-timeout": "Diagnostic Timeout"
    };
    
    setTransferNotification(
      `✨ Dados transferidos de ${sourceNames[sourceTab]} para ${targetNames[targetTab]}! Continue sua jornada de aprendizado.`
    );
    
    // Limpar notificação após 4 segundos
    setTimeout(() => {
      setTransferNotification(null);
    }, 4000);
  };

  // Função para iniciar workflow guiado
  const startGuidedWorkflow = () => {
    setCrossComponentState(prev => ({ 
      ...prev, 
      currentWorkflow: 'guided',
      completedSteps: [] 
    }));
    setActiveTab("bias-library");
    setTransferNotification("🎯 Workflow guiado iniciado! Comece explorando a Biblioteca de Vieses.");
    setTimeout(() => setTransferNotification(null), 4000);
  };

  // Se ainda está carregando, mostra o banner de carregamento
  if (!authIsLoaded) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-12">
        <section className="text-center py-10 academy-gradient-header rounded-xl border border-primary/20 shadow-lg">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center justify-center mb-4">
              <RefreshCw className="h-10 w-10 md:h-12 md:w-12 mr-3 text-white animate-spin" />
              Metacognição e Erros Diagnósticos
            </h1>
            <p className="mt-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Carregando ferramentas de autoconsciência e mitigação de vieses...
            </p>
          </div>
        </section>
        {/* Placeholder for 4 tabs */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-300 rounded animate-pulse"></div>
          ))}
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
            <Zap className="h-10 w-10 md:h-12 md:w-12 mr-3 text-white" />
            Metacognição e Erros Diagnósticos
          </h1>
          <p className="mt-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Desenvolva autoconsciência sobre seu processo de pensamento e aprenda a mitigar vieses cognitivos com Dr. Corvus.
          </p>
        </div>
      </section>

      {/* Quick Start Guide */}
      {showQuickStart && (
        <Alert className="mb-6 bg-blue-50 border-blue-200">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">💡 Como Usar Este Módulo</AlertTitle>
          <AlertDescription className="text-blue-700 mt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              <div>
                <p className="font-medium mb-2">🔄 Fluxo Recomendado:</p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Explore a <strong>Biblioteca de Vieses</strong></li>
                  <li>Pratique com <strong>Análise de Casos</strong></li>
                  <li>Use a <strong>Auto-Reflexão</strong> para insights pessoais</li>
                  <li>Aplique o <strong>Diagnostic Timeout</strong> em cenários</li>
                </ol>
              </div>
              <div>
                <p className="font-medium mb-2">⚡ Dicas de Uso:</p>
                <ul className="text-sm space-y-1 list-disc list-inside">
                  <li>Use dados transferidos entre abas para continuidade</li>
                  <li>Complete o workflow guiado para máximo aprendizado</li>
                  <li>Revise exemplos práticos antes de casos próprios</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Notificação de Transferência aprimorada */}
      {transferNotification && (
        <Alert className="mb-6 bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-200 shadow-sm">
          <CheckSquare className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="text-emerald-800 font-medium">
            {transferNotification}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display aprimorado */}
      {error && (
        <Alert variant="destructive" className="mb-6 shadow-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>⚠️ Ops! Algo deu errado</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <br />
            <span className="text-sm mt-2 block">Se o problema persistir, tente recarregar a página ou entre em contato conosco.</span>
          </AlertDescription>
        </Alert>
      )}

      
      {/* Workflow Integration Section - Using IntegratedWorkflowCard */}
      {(() => {
        const metacognitionWorkflowSteps: WorkflowStep[] = [
          {
            id: 'bias-library',
            icon: Library,
            title: '1. Estude Vieses',
            description: 'Explore biblioteca interativa',
            statusText: crossComponentState.identifiedBias ? crossComponentState.identifiedBias : undefined,
            statusTextBadgeClasses: 'text-xs bg-emerald-100 text-emerald-800 border-emerald-200',
            isStatusTextVisibleWhenCompleted: true,
            targetIcon: ArrowRight,
          },
          {
            id: 'case-analysis',
            icon: Search,
            title: '2. Analise Casos',
            description: 'Identifique vieses em cenários',
            statusText: crossComponentState.caseScenario ? 'Caso analisado' : undefined,
            statusTextBadgeClasses: 'text-xs bg-blue-100 text-blue-800 border-blue-200',
            isStatusTextVisibleWhenCompleted: true,
            targetIcon: ArrowRight,
          },
          {
            id: 'self-reflection',
            icon: Brain,
            title: '3. Auto-Reflexão',
            description: 'Analise seu raciocínio',
            statusText: crossComponentState.reasoningProcess ? 'Reflexão concluída' : undefined,
            statusTextBadgeClasses: 'text-xs bg-indigo-100 text-indigo-800 border-indigo-200',
            isStatusTextVisibleWhenCompleted: true,
            targetIcon: ArrowRight,
          },
          {
            id: 'diagnostic-timeout',
            icon: RotateCcw,
            title: '4. Timeout',
            description: 'Pausa para revisão',
            statusText: crossComponentState.timeoutRecommendations ? 'Timeout realizado' : undefined,
            statusTextBadgeClasses: 'text-xs bg-orange-100 text-orange-800 border-orange-200',
            isStatusTextVisibleWhenCompleted: true,
            targetIcon: Target,
          },
        ];

        const integrationInfoContent = crossComponentState.currentWorkflow === 'guided' ? (
          <Alert className="bg-blue-50 border-blue-200 mt-6">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Modo Guiado Ativo:</strong> Siga a sequência das etapas para uma experiência de aprendizado otimizada.
              Dados serão transferidos automaticamente entre as ferramentas.
            </AlertDescription>
          </Alert>
        ) : null;

        return (
          <IntegratedWorkflowCard
            title="Fluxo Integrado de Metacognição"
            subtitle="Jornada estruturada para desenvolvimento de autoconsciência clínica"
            steps={metacognitionWorkflowSteps}
            activeStepId={activeTab}
            completedSteps={crossComponentState.completedSteps || []}
            onStepClick={setActiveTab}
            themeColorName="indigo"
            totalSteps={4}
            integrationInfo={integrationInfoContent}
            mainIcon={TrendingUp}
          />
        );
      })()}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 bg-indigo-50 p-1 rounded-lg border border-indigo-200 mb-8">
          <TabsTrigger 
            value="bias-library" 
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-indigo-100 data-[state=inactive]:text-indigo-700 rounded-md px-3 py-2 text-xs sm:text-sm font-medium transition-all relative"
          >
            <Library className="h-4 w-4 mr-2" />
            Biblioteca de Vieses
            {crossComponentState.completedSteps?.includes('bias-library') && (
              <CheckCircle className="w-3 h-3 ml-2 text-emerald-400 absolute top-1 right-1" />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="case-analysis" 
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-indigo-100 data-[state=inactive]:text-indigo-700 rounded-md px-3 py-2 text-xs sm:text-sm font-medium transition-all relative"
          >
            <Search className="h-4 w-4 mr-2" />
            Análise de Casos
            {crossComponentState.completedSteps?.includes('case-analysis') && (
              <CheckCircle className="w-3 h-3 ml-2 text-emerald-400 absolute top-1 right-1" />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="self-reflection" 
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-indigo-100 data-[state=inactive]:text-indigo-700 rounded-md px-3 py-2 text-xs sm:text-sm font-medium transition-all relative"
          >
            <Brain className="h-4 w-4 mr-2" />
            Auto-Reflexão
            {crossComponentState.completedSteps?.includes('self-reflection') && (
              <CheckCircle className="w-3 h-3 ml-2 text-emerald-400 absolute top-1 right-1" />
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="diagnostic-timeout" 
            className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=inactive]:hover:bg-indigo-100 data-[state=inactive]:text-indigo-700 rounded-md px-3 py-2 text-xs sm:text-sm font-medium transition-all relative"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Diagnostic Timeout
            {crossComponentState.completedSteps?.includes('diagnostic-timeout') && (
              <CheckCircle className="w-3 h-3 ml-2 text-emerald-400 absolute top-1 right-1" />
            )}
          </TabsTrigger>
        </TabsList>

        {/* Biblioteca de Vieses */}
        <TabsContent value="bias-library">
          <BiasLibraryComponent 
            onBiasSelected={(biasName: string, description: string) => {
              handleCrossComponentTransfer("bias-library", "case-analysis", {
                identifiedBias: biasName
              });
            }}
            onTransferToAnalysis={(caseScenario: string) => {
              handleCrossComponentTransfer("bias-library", "case-analysis", {
                caseScenario
              });
            }}
          />
        </TabsContent>

        {/* Análise de Casos com Vieses */}
        <TabsContent value="case-analysis">
          <CaseBiasAnalysisComponent 
            initialBias={crossComponentState.identifiedBias}
            initialScenario={crossComponentState.caseScenario}
            onBiasIdentified={(biasData: { biasName: string; strategies: string[] }) => {
              setCrossComponentState(prev => ({ 
                ...prev, 
                identifiedBias: biasData.biasName,
                biasStrategies: biasData.strategies 
              }));
            }}
            onTransferToReflection={(scenario: string, biasName: string) => {
              handleCrossComponentTransfer("case-analysis", "self-reflection", {
                caseScenario: scenario,
                identifiedBias: biasName
              });
            }}
            onTransferToTimeout={(scenario: string, diagnosis: string) => {
              handleCrossComponentTransfer("case-analysis", "diagnostic-timeout", {
                caseScenario: scenario
              });
            }}
          />
        </TabsContent>

        {/* Ferramenta de Auto-Reflexão */}
        <TabsContent value="self-reflection">
          <SelfReflectionComponent 
            initialScenario={crossComponentState.caseScenario}
            initialBiasName={crossComponentState.identifiedBias}
            onInsightsGenerated={(insights: { strengths: string[]; biases: string[]; improvements: string[] }) => {
              setCrossComponentState(prev => ({ 
                ...prev, 
                reasoningProcess: insights.biases.join(', ')
              }));
            }}
            onTransferToTimeout={(scenario: string, insights: string[]) => {
              handleCrossComponentTransfer("self-reflection", "diagnostic-timeout", {
                caseScenario: scenario,
                reasoningProcess: insights.join(', ')
              });
            }}
          />
        </TabsContent>

        {/* Prática de Diagnostic Timeout */}
        <TabsContent value="diagnostic-timeout">
          <DiagnosticTimeoutComponent 
            initialScenario={crossComponentState.caseScenario}
            initialDiagnosis={crossComponentState.reasoningProcess}
            onTimeoutCompleted={(insights) => {
              setCrossComponentState(prev => ({
                ...prev,
                timeoutRecommendations: insights
              }));
            }}
          />
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
              <strong>Conectando os pontos do raciocínio clínico:</strong> As habilidades que você desenvolve aqui são a base para um raciocínio mais seguro e eficaz.
              Ao avaliar um artigo no módulo de MBE, pergunte-se: "Este estudo confirma o que eu já acreditava (Viés de Confirmação)? Estou dando mais peso a este artigo porque ele é mais recente (Viés de Disponibilidade)<br></br>
              Aplique o Diagnostic Timeout quando estiver gerando hipóteses no módulo de Diagnóstico Diferencial e lembre-se de estar sempre questionando sua própria lógica.
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
          <Button asChild variant="default">
            <Link href="/academy">
              <ArrowRight className="mr-2 h-4 w-4 transform rotate-180" /> Voltar para a Academia
            </Link>
          </Button>
      </div>

      {/* Disclaimer */}
      <Alert className="mt-8">
        <AlertDescription className="text-sm">
          <strong>Aviso Importante:</strong> As ferramentas de metacognição são destinadas para fins educacionais e desenvolvimento do raciocínio clínico.
          Estas ferramentas não devem ser usadas como substituto para a prática clínica e a tomada de decisão clínica.          
        </AlertDescription>
      </Alert>
    </div>
  );
} 
