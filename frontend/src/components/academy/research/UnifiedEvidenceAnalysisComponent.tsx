"use client";

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Progress } from '@/components/ui/Progress';
import { Separator } from '@/components/ui/Separator';
import { 
  Scale, 
  RefreshCw, 
  Info, 
  Upload,
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

// Interfaces para tipos de dados
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
  const { getToken, isLoaded: authIsLoaded } = useAuth();
  
  // Estados principais
  const [analysisMode, setAnalysisMode] = useState<'pdf' | 'text'>('pdf');
  const [clinicalQuestion, setClinicalQuestion] = useState('');
  
  // Estados para PDF
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [extractionMode, setExtractionMode] = useState('standard');
  const [pdfResults, setPdfResults] = useState<PDFAnalysisOutput | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  
  // Estados para análise de texto
  const [evidenceText, setEvidenceText] = useState(initialContent);
  const [textResults, setTextResults] = useState<EnhancedAppraisalOutput | null>(null);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  
  // Estados de fluxo unificado
  const [unifiedFlow, setUnifiedFlow] = useState(false);
  
  // Atualizar quando initialContent muda
  useEffect(() => {
    if (initialContent && initialContent !== evidenceText) {
      setEvidenceText(initialContent);
      setAnalysisMode('text');
    }
  }, [initialContent, evidenceText]);

  const handlePDFSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPdfLoading(true);
    setPdfError(null);
    setPdfResults(null);
    
    try {
      if (!selectedFile) {
        throw new Error('Por favor, selecione um arquivo PDF.');
      }
      
      if (!clinicalQuestion.trim()) {
        throw new Error('Por favor, insira sua pergunta ou questionamento clínico.');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Erro de autenticação. Por favor, faça login novamente.');
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('clinical_question', clinicalQuestion.trim());
      formData.append('extraction_mode', extractionMode);

      const response = await fetch('/api/research-assistant/analyze-pdf-translated', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          detail: 'Falha ao processar o PDF. Tente novamente.',
          error: 'Erro de conexão com o servidor.' 
        }));
        
        const errorMessage = errorData.error || errorData.detail || errorData.message || 
          `Falha na análise do PDF (status: ${response.status}).`;
        throw new Error(errorMessage);
      }

      const data: PDFAnalysisOutput = await response.json();
      setPdfResults(data);
      
      // Notificar componente pai sobre extração
      if (onContentExtracted) {
        onContentExtracted(data.structured_summary);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao processar o PDF.';
      setPdfError(errorMessage);
      console.error("Error in handlePDFSubmit:", err);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTextLoading(true);
    setTextError(null);
    setTextResults(null);
    
    try {
      if (!evidenceText.trim()) {
        throw new Error('Por favor, insira o resumo da evidência.');
      }
      
      if (!clinicalQuestion.trim()) {
        throw new Error('Por favor, insira sua pergunta clínica.');
      }

      const token = await getToken();
      if (!token) {
        throw new Error('Erro de autenticação. Por favor, faça login novamente.');
      }

      const payload = {
        evidence_summary_or_abstract: evidenceText.trim(),
        clinical_question_PICO: clinicalQuestion.trim(),
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
        const errorData = await response.json().catch(() => ({ 
          detail: 'Falha ao avaliar a evidência. Tente novamente.',
          error: 'Erro de conexão com o servidor.' 
        }));
        
        const errorMessage = errorData.error || errorData.detail || errorData.message || 
          `Falha na avaliação crítica (status: ${response.status}).`;
        throw new Error(errorMessage);
      }

      const data: EnhancedAppraisalOutput = await response.json();
      setTextResults(data);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao avaliar a evidência.';
      setTextError(errorMessage);
      console.error("Error in handleTextSubmit:", err);
    } finally {
      setIsTextLoading(false);
    }
  };

  const handleTransferPDFToText = () => {
    if (pdfResults) {
      setEvidenceText(pdfResults.structured_summary);
      setAnalysisMode('text');
      setUnifiedFlow(true);
    }
  };

  const handleTransferToResearch = (query: string) => {
    if (onTransferToResearch) {
      onTransferToResearch(query);
    }
  };

  const getGradeColor = (grade: string) => {
    const gradeType = grade.toLowerCase();
    if (gradeType.includes('a') || gradeType.includes('alta') || gradeType.includes('excelente')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (gradeType.includes('b') || gradeType.includes('média') || gradeType.includes('moderada')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (gradeType.includes('c') || gradeType.includes('baixa') || gradeType.includes('limitada')) return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="space-y-8">
      {/* Cabeçalho Aprimorado */}
      <Card className="border-l-4 border-l-[#4d9e3f]">
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Scale className="h-6 w-6 mr-3" />
            Análise de Evidências
          </CardTitle>
          <CardDescription>
            Avalie criticamente artigos científicos através de upload de PDF ou análise de texto manual
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Seletor de Modo Aprimorado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Escolha o Método de Análise</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={analysisMode} onValueChange={(value) => setAnalysisMode(value as 'pdf' | 'text')}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="pdf" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
                <Upload className="h-4 w-4 mr-2" />
                Upload de PDF
              </TabsTrigger>
              <TabsTrigger value="text" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                <FileText className="h-4 w-4 mr-2" />
                Análise de Texto
              </TabsTrigger>
            </TabsList>

            {/* Pergunta Clínica Universal */}
            <div className="mb-6">
              <label htmlFor="clinicalQuestion" className="block text-sm font-medium mb-2">
                Pergunta ou Questionamento Clínico <span className="text-red-500">*</span>
              </label>
              <Textarea
                id="clinicalQuestion"
                placeholder="Ex: Este estudo fornece evidências suficientes para recomendar o uso de estatinas em prevenção primária em pacientes idosos?"
                rows={3}
                value={clinicalQuestion}
                onChange={(e) => setClinicalQuestion(e.target.value)}
                disabled={isPdfLoading || isTextLoading}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formule uma pergunta específica que oriente a análise crítica da evidência
              </p>
            </div>

            {/* Análise de PDF */}
            <TabsContent value="pdf" className="space-y-6">
              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center text-blue-800">
                    <Upload className="h-5 w-5 mr-2" />
                    Análise de Artigo via PDF
                  </CardTitle>
                  <CardDescription>
                    Faça upload de um artigo científico em PDF para análise automática
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePDFSubmit} className="space-y-6">
                    {/* Upload de Arquivo Aprimorado */}
                    <div>
                      <label htmlFor="file-upload" className="block text-sm font-medium mb-2">
                        Arquivo PDF <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="file-upload"
                          type="file"
                          accept=".pdf"
                          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                          disabled={isPdfLoading}
                          className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
                          required
                        />
                        {selectedFile && (
                          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center">
                              <FileText className="h-4 w-4 text-blue-600 mr-2" />
                              <span className="text-sm text-blue-800 font-medium">{selectedFile.name}</span>
                              <Badge variant="outline" className="ml-2 text-xs">
                                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                              </Badge>
                            </div>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Formatos aceitos: PDF (máximo 10MB). Preferencialmente artigos científicos completos.
                      </p>
                    </div>

                    {/* Modo de Extração */}
                    <div>
                      <label htmlFor="extractionMode" className="block text-sm font-medium mb-2">
                        Modo de Extração
                      </label>
                      <Select value={extractionMode} onValueChange={setExtractionMode}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o modo de extração" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="standard">Padrão - Extração completa</SelectItem>
                          <SelectItem value="methodology">Focado em Metodologia</SelectItem>
                          <SelectItem value="results">Focado em Resultados</SelectItem>
                          <SelectItem value="discussion">Focado em Discussão</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Estados de Loading para PDF */}
                    {isPdfLoading && (
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center mb-3">
                          <RefreshCw className="h-5 w-5 text-blue-600 animate-spin mr-2" />
                          <h4 className="font-medium text-blue-800">Processando PDF</h4>
                        </div>
                        <Progress value={60} className="mb-3" />
                        <div className="text-sm text-blue-700">
                          Extraindo conteúdo e analisando estrutura do documento...
                        </div>
                      </div>
                    )}

                    {/* Botões PDF */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button variant="default" disabled={isPdfLoading || !authIsLoaded} className="flex-1">
                        {isPdfLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Processando PDF...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Analisar PDF
                          </>
                        )}
                      </Button>
                      
                      {pdfResults && !isPdfLoading && (
                        <Button 
                          type="button" 
                          variant="secondary" 
                          onClick={handleTransferPDFToText}
                          className="bg-[#44154a] hover:bg-[#44154a]/90 text-white"
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Usar na Análise de Texto
                        </Button>
                      )}
                    </div>

                    {/* Erro PDF */}
                    {pdfError && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Erro no Processamento</AlertTitle>
                        <AlertDescription>{pdfError}</AlertDescription>
                      </Alert>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Análise de Texto */}
            <TabsContent value="text" className="space-y-6">
              <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center text-blue-800">
                    <FileText className="h-5 w-5 mr-2" />
                    Análise Manual de Evidência
                  </CardTitle>
                  <CardDescription>
                    Cole o texto ou resumo da evidência científica para avaliação crítica
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleTextSubmit} className="space-y-6">
                    {/* Texto da Evidência */}
                    <div>
                      <label htmlFor="evidenceText" className="block text-sm font-medium mb-2">
                        Texto da Evidência <span className="text-red-500">*</span>
                      </label>
                      <Textarea
                        id="evidenceText"
                        placeholder="Cole aqui o abstract, resumo ou texto completo do estudo que deseja analisar..."
                        rows={8}
                        value={evidenceText}
                        onChange={(e) => setEvidenceText(e.target.value)}
                        disabled={isTextLoading}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Quanto mais detalhado o texto, mais precisa será a análise crítica
                      </p>
                    </div>

                    {/* Estados de Loading para Texto */}
                    {isTextLoading && (
                      <div className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
                        <div className="flex items-center mb-3">
                          <RefreshCw className="h-5 w-5 text-purple-600 animate-spin mr-2" />
                          <h4 className="font-medium text-purple-800">Realizando Análise Crítica</h4>
                        </div>
                        <Progress value={75} className="mb-3" />
                        <div className="text-sm text-purple-700">
                          Avaliando qualidade metodológica, vieses e aplicabilidade clínica...
                        </div>
                      </div>
                    )}

                    {/* Botões Texto */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button type="submit" disabled={isTextLoading || !authIsLoaded} className="flex-1">
                        {isTextLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Analisando Evidência...
                          </>
                        ) : (
                          <>
                            <Scale className="h-4 w-4 mr-2" />
                            Avaliar Criticamente
                          </>
                        )}
                      </Button>
                      
                      {evidenceText && !isTextLoading && (
                        <Button 
                          type="button" 
                          variant="default" 
                          onClick={() => handleTransferToResearch?.(evidenceText)}
                          className="text-white"
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Buscar Mais Evidências
                        </Button>
                      )}
                    </div>

                    {/* Erro Texto */}
                    {textError && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Erro na Análise</AlertTitle>
                        <AlertDescription>{textError}</AlertDescription>
                      </Alert>
                    )}
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Helper quando não há resultados */}
      {!pdfResults && !textResults && !isPdfLoading && !isTextLoading && !pdfError && !textError && (
        <div className="mt-6 p-4 border rounded-md bg-sky-50 border-sky-200">
          <div className="flex items-center">
            <HelpCircle className="h-5 w-5 mr-2" />
            <h3 className="text-md font-semibold text-sky-700">Pronto para avaliar evidências?</h3>
          </div>
          <p className="text-sm text-sky-600 mt-1">
            Escolha entre fazer upload de um PDF para extração automática ou inserir manualmente o texto da evidência para avaliação crítica detalhada.
          </p>
        </div>
      )}

      {pdfResults && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="mr-2" />
              Resultados da Análise do PDF
            </CardTitle>
            <CardDescription>
              Análise detalhada do documento: <strong>{selectedFile?.name}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Resumo Estruturado */}
            <div className="space-y-2">
              <h3 className="font-semibold text-lg flex items-center"><BookOpen className="mr-2 h-5 w-5" />Resumo Estruturado</h3>
              <p className="text-muted-foreground">{pdfResults.structured_summary}</p>
            </div>

            <Separator />

            {/* Tipo de Documento */}
            <div className="space-y-2">
              <h4 className="font-semibold">Tipo de Documento</h4>
              <Badge variant="secondary">{pdfResults.document_type}</Badge>
            </div>

            {/* Principais Achados */}
            <div className="space-y-2">
              <h4 className="font-semibold">Principais Achados</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {pdfResults.key_findings.map((finding, index) => <li key={index}>{finding}</li>)}
              </ul>
            </div>

            {/* Relevância Clínica */}
            <div className="space-y-2">
              <h4 className="font-semibold">Relevância Clínica</h4>
              <p className="text-muted-foreground">{pdfResults.clinical_relevance}</p>
            </div>
            
            {/* Qualidade da Evidência */}
            <div className="space-y-2">
              <h4 className="font-semibold">Qualidade da Evidência</h4>
              <p className="text-muted-foreground">{pdfResults.evidence_quality}</p>
            </div>

            {/* Metodologia */}
            <div className="space-y-2">
              <h4 className="font-semibold">Resumo da Metodologia</h4>
              <p className="text-muted-foreground">{pdfResults.methodology_summary}</p>
            </div>

            {/* Recomendações */}
            <div className="space-y-2">
              <h4 className="font-semibold">Recomendações</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {pdfResults.recommendations.map((rec, index) => <li key={index}>{rec}</li>)}
              </ul>
            </div>

            {/* Limitações */}
            <div className="space-y-2">
              <h4 className="font-semibold">Limitações</h4>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Pontos de Atenção</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {pdfResults.limitations.map((limitation, index) => <li key={index}>{limitation}</li>)}
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

          </CardContent>
        </Card>
      )}

      {textResults && (
        <Card className="mt-6 bg-gray-50/50">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Award className="mr-3 h-8 w-8 text-blue-600" />
              Avaliação Crítica da Evidência
            </CardTitle>
            <CardDescription>
              Análise aprofundada da evidência fornecida em resposta à sua pergunta clínica.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 p-6">
            
            {/* Overall Assessment Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Qualidade da Evidência</CardTitle>
                  <CardDescription>Nota geral</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className={`text-4xl font-bold ${getGradeColor(textResults.quality_assessment.overall_quality_grade)}`}>
                    {textResults.quality_assessment.overall_quality_grade}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Força da Recomendação</CardTitle>
                  <CardDescription>Baseado na qualidade</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-700">{textResults.strength_of_recommendation}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Nível de Evidência</CardTitle>
                  <CardDescription>Hierarquia de estudo</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-700">{textResults.level_of_evidence}</p>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Strengths and Limitations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center"><TrendingUp className="mr-2 h-5 w-5 text-green-600" />Pontos Fortes Metodológicos</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
                  {textResults.methodological_strengths.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-yellow-600" />Limitações Metodológicas</h3>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-2">
                  {textResults.methodological_limitations.map((item, index) => <li key={index}>{item}</li>)}
                </ul>
              </div>
            </div>

            <Separator />

            {/* Bias Assessment */}
            <div>
              <h3 className="font-semibold text-lg flex items-center mb-3"><Scale className="mr-2 h-5 w-5" />Análise de Viés</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {textResults.bias_assessments.map((bias, index) => (
                  <Card key={index} className="bg-white">
                    <CardHeader>
                      <CardTitle className="text-md">_</CardTitle>
                      <CardDescription>{bias.bias_type}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={bias.risk_level === 'Baixo' ? 'default' : bias.risk_level === 'Moderado' ? 'secondary' : 'destructive'}>
                        {bias.risk_level}
                      </Badge>
                      <p className="text-sm text-muted-foreground mt-2">{bias.explanation}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            {/* Recommendations */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center"><CheckSquare className="mr-2 h-5 w-5 text-blue-600" />Recomendações para Prática</h3>
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

          </CardContent>
        </Card>
      )}
    </div>
  );
} 