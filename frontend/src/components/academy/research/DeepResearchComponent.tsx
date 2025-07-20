"use client";

import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import ReactMarkdown from 'react-markdown';
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
  Scale,
  ShieldCheck,
  SearchSlash,
  ThumbsUp,
  ThumbsDown,
  Copy,
  ChevronRight,
  FlaskConical,
  Activity,
  Brain,
  Database
} from 'lucide-react';  

// Interfaces para tipos de dados
interface PICOStructure {
  population?: string;
  intervention?: string;
  comparison?: string;
  outcome?: string;
}

// Helper to detect fallback/error results
function isFallbackResult(result: SynthesizedResearchOutput): boolean {
  return (
    result.executive_summary?.toLowerCase().includes("error")
  );
}
// All result handling below must only use fields present in the new SynthesizedResearchOutput interface.

// Updated interfaces to match the backend Pydantic models
interface SynthesizedResearchOutput {
  original_query: string;
  executive_summary: string;
  key_findings_by_theme: KeyFinding[];
  evidence_quality_assessment: string;
  clinical_implications: string[];
  research_gaps_identified: string[];
  relevant_references: RelevantReference[];
  research_metrics?: ResearchMetrics;
  search_duration_seconds?: number;
  llm_token_usage?: any; // Define more strictly if needed
  llm_model_name?: string;
  professional_detailed_reasoning_cot?: string;
  translated_output?: string; // Added for copy button
  output?: string; // Added for copy button fallback
}

interface KeyFinding {
  theme_name: string;
  supporting_references: number[];
  summary: string;
  strength_of_evidence: string;
  study_count?: number;
  key_findings?: string[];
  evidence_appraisal_notes?: string;
  supporting_studies_count?: number; // Added for backend compatibility
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
  study_type: string | null;
  relevance_score?: number; // Novo campo do backend
  synthesis_relevance_score?: number; // Suporte a legado
  snippet_or_abstract?: string;
} // Permite ambos os campos para compatibilidade

interface ResearchMetrics {
  total_articles_analyzed: number;
  sources_consulted: string[];
  search_queries_executed: number;
  articles_by_source: { [key: string]: number };
  quality_score_avg?: number;
  diversity_score_avg?: number;
  recency_score_avg?: number;
  rct_count: number;
  systematic_reviews_count: number; // Corrected from systematic_review_count
  meta_analysis_count: number;
  guideline_count: number;
  date_range_searched?: string; // Added
  unique_journals_found?: number; // Added
  high_impact_studies_count?: number; // Added
  recent_studies_count?: number; // Added
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
  if (ref && typeof ref.doi === 'string' && ref.doi.trim()) {
    return `https://doi.org/${ref.doi}`;
  }
  if (ref && typeof ref.pmid === 'string' && ref.pmid.trim()) {
    return `https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}`;
  }
  if (ref && typeof ref.url === 'string' && ref.url.trim()) {
    return ref.url;
  }
  // Fallback para Google Scholar
  const title = (ref && typeof ref.title === 'string') ? ref.title : '';
  let authors = '';
  if (ref && Array.isArray(ref.authors) && ref.authors.length > 0) {
    authors = ref.authors.filter(a => typeof a === 'string').join(', ');
  }
  const searchQuery = encodeURIComponent(`\"${title}\" ${authors}`);
  return `https://scholar.google.com/scholar?q=${searchQuery}`;
};

// Função para deduplicate referências baseado em title, DOI ou PMID
const deduplicateReferences = (references: RelevantReference[]): RelevantReference[] => {
  const seen = new Set<string>();
  const deduplicated: RelevantReference[] = [];
  if (!Array.isArray(references)) {
    console.warn('Referências não são um array:', references);
    return [];
  }
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
  if (deduplicated.length === 0) {
    console.warn('Nenhuma referência deduplicada encontrada!', references);
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
  const [researchMode, setResearchMode] = useState<'quick' | 'comprehensive' | 'autonomous'>('quick');
  const [picoStructure, setPicoStructure] = useState<PICOStructure>({});
  const [isPicoExpanded, setIsPicoExpanded] = useState(false);
  
  // Estados de carregamento e resultados
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SynthesizedResearchOutput | null>(null);
  
  // Estados de progresso para pesquisa autônoma
  const [currentProgressStage, setCurrentProgressStage] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);
  const [feedbackGiven, setFeedbackGiven] = useState<'like' | 'dislike' | null>(null);
  const [isReasoningCotOpen, setIsReasoningCotOpen] = useState(false);
  const [expandedAbstracts, setExpandedAbstracts] = useState<{ [key: string]: boolean }>({});

  // Referencias para limpeza
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const getFriendlySourceName = (source: string): string => {
    if (!source) return 'Fonte Desconhecida';
    const lowerSource = source.toLowerCase();
    if (lowerSource.includes('pubmed')) return 'PubMed';
    if (lowerSource.includes('web_search_brave')) return 'Busca na Web (Brave)';
    if (lowerSource.includes('web_search_google')) return 'Busca na Web (Google)';
    if (lowerSource.includes('google_scholar')) return 'Google Scholar';
    if (lowerSource.includes('scielo')) return 'SciELO';
    if (lowerSource.includes('lilacs')) return 'LILACS';
    // Add more specific mappings as needed
    if (lowerSource.includes('web_search')) return 'Busca na Web'; // Generic web search
    return source.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' '); // Fallback to formatted name
  };

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
      if (researchMode === 'autonomous') { // TODO: remove this when autonomous mode is implemented
        simulateAutonomousProgress();
      }

      // Preparar dados para envio */ }
      const requestData = {
        user_original_query: researchQuestion.trim(),
        research_focus: researchFocus.trim() || undefined,
        target_audience: targetAudience.trim() || undefined,
        pico_question: Object.keys(picoStructure).length > 0 ? picoStructure : undefined,
        research_mode: researchMode === 'quick' ? quickSearchMode : researchMode,
      };

      { /* Escolher endpoint baseado no modo de pesquisa */ }
      let endpoint = '';
      // If the main mode selected via top buttons is 'quick' (Pesquisa Rápida),
      // always use the quick-search-translated proxy.
      // The specific sub-mode ('quick' or 'comprehensive' from radio buttons) 
      // is passed in the requestData.research_mode field.
      if (researchMode === 'quick' || researchMode === 'comprehensive') { 
        endpoint = '/api/research-assistant/quick-search-translated';
      } 
      else if (researchMode === 'autonomous') {
        // Placeholder for autonomous research endpoint
        // endpoint = '/api/research-assistant/autonomous';
        console.warn(`Autonomous mode endpoint logic might need review, currently unhandled for endpoint selection in this block.`);
        throw new Error('Autonomous mode endpoint not explicitly defined here, review needed.');
      } else {
        // Handle other research modes or throw an error for unconfigured paths
        throw new Error(`Invalid or unhandled researchMode ('${researchMode}') for endpoint determination.`);
      }  

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
  const getEvidenceStrengthColor = (strength: string): string => {
    const s = strength.toLowerCase();
    if (s.includes('alta') || s.includes('forte')) {
      return 'border-green-500 text-green-700 hover:bg-green-50 bg-white';
    }
    if (s.includes('moderada') || s.includes('moderate')) {
      return 'border-yellow-500 text-yellow-700 hover:bg-yellow-50 bg-white';
    }
    if (s.includes('baixa') || s.includes('fraca') || s.includes('weak')) {
      return 'border-red-500 text-red-700 hover:bg-red-50 bg-white';
    }
    return 'border-gray-400 text-gray-600 hover:bg-gray-100 bg-white';
  };

  const getRelevanceScoreBadgeStyle = (score?: number): string => {
    if (score === undefined || score === null || !Number.isFinite(score)) {
      return 'border-gray-400 text-gray-600 hover:bg-gray-100 bg-white font-medium';
    }
    if (score >= 0.75) {
      return 'border-green-500 text-green-700 hover:bg-green-50 bg-white font-medium';
    }
    if (score >= 0.5) {
      return 'border-yellow-500 text-yellow-700 hover:bg-yellow-50 bg-white font-medium';
    }
    return 'border-red-500 text-red-700 hover:bg-red-50 bg-white font-medium';
  };

  return (
      <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <form onSubmit={handleSubmit}>
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            <Search className="h-6 w-6 mr-2 text-green-500" />
            Pesquisa Avançada de Evidências Científicas
          </CardTitle>
          <CardDescription className="text-gray-600">
            Utilize o Dr. Corvus para realizar uma pesquisa abrangente e síntese de evidências científicas sobre sua pergunta clínica.
            Escolha entre busca rápida (1-3 min) ou análise autônoma (4-6 min) para maior profundidade.
          </CardDescription>
          <div className="flex items-center justify-center space-x-2 mt-4">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span className="text-sm text-gray-500">Análise completa de evidências científicas</span>
          </div>
        </CardHeader>
        
        <CardContent className="relative z-10 space-y-6">
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
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-green-300'
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
                  <Zap className="h-4 w-4 mr-2 text-green-500" />
                  <span className="font-medium">Pesquisa Rápida</span>
                  <Badge variant="outline" className="ml-2 text-xs">1-3 min</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Busca eficiente focada em evidências de alta qualidade usando estratégias simplificadas e otimizadas para velocidade.
                </p>
              </div>

              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  researchMode === 'autonomous' 
                    ? 'border-emerald-500 bg-emerald-50' 
                    : 'border-gray-200 hover:border-emerald-300'
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
                  <Target className="h-4 w-4 mr-2 text-emerald-500" />
                  <span className="font-medium">Análise Autônoma</span>
                  <Badge variant="outline" className="ml-2 text-xs">4-6 min</Badge>
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
                    Rápida (Visão geral, ~1-2 min)
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
                Escolha o nível de detalhes para a sua pesquisa.
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
            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg">
              <div className="flex items-center mb-3">
                <RefreshCw className="h-5 w-5 text-green-600 animate-spin mr-2" />
                <h4 className="font-medium text-green-800">Análise Autônoma em Progresso</h4>
              </div>
              
              <Progress 
                value={progressStages[currentProgressStage]?.percentage || 0} 
                className="mb-3" 
              />
              
              <div className="flex justify-between items-center text-sm">
                <span className="text-green-700">
                  {progressMessage || progressStages[currentProgressStage]?.label || 'Preparando...'}
                </span>
                <span className="text-green-600 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  ~{Math.max(0, estimatedTimeRemaining)}s restantes
                </span>
              </div>
              
              <div className="mt-3 text-xs text-green-600">
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
              {results && !isFallbackResult(results) && results.original_query && (
                <div className="mb-6 p-4 border rounded-md bg-amber-50 border-amber-200">
                  <h3 className="text-md font-semibold text-amber-800 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Consulta Expandida Realizada:
                  </h3>
                  <p className="text-sm text-amber-700 mt-1 italic">
                    "{results.original_query}"
                  </p>
                </div>
              )}

              {/* Cabeçalho dos Resultados com Ações */}
              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-green-500">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 to-emerald-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <CardHeader className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle className="text-xl flex items-center text-green-800">
                        <CheckCircle className="h-6 w-6 mr-3 text-green-600" />
                        Análise de Evidências Concluída
                      </CardTitle>
                      <div className="flex items-center justify-center space-x-2 mt-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="text-sm text-gray-500">Síntese científica completa</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3 md:mt-0">
                      <Button 
                        variant={feedbackGiven === 'like' ? 'default' : 'default'} 
                        size="icon" 
                        onClick={() => setFeedbackGiven(feedbackGiven === 'like' ? null : 'like')}
                        title="Gostei desta pesquisa"
                        className={feedbackGiven === 'like' ? 'bg-purple-500 hover:bg-purple-600 text-white' : ''}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={feedbackGiven === 'dislike' ? 'default' : 'default'} 
                        size="icon" 
                        onClick={() => setFeedbackGiven(feedbackGiven === 'dislike' ? null : 'dislike')}
                        title="Não gostei desta pesquisa"
                        className={feedbackGiven === 'dislike' ? 'bg-red-500 hover:bg-red-600 text-white' : ''}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Botões de Ação */}
                    <div className="flex flex-wrap gap-2">  
                    <Button
                      variant="default"
                      size="sm"
                      className="text-xs ml-2 shrink-0"
                      title="Copiar resultados"
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!results) {
                          toast.error('Resultados não disponíveis para copiar!');
                          return;
                        }
                        try {
                          const textToCopy = results.translated_output || results.output || '';
                          await navigator.clipboard.writeText(textToCopy);
                          toast.success('Resultados copiados para a área de transferência!');
                        } catch (err) {
                          toast.error('Erro ao copiar resultados!');
                        }
                      }}
                      disabled={isLoading}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copiar Resultados
                    </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Métricas Unificadas da Pesquisa */}
              {results.research_metrics && (
                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 bg-green-50 border-green-100">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 to-emerald-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-xl font-semibold flex items-center text-green-800">
                      <BarChart3 className="h-5 w-5 mr-2" />
                      Métricas e Detalhes da Pesquisa
                    </CardTitle>
                    <div className="flex items-center justify-center space-x-2 mt-2">
                      <Activity className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-700">Análise quantitativa dos resultados</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                      {/* Artigos Analisados */}
                      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-blue-100 h-full">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.research_metrics?.total_articles_analyzed || 0}
                        </div>
                        <div className="text-sm text-blue-700 font-medium text-center">Artigos Analisados</div>
                      </div>
                      
                      {/* Tempo de Pesquisa */}
                      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-blue-100 h-full">
                        <div className="text-2xl font-bold text-blue-600">
                          {typeof results.search_duration_seconds === 'number' 
                            ? results.search_duration_seconds.toFixed(0) 
                            : 'N/A'}
                        </div>
                        <div className="text-sm text-blue-700 font-medium text-center">Segundos de Pesquisa</div>
                      </div>
                      
                      {/* Periódicos Únicos */}
                      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-blue-100 h-full">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.research_metrics?.unique_journals_found || 0}
                        </div>
                        <div className="text-sm text-blue-700 font-medium text-center">Periódicos Únicos</div>
                      </div>
                      
                      {/* Artigos de Alto Impacto */}
                      <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border border-blue-100 h-full">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.research_metrics?.high_impact_studies_count || 0}
                        </div>
                        <div className="text-sm text-blue-700 font-medium text-center">Alto Impacto</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                      {/* Metanálises */}
                      {results.research_metrics?.meta_analysis_count !== undefined && results.research_metrics.meta_analysis_count > 0 && (
                        <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                          <div className="text-2xl font-bold text-blue-600">
                            {results.research_metrics.meta_analysis_count}
                          </div>
                          <div className="text-sm text-blue-700 font-medium">Metanálises</div>
                        </div>
                      )}
                      {/* Diretrizes */}
                      {results.research_metrics?.guideline_count !== undefined && results.research_metrics.guideline_count > 0 && (
                        <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                          <div className="text-2xl font-bold text-blue-600">
                            {results.research_metrics.guideline_count}
                          </div>
                          <div className="text-sm text-blue-700 font-medium">Diretrizes</div>
                        </div>
                      )}
                      {/* RCTs */}
                      {results.research_metrics?.rct_count !== undefined && results.research_metrics.rct_count > 0 && (
                        <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                          <div className="text-2xl font-bold text-blue-600">
                            {results.research_metrics.rct_count}
                          </div>
                          <div className="text-sm text-blue-700 font-medium">RCTs</div>
                        </div>
                      )}
                      {/* Fontes com Artigos */}
                      {results.research_metrics?.articles_by_source &&
                        Object.keys(results.research_metrics?.articles_by_source ?? {})
                          .filter(
                            (key) => ((results.research_metrics?.articles_by_source ?? {})[key] ?? 0) > 0
                          ).length > 0 && (
                        <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                          <div className="text-2xl font-bold text-blue-600">
                            {
                              Object.keys(results.research_metrics?.articles_by_source ?? {})
                                .filter(
                                  (key) => ((results.research_metrics?.articles_by_source ?? {})[key] ?? 0) > 0
                                ).length
                            }
                          </div>
                          <div className="text-sm text-blue-700 font-medium">Fontes com Artigos</div>
                        </div>
                      )}
                    </div>
                    {/* Additional Metrics Grid */}
                    {results.research_metrics && (
                        (results.research_metrics.date_range_searched && results.research_metrics.date_range_searched.trim() !== '') ||
                        (typeof results.research_metrics.unique_journals_found === 'number' && results.research_metrics.unique_journals_found > 0) ||
                        (typeof results.research_metrics.high_impact_studies_count === 'number' && results.research_metrics.high_impact_studies_count > 0) ||
                        (typeof results.research_metrics.recent_studies_count === 'number' && results.research_metrics.recent_studies_count > 0)
                      ) && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                      {results.research_metrics?.date_range_searched && results.research_metrics.date_range_searched.trim() !== '' && (
                        <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                          <div className="text-xl font-bold text-blue-600 flex items-center justify-center">
                            <Calendar className="h-5 w-5 mr-2 text-blue-500" />
                            {results.research_metrics.date_range_searched}
                          </div>
                          <div className="text-sm text-blue-700 font-medium mt-1">Período Pesquisado</div>
                        </div>
                      )}
                      {typeof results.research_metrics?.unique_journals_found === 'number' && results.research_metrics.unique_journals_found > 0 && (
                        <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                          <div className="text-2xl font-bold text-blue-600 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 mr-2 text-blue-500" />
                            {results.research_metrics.unique_journals_found}
                          </div>
                          <div className="text-sm text-blue-700 font-medium mt-1">Periódicos Únicos</div>
                        </div>
                      )}
                      {typeof results.research_metrics?.high_impact_studies_count === 'number' && results.research_metrics.high_impact_studies_count > 0 && (
                        <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                          <div className="text-2xl font-bold text-blue-600 flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 mr-2 text-blue-500" />
                            {results.research_metrics.high_impact_studies_count}
                          </div>
                          <div className="text-sm text-blue-700 font-medium mt-1">Estudos de Alto Impacto</div>
                        </div>
                      )}
                      {typeof results.research_metrics?.recent_studies_count === 'number' && results.research_metrics.recent_studies_count > 0 && (
                        <div className="text-center p-4 bg-white rounded-lg border border-blue-100">
                          <div className="text-2xl font-bold text-blue-600 flex items-center justify-center">
                            <Zap className="h-6 w-6 mr-2 text-blue-500" />
                            {results.research_metrics.recent_studies_count}
                          </div>
                          <div className="text-sm text-blue-700 font-medium mt-1">Estudos Recentes</div>
                        </div>
                      )}
                    </div>
                    )}
                    {/* Fontes Consultadas */}
                    {Array.isArray(results.research_metrics?.sources_consulted) && results.research_metrics?.sources_consulted.filter(Boolean).length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                        <Globe className="h-4 w-4 mr-2" />
                        Fontes Consultadas
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {results.research_metrics.sources_consulted.filter(Boolean).map((source: string, index: number) => {
                          // Se for Brave ou Web, tente mostrar o nome real da fonte se disponível
                          if (source.toLowerCase().includes('brave') || source.toLowerCase().includes('web')) {
                            // Procure por fontes reais em articles_by_source
                            const realSources = results.research_metrics && results.research_metrics.articles_by_source
                              ? Object.keys(results.research_metrics.articles_by_source).filter(s => s && s !== 'BRAVE' && s !== 'WEB')
                              : [];
                            if (realSources.length > 0) {
                              return realSources.map((real, i) => (
                                <Badge key={real + i} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {getFriendlySourceName(real)}
                                </Badge>
                              ));
                            }
                          }
                          return (
                            <Badge key={source + index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {getFriendlySourceName(source)}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}
                    {/* Filtros de Qualidade Aplicados */}
                    {results.research_metrics?.quality_filters_applied && results.research_metrics?.quality_filters_applied.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-green-800 mb-3 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Filtros de Qualidade Aplicados
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {results.research_metrics.quality_filters_applied.map((filter: string, index: number) => (
                            <Badge key={index} variant="outline" className="bg-white/70 text-green-700 border-green-200">
                              {filter}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Artigos por Fonte */}
                    {(() => {
                        const articlesBySource = results.research_metrics?.articles_by_source;
                        return articlesBySource &&
                          Object.keys(articlesBySource).filter(type => (articlesBySource?.[type] ?? 0) > 0).length > 0;
                      })() && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Artigos por Fonte
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(results.research_metrics.articles_by_source || {})
                            .filter(([type, count]: [string, number]) => count > 0)
                            .map(([type, count]: [string, number]) => (
                            <div key={type} className="flex items-center justify-between p-3 bg-white/70 rounded-lg border border-green-100">
                              <span className="text-sm text-green-700 font-medium">{getFriendlySourceName(type)}</span>
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                {count}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Avaliação da Qualidade da Evidência */}
                    {results.evidence_quality_assessment && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Avaliação da Qualidade da Evidência
                        </h4>
                        <div className="prose prose-sm max-w-none text-gray-700 bg-white/70 p-3 rounded-md border border-blue-100 text-xs">
                          <ReactMarkdown>{results.evidence_quality_assessment || ''}</ReactMarkdown>
                        </div>
                      </div>
                    )}

                    {/* Gaps de Pesquisa Identificados */}
                    {results.research_gaps_identified && results.research_gaps_identified.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-semibold text-orange-800 mb-3 flex items-center">
                          <SearchSlash className="h-4 w-4 mr-2" />
                          Gaps de Pesquisa Identificados
                        </h4>
                        <div className="flex flex-col space-y-1">
                          {results.research_gaps_identified.map((gap: string, index: number) => (
                            <Badge key={index} variant="outline" className="bg-white/70 text-orange-700 border-orange-200 text-left whitespace-normal h-auto py-1.5 px-2.5">
                              <div className="prose prose-xs max-w-none text-orange-700">
                                <ReactMarkdown>{gap}</ReactMarkdown>
                              </div>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Resumo Executivo */}
              {results && results.executive_summary && (
                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-green-500 bg-white mb-6 shadow-md">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 to-emerald-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-lg flex items-center text-green-800">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Resumo Executivo
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium text-green-700">
                        Síntese principal dos achados
                      </span>
                      <BookOpen className="h-4 w-4 text-green-700" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
                      <ReactMarkdown>{results.executive_summary || ''}</ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Clinical Implications Card */}
              {results && !isFallbackResult(results) && results.clinical_implications && results.clinical_implications.length > 0 && (
                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 mt-8 border-l-4 border-green-500 bg-green-50">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 to-emerald-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-lg flex items-center text-green-800">
                      <Lightbulb className="h-5 w-5 mr-2" />
                      Implicações Clínicas
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium text-green-700">
                        {results.clinical_implications.length} implicação(ões) identificada(s)
                      </span>
                      <Target className="h-4 w-4 text-green-700" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <ul className="space-y-3 list-none pl-0">
                      {results.clinical_implications.map((implication: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-gray-700 leading-relaxed">
                            <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{implication}</ReactMarkdown></div>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              {/* Achados por Tema */}
              {results.key_findings_by_theme && results.key_findings_by_theme.length > 0 && (
                <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 to-emerald-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <CardHeader className="relative z-10">
                    <CardTitle className="text-lg flex items-center text-green-800">
                      <Target className="h-5 w-5 mr-2 text-green-600" />
                      Achados por Tema
                    </CardTitle>
                    <CardDescription>
                      Evidências organizadas por temas principais identificados na literatura
                    </CardDescription>
                    <div className="flex items-center space-x-2 mt-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium text-green-700">
                        {results.key_findings_by_theme.length} tema(s) identificado(s)
                      </span>
                      <BookOpen className="h-4 w-4 text-green-700" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="space-y-6">
                      {results.key_findings_by_theme.map((theme, index) => (
                        <div key={index} className="border-l-4 border-l-green-400 border border-gray-200 rounded-lg overflow-hidden">
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
                                  variant="outline"
                                  className={`${getEvidenceStrengthColor(theme.strength_of_evidence)} font-medium`}
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
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                  <span className="text-sm text-gray-700 leading-relaxed">
                                    <div className="prose prose-sm max-w-none text-gray-700"><ReactMarkdown>{finding}</ReactMarkdown></div>
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
                                <div className="prose prose-sm max-w-none text-indigo-700"><ReactMarkdown>
                                  {theme.evidence_appraisal_notes || ''}
                                </ReactMarkdown></div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Card para Raciocínio Detalhado Profissional (CoT) */}
              {results && results.professional_detailed_reasoning_cot && (
                <Collapsible open={isReasoningCotOpen} onOpenChange={setIsReasoningCotOpen} className="mb-6">
                  <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-green-500 bg-white shadow-lg">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 to-emerald-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    <CardHeader className="relative z-10 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-xl font-semibold flex items-center text-green-800">
                            <Lightbulb className="mr-2 h-6 w-6 text-green-500" />
                            Processo de raciocínio do assistente
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Análise técnica e processo de raciocínio do assistente.
                          </CardDescription>
                          <div className="flex items-center space-x-2 mt-2">
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                            <span className="text-sm font-medium text-green-700">
                              Cadeia de pensamento detalhada
                            </span>
                            <Brain className="h-4 w-4 text-green-700" />
                          </div>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-9 p-0">
                            <ChevronDown className={`h-5 w-5 transition-transform ${isReasoningCotOpen ? 'rotate-180' : ''}`} />
                            <span className="sr-only">Toggle</span>
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="relative z-10 pt-0">
                        <div className="prose prose-base max-w-none text-gray-800 bg-green-50 p-4 rounded-md border border-green-100" style={{lineHeight: '1.7', letterSpacing: '0.01em'}}><ReactMarkdown>
                          {results.professional_detailed_reasoning_cot || ''}
                        </ReactMarkdown></div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              )}

              {/* Referências*/}
              {(() => {
                // Prefer all_analyzed_references if present, else relevant_references
                const allRefs = (results as any).all_analyzed_references || results.relevant_references;
                console.log('DEBUG: results.relevant_references:', results.relevant_references);
                console.log('DEBUG: allRefs:', allRefs);
                // Accept references with at least title or url
                const filteredReferences = Array.isArray(allRefs)
                  ? allRefs.filter(ref => ref && (
                      (typeof ref.title === 'string' && ref.title.trim() !== '') ||
                      (typeof ref.url === 'string' && ref.url.trim() !== '')
                    ))
                  : [];

                // Deduplicate by DOI, then PMID, then URL, then title
                const seen = new Set<string>();
                const dedupedReferences = filteredReferences.filter(ref => {
                  const key =
                    (typeof ref.doi === 'string' && ref.doi.trim()) ? `doi:${ref.doi.trim().toLowerCase()}` :
                    (typeof ref.pmid === 'string' && ref.pmid.trim()) ? `pmid:${ref.pmid.trim()}` :
                    (typeof ref.url === 'string' && ref.url.trim()) ? `url:${ref.url.trim().toLowerCase()}` :
                    (typeof ref.title === 'string' && ref.title.trim()) ? `title:${ref.title.trim().toLowerCase()}` :
                    undefined;
                  if (!key) return false;
                  if (seen.has(key)) return false;
                  seen.add(key);
                  return true;
                });
                if (filteredReferences.length > dedupedReferences.length) {
                  console.warn('Referências duplicadas removidas:', filteredReferences.length - dedupedReferences.length);
                }
                console.log('DEBUG: dedupedReferences:', dedupedReferences);
                const sortedReferences = [...dedupedReferences].sort((a: RelevantReference, b: RelevantReference) => ((b.relevance_score ?? b.synthesis_relevance_score ?? 0) - (a.relevance_score ?? a.synthesis_relevance_score ?? 0)));
                if (sortedReferences.length === 0) {
                  console.warn('Nenhuma referência encontrada após filtro! allRefs:', allRefs);
                }
                return (
                  <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 bg-gray-50 border border-gray-200 shadow-sm">
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 to-emerald-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                    <CardHeader className="relative z-10">
                      <CardTitle className="text-xl font-semibold flex items-center text-gray-800">
                        <BookOpen className="h-5 w-5 mr-3 text-green-700" />
                        Referências Analisadas
                      </CardTitle>
                      <div className="flex items-center space-x-2 mt-2">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-sm font-medium text-green-700">
                          {sortedReferences.length} referência(s) encontrada(s)
                        </span>
                        <Database className="h-4 w-4 text-green-700" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative z-10">
                      <ScrollArea className="h-[400px] p-3 border rounded-md bg-gray-100/50">
                        <div className="space-y-3">
                          {sortedReferences.length === 0 ? (
                            <div className="text-center text-gray-500 text-sm my-4">Nenhuma referência encontrada.</div>
                          ) : sortedReferences.map((ref: RelevantReference, index: number) => (
                            <div key={index} className="p-3 bg-white rounded-lg border border-gray-200">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 pr-4">
                                  <h4 className="font-medium text-gray-900 text-sm leading-snug mb-1">
  <span className="text-primary font-bold">[{(ref.doi && ref.doi.trim()) ? ref.doi : (ref.pmid && ref.pmid.trim()) ? ref.pmid : (typeof index === 'number' ? (index+1) : '-')}]</span> {typeof ref.title === 'string' && ref.title.trim() ? ref.title : 'Título indisponível'}
</h4>
                                  <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-gray-600">
                                    {Array.isArray(ref.authors) && ref.authors.length > 0 ? (
                                        <span>{ref.authors.filter(a => typeof a === 'string').join(', ')}</span>
                                      ) : (
                                        <span className="text-gray-400">Autores desconhecidos</span>
                                      )}
                                    {(ref.journal as string) && (ref.journal as string).trim() ? (
                                      <span className="italic">• {(ref.journal as string)}</span>
                                    ) : null}
                                    {(typeof ref.year === 'number' || (typeof ref.year === 'string' && String(ref.year).trim())) ? (
                                      <span>• {ref.year}</span>
                                    ) : null}
                                    <Badge variant="outline" className="text-xs font-mono border-gray-300 text-gray-600 hover:bg-gray-100 bg-white">{(ref.study_type as string) && (ref.study_type as string).trim() ? (ref.study_type as string) : 'N/A'}</Badge>
                                    <Badge variant="outline" className={`text-xs ${getRelevanceScoreBadgeStyle(ref.relevance_score ?? ref.synthesis_relevance_score)}`}>Relevância: {Number.isFinite(ref.relevance_score ?? ref.synthesis_relevance_score) ? (ref.relevance_score ?? ref.synthesis_relevance_score)!.toFixed(2) : 'N/A'}</Badge>
                                  </div>
                                </div>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  asChild
                                  className="text-xs ml-3 shrink-0"
                                  tabIndex={-1}
                                  type="button"
                                >
                                  <a 
                                    href={generateDirectLink(ref)} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    tabIndex={-1}
                                  >
                                    <span className="flex items-center">
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                      Acessar
                                    </span>
                                  </a>
                                </Button>
                                <Button 
                                  variant="default" 
                                  size="sm" 
                                  className="text-xs ml-2 shrink-0"
                                  title="Analisar este artigo em profundidade (em breve)"
                                  disabled // Placeholder, enable when feature is ready
                                >
                                  <FlaskConical className="h-3 w-3 mr-1" />
                                  Analisar
                                </Button>
                              </div>
                              {ref.snippet_or_abstract && (
                                <Collapsible
                                  open={expandedAbstracts[(ref.reference_id ?? '?').toString()] || false}
                                  onOpenChange={(isOpen) => 
                                    setExpandedAbstracts(prev => ({...prev, [(ref.reference_id ?? '?').toString()]: isOpen}))
                                  }
                                  className="mt-2"
                                >
                                  <CollapsibleTrigger asChild>
                                    <Button variant="default" size="sm" className="text-xs p-0 h-auto text-blue-600 hover:text-blue-800">
                                      <ChevronRight className={`h-3 w-3 mr-1 transition-transform ${expandedAbstracts[(ref.reference_id ?? '?').toString()] ? 'rotate-90' : ''}`} />
                                      {expandedAbstracts[(ref.reference_id ?? '?').toString()] ? 'Ocultar Resumo' : 'Ver Resumo'}
                                    </Button>
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-1">
                                    <div className="prose prose-xs max-w-none text-gray-600 bg-gray-100 p-2 rounded-md border border-gray-200"><ReactMarkdown>
                                      {ref.snippet_or_abstract || ''}
                                    </ReactMarkdown></div>
                                  </CollapsibleContent>
                                </Collapsible>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                );
              })()}

              <Alert className="border-l-4 border-l-yellow-400">
                <Info className="h-4 w-4" />
                <AlertTitle className="text-yellow-800 font-bold">Limitações</AlertTitle>
                <AlertDescription className="text-yellow-700 text-sm leading-relaxed">
                  A síntese é baseada em resultados de busca limitados e não constitui uma revisão sistemática completa. <br/>
                  Ela deve servir como um guia inicial para aprofundar o conhecimento e a compreensão do assunto. <br/>
                  A qualidade das evidências variam de acordo com as fontes encontradas, pois a busca pode não ter capturado toda literatura relevante disponível.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Renderização de resultado: fallback OU resultado normal, nunca ambos */}
          {results && isFallbackResult(results) ? (
            <Alert className="border-l-4 border-l-amber-400 bg-amber-50 mb-4">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              <AlertTitle className="text-amber-800">Resultado de Contingência</AlertTitle>
              <AlertDescription className="text-amber-700 text-sm">
                Não foi possível gerar uma síntese completa devido a um erro ou limitação técnica. Os dados abaixo são parciais ou baseados em fallback. Tente novamente mais tarde ou refine sua pergunta.
              </AlertDescription>
              <section className="mt-4 mb-2">
                <h2 className="font-bold text-lg mb-1">Resumo Executivo</h2>
                <p>{results.executive_summary || "Resumo não disponível."}</p>
              </section>
              <section className="mb-2">
                <h2 className="font-bold text-lg mb-1">Referências Relevantes</h2>
                {(results.relevant_references ?? []).length > 0 ? (
                  <ul>
                    {(results.relevant_references ?? []).map((ref, idx) => (
                      <li key={idx} className="mb-2">
                        <div>
                          <a href={ref.url || "#"} target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                            {ref.title || "Título desconhecido"}
                          </a>
                          {ref.journal && <span> <em>({ref.journal})</em></span>}
                          {ref.year && <span>, {ref.year}</span>}
                        </div>
                        {Array.isArray(ref.authors) && ref.authors.length > 0 && (
                          <div className="text-xs text-gray-700">{ref.authors.join(", ")}</div>
                        )}
                        {ref.snippet_or_abstract && (
                          <div className="text-xs text-gray-600 mt-1">{ref.snippet_or_abstract}</div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Nenhuma referência relevante encontrada.</p>
                )}
              </section>
              <section className="mb-2">
                <h2 className="font-bold text-lg mb-1">Limitações</h2>
                <p>Síntese baseada em resultados de busca limitados, não constitui revisão sistemática completa, qualidade da evidência varia entre as fontes incluídas, busca pode não ter capturado toda literatura relevante disponível</p>
              </section>
            </Alert>
          ) : null}

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