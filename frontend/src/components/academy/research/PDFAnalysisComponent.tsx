"use client";

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Badge } from "@/components/ui/Badge";
import { Separator } from "@/components/ui/Separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';
import { 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertTriangle,
  Lightbulb,
  Target,
  BookOpen,
  X,
  Zap,
  Settings,
  Crown,
  ChevronDown,
  Loader2,
  HelpCircle,
  ShieldCheck,
  Award,
  BarChart3,
  Scale,
  CheckSquare,
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

interface PDFAnalysisComponentProps {
  className?: string;
}

export default function PDFAnalysisComponent({ className }: PDFAnalysisComponentProps) {
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clinicalQuestion, setClinicalQuestion] = useState('');
  const [extractionMode, setExtractionMode] = useState('balanced');
  const [results, setResults] = useState<GradeEvidenceAppraisalOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.classList.add('border-blue-500', 'bg-blue-50');
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.classList.remove('border-blue-500', 'bg-blue-50');
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget;
    target.classList.remove('border-blue-500', 'bg-blue-50');
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect({ target: { files } } as any);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearForm = () => {
    setSelectedFile(null);
    setClinicalQuestion('');
    setExtractionMode('balanced');
    setResults(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);
    setError(null);
    setResults(null);

    if (!selectedFile) {
      setError('Por favor, selecione um arquivo PDF.');
      setIsLoading(false);
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Erro de autenticação. Por favor, faça login novamente.');
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('extraction_mode', extractionMode);
      if (clinicalQuestion.trim()) {
        formData.append('clinical_question', clinicalQuestion);
      }

      const response = await fetch('/api/research-assistant/unified-evidence-analysis-from-pdf-translated', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Erro desconhecido' }));
        throw new Error(errorData.detail || `Erro na análise (status: ${response.status})`);
      }

      const data: GradeEvidenceAppraisalOutput = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.');
      console.error("Error in PDF analysis:", err);
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
    <div className="space-y-8 pt-8 mt-8 border-t">
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
    <Card className={`w-full ${className} border-l-4 border-blue-600`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl">
            <FileText className="mr-3 h-6 w-6 text-blue-600" />
            Análise Crítica de Artigo (PDF)
          </CardTitle>
        </div>
        <CardDescription className="pl-9">
          Faça o upload de um artigo em PDF para receber uma análise crítica completa baseada no framework GRADE.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div 
            className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-all duration-200 bg-gray-50 cursor-pointer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 text-center">
              <span className="font-semibold text-blue-600 hover:underline">
                Clique para selecionar
              </span>{' '}
              <span className="text-gray-500">ou arraste e solte o arquivo PDF aqui.</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">Tamanho máximo: 10MB</p>
            <Input 
              ref={fileInputRef} 
              type="file" 
              className="hidden" 
              accept=".pdf" 
              onChange={handleFileInputChange} 
              id="pdf-upload"
            />
          </div>

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

          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="link" className="p-0 text-sm text-blue-600">
                <Settings className="h-4 w-4 mr-2" />
                Opções Avançadas
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4 animate-in slide-in-from-top-4">
              <Textarea
                placeholder="Opcional: Qual pergunta clínica você quer responder com este artigo?"
                value={clinicalQuestion}
                onChange={(e) => setClinicalQuestion(e.target.value)}
                className="w-full"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Modo de Extração</label>
                <Select value={extractionMode} onValueChange={setExtractionMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o modo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balanced"><div className="flex items-center"><Settings className="h-4 w-4 mr-2 text-blue-500" />Equilibrado</div></SelectItem>
                    <SelectItem value="speed"><div className="flex items-center"><Zap className="h-4 w-4 mr-2 text-orange-500" />Rápido</div></SelectItem>
                    <SelectItem value="deep"><div className="flex items-center"><Crown className="h-4 w-4 mr-2 text-purple-500" />Profundo</div></SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator />

          <div className="flex justify-between items-center">
            <Button variant="outline" type="button" onClick={handleClearForm} disabled={isLoading}>
              Limpar
            </Button>
            <Button type="submit" disabled={isLoading || !selectedFile} className="min-w-[120px]">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analisar PDF'}
            </Button>
          </div>
        </form>

        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro na Análise</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {!results && !isLoading && !error && (
            <div className="mt-6 p-4 border rounded-md bg-sky-50 border-sky-200 text-center">
              <HelpCircle className="mx-auto h-8 w-8 text-sky-600 mb-2" />
              <h3 className="text-md font-semibold text-sky-800">Pronto para começar?</h3>
              <p className="text-sm text-sky-700 mt-1">
                Selecione um arquivo PDF para iniciar a análise e extrair insights valiosos.
              </p>
            </div>
        )}

        {results && renderUnifiedResults()}
      </CardContent>
    </Card>
  );
}