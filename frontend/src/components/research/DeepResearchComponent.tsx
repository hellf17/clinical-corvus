"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Separator } from '@/components/ui/Separator';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Progress } from '@/components/ui/Progress';
import { 
  Search, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp, 
  Info, 
  ExternalLink, 
  Clock, 
  Target, 
  FileQuestion,
  AlertTriangle,
  CheckCircle,
  Zap,
  ArrowRight,
  BookOpen,
  TrendingUp,
  Users,
  Calendar,
  BarChart3,
  Filter,
  Globe,
  HelpCircle,
  FileText,
  Lightbulb,
  Scale
} from 'lucide-react';

// Interfaces para tipos de dados
interface PICOStructure {
  population?: string;
  intervention?: string;
  comparison?: string;
  outcome?: string;
}

// Updated interfaces to match the backend Pydantic models
interface SynthesizedResearchOutput {
  original_query: string;
  executive_summary: string;
  key_findings_by_theme: KeyFinding[];
  evidence_quality_assessment: string;
  clinical_implications: string[];
  research_gaps_identified: string[];
  relevant_references: RelevantReference[];
  search_strategy_used: string;
  limitations: string[];
  disclaimer: string;
  research_metrics?: ResearchMetrics;
  search_duration_seconds?: number;
  llm_token_usage?: any; // Define more strictly if needed
  llm_model_name?: string;
}

interface KeyFinding {
  theme_name: string;
  supporting_references: number[];
  summary: string;
  strength_of_evidence: string;
  study_count?: number;
  key_findings?: string[];
  evidence_appraisal_notes?: string;
}

interface RelevantReference {
  reference_id: number;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  doi?: string;
  pmid?: string;
  url?: string;
  study_type: string;
  synthesis_relevance_score: number;
}

interface ResearchMetrics {
  total_articles_analyzed: number;
  sources_consulted: string[];
  search_queries_executed: number;
  articles_by_source: { [key: string]: number };
  quality_score_avg?: number;
  diversity_score_avg?: number;
  recency_score_avg?: number;
  rct_count: number;
  systematic_review_count: number;
  meta_analysis_count: number;
  guideline_count: number;
  cite_source_metrics?: any; // Define more strictly if needed
  quality_filters_applied?: string[];
}

// Estados de progresso para pesquisa autônoma
const progressStages = [
  { stage: "initializing", label: "Inicializando pesquisa...", percentage: 10 },
  { stage: "searching_pubmed", label: "Pesquisando PubMed...", percentage: 25 },
  { stage: "searching_cochrane", label: "Pesquisando Cochrane Library...", percentage: 40 },
  { stage: "searching_additional", label: "Consultando fontes adicionais...", percentage: 60 },
  { stage: "analyzing", label: "Analisando evidências...", percentage: 80 },
  { stage: "synthesizing", label: "Sintetizando resultados...", percentage: 95 },
  { stage: "completed", label: "Análise concluída!", percentage: 100 }
];

interface Props {
  initialQuestion?: string;
  onResultsGenerated?: (data: { query: string; suggestedTerms?: string[] }) => void;
  onTransferToPico?: (question: string) => void;
}

{ /* Função para gerar link direto para a referência */ }
const generateDirectLink = (ref: RelevantReference): string => {
  // Prioridade: DOI > PMID > URL > busca no Google Scholar
  if (ref.doi) {
    return `https://doi.org/${ref.doi}`;
  }
  if (ref.pmid) {
    return `https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}`;
  }
  if (ref.url) {
    return ref.url;
  }
  // Fallback para Google Scholar
  const searchQuery = encodeURIComponent(`"${ref.title}" ${ref.authors || ''}`);
  return `https://scholar.google.com/scholar?q=${searchQuery}`;
};

// Função para deduplicate referências baseado em title, DOI ou PMID
const deduplicateReferences = (references: RelevantReference[]): RelevantReference[] => {
  const seen = new Set<string>();
  const deduplicated: RelevantReference[] = [];
  
  for (const ref of references) {
    // Criar chaves únicas baseadas em diferentes critérios
    const keys = [
      ref.doi?.toLowerCase(),
      ref.pmid?.toLowerCase(),
      ref.title?.toLowerCase().trim()
    ].filter(Boolean);
    
    // Verificar se alguma das chaves já foi vista
    const isDuplicate = keys.some(key => key && seen.has(key));
    
    if (!isDuplicate) {
      // Adicionar todas as chaves válidas ao set
      keys.forEach(key => key && seen.add(key));
      deduplicated.push(ref);
    }
  }
  
  return deduplicated;
};

export default function DeepResearchComponent({ 
  initialQuestion = '', 
  onResultsGenerated, 
  onTransferToPico 
}: Props) {
  const { getToken, isLoaded: authIsLoaded } = useAuth();

  // Estados principais
  const [researchQuestion, setResearchQuestion] = useState(initialQuestion);
  const [researchFocus, setResearchFocus] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [quickSearchMode, setQuickSearchMode] = useState<'quick' | 'comprehensive'>('quick');
  const [researchMode, setResearchMode] = useState<'quick' | 'autonomous'>('quick');
  const [picoStructure, setPicoStructure] = useState<PICOStructure>({});
  const [isPicoExpanded, setIsPicoExpanded] = useState(false);
  
  // Estados de carregamento e resultados
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SynthesizedResearchOutput | null>(null);
  const [referencesExpanded, setReferencesExpanded] = useState(false);
  
  // Estados de progresso para pesquisa autônoma
  const [currentProgressStage, setCurrentProgressStage] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  
  // Referencias para limpeza
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Atualizar quando initialQuestion muda
  useEffect(() => {
    if (initialQuestion && initialQuestion !== researchQuestion) {
      setResearchQuestion(initialQuestion);
    }
  }, [initialQuestion, researchQuestion]);
  
  // Limpar intervalo de progresso
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Simular progresso para pesquisa autônoma
  const simulateAutonomousProgress = () => {
    setCurrentProgressStage(0);
    
    progressIntervalRef.current = setInterval(() => {
      setCurrentProgressStage(prev => {
        if (prev >= progressStages.length - 1) {
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
          }
          return prev;
        }
        
        const nextStage = prev + 1;
        const stage = progressStages[nextStage];
        setProgressMessage(stage.label);
        
        { /* Estimar tempo restante baseado no estágio */ }
        const remainingStages = progressStages.length - nextStage - 1;
        setEstimatedTimeRemaining(remainingStages * 30); // 30 segundos por estágio
        
        return nextStage;
      });
    }, 2000); // Atualizar a cada 2 segundos
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults(null);
    
    try {
      { /* Validação aprimorada */ }
      if (!researchQuestion.trim()) {
        throw new Error('Por favor, insira uma pergunta de pesquisa.');
      }
      
      if (researchQuestion.trim().length < 10) {
        throw new Error('A pergunta de pesquisa deve ser mais específica (mínimo 10 caracteres).');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Erro de autenticação. Por favor, faça login novamente.');
      }

      { /* Simular progresso se for pesquisa autônoma */ }
      if (researchMode === 'autonomous') {
        simulateAutonomousProgress();
      }

      // Preparar dados para envio */ }
      const requestData = {
        user_original_query: researchQuestion.trim(),
        research_focus: researchFocus.trim() || undefined,
        target_audience: targetAudience.trim() || undefined,
        pico_question: Object.keys(picoStructure).length > 0 ? picoStructure : undefined,
        // researchMode is from the main buttons ('quick' or 'autonomous')
        // quickSearchMode is from the new radio buttons for the "Pesquisa Rápida" path ('quick' or 'comprehensive')
        research_mode: researchMode === 'quick' ? quickSearchMode : researchMode,
      };

      { /* Escolher endpoint baseado no modo de pesquisa */ }
      const endpoint = researchMode === 'quick'
        ? '/api/research-assistant/quick-search'  // Endpoint para pesquisa rápida, alinhado com a estrutura de arquivos (research-assistant/quick-search/route.ts)
        : '/api/research-assistant/autonomous-translated'; // Endpoint para pesquisa autônoma

      console.log(`🔍 Modo: ${researchMode}, Endpoint: ${endpoint}`);

      const response = await fetch(endpoint, {
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
          `Falha na pesquisa de evidências (status: ${response.status}).`;
        throw new Error(errorMessage);
      }

      const data: SynthesizedResearchOutput = await response.json();
      setResults(data);
      
      { /* Notificar componente pai sobre os resultados */ }
      if (onResultsGenerated) {
        onResultsGenerated({
          query: researchQuestion,
          suggestedTerms: data.relevant_references?.slice(0, 5).map(ref => ref.title) || []
        });
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.';
      setError(errorMessage);
      console.error("Error in handleSubmit:", err);
    } finally {
      setIsLoading(false);
      setCurrentProgressStage(0);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    }
  };

  const handleClearForm = () => {
    setResearchQuestion('');
    setResearchFocus('');
    setTargetAudience('');
    setPicoStructure({});
    setResults(null);
    setError(null);
    setIsPicoExpanded(false);
  };

  { /* Função para transferir para PICO */ }
  const handleTransferToPico = () => {
    if (onTransferToPico && researchQuestion) {
      onTransferToPico(researchQuestion);
    }
  };

  { /* Função para obter cor da força da evidência */ }
  const getEvidenceStrengthColor = (strength: string) => {
    const s = strength.toLowerCase();
    if (s.includes('alta') || s.includes('forte')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (s.includes('moderada') || s.includes('moderate')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (s.includes('baixa') || s.includes('fraca') || s.includes('weak')) return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
      <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="h-6 w-6 mr-2 text-[#44154a]" />
            Pesquisa Avançada de Evidências Científicas
          </CardTitle>
          <CardDescription>
            Utilize o Dr. Corvus para realizar uma pesquisa abrangente e síntese de evidências científicas sobre sua pergunta clínica.
            Escolha entre busca rápida (1-3 min) ou análise autônoma (4-6 min) para maior profundidade.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Campo principal de pesquisa */}
            <div>
            <label htmlFor="researchQuestion" className="block text-sm font-medium mb-1">
              Pergunta de Pesquisa <span className="text-red-500">*</span>
              </label>
              <Textarea
              id="researchQuestion" 
              placeholder="Ex: Quando reiniciar anticoagulante em pacientes com FA e HSA?"
              rows={3}
              value={researchQuestion}
              onChange={(e) => setResearchQuestion(e.target.value)}
              disabled={isLoading}
                required
              />
            <p className="text-xs text-muted-foreground mt-1">
              Seja específico sobre população, intervenção e desfechos de interesse
            </p>
            </div>

          {/* Modo de Pesquisa */}
          <div>
            <label className="block text-sm font-medium mb-3">Modo de Pesquisa</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  researchMode === 'quick' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
                onClick={() => setResearchMode('quick')}
              >
                <div className="flex items-center mb-2">
                  <input 
                    type="radio" 
                    checked={researchMode === 'quick'} 
                    onChange={() => setResearchMode('quick')}
                    className="mr-2"
                    disabled={isLoading}
                  />
                  <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                  <span className="font-medium">Pesquisa Rápida</span>
                  <Badge variant="outline" className="ml-2 text-xs">1-2 min</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Busca eficiente focada em evidências de alta qualidade usando estratégias simplificadas e otimizadas para velocidade.
                </p>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  researchMode === 'autonomous' 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                onClick={() => setResearchMode('autonomous')}
              >
                <div className="flex items-center mb-2">
                  <input 
                    type="radio" 
                    checked={researchMode === 'autonomous'} 
                    onChange={() => setResearchMode('autonomous')}
                    className="mr-2"
                    disabled={isLoading}
                  />
                  <Target className="h-4 w-4 mr-2 text-purple-500" />
                  <span className="font-medium">Análise Autônoma</span>
                  <Badge variant="outline" className="ml-2 text-xs">3-5 min</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pesquisa abrangente com análise profunda, múltiplas fontes e síntese detalhada dos dados pelo agente autônomo Dr. Corvus.
                </p>
              </div>
              </div>
            </div>

            {/* Mode Selection for Quick Search (only visible if main mode is 'quick') */}
            {researchMode === 'quick' && (
            <div className="my-6 p-4 border border-dashed border-gray-300 rounded-lg bg-slate-50">
              <label className="block text-sm font-medium text-gray-800 mb-3">Opções da Pesquisa Rápida Selecionada:</label>
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <input
                    id="quickModeQuickRadio"
                    name="quickSearchModeRadioGroup"
                    type="radio"
                    value="quick"
                    checked={quickSearchMode === 'quick'}
                    onChange={() => setQuickSearchMode('quick')}
                    className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    disabled={isLoading}
                  />
                  <label htmlFor="quickModeQuickRadio" className="ml-2 block text-sm text-gray-900">
                    Rápida (Visão geral, ~1 min)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    id="quickModeComprehensiveRadio"
                    name="quickSearchModeRadioGroup"
                    type="radio"
                    value="comprehensive"
                    checked={quickSearchMode === 'comprehensive'}
                    onChange={() => setQuickSearchMode('comprehensive')}
                    className="h-4 w-4 text-primary-600 border-gray-300 focus:ring-primary-500"
                    disabled={isLoading}
                  />
                  <label htmlFor="quickModeComprehensiveRadio" className="ml-2 block text-sm text-gray-900">
                    Detalhada (Mais abrangente, ~2-3 min)
                  </label>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Escolha o nível de detalhe para a sua pesquisa rápida.
              </p>
            </div>
            )}

          {/* Campos opcionais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="focusArea" className="block text-sm font-medium mb-1">
                Área de Foco (Opcional)
              </label>
              <Input 
                id="focusArea" 
                placeholder="Ex: Cardiologia, Endocrinologia, Pediatria"
                value={researchFocus}
                onChange={(e) => setResearchFocus(e.target.value)}
                disabled={isLoading}
              />
                    </div>
                      <div>
              <label htmlFor="targetAudience" className="block text-sm font-medium mb-1">
                Público-Alvo (Opcional)
              </label>
              <Input 
                id="targetAudience" 
                placeholder="Ex: Médicos generalistas, Especialistas, Estudantes"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                disabled={isLoading}
              />
            </div>
                </div>

          {/* Estrutura PICO Opcional */}
          <Collapsible open={isPicoExpanded} onOpenChange={setIsPicoExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="default" type="button" className="w-full justify-between">
                <span className="flex items-center">
                  <FileQuestion className="h-4 w-4 mr-2" />
                  Estrutura PICO Opcional (Recomendado)
                </span>
                {isPicoExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <p className="text-sm text-muted-foreground">
                Forneça uma estrutura PICO para tornar sua pesquisa mais direcionada e específica:
              </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                  <label htmlFor="population" className="block text-sm font-medium mb-1">
                    População (P)
                  </label>
                    <Input
                    id="population"
                    placeholder="Ex: Adultos com pré-diabetes"
                    value={picoStructure.population || ''}
                    onChange={(e) => setPicoStructure(prev => ({ ...prev, population: e.target.value }))}
                    disabled={isLoading}
                    />
                  </div>
                  <div>
                  <label htmlFor="intervention" className="block text-sm font-medium mb-1">
                    Intervenção (I)
                  </label>
                    <Input
                    id="intervention"
                    placeholder="Ex: Metformina 500mg 2x/dia"
                    value={picoStructure.intervention || ''}
                    onChange={(e) => setPicoStructure(prev => ({ ...prev, intervention: e.target.value }))}
                    disabled={isLoading}
                    />
                  </div>
                  <div>
                  <label htmlFor="comparison" className="block text-sm font-medium mb-1">
                    Comparação (C)
                  </label>
                    <Input
                    id="comparison"
                    placeholder="Ex: Placebo ou mudanças no estilo de vida"
                    value={picoStructure.comparison || ''}
                    onChange={(e) => setPicoStructure(prev => ({ ...prev, comparison: e.target.value }))}
                    disabled={isLoading}
                    />
                  </div>
                  <div>
                  <label htmlFor="outcome" className="block text-sm font-medium mb-1">
                    Desfecho (O)
                  </label>
                    <Input
                    id="outcome"
                    placeholder="Ex: Incidência de diabetes tipo 2"
                    value={picoStructure.outcome || ''}
                    onChange={(e) => setPicoStructure(prev => ({ ...prev, outcome: e.target.value }))}
                    disabled={isLoading}
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

          {/* Progresso da Pesquisa Autônoma */}
          {isLoading && researchMode === 'autonomous' && (
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
              <div className="flex items-center mb-3">
                <RefreshCw className="h-5 w-5 text-purple-600 animate-spin mr-2" />
                <h4 className="font-medium text-purple-800">Análise Autônoma em Progresso</h4>
              </div>
              
              <Progress 
                value={progressStages[currentProgressStage]?.percentage || 0} 
                className="mb-3" 
              />
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-purple-700">
                  {progressMessage || progressStages[currentProgressStage]?.label || 'Preparando...'}
                </span>
                <span className="text-purple-600 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  ~{Math.max(0, estimatedTimeRemaining)}s restantes
                </span>
              </div>
              
              <div className="mt-3 text-xs text-purple-600">
                Esta análise mais profunda garante uma cobertura abrangente das evidências disponíveis.
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" variant="default" disabled={isLoading || !authIsLoaded} className="flex-1">
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {researchMode === 'autonomous' ? 'Analisando Evidências...' : 'Pesquisando...'}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  {researchMode === 'autonomous' ? 'Iniciar Análise Autônoma' : 'Pesquisar Evidências'}
                </>
              )}
            </Button>
            
            {!isLoading && (
              <Button 
                type="button" 
                variant="default" 
                onClick={handleClearForm}
                disabled={isLoading}
                className="flex-1"  
              >
                Limpar Formulário
              </Button>
            )}
            
            {researchQuestion && !isLoading && (
              <Button type="submit" variant="default" onClick={handleTransferToPico} className="flex-1">
                <FileQuestion className="h-4 w-4 mr-2" />
                Usar no PICO
              </Button>
            )}
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
                  Se o problema persistir, tente simplificar sua pergunta ou entre em contato conosco.
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Exibição dos Resultados */}
          {results && (
            <div className="space-y-8">
              {/* Cabeçalho dos Resultados com Ações */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl flex items-center text-green-800">
                        <CheckCircle className="h-6 w-6 mr-3 text-green-600" />
                        Análise de Evidências Concluída
                      </CardTitle>
                      <CardDescription className="mt-2">
                        Consulta: <span className="font-medium text-foreground">{researchQuestion}</span>
                      </CardDescription>
                    </div>
                    
                    {/* Botões de Ação */}
                    <div className="flex flex-wrap gap-2">  
                      <Button variant="default" size="sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(results, null, 2))}>
                        <Info className="h-4 w-4 mr-1" />
                        Copiar Resultados
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Métricas Unificadas da Pesquisa */}
              {results.research_metrics && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center text-blue-800">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Métricas da Pesquisa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="text-center p-4 bg-white/70 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.research_metrics.total_articles_analyzed}
                        </div>
                        <div className="text-sm text-blue-700 font-medium">Artigos Analisados</div>
                      </div>
                      <div className="text-center p-4 bg-white/70 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.research_metrics.search_queries_executed}
                        </div>
                        <div className="text-sm text-blue-700 font-medium">Consultas Executadas</div>
                      </div>
                      <div className="text-center p-4 bg-white/70 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">
                          {typeof results.search_duration_seconds === 'number' 
                            ? results.search_duration_seconds.toFixed(2) 
                            : 'N/A'
                          }
                        </div>
                        <div className="text-sm text-blue-700 font-medium">Tempo de Pesquisa</div>
                      </div>
                      <div className="text-center p-4 bg-white/70 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.research_metrics.systematic_review_count}
                        </div>
                        <div className="text-sm text-blue-700 font-medium">Revisões Sistemáticas</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                      <div className="text-center p-4 bg-white/70 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.research_metrics.meta_analysis_count}
                        </div>
                        <div className="text-sm text-blue-700 font-medium">Metanálises</div>
                      </div>
                      <div className="text-center p-4 bg-white/70 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.research_metrics.guideline_count}
                        </div>
                        <div className="text-sm text-blue-700 font-medium">Diretrizes</div>
                      </div>
                      <div className="text-center p-4 bg-white/70 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.research_metrics.rct_count}
                        </div>
                        <div className="text-sm text-blue-700 font-medium">RCTs</div>
                      </div>
                      <div className="text-center p-4 bg-white/70 rounded-lg border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">
                          {Object.keys(results.research_metrics.articles_by_source || {}).length}
                        </div>
                        <div className="text-sm text-blue-700 font-medium">Fontes com Artigos</div>
                      </div>
                    </div>
                    {/* Fontes Consultadas */}
                    {results.research_metrics.sources_consulted && results.research_metrics.sources_consulted.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                          <Globe className="h-4 w-4 mr-2" />
                          Fontes Consultadas
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {results.research_metrics.sources_consulted.map((source: string, index: number) => (
                            <Badge key={index} variant="outline" className="bg-white/70 text-blue-700 border-blue-200">
                              {source}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Artigos por Fonte */}
                    {results.research_metrics.articles_by_source && Object.keys(results.research_metrics.articles_by_source).length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Artigos por Fonte
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(results.research_metrics.articles_by_source || {}).map(([type, count]: [string, number]) => (
                            <div key={type} className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-purple-100">
                              <span className="text-sm text-purple-700 font-medium">{type}</span>
                              <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                {count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Filtros de Qualidade Aplicados */}
                    {results.research_metrics.quality_filters_applied && results.research_metrics.quality_filters_applied.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-[#44154a] mb-3 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Filtros de Qualidade Aplicados
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {results.research_metrics.quality_filters_applied.map((filter: string, index: number) => (
                            <Badge key={index} variant="outline" className="bg-white/70 text-purple-700 border-purple-200">
                              {filter}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Resumo Executivo - Design Aprimorado */}
              <Card className="border-l-4 border-l-green-500">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center text-green-800">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Resumo Executivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Fontes Consultadas</h4>
                      <div className="flex flex-wrap gap-2">
                        {results?.research_metrics?.sources_consulted.map((source: string, i: number) => (
                          <Badge key={i} variant="outline">{source}</Badge>
                        ))}
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">Artigos por Fonte</h4>
                      <div className="flex flex-wrap gap-4">
                        {Object.entries(results?.research_metrics?.articles_by_source || {}).map(([source, count]: [string, number]) => (
                          <div key={source} className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{source}:</span>
                            <span className="text-gray-600">{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )

              {/* Achados por Tema */}
              {results.key_findings_by_theme && results.key_findings_by_theme.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center">
                      <Target className="h-5 w-5 mr-2 text-green-600" />
                      Achados por Tema
                    </CardTitle>
                    <CardDescription>
                      Evidências organizadas por temas principais identificados na literatura
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {results.key_findings_by_theme.map((theme, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                          <div className="p-4 bg-gray-50 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-gray-800 text-lg">
                                {theme.theme_name}
                              </h4>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="bg-white">
                                  <Users className="h-3 w-3 mr-1" />
                                  {theme.study_count} estudos
                                </Badge>
                                <Badge 
                                  variant="secondary" 
                                  className={`${getEvidenceStrengthColor(theme.strength_of_evidence)} text-white font-medium`}
                                >
                                  {theme.strength_of_evidence}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-4">
                            <ul className="space-y-3">
                              {(theme.key_findings ?? []).map((finding: string, findingIndex: number) => (
                                  <li key={findingIndex} className="flex items-start">
                                  <CheckCircle className="h-4 w-4 text-purple-500 mr-3 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-gray-700 leading-relaxed">
                                    {finding}
                                  </span>
                                </li>
                              ))}
                            </ul>
                            
                            {/* Evidence Appraisal Notes */}
                            {theme.evidence_appraisal_notes && (
                              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                <h5 className="text-sm font-semibold text-indigo-800 mb-2 flex items-center">
                                  <Scale className="h-4 w-4 mr-2" />
                                  Avaliação Crítica da Evidência
                                </h5>
                                <p className="text-sm text-indigo-700 leading-relaxed">
                                  {theme.evidence_appraisal_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Referências Relevantes */}
              {(() => {
                if (!results || !results.relevant_references || results.relevant_references.length === 0) return null;
                
                const sortedReferences = [...results.relevant_references].sort((a: RelevantReference, b: RelevantReference) => a.reference_id - b.reference_id);
                const visibleReferences = referencesExpanded ? sortedReferences : sortedReferences.slice(0, 5);

                return (
                <Card className="bg-gray-50/70 border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center text-lg text-gray-800">
                      <BookOpen className="h-5 w-5 mr-3 text-primary" />
                      Referências Relevantes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {visibleReferences.map((ref: RelevantReference) => (
                        <div key={ref.reference_id} className="p-3 bg-white rounded-lg border border-gray-200">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 pr-4">
                              <h4 className="font-medium text-gray-900 text-sm leading-snug mb-1">
                                <span className="text-primary font-bold">[{ref.reference_id}]</span> {ref.title}
                              </h4>
                              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-gray-600">
                                <span>{ref.authors.join(', ')}</span>
                                {ref.journal && <span className="italic">• {ref.journal}</span>}
                                {ref.year && <span>• {ref.year}</span>}
                                <Badge variant="outline" className="text-xs font-mono">{ref.study_type}</Badge>
                                <Badge variant="secondary" className="text-xs">Relevância: {ref.synthesis_relevance_score.toFixed(2)}</Badge>
                              </div>
                            </div>
                            <Button 
                              variant="default" 
                              size="sm" 
                              asChild
                              className="text-xs ml-3 shrink-0"
                            >
                              <a 
                                href={generateDirectLink(ref)} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                <span className="flex items-center">
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Acessar
                                </span>
                              </a>
                            </Button>
                          </div>
                        </div>
                      ))}
          {sortedReferences.length > 5 && (
            <div className="text-center py-3">
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setReferencesExpanded(!referencesExpanded)}
                >
                  {referencesExpanded ? (
                    <><ChevronUp className="h-4 w-4 mr-2" /> Mostrar menos</>
                  ) : (
                    <><ChevronDown className="h-4 w-4 mr-2" /> Ver mais {sortedReferences.length - 5} referências</>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
})()}

              <Alert className="border-l-4 border-l-gray-400">
                <Info className="h-4 w-4" />
                <AlertTitle className="text-gray-800">Aviso Importante</AlertTitle>
                <AlertDescription className="text-gray-700 text-sm leading-relaxed">
                  {results.disclaimer}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Helper quando não há resultados */}
          {!results && !isLoading && !error && (
            <div className="mt-6 p-4 border rounded-md bg-sky-50 border-sky-200">
              <div className="flex items-center">
                <HelpCircle className="h-5 w-5 mr-2 text-sky-600" />
                <h3 className="text-md font-semibold text-sky-700">Pronto para pesquisar?</h3>
              </div>
              <p className="text-sm text-sky-600 mt-1">
                Insira sua pergunta de pesquisa acima e escolha o modo de busca. 
                Para melhores resultados, seja específico sobre população, intervenção e desfechos.
              </p>
            </div>
          )}
        </CardContent>
      </form>
      </Card>
  );
} 