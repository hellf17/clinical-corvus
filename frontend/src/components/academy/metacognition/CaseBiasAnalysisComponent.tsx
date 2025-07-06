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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { 
  Search, 
  RefreshCw, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp,
  Brain,
  Target,
  HelpCircle,
  Shuffle,
  RotateCcw,
  BookOpen,
  Users,
  Clock,
  TrendingUp,
  Lightbulb
} from 'lucide-react';

// Interfaces
interface CognitiveBiasCaseAnalysis {
  identified_bias_by_expert: string;
  explanation_of_bias_in_case: string;
  how_bias_impacted_decision: string;
  strategies_to_mitigate_bias: string[];
  feedback_on_user_identification?: string;
  disclaimer: string;
}

interface CaseVignette {
  id: string;
  title: string;
  scenario: string;
  targetBias: string;
  complexity: 'Simples' | 'Moderado' | 'Complexo';
  specialty: string;
  learningObjectives: string[];
  redHerrings?: string[];
  correctDiagnosis?: string;
  timeToSolve?: number;
}

interface Props {
  initialBias?: string;
  initialScenario?: string;
  onBiasIdentified?: (biasData: { biasName: string; strategies: string[] }) => void;
  onTransferToReflection?: (scenario: string, biasName: string) => void;
  onTransferToTimeout?: (scenario: string, diagnosis: string) => void;
}

// Banco de vinhetas clínicas com diferentes vieses
const caseVignettes: CaseVignette[] = [
  {
    id: 'dpoc-ancoragem',
    title: 'Dispneia em DPOC - Viés de Ancoragem',
    scenario: 'Um paciente idoso de 75 anos com histórico conhecido de DPOC grave apresenta-se ao pronto-socorro com dispneia aguda há 6 horas. O médico de plantão, ao ver "DPOC" no prontuário, imediatamente considera exacerbação de DPOC como principal hipótese. Solicita corticoide, broncodilatador e prescreve antibiótico, sem realizar exame físico completo. Durante a reavaliação 2 horas depois, nota-se edema de membros inferiores 3+/4+ bilateral, estase jugular e terceira bulha. O raio-X mostra cardiomegalia e congestão pulmonar.',
    targetBias: 'Ancoragem',
    complexity: 'Moderado',
    specialty: 'Medicina de Emergência',
    learningObjectives: [
      'Reconhecer o viés de ancoragem em diagnósticos baseados no histórico',
      'Importância do exame físico completo',
      'Considerar diagnósticos diferenciais mesmo com histórico sugestivo'
    ],
    redHerrings: ['Histórico de DPOC', 'Sintoma compatível (dispneia)'],
    correctDiagnosis: 'Insuficiência cardíaca descompensada',
    timeToSolve: 3
  },
  {
    id: 'vasculite-disponibilidade',
    title: 'Sintomas Inespecíficos - Viés de Disponibilidade',
    scenario: 'Dra. Silva, reumatologista, diagnosticou dois casos raros de vasculite sistêmica na semana passada. Hoje atende João, 45 anos, com fadiga, febre baixa há 3 semanas e artralgia migratória. Imediatamente pensa em vasculite e solicita FAN, ANCA, biópsia. Os exames vêm normais. Posteriormente descobre-se que João teve contato próximo com pessoa com tuberculose e apresenta PPD fortemente positivo.',
    targetBias: 'Disponibilidade',
    complexity: 'Complexo',
    specialty: 'Reumatologia',
    learningObjectives: [
      'Reconhecer influência de casos recentes na tomada de decisão',
      'Importância de considerar prevalência real das doenças',
      'Valor da anamnese epidemiológica completa'
    ],
    redHerrings: ['Casos recentes similares', 'Sintomas inespecíficos'],
    correctDiagnosis: 'Tuberculose latente/ativa',
    timeToSolve: 4
  },
  {
    id: 'infeccao-confirmacao',
    title: 'Febre e Leucocitose - Viés de Confirmação',
    scenario: 'Maria, 28 anos, chega ao PS com febre há 2 dias e leucocitose (15.000). O plantonista suspeita de infecção bacteriana e solicita hemocultura, prescreve ceftriaxona. Ignora que a paciente menciona "manchas na pele que apareceram hoje" e que teve relação sexual desprotegida recente. Foca apenas nos dados que confirmam infecção: febre, leucócitos elevados. Posteriormente as "manchas" revelam-se exantema de sífilis secundária.',
    targetBias: 'Confirmação',
    complexity: 'Moderado',
    specialty: 'Medicina de Emergência',
    learningObjectives: [
      'Reconhecer busca seletiva por informações confirmatórias',
      'Importância de valorizar todos os dados clínicos',
      'Necessidade de história sexual em casos apropriados'
    ],
    redHerrings: ['Dados laboratoriais sugestivos', 'Apresentação comum'],
    correctDiagnosis: 'Sífilis secundária',
    timeToSolve: 3
  },
  {
    id: 'gastrite-fechamento',
    title: 'Dor Abdominal - Fechamento Prematuro',
    scenario: 'Pedro, 35 anos, dor epigástrica há 12 horas, irradiando para dorso. Relata "sempre ter gastrite". Médico prescreve omeprazol e solicita alta. Pedro retorna 6 horas depois com dor intensa, vômitos e sinais de abdome agudo. Exames revelam amilase 800 U/L.',
    targetBias: 'Fechamento Prematuro',
    complexity: 'Simples',
    specialty: 'Medicina Geral',
    learningObjectives: [
      'Perigos do fechamento diagnóstico sem investigação adequada',
      'Importância de reavaliar quando evolução não é esperada',
      'Valor da irradiação da dor no diagnóstico diferencial'
    ],
    redHerrings: ['Histórico pregresso sugestivo', 'Queixa comum'],
    correctDiagnosis: 'Pancreatite aguda',
    timeToSolve: 2
  },
  {
    id: 'infarto-representatividade',
    title: 'Dor Torácica em Jovem - Viés de Representatividade',
    scenario: 'Carlos, 28 anos, atleta, maratonista, chega com dor torácica típica há 30 min. Médico pensa: "jovem, atlético, não pode ser infarto" e considera apenas causas musculares. Libera com anti-inflamatório. Carlos volta em parada cardíaca 2 horas depois. Histórico familiar revelou morte súbita do pai aos 35 anos por miocardiopatia hipertrófica.',
    targetBias: 'Representatividade',
    complexity: 'Complexo',
    specialty: 'Cardiologia',
    learningObjectives: [
      'Evitar estereótipos baseados em idade/perfil',
      'Importância da história familiar detalhada',
      'Apresentações atípicas de doenças comuns'
    ],
    redHerrings: ['Perfil jovem e saudável', 'Baixa prevalência esperada'],
    correctDiagnosis: 'Síndrome coronariana aguda / Miocardiopatia hipertrófica',
    timeToSolve: 4
  }
];

export default function CaseBiasAnalysisComponent({ 
  initialBias, 
  initialScenario, 
  onBiasIdentified, 
  onTransferToReflection, 
  onTransferToTimeout 
}: Props) {
  const { getToken, isLoaded: authIsLoaded } = useAuth();
  
  // Estados principais
  const [selectedVignette, setSelectedVignette] = useState<CaseVignette | null>(null);
  const [customScenario, setCustomScenario] = useState(initialScenario || '');
  const [userIdentifiedBias, setUserIdentifiedBias] = useState(initialBias || '');
  const [scenarioSource, setScenarioSource] = useState<'vignette' | 'custom'>('vignette');
  
  // Estados de filtros para vinhetas
  const [complexityFilter, setComplexityFilter] = useState<string>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [biasFilter, setBiasFilter] = useState<string>('all');
  
  // Estados de análise
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<CognitiveBiasCaseAnalysis | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Efeitos
  useEffect(() => {
    if (initialScenario) {
      setCustomScenario(initialScenario);
      setScenarioSource('custom');
    }
    if (initialBias) {
      setUserIdentifiedBias(initialBias);
    }
  }, [initialScenario, initialBias]);

  // Filtrar vinhetas disponíveis
  const filteredVignettes = caseVignettes.filter(vignette => {
    if (complexityFilter !== 'all' && vignette.complexity !== complexityFilter) return false;
    if (specialtyFilter !== 'all' && vignette.specialty !== specialtyFilter) return false;
    if (biasFilter !== 'all' && vignette.targetBias !== biasFilter) return false;
    return true;
  });

  // Selecionar vinheta aleatória
  const selectRandomVignette = () => {
    if (filteredVignettes.length > 0) {
      const randomIndex = Math.floor(Math.random() * filteredVignettes.length);
      setSelectedVignette(filteredVignettes[randomIndex]);
      setScenarioSource('vignette');
      setError(null);
      setAnalysis(null);
      setHintsUsed(0);
      setShowHints(false);
    }
  };

  // Obter cenário atual para análise
  const getCurrentScenario = (): string => {
    if (scenarioSource === 'vignette' && selectedVignette) {
      return selectedVignette.scenario;
    }
    return customScenario;
  };

  const handleSubmitAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    const scenario = getCurrentScenario();
    
    if (!scenario.trim()) {
      setError('Por favor, selecione uma vinheta ou insira um cenário personalizado.');
      setIsLoading(false);
      return;
    }

    const token = await getToken();
    if (!token) {
      setError('Erro de autenticação. Por favor, faça login novamente.');
      setIsLoading(false);
      return;
    }

    // Montar payload conforme esperado pelo backend
    const biasPayload = {
      scenario_description: scenario,
      additional_context: selectedVignette ? `Especialidade: ${selectedVignette.specialty}. Complexidade: ${selectedVignette.complexity}. Dicas usadas: ${hintsUsed}.` : undefined,
      user_identified_bias_optional: userIdentifiedBias.trim() || undefined
    };
    // Payload final para o backend
    const payload = biasPayload;

    try {
      const response = await fetch('/api/clinical-assistant/assist-identifying-cognitive-biases-scenario-translated', {
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
          `Falha ao analisar caso com viés (status: ${response.status}).`;
        throw new Error(errorMessage);
      }

      const data: CognitiveBiasCaseAnalysis = await response.json();
      setAnalysis(data);
      
      // Notificar componente pai
      if (onBiasIdentified) {
        onBiasIdentified({
          biasName: data.identified_bias_by_expert,
          strategies: data.strategies_to_mitigate_bias
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

  const handleShowHints = () => {
    setShowHints(true);
    setHintsUsed(prev => prev + 1);
  };

  const handleClearForm = () => {
    setSelectedVignette(null);
    setCustomScenario('');
    setUserIdentifiedBias('');
    setAnalysis(null);
    setError(null);
    setShowHints(false);
    setHintsUsed(0);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Simples': return 'bg-green-100 text-green-800';
      case 'Moderado': return 'bg-yellow-100 text-yellow-800';
      case 'Complexo': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getBiasColor = (bias: string) => {
    const colors: Record<string, string> = {
      'Ancoragem': 'bg-blue-100 text-blue-800',
      'Disponibilidade': 'bg-purple-100 text-purple-800',
      'Confirmação': 'bg-orange-100 text-orange-800',
      'Fechamento Prematuro': 'bg-red-100 text-red-800',
      'Representatividade': 'bg-green-100 text-green-800'
    };
    return colors[bias] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Search className="h-6 w-6 mr-2 text-green-500" />
          Análise de Casos com Vieses Cognitivos
        </CardTitle>
        <CardDescription>
          Analise casos clínicos reais ou personalizados para identificar vieses cognitivos e desenvolver estratégias de mitigação.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmitAnalysis} className="space-y-6">
          {/* Seleção do Tipo de Cenário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                scenarioSource === 'vignette' 
                  ? 'border-green-500 bg-green-50' 
                  : 'border-gray-200 hover:border-green-300'
              }`}
              onClick={() => setScenarioSource('vignette')}
            >
              <div className="flex items-center mb-2">
                <input 
                  type="radio" 
                  name="scenarioSource"
                  checked={scenarioSource === 'vignette'} 
                  onChange={() => setScenarioSource('vignette')}
                  className="mr-2"
                />
                <BookOpen className="h-4 w-4 mr-2 text-green-500" />
                <span className="font-medium">Vinhetas Preparadas</span>
                <Badge variant="outline" className="ml-2 text-xs">{filteredVignettes.length} disponíveis</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Casos clínicos estruturados com vieses específicos e objetivos de aprendizado definidos.
              </p>
            </div>
            
            <div 
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                scenarioSource === 'custom' 
                  ? 'border-purple-500 bg-purple-50' 
                  : 'border-gray-200 hover:border-purple-300'
              }`}
              onClick={() => setScenarioSource('custom')}
            >
              <div className="flex items-center mb-2">
                <input 
                  type="radio" 
                  name="scenarioSource"
                  checked={scenarioSource === 'custom'} 
                  onChange={() => setScenarioSource('custom')}
                  className="mr-2"
                />
                <Brain className="h-4 w-4 mr-2 text-purple-500" />
                <span className="font-medium">Cenário Personalizado</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Insira seu próprio caso clínico para análise de vieses cognitivos.
              </p>
            </div>
          </div>

          {/* Seleção de Vinhetas */}
          {scenarioSource === 'vignette' && (
            <div className="space-y-4">
              {/* Filtros para Vinhetas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="text-sm font-medium mb-1 block">Complexidade</label>
                  <Select value={complexityFilter} onValueChange={setComplexityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="Simples">Simples</SelectItem>
                      <SelectItem value="Moderado">Moderado</SelectItem>
                      <SelectItem value="Complexo">Complexo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Especialidade</label>
                  <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="Medicina de Emergência">Emergência</SelectItem>
                      <SelectItem value="Medicina Geral">Medicina Geral</SelectItem>
                      <SelectItem value="Cardiologia">Cardiologia</SelectItem>
                      <SelectItem value="Reumatologia">Reumatologia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Viés Alvo</label>
                  <Select value={biasFilter} onValueChange={setBiasFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="Ancoragem">Ancoragem</SelectItem>
                      <SelectItem value="Disponibilidade">Disponibilidade</SelectItem>
                      <SelectItem value="Confirmação">Confirmação</SelectItem>
                      <SelectItem value="Fechamento Prematuro">Fechamento Prematuro</SelectItem>
                      <SelectItem value="Representatividade">Representatividade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    variant="default"
                    type="button"
                    onClick={selectRandomVignette}
                    disabled={filteredVignettes.length === 0}
                    className="w-full"
                  >
                    <Shuffle className="h-4 w-4 mr-2" />
                    Caso Aleatório
                  </Button>
                </div>
              </div>

              {/* Lista de Vinhetas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredVignettes.map((vignette) => (
                  <div 
                    key={vignette.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      selectedVignette?.id === vignette.id 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                    onClick={() => setSelectedVignette(vignette)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-sm">{vignette.title}</h4>
                      {selectedVignette?.id === vignette.id && (
                        <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      <Badge variant="outline" className={getComplexityColor(vignette.complexity)}>
                        {vignette.complexity}
                      </Badge>
                      <Badge variant="outline" className={getBiasColor(vignette.targetBias)}>
                        {vignette.targetBias}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {vignette.specialty}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {vignette.scenario.substring(0, 150)}...
                    </p>
                    
                    {vignette.timeToSolve && (
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        ~{vignette.timeToSolve} min para análise
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredVignettes.length === 0 && (
                <div className="text-center py-6">
                  <HelpCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Nenhuma vinheta corresponde aos filtros selecionados.</p>
                </div>
              )}
            </div>
          )}

          {/* Cenário Personalizado */}
          {scenarioSource === 'custom' && (
            <div>
              <label htmlFor="customScenario" className="block text-sm font-medium mb-1">
                Descrição do Caso Clínico <span className="text-red-500">*</span>
              </label>
              <Textarea 
                id="customScenario"
                placeholder="Descreva detalhadamente o caso clínico, incluindo: apresentação do paciente, processo de raciocínio médico, decisões tomadas e desfecho..."
                rows={6}
                value={customScenario}
                onChange={(e) => setCustomScenario(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Dica:</strong> Inclua detalhes sobre o raciocínio médico, dados considerados/ignorados e decisões tomadas
              </p>
            </div>
          )}

          {/* Exibição do Cenário Selecionado */}
          {scenarioSource === 'vignette' && selectedVignette && (
            <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-blue-800">{selectedVignette.title}</h4>
                <div className="flex space-x-2">
                  <Badge className={getComplexityColor(selectedVignette.complexity)}>
                    {selectedVignette.complexity}
                  </Badge>
                  <Badge className={getBiasColor(selectedVignette.targetBias)}>
                    {selectedVignette.targetBias}
                  </Badge>
                </div>
              </div>
              
              <div className="text-sm text-blue-700 leading-relaxed mb-4">
                {selectedVignette.scenario}
              </div>

              {/* Sistema de Dicas */}
              {!showHints && (
                <div className="flex items-center justify-between pt-3 border-t border-blue-200">
                  <div className="text-xs text-blue-600">
                    Caso precise de ajuda, use o sistema de dicas.
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    type="button"
                    onClick={handleShowHints}
                    className="text-blue-600 border-blue-300"
                  >
                    <Lightbulb className="h-3 w-3 mr-1" />
                    Mostrar Dicas
                  </Button>
                </div>
              )}

              {/* Dicas Expandidas */}
              {showHints && selectedVignette.redHerrings && (
                <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" type="button" className="w-full justify-between text-blue-700 mt-3 border-t border-blue-200 pt-3">
                      <span className="flex items-center">
                        <Target className="h-4 w-4 mr-2" />
                        Dicas para Análise ({hintsUsed} dica{hintsUsed !== 1 ? 's' : ''} usada{hintsUsed !== 1 ? 's' : ''})
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 mt-3">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                      <h5 className="font-medium text-yellow-800 mb-1">🎯 Objetivos de Aprendizado:</h5>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {selectedVignette.learningObjectives.map((objective, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{objective}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                      <h5 className="font-medium text-orange-800 mb-1">⚠️ Possíveis Armadilhas:</h5>
                      <ul className="text-sm text-orange-700 space-y-1">
                        {selectedVignette.redHerrings?.map((herring, index) => (
                          <li key={index} className="flex items-start">
                            <span className="mr-2">•</span>
                            <span>{herring}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {/* Campo de Identificação do Viés */}
          <div>
            <label htmlFor="userBias" className="block text-sm font-medium mb-1">
              Seu Viés Identificado (Opcional)
            </label>
            <Input
              id="userBias"
              placeholder="Ex: Viés de ancoragem, Viés de confirmação, etc."
              value={userIdentifiedBias}
              onChange={(e) => setUserIdentifiedBias(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Identifique qual viés você acredita estar presente. Dr. Corvus fornecerá feedback sobre sua análise.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              type="submit"
              disabled={isLoading || !authIsLoaded || (scenarioSource === 'vignette' && !selectedVignette) || (scenarioSource === 'custom' && !customScenario.trim())}
              className="flex-1"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Analisar Caso
                </>
              )}
            </Button>
            
            <Button 
              variant="default" 
              type="button"
              onClick={handleClearForm}
              disabled={isLoading}
            >
              Limpar
            </Button>
          </div>
        </form>

        {/* Exibição de Erro */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro na Análise</AlertTitle>
            <AlertDescription className="mt-2">
              {error}
              <br />
              <span className="text-sm mt-2 block">
                Verifique se o caso está bem descrito e tente novamente.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Resultados da Análise */}
        {analysis && (
          <div className="mt-8 space-y-6">
            {/* Header dos Resultados */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Análise Detalhada do Caso</h3>
              {selectedVignette && hintsUsed > 0 && (
                <Badge variant="outline" className="text-xs">
                  {hintsUsed} dica{hintsUsed !== 1 ? 's' : ''} utilizada{hintsUsed !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Viés Identificado */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
              <div className="flex items-center mb-3">
                <Brain className="h-6 w-6 text-purple-600 mr-2" />
                <h4 className="font-semibold text-purple-800">Viés Cognitivo Identificado</h4>
              </div>
              <p className="text-purple-700 font-medium text-lg">{analysis.identified_bias_by_expert}</p>
            </div>

            {/* Explicação do Viés */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-semibold text-blue-800 mb-2 flex items-center">
                <TrendingUp className="h-4 w-4 mr-2" />
                Como o Viés se Manifestou
              </h4>
              <p className="text-blue-700 leading-relaxed">{analysis.explanation_of_bias_in_case}</p>
            </div>

            {/* Impacto na Decisão */}
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <h4 className="font-semibold text-orange-800 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Impacto na Tomada de Decisão
              </h4>
              <p className="text-orange-700 leading-relaxed">{analysis.how_bias_impacted_decision}</p>
            </div>

            {/* Feedback sobre Identificação do Usuário */}
            {analysis.feedback_on_user_identification && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Feedback sobre sua Identificação
                </h4>
                <p className="text-green-700 leading-relaxed">{analysis.feedback_on_user_identification}</p>
              </div>
            )}

            {/* Estratégias de Mitigação */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <h4 className="font-semibold text-emerald-800 mb-3 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Estratégias para Mitigar este Viés
              </h4>
              <ul className="space-y-2">
                {analysis.strategies_to_mitigate_bias.map((strategy, index) => (
                  <li key={index} className="text-emerald-700 flex items-start">
                    <ArrowRight className="h-4 w-4 mr-2 mt-0.5 text-emerald-500 flex-shrink-0" />
                    <span>{strategy}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ações de Transferência */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={() => onTransferToReflection?.(getCurrentScenario(), analysis.identified_bias_by_expert)}
                variant="outline"
                className="flex items-center"
              >
                <Brain className="mr-2 h-4 w-4" />
                Refletir sobre seu Raciocínio
              </Button>
              
              <Button 
                onClick={() => onTransferToTimeout?.(getCurrentScenario(), selectedVignette?.correctDiagnosis || 'Diagnóstico a definir')}
                variant="outline"
                className="flex items-center"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Praticar Diagnostic Timeout
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
          <div className="mt-6 p-4 border rounded-md bg-green-50 border-green-200">
            <div className="flex items-center">
              <HelpCircle className="h-5 w-5 mr-2 text-green-600" />
              <h3 className="text-md font-semibold text-green-700">Pronto para analisar?</h3>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Selecione uma vinheta preparada ou insira seu caso personalizado. Dr. Corvus ajudará a identificar vieses cognitivos e desenvolver estratégias de mitigação.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}