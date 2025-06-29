"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { ArrowRight, BookOpenCheck, SearchCheck, Microscope, HelpCircle, Lightbulb, FileQuestion, CheckSquare, Filter, RefreshCw, Search, FileText, Scale, Info, ArrowUpRight, BookOpen, Target, Zap, Brain, Users } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { InformationTypeNeededEnumFE, InformationTypeNeededEnumBE, informationTypeMap } from '@/types/academy';

// Importar os novos componentes de pesquisa profunda
import DeepResearchComponent from '@/components/academy/research/DeepResearchComponent';
import UnifiedEvidenceAnalysisComponent from '@/components/academy/research/UnifiedEvidenceAnalysisComponent';
import PICOFormulationComponent from '@/components/academy/research/PICOFormulationComponent';
import { IntegratedWorkflowCard, WorkflowStep } from '@/components/academy/IntegratedWorkflowCard';

// Interface para o output da função AssistEvidenceAppraisal (baseado no BAML)
interface AppraisalAssistanceOutput {
  identified_study_type: string;
  key_strengths: string[];
  key_limitations_or_biases: string[];
  relevance_to_clinical_question: string;
  points_for_critical_consideration: string[];
  disclaimer: string;
}

interface KnowledgeRetrievalOutput {
  suggested_literature_search_terms: string[];
  search_strategy_advice?: string;
  disclaimer: string;
}

// Estado para comunicação entre componentes
interface CrossComponentState {
  picoQuestion?: string;
  researchQuestion?: string;
  extractedContent?: string;
  suggestedTerms?: string[];
}

export default function EvidenceBasedMedicinePage() {
  const { getToken, isLoaded: authIsLoaded, userId } = useAuth();
  const [activeTab, setActiveTab] = useState("pico-formulation");
  const [crossComponentState, setCrossComponentState] = useState<CrossComponentState>({});
  const [error, setError] = useState<string | null>(null);
  const [transferNotification, setTransferNotification] = useState<string | null>(null);

  // Função para transferir dados entre componentes com feedback visual
  const handleCrossComponentTransfer = (
    sourceTab: string,
    targetTab: string,
    data: Partial<CrossComponentState>
  ) => {
    setCrossComponentState(prev => ({ ...prev, ...data }));
    setActiveTab(targetTab);
    
    // Mostrar notificação de transferência
    const sourceNames: { [key: string]: string } = {
      "pico-formulation": "Formulação PICO",
      "deep-research": "Pesquisa Avançada",
      "evidence-analysis": "Análise de Evidências"
    };
    
    const targetNames: { [key: string]: string } = {
      "pico-formulation": "Formulação PICO",
      "deep-research": "Pesquisa Avançada",
      "evidence-analysis": "Análise de Evidências"
    };
    
    setTransferNotification(
      `Dados transferidos de ${sourceNames[sourceTab]} para ${targetNames[targetTab]} ✓`
    );
    
    // Limpar notificação após 3 segundos
    setTimeout(() => {
      setTransferNotification(null);
    }, 3000);
  };

  // Se ainda está carregando, mostra o banner de carregamento
  if (!authIsLoaded) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-12">
        <section className="text-center py-10 academy-gradient-header rounded-xl border border-primary/20 shadow-lg">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center justify-center mb-4">
              <RefreshCw className="h-10 w-10 md:h-12 md:w-12 mr-3 text-white animate-spin" />
              Medicina Baseada em Evidências
            </h1>
            <p className="mt-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Carregando ferramentas e recursos avançados...
            </p>
          </div>
        </section>
        {/* Placeholder for 3 tabs */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
            <BookOpenCheck className="h-10 w-10 md:h-12 md:w-12 mr-3 text-white" />
            Medicina Baseada em Evidências
          </h1>
          <p className="mt-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
            Ferramentas avançadas para pesquisa, análise e avaliação de evidências científicas com Dr. Corvus.
          </p>
          
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
              <span className="w-2 h-2 bg-purple-400 rounded-full mr-2"></span>
              Sistema Ativo
            </div>
            <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
              <Target className="w-3 h-3 mr-1" />
              Análise IA Avançada
            </div>
            <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
              <Zap className="w-3 h-3 mr-1" />
              Integração PICO
            </div>
          </div>
        </div>
      </section>

      {/* Notificação de Transferência */}
      {transferNotification && (
        <Alert className="mb-6 bg-green-50 border-green-200">
          <CheckSquare className="h-4 w-4 text-green-700" />
          <AlertDescription className="text-green-700">
            {transferNotification}
          </AlertDescription>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Ops! Algo deu errado</AlertTitle>
          <AlertDescription className="mt-2">
            {error}
            <br />
            <span className="text-sm mt-2 block">Se o problema persistir, tente recarregar a página ou entre em contato conosco.</span>
          </AlertDescription>
        </Alert>
      )}

            {/* Workflow Integration Section - Using IntegratedWorkflowCard */}
            {(() => {
        const mbeWorkflowSteps: WorkflowStep[] = [
          {
            id: 'pico-formulation',
            icon: FileQuestion,
            title: '1. Formule PICO',
            description: 'Estruture sua pergunta clínica',
            targetIcon: ArrowRight,
          },
          {
            id: 'deep-research',
            icon: Search,
            title: '2. Pesquise Evidências',
            description: 'Busca avançada automática',
            targetIcon: ArrowRight,
          },
          {
            id: 'evidence-analysis',
            icon: Scale,
            title: '3. Analise Criticamente',
            description: 'Avaliação detalhada da qualidade',
            targetIcon: Target, // Or ArrowRight if preferred for consistency
          },
        ];

        const integrationInfoContent = crossComponentState.picoQuestion ? (
          <Alert className="bg-green-50 border-green-200 rounded-lg mt-6">
            <CheckSquare className="h-5 w-5 text-green-700 mr-3 mt-0.5 flex-shrink-0" />
            <AlertDescription>
              <p className="text-sm font-semibold text-green-700 mb-1">PICO Estruturada Ativa:</p>
              <p className="text-sm text-green-700">{crossComponentState.picoQuestion}</p>
            </AlertDescription>
          </Alert>
        ) : null;

        return (
          <IntegratedWorkflowCard
            title="Fluxo Integrado de MBE"
            subtitle="Maximize sua eficiência combinando as ferramentas em sequência para uma abordagem completa de medicina baseada em evidências."
            steps={mbeWorkflowSteps}
            activeStepId={activeTab}
            completedSteps={[]} // MBE page doesn't currently track completed steps in state
            onStepClick={setActiveTab}
            themeColorName="green"
            totalSteps={3}
            integrationInfo={integrationInfoContent}
            mainIcon={ArrowUpRight}
          />
        );
      })()}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3 gap-2 bg-green-50 p-1 rounded-lg border border-green-200 mb-8">
          <TabsTrigger value="pico-formulation" className="data-[state=active]:bg-[#4d9e3f] data-[state=active]:text-white data-[state=inactive]:hover:bg-green-100 data-[state=inactive]:text-green-700 rounded-md px-3 py-2 text-sm font-medium transition-all">
            <FileQuestion className="h-4 w-4 mr-2" />
            Formulação PICO
          </TabsTrigger>
          <TabsTrigger value="deep-research" className="data-[state=active]:bg-[#4d9e3f] data-[state=active]:text-white data-[state=inactive]:hover:bg-green-100 data-[state=inactive]:text-green-700 rounded-md px-3 py-2 text-sm font-medium transition-all">
            <Search className="h-4 w-4 mr-2" />
            Pesquisa Avançada
          </TabsTrigger>
          <TabsTrigger value="evidence-analysis" className="data-[state=active]:bg-[#4d9e3f] data-[state=active]:text-white data-[state=inactive]:hover:bg-green-100 data-[state=inactive]:text-green-700 rounded-md px-3 py-2 text-sm font-medium transition-all">
            <Scale className="h-4 w-4 mr-2" />
            Análise de Evidências
          </TabsTrigger>
        </TabsList>

        {/* Pesquisa Avançada de Evidências */}
        <TabsContent value="deep-research">
          <DeepResearchComponent 
            initialQuestion={crossComponentState.picoQuestion}
            onResultsGenerated={(data) => {
              // Callback para quando resultados são gerados
              setCrossComponentState(prev => ({ 
                ...prev, 
                researchQuestion: data.query,
                suggestedTerms: data.suggestedTerms 
              }));
            }}
            onTransferToPico={(question) => {
              handleCrossComponentTransfer("deep-research", "pico-formulation", {
                researchQuestion: question
              });
            }}
          />
        </TabsContent>

        {/* Análise e Avaliação de Evidências Unificada */}
        <TabsContent value="evidence-analysis">
          <UnifiedEvidenceAnalysisComponent 
            initialContent={crossComponentState.extractedContent}
            onContentExtracted={(content) => {
              setCrossComponentState(prev => ({ ...prev, extractedContent: content }));
            }}
            onTransferToResearch={(query) => {
              handleCrossComponentTransfer("evidence-analysis", "deep-research", {
                researchQuestion: query
              });
            }}
          />
        </TabsContent>

        {/* Formulação de Perguntas PICO */}
        <TabsContent value="pico-formulation">
          <PICOFormulationComponent 
            initialScenario={crossComponentState.researchQuestion}
            onPicoGenerated={(picoData) => {
              setCrossComponentState(prev => ({ 
                ...prev, 
                picoQuestion: picoData.structuredQuestion,
                suggestedTerms: picoData.searchTerms 
              }));
            }}
            onTransferToResearch={(picoQuestion, searchTerms) => {
              handleCrossComponentTransfer("pico-formulation", "deep-research", {
                picoQuestion,
                suggestedTerms: searchTerms
              });
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Termos de Busca Sugeridos - Movido para acima do fluxo integrado */}
      {crossComponentState.suggestedTerms && crossComponentState.suggestedTerms.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start">
            <Target className="h-5 w-5 text-amber-600 mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 mb-2">Termos de Busca Sugeridos:</p>
              <div className="flex flex-wrap gap-1">
                {crossComponentState.suggestedTerms.slice(0, 8).map((term, index) => (
                  <Badge key={index} variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                    {term}
                  </Badge>
                ))}
                {crossComponentState.suggestedTerms.length > 8 && (
                  <Badge variant="outline" className="text-xs bg-amber-100 text-amber-800 border-amber-300">
                    +{crossComponentState.suggestedTerms.length - 8} mais
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recursos Adicionais - Refatorado e reposicionado */}
      <section className="mt-12">
        <div className="p-6 border rounded-lg bg-gradient-to-r from-blue-50 to-sky-50 border-blue-200 shadow-sm">
          <div className="flex items-center mb-6">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mr-4">
              <BookOpen className="h-6 w-6 text-blue-700" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Recursos Adicionais de MBE</h2>
          </div>
          <p className="text-sm mb-6 leading-relaxed">
            Ferramentas complementares para aprimorar suas habilidades em medicina baseada em evidências.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-white rounded-xl border border-purple-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3">
                  <BookOpenCheck className="h-5 w-5 text-blue-700" />
                </div>
                <h3 className="font-bold text-blue-700 text-lg">Guias de MBE</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Acesse guias e checklists para avaliação crítica de diferentes tipos de estudos científicos.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">CONSORT</Badge>
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">STROBE</Badge>
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">PRISMA</Badge>
              </div>
              <Button variant="default" size="sm" disabled className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Em Breve
              </Button>
            </div>

            <div className="p-5 bg-white rounded-xl border border-purple-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3">
                  <Microscope className="h-5 w-5 text-blue-700" />
                </div>
                <h3 className="font-bold text-blue-700 text-lg">Calculadoras Estatísticas</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Ferramentas para cálculo de NNT, NNH, intervalos de confiança e medidas de efeito.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">NNT/NNH</Badge>
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">IC 95%</Badge>
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">OR/RR</Badge>
              </div>
              <Button variant="default" size="sm" disabled className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Em Breve
              </Button>
            </div>

            <div className="p-5 bg-white rounded-xl border border-purple-200 hover:shadow-lg transition-all duration-300 hover:scale-105">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3">
                  <Lightbulb className="h-5 w-5 text-blue-700" />
                </div>
                <h3 className="font-bold text-blue-700 text-lg">Casos Práticos</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                Pratique MBE com casos clínicos reais e feedback personalizado do Dr. Corvus.
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">Estudos RCT</Badge>
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">Meta-análises</Badge>
                <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">Observacionais</Badge>
              </div>
              <Button variant="default" size="sm" disabled className="w-full">
                <ArrowRight className="h-4 w-4 mr-2" />
                Em Breve
              </Button>
            </div>
          </div>
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
              <strong>MBE em Todo Lugar:</strong> Após formular uma pergunta PICO, use a Pesquisa Avançada para buscar as melhores evidências atuais e avalie uma a uma na Análise de Evidências. <br />
              As conclusões podem informar seu Diagnóstico Diferencial e suas ações na Simulação Clínica. <br />
              O ciclo da MBE é contínuo!
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
                <Button variant="default" size="sm" className="w-full">
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
                <Button variant="default" size="sm" className="w-full">
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
                <Button variant="default" size="sm" className="w-full">
                  SNAPPS →
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
          <Link href="/academy">
            <Button variant="default">
              <ArrowRight className="mr-2 h-4 w-4 transform rotate-180" /> Voltar para a Academia
            </Button>
          </Link>
      </div>


      {/* Disclaimer */}
      <Alert className="mt-8">
        <AlertDescription className="text-sm">
          <strong>Aviso Importante:</strong> As ferramentas de medicina baseada em evidências são destinadas para fins educacionais e de apoio à decisão clínica. 
          Sempre consulte diretrizes institucionais e use seu julgamento clínico. O Dr. Corvus não substitui a avaliação médica profissional.
        </AlertDescription>
      </Alert>
    </div>
  );
} 