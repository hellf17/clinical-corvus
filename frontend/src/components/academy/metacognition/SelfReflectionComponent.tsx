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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { 
  UserCheck, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  Brain,
  Target,
  HelpCircle,
  Copy,
  BookOpen,
  Users,
  Clock,
  TrendingUp,
  Lightbulb,
  FileText,
  Clipboard,
  MessageCircle,
  Zap,
  Shield,
  Activity,
  Eye
} from 'lucide-react';

// Interfaces
interface BiasReflectionPoint {
  bias_type: string;
  reflection_question: string;
}

interface ReasoningCritiqueOutput {
  identified_reasoning_pattern: string;
  bias_reflection_points: BiasReflectionPoint[];
  devils_advocate_challenge: string[];
  suggested_next_reflective_action: string[];
}

interface ReflectionTemplate {
  id: string;
  name: string;
  description: string;
  questions: string[];
  category: 'Diagnóstico' | 'Procedimento' | 'Comunicação' | 'Ética' | 'Geral';
  timeEstimate: number;
}

interface ReflectionExample {
  id: string;
  title: string;
  scenario: string;
  reasoningDescription: string;
  category: string;
  complexity: 'Simples' | 'Moderado' | 'Complexo';
  expectedInsights: string[];
}

interface Props {
  initialScenario?: string;
  initialBiasName?: string;
  onInsightsGenerated?: (insights: { strengths: string[]; biases: string[]; improvements: string[] }) => void;
  onTransferToTimeout?: (scenario: string, insights: string[]) => void;
}

// Templates de reflexão estruturada
const reflectionTemplates: ReflectionTemplate[] = [
  {
    id: 'diagnostic-reflection',
    name: 'Reflexão Diagnóstica',
    description: 'Template para análise de processos de diagnóstico médico',
    questions: [
      'Quais foram as primeiras hipóteses que considerei?',
      'Que informações me levaram a essas hipóteses iniciais?',
      'Houve dados que ignorei ou subestimei?',
      'Como minha experiência prévia influenciou meu raciocínio?',
      'Que vieses cognitivos posso ter aplicado?',
      'Se tivesse que refazer, o que faria diferente?'
    ],
    category: 'Diagnóstico',
    timeEstimate: 10
  },
  {
    id: 'procedure-reflection',
    name: 'Reflexão sobre Procedimentos',
    description: 'Para análise de decisões sobre procedimentos e intervenções',
    questions: [
      'Qual foi minha indicação principal para este procedimento?',
      'Considerei adequadamente riscos vs benefícios?',
      'Houve alternativas não-invasivas que não explorei?',
      'Como comuniquei os riscos ao paciente?',
      'Minha técnica foi adequada ao contexto?',
      'Que melhorias posso implementar?'
    ],
    category: 'Procedimento',
    timeEstimate: 8
  },
  {
    id: 'communication-reflection',
    name: 'Reflexão sobre Comunicação',
    description: 'Para análise de interações com pacientes e equipe',
    questions: [
      'Como foi minha comunicação inicial com o paciente?',
      'O paciente pareceu compreender as informações?',
      'Usei linguagem adequada ao nível educacional?',
      'Demonstrei empatia e escuta ativa?',
      'Como lidei com ansiedades ou medos?',
      'Que barreiras comunicacionais identifiquei?'
    ],
    category: 'Comunicação',
    timeEstimate: 7
  },
  {
    id: 'ethical-reflection',
    name: 'Reflexão Ética',
    description: 'Para análise de dilemas éticos e tomada de decisão moral',
    questions: [
      'Quais valores éticos estavam em conflito?',
      'Como equilibrei autonomia vs beneficência?',
      'Considerei adequadamente o contexto cultural?',
      'Houve pressões externas na minha decisão?',
      'Como envolvido outros na tomada de decisão?',
      'A decisão respeitou a dignidade do paciente?'
    ],
    category: 'Ética',
    timeEstimate: 12
  },
  {
    id: 'general-reflection',
    name: 'Reflexão Geral',
    description: 'Template abrangente para qualquer situação clínica',
    questions: [
      'O que aconteceu nesta situação?',
      'Como me senti durante o processo?',
      'Que conhecimentos apliquei?',
      'O que funcionou bem?',
      'O que poderia ter sido melhor?',
      'Que aprendizados levo desta experiência?'
    ],
    category: 'Geral',
    timeEstimate: 6
  }
];

// Exemplos de casos para reflexão
const reflectionExamples: ReflectionExample[] = [
  {
    id: 'chest-pain-example',
    title: 'Dor Torácica em Jovem Atleta',
    scenario: 'Carlos, 28 anos, maratonista, apresentou dor torácica típica durante corrida. Inicialmente pensei em causa muscular devido à idade e perfil atlético. Prescrevi anti-inflamatório e liberação. Paciente retornou em parada cardíaca 2 horas depois.',
    reasoningDescription: 'Meu raciocínio foi: "jovem + atleta = baixa probabilidade de problema cardíaco". Não investiguei adequadamente a história familiar (pai faleceu aos 35 anos, morte súbita). Focei no perfil demográfico em vez dos sintomas específicos. Subestimei apresentações atípicas de condições raras.',
    category: 'Cardiologia',
    complexity: 'Complexo',
    expectedInsights: [
      'Viés de representatividade baseado em estereótipos',
      'Importância da história familiar detalhada',
      'Necessidade de considerar condições raras em populações jovens'
    ]
  },
  {
    id: 'abdominal-pain-example',
    title: 'Dor Abdominal Recorrente',
    scenario: 'Pedro, 35 anos, dor epigástrica há 12 horas irradiando para dorso. Histórico de "gastrite crônica". Rapidamente prescrevi omeprazol pensando em exacerbação da gastrite. Não investiguei adequadamente a irradiação nem considerei outras causas.',
    reasoningDescription: 'Ancorei no histórico conhecido de gastrite. A apresentação clássica (epigástrio + irradiação dorsal) não me alertou para pancreatite. Não questionei se o diagnóstico prévio de "gastrite" estava correto. Fechei o diagnóstico prematuramente.',
    category: 'Gastroenterologia',
    complexity: 'Moderado',
    expectedInsights: [
      'Viés de ancoragem em diagnósticos prévios',
      'Importância de questionar diagnósticos estabelecidos',
      'Valor da semiologia na diferenciação diagnóstica'
    ]
  }
];

// Mapeamento dos tipos de viés do backend para rótulos amigáveis
const biasTypeToLabel: Record<string, string> = {
  ANCHORING: 'Viés de Ancoragem',
  PREMATURE_CLOSURE: 'Fechamento Prematuro',
  CONFIRMATION_BIAS: 'Viés de Confirmação',
  AVAILABILITY: 'Viés de Disponibilidade',
  REPRESENTATIVENESS: 'Viés de Representatividade',
  FUNDAMENTAL_ATTRIBUTION_ERROR: 'Erro de Atribuição Fundamental',
  // Outros vieses podem ser adicionados aqui conforme necessário
};

export default function SelfReflectionComponent({ 
  initialScenario, 
  initialBiasName, 
  onInsightsGenerated, 
  onTransferToTimeout 
}: Props) {
  const { getToken, isLoaded: authIsLoaded } = useAuth();
  
  // Estados principais
  const [reflectionMode, setReflectionMode] = useState<'guided' | 'structured' | 'example'>('guided');
  const [selectedTemplate, setSelectedTemplate] = useState<ReflectionTemplate | null>(null);
  const [selectedExample, setSelectedExample] = useState<ReflectionExample | null>(null);
  
  // Estados de conteúdo
  const [caseContext, setCaseContext] = useState(initialScenario || '');
  const [reasoningDescription, setReasoningDescription] = useState('');
  const [templateAnswers, setTemplateAnswers] = useState<Record<string, string>>({});
  const [useContextualCase, setUseContextualCase] = useState(!!initialScenario);
  
  // Estados de análise
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<ReasoningCritiqueOutput | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  // Helper function to determine analysis section severity
  const getAnalysisSeverity = (content: string) => {
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('crítico') || lowerContent.includes('grave') || lowerContent.includes('urgente')) return 'high';
    if (lowerContent.includes('moderado') || lowerContent.includes('significativo') || lowerContent.includes('importante')) return 'medium';
    return 'low';
  };

  // Helper function to get severity indicator
  const getSeverityIndicator = (severity: string) => {
    switch (severity) {
      case 'high':
        return { color: 'bg-red-500', icon: AlertTriangle, text: 'Alto', textColor: 'text-red-700' };
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

  // Efeitos
  useEffect(() => {
    if (initialScenario) {
      setCaseContext(initialScenario);
      setUseContextualCase(true);
    }
  }, [initialScenario]);

  const handleTemplateSelect = (template: ReflectionTemplate) => {
    setSelectedTemplate(template);
    setTemplateAnswers({});
    setError(null);
    setAnalysis(null);
  };

  const handleExampleSelect = (example: ReflectionExample) => {
    setSelectedExample(example);
    setCaseContext(example.scenario);
    setReasoningDescription(example.reasoningDescription);
    setError(null);
    setAnalysis(null);
  };

  const handleTemplateAnswerChange = (questionIndex: number, answer: string) => {
    setTemplateAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const generateStructuredReflection = (): string => {
    if (!selectedTemplate) return '';
    
    const answers = selectedTemplate.questions.map((question, index) => {
      const answer = templateAnswers[index] || '';
      return `**${question}**\n${answer}\n`;
    }).join('\n');
    
    return `${caseContext ? `**Contexto do Caso:**\n${caseContext}\n\n` : ''}**Reflexão Estruturada (${selectedTemplate.name}):**\n\n${answers}`;
  };

  const handleSubmitReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    let final_reasoning_process = '';
    let final_case_context = useContextualCase ? caseContext : (initialScenario || '');

    if (reflectionMode === 'guided') {
      if (!reasoningDescription.trim()) {
        setError('Por favor, descreva seu processo de raciocínio.');
        setIsLoading(false);
        return;
      }
      final_reasoning_process = reasoningDescription;
    } else if (reflectionMode === 'structured') {
      if (!selectedTemplate) {
        setError('Por favor, selecione um template de reflexão.');
        setIsLoading(false);
        return;
      }
      final_reasoning_process = generateStructuredReflection();
      // O contexto já está em `final_case_context` se `useContextualCase` estiver ativo
    } else if (reflectionMode === 'example') {
      if (!selectedExample) {
        setError('Por favor, selecione um exemplo para análise.');
        setIsLoading(false);
        return;
      }
      final_case_context = selectedExample.scenario;
      final_reasoning_process = selectedExample.reasoningDescription;
    }

    // Garantir que o contexto do caso nunca esteja vazio
    if (!final_case_context.trim()) {
      if (useContextualCase) {
        setError('O contexto do caso é obrigatório quando a opção "Usar Contexto do Caso" está habilitada.');
        setIsLoading(false);
        return;
      } else {
        // Fornecer um valor padrão quando não há contexto
        final_case_context = 'Contexto não especificado';
      }
    }

    if (!final_reasoning_process.trim()) {
      setError('O processo de raciocínio não pode estar vazio.');
      setIsLoading(false);
      return;
    }

    const token = await getToken();
    if (!token) {
      setError('Erro de autenticação. Por favor, faça login novamente.');
      setIsLoading(false);
      return;
    }

    const payload = {
      case_context: final_case_context,
      reasoning_process: final_reasoning_process,
      identified_bias: initialBiasName || '',
      reflection_metadata: {
        mode: reflectionMode,
        template: selectedTemplate?.name || '',
        example: selectedExample?.title || ''
      }
    };

    try {
      const response = await fetch('/api/clinical-assistant/provide-self-reflection-feedback-translated', {
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
          `Falha ao analisar reflexão (status: ${response.status}).`;
        throw new Error(errorMessage);
      }

      const data: ReasoningCritiqueOutput = await response.json();
      
      // Adaptar resposta para o formato esperado pelos componentes de UI
      const adaptedData: ReasoningCritiqueOutput = {
        // Only use fields that actually exist in the API response
        identified_reasoning_pattern: data.identified_reasoning_pattern || '',
        bias_reflection_points: data.bias_reflection_points || [],
        devils_advocate_challenge: data.devils_advocate_challenge || [],
        suggested_next_reflective_action: data.suggested_next_reflective_action || []
      };
      
      setAnalysis(adaptedData);
      
      // Notificar componente pai
      if (onInsightsGenerated) {
        onInsightsGenerated({
          strengths: adaptedData.bias_reflection_points.map(p => `${p.bias_type}: ${p.reflection_question}`),
          biases: adaptedData.devils_advocate_challenge,
          improvements: adaptedData.suggested_next_reflective_action
        });
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.';
      setError(errorMessage);
      console.error("Error in handleSubmitReflection:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearForm = () => {
    setReasoningDescription('');
    setTemplateAnswers({});
    setSelectedTemplate(null);
    setSelectedExample(null);
    setAnalysis(null);
    setError(null);
    if (!initialScenario) {
      setCaseContext('');
      setUseContextualCase(false);
    }
  };

  const copyTemplateToClipboard = () => {
    if (!selectedTemplate) return;
    
    const templateText = selectedTemplate.questions.map((question, index) => 
      `${index + 1}. ${question}\n\n`
    ).join('');
    
    navigator.clipboard.writeText(templateText).then(() => {
      // Feedback visual poderia ser adicionado aqui
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Diagnóstico': 'bg-blue-100 text-blue-800',
      'Procedimento': 'bg-green-100 text-green-800',
      'Comunicação': 'bg-purple-100 text-purple-800',
      'Ética': 'bg-orange-100 text-orange-800',
      'Geral': 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Simples': return 'bg-green-100 text-green-800';
      case 'Moderado': return 'bg-yellow-100 text-yellow-800';
      case 'Complexo': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
          <UserCheck className="h-6 w-6 mr-2 text-purple-500" />
          Ferramenta de Auto-Reflexão Avançada
        </CardTitle>
        <CardDescription className="text-gray-600">
          Reflita sobre seu processo de raciocínio clínico com templates estruturados, exemplos práticos e análise metacognitiva personalizada.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Seleção do Modo de Reflexão */}
        <Tabs value={reflectionMode} onValueChange={(value) => setReflectionMode(value as 'guided' | 'structured' | 'example')}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="guided" className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-2" />
              Reflexão Guiada
            </TabsTrigger>
            <TabsTrigger value="structured" className="flex items-center">
              <FileText className="h-4 w-4 mr-2" />
              Templates Estruturados
            </TabsTrigger>
            <TabsTrigger value="example" className="flex items-center">
              <BookOpen className="h-4 w-4 mr-2" />
              Exemplos Práticos
            </TabsTrigger>
          </TabsList>

          {/* Contexto Opcional do Caso */}
          <div className="mb-6">
            <div className="flex items-center space-x-3 mb-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={useContextualCase}
                  onChange={(e) => setUseContextualCase(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm font-medium">Incluir contexto do caso clínico</span>
              </label>
            </div>
            
            {useContextualCase && (
              <div>
                <label htmlFor="caseContext" className="block text-sm font-medium mb-1">
                  Contexto do Caso Clínico
                </label>
                <Textarea
                  id="caseContext"
                  placeholder="Descreva brevemente o caso clínico que você gostaria de refletir..."
                  rows={3}
                  value={caseContext}
                  onChange={(e) => setCaseContext(e.target.value)}
                  disabled={isLoading || !!initialScenario}
                />
                {initialScenario && (
                  <p className="text-xs text-blue-600 mt-1">
                    Contexto herdado da análise anterior de vieses cognitivos.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tab: Reflexão Guiada */}
          <TabsContent value="guided" className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-800 mb-2">💭 Reflexão Livre e Guiada</h4>
              <p className="text-sm text-blue-700">
                Descreva livremente seu processo de raciocínio. Dr. Corvus analisará aspectos metacognitivos e oferecerá insights personalizados.
              </p>
            </div>
            
            <div>
              <label htmlFor="reasoningDescription" className="block text-sm font-medium mb-1">
                Descrição do Seu Processo de Raciocínio <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="reasoningDescription"
                placeholder="Descreva detalhadamente como você pensou sobre o caso: suas primeiras impressões, hipóteses consideradas, dados que influenciaram suas decisões, incertezas que teve, como se sentiu durante o processo..."
                rows={8}
                value={reasoningDescription}
                onChange={(e) => setReasoningDescription(e.target.value)}
                disabled={isLoading}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                <strong>Dicas para uma boa reflexão:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Inclua seus sentimentos e intuições</li>
                  <li>Descreva momentos de dúvida ou certeza</li>
                  <li>Mencione influências externas (tempo, pressão, outros casos)</li>
                  <li>Identifique pontos onde mudou de opinião</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* Tab: Templates Estruturados */}
          <TabsContent value="structured" className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">📋 Reflexão com Templates Estruturados</h4>
              <p className="text-sm text-green-700">
                Escolha um template adequado ao seu contexto clínico. As perguntas direcionadas ajudam a explorar aspectos específicos do raciocínio.
              </p>
            </div>

            {/* Seleção de Template */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reflectionTemplates.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedTemplate?.id === template.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{template.name}</h4>
                    {selectedTemplate?.id === template.id && (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      ~{template.timeEstimate}min
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-gray-600">{template.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{template.questions.length} perguntas</p>
                </div>
              ))}
            </div>

            {/* Formulário do Template Selecionado */}
            {selectedTemplate && (
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">{selectedTemplate.name}</h4>
                  <Button
                    size="sm"
                    variant="default"
                    onClick={copyTemplateToClipboard}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar Template
                  </Button>
                </div>
                
                <div className="space-y-6">
                  {selectedTemplate.questions.map((question, index) => (
                    <div key={index}>
                      <label className="block text-sm font-medium mb-2">
                        {index + 1}. {question}
                      </label>
                      <Textarea
                        placeholder="Sua reflexão sobre esta pergunta..."
                        rows={3}
                        value={templateAnswers[index] || ''}
                        onChange={(e) => handleTemplateAnswerChange(index, e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab: Exemplos Práticos */}
          <TabsContent value="example" className="space-y-4">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-medium text-purple-800 mb-2">📚 Aprender com Exemplos</h4>
              <p className="text-sm text-purple-700">
                Analise casos reais de outros profissionais. Observe como diferentes vieses cognitivos se manifestam na prática clínica.
              </p>
            </div>

            {/* Lista de Exemplos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reflectionExamples.map((example) => (
                <div
                  key={example.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                    selectedExample?.id === example.id
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => handleExampleSelect(example)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm">{example.title}</h4>
                    {selectedExample?.id === example.id && (
                      <CheckCircle className="h-4 w-4 text-purple-500 flex-shrink-0" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="text-xs">{example.category}</Badge>
                    <Badge variant="outline" className={getComplexityColor(example.complexity)}>
                      {example.complexity}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {example.scenario.substring(0, 120)}...
                  </p>
                  
                  <div className="mt-2">
                    <p className="text-xs text-gray-500">
                      Insights esperados: {example.expectedInsights.length}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Exibição do Exemplo Selecionado */}
            {selectedExample && (
              <div className="border rounded-lg p-4 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <h4 className="font-semibold text-purple-800 mb-3">{selectedExample.title}</h4>
                
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium text-purple-700 mb-1">🏥 Cenário Clínico:</h5>
                    <p className="text-sm text-purple-600 leading-relaxed">{selectedExample.scenario}</p>
                  </div>
                  
                  <div>
                    <h5 className="font-medium text-purple-700 mb-1">🧠 Processo de Raciocínio:</h5>
                    <p className="text-sm text-purple-600 leading-relaxed">{selectedExample.reasoningDescription}</p>
                  </div>

                  <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between text-purple-700 mt-2">
                        <span className="flex items-center">
                          <Lightbulb className="h-4 w-4 mr-2" />
                          Insights Esperados desta Análise
                        </span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3">
                      <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {selectedExample.expectedInsights.map((insight, index) => (
                            <li key={index} className="flex items-start">
                              <span className="mr-2">💡</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button 
            onClick={handleSubmitReflection}
            disabled={isLoading || !authIsLoaded}
            className="flex-1"
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="relative mr-2">
                  <div className="w-4 h-4 border-2 border-purple-200 rounded-full animate-spin">
                    <div className="absolute top-0 left-0 w-4 h-4 border-2 border-purple-600 rounded-full animate-pulse border-t-transparent"></div>
                  </div>
                </div>
                Analisando com Dr. Corvus...
              </div>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Analisar Reflexão
              </>
            )}
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleClearForm}
            disabled={isLoading}
          >
            Limpar
          </Button>
        </div>

        {/* Exibição de Erro */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro na Análise</AlertTitle>
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
              <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin">
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full animate-pulse border-t-transparent"></div>
              </div>
              <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-purple-600 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-gray-700 animate-pulse">Dr. Corvus está realizando análise metacognitiva...</p>
              <p className="text-sm text-gray-500">Identificando padrões de raciocínio e oportunidades de melhoria</p>
            </div>
            <div className="w-80 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-pulse transition-all duration-1000" style={{ width: '75%' }}></div>
            </div>
          </div>
        )}

        {/* Resultados da Análise */}
        {analysis && (
          <div className="mt-8 space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-800 to-blue-600 bg-clip-text text-transparent">
                Análise Metacognitiva Personalizada
              </h3>
              <p className="text-gray-600">Insights profundos sobre seu processo de raciocínio clínico</p>
              <div className="flex items-center justify-center space-x-2 mt-4">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="text-sm text-gray-500">Análise completa de padrões cognitivos</span>
              </div>
            </div>

            {/* Análise Metacognitiva */}
            <div className="p-6 border rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 shadow-sm">
              <div className="flex items-center mb-4">
                <Brain className="h-6 w-6 text-purple-600 mr-3" />
                <h4 className="text-xl font-semibold text-purple-800">Padrão de Raciocínio Identificado</h4>
              </div>
              <p className="text-purple-700 leading-relaxed">{analysis.identified_reasoning_pattern || ''}</p>
            </div>

            {/* Pontos Fortes do Raciocínio */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-green-400">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 to-emerald-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <CardContent className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-xl font-semibold text-green-800">Pontos para Reflexão</h4>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm font-medium text-green-700">
                        {(Array.isArray(analysis.bias_reflection_points) ? analysis.bias_reflection_points : []).length} item(s)
                      </span>
                      <CheckCircle className="h-4 w-4 text-green-700" />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSectionExpansion('reflection_points')}
                    className="hover:bg-green-50 transition-colors"
                  >
                    <span className="text-sm mr-2">
                      {expandedSections['reflection_points'] ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedSections['reflection_points'] ? 'rotate-180' : ''}`} />
                  </Button>
                </div>

                <div className="mb-4 p-4 bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-400 rounded-r-lg">
                  <p className="font-semibold text-green-800 mb-2 flex items-center">
                    <Eye className="h-4 w-4 mr-2" />
                    Reflexões Estratégicas:
                  </p>
                  <p className="text-green-700 leading-relaxed">
                    {(Array.isArray(analysis.bias_reflection_points) ? analysis.bias_reflection_points : []).length} pontos identificados para análise metacognitiva
                  </p>
                </div>

                <Collapsible open={expandedSections['reflection_points']} onOpenChange={() => toggleSectionExpansion('reflection_points')}>
                  <CollapsibleContent className="space-y-0 overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                    <ul className="space-y-3">
                      {(Array.isArray(analysis.bias_reflection_points) ? analysis.bias_reflection_points : []).map((point: BiasReflectionPoint, index: number) => {
                        const biasLabel = biasTypeToLabel[point.bias_type] || point.bias_type;
                        return (
                          <li key={index} className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-r-lg">
                            <div className="flex items-start">
                              <span className="text-green-500 mr-3 mt-1">✓</span>
                              <div>
                                <span className="font-semibold text-green-800">{biasLabel}:</span>
                                <p className="text-green-700 leading-relaxed mt-1">{point.reflection_question}</p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Vieses Cognitivos Identificados */}
            {(analysis.devils_advocate_challenge || []).length > 0 && (
              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-orange-400">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/3 to-red-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <CardContent className="relative z-10 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <h4 className="text-xl font-semibold text-orange-800">Desafios de Raciocínio</h4>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-orange-500" />
                        <span className="text-sm font-medium text-orange-700">
                          {(analysis.devils_advocate_challenge || []).length} desafio(s)
                        </span>
                        <AlertTriangle className="h-4 w-4 text-orange-700" />
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSectionExpansion('challenges')}
                      className="hover:bg-orange-50 transition-colors"
                    >
                      <span className="text-sm mr-2">
                        {expandedSections['challenges'] ? 'Ocultar detalhes' : 'Ver detalhes'}
                      </span>
                      <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedSections['challenges'] ? 'rotate-180' : ''}`} />
                    </Button>
                  </div>

                  <div className="mb-4 p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400 rounded-r-lg">
                    <p className="font-semibold text-orange-800 mb-2 flex items-center">
                      <Target className="h-4 w-4 mr-2" />
                      Pontos de Questionamento:
                    </p>
                    <p className="text-orange-700 leading-relaxed">
                      Aspectos do seu raciocínio que merecem análise mais profunda
                    </p>
                  </div>

                  <Collapsible open={expandedSections['challenges']} onOpenChange={() => toggleSectionExpansion('challenges')}>
                    <CollapsibleContent className="space-y-0 overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                      <ul className="space-y-3">
                        {(analysis.devils_advocate_challenge || []).map((challenge: string, index: number) => (
                          <li key={index} className="p-3 bg-gradient-to-r from-orange-50 to-red-50 border-l-4 border-orange-400 rounded-r-lg">
                            <div className="flex items-start">
                              <span className="text-orange-500 mr-3 mt-1">⚠</span>
                              <p className="text-orange-700 leading-relaxed">{challenge}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>
                  </Collapsible>
                </CardContent>
              </Card>
            )}

            {/* Áreas para Melhoria */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-blue-400">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 to-indigo-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <CardContent className="relative z-10 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <h4 className="text-xl font-semibold text-blue-800">Ações Reflexivas Recomendadas</h4>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium text-blue-700">
                        {(analysis.suggested_next_reflective_action || []).length} recomendação(ões)
                      </span>
                      <TrendingUp className="h-4 w-4 text-blue-700" />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSectionExpansion('actions')}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <span className="text-sm mr-2">
                      {expandedSections['actions'] ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </span>
                    <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedSections['actions'] ? 'rotate-180' : ''}`} />
                  </Button>
                </div>

                <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-400 rounded-r-lg">
                  <p className="font-semibold text-blue-800 mb-2 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Próximos Passos:
                  </p>
                  <p className="text-blue-700 leading-relaxed">
                    Ações específicas para aprimorar seu raciocínio clínico
                  </p>
                </div>

                <Collapsible open={expandedSections['actions']} onOpenChange={() => toggleSectionExpansion('actions')}>
                  <CollapsibleContent className="space-y-0 overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                    <ul className="space-y-3">
                      {(analysis.suggested_next_reflective_action || []).map((action: string, index: number) => (
                        <li key={index} className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-400 rounded-r-lg">
                          <div className="flex items-start">
                            <ArrowRight className="h-4 w-4 mr-3 mt-0.5 text-blue-500 flex-shrink-0" />
                            <p className="text-blue-700 leading-relaxed">{action}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>

            {/* Estratégias de Auto-Correção - Adding this back but using bias_reflection_points in a different way */}
            <div className="p-6 border rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border-l-4 border-emerald-400 shadow-sm">
              <h4 className="text-xl font-semibold text-emerald-800 mb-4 flex items-center">
                <RefreshCw className="h-6 w-6 mr-3 text-emerald-600" />
                Estratégias de Metacognição
              </h4>
              <ul className="space-y-3">
                {(Array.isArray(analysis.bias_reflection_points) ? analysis.bias_reflection_points : []).map((point: BiasReflectionPoint, index: number) => {
                  const biasLabel = biasTypeToLabel[point.bias_type] || point.bias_type;
                  return (
                    <li key={index} className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-l-4 border-emerald-400 rounded-r-lg">
                      <div className="flex items-start">
                        <span className="text-emerald-500 mr-3 mt-1 text-lg">🔄</span>
                        <div>
                          <span className="font-semibold text-emerald-800">{biasLabel}:</span>
                          <p className="text-emerald-700 leading-relaxed mt-1">{point.reflection_question}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Ações de Transferência */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <Button 
                onClick={() => onTransferToTimeout?.(caseContext, analysis.suggested_next_reflective_action)}
                variant="default"
                className="flex items-center bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Clock className="mr-3 h-5 w-5" />
                Praticar Diagnostic Timeout com estes Insights
              </Button>
            </div>

            {/* Disclaimer */}
            <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 rounded-lg shadow-sm">
              <div className="flex items-center mb-2">
                <Shield className="h-4 w-4 mr-2 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Aviso Importante</span>
              </div>
              <p className="text-xs italic text-gray-600 leading-relaxed">
                Esta análise é um apoio ao raciocínio clínico e não substitui o julgamento profissional. Use estas reflexões como ferramenta complementar em sua prática médica.
              </p>
            </div>
          </div>
        )}

        {/* Helper quando não há resultados */}
        {!analysis && !isLoading && !error && (
          <div className="mt-6 p-6 border rounded-xl bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 shadow-sm">
            <div className="flex items-center mb-3">
              <HelpCircle className="h-6 w-6 mr-3 text-purple-600" />
              <h3 className="text-lg font-semibold text-purple-700">Pronto para refletir?</h3>
            </div>
            <p className="text-purple-600 leading-relaxed">
              Escolha um modo de reflexão e descreva seu processo de raciocínio. Dr. Corvus fornecerá uma análise metacognitiva detalhada e personalizada para aprimorar suas habilidades clínicas.
            </p>
            <div className="mt-4 flex items-center text-sm text-purple-500">
              <Lightbulb className="h-4 w-4 mr-2" />
              <span>Dica: Seja específico sobre seus pensamentos e sentimentos durante o caso</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 