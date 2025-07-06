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
    e.stopPropagation(); // Prevent event bubbling
    
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

      const response = await fetch('/api/research-assistant/appraise-evidence-translated', {
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
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-4">
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
            <div className="mt-8 animate-fade-in">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight text-gray-800">
                  Avaliação Crítica da Evidência
                </h2>
                <p className="text-muted-foreground mt-1">
                  Análise detalhada da evidência fornecida.
                </p>
              </div>

              {/* Quick Summary Badges */}
              <Card className="mb-6 bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo da Avaliação</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-1">Qualidade Geral</h4>
                    <Badge className={`${getGradeColor(results.overall_quality_grade)} text-base`}>
                      {results.overall_quality_grade}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-1">Força da Recomendação</h4>
                    <Badge className={`${getRecommendationStrengthColor(results.strength_of_recommendation)} text-base`}>
                      {results.strength_of_recommendation}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Main Content) */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center"><Scale className="mr-2 h-5 w-5 text-purple-600" /> Resumo da Avaliação Crítica</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-line">{results.critical_appraisal_summary}</p>
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-base"><CheckCircle className="mr-2 h-5 w-5 text-green-600" /> Pontos Fortes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {results.key_strengths.map((item, index) => (
                              <li key={index} className="flex items-start">
                                <CheckCircle className="h-4 w-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                                <span className="text-sm text-muted-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-base"><AlertTriangle className="mr-2 h-5 w-5 text-orange-600" /> Limitações Chave</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {results.key_limitations.map((item, index) => (
                              <li key={index} className="flex items-start">
                                <AlertTriangle className="h-4 w-4 mr-2 mt-1 text-orange-500 flex-shrink-0" />
                                <span className="text-sm text-muted-foreground">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                  </div>
                </div>

                {/* Right Column (Side Content) */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base"><Users className="mr-2 h-5 w-5 text-blue-600" /> Aplicabilidade e Generalização</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                          <h4 className="font-semibold text-sm mb-1">Aplicabilidade Clínica</h4>
                          <p className="text-sm text-muted-foreground">{results.clinical_applicability}</p>
                      </div>
                      <Separator />
                      <div>
                          <h4 className="font-semibold text-sm mb-1">Generalização</h4>
                          <p className="text-sm text-muted-foreground">{results.generalizability_assessment}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center text-base"><TrendingUp className="mr-2 h-5 w-5 text-teal-600" /> Análise Estatística</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 text-sm text-muted-foreground">
                          <p><strong>Significância:</strong> {results.statistical_significance_summary}</p>
                          <p><strong>Tamanho do Efeito:</strong> {results.effect_size_interpretation}</p>
                          <p><strong>Intervalos de Confiança:</strong> {results.confidence_intervals_interpretation}</p>
                      </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center text-base">Avaliação de Viés</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      {results.bias_assessment.map((bias, index) => (
                        <Badge key={index} variant="outline" className={`${getBiasColor(bias)}`}>
                          {bias}
                        </Badge>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Bottom Section */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center text-base"><Target className="mr-2 h-5 w-5 text-green-600" /> Recomendações para Prática</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <ul className="space-y-2">
                              {results.recommendations_for_practice.map((item, index) => (
                                  <li key={index} className="flex items-start">
                                      <CheckCircle className="h-4 w-4 mr-2 mt-1 text-green-500 flex-shrink-0" />
                                      <span className="text-sm text-muted-foreground">{item}</span>
                                  </li>
                              ))}
                          </ul>
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader>
                          <CardTitle className="flex items-center text-base"><Lightbulb className="mr-2 h-5 w-5 text-yellow-600" /> Áreas para Pesquisa Futura</CardTitle>
                      </CardHeader>
                      <CardContent>
                          <ul className="space-y-2">
                              {results.areas_for_further_research.map((item, index) => (
                                  <li key={index} className="flex items-start">
                                      <Lightbulb className="h-4 w-4 mr-2 mt-1 text-yellow-500 flex-shrink-0" />
                                      <span className="text-sm text-muted-foreground">{item}</span>
                                  </li>
                              ))}
                          </ul>
                      </CardContent>
                  </Card>
              </div>

              {/* Disclaimer */}
              <Alert className="mt-8">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Aviso</AlertTitle>
                <AlertDescription>
                  Esta é uma ferramenta de auxílio e não substitui o julgamento clínico profissional. Verifique sempre as informações com fontes primárias.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}