"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Progress } from '@/components/ui/Progress';
import { 
  Library, 
  Search, 
  Filter, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  Brain, 
  Target, 
  Users, 
  CheckCircle, 
  X, 
  ArrowRight,
  Lightbulb,
  Award,
  PlayCircle,
  RefreshCw,
  Eye
} from 'lucide-react';

// Interfaces
interface CognitiveBias {
  id: string;
  name: string;
  category: 'Disponibilidade' | 'Ancoragem' | 'Confirmação' | 'Representatividade' | 'Outros';
  description: string;
  clinicalExample: string;
  mitigationStrategies: string[];
  frequency: 'Muito Comum' | 'Comum' | 'Ocasional' | 'Raro';
  severity: 'Alta' | 'Moderada' | 'Baixa';
  specialties: string[];
  relatedBiases: string[];
}

interface QuizQuestion {
  id: string;
  scenario: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  targetBias: string;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
}

interface Props {
  onBiasSelected?: (biasName: string, description: string) => void;
  onTransferToAnalysis?: (caseScenario: string) => void;
}

// Dados dos vieses cognitivos expandidos
const cognitiveBiases: CognitiveBias[] = [
  {
    id: 'ancoragem',
    name: 'Ancoragem',
    category: 'Ancoragem',
    description: 'Depender excessivamente da primeira informação oferecida ao tomar decisões.',
    clinicalExample: 'Um paciente chega com dor de cabeça e o médico imediatamente pensa em enxaqueca, sem considerar outras causas, pois o último paciente com dor de cabeça tinha enxaqueca.',
    mitigationStrategies: [
      'Sempre gerar múltiplas hipóteses iniciais',
      'Questionar ativamente a primeira impressão',
      'Buscar dados que contrariem o diagnóstico inicial',
      'Usar checklists estruturados'
    ],
    frequency: 'Muito Comum',
    severity: 'Alta',
    specialties: ['Medicina de Emergência', 'Medicina Geral', 'Todas'],
    relatedBiases: ['Fechamento Prematuro', 'Confirmação']
  },
  {
    id: 'disponibilidade',
    name: 'Disponibilidade',
    category: 'Disponibilidade',
    description: 'Superestimar a probabilidade de eventos que são mais fáceis de recordar na memória, muitas vezes porque são recentes ou vívidos.',
    clinicalExample: 'Após diagnosticar um caso raro de vasculite, o médico começa a ver sinais de vasculite em muitos pacientes com sintomas vagos.',
    mitigationStrategies: [
      'Basear decisões em dados epidemiológicos',
      'Manter registros de frequência de diagnósticos',
      'Questionar: "Quando foi a última vez que vi isso?"',
      'Usar ferramentas de apoio à decisão'
    ],
    frequency: 'Muito Comum',
    severity: 'Moderada',
    specialties: ['Medicina de Emergência', 'Diagnóstico', 'Todas'],
    relatedBiases: ['Representatividade', 'Ancoragem']
  },
  {
    id: 'confirmacao',
    name: 'Confirmação',
    category: 'Confirmação',
    description: 'Procurar, interpretar, favorecer e recordar informações que confirmam ou apoiam crenças ou hipóteses preexistentes.',
    clinicalExample: 'Suspeitando de uma infecção bacteriana, o médico foca apenas nos resultados de exames que sugerem infecção, ignorando os que não.',
    mitigationStrategies: [
      'Buscar ativamente evidências contrárias',
      'Fazer a pergunta: "O que me faria mudar de ideia?"',
      'Considerar diagnósticos alternativos',
      'Peer review e second opinion'
    ],
    frequency: 'Muito Comum',
    severity: 'Alta',
    specialties: ['Diagnóstico', 'Medicina Interna', 'Todas'],
    relatedBiases: ['Ancoragem', 'Fechamento Prematuro']
  },
  {
    id: 'fechamento-prematuro',
    name: 'Fechamento Prematuro',
    category: 'Outros',
    description: 'Aceitar um diagnóstico antes que ele tenha sido totalmente verificado.',
    clinicalExample: 'Um paciente com dor abdominal é rapidamente diagnosticado com gastrite sem uma investigação mais aprofundada para outras causas como apendicite ou pancreatite.',
    mitigationStrategies: [
      'Implementar diagnostic timeout',
      'Checklist de verificação antes do fechamento',
      'Questionar: "O que mais poderia ser?"',
      'Aguardar evolução quando possível'
    ],
    frequency: 'Comum',
    severity: 'Alta',
    specialties: ['Medicina de Emergência', 'Medicina Geral', 'Cirurgia'],
    relatedBiases: ['Ancoragem', 'Confirmação']
  },
  {
    id: 'representatividade',
    name: 'Representatividade',
    category: 'Representatividade',
    description: 'Julgar a probabilidade de um evento baseado na similaridade com protótipos mentais, ignorando a prevalência real.',
    clinicalExample: 'Diagnosticar infarto em um jovem atlético porque os sintomas "parecem" com infarto, ignorando a baixa prevalência nessa população.',
    mitigationStrategies: [
      'Considerar sempre a prevalência da doença',
      'Usar teorema de Bayes na prática',
      'Questionar estereótipos',
      'Considerar apresentações atípicas'
    ],
    frequency: 'Comum',
    severity: 'Moderada',
    specialties: ['Cardiologia', 'Medicina de Emergência', 'Diagnóstico'],
    relatedBiases: ['Disponibilidade', 'Ancoragem']
  },
  {
    id: 'atribuicao-fundamental',
    name: 'Erro de Atribuição Fundamental',
    category: 'Outros',
    description: 'Tendência a atribuir comportamentos a características pessoais em vez de fatores situacionais.',
    clinicalExample: 'Assumir que um paciente não aderente é "irresponsável" sem considerar barreiras socioeconômicas ou de acesso.',
    mitigationStrategies: [
      'Explorar fatores contextuais',
      'Evitar julgamentos rápidos',
      'Considerar determinantes sociais de saúde',
      'Empatia e comunicação ativa'
    ],
    frequency: 'Comum',
    severity: 'Moderada',
    specialties: ['Medicina Geral', 'Psiquiatria', 'Todas'],
    relatedBiases: ['Confirmação']
  }
];

// Perguntas do quiz
const quizQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    scenario: 'Um médico vê um paciente de 25 anos com dor torácica. Recentemente atendeu 3 casos de embolia pulmonar em jovens. Imediatamente pensa em EP como principal hipótese, mesmo sabendo que é rara nessa idade.',
    options: [
      'Viés de Ancoragem',
      'Viés de Disponibilidade', 
      'Viés de Confirmação',
      'Viés de Representatividade'
    ],
    correctAnswer: 1,
    explanation: 'Este é um exemplo clássico de viés de disponibilidade. Os casos recentes de EP estão "disponíveis" na memória do médico, fazendo-o superestimar a probabilidade desta condição rara.',
    targetBias: 'disponibilidade',
    difficulty: 'Médio'
  },
  {
    id: 'q2',
    scenario: 'Uma paciente de 70 anos chega com "mal-estar geral". O plantonista, vendo a idade, imediatamente pensa em "síndrome geriátrica" e não investiga causas específicas como infecção urinária ou distúrbios eletrolíticos.',
    options: [
      'Viés de Representatividade',
      'Fechamento Prematuro',
      'Viés de Confirmação',
      'Viés de Ancoragem'
    ],
    correctAnswer: 0,
    explanation: 'O médico está usando o "protótipo" mental de "paciente idoso = síndrome geriátrica", ignorando causas específicas e tratáveis. Este é o viés de representatividade.',
    targetBias: 'representatividade',
    difficulty: 'Difícil'
  }
];

export default function BiasLibraryComponent({ onBiasSelected, onTransferToAnalysis }: Props) {
  const [activeView, setActiveView] = useState<'library' | 'quiz'>('library');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [filteredBiases, setFilteredBiases] = useState<CognitiveBias[]>(cognitiveBiases);
  const [expandedBias, setExpandedBias] = useState<string | null>(null);
  
  // Quiz states
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState<boolean[]>(new Array(quizQuestions.length).fill(false));

  // Aplicar filtros
  useEffect(() => {
    let filtered = cognitiveBiases;

    if (searchTerm) {
      filtered = filtered.filter(bias => 
        bias.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bias.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bias.clinicalExample.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(bias => bias.category === categoryFilter);
    }

    if (severityFilter !== 'all') {
      filtered = filtered.filter(bias => bias.severity === severityFilter);
    }

    setFilteredBiases(filtered);
  }, [searchTerm, categoryFilter, severityFilter]);

  const handleBiasClick = (bias: CognitiveBias) => {
    if (onBiasSelected) {
      onBiasSelected(bias.name, bias.description);
    }
  };

  const handleTransferToAnalysis = (example: string) => {
    if (onTransferToAnalysis) {
      onTransferToAnalysis(example);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'Alta': return 'bg-red-100 text-red-800 border-red-300';
      case 'Moderada': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Baixa': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case 'Muito Comum': return 'bg-purple-100 text-purple-800';
      case 'Comum': return 'bg-blue-100 text-blue-800';
      case 'Ocasional': return 'bg-gray-100 text-gray-800';
      case 'Raro': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Quiz functions
  const handleAnswerSelect = (answerIndex: number) => {
    if (showExplanation) return;
    setSelectedAnswer(answerIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    const isCorrect = selectedAnswer === quizQuestions[currentQuestion].correctAnswer;
    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }
    
    const newAnswered = [...answeredQuestions];
    newAnswered[currentQuestion] = true;
    setAnsweredQuestions(newAnswered);
    
    setShowExplanation(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const resetQuiz = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuizScore(0);
    setQuizCompleted(false);
    setAnsweredQuestions(new Array(quizQuestions.length).fill(false));
  };

  const currentQ = quizQuestions[currentQuestion];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Library className="h-6 w-6 mr-2 text-blue-500" />
          Biblioteca de Vieses Cognitivos Interativa
        </CardTitle>
        <CardDescription>
          Explore vieses cognitivos comuns no diagnóstico clínico, teste seus conhecimentos com quiz interativo e aprenda estratégias de mitigação.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'library' | 'quiz')}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="library" className="flex items-center">
              <Library className="h-4 w-4 mr-2" />
              Biblioteca ({filteredBiases.length})
            </TabsTrigger>
            <TabsTrigger value="quiz" className="flex items-center">
              <Brain className="h-4 w-4 mr-2" />
              Quiz Interativo
            </TabsTrigger>
          </TabsList>

          {/* Tab: Biblioteca */}
          <TabsContent value="library" className="space-y-6">
            {/* Filtros e Busca */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium mb-1 block">Buscar Vieses</label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                  <Input
                    placeholder="Nome, descrição, exemplo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Categoria</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    <SelectItem value="Disponibilidade">Disponibilidade</SelectItem>
                    <SelectItem value="Ancoragem">Ancoragem</SelectItem>
                    <SelectItem value="Confirmação">Confirmação</SelectItem>
                    <SelectItem value="Representatividade">Representatividade</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Severidade</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as severidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as severidades</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Moderada">Moderada</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button 
                  variant="default" 
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                    setSeverityFilter('all');
                  }}
                  className="w-full"
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>
            </div>

            {/* Lista de Vieses */}
            <div className="space-y-4">
              {filteredBiases.map((bias) => (
                <div key={bias.id} className="border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                  <Collapsible open={expandedBias === bias.id} onOpenChange={(open) => setExpandedBias(open ? bias.id : null)}>
                    <CollapsibleTrigger asChild>
                      <div className="p-4 cursor-pointer hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <h3 className="font-semibold text-lg text-gray-900">{bias.name}</h3>
                            <Badge variant="outline" className={getSeverityColor(bias.severity)}>
                              {bias.severity}
                            </Badge>
                            <Badge variant="outline" className={getFrequencyColor(bias.frequency)}>
                              {bias.frequency}
                            </Badge>
                          </div>
                          {expandedBias === bias.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">{bias.description}</p>
                      </div>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <div className="px-4 pb-4 space-y-4 border-t bg-gray-50">
                        {/* Exemplo Clínico */}
                        <div>
                          <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                            <Eye className="h-4 w-4 mr-2 text-blue-500" />
                            Exemplo Clínico
                          </h4>
                          <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                            {bias.clinicalExample}
                          </p>
                        </div>

                        {/* Estratégias de Mitigação */}
                        <div>
                          <h4 className="font-medium text-gray-800 mb-2 flex items-center">
                            <Target className="h-4 w-4 mr-2 text-green-500" />
                            Estratégias de Mitigação
                          </h4>
                          <ul className="space-y-1">
                            {bias.mitigationStrategies.map((strategy, index) => (
                              <li key={index} className="text-sm text-gray-700 flex items-start">
                                <span className="text-green-500 mr-2 mt-1">•</span>
                                <span>{strategy}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Metadados */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h5 className="font-medium text-gray-800 mb-1 flex items-center">
                              <Users className="h-4 w-4 mr-1" />
                              Especialidades Mais Afetadas
                            </h5>
                            <div className="flex flex-wrap gap-1">
                              {bias.specialties.map((specialty, index) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          {bias.relatedBiases.length > 0 && (
                            <div>
                              <h5 className="font-medium text-gray-800 mb-1">Vieses Relacionados</h5>
                              <div className="flex flex-wrap gap-1">
                                {bias.relatedBiases.map((related, index) => (
                                  <Badge key={index} variant="outline" className="text-xs bg-purple-50 text-purple-700">
                                    {related}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t">
                          <Button 
                            size="sm" 
                            onClick={() => handleBiasClick(bias)}
                            className="flex-1"
                          >
                            <ArrowRight className="h-4 w-4 mr-2" />
                            Analisar Casos com Este Viés
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleTransferToAnalysis(bias.clinicalExample)}
                            className="flex-1"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Usar Este Exemplo
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>

            {filteredBiases.length === 0 && (
              <div className="text-center py-8">
                <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum viés encontrado</h3>
                <p className="text-gray-600">Tente ajustar os filtros ou termo de busca.</p>
              </div>
            )}

            {/* Expansão da Biblioteca */}
            <div className="mt-8 p-4 border rounded-md bg-sky-50 border-sky-200">
              <div className="flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-sky-600" />
                <h3 className="text-md font-semibold text-sky-700">Biblioteca em Expansão</h3>
              </div>
              <p className="text-sm text-sky-600 mt-2">
                Esta biblioteca está em constante crescimento. Novos vieses, exemplos e estratégias são adicionados regularmente. 
                Sugestões de casos ou vieses? Entre em contato conosco!
              </p>
            </div>
          </TabsContent>

          {/* Tab: Quiz */}
          <TabsContent value="quiz" className="space-y-6">
            {!quizCompleted ? (
              <div className="space-y-6">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Quiz de Vieses Cognitivos</h3>
                    <span className="text-sm text-gray-600">
                      Pergunta {currentQuestion + 1} de {quizQuestions.length}
                    </span>
                  </div>
                  <Progress value={((currentQuestion + 1) / quizQuestions.length) * 100} />
                </div>

                {/* Question */}
                <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-4">Cenário Clínico:</h4>
                  <p className="text-gray-700 mb-6 leading-relaxed">{currentQ.scenario}</p>
                  
                  <h5 className="font-medium text-gray-900 mb-3">Qual viés cognitivo está presente neste caso?</h5>
                  
                  <div className="space-y-3">
                    {currentQ.options.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => handleAnswerSelect(index)}
                        disabled={showExplanation}
                        className={`w-full p-3 text-left border rounded-lg transition-colors ${
                          selectedAnswer === index
                            ? 'border-purple-500 bg-purple-100'
                            : 'border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                        } ${showExplanation ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                        {option}
                      </button>
                    ))}
                  </div>

                  {!showExplanation && (
                    <Button 
                      onClick={handleSubmitAnswer}
                      disabled={selectedAnswer === null}
                      className="mt-4"
                    >
                      Confirmar Resposta
                    </Button>
                  )}
                </div>

                {/* Explanation */}
                {showExplanation && (
                  <div className={`p-4 rounded-lg border ${
                    selectedAnswer === currentQ.correctAnswer 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="flex items-center mb-2">
                      {selectedAnswer === currentQ.correctAnswer ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      ) : (
                        <X className="h-5 w-5 text-red-600 mr-2" />
                      )}
                      <span className="font-medium">
                        {selectedAnswer === currentQ.correctAnswer ? 'Correto!' : 'Incorreto'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{currentQ.explanation}</p>
                    <p className="text-xs text-gray-600">
                      <strong>Resposta correta:</strong> {currentQ.options[currentQ.correctAnswer]}
                    </p>
                    
                    <Button onClick={handleNextQuestion} className="mt-4">
                      {currentQuestion < quizQuestions.length - 1 ? 'Próxima Pergunta' : 'Finalizar Quiz'}
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              /* Quiz Results */
              <div className="text-center space-y-6">
                <div className="p-8 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg">
                  <Award className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Quiz Completo!</h3>
                  <p className="text-lg text-gray-700 mb-4">
                    Você acertou <strong>{quizScore}</strong> de <strong>{quizQuestions.length}</strong> perguntas
                  </p>
                  
                  <div className="text-lg font-semibold mb-4">
                    Desempenho: {Math.round((quizScore / quizQuestions.length) * 100)}%
                  </div>
                  
                  <div className="text-sm text-gray-600 mb-6">
                    {quizScore === quizQuestions.length ? 
                      '🎉 Excelente! Você domina bem os vieses cognitivos!' :
                      quizScore >= quizQuestions.length * 0.7 ?
                      '👏 Muito bom! Continue praticando para aperfeiçoar.' :
                      '📚 Continue estudando! A prática leva à perfeição.'
                    }
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={resetQuiz}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refazer Quiz
                    </Button>
                    <Button variant="outline" onClick={() => setActiveView('library')}>
                      <Library className="h-4 w-4 mr-2" />
                      Revisar Biblioteca
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 