"use client";

import React, { useState } from 'react';
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { 
  Scale, 
  CheckCircle, 
  AlertTriangle,
  Lightbulb,
  Target,
  BookOpen,
  Star,
  TrendingUp,
  Users
} from "lucide-react";
import { useAuth } from '@clerk/nextjs';
import { EvidenceAppraisalRequest } from '@/types/research';

interface AppraisalAssistanceOutput {
  overall_quality_grade: string;
  strength_of_recommendation: string;
  key_strengths: string[];
  key_limitations: string[];
  bias_assessment: string[];
  clinical_applicability: string;
  statistical_significance_summary: string;
  effect_size_interpretation: string;
  confidence_intervals_interpretation: string;
  generalizability_assessment: string;
  recommendations_for_practice: string[];
  areas_for_further_research: string[];
  critical_appraisal_summary: string;
  disclaimer: string;
}

interface EvidenceAppraisalComponentProps {
  className?: string;
}

export default function EvidenceAppraisalComponent({ className }: EvidenceAppraisalComponentProps) {
  const { getToken } = useAuth();

  // Estados principais
  const [clinicalQuestion, setClinicalQuestion] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [studyType, setStudyType] = useState('');
  const [results, setResults] = useState<AppraisalAssistanceOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (!token) {
        throw new Error('Erro de autenticação. Por favor, faça login novamente.');
      }

      const payload: EvidenceAppraisalRequest = {
        clinical_question_PICO: clinicalQuestion,
        evidence_summary_or_abstract: evidenceSummary,
        study_type_if_known: studyType || undefined
      };

      const response = await fetch('/api/deep-research/appraise-evidence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
        throw new Error(errorData.detail || `Erro na avaliação (status: ${response.status})`);
      }

      const data: AppraisalAssistanceOutput = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.');
      console.error("Error in evidence appraisal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeColor = (grade: string) => {
    const gradeUpper = grade.toUpperCase();
    if (gradeUpper.includes('A') || gradeUpper.includes('ALTA') || gradeUpper.includes('EXCELENTE')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (gradeUpper.includes('B') || gradeUpper.includes('BOA') || gradeUpper.includes('MODERADA')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (gradeUpper.includes('C') || gradeUpper.includes('BAIXA') || gradeUpper.includes('LIMITADA')) return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getRecommendationStrengthColor = (strength: string) => {
    const lowerStrength = strength.toLowerCase();
    if (lowerStrength.includes('forte') || lowerStrength.includes('strong')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    } else if (lowerStrength.includes('moderada') || lowerStrength.includes('moderate')) {
      return 'bg-purple-100 text-purple-800 border-purple-300';
    } else {
      return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getBiasColor = (risk: string) => {
    const riskLevel = risk.toLowerCase();
    if (riskLevel.includes('baixo') || riskLevel.includes('low')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (riskLevel.includes('alto') || riskLevel.includes('high')) return 'bg-red-100 text-red-800 border-red-300';
    if (riskLevel.includes('moderado') || riskLevel.includes('moderate') || riskLevel.includes('médio')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center text-purple-800">
            <TrendingUp className="h-5 w-5 mr-2" />
            Avaliação Crítica da Evidência
          </CardTitle>
          <CardDescription>
            Avalie criticamente a qualidade e aplicabilidade de evidências científicas com a assistência do Dr. Corvus.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pergunta clínica PICO */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Pergunta Clínica (formato PICO) *
              </label>
              <Textarea
                value={clinicalQuestion}
                onChange={(e) => setClinicalQuestion(e.target.value)}
                placeholder="Ex: Em pacientes com diabetes tipo 2 (P), a metformina (I) comparada à insulina (C) é mais eficaz no controle glicêmico (O)?"
                className="min-h-[80px]"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Estruture sua pergunta usando PICO: População, Intervenção, Comparação, Outcome (Desfecho)
              </p>
            </div>

            {/* Resumo da evidência */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Resumo da Evidência ou Abstract *
              </label>
              <Textarea
                value={evidenceSummary}
                onChange={(e) => setEvidenceSummary(e.target.value)}
                placeholder="Cole aqui o abstract do estudo ou um resumo detalhado da evidência que você deseja avaliar..."
                className="min-h-[120px]"
                required
              />
            </div>

            {/* Tipo de estudo */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Tipo de Estudo (se conhecido)
              </label>
              <Select value={studyType} onValueChange={setStudyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de estudo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="systematic_review">Revisão Sistemática</SelectItem>
                  <SelectItem value="meta_analysis">Meta-análise</SelectItem>
                  <SelectItem value="randomized_controlled_trial">Ensaio Clínico Randomizado</SelectItem>
                  <SelectItem value="cohort_study">Estudo de Coorte</SelectItem>
                  <SelectItem value="case_control">Estudo Caso-Controle</SelectItem>
                  <SelectItem value="cross_sectional">Estudo Transversal</SelectItem>
                  <SelectItem value="case_series">Série de Casos</SelectItem>
                  <SelectItem value="case_report">Relato de Caso</SelectItem>
                  <SelectItem value="clinical_guideline">Diretriz Clínica</SelectItem>
                  <SelectItem value="expert_opinion">Opinião de Especialista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Avaliando evidência...
                </>
              ) : (
                <>
                  <Scale className="h-4 w-4 mr-2" />
                  Avaliar Evidência
                </>
              )}
            </Button>
          </form>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results && (
            <div className="space-y-6 mt-8">
              <Separator />
              
              {/* Avaliação geral */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center">
                      <Star className="h-5 w-5 mr-2 text-yellow-500" />
                      Qualidade Geral
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={`text-sm px-3 py-1 ${getGradeColor(results.overall_quality_grade)}`}>
                      {results.overall_quality_grade}
                    </Badge>
                  </CardContent>
                </Card>

                <Card className="border-2">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center">
                      <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
                      Força da Recomendação
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={`text-sm px-3 py-1 ${getRecommendationStrengthColor(results.strength_of_recommendation)}`}>
                      {results.strength_of_recommendation}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Resumo da avaliação crítica */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Resumo da Avaliação Crítica</h3>
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="pt-4">
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {results.critical_appraisal_summary}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Pontos fortes */}
              {results.key_strengths?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                    Pontos Fortes
                  </h3>
                  <ul className="space-y-2">
                    {results.key_strengths.map((strength, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Limitações */}
              {results.key_limitations?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-orange-500" />
                    Limitações Principais
                  </h3>
                  <ul className="space-y-2">
                    {results.key_limitations.map((limitation, index) => (
                      <li key={index} className="flex items-start">
                        <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 text-orange-500 flex-shrink-0" />
                        <span className="text-sm">{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Avaliação de viés */}
              {results.bias_assessment?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Scale className="h-5 w-5 mr-2 text-red-500" />
                    Avaliação de Viés
                  </h3>
                  <ul className="space-y-2">
                    {results.bias_assessment.map((bias, index) => (
                      <li key={index} className="flex items-start">
                        <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 text-red-500 flex-shrink-0" />
                        <span className="text-sm">{bias}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Aplicabilidade clínica */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-purple-500" />
                  Aplicabilidade Clínica
                </h3>
                <Card className="bg-purple-50 border-purple-200">
                  <CardContent className="pt-4">
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {results.clinical_applicability}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Análises estatísticas */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Significância Estatística</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed">
                      {results.statistical_significance_summary}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Tamanho do Efeito</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed">
                      {results.effect_size_interpretation}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Intervalos de Confiança</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs leading-relaxed">
                      {results.confidence_intervals_interpretation}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Generalização */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Avaliação de Generalização</h3>
                <Card className="bg-yellow-50 border-yellow-200">
                  <CardContent className="pt-4">
                    <p className="text-sm leading-relaxed whitespace-pre-line">
                      {results.generalizability_assessment}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recomendações para prática */}
              {results.recommendations_for_practice?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Target className="h-5 w-5 mr-2 text-green-500" />
                    Recomendações para a Prática
                  </h3>
                  <ul className="space-y-2">
                    {results.recommendations_for_practice.map((recommendation, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-4 w-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                        <span className="text-sm">{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Áreas para pesquisa futura */}
              {results.areas_for_further_research?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center">
                    <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                    Áreas para Pesquisa Futura
                  </h3>
                  <ul className="space-y-2">
                    {results.areas_for_further_research.map((area, index) => (
                      <li key={index} className="flex items-start">
                        <Lightbulb className="h-4 w-4 mr-2 mt-0.5 text-yellow-500 flex-shrink-0" />
                        <span className="text-sm">{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <Alert>
                <AlertDescription className="text-xs">
                  {results.disclaimer}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 