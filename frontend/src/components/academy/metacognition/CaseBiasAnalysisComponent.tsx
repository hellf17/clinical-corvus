"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
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
  Lightbulb,
  Zap,
  Shield,
  Activity
} from 'lucide-react';

// Interfaces - Updated to match the '/analyze-cognitive-bias-translated' endpoint response
interface DetectedBias {
  bias_name: string;
  description: string;
  evidence_in_scenario: string;
  potential_impact: string;
  mitigation_strategy: string;
}

interface CognitiveBiasAnalysisOutput {
  detected_biases: DetectedBias[];
  overall_analysis: string;
  educational_insights: string;
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
}: Props) {
  const { getToken } = useAuth();
  
  const [mode, setMode] = useState<'vignette' | 'custom'>(initialScenario ? 'custom' : 'vignette');
  const [selectedVignette, setSelectedVignette] = useState<CaseVignette | null>(null);
  const [customScenario, setCustomScenario] = useState(initialScenario || '');
  const [userIdentifiedBias, setUserIdentifiedBias] = useState(initialBias || '');
  
  const [analysis, setAnalysis] = useState<CognitiveBiasAnalysisOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showHints, setShowHints] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [expandedBiases, setExpandedBiases] = useState<{ [key: number]: boolean }>({});

  // Helper function to determine impact severity
  const getImpactSeverity = (impact: string) => {
    const lowerImpact = impact.toLowerCase();
    if (lowerImpact.includes('crítico') || lowerImpact.includes('grave') || lowerImpact.includes('severo')) return 'high';
    if (lowerImpact.includes('moderado') || lowerImpact.includes('significativo')) return 'medium';
    return 'low';
  };

  // Helper function to get severity color and icon
  const getSeverityIndicator = (severity: string) => {
    switch (severity) {
      case 'high':
        return { color: 'bg-red-500', icon: AlertTriangle, text: 'Alto', textColor: 'text-red-700' };
      case 'medium':
        return { color: 'bg-yellow-500', icon: Activity, text: 'Moderado', textColor: 'text-yellow-700' };
      default:
        return { color: 'bg-green-500', icon: CheckCircle, text: 'Baixo', textColor: 'text-green-700' };
    }
  };

  const toggleBiasExpansion = (index: number) => {
    setExpandedBiases(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  useEffect(() => {
    if (initialScenario) {
      setCustomScenario(initialScenario);
      setMode('custom');
    }
    if (initialBias) {
      setUserIdentifiedBias(initialBias);
    }
  }, [initialScenario, initialBias]);

  const selectRandomVignette = () => {
    const randomIndex = Math.floor(Math.random() * caseVignettes.length);
    setSelectedVignette(caseVignettes[randomIndex]);
  };

  const getCurrentScenario = (): string => {
    if (mode === 'vignette' && selectedVignette) {
      return selectedVignette.scenario;
    }
    return customScenario;
  };

  const handleVignetteChange = (vignetteId: string) => {
    const vignette = caseVignettes.find(v => v.id === vignetteId);
    setSelectedVignette(vignette || null);
  };

  const handleClearForm = () => {
    setSelectedVignette(null);
    setCustomScenario('');
    setUserIdentifiedBias('');
    setAnalysis(null);
    setError(null);
    setShowHints(false);
    setHintsUsed(0);
    setMode('vignette');
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'Simples': return 'outline';
      case 'Moderado': return 'secondary';
      case 'Complexo': return 'destructive';
      default: return 'default';
    }
  };

  const getBiasColor = (bias: string) => {
    const colors: { [key: string]: string } = {
      'Ancoragem': 'text-blue-600',
      'Disponibilidade': 'text-purple-600',
      'Confirmação': 'text-orange-600',
      'Fechamento Prematuro': 'text-red-600',
      'Representatividade': 'text-green-600',
    };
    return colors[bias] || 'text-gray-600';
  };

  const handleSubmitAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    // KGB-grade validation: scenario must exist
    const scenario = getCurrentScenario();
    if (!scenario || !scenario.trim()) {
      setError('Por favor, forneça um cenário clínico para análise.');
      setIsLoading(false);
      return;
    }

    // The '-translated' endpoint expects a different payload.
    // We adapt the component's data to fit the backend model.
    const payload = {
      scenario_description: scenario,
      user_identified_bias_optional: userIdentifiedBias || null, // Pass as string or null
    };

    try {
      const response = await fetch('/api/clinical-assistant/analyze-cognitive-bias-translated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getToken()}`
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const errorData = await response.json();
            errorMessage = errorData.detail || `HTTP error! status: ${response.status}`;
        } else {
            const errorText = await response.text();
            console.error("Non-JSON error response:", errorText);
            errorMessage = `O servidor retornou um erro inesperado. Verifique os logs para mais detalhes. Status: ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      const data: CognitiveBiasAnalysisOutput = await response.json();
      setAnalysis(data);
      
      // The new endpoint returns a different structure.
      // The logic below might need adjustment based on the actual response shape.
      // For now, let's assume the response can be adapted or is already compatible.
      if (onBiasIdentified && data.detected_biases && data.detected_biases.length > 0) {
        const firstBias = data.detected_biases[0];
        onBiasIdentified({ 
          biasName: firstBias.bias_name, 
          strategies: [firstBias.mitigation_strategy]
        });
      }
      
    } catch (error: any) {
      setError(error.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          <Search className="h-6 w-6 mr-2 text-blue-600" />
          Análise de Vieses Cognitivos
        </CardTitle>
        <CardDescription className="text-gray-600">
          Selecione uma vinheta clínica ou descreva um caso para que o Dr. Corvus analise possíveis vieses cognitivos.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <form onSubmit={handleSubmitAnalysis} className="space-y-6">
          <div className="flex justify-center bg-gray-100 p-1 rounded-lg">
            <Button 
              type="button"
              onClick={() => setMode('vignette')}
              className={`flex-1 justify-center ${mode === 'vignette' ? 'bg-white text-gray-800 shadow' : 'bg-transparent text-gray-500'}`}
            >
              <BookOpen className="mr-2 h-4 w-4" /> Vinhetas Preparadas
            </Button>
            <Button 
              type="button"
              onClick={() => setMode('custom')}
              className={`flex-1 justify-center ${mode === 'custom' ? 'bg-white text-gray-800 shadow' : 'bg-transparent text-gray-500'}`}
            >
              <Brain className="mr-2 h-4 w-4" /> Cenário Personalizado
            </Button>
          </div>

          {mode === 'vignette' ? (
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Select onValueChange={handleVignetteChange} value={selectedVignette?.id || ''}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma vinheta clínica..." />
                  </SelectTrigger>
                  <SelectContent>
                    {caseVignettes.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={selectRandomVignette}>
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
              {selectedVignette && (
                <div className="p-4 border rounded-md bg-gray-50 space-y-3 animate-fade-in">
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedVignette.scenario}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <Badge variant="outline">{selectedVignette.specialty}</Badge>
                    <Badge variant={getComplexityColor(selectedVignette.complexity) as any}>{selectedVignette.complexity}</Badge>
                  </div>
                  <Collapsible onOpenChange={setShowHints}>
                    <CollapsibleTrigger asChild>
                      <Button variant="link" className="p-0 h-auto text-xs">
                        <HelpCircle className="mr-1 h-3 w-3" />
                        Precisa de uma dica? ({hintsUsed} de 2 usadas)
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 p-2 bg-yellow-50 border-l-4 border-yellow-400 text-sm text-yellow-800">
                      <p><strong>Viés Alvo:</strong> {selectedVignette.targetBias}</p>
                      <p><strong>Pistas Falsas (Red Herrings):</strong> {selectedVignette.redHerrings?.join(', ')}</p>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              )}
            </div>
          ) : (
            <Textarea
              placeholder="Descreva o caso clínico aqui..."
              value={customScenario}
              onChange={(e) => setCustomScenario(e.target.value)}
              className="h-32"
            />
          )}
          
          <div className="space-y-2">
            <Label htmlFor="user-bias">Qual(is) viés(es) cognitivo(s) você suspeita? (separe por vírgula)</Label>
            <Input 
              id="user-bias"
              placeholder="Ex: Ancoragem, Viés de Confirmação..."
              value={userIdentifiedBias}
              onChange={(e) => setUserIdentifiedBias(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={handleClearForm}>Limpar</Button>
            <Button type="submit" disabled={isLoading || !getCurrentScenario().trim()}>
              {isLoading ? (
                <div className="flex items-center">
                  <div className="relative mr-2">
                    <div className="w-4 h-4 border-2 border-blue-200 rounded-full animate-spin">
                      <div className="absolute top-0 left-0 w-4 h-4 border-2 border-blue-600 rounded-full animate-pulse border-t-transparent"></div>
                    </div>
                  </div>
                  Analisando com Dr. Corvus...
                </div>
              ) : (
                <><Search className="mr-2 h-4 w-4" /> Analisar com Dr. Corvus</>
              )}
            </Button>
          </div>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro na Análise</AlertTitle>
            <AlertDescription>
              <span className="font-mono bg-red-100 p-1 rounded">{error}</span>
            </AlertDescription>
          </Alert>
        )}

        {isLoading && !analysis && (
          <div className="mt-6 flex flex-col items-center justify-center py-12 space-y-6 animate-fade-in">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin">
                <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-pulse border-t-transparent"></div>
              </div>
              <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-blue-600 animate-pulse" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold text-gray-700 animate-pulse">Dr. Corvus está analisando o caso...</p>
              <p className="text-sm text-gray-500">Identificando padrões de raciocínio e possíveis vieses cognitivos</p>
            </div>
            <div className="w-80 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse transition-all duration-1000" style={{ width: '75%' }}></div>
            </div>
          </div>
        )}

        {analysis && analysis.detected_biases && analysis.detected_biases.length > 0 && !isLoading && (
          <div className="mt-6 space-y-6 animate-fade-in">
            <div className="text-center space-y-2">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                Reflexões do Dr. Corvus sobre Possíveis Vieses
              </h3>
              <p className="text-gray-600">Analise as seguintes questões para aprimorar seu raciocínio clínico.</p>
              <div className="flex items-center justify-center space-x-2 mt-4">
                <Zap className="h-5 w-5 text-yellow-500" />
                <span className="text-sm text-gray-500">{analysis.detected_biases.length} viés(es) detectado(s)</span>
              </div>
            </div>
            
            <div className="p-6 border rounded-xl bg-gradient-to-r from-gray-50 to-blue-50 shadow-sm">
              <h4 className="text-xl font-semibold text-gray-800 mb-3 flex items-center">
                <Brain className="h-6 w-6 mr-2 text-blue-600" />
                Análise Geral
              </h4>
              <p className="text-gray-700 leading-relaxed">{analysis.overall_analysis}</p>
            </div>

            {analysis.detected_biases.map((bias: DetectedBias, index: number) => {
              const severity = getImpactSeverity(bias.potential_impact);
              const severityInfo = getSeverityIndicator(severity);
              const SeverityIcon = severityInfo.icon;
              const isExpanded = expandedBiases[index];

              return (
                <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-blue-400">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 to-purple-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  <CardContent className="relative z-10 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <h4 className={`text-xl font-semibold ${getBiasColor(bias.bias_name)}`}>
                          {bias.bias_name}
                </h4>
                        <div className="flex items-center space-x-2">
                          <div className={`w-3 h-3 rounded-full ${severityInfo.color}`} />
                          <span className={`text-sm font-medium ${severityInfo.textColor}`}>
                            Impacto: {severityInfo.text}
                          </span>
                          <SeverityIcon className={`h-4 w-4 ${severityInfo.textColor}`} />
                        </div>
                  </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBiasExpansion(index)}
                        className="hover:bg-blue-50 transition-colors"
                      >
                        <span className="text-sm mr-2">
                          {isExpanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </Button>
                  </div>
                    
                    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-400 rounded-r-lg">
                      <p className="font-semibold text-blue-800 mb-2 flex items-center">
                        <Eye className="h-4 w-4 mr-2" />
                        Descrição do Viés:
                      </p>
                      <p className="text-blue-700 leading-relaxed">{bias.description}</p>
                  </div>

                    <Collapsible open={isExpanded} onOpenChange={() => toggleBiasExpansion(index)}>
                      <CollapsibleContent className="space-y-0 overflow-hidden data-[state=closed]:animate-slideUp data-[state=open]:animate-slideDown">
                        <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-400 rounded-r-lg">
                          <p className="font-semibold text-orange-800 mb-2 flex items-center">
                            <Target className="h-4 w-4 mr-2" />
                            Evidência no Cenário:
                          </p>
                          <p className="text-orange-700 leading-relaxed">{bias.evidence_in_scenario}</p>
                  </div>
                        <div className="p-4 bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-400 rounded-r-lg">
                          <p className="font-semibold text-red-800 mb-2 flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-2" />
                            Impacto Potencial:
                          </p>
                          <p className="text-red-700 leading-relaxed">{bias.potential_impact}</p>
                </div>
                        <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 border-l-4 border-emerald-400 rounded-r-lg">
                          <p className="font-semibold text-emerald-800 mb-2 flex items-center">
                            <Shield className="h-4 w-4 mr-2" />
                            Estratégia de Mitigação:
                          </p>
                          <p className="text-emerald-700 leading-relaxed">{bias.mitigation_strategy}</p>
              </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </CardContent>
                </Card>
              );
            })}
            
            <div className="p-6 border rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-400 shadow-sm">
              <h4 className="text-xl font-semibold text-indigo-800 mb-3 flex items-center">
                <Lightbulb className="h-6 w-6 mr-2 text-indigo-600" />
                Insights Educacionais
              </h4>
              <p className="text-indigo-700 leading-relaxed">{analysis.educational_insights}</p>
            </div>
          </div>
        )}

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