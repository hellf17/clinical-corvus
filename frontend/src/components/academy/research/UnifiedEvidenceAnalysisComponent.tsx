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
import { Label } from '@/components/ui/Label';
import {
  Scale,
  RefreshCw,
  Upload,
  X,
  FileText,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  Target,
  Search,
  HelpCircle,
  BarChart3,
  TrendingUp,
  Award,
  CheckSquare,
  AlertCircle,
  Loader2
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
  
  // Unified Dashboard State
  const [unifiedResults, setUnifiedResults] = useState<GradeEvidenceAppraisalOutput | null>(null);

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
    setUnifiedResults(null);
    setError(null);
  };
  
  const handleUnifiedSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsLoading(true);
    setError(null);
    setUnifiedResults(null);

    try {
      if (!evidenceText.trim()) {
        throw new Error('Por favor, insira o texto completo do artigo.');
      }
      if (!clinicalQuestion.trim()) {
        throw new Error('Por favor, insira sua pergunta clínica.');
      }

      const token = await getToken();
      if (!token) throw new Error('Erro de autenticação. Por favor, faça login novamente.');

      const payload = {
        paper_full_text: evidenceText.trim(),
        clinical_question_PICO: clinicalQuestion.trim(),
      };

      const response = await fetch('/api/research-assistant/unified-evidence-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Falha na análise unificada (status: ${response.status}).`);
      }

      const data: GradeEvidenceAppraisalOutput = await response.json();
      setUnifiedResults(data);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.');
      console.error("Error in unified evidence analysis:", err);
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

  const getAssessmentColor = (assessment: string) => {
    switch (assessment) {
      case 'POSITIVO': return 'text-green-600';
      case 'NEUTRO': return 'text-amber-600';
      case 'NEGATIVO': return 'text-red-600';
      default: return 'text-gray-600';
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

  const getRecommendationColor = (strength: string) => {
    return strength === 'FORTE' ? 'text-blue-600' : 'text-amber-600';
  };

  const renderUnifiedResults = () => unifiedResults && (
    <div className="space-y-8">
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
                  className={`text-md py-1 px-3 ${unifiedResults?.overall_quality === 'ALTA' ? 'bg-green-100 text-green-800' : 
                    unifiedResults?.overall_quality === 'MODERADA' ? 'bg-amber-100 text-amber-800' : 
                    unifiedResults?.overall_quality === 'BAIXA' ? 'bg-orange-100 text-orange-800' : 
                    'bg-red-100 text-red-800'}`}
                >
                  {unifiedResults?.overall_quality}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">{unifiedResults?.quality_reasoning}</p>
            </div>

            {/* Força da Recomendação */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">Força da Recomendação</h3>
                <Badge 
                  className={`text-md py-1 px-3 ${unifiedResults?.recommendation_strength === 'FORTE' ? 
                    'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}
                >
                  {unifiedResults?.recommendation_strength}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">{unifiedResults?.strength_reasoning}</p>
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
            {unifiedResults?.quality_factors?.map((factor: QualityFactor, index: number) => (
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
              <p className="text-sm text-muted-foreground">{unifiedResults.bias_analysis.selection_bias}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Viés de Performance</h4>
              <p className="text-sm text-muted-foreground">{unifiedResults.bias_analysis.performance_bias}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Viés de Relato</h4>
              <p className="text-sm text-muted-foreground">{unifiedResults.bias_analysis.reporting_bias}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Viés de Confirmação</h4>
              <p className="text-sm text-muted-foreground">{unifiedResults.bias_analysis.confirmation_bias}</p>
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
                {unifiedResults.practice_recommendations.map((rec, index) => (
                  <li key={index} className="text-muted-foreground">{rec}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );

  // Add a PDF submission handler
  const handlePdfSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!selectedFile) {
      setError('Por favor, selecione um arquivo PDF.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setPdfResults(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Erro de autenticação. Por favor, faça login novamente.');

      const formData = new FormData();
      formData.append('file', selectedFile);
      
      if (clinicalQuestion.trim()) {
        formData.append('clinical_question', clinicalQuestion.trim());
      }

      const response = await fetch('/api/research-assistant/analyze-pdf', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Falha na análise do PDF (status: ${response.status}).`);
      }

      const data: PDFAnalysisOutput = await response.json();
      setPdfResults(data);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.');
      console.error("Error in PDF analysis:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full mx-auto space-y-6">
      <Card className="border-l-4 border-indigo-600">
        <CardHeader>
          <CardTitle className="flex items-center text-xl">
            <BarChart3 className="mr-3 h-6 w-6 text-indigo-600" />
            Análise de Evidências Unificada
          </CardTitle>
          <CardDescription className="pl-9">
            Avalie criticamente artigos fazendo upload de PDF ou colando o texto para uma análise detalhada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={analysisMode} onValueChange={(v) => setAnalysisMode(v as 'pdf' | 'text')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pdf"><FileText className="mr-2 h-4 w-4"/>Analisar PDF</TabsTrigger>
              <TabsTrigger value="text"><BookOpen className="mr-2 h-4 w-4"/>Analisar Texto</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pdf" className="pt-6">
              <form onSubmit={handlePdfSubmit} className="space-y-6">
                <label
                  htmlFor="pdf-upload"
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-all duration-200 bg-gray-50 cursor-pointer"
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFileSelect({ target: { files: e.dataTransfer.files } } as any);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="pdf-upload"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">Clique para selecionar um PDF</p>
                  <p className="text-xs text-muted-foreground">
                    ou arraste e solte aqui (máx. 10MB)
                  </p>
                </label>
                
                {selectedFile && (
                  <div className="flex items-center justify-between p-3 bg-slate-100 rounded-md border border-slate-200">
                    <div className="flex items-center min-w-0">
                      <FileText className="h-5 w-5 text-slate-600 mr-3 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-800 truncate pr-2">{selectedFile.name}</span>
                      <Badge variant="secondary">{formatFileSize(selectedFile.size)}</Badge>
                    </div>
                    <Button variant="ghost" size="icon" type="button" onClick={handleRemoveFile} className="text-slate-500 hover:text-slate-800">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <Button type="submit" disabled={isLoading || !selectedFile}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>Analisar Evidência</>
                  )}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="text" className="space-y-4">
              <form onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleUnifiedSubmit(e);
              }} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="clinical-question-text">Pergunta Clínica (formato PICO)</Label>
                  <Textarea
                    id="clinical-question-text"
                    placeholder="Ex: Em pacientes adultos com hipertensão (P), o uso de inibidores da ECA (I) comparado com bloqueadores de canais de cálcio (C) resulta em melhor controle da pressão arterial (O)?"
                    value={clinicalQuestion}
                    onChange={(e) => setClinicalQuestion(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="evidence-text">Texto Completo do Artigo</Label>
                  <Textarea
                    id="evidence-text"
                    placeholder="Cole o texto completo do artigo aqui..."
                    value={evidenceText}
                    onChange={(e) => setEvidenceText(e.target.value)}
                    className="min-h-[300px]"
                  />
                </div>

                <Button type="submit" disabled={isLoading || !evidenceText || !clinicalQuestion}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>Analisar Evidência</>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

    {/* Análise de Viés */}
    {unifiedResults && (
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
              <p className="text-sm text-muted-foreground">{unifiedResults?.bias_analysis.selection_bias}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Viés de Performance</h4>
              <p className="text-sm text-muted-foreground">{unifiedResults?.bias_analysis.performance_bias}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Viés de Relato</h4>
              <p className="text-sm text-muted-foreground">{unifiedResults?.bias_analysis.reporting_bias}</p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Viés de Confirmação</h4>
              <p className="text-sm text-muted-foreground">{unifiedResults?.bias_analysis.confirmation_bias}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )}

    {/* Recomendações para Prática */}
    {unifiedResults && (
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
                {unifiedResults?.practice_recommendations.map((rec, index) => (
                  <li key={index} className="text-muted-foreground">{rec}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )}
  </div>
);
}