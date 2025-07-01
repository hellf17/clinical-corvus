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
  ShieldCheck
} from "lucide-react";
import { useAuth } from '@clerk/nextjs';
import { PDFAnalysisOutput } from '@/types/research';

interface PDFAnalysisComponentProps {
  className?: string;
}

export default function PDFAnalysisComponent({ className }: PDFAnalysisComponentProps) {
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisFocus, setAnalysisFocus] = useState('');
  const [clinicalQuestion, setClinicalQuestion] = useState('');
  const [extractionMode, setExtractionMode] = useState('balanced');
  const [results, setResults] = useState<PDFAnalysisOutput | null>(null);
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

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setResults(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearForm = () => {
    setSelectedFile(null);
    setAnalysisFocus('');
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
      if (analysisFocus.trim()) {
        formData.append('analysis_focus', analysisFocus);
      }
      if (clinicalQuestion.trim()) {
        formData.append('clinical_question', clinicalQuestion);
      }

      const response = await fetch('/api/research-assistant/analyze-pdf-translated', {
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

      const data: PDFAnalysisOutput = await response.json();
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

  return (
    <Card className={`w-full ${className} border-l-4 border-blue-600`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-xl">
            <FileText className="mr-3 h-6 w-6 text-blue-600" />
            Análise de Artigo Científico (PDF)
          </CardTitle>
        </div>
        <CardDescription className="pl-9">
          Extraia e sintetize informações chave de artigos em formato PDF para otimizar sua revisão de literatura.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div 
            className="relative flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors duration-200 bg-gray-50"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const files = e.dataTransfer.files;
              if (files && files.length > 0) {
                handleFileSelect({ target: { files } } as any);
              }
            }}
          >
            <Upload className="w-10 h-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              <span 
                className="font-semibold text-blue-600 cursor-pointer hover:underline"
                onClick={() => fileInputRef.current?.click()}
              >
                Clique para selecionar
              </span> ou arraste e solte o arquivo PDF aqui.
            </p>
            <p className="text-xs text-gray-500 mt-1">Tamanho máximo: 10MB</p>
            <Input ref={fileInputRef} type="file" className="sr-only" accept=".pdf" onChange={handleFileSelect} id="pdf-upload"/>
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
                placeholder="Opcional: Qual o foco principal da sua análise? (ex: metodologia, resultados, limitações)"
                value={analysisFocus}
                onChange={(e) => setAnalysisFocus(e.target.value)}
                className="w-full"
              />
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

        {results && (
          <div className="mt-8 pt-6 border-t">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Resultados da Análise</h3>
              {results.document_type && (
                <Badge variant="secondary" className="mb-4 text-sm font-medium py-1 px-3 rounded-full">
                  <FileText className="mr-2 h-4 w-4" />
                  {results.document_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Badge>
              )}
              <p className="text-muted-foreground mt-2">Análise detalhada do documento PDF fornecido.</p>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader><CardTitle className="flex items-center"><Target className="mr-2 h-5 w-5 text-blue-600" />Resumo Estruturado</CardTitle></CardHeader>
                <CardContent><p className="text-muted-foreground whitespace-pre-line">{results.structured_summary}</p></CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center"><BookOpen className="mr-2 h-5 w-5 text-purple-600" />Principais Achados</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {results.key_findings.map((finding, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 mr-3 mt-1 text-blue-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-green-600" />Recomendações e Conclusões</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {results.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 mr-3 mt-1 text-green-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader><CardTitle className="flex items-center text-base"><Settings className="mr-2 h-5 w-5 text-gray-600" />Metodologia</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground whitespace-pre-line">{results.methodology_summary}</p></CardContent>
                </Card>
                <Card>
                  <CardHeader><CardTitle className="flex items-center text-base"><Zap className="mr-2 h-5 w-5 text-teal-600" />Relevância Clínica</CardTitle></CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground whitespace-pre-line">{results.clinical_relevance}</p></CardContent>
                </Card>
                {results.evidence_quality && (
                  <Card>
                    <CardHeader><CardTitle className="flex items-center text-base"><ShieldCheck className="mr-2 h-5 w-5 text-indigo-600" />Qualidade da Evidência</CardTitle></CardHeader>
                    <CardContent><p className="text-sm text-muted-foreground whitespace-pre-line">{results.evidence_quality}</p></CardContent>
                  </Card>
                )}
              </div>

              {results.limitations && results.limitations.length > 0 && (
                <Card className="border-amber-500">
                  <CardHeader><CardTitle className="flex items-center text-base"><AlertTriangle className="mr-2 h-5 w-5 text-amber-600" />Limitações Identificadas</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {results.limitations.map((limitation, index) => (
                        <li key={index} className="flex items-start">
                          <AlertTriangle className="h-5 w-5 mr-3 mt-1 text-amber-500 flex-shrink-0" />
                          <span className="text-sm text-muted-foreground">{limitation}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              <Alert className="mt-8 border-l-4 border-blue-500">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Aviso Importante</AlertTitle>
                <AlertDescription>
                  Esta análise é gerada por IA e serve como um auxílio à pesquisa. Não substitui o julgamento clínico profissional. Sempre verifique as informações com as fontes primárias.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}