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
  Crown
} from "lucide-react";
import { useAuth } from '@clerk/nextjs';
import { PDFAnalysisOutput } from '@/types/research';

interface PDFAnalysisComponentProps {
  className?: string;
}

export default function PDFAnalysisComponent({ className }: PDFAnalysisComponentProps) {
  const { getToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados principais
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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

      const response = await fetch('/api/research-assistant/analyze-pdf', {
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

  const getExtractionModeIcon = (mode: string) => {
    switch (mode) {
      case 'fast': return <Zap className="h-4 w-4" />;
      case 'premium': return <Crown className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const getExtractionModeDescription = (mode: string) => {
    switch (mode) {
      case 'fast': return 'Extração rápida e econômica, ideal para documentos simples';
      case 'premium': return 'Máxima fidelidade, preserva estrutura complexa, tabelas e formatação';
      default: return 'Equilibrio entre precisão, estrutura e performance (recomendado)';
    }
  };

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="h-6 w-6 mr-2 text-green-500" />
            Análise Avançada de Documentos PDF
          </CardTitle>
          <CardDescription>
            Faça upload de artigos científicos, guidelines ou outros documentos médicos em PDF para análise detalhada pelo Dr. Corvus.
            Utiliza LlamaParse para extração avançada de texto e estrutura.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Upload de arquivo */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Documento PDF *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                {selectedFile ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center space-x-2">
                      <FileText className="h-8 w-8 text-green-500" />
                      <div className="text-left">
                        <p className="font-medium text-sm">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(selectedFile.size)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveFile}
                        className="ml-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Selecionar PDF
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Máximo 10MB • Apenas arquivos PDF
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Modo de extração */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Modo de Extração
              </label>
              <Select value={extractionMode} onValueChange={setExtractionMode}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o modo de extração" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fast">
                    <div className="flex items-center">
                      <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                      Rápido
                    </div>
                  </SelectItem>
                  <SelectItem value="balanced">
                    <div className="flex items-center">
                      <Settings className="h-4 w-4 mr-2 text-[#44154a]" />
                      Equilibrado (Recomendado)
                    </div>
                  </SelectItem>
                  <SelectItem value="premium">
                    <div className="flex items-center">
                      <Crown className="h-4 w-4 mr-2 text-purple-500" />
                      Premium
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {getExtractionModeDescription(extractionMode)}
              </p>
            </div>

            {/* Foco da análise */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Foco da Análise (Opcional)
              </label>
              <Select value={analysisFocus} onValueChange={setAnalysisFocus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o foco da análise" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">Análise Geral</SelectItem>
                  <SelectItem value="methodology">Foco em Metodologia</SelectItem>
                  <SelectItem value="results">Foco em Resultados</SelectItem>
                  <SelectItem value="clinical">Aplicabilidade Clínica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Pergunta clínica */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                Pergunta Clínica de Referência (Opcional)
              </label>
              <Textarea
                value={clinicalQuestion}
                onChange={(e) => setClinicalQuestion(e.target.value)}
                placeholder="Ex: Este estudo responde à pergunta sobre a eficácia da metformina em pacientes diabéticos?"
                className="min-h-[60px]"
              />
            </div>

            <Button type="submit" variant="default" disabled={isLoading || !selectedFile} className="w-full">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Analisando documento...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Analisar Documento
                </>
              )}
            </Button>
          </form>

          {results && (
            <div className="mt-8 animate-fade-in">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-gray-800">
                  Análise do Documento
                </h2>
                <p className="text-muted-foreground mt-1">
                  Resultados detalhados para: <span className="font-medium text-purple-700">{selectedFile?.name}</span>
                </p>
              </div>

              {/* Quick Summary Badges */}
              <Card className="mb-6 bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-lg">Resumo Rápido</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-1">Tipo de Documento</h4>
                    <Badge variant="secondary" className="text-base">{results.document_type}</Badge>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-600 mb-1">Qualidade da Evidência</h4>
                    <Badge variant="outline" className="text-base border-yellow-400 text-yellow-700">{results.evidence_quality}</Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column (Main Content) */}
                <div className="lg:col-span-2 space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center"><BookOpen className="mr-2 h-5 w-5 text-purple-600" /> Resumo Estruturado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-line">{results.structured_summary}</p>
                    </CardContent>
                  </Card>

                  {results.key_findings?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><Target className="mr-2 h-5 w-5 text-blue-600" /> Principais Achados</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {results.key_findings.map((finding, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="h-5 w-5 mr-3 mt-0.5 text-blue-500 flex-shrink-0" />
                              <span className="text-muted-foreground">{finding}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {results.recommendations?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><Lightbulb className="mr-2 h-5 w-5 text-green-600" /> Recomendações e Conclusões</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {results.recommendations.map((recommendation, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircle className="h-5 w-5 mr-3 mt-0.5 text-green-500 flex-shrink-0" />
                              <span className="text-muted-foreground">{recommendation}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right Column (Side Content) */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center"><Settings className="mr-2 h-5 w-5 text-gray-600" /> Metodologia</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{results.methodology_summary}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center"><Zap className="mr-2 h-5 w-5 text-teal-600" /> Relevância Clínica</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{results.clinical_relevance}</p>
                    </CardContent>
                  </Card>

                  {results.limitations?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center"><AlertTriangle className="mr-2 h-5 w-5 text-orange-600" /> Limitações Identificadas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {results.limitations.map((limitation, index) => (
                            <li key={index} className="flex items-start">
                              <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 text-orange-500 flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">{limitation}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              {/* Disclaimer */}
              <Alert className="mt-6">
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