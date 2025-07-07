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
  Users,
  Award,
  BarChart3,
  CheckSquare,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { useAuth } from '@clerk/nextjs';

// Define interfaces for the new GRADE-based evidence appraisal output
interface QualityFactor {
  factor_name: string;
  assessment: string; // 'POSITIVO', 'NEUTRO', 'NEGATIVO'
  justification: string;
}

interface BiasAnalysis {
  selection_bias: string;
  performance_bias: string;
  reporting_bias: string;
  confirmation_bias: string;
}

interface GradeEvidenceAppraisalOutput {
  overall_quality: string; // 'ALTA', 'MODERADA', 'BAIXA', 'MUITO BAIXA'
  quality_reasoning: string;
  quality_factors: QualityFactor[];
  recommendation_strength: string; // 'FORTE', 'FRACA'
  strength_reasoning: string;
  bias_analysis: BiasAnalysis;
  practice_recommendations: string[];
}

interface EvidenceAppraisalComponentProps {
  className?: string;
}

export default function EvidenceAppraisalComponent({ className }: EvidenceAppraisalComponentProps) {
  const { getToken } = useAuth();

  // Estados principais
  const [clinicalQuestion, setClinicalQuestion] = useState('');
  const [evidenceSummary, setEvidenceSummary] = useState('');
  const [results, setResults] = useState<GradeEvidenceAppraisalOutput | null>(null);
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

      // Adapt payload for the unified analysis endpoint
      const payload = {
        paper_full_text: evidenceSummary,
        clinical_question_PICO: clinicalQuestion,
      };

      const response = await fetch('/api/research-assistant/unified-evidence-analysis-translated', {
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

      const data: GradeEvidenceAppraisalOutput = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.');
      console.error("Error in evidence appraisal:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getAssessmentIcon = (assessment: string) => {
    switch (assessment) {
      case 'POSITIVO': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'NEUTRO': return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case 'NEGATIVO': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <HelpCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getAssessmentColor = (assessment: string) => {
    switch (assessment) {
      case 'POSITIVO': return 'text-green-600';
      case 'NEUTRO': return 'text-amber-600';
      case 'NEGATIVO': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const renderUnifiedResults = () => results && (
    <div className="space-y-8 pt-8 mt-8 border-t animate-fade-in">
      {/* Dashboard de Confiança - Cabeçalho */}
      <Card className="border-t-4 border-t-blue-600">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <Award className="mr-2 h-6 w-6 text-blue-600" />
            Dashboard de Confiança da Evidência
          </CardTitle>
          <CardDescription>
            Avaliação estruturada baseada no framework GRADE
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Qualidade da Evidência */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">Qualidade da Evidência</h3>
                <Badge 
                  className={`text-md py-1 px-3 ${results?.overall_quality === 'ALTA' ? 'bg-green-100 text-green-800' : 
                    results?.overall_quality === 'MODERADA' ? 'bg-amber-100 text-amber-800' : 
                    results?.overall_quality === 'BAIXA' ? 'bg-orange-100 text-orange-800' : 
                    'bg-red-100 text-red-800'}`}
                >
                  {results?.overall_quality}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">{results?.quality_reasoning}</p>
            </div>

            {/* Força da Recomendação */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">Força da Recomendação</h3>
                <Badge 
                  className={`text-md py-1 px-3 ${results?.recommendation_strength === 'FORTE' ? 
                    'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}
                >
                  {results?.recommendation_strength}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">{results?.strength_reasoning}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fatores de Qualidade */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="mr-2 h-5 w-5 text-blue-600" />
            Fatores que Influenciam a Qualidade
          </CardTitle>
          <CardDescription>Detalhamento dos fatores que impactam a qualidade da evidência</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results?.quality_factors?.map((factor: QualityFactor, index: number) => (
              <Card key={index} className="bg-white border-l-4 border-l-blue-600">
                <CardHeader className="pb-2">
                  <CardTitle className="text-md flex items-center">
                    {getAssessmentIcon(factor.assessment)}
                    <span className="ml-2">{factor.factor_name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge 
                    variant="outline" 
                    className={`mb-2 ${getAssessmentColor(factor.assessment)}`}
                  >
                    {factor.assessment}
                  </Badge>
                  <p className="text-sm text-muted-foreground">{factor.justification}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Análise de Viés */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Scale className="mr-2 h-5 w-5 text-blue-600" />
            Análise de Viés
          </CardTitle>
          <CardDescription>Avaliação dos principais tipos de viés no estudo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Viés de Seleção</h4>
              <p className="text-sm text-muted-foreground">{results.bias_analysis.selection_bias}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Viés de Performance</h4>
              <p className="text-sm text-muted-foreground">{results.bias_analysis.performance_bias}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Viés de Relato</h4>
              <p className="text-sm text-muted-foreground">{results.bias_analysis.reporting_bias}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Viés de Confirmação</h4>
              <p className="text-sm text-muted-foreground">{results.bias_analysis.confirmation_bias}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recomendações para Prática */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckSquare className="mr-2 h-5 w-5 text-blue-600" />
            Recomendações para Prática Clínica
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertTitle>Aplicação Clínica</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-2 mt-2">
                {results.practice_recommendations.map((rec, index) => (
                  <li key={index} className="text-muted-foreground">{rec}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center text-purple-800">
            <TrendingUp className="h-5 w-5 mr-2" />
            Avaliação Crítica da Evidência
          </CardTitle>
          <CardDescription>
            Forneça um resumo ou abstract para uma avaliação crítica da qualidade e aplicabilidade da evidência.
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

          {results && renderUnifiedResults()}
        </CardContent>
      </Card>
    </div>
  );
}