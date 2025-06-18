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
  MessageCircle
} from 'lucide-react';

// Interfaces
interface ReasoningCritiqueOutput {
  metacognitive_analysis: string;
  reasoning_strengths: string[];
  cognitive_biases_identified: string[];
  areas_for_improvement: string[];
  specific_recommendations: string[];
  self_correction_strategies: string[];
  disclaimer: string;
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

    let reflectionText = '';
    
    if (reflectionMode === 'guided') {
      if (!reasoningDescription.trim()) {
        setError('Por favor, descreva seu processo de raciocínio.');
        setIsLoading(false);
        return;
      }
      reflectionText = `${caseContext ? `Contexto: ${caseContext}\n\n` : ''}Processo de raciocínio: ${reasoningDescription}`;
    } else if (reflectionMode === 'structured') {
      if (!selectedTemplate) {
        setError('Por favor, selecione um template de reflexão.');
        setIsLoading(false);
        return;
      }
      reflectionText = generateStructuredReflection();
    } else if (reflectionMode === 'example') {
      if (!selectedExample) {
        setError('Por favor, selecione um exemplo para análise.');
        setIsLoading(false);
        return;
      }
      reflectionText = `Contexto: ${selectedExample.scenario}\n\nProcesso de raciocínio: ${selectedExample.reasoningDescription}`;
    }

    const token = await getToken();
    if (!token) {
      setError('Erro de autenticação. Por favor, faça login novamente.');
      setIsLoading(false);
      return;
    }

    const payload = {
      reasoning_description: reflectionText,
      case_context_optional: useContextualCase ? caseContext : undefined,
      reflection_metadata: {
        mode: reflectionMode,
        template_id: selectedTemplate?.id,
        example_id: selectedExample?.id,
        bias_context: initialBiasName
      }
    };

    try {
      const response = await fetch('/api/clinical-assistant/assist-self-reflection-reasoning', {
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
      setAnalysis(data);
      
      // Notificar componente pai
      if (onInsightsGenerated) {
        onInsightsGenerated({
          strengths: data.reasoning_strengths,
          biases: data.cognitive_biases_identified,
          improvements: data.areas_for_improvement
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <UserCheck className="h-6 w-6 mr-2 text-purple-500" />
          Ferramenta de Auto-Reflexão Avançada
        </CardTitle>
        <CardDescription>
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
              {initialBiasName && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  Contexto: {initialBiasName}
                </Badge>
              )}
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
                    variant="outline"
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
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analisando...
              </>
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

        {/* Resultados da Análise */}
        {analysis && (
          <div className="mt-8 space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Análise Metacognitiva Personalizada</h3>

            {/* Análise Metacognitiva */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-3">
                <Brain className="h-6 w-6 text-blue-600 mr-2" />
                <h4 className="font-semibold text-blue-800">Análise Metacognitiva</h4>
              </div>
              <p className="text-blue-700 leading-relaxed">{analysis.metacognitive_analysis}</p>
            </div>

            {/* Pontos Fortes do Raciocínio */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Pontos Fortes do seu Raciocínio
              </h4>
              <ul className="space-y-2">
                {analysis.reasoning_strengths.map((strength, index) => (
                  <li key={index} className="text-green-700 flex items-start">
                    <span className="text-green-500 mr-2 mt-1">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Vieses Cognitivos Identificados */}
            {analysis.cognitive_biases_identified.length > 0 && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <h4 className="font-semibold text-orange-800 mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Vieses Cognitivos Identificados
                </h4>
                <ul className="space-y-2">
                  {analysis.cognitive_biases_identified.map((bias, index) => (
                    <li key={index} className="text-orange-700 flex items-start">
                      <span className="text-orange-500 mr-2 mt-1">⚠</span>
                      <span>{bias}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Áreas para Melhoria */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Áreas para Desenvolvimento
              </h4>
              <ul className="space-y-2">
                {analysis.areas_for_improvement.map((area, index) => (
                  <li key={index} className="text-blue-700 flex items-start">
                    <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-blue-500 flex-shrink-0" />
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recomendações Específicas */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="font-semibold text-purple-800 mb-3 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Recomendações Específicas
              </h4>
              <ul className="space-y-2">
                {analysis.specific_recommendations.map((recommendation, index) => (
                  <li key={index} className="text-purple-700 flex items-start">
                    <span className="text-purple-500 mr-2 mt-1">🎯</span>
                    <span>{recommendation}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Estratégias de Auto-Correção */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <h4 className="font-semibold text-emerald-800 mb-3 flex items-center">
                <RefreshCw className="h-4 w-4 mr-2" />
                Estratégias de Auto-Correção
              </h4>
              <ul className="space-y-2">
                {analysis.self_correction_strategies.map((strategy, index) => (
                  <li key={index} className="text-emerald-700 flex items-start">
                    <span className="text-emerald-500 mr-2 mt-1">🔄</span>
                    <span>{strategy}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ações de Transferência */}
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
              <Button 
                onClick={() => onTransferToTimeout?.(caseContext, analysis.specific_recommendations)}
                variant="outline"
                className="flex items-center"
              >
                <Clock className="mr-2 h-4 w-4" />
                Praticar Diagnostic Timeout com estes Insights
              </Button>
            </div>

            {/* Disclaimer */}
            <div className="text-xs italic text-muted-foreground p-3 bg-gray-50 rounded-md">
              {analysis.disclaimer}
            </div>
          </div>
        )}

        {/* Helper quando não há resultados */}
        {!analysis && !isLoading && !error && (
          <div className="mt-6 p-4 border rounded-md bg-purple-50 border-purple-200">
            <div className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2 text-purple-600" />
              <h3 className="text-md font-semibold text-purple-700">Pronto para refletir?</h3>
            </div>
            <p className="text-sm text-purple-600 mt-1">
              Escolha um modo de reflexão e descreva seu processo de raciocínio. Dr. Corvus fornecerá uma análise metacognitiva detalhada e personalizada.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 