"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Separator } from '@/components/ui/Separator';
import { 
  FileQuestion, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  Search,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Target,
  Users,
  Zap,
  Lightbulb,
  HelpCircle,
  Copy,
  ExternalLink,
  MessageSquare,
  Database,
  Filter,
  Globe
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';
import ReactMarkdown from "react-markdown";

// Interfaces para tipos de dados
// MIGRATION NOTE: Backend now returns 'structured_pico_question' (not 'pico_components')
interface PICOFormulationOutput {
  structured_question: string;
  structured_pico_question: {
    patient_population: string;
    intervention: string;
    comparison: string;
    outcome: string;
    time_frame?: string;
    study_type?: string | null;
  };
  pico_derivation_reasoning: string;
  explanation: string;
  search_terms_suggestions: string[];
  boolean_search_strategies: string[];
  recommended_study_types: string[];
  alternative_pico_formulations: string[];
}

interface Props {
  initialScenario?: string;
  onPicoGenerated?: (picoData: { structuredQuestion: string; searchTerms: string[] }) => void;
  onTransferToResearch?: (picoQuestion: string, searchTerms: string[]) => void;
}

// Exemplos PICO para ajudar usuários
const picoExamples = [
  {
    title: "Tratamento Farmacológico",
    scenario: "Paciente de 65 anos com hipertensão arterial sistêmica de difícil controle, usando atualmente losartana 100mg e hidroclorotiazida 25mg, com pressão arterial mantendo-se em 160/95 mmHg. Médico considera adicionar anlodipino.",
    pico: {
      P: "Pacientes idosos com hipertensão não controlada",
      I: "Adição de anlodipino ao esquema atual",
      C: "Manutenção do esquema atual sem anlodipino",
      O: "Controle da pressão arterial e redução de eventos cardiovasculares"
    }
  },
  {
    title: "Diagnóstico",
    scenario: "Mulher de 45 anos com dor torácica atípica há 3 dias, sem fatores de risco cardiovasculares evidentes. ECG normal, troponina não solicitada ainda. Médico questiona se deve solicitar troponina ou teste ergométrico.",
    pico: {
      P: "Mulheres de meia-idade com dor torácica atípica",
      I: "Dosagem de troponina",
      C: "Teste ergométrico",
      O: "Acurácia diagnóstica para síndrome coronariana aguda"
    }
  },
  {
    title: "Prognóstico",
    scenario: "Paciente de 70 anos com diagnóstico recente de insuficiência cardíaca com fração de ejeção reduzida (35%). Família questiona sobre expectativa de vida e qualidade de vida.",
    pico: {
      P: "Idosos com insuficiência cardíaca e fração de ejeção reduzida",
      I: "Diagnóstico recente (< 6 meses)",
      C: "Pacientes com diagnóstico há mais tempo",
      O: "Sobrevida e qualidade de vida em 2 anos"
    }
  }
];

export default function PICOFormulationComponent({ 
  initialScenario = '', 
  onPicoGenerated, 
  onTransferToResearch 
}: Props) {
  const { getToken, isLoaded: authIsLoaded } = useAuth();
  
  // Estados principais
  const [clinicalScenario, setClinicalScenario] = useState(initialScenario);
  const [additionalContext, setAdditionalContext] = useState('');
  
  // Estados de carregamento e resultados
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PICOFormulationOutput | null>(null);
  const [alternativesExpanded, setAlternativesExpanded] = useState(false);
  
  // Estados para exemplos e helpers
  const [showExamples, setShowExamples] = useState(false);
  const [selectedExample, setSelectedExample] = useState<number | null>(null);
  
  // Atualizar quando initialScenario muda
  useEffect(() => {
    if (initialScenario && initialScenario !== clinicalScenario) {
      setClinicalScenario(initialScenario);
    }
  }, [initialScenario, clinicalScenario]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults(null);
    
    try {
      // Validação aprimorada
      if (!clinicalScenario.trim()) {
        throw new Error('Por favor, descreva o cenário clínico.');
      }
      
      if (clinicalScenario.trim().length < 20) {
        throw new Error('O cenário clínico deve ser mais detalhado (mínimo 20 caracteres).');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Erro de autenticação. Por favor, faça login novamente.');
      }

      // Preparar dados para envio
      const requestData = {
        clinical_scenario: clinicalScenario.trim(),
        additional_context: additionalContext.trim() || undefined,
      };

      const response = await fetch('/api/research-assistant/formulate-pico-translated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          detail: 'Falha ao processar a solicitação. Tente novamente.',
          error: 'Erro de conexão com o servidor.' 
        }));
        
        const errorMessage = errorData.error || errorData.detail || errorData.message || 
          `Falha na formulação PICO (status: ${response.status}).`;
        throw new Error(errorMessage);
      }

      const data: PICOFormulationOutput = await response.json();
      // Defensive mapping for array fields and field renaming
      setResults({
        ...data,
        alternative_pico_formulations: data.alternative_pico_formulations ?? data.alternative_pico_formulations ?? [],
        search_terms_suggestions: data.search_terms_suggestions ?? [],
        boolean_search_strategies: data.boolean_search_strategies ?? [],
        recommended_study_types: data.recommended_study_types ?? [],
      });
      
      // Notificar componente pai sobre os resultados
      if (onPicoGenerated) {
        onPicoGenerated({
          structuredQuestion: data.structured_question,
          searchTerms: data.search_terms_suggestions
        });
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.';
      setError(errorMessage);
      console.error("Error in handleSubmit:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearForm = () => {
    setClinicalScenario('');
    setAdditionalContext('');
    setResults(null);
    setError(null);
    setSelectedExample(null);
  };

  const handleLoadExample = (exampleIndex: number) => {
    const example = picoExamples[exampleIndex];
    setClinicalScenario(example.scenario);
    setSelectedExample(exampleIndex);
    setShowExamples(false);
  };

  const handleTransferToResearch = () => {
    if (onTransferToResearch && results) {
      onTransferToResearch(results.structured_question, results.search_terms_suggestions);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Tooltip para elementos PICO
  const PICOTooltip = ({ element, description }: { element: string; description: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center">
            <HelpCircle className="h-3 w-3 ml-1 text-[#44154a] cursor-help" />
          </span>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-semibold">{element}</p>
          <p className="text-xs mt-1">{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileQuestion className="h-6 w-6 mr-2" />
            Formulação de Perguntas PICO
          </CardTitle>
          <CardDescription>
            Transforme cenários clínicos em perguntas estruturadas seguindo a metodologia PICO (População, Intervenção, Comparação, Outcome). 
            Dr. Corvus ajudará a formular sua pergunta de pesquisa de forma clara e direcionada.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Seção de Exemplos */}
          <Collapsible open={showExamples} onOpenChange={setShowExamples}>
            <CollapsibleTrigger asChild>
              <Button variant="default" type="button" className="w-full justify-between">
                <span className="flex items-center">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Ver Exemplos de Cenários PICO
                </span>
                {showExamples ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-4">
              <p className="text-sm text-muted-foreground">
                Clique em um exemplo para carregar automaticamente no formulário:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {picoExamples.map((example, index) => (
                  <div 
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer transition-all hover:border-purple-300 hover:bg-purple-50 ${
                      selectedExample === index ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                    }`}
                    onClick={() => handleLoadExample(index)}
                  >
                    <h4 className="font-medium text-sm text-purple-800 mb-2">{example.title}</h4>
                    <p className="text-xs text-gray-600 line-clamp-3">{example.scenario.substring(0, 100)}...</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-xs mr-2 bg-purple-100 text-purple-700">P</Badge>
                      <Badge variant="outline" className="text-xs mr-2 bg-purple-100 text-purple-700">I</Badge>
                      <Badge variant="outline" className="text-xs mr-2 bg-purple-100 text-purple-700">C</Badge>
                      <Badge variant="outline" className="text-xs mr-2 bg-purple-100 text-purple-700">O</Badge>
                    </div>
                    {selectedExample === index && (
                      <div className="mt-2 text-xs text-purple-600 font-medium">✓ Carregado</div>
                    )}
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Campo principal - Cenário Clínico */}
          <div>
            <label htmlFor="clinicalScenario" className="block text-sm font-medium mb-1">
              Cenário Clínico <span className="text-red-500">*</span>
            </label>
            <Textarea 
              id="clinicalScenario" 
              placeholder="Descreva detalhadamente o caso clínico, incluindo: dados do paciente, condição médica atual, tratamentos em uso, dúvida específica e contexto da decisão clínica."
              rows={5}
              value={clinicalScenario}
              onChange={(e) => setClinicalScenario(e.target.value)}
              disabled={isLoading}
              required 
            />
            <p className="text-xs text-muted-foreground mt-1">
              <strong>Dica:</strong> Inclua idade, sexo, diagnóstico principal, tratamentos atuais e a dúvida específica que motivou a consulta
            </p>
          </div>

          {/* Campo adicional - Contexto */}
          <div>
            <label htmlFor="additionalContext" className="block text-sm font-medium mb-1">
              Contexto Adicional (Opcional)
            </label>
            <Textarea 
              id="additionalContext" 
              placeholder="Ex: Disponibilidade de recursos, preferências do paciente, diretrizes locais, limitações institucionais"
              rows={2}
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Informações sobre o contexto da prática médica que podem influenciar a formulação da pergunta
            </p>
          </div>

          {/* Guia PICO */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
            <div className="flex items-center mb-3">
              <Target className="h-5 w-5 text-purple-600 mr-2" />
              <h4 className="font-semibold text-purple-800">Guia de Estruturação PICO</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center mb-1">
                  <Badge variant="outline" className="text-xs mr-2 bg-purple-100 text-purple-700">P</Badge>
                  <strong>População/Paciente</strong>
                  <PICOTooltip 
                    element="População" 
                    description="Características específicas dos pacientes: idade, sexo, condição clínica, comorbidades, estágio da doença" 
                  />
                </div>
                <p className="text-xs text-purple-600 mb-3">Quem são os pacientes de interesse?</p>
                
                <div className="flex items-center mb-1">
                  <Badge variant="outline" className="text-xs mr-2 bg-purple-100 text-purple-700">I</Badge>
                  <strong>Intervenção</strong>
                  <PICOTooltip 
                    element="Intervenção" 
                    description="Tratamento, procedimento, teste diagnóstico, exposição ou fator prognóstico principal sendo estudado" 
                  />
                </div>
                <p className="text-xs text-purple-600">O que você está considerando fazer?</p>
              </div>
              <div>
                <div className="flex items-center mb-1">
                  <Badge variant="outline" className="text-xs mr-2 bg-purple-100 text-purple-700">C</Badge>
                  <strong>Comparação</strong>
                  <PICOTooltip 
                    element="Comparação" 
                    description="Alternativa terapêutica, placebo, padrão-ouro atual ou ausência de intervenção" 
                  />
                </div>
                <p className="text-xs text-purple-600 mb-3">Qual é a alternativa principal?</p>
                
                <div className="flex items-center mb-1">
                  <Badge variant="outline" className="text-xs mr-2 bg-purple-100 text-purple-700">O</Badge>
                  <strong>Outcome (Desfecho)</strong>
                  <PICOTooltip 
                    element="Outcome" 
                    description="Resultado clínico de interesse: mortalidade, morbidade, qualidade de vida, efeitos adversos, custos" 
                  />
                </div>
                <p className="text-xs text-purple-600">Que resultado você espera medir?</p>
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" variant="default" disabled={isLoading || !authIsLoaded} className="flex-1">
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Formulando PICO...
                </>
              ) : (
                <>
                  <FileQuestion className="mr-2 h-4 w-4" />
                  Formular Pergunta PICO
                </>
              )}
            </Button>
            
            {results && !isLoading && (
              <Button 
                type="button" 
                variant="default" 
                onClick={handleTransferToResearch}
                className="flex items-center border-[#44154a] text-[#44154a] hover:bg-[#44154a] hover:text-white"
              >
                <Search className="mr-2 h-4 w-4" />
                Pesquisar Evidências
              </Button>
            )}
            
            <Button 
              type="button" 
              variant="default" 
              onClick={handleClearForm}
              disabled={isLoading}
              className="flex items-center"
            >
              Limpar
            </Button>
          </div>

          {/* Exibição de Erro */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Ops! Algo deu errado</AlertTitle>
              <AlertDescription className="mt-2">
                {error}
                <br />
                <span className="text-sm mt-2 block">
                  Se o problema persistir, tente descrever o cenário de forma mais detalhada ou entre em contato conosco.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Exibição dos Resultados */}
          {results && (
            <div className="mt-8 space-y-6">
              {/* Pergunta PICO Estruturada */}
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                    <h3 className="text-lg font-semibold text-green-800">Pergunta PICO Estruturada</h3>
                  </div>
                  <Button 
                    size="sm" 
                    variant="default" 
                    onClick={() => copyToClipboard(results.structured_question)}
                    className="flex items-center"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Componentes PICO Detalhados - MIGRATION: use structured_pico_question */}
              {results.structured_pico_question && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Badge className="mr-2 bg-blue-600">P</Badge>
                      <h4 className="font-semibold text-blue-800">População</h4>
                    </div>
                    <p className="text-sm text-blue-700">{results.structured_pico_question.patient_population || '-'}</p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Badge className="mr-2 bg-blue-600">I</Badge>
                      <h4 className="font-semibold text-blue-800">Intervenção</h4>
                    </div>
                    <p className="text-sm text-blue-700">{results.structured_pico_question.intervention || '-'}</p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Badge className="mr-2 bg-blue-600">C</Badge>
                      <h4 className="font-semibold text-blue-800">Comparação</h4>
                    </div>
                    <p className="text-sm text-blue-700">{results.structured_pico_question.comparison || '-'}</p>
                  </div>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Badge className="mr-2 bg-blue-600">O</Badge>
                      <h4 className="font-semibold text-blue-800">Outcome (Desfecho)</h4>
                    </div>
                    <p className="text-sm text-blue-700">{results.structured_pico_question.outcome || '-'}</p>
                  </div>
                  {results.structured_pico_question.time_frame && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Badge className="mr-2 bg-blue-600">T</Badge>
                        <h4 className="font-semibold text-blue-800">Tempo</h4>
                      </div>
                      <p className="text-sm text-blue-700">{results.structured_pico_question.time_frame}</p>
                    </div>
                  )}
                  {results.structured_pico_question.study_type && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center mb-2">
                        <Badge className="mr-2 bg-blue-600">S</Badge>
                        <h4 className="font-semibold text-blue-800">Tipo de Estudo</h4>
                      </div>
                      <p className="text-sm text-blue-700">{results.structured_pico_question.study_type}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Raciocínio Detalhado */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                  <h4 className="font-semibold text-blue-800">Raciocínio Detalhado (Chain-of-Thought)</h4>
                </div>
                <div className="text-sm text-blue-700 leading-relaxed">
                  <ReactMarkdown>{results.pico_derivation_reasoning}</ReactMarkdown>
                </div>
              </div>

              {/* Explicação da Formulação */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center mb-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 mr-2" />
                  <h4 className="font-semibold text-blue-800">Explicação da Formulação</h4>
                </div>
                <div className="text-sm text-blue-700 leading-relaxed">
                  <ReactMarkdown>{results.explanation}</ReactMarkdown>
                </div>
              </div>

              {/* Estratégia de Busca */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipos de Estudo Recomendados */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-3">
                    <Filter className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="font-semibold text-blue-800">Tipos de Estudo Recomendados</h4>
                  </div>
                  <div className="space-y-1">
                    {results.recommended_study_types.map((type, index) => (
                      <div key={index} className="text-sm text-gray-700 flex items-start">
                        <span className="text-gray-500 mr-2 mt-1">•</span>
                        <span>{type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estratégias de Busca Booleana */}
              {results.boolean_search_strategies.length > 0 && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-3">
                    <Globe className="h-5 w-5 text-blue-600 mr-2" />
                    <h4 className="font-semibold text-blue-800">Estratégias de Busca Booleana</h4>
                  </div>
                  <div className="space-y-2">
                    {results.boolean_search_strategies.map((strategy, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                        <code className="text-sm flex-1">{strategy}</code>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => copyToClipboard(strategy)}
                          className="ml-2"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Formulações Alternativas */}
              {results.alternative_pico_formulations && results.alternative_pico_formulations.length > 0 && (
                <Collapsible open={alternativesExpanded} onOpenChange={setAlternativesExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button 
                      variant="default" 
                      className="w-full justify-between"
                    >
                      <span className="flex items-center">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Formulações Alternativas ({results.alternative_pico_formulations?.length ?? 0})
                      </span>
                      {alternativesExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 mt-4">
                    {(results.alternative_pico_formulations ?? []).map((alternative, index) => (
                      <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                        <div className="flex items-center justify-between">
                          <p className="text-sm flex-1">{alternative}</p>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => copyToClipboard(alternative)}
                            className="ml-2"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              )}

              {/* Call to Action para Pesquisa */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-blue-800 mb-1">Pronto para buscar evidências?</h4>
                    <p className="text-sm text-blue-600">
                      Use sua pergunta PICO estruturada para fazer uma pesquisa avançada de evidências científicas.
                    </p>
                  </div>
                  <Button 
                    onClick={handleTransferToResearch}
                    className="flex items-center"
                    variant="default"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Buscar Evidências
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Helper quando não há resultados */}
          {!results && !isLoading && !error && (
            <div className="mt-6 p-4 border rounded-md bg-sky-50 border-sky-200">
              <div className="flex items-center">
                <HelpCircle className="h-5 w-5 mr-2 text-sky-600" />
                <h3 className="text-md font-semibold text-sky-700">Pronto para estruturar sua pergunta?</h3>
              </div>
              <p className="text-sm text-sky-600 mt-1">
                Descreva seu cenário clínico acima e clique em "Formular Pergunta PICO" para transformá-lo em uma pergunta de pesquisa estruturada.
                Use os exemplos se precisar de inspiração!
              </p>
            </div>
          )}
        </CardContent>
      </form>
    </Card>
  );
} 