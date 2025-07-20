"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { 
  Scale, 
  CheckCircle, 
  AlertTriangle,
  Lightbulb,
  Target,
  BookOpen,
  Star,
  TrendingUp,
  Users,
  Award,
  BarChart3,
  CheckSquare,
  HelpCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShieldCheck, // For bias
  ListChecks, // For quality factors
  FlaskConical, // For clinical practice
  ThumbsUp, // For positive factors
  ThumbsDown, // For negative factors
  Shield,
  Activity,
  Eye,
  Brain,
  Zap
} from "lucide-react";
import { useAuth } from '@clerk/nextjs';

// Helper to ensure value is an array
function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

// --- Data Interfaces ---
interface QualityFactor {
  factor_name: string;
  assessment: 'POSITIVO' | 'NEUTRO' | 'NEGATIVO';
  justification: string;
}

interface BiasItem {
  bias_type: string;
  potential_impact: string;
  mitigation_strategies: string;
  actionable_suggestion: string;
}

interface RecommendationBalance {
  positive_factors: string[];
  negative_factors: string[];
  overall_balance: string;
}

interface GradeSummary {
  summary_of_findings: string;
  recommendation_balance: RecommendationBalance;
}

interface PracticeRecommendation {
  clinical_application: string;
  monitoring_points: string[];
  evidence_caveats: string;
}

interface BiasAnalysis {
  selection_bias: string;
  performance_bias: string;
  reporting_bias: string;
  confirmation_bias: string;
}

interface GradeEvidenceAppraisalOutput {
  overall_quality: 'ALTA' | 'MODERADA' | 'BAIXA' | 'MUITO BAIXA';
  quality_reasoning: string;
  quality_factors: QualityFactor[];
  recommendation_strength: 'FORTE' | 'FRACA';
  strength_reasoning: string;
  bias_analysis: BiasAnalysis | BiasItem[];
  practice_recommendations: string[] | PracticeRecommendation | { recommendation: string; justification: string }[];
  grade_summary?: GradeSummary;
  reasoning_tags?: string[];
}

interface EvidenceAppraisalComponentProps {
  className?: string;
}

// --- Main Component ---
export default function EvidenceAppraisalComponent({ className }: EvidenceAppraisalComponentProps) {
  const { getToken } = useAuth();

  // --- State Management ---
  const [clinicalQuestion, setClinicalQuestion] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [results, setResults] = useState<GradeEvidenceAppraisalOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  // Helper function to determine evidence impact severity
  const getEvidenceImpactSeverity = (quality: string, strength: string) => {
    if (quality === 'ALTA' && strength === 'FORTE') return 'high';
    if (quality === 'ALTA' || strength === 'FORTE') return 'medium';
    return 'low';
  };

  // Helper function to get severity indicator
  const getSeverityIndicator = (severity: string) => {
    switch (severity) {
      case 'high':
        return { color: 'bg-green-500', icon: Activity, text: 'Alto Impacto', textColor: 'text-green-700' };
      case 'medium':
        return { color: 'bg-yellow-500', icon: Activity, text: 'Moderado', textColor: 'text-yellow-700' };
      default:
        return { color: 'bg-red-500', icon: Activity, text: 'Baixo', textColor: 'text-red-700' };
    }
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  // --- API Call Handler ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResults(null);

    if (!clinicalQuestion.trim() || !evidenceSummary.trim()) {
      setError('Por favor, preencha a pergunta clínica e o resumo da evidência.');
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error('Erro de autenticação. Por favor, faça login novamente.');

      const response = await fetch('/api/research-assistant/unified-evidence-analysis-translated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ paper_full_text: evidenceSummary, clinical_question_PICO: clinicalQuestion }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
        throw new Error(errorData.detail || `Erro na avaliação (status: ${response.status})`);
      } 
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.');
      console.error("Error in unified evidence analysis:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- UI Helper Functions ---
  const getQualityBadgeStyle = (quality: string) => {
    switch (quality) {
      case 'ALTA': return 'bg-green-100 text-green-800 border-green-300';
      case 'MODERADA': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'BAIXA': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MUITO BAIXA': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStrengthBadgeStyle = (strength: string) => {
    switch (strength) {
      case 'FORTE': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'FRACA': return 'bg-purple-100 text-purple-800 border-purple-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAssessmentIcon = (assessment: string) => {
    switch (assessment) {
      case 'POSITIVO': return <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />;
      case 'NEUTRO': return <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />;
      case 'NEGATIVO': return <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />;
      default: return <HelpCircle className="h-5 w-5 text-gray-500 flex-shrink-0" />;
    }
  };

  // --- Helper Functions ---
  const renderBiasAnalysis = () => {
    if (!results) return null;
    
    // Handle both BiasAnalysis object and BiasItem[] array
    if (Array.isArray(results.bias_analysis)) {
      return (
        <div className="space-y-4">
          {results.bias_analysis.map((bias, index) => (
            <div key={index} className="p-3 rounded-md bg-gray-50/80 border">
              <h4 className="font-semibold">{bias.bias_type}</h4>
              <div className="mt-2 space-y-2 text-sm">
                <p><strong>Impacto Potencial:</strong> {bias.potential_impact}</p>
                <p><strong>Estratégias de Mitigação:</strong> {bias.mitigation_strategies}</p>
                <p><strong>Sugestão Prática:</strong> {bias.actionable_suggestion}</p>
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      // Original format with specific bias fields
      return (
        <div className="space-y-3 pt-4">
          <p><strong>Viés de Seleção:</strong> {results.bias_analysis.selection_bias}</p>
          <p><strong>Viés de Aferição/Performance:</strong> {results.bias_analysis.performance_bias}</p>
          <p><strong>Viés de Relato:</strong> {results.bias_analysis.reporting_bias}</p>
          <p><strong>Viés de Confirmação:</strong> {results.bias_analysis.confirmation_bias}</p>
        </div>
      );
    }
  };

  const renderPracticeRecommendations = () => {
    if (!results) return null;
    
    const recs = results.practice_recommendations;
    
    if (Array.isArray(recs)) {
      return (
        <ul className="list-disc list-inside space-y-3">
          {recs.map((rec, index) => (
            <li key={index} className="text-muted-foreground">
              {typeof rec === 'string' ? rec : `${rec.recommendation} - ${rec.justification}`}
            </li>
          ))}
        </ul>
      );
    } else if (typeof recs === 'object') {
      // Handle PracticeRecommendation object
      return (
        <div className="space-y-4">
          <div className="mb-3">
            <h4 className="font-semibold mb-2">Aplicação Clínica</h4>
            <p className="text-muted-foreground">{recs.clinical_application}</p>
          </div>
          
          {recs.monitoring_points && recs.monitoring_points.length > 0 && (
            <div className="mb-3">
              <h4 className="font-semibold mb-2">Pontos de Monitoramento</h4>
              <ul className="list-disc list-inside space-y-1">
                {recs.monitoring_points.map((point, idx) => (
                  <li key={idx} className="text-muted-foreground">{point}</li>
                ))}
              </ul>
            </div>
          )}
          
          {recs.evidence_caveats && (
            <div>
              <h4 className="font-semibold mb-2">Ressalvas da Evidência</h4>
              <p className="text-muted-foreground">{recs.evidence_caveats}</p>
            </div>
          )}
        </div>
      );
    }
    
    return <p>Nenhuma recomendação disponível</p>;
  };

  // --- Render Functions ---
  const renderResults = () => {
    if (!results) return null;

    return (
      <div className="space-y-6 mt-6">
        {/* Summary of Findings Card - New */}
        {results.grade_summary && (
          <Card className="border-l-4 border-l-green-500">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <BookOpen className="mr-3 h-6 w-6 text-green-600" />Resumo dos Achados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{results.grade_summary.summary_of_findings}</p>
              
              {/* Recommendation Balance - New */}
              {results.grade_summary.recommendation_balance && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Positive Factors */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md flex items-center">
                      <ThumbsUp className="mr-2 h-5 w-5 text-green-500" />Fatores Positivos
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {results.grade_summary.recommendation_balance.positive_factors.map((factor, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">{factor}</li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* Negative Factors */}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-md flex items-center">
                      <ThumbsDown className="mr-2 h-5 w-5 text-red-500" />Fatores Negativos
                    </h3>
                    <ul className="list-disc list-inside space-y-1">
                      {results.grade_summary.recommendation_balance.negative_factors.map((factor, idx) => (
                        <li key={idx} className="text-sm text-muted-foreground">{factor}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Overall Balance */}
              {results.grade_summary.recommendation_balance?.overall_balance && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md border">
                  <h4 className="font-semibold flex items-center">
                    <Scale className="mr-2 h-5 w-5 text-purple-500" />Balanço Geral
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {results.grade_summary.recommendation_balance.overall_balance}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* The Verdict - Main Dashboard Verdict Section */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-white p-6">
            <CardTitle className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
              <Award className="mr-3 h-7 w-7 text-purple-700" />Avaliação da Evidência
            </CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Qualidade da Evidência */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2">QUALIDADE</h3>
                <div className="flex items-center mb-2">
                  <Badge className={`px-4 py-2 text-lg font-bold ${getQualityBadgeStyle(results.overall_quality)}`}>{results.overall_quality}</Badge>
                </div>
                <p className="text-gray-700">{results.quality_reasoning}</p>
              </div>
              {/* Força da Recomendação */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2">RECOMENDAÇÃO</h3>
                <div className="flex items-center mb-2">
                  <Badge className={`px-4 py-2 text-lg font-bold ${getStrengthBadgeStyle(results.recommendation_strength)}`}>{results.recommendation_strength}</Badge>
                </div>
                <p className="text-gray-700">{results.strength_reasoning}</p>
              </div>
            </div>
          </div>
        </Card>
        
        {/* Reasoning Tags - New */}
        {results.reasoning_tags && results.reasoning_tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {results.reasoning_tags.map((tag, idx) => (
              <Badge key={idx} variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 px-3 py-1">
                <Lightbulb className="h-3 w-3 mr-1" />{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Fatores de Influência - Grade Colorida */}
        <Card className="border-0 shadow-lg mt-6">
          <CardHeader className="pb-0">
            <CardTitle className="text-xl flex items-center text-gray-800">
              <ListChecks className="mr-3 h-6 w-6 text-indigo-600" />Fatores de Qualidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.quality_factors.map((factor, index) => {
                const colorMap = {
                  'POSITIVO': 'bg-green-50 border-green-200',
                  'NEUTRO': 'bg-gray-50 border-gray-200',
                  'NEGATIVO': 'bg-red-50 border-red-200'
                };
                const iconMap = {
                  'POSITIVO': <div className="absolute top-3 right-3"><Badge className="bg-green-100 text-green-800 border-0">✓</Badge></div>,
                  'NEUTRO': <div className="absolute top-3 right-3"><Badge className="bg-gray-100 text-gray-800 border-0">⚬</Badge></div>,
                  'NEGATIVO': <div className="absolute top-3 right-3"><Badge className="bg-red-100 text-red-800 border-0">✗</Badge></div>
                };
                return (
                  <div key={index} className={`relative p-4 rounded-lg border ${colorMap[factor.assessment] || 'bg-gray-50 border-gray-200'}`}>
                    {iconMap[factor.assessment]}
                    <h4 className="font-semibold text-gray-800">{factor.factor_name}</h4>
                    <p className="text-sm text-gray-600 mt-2">{factor.justification}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bias Analysis - Cartões claros e perguntas reflexivas */}
        <Card className="border-0 shadow-lg mt-6">
          <Collapsible>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer hover:bg-gray-50">
                <CardTitle className="flex items-center text-xl text-gray-800">
                  <ShieldCheck className="mr-3 h-6 w-6 text-red-600" />Análise de Risco de Viés
                </CardTitle>
                <ChevronDown className="h-5 w-5 transition-transform group-data-[state=open]:rotate-180" />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="space-y-6">
                  {/* Renderização adaptada para array ou objeto */}
                  {Array.isArray(results.bias_analysis) ? (
                    results.bias_analysis.map((item, index) => (
                      <div key={index} className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
                        <h4 className="font-semibold text-lg text-gray-800 border-b pb-2 mb-3">{item.bias_type}</h4>
                        <p className="text-gray-700 mb-4">{item.potential_impact}</p>
                        {item.mitigation_strategies && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-md">
                            <h5 className="text-sm font-medium text-blue-800 flex items-center">
                              <CheckSquare className="h-4 w-4 mr-2" />Estratégias de Mitigação:
                            </h5>
                            <p className="text-gray-700 mt-1">{item.mitigation_strategies}</p>
                          </div>
                        )}
                        {item.actionable_suggestion && (
                          <div className="mt-4">
                            <h5 className="text-sm font-medium text-gray-800 italic border-l-2 border-yellow-400 pl-3">
                              Pergunta para Reflexão:
                            </h5>
                            <p className="text-gray-700 mt-1 pl-3 italic">{item.actionable_suggestion}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    Object.entries(results.bias_analysis).map(([key, value]) => {
                      if (key === '__typename') return null;
                      const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                      return (
                        <div key={key} className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
                          <h4 className="font-semibold text-lg text-gray-800 border-b pb-2 mb-3">{formattedKey}</h4>
                          <p className="text-gray-700">{value as string}</p>
                          <div className="mt-4">
                            <h5 className="text-sm font-medium text-gray-800 italic border-l-2 border-yellow-400 pl-3">
                              Pergunta para Reflexão:
                            </h5>
                            <p className="text-gray-700 mt-1 pl-3 italic">
                              A população do meu paciente é significativamente diferente da população deste estudo?
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Recomendações para Prática Clínica - Cartão moderno */}
        <Card className="border-0 shadow-lg mt-6 border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-gray-800">
              <FlaskConical className="mr-3 h-6 w-6 text-blue-600" />Recomendações para Prática Clínica
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Renderização adaptada para diferentes formas de recommendations */}
            <div className="space-y-6">
              {/* Caso seja objeto PracticeRecommendation */}
              {results.practice_recommendations && !Array.isArray(results.practice_recommendations) && (
                <>
                  {results.practice_recommendations.clinical_application && (
                    <div>
                      <h4 className="font-semibold flex items-center text-gray-800">
                        <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />Aplicação Clínica
                      </h4>
                      <p className="text-gray-700 mt-2">{results.practice_recommendations.clinical_application}</p>
                    </div>
                  )}
                  {results.practice_recommendations.monitoring_points && results.practice_recommendations.monitoring_points.length > 0 && (
                    <div>
                      <h4 className="font-semibold flex items-center text-gray-800">
                        <Target className="h-5 w-5 mr-2 text-blue-500" />Pontos de Monitoramento
                      </h4>
                      <ul className="list-disc list-inside space-y-1 mt-2 text-gray-700">
                        {results.practice_recommendations.monitoring_points.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {results.practice_recommendations.evidence_caveats && (
                    <div>
                      <h4 className="font-semibold flex items-center text-gray-800">
                        <AlertCircle className="h-5 w-5 mr-2 text-red-500" />Ressalvas da Evidência
                      </h4>
                      <p className="text-gray-700 mt-2">{results.practice_recommendations.evidence_caveats}</p>
                    </div>
                  )}
                </>
              )}
              {/* Caso seja array de objetos ou strings (mistos) */}
              {Array.isArray(results.practice_recommendations) && results.practice_recommendations.length > 0 && (
                <div className="space-y-4">
                  {results.practice_recommendations.map((rec, idx) => {
                    if (typeof rec === 'string') {
                      return (
                        <div key={idx} className="p-3 border rounded-md flex items-center">
                          <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />
                          <span className="text-gray-700">{rec}</span>
                        </div>
                      );
                    } else if (rec && typeof rec === 'object' && 'recommendation' in rec && 'justification' in rec) {
                      return (
                        <div key={idx} className="p-3 border rounded-md">
                          <h4 className="font-semibold flex items-center text-gray-800">
                            <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />{rec.recommendation}
                          </h4>
                          <p className="text-gray-700 mt-2">{rec.justification}</p>
                        </div>
                      );
                    } else {
                      return null;
                    }
                  })}
                </div>
              )}
              {/* Fallback */}
              {!results.practice_recommendations && (
                <p className="text-muted-foreground">Nenhuma recomendação prática disponível.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <CardHeader className="relative z-10">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent flex items-center">
            <TrendingUp className="h-6 w-6 mr-3 text-green-600" />
            Avaliação Crítica da Evidência (GRADE)
          </CardTitle>
          <CardDescription className="text-gray-600">
            Forneça um resumo ou abstract para uma avaliação crítica da qualidade e aplicabilidade da evidência, baseada na metodologia GRADE.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">Pergunta Clínica (formato PICO) *</label>
              <Textarea
                value={clinicalQuestion}
                onChange={(e) => setClinicalQuestion(e.target.value)}
                placeholder="Ex: Em pacientes com diabetes tipo 2 (P), a metformina (I) comparada à insulina (C) é mais eficaz no controle glicêmico (O)?"
                className="min-h-[80px]"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Resumo da Evidência ou Abstract *</label>
              <Textarea
                value={evidenceSummary}
                onChange={(e) => setEvidenceSummary(e.target.value)}
                placeholder="Cole aqui o abstract do estudo ou um resumo detalhado da evidência que você deseja avaliar..."
                className="min-h-[150px]"
                required
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full py-3 text-base">
              {isLoading ? (
                <div className="flex items-center">
                  <div className="relative mr-3">
                    <div className="w-5 h-5 border-2 border-green-200 rounded-full animate-spin">
                      <div className="absolute top-0 left-0 w-5 h-5 border-2 border-green-600 rounded-full animate-pulse border-t-transparent"></div>
                    </div>
                  </div>
                  Avaliando com Dr. Corvus...
                </div>
              ) : (
                <>
                  <Scale className="h-5 w-5 mr-3" />
                  Avaliar Evidência
                </>
              )}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive" className="mt-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro na Avaliação</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {renderResults()}
        </CardContent>
      </Card>
    </div>
  );
}