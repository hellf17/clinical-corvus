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
  extracted_content: string;
  document_type: string;
  key_findings: string[];
  study_methodology: string;
  main_conclusions: string[];
  limitations_identified: string[];
  disclaimer: string;
}

interface EnhancedAppraisalOutput {
  overall_quality_grade: string;
  strength_of_recommendation: string;
  key_strengths: string[];
  key_limitations: string[];
  bias_assessment: BiasAssessment;
  clinical_applicability: string;
  statistical_assessment: StatisticalAssessment;
  generalizability: string;
  recommendations_for_practice: string[];
  areas_for_further_research: string[];
  disclaimer: string;
}

interface BiasAssessment {
  selection_bias_risk: string;
  performance_bias_risk: string;
  detection_bias_risk: string;
  attrition_bias_risk: string;
  reporting_bias_risk: string;
  overall_bias_assessment: string;
}

interface StatisticalAssessment {
  sample_size_adequacy: string;
  statistical_methods_appropriate: string;
  confidence_intervals_reported: string;
  p_value_interpretation: string;
  effect_size_clinically_meaningful: string;
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

      const response = await fetch('/api/deep-research/analyze-pdf', {
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
        onContentExtracted(data.extracted_content);
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

      const requestData = {
        evidence_text: evidenceText.trim(),
        clinical_question: clinicalQuestion.trim(),
      };

      const response = await fetch('/api/deep-research/appraise-evidence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestData),
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
      setEvidenceText(pdfResults.extracted_content);
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
                      <div className="p-6 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
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
        <div className="mt-6 p-4 border rounded-md bg-sky-50 border-sky-200">
          <div className="flex items-center">
            <CheckSquare className="h-4 w-4 mr-2" />
            <span className="text-sm font-medium text-sky-800">PDF processado com sucesso!</span>
          </div>
        </div>
      )}
    </div>
  );
} 