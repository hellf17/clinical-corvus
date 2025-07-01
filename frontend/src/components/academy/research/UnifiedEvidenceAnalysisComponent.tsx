"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Separator } from '@/components/ui/Separator';
import {
  Scale,
  RefreshCw,
  Info,
  Upload,
  X,
  FileText,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Target,
  Search,
  HelpCircle,
  Copy,
  ExternalLink,
  BarChart3,
  TrendingUp,
  Award,
  AlertCircle,
  CheckSquare
} from 'lucide-react';

// Interfaces for data types
interface PDFAnalysisOutput {
  document_type: string;
  key_findings: string[];
  methodology_summary: string;
  clinical_relevance: string;
  evidence_quality: string;
  recommendations: string[];
  limitations: string[];
  structured_summary: string;
}

interface BiasAssessmentDetail {
  bias_type: string;
  risk_level: string;
  explanation: string;
  mitigation_strategies: string[];
}

interface StatisticalAssessment {
  sample_size_adequacy: string;
  statistical_methods_appropriateness: string;
  effect_size_interpretation: string;
  confidence_intervals_assessment: string;
  p_value_interpretation: string;
  multiple_comparisons_concern: string;
}

interface ClinicalApplication {
  clinical_relevance: string;
  patient_population_match: string;
  outcome_relevance: string;
  practical_feasibility: string;
  cost_effectiveness_considerations: string | null;
  ethical_considerations: string[];
}

interface QualityAssessment {
    overall_quality_grade: string;
    methodological_rigor_score: string;
    risk_of_bias_summary: string;
    applicability_concerns: string[];
    reporting_quality: string;
}

interface EnhancedAppraisalOutput {
  identified_study_type: string;
  study_design_appropriateness: string;
  quality_assessment: QualityAssessment;
  methodological_strengths: string[];
  methodological_limitations: string[];
  bias_assessments: BiasAssessmentDetail[];
  overall_bias_risk: string;
  statistical_assessment: StatisticalAssessment;
  clinical_application: ClinicalApplication;
  pico_alignment_assessment: string;
  population_match_percentage: string;
  intervention_comparability: string;
  outcome_relevance_score: string;
  strength_of_recommendation: string;
  level_of_evidence: string;
  confidence_in_findings: string;
  recommendations_for_practice: string[];
  areas_requiring_more_research: string[];
  next_steps_for_evidence_evaluation: string[];
  key_clinical_considerations: string[];
  potential_harms_or_risks: string[];
  patient_preference_factors: string[];
  generalizability_assessment: string;
  external_validity_concerns: string[];
  study_limitations_impact: string;
  learning_points: string[];
  critical_appraisal_checklist: string[];
  evidence_synthesis_date: string;
}

interface Props {
  initialContent?: string;
  onContentExtracted?: (content: string) => void;
  onTransferToResearch?: (query: string) => void;
}

export default function UnifiedEvidenceAnalysisComponent({
  initialContent = '',
  onContentExtracted,
  onTransferToResearch
}: Props) {
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unified State
  const [analysisMode, setAnalysisMode] = useState<'pdf' | 'text'>('pdf');
  const [clinicalQuestion, setClinicalQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PDF State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfResults, setPdfResults] = useState<PDFAnalysisOutput | null>(null);

  // Text State
  const [evidenceText, setEvidenceText] = useState(initialContent);
  const [textResults, setTextResults] = useState<EnhancedAppraisalOutput | null>(null);

  useEffect(() => {
    if (initialContent && initialContent !== evidenceText) {
      setEvidenceText(initialContent);
      setAnalysisMode('text');
    }
  }, [initialContent, evidenceText]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Por favor, selecione apenas arquivos PDF.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('O arquivo deve ter no máximo 10MB.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearResults = () => {
    setPdfResults(null);
    setTextResults(null);
    setError(null);
  };

  const handlePDFSubmit = async () => {
    if (!selectedFile) {
      throw new Error('Por favor, selecione um arquivo PDF.');
    }
    if (!clinicalQuestion.trim()) {
      throw new Error('Por favor, insira sua pergunta ou questionamento clínico.');
    }

    const token = await getToken();
    if (!token) throw new Error('Erro de autenticação. Por favor, faça login novamente.');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('clinical_question', clinicalQuestion.trim());

    const response = await fetch('/api/research-assistant/analyze-pdf-translated', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Falha na análise do PDF (status: ${response.status}).`);
    }

    const data: PDFAnalysisOutput = await response.json();
    setPdfResults(data);
    if (onContentExtracted) onContentExtracted(data.structured_summary);
  };

  const handleTextSubmit = async () => {
    if (!evidenceText.trim()) {
      throw new Error('Por favor, insira o resumo da evidência.');
    }
    if (!clinicalQuestion.trim()) {
      throw new Error('Por favor, insira sua pergunta clínica.');
    }

    const token = await getToken();
    if (!token) throw new Error('Erro de autenticação. Por favor, faça login novamente.');

    const payload = {
      evidence_summary_or_abstract: evidenceText.trim(),
      clinical_question_PICO: clinicalQuestion.trim(),
    };

    const response = await fetch('/api/research-assistant/appraise-evidence-translated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Falha na avaliação crítica (status: ${response.status}).`);
    }

    const data: EnhancedAppraisalOutput = await response.json();
    setTextResults(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearResults();

    try {
      if (analysisMode === 'pdf') {
        await handlePDFSubmit();
      } else {
        await handleTextSubmit();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocorreu um erro desconhecido.');
      console.error(`Error in ${analysisMode} submission:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getGradeColor = (grade: string) => {
    switch (grade?.toLowerCase()) {
      case 'alta': return 'text-green-600';
      case 'moderada': return 'text-amber-600';
      case 'baixa': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getRiskBadgeVariant = (riskLevel: string): 'default' | 'secondary' | 'destructive' => {
    switch (riskLevel?.toLowerCase()) {
      case 'baixo':
        return 'default'; // Or a custom 'success' if you have it
      case 'moderado':
        return 'secondary'; // Or a custom 'warning'
      default:
        return 'destructive';
    }
  };

  const renderPDFResults = () => pdfResults && (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center"><Target className="mr-2 h-5 w-5 text-blue-600" />Resumo Estruturado</CardTitle></CardHeader>
        <CardContent><p className="text-muted-foreground whitespace-pre-line">{pdfResults.structured_summary}</p></CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center"><BookOpen className="mr-2 h-5 w-5 text-purple-600" />Principais Achados</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {pdfResults.key_findings.map((finding, index) => (
              <li key={index} className="flex items-start">
                <CheckCircle className="h-5 w-5 mr-3 mt-1 text-blue-500 flex-shrink-0" />
                <span className="text-muted-foreground">{finding}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );

  const renderTextResults = () => textResults && (
    <div className="space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-center">
            <Card>
                <CardHeader><CardTitle className="text-base font-semibold">Qualidade Geral</CardTitle></CardHeader>
                <CardContent><p className={`text-2xl font-bold ${getGradeColor(textResults.quality_assessment.overall_quality_grade)}`}>{textResults.quality_assessment.overall_quality_grade}</p></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="text-base font-semibold">Força da Recomendação</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-gray-700">{textResults.strength_of_recommendation}</p></CardContent>
            </Card>
            <Card>
                <CardHeader><CardTitle className="text-base font-semibold">Nível de Evidência</CardTitle></CardHeader>
                <CardContent><p className="text-2xl font-bold text-gray-700">{textResults.level_of_evidence}</p></CardContent>
            </Card>
        </div>

        <Separator />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <h3 className="font-semibold text-lg flex items-center mb-3"><TrendingUp className="mr-2 h-5 w-5 text-green-600" />Pontos Fortes Metodológicos</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
                    {textResults.methodological_strengths.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>
            <div>
                <h3 className="font-semibold text-lg flex items-center mb-3"><AlertTriangle className="mr-2 h-5 w-5 text-yellow-600" />Limitações Metodológicas</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
                    {textResults.methodological_limitations.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
            </div>
        </div>

        <Separator />

        <div>
            <h3 className="font-semibold text-lg flex items-center mb-4"><Scale className="mr-2 h-5 w-5" />Análise de Viés</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {textResults.bias_assessments.map((bias, index) => (
                    <Card key={index} className="bg-white">
                        <CardHeader>
                            <CardTitle className="text-md">{bias.bias_type}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Badge variant={getRiskBadgeVariant(bias.risk_level)}>
                                {bias.risk_level}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-2">{bias.explanation}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>

        <Separator />

        <div>
            <h3 className="font-semibold text-lg flex items-center mb-3"><CheckSquare className="mr-2 h-5 w-5 text-blue-600" />Recomendações para Prática</h3>
            <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertTitle>Diretrizes Clínicas</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc list-inside space-y-1">
                        {textResults.recommendations_for_practice.map((rec, index) => <li key={index}>{rec}</li>)}
                    </ul>
                </AlertDescription>
            </Alert>
        </div>
    </div>
  );

  return (
    <div className="w-full mx-auto space-y-6">
      <Card className="border-l-4 border-indigo-600">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <BarChart3 className="mr-3 h-6 w-6 text-indigo-600" />
            Análise de Evidências Unificada
          </CardTitle>
          <CardDescription className="pl-9">
            Avalie criticamente artigos em PDF ou resumos de texto para informar sua prática clínica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <Tabs value={analysisMode} onValueChange={(v) => setAnalysisMode(v as 'pdf' | 'text')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pdf"><FileText className="mr-2 h-4 w-4"/>Analisar PDF</TabsTrigger>
                <TabsTrigger value="text"><BookOpen className="mr-2 h-4 w-4"/>Analisar Texto</TabsTrigger>
              </TabsList>
              <TabsContent value="pdf" className="pt-6">
                <div
                  className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg hover:border-indigo-500 transition-colors duration-200 bg-gray-50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (e.dataTransfer.files) {
                      handleFileSelect({ target: { files: e.dataTransfer.files } } as any);
                    }
                  }}
                >
                  <Upload className="w-10 h-10 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-indigo-600 cursor-pointer hover:underline" onClick={() => fileInputRef.current?.click()}>
                      Clique para selecionar
                    </span> ou arraste e solte o PDF.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Tamanho máximo: 10MB</p>
                  <Input ref={fileInputRef} type="file" className="sr-only" accept=".pdf" onChange={handleFileSelect} id="pdf-upload"/>
                </div>
                {selectedFile && (
                  <div className="flex items-center justify-between p-3 mt-4 bg-slate-100 rounded-md border border-slate-200">
                    <div className="flex items-center min-w-0">
                      <FileText className="h-5 w-5 text-slate-600 mr-3 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{selectedFile.name}</p>
                        <p className="text-xs text-slate-500">{formatFileSize(selectedFile.size)}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleRemoveFile} type="button">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="text" className="pt-6">
                  <Textarea
                    value={evidenceText}
                    onChange={(e) => setEvidenceText(e.target.value)}
                    placeholder="Cole aqui o resumo, abstract ou trecho da evidência..."
                    rows={10}
                    className="w-full"
                  />
              </TabsContent>
            </Tabs>

            <div className="space-y-2 pt-4">
              <label htmlFor="clinical-question" className="block text-sm font-medium text-gray-700">
                <HelpCircle className="inline-block mr-2 h-4 w-4" />
                Pergunta Clínica ou PICO
              </label>
              <Textarea
                id="clinical-question"
                value={clinicalQuestion}
                onChange={(e) => setClinicalQuestion(e.target.value)}
                placeholder="Ex: Em pacientes com diabetes tipo 2, o uso de SGLT2 inibidores, comparado a placebo, reduz eventos cardiovasculares?"
                rows={3}
                className="w-full"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Analisar Evidência
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro na Análise</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6">
        {isLoading && (
          <div className="flex justify-center items-center p-10">
            <RefreshCw className="h-8 w-8 text-indigo-600 animate-spin" />
            <p className="ml-4 text-lg">Processando sua solicitação...</p>
          </div>
        )}
        {!isLoading && !error && (
          analysisMode === 'pdf' ? renderPDFResults() : renderTextResults()
        )}
      </div>
    </div>
  );
}