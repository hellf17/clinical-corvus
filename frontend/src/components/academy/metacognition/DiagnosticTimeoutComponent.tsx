"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Progress } from '@/components/ui/Progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { 
  Zap, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  Brain,
  Target,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Timer,
  TrendingUp,
  Lightbulb,
  FileText,
  Clipboard,
  MessageSquare,
  AlertOctagon,
  Shield,
  Activity,
  Eye
} from 'lucide-react';

// Interfaces
interface DiagnosticTimeoutOutput {
  alternative_diagnoses_to_consider: string[];
  key_questions_to_ask: string[];
  red_flags_to_check: string[];
  next_steps_suggested: string[];
  cognitive_checks: string[];
  timeout_recommendation: string;
}

interface TimeoutTemplate {
  id: string;
  name: string;
  description: string;
  timeMinutes: number;
  prompts: string[];
  category: 'Emergência' | 'Ambulatório' | 'Hospitalar' | 'Especial';
  complexity: 'Básico' | 'Intermediário' | 'Avançado';
  color: string;
}

interface TimeoutSession {
  startTime: Date;
  duration: number;
  template: TimeoutTemplate;
  responses: Record<string, string>;
  completed: boolean;
}

interface Props {
  initialScenario?: string;
  initialDiagnosis?: string;
  onTimeoutCompleted?: (insights: DiagnosticTimeoutOutput) => void;
}

// Templates de Diagnostic Timeout
const timeoutTemplates: TimeoutTemplate[] = [
  {
    id: 'emergency-timeout',
    name: 'Timeout de Emergência',
    description: 'Revisão rápida para situações críticas',
    timeMinutes: 2,
    prompts: [
      'O que mais poderia causar estes sintomas?',
      'Existe algo que ameace a vida que não considerei?',
      'Que exame simples poderia mudar minha conduta?',
      'O paciente está estável para esta abordagem?'
    ],
    category: 'Emergência',
    complexity: 'Básico',
    color: 'bg-cyan-100 text-cyan-800 border-cyan-300'
  },
  {
    id: 'systematic-timeout',
    name: 'Timeout Sistemático',
    description: 'Revisão completa por sistemas',
    timeMinutes: 5,
    prompts: [
      'Revisei todos os sistemas relevantes?',
      'Considerei diagnósticos diferenciais para cada sintoma?',
      'Há sinais físicos que não explorei adequadamente?',
      'Que diagnósticos raros, mas importantes, existem?',
      'A cronologia dos sintomas faz sentido?'
    ],
    category: 'Ambulatório',
    complexity: 'Intermediário',
    color: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  {
    id: 'cognitive-timeout',
    name: 'Timeout Cognitivo',
    description: 'Foco na identificação de vieses',
    timeMinutes: 4,
    prompts: [
      'Que viés cognitivo posso estar aplicando?',
      'Estou sendo influenciado por casos recentes?',
      'Minha primeira impressão está correta?',
      'Que evidências contrariam meu diagnóstico principal?',
      'O que um colega pensaria deste caso?'
    ],
    category: 'Especial',
    complexity: 'Avançado',
    color: 'bg-purple-100 text-purple-800 border-purple-300'
  },
  {
    id: 'complex-timeout',
    name: 'Timeout Complexo',
    description: 'Para casos com múltiplas comorbidades',
    timeMinutes: 7,
    prompts: [
      'Como as comorbidades influenciam a apresentação?',
      'Há interações medicamentosas relevantes?',
      'Considerei fatores sociais e contextuais?',
      'Que especialista consultaria se pudesse?',
      'Há aspectos éticos ou familiares importantes?',
      'Como a idade afeta o diagnóstico diferencial?',
      'Preciso de mais tempo ou informações?'
    ],
    category: 'Hospitalar',
    complexity: 'Avançado',
    color: 'bg-green-100 text-green-800 border-green-300'
  },
  {
    id: 'pediatric-timeout',
    name: 'Timeout Pediátrico',
    description: 'Adaptado para pacientes pediátricos',
    timeMinutes: 4,
    prompts: [
      'Considerei apresentações atípicas da idade?',
      'Os marcos de desenvolvimento são normais?',
      'Como está a dinâmica familiar?',
      'Há questões de crescimento e desenvolvimento?',
      'Considerei abuso ou negligência?'
    ],
    category: 'Especial',
    complexity: 'Intermediário',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  }
];

export default function DiagnosticTimeoutComponent({ 
  initialScenario, 
  initialDiagnosis, 
  onTimeoutCompleted 
}: Props) {
  const { getToken, isLoaded: authIsLoaded } = useAuth();
  
  // Estados principais
  const [selectedTemplate, setSelectedTemplate] = useState<TimeoutTemplate | null>(null);
  const [customDuration, setCustomDuration] = useState<number>(3);
  const [useCustomDuration, setUseCustomDuration] = useState(false);
  
  // Estados de sessão
  const [currentSession, setCurrentSession] = useState<TimeoutSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [sessionResponses, setSessionResponses] = useState<Record<string, string>>({});
  
  // Estados de conteúdo
  const [caseDescription, setCaseDescription] = useState(initialScenario || '');
  const [currentDiagnosis, setCurrentDiagnosis] = useState(initialDiagnosis || '');
  
  // Estados de análise
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DiagnosticTimeoutOutput | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  // Helper function to determine analysis section severity
  const getAnalysisSeverity = (content: string[]) => {
    const hasUrgent = content.some(item => 
      item.toLowerCase().includes('urgente') || 
      item.toLowerCase().includes('crítico') || 
      item.toLowerCase().includes('emergência')
    );
    if (hasUrgent) return 'high';
    
    const hasModerate = content.some(item => 
      item.toLowerCase().includes('importante') || 
      item.toLowerCase().includes('considerar') || 
      item.toLowerCase().includes('atenção')
    );
    if (hasModerate) return 'medium';
    
    return 'low';
  };

  // Helper function to get severity indicator
  const getSeverityIndicator = (severity: string) => {
    switch (severity) {
      case 'high':
        return { color: 'bg-cyan-500', icon: AlertTriangle, text: 'Alto', textColor: 'text-cyan-700' };
      case 'medium':
        return { color: 'bg-yellow-500', icon: Activity, text: 'Moderado', textColor: 'text-yellow-700' };
      default:
        return { color: 'bg-green-500', icon: CheckCircle, text: 'Normal', textColor: 'text-green-700' };
    }
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isRunning, timeRemaining]);

  // Auto-advance prompts during session
  useEffect(() => {
    if (currentSession && isRunning && selectedTemplate) {
      const promptDuration = (selectedTemplate.timeMinutes * 60) / selectedTemplate.prompts.length;
      const totalElapsed = (selectedTemplate.timeMinutes * 60) - timeRemaining;
      const expectedPromptIndex = Math.floor(totalElapsed / promptDuration);
      
      if (expectedPromptIndex !== currentPromptIndex && expectedPromptIndex < selectedTemplate.prompts.length) {
        setCurrentPromptIndex(expectedPromptIndex);
      }
    }
  }, [timeRemaining, currentSession, selectedTemplate, currentPromptIndex, isRunning]);

  const handleTemplateSelect = (template: TimeoutTemplate) => {
    setSelectedTemplate(template);
    setUseCustomDuration(false);
    setError(null);
    setAnalysis(null);
  };

  const handleStartTimeout = () => {
    if (!selectedTemplate && !useCustomDuration) {
      setError('Selecione um template ou configure duração personalizada.');
      return;
    }

    if (!caseDescription.trim()) {
      setError('Descreva o caso clínico antes de iniciar o timeout.');
      return;
    }

    const duration = useCustomDuration ? customDuration : selectedTemplate!.timeMinutes;
    const session: TimeoutSession = {
      startTime: new Date(),
      duration,
      template: selectedTemplate || {
        id: 'custom',
        name: 'Timeout Personalizado',
        description: 'Duração personalizada',
        timeMinutes: customDuration,
        prompts: [
          'O que mais poderia explicar este quadro?',
          'Que dados importantes posso estar perdendo?',
          'Como posso confirmar ou refutar meu diagnóstico?'
        ],
        category: 'Especial',
        complexity: 'Básico',
        color: 'bg-gray-100 text-gray-800 border-gray-300'
      },
      responses: {},
      completed: false
    };

    setCurrentSession(session);
    setTimeRemaining(duration * 60);
    setCurrentPromptIndex(0);
    setSessionResponses({});
    setIsRunning(true);
    setError(null);
  };

  const handlePauseResume = () => {
    setIsRunning(!isRunning);
  };

  const handleStopTimeout = () => {
    setIsRunning(false);
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        completed: true,
        responses: sessionResponses
      });
    }
  };

  const handleResponseChange = (promptIndex: number, response: string) => {
    setSessionResponses(prev => ({
      ...prev,
      [promptIndex]: response
    }));
  };

  const handleNextPrompt = () => {
    if (selectedTemplate && currentPromptIndex < selectedTemplate.prompts.length - 1) {
      setCurrentPromptIndex(prev => prev + 1);
    }
  };

  const handlePreviousPrompt = () => {
    if (currentPromptIndex > 0) {
      setCurrentPromptIndex(prev => prev - 1);
    }
  };

  const generateTimeoutSummary = (): string => {
    if (!currentSession) return '';
    
    const template = currentSession.template;
    const responses = Object.entries(sessionResponses)
      .map(([index, response]) => {
        const promptIndex = parseInt(index);
        const prompt = template.prompts[promptIndex];
        return `**${prompt}**\n${response}\n`;
      })
      .join('\n');
    
    return `**Caso:** ${caseDescription}\n\n**Diagnóstico Inicial:** ${currentDiagnosis}\n\n**Revisão Diagnostic Timeout (${template.name}):**\n\n${responses}`;
  };

  const handleSubmitAnalysis = async () => {
    if (!currentSession) {
      setError('Complete uma sessão de timeout antes de solicitar análise.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    const token = await getToken();
    if (!token) {
      setError('Erro de autenticação. Por favor, faça login novamente.');
      setIsLoading(false);
      return;
    }

    const timeoutSummary = generateTimeoutSummary();
    
    const payload = {
      case_description: caseDescription,
      current_working_diagnosis: currentDiagnosis,
      timeout_reflections: timeoutSummary,
      timeout_metadata: {
        template_id: currentSession.template.id,
        duration_minutes: currentSession.duration,
        completed: currentSession.completed,
        prompts_answered: Object.keys(sessionResponses).length
      }
    };

    try {
      const response = await fetch('/api/clinical-assistant/generate-diagnostic-timeout-translated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          detail: 'Falha ao processar a solicitação.',
          error: 'Erro de conexão com o servidor.' 
        }));
        
        const errorMessage = errorData.error || errorData.detail || errorData.message || 
          `Falha ao analisar timeout diagnóstico (status: ${response.status}).`;
        throw new Error(errorMessage);
      }

      const data: DiagnosticTimeoutOutput = await response.json();
      setAnalysis(data);
      
      // Notificar componente pai
      if (onTimeoutCompleted) {
        onTimeoutCompleted({
          alternative_diagnoses_to_consider: data.alternative_diagnoses_to_consider,
          key_questions_to_ask: data.key_questions_to_ask,
          red_flags_to_check: data.red_flags_to_check,
          next_steps_suggested: data.next_steps_suggested,
          cognitive_checks: data.cognitive_checks,
          timeout_recommendation: data.timeout_recommendation
        });
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.';
      setError(errorMessage);
      console.error("Error in handleSubmitAnalysis:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSession = () => {
    setCurrentSession(null);
    setIsRunning(false);
    setTimeRemaining(0);
    setCurrentPromptIndex(0);
    setSessionResponses({});
    setAnalysis(null);
    setError(null);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    if (!currentSession) return 0;
    const totalSeconds = currentSession.duration * 60;
    const elapsed = totalSeconds - timeRemaining;
    return (elapsed / totalSeconds) * 100;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Emergência': 'bg-cyan-100 text-cyan-800',
      'Ambulatório': 'bg-blue-100 text-blue-800',
      'Hospitalar': 'bg-green-100 text-green-800',
      'Especial': 'bg-purple-100 text-purple-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Básico': return 'bg-green-100 text-green-800';
      case 'Intermediário': return 'bg-yellow-100 text-yellow-800';
      case 'Avançado': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
          <Zap className="h-6 w-6 mr-2 text-cyan-500" />
          Prática de Diagnostic Timeout Interativo
        </CardTitle>
        <CardDescription className="text-gray-600">
          Interrompa seu raciocínio diagnóstico para reconsiderar o caso de forma sistemática. Use templates guiados ou crie sessões personalizadas.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Informações do Caso */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="caseDescription" className="block text-sm font-medium mb-1">
              Descrição do Caso <span className="text-red-500">*</span>
            </label>
            <Textarea
              id="caseDescription"
              placeholder="Descreva o caso clínico que você está avaliando..."
              rows={4}
              value={caseDescription}
              onChange={(e) => setCaseDescription(e.target.value)}
              disabled={isRunning || isLoading}
            />
          </div>
          
          <div>
            <label htmlFor="currentDiagnosis" className="block text-sm font-medium mb-1">
              Diagnóstico/Hipótese Atual
            </label>
            <Input
              id="currentDiagnosis"
              placeholder="Qual seu diagnóstico ou hipótese principal?"
              value={currentDiagnosis}
              onChange={(e) => setCurrentDiagnosis(e.target.value)}
              disabled={isRunning || isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              O diagnóstico que você está considerando antes do timeout
            </p>
          </div>
        </div>

        {/* Seleção de Template ou Duração Custom */}
        {!currentSession && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Configuração do Timeout</h3>
              <Button
                variant="default"
                size="sm"
                onClick={() => setShowGuide(!showGuide)}
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                {showGuide ? 'Ocultar' : 'Como Usar'}
              </Button>
            </div>

            {/* Guia de Uso */}
            {showGuide && (
              <Collapsible open={showGuide}>
                <CollapsibleContent>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">🎯 Como Usar o Diagnostic Timeout</h4>
                    <div className="text-sm text-blue-700 space-y-2">
                      <p><strong>1. Prepare o caso:</strong> Descreva o paciente e sua hipótese diagnóstica atual.</p>
                      <p><strong>2. Escolha um template:</strong> Selecione baseado no contexto (emergência, ambulatório, etc.).</p>
                      <p><strong>3. Durante o timeout:</strong> Responda às perguntas que aparecem na tela.</p>
                      <p><strong>4. Análise final:</strong> Dr. Corvus analisará suas reflexões e sugerirá alternativas.</p>
                      <p><strong>💡 Dica:</strong> Seja honesto e específico nas suas respostas para obter insights valiosos.</p>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Opção: Templates ou Duração Custom */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  !useCustomDuration 
                    ? 'border-cyan-500 bg-cyan-50' 
                    : 'border-gray-200 hover:border-cyan-300'
                }`}
                onClick={() => setUseCustomDuration(false)}
              >
                <div className="flex items-center mb-2">
                  <input 
                    type="radio" 
                    checked={!useCustomDuration} 
                    onChange={() => setUseCustomDuration(false)}
                    className="mr-2"
                  />
                  <FileText className="h-4 w-4 mr-2 text-cyan-500" />
                  <span className="font-medium">Templates Estruturados</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Protocolos testados com perguntas específicas para diferentes contextos clínicos.
                </p>
              </div>
              
              <div 
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  useCustomDuration 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-purple-300'
                }`}
                onClick={() => setUseCustomDuration(true)}
              >
                <div className="flex items-center mb-2">
                  <input 
                    type="radio" 
                    checked={useCustomDuration} 
                    onChange={() => setUseCustomDuration(true)}
                    className="mr-2"
                  />
                  <Timer className="h-4 w-4 mr-2 text-purple-500" />
                  <span className="font-medium">Duração Personalizada</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Configure o tempo do timeout conforme sua necessidade específica.
                </p>
              </div>
            </div>

            {/* Templates */}
            {!useCustomDuration && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {timeoutTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedTemplate?.id === template.id
                        ? 'border-cyan-500 bg-cyan-50'
                        : 'border-gray-200 hover:border-cyan-300'
                    }`}
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{template.name}</h4>
                      {selectedTemplate?.id === template.id && (
                        <CheckCircle className="h-4 w-4 text-cyan-500 flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={getCategoryColor(template.category)}>
                        {template.category}
                      </Badge>
                      <Badge variant="outline" className={getComplexityColor(template.complexity)}>
                        {template.complexity}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {template.timeMinutes}min
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-2">{template.description}</p>
                    <p className="text-xs text-gray-500">{template.prompts.length} perguntas guiadas</p>
                  </div>
                ))}
              </div>
            )}

            {/* Duração Personalizada */}
            {useCustomDuration && (
              <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                <h4 className="font-medium text-purple-800 mb-3">⏱️ Configuração Personalizada</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Duração (minutos)</label>
                    <Select value={customDuration.toString()} onValueChange={(value) => setCustomDuration(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a duração" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 minuto</SelectItem>
                        <SelectItem value="2">2 minutos</SelectItem>
                        <SelectItem value="3">3 minutos</SelectItem>
                        <SelectItem value="4">4 minutos</SelectItem>
                        <SelectItem value="5">5 minutos</SelectItem>
                        <SelectItem value="7">7 minutos</SelectItem>
                        <SelectItem value="10">10 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <div className="text-sm text-purple-700">
                      <p><strong>Sugestão:</strong></p>
                      <p>• 1-2min: Emergência</p>
                      <p>• 3-5min: Ambulatório</p>
                      <p>• 7-10min: Casos complexos</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Botão Iniciar */}
            <div className="flex justify-center">
              <Button 
                onClick={handleStartTimeout}
                disabled={(!selectedTemplate && !useCustomDuration) || !caseDescription.trim()}
                size="lg"
                className="px-8"
              >
                <Play className="mr-2 h-5 w-5" />
                Iniciar Diagnostic Timeout
              </Button>
            </div>
          </div>
        )}

        {/* Sessão Ativa */}
        {currentSession && (
          <div className="space-y-6">
            {/* Timer e Controles */}
            <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-cyan-800">
                  {currentSession.template.name}
                </h3>
                <div className="flex items-center space-x-2">
                  <div className="text-2xl font-mono font-bold text-cyan-700">
                    {formatTime(timeRemaining)}
                  </div>
                  <Badge variant="outline" className={timeRemaining > 30 ? 'bg-cyan-50 text-cyan-700' : 'bg-red-50 text-red-700'}>
                    {timeRemaining > 0 ? 'Ativo' : 'Finalizado'}
                  </Badge>
                </div>
              </div>
              
              <Progress value={getProgressPercentage()} className="mb-4" />
              
              <div className="flex items-center justify-between">
                <div className="text-sm text-cyan-700">
                  Pergunta {currentPromptIndex + 1} de {currentSession.template.prompts.length}
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handlePauseResume}
                    disabled={timeRemaining === 0}
                  >
                    {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={handleStopTimeout}
                    disabled={timeRemaining === 0}
                  >
                    <AlertOctagon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Prompt Atual */}
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-blue-800">
                  {currentSession.template.prompts[currentPromptIndex]}
                </h4>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handlePreviousPrompt}
                    disabled={currentPromptIndex === 0}
                  >
                    ←
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleNextPrompt}
                    disabled={currentPromptIndex >= currentSession.template.prompts.length - 1}
                  >
                    →
                  </Button>
                </div>
              </div>
              
              <Textarea
                placeholder="Anote suas reflexões sobre esta pergunta..."
                rows={4}
                value={sessionResponses[currentPromptIndex] || ''}
                onChange={(e) => handleResponseChange(currentPromptIndex, e.target.value)}
                className="bg-white"
              />
              
              <div className="mt-3 text-xs text-blue-600">
                💡 <strong>Dica:</strong> Seja específico e honesto. Considere o que você normalmente não pensaria.
              </div>
            </div>

            {/* Resumo das Respostas */}
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Ver Todas as Respostas ({Object.keys(sessionResponses).length}/{currentSession.template.prompts.length})
                  </span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 mt-3">
                {currentSession.template.prompts.map((prompt, index) => (
                  <div key={index} className="p-3 border rounded-lg bg-gray-50">
                    <h5 className="font-medium text-sm text-gray-800 mb-1">
                      {index + 1}. {prompt}
                    </h5>
                    <p className="text-sm text-gray-600">
                      {sessionResponses[index] || <em>Ainda não respondida</em>}
                    </p>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>

            {/* Ações da Sessão */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleSubmitAnalysis}
                disabled={isLoading || !currentSession || !currentSession.template.prompts.every((_, idx) => sessionResponses[idx] && sessionResponses[idx].trim().length > 0)}
                className="flex-1"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="relative mr-2">
                      <div className="w-4 h-4 border-2 border-cyan-200 rounded-full animate-spin">
                        <div className="absolute top-0 left-0 w-4 h-4 border-2 border-cyan-600 rounded-full animate-pulse border-t-transparent"></div>
                      </div>
                    </div>
                    Analisando com Dr. Corvus...
                  </div>
                ) : (
                  <>
                    <Brain className="mr-2 h-4 w-4" />
                    Analisar Timeout
                  </>
                )}
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={handleClearSession}
                disabled={isLoading}
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Nova Sessão
              </Button>
            </div>
          </div>
        )}

        {/* Exibição de Erro */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro no Timeout</AlertTitle>
            <AlertDescription className="mt-2">
              {error}
              <br />
              <span className="text-sm mt-2 block">
                Verifique se todos os campos necessários estão preenchidos e tente novamente.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {isLoading && !analysis && (
          <div className="mt-6 flex flex-col items-center justify-center py-12 space-y-6 animate-fade-in">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-cyan-200 rounded-full animate-spin">
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-600 rounded-full animate-pulse border-t-transparent"></div>
              </div>
              <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-cyan-600 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-gray-700 animate-pulse">Dr. Corvus está analisando seu timeout...</p>
              <p className="text-sm text-gray-500">Identificando diagnósticos alternativos e verificações cognitivas</p>
            </div>
            <div className="w-80 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse transition-all duration-1000" style={{ width: '75%' }}></div>
            </div>
          </div>
        )}

        {/* Resultados da Análise */}
        {analysis && (
          <div className="mt-8 space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-cyan-800 to-blue-600 bg-clip-text text-transparent">
                Análise do Diagnostic Timeout
              </h3>
              <p className="text-gray-600">Insights do Dr. Corvus sobre seu processo de timeout diagnóstico</p>
              <div className="flex items-center justify-center space-x-2 mt-4">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="text-sm text-gray-500">Análise completa de alternativas e verificações</span>
              </div>
            </div>

            {/* Diagnósticos Alternativos */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-purple-400">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/3 to-blue-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <CardContent className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-xl font-semibold text-purple-800">Diagnósticos Alternativos</h4>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-purple-500" />
                      <span className="text-sm font-medium text-purple-700">
                        {analysis.alternative_diagnoses_to_consider.length} alternativa(s)
                      </span>
                      <Brain className="h-4 w-4 text-purple-700" />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSectionExpansion('alternatives')}
                    className="hover:bg-purple-50 transition-colors"
                  >
                    <span className="text-sm mr-2">
                      {expandedSections['alternatives'] ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedSections['alternatives'] ? 'rotate-180' : ''}`} />
                  </Button>
                </div>

                <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-l-4 border-purple-400 rounded-r-lg">
                  <p className="font-semibold text-purple-800 mb-2 flex items-center">
                    <Eye className="h-4 w-4 mr-2" />
                    Considerações Diagnósticas:
                  </p>
                  <p className="text-purple-700 leading-relaxed">
                    Alternativas identificadas durante o timeout diagnóstico
                  </p>
                </div>

                <Collapsible open={expandedSections['alternatives']} onOpenChange={() => toggleSectionExpansion('alternatives')}>
                  <CollapsibleContent className="space-y-0 overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                    <ul className="space-y-3">
                      {analysis.alternative_diagnoses_to_consider.map((diagnosis, index) => (
                        <li key={index} className="p-3 bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-400 rounded-r-lg">
                          <div className="flex items-start">
                            <ArrowRight className="h-4 w-4 mr-3 mt-0.5 text-purple-500 flex-shrink-0" />
                            <p className="text-purple-700 leading-relaxed">{diagnosis}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Cognitive Checks */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-cyan-400">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/3 to-red-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <CardContent className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-xl font-semibold text-cyan-800">Verificações Cognitivas Importantes</h4>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-cyan-500" />
                      <span className="text-sm font-medium text-cyan-700">
                        {analysis.cognitive_checks.length} verificação(ões)
                      </span>
                      <AlertTriangle className="h-4 w-4 text-cyan-700" />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSectionExpansion('cognitive')}
                    className="hover:bg-cyan-50 transition-colors"
                  >
                    <span className="text-sm mr-2">
                      {expandedSections['cognitive'] ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedSections['cognitive'] ? 'rotate-180' : ''}`} />
                  </Button>
                </div>

                <div className="mb-4 p-4 bg-gradient-to-r from-cyan-50 to-cyan-100 border-l-4 border-cyan-400 rounded-r-lg">
                  <p className="font-semibold text-cyan-800 mb-2 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Pontos de Verificação:
                  </p>
                  <p className="text-cyan-700 leading-relaxed">
                    Verificações cognitivas críticas identificadas
                  </p>
                </div>

                <Collapsible open={expandedSections['cognitive']} onOpenChange={() => toggleSectionExpansion('cognitive')}>
                  <CollapsibleContent className="space-y-0 overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                    <ul className="space-y-3">
                      {analysis.cognitive_checks.map((check, index) => (
                        <li key={index} className="p-3 bg-gradient-to-r from-cyan-50 to-red-50 border-l-4 border-cyan-400 rounded-r-lg">
                          <div className="flex items-start">
                            <span className="text-cyan-500 mr-3 mt-1 text-lg">⚠</span>
                            <p className="text-cyan-700 leading-relaxed">{check}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Perguntas Adicionais */}
            <div className="p-6 border rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 shadow-sm">
              <h4 className="text-xl font-semibold text-blue-800 mb-4 flex items-center">
                <MessageSquare className="h-6 w-6 mr-3 text-blue-600" />
                Perguntas a Serem Consideradas
              </h4>
              <ul className="space-y-3">
                {analysis.key_questions_to_ask.map((question, index) => (
                  <li key={index} className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-r-lg">
                    <div className="flex items-start">
                      <span className="text-blue-500 mr-3 mt-1 text-lg">❓</span>
                      <p className="text-blue-700 leading-relaxed">{question}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Proximos Passos */}
            <div className="p-6 border rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 shadow-sm">
              <h4 className="text-xl font-semibold text-green-800 mb-4 flex items-center">
                <Clipboard className="h-6 w-6 mr-3 text-green-600" />
                Próximos Passos
              </h4>
              <ul className="space-y-3">
                {analysis.next_steps_suggested.map((test, index) => (
                  <li key={index} className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-r-lg">
                    <div className="flex items-start">
                      <CheckCircle className="h-4 w-4 mr-3 mt-0.5 text-green-500 flex-shrink-0" />
                      <p className="text-green-700 leading-relaxed">{test}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Red Flags */}
            <div className="p-6 border rounded-xl bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-400 shadow-sm">
              <h4 className="text-xl font-semibold text-red-800 mb-4 flex items-center">
                <AlertOctagon className="h-6 w-6 mr-3 text-red-600" />
                Red Flags a Considerar
              </h4>
              <ul className="space-y-3">
                {analysis.red_flags_to_check.map((flag, index) => (
                  <li key={index} className="p-3 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-400 rounded-r-lg">
                    <div className="flex items-start">
                      <span className="text-red-500 mr-3 mt-1 text-lg">🚩</span>
                      <p className="text-red-700 leading-relaxed">{flag}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recomendações de Timeout */}
            <div className="p-6 border rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-400 shadow-sm">
              <h4 className="text-xl font-semibold text-emerald-800 mb-4 flex items-center">
                <TrendingUp className="h-6 w-6 mr-3 text-emerald-600" />
                Recomendações de Timeout
              </h4>
              <p className="text-emerald-700 leading-relaxed">{analysis.timeout_recommendation}</p>
            </div>

            {/* Disclaimer */}
            <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center mb-2">
                <Shield className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Aviso Importante</span>
              </div>
              <p className="text-xs italic text-gray-600 leading-relaxed">
                As recomendações de timeout não substituem a avaliação médica real. Nossos recursos visam auxiliar o processo de tomada de decisão e raciocínio diagnóstico, devendo ser utilizados como ferramenta de apoio complementar.
              </p>
            </div>
          </div>
        )}

        {/* Helper quando não há sessão ativa */}
        {!currentSession && !analysis && !error && (
          <div className="mt-6 p-6 border rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200 shadow-sm">
            <div className="flex items-center mb-3">
              <HelpCircle className="h-6 w-6 mr-3 text-cyan-600" />
              <h3 className="text-lg font-semibold text-cyan-700">Pronto para o Timeout?</h3>
            </div>
            <p className="text-cyan-600 leading-relaxed">
              Configure seu caso e escolha um template. O diagnostic timeout ajudará você a reconsiderar o diagnóstico de forma sistemática e identificar pontos cegos no seu raciocínio clínico.
            </p>
            <div className="mt-4 flex items-center text-sm text-cyan-500">
              <Lightbulb className="h-4 w-4 mr-2" />
              <span>Dica: Seja honesto sobre seu processo de raciocínio durante o timeout</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 