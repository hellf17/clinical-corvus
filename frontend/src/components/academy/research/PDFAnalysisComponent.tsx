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
  AlertCircle,
  ListChecks,
  Shield,
  Activity,
  Eye,
  Brain,
  ChevronUp
} from "lucide-react";
import { useAuth } from '@clerk/nextjs';
import { RecommendationBalanceChart } from './RecommendationBalanceChart';

function toArray<T>(val: T | T[] | undefined | null): T[] {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

// Define interfaces for the new GRADE-based evidence appraisal output
interface ReasoningTag {
  tag: string;
  reference_id: string;
}

interface RecommendationBalance {
  positive_factors: string[];
  negative_factors: string[];
  overall_balance: string;
  reasoning_tags: string[];
}

interface GradeSummary {
  overall_quality: string;
  recommendation_strength: string;
  summary_of_findings: string;
  recommendation_balance: RecommendationBalance;
  reasoning_tags: ReasoningTag[];
}

interface QualityFactor {
  id: string;
  factor_name: string;
  assessment: string; // 'POSITIVE', 'NEUTRAL', 'NEGATIVE'
  justification: string;
}

interface BiasAnalysis {
  id: string;
  bias_type: string;
  potential_impact: string;
  mitigation_strategies: string;
  actionable_suggestion: string;
}

interface PracticeRecommendations {
  clinical_application: string;
  monitoring_points: string[];
  evidence_caveats: string;
}

interface GradeEvidenceAppraisalOutput {
  grade_summary: GradeSummary;
  quality_factors: QualityFactor[];
  bias_analysis: BiasAnalysis[];
  practice_recommendations: PracticeRecommendations | PracticeRecommendations[];


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
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  // Helper function to determine evidence impact severity
  const getEvidenceImpactSeverity = (quality: string, strength: string) => {
    const qualityLower = quality.toLowerCase();
    const strengthLower = strength.toLowerCase();
    if (qualityLower.includes('alta') && strengthLower.includes('forte')) return 'high';
    if (qualityLower.includes('alta') || strengthLower.includes('forte')) return 'medium';
    return 'low';
  };

  // Helper function to get severity indicator
  const getSeverityIndicator = (severity: string) => {
    switch (severity) {
      case 'high':
        return { color: 'bg-green-500', icon: Activity, text: 'Alto Impacto', textColor: 'text-green-700' };
      case 'medium':
        return { color: 'bg-yellow-500', icon: Activity, text: 'Moderado', textColor: 'text-yellow-700' };
      default:
        return { color: 'bg-red-500', icon: Activity, text: 'Baixo', textColor: 'text-red-700' };
    }
  };

  const toggleSectionExpansion = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

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

  const handleTagClick = (referenceId: string) => {
    const element = document.getElementById(referenceId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Briefly highlight the card
      element.classList.add('ring-2', 'ring-blue-500', 'transition-shadow', 'duration-300');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500');
      }, 2000);
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
    if (!selectedFile) {
      setError('Por favor, selecione um arquivo PDF para analisar.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      const authToken = await getToken();
      if (!authToken) {
        setError("Authentication token not found. Please log in again.");
        setIsLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('extraction_mode', extractionMode);
      if (clinicalQuestion.trim()) {
        formData.append('clinical_question', clinicalQuestion);
      }

      const response = await fetch('/api/research/unified-evidence-analysis-from-pdf-translated', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error from backend service:', response.status, errorData);
        const detailMessage = errorData.detail || `Request failed with status: ${response.status}`;
        setError(`Falha na análise do PDF: ${detailMessage}`);
        throw new Error(detailMessage);
      }

      const data: GradeEvidenceAppraisalOutput = await response.json();
      setResults(data);
    } catch (err: any) {
      console.error("Error during PDF analysis submission:", err);
      if (!error) { // Avoid overwriting a more specific error from the backend
        setError(err.message || 'Ocorreu um erro desconhecido. Por favor, tente novamente.');
      }
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

  const renderUnifiedResults = () => {
    if (!results) return null;

    // Defensive code: handle cases where the translation service might incorrectly wrap the object in an array.
    // Always normalize to array, then use the first element if array is non-empty
    const recommendationsArr = toArray(results.practice_recommendations);
    const recommendations = recommendationsArr.length > 0 ? recommendationsArr[0] : undefined;

    if (!recommendations) {
      return null; // Or some fallback UI
    }

    const getQualityBadge = (quality: string) => {
      const qualityLower = quality.toLowerCase();
      if (qualityLower.includes('alta')) return <Badge className="bg-green-100 text-green-800 border-green-200">ALTA</Badge>;
      if (qualityLower.includes('moderada')) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">MODERADA</Badge>;
      if (qualityLower.includes('baixa')) return <Badge className="bg-orange-100 text-orange-800 border-orange-200">BAIXA</Badge>;
      if (qualityLower.includes('muito_baixa')) return <Badge variant="destructive">MUITO BAIXA</Badge>;
      return <Badge variant="secondary">{quality}</Badge>;
    };

    const getStrengthBadge = (strength: string) => {
      const strengthLower = strength.toLowerCase();
      if (strengthLower.includes('forte')) return <Badge className="bg-blue-100 text-blue-800 border-blue-200">FORTE</Badge>;
      if (strengthLower.includes('fraca')) return <Badge className="bg-gray-100 text-gray-800 border-gray-200">FRACA</Badge>;
      return <Badge variant="secondary">{strength}</Badge>;
    };

    return (
      <div ref={resultsContainerRef} className="mt-6 space-y-6 animate-in fade-in-50">
        {/* Main Verdict - Modern Dashboard Style */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <div className="bg-white p-6">
            <CardTitle className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
              <Award className="mr-3 h-7 w-7 text-blue-700" />Avaliação da Evidência (GRADE)
            </CardTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Qualidade da Evidência */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2">QUALIDADE</h3>
                <div className="flex items-center mb-2">
                  {getQualityBadge(results.grade_summary.overall_quality)}
                </div>
                <p className="text-gray-700">{results.grade_summary.summary_of_findings}</p>
              </div>
              {/* Força da Recomendação */}
              <div>
                <h3 className="text-xs uppercase tracking-wider text-gray-500 font-medium mb-2">RECOMENDAÇÃO</h3>
                <div className="flex items-center mb-2">
                  {getStrengthBadge(results.grade_summary.recommendation_strength)}
                </div>
                <RecommendationBalanceChart balance={results.grade_summary.recommendation_balance} />
              </div>
            </div>
            {/* Reasoning Tags */}
            {results.grade_summary.reasoning_tags && results.grade_summary.reasoning_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-6">
                {results.grade_summary.reasoning_tags.map((tag, idx) => (
                  <Badge key={idx} variant="outline" className="bg-gray-100 text-gray-800 border-gray-300 px-3 py-1 cursor-pointer hover:bg-blue-100 hover:border-blue-400" onClick={() => handleTagClick(tag.reference_id)}>
                    <Lightbulb className="h-3 w-3 mr-1" />{tag.tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Fatores de Influência - Grade Colorida */}
        <Card className="border-0 shadow-lg mt-6">
          <CardHeader className="pb-0">
            <CardTitle className="text-xl flex items-center text-gray-800">
              <ListChecks className="mr-3 h-6 w-6 text-indigo-600" />Fatores de Qualidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.quality_factors.map((factor, index) => {
                type AssessmentKey = 'POSITIVO' | 'NEUTRO' | 'NEGATIVO';
                const colorMap: Record<AssessmentKey, string> = {
                  POSITIVO: 'bg-green-50 border-green-200',
                  NEUTRO: 'bg-gray-50 border-gray-200',
                  NEGATIVO: 'bg-red-50 border-red-200'
                };
                const iconMap: Record<AssessmentKey, React.ReactElement> = {
                  POSITIVO: <div className="absolute top-3 right-3"><Badge className="bg-green-100 text-green-800 border-0">✓</Badge></div>,
                  NEUTRO: <div className="absolute top-3 right-3"><Badge className="bg-gray-100 text-gray-800 border-0">⚬</Badge></div>,
                  NEGATIVO: <div className="absolute top-3 right-3"><Badge className="bg-red-100 text-red-800 border-0">✗</Badge></div>
                };
                const key = (factor.assessment?.toUpperCase?.() ?? 'NEUTRO') as AssessmentKey;
                return (
                  <div key={index} className={`relative p-4 rounded-lg border ${colorMap[key]}`} id={factor.id}>
                    {iconMap[key]}
                    <h4 className="font-semibold text-gray-800">{factor.factor_name}</h4>
                    <p className="text-sm text-gray-600 mt-2">{factor.justification}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Bias Analysis - Cartões claros e perguntas reflexivas */}
        <Card className="border-0 shadow-lg mt-6">
          <CardHeader className="pb-0">
            <CardTitle className="text-xl flex items-center text-gray-800">
              <ShieldCheck className="mr-3 h-6 w-6 text-red-600" />Análise de Risco de Viés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {results.bias_analysis.map((item, index) => (
                <div key={index} className="p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-lg text-gray-800 border-b pb-2 mb-3">{item.bias_type}</h4>
                  <p className="text-gray-700 mb-4">{item.potential_impact}</p>
                  {item.mitigation_strategies && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-md">
                      <h5 className="text-sm font-medium text-blue-800 flex items-center">
                        <CheckSquare className="h-4 w-4 mr-2" />Estratégias de Mitigação:
                      </h5>
                      <p className="text-gray-700 mt-1">{item.mitigation_strategies}</p>
                    </div>
                  )}
                  {item.actionable_suggestion && (
                    <div className="mt-4">
                      <h5 className="text-sm font-medium text-gray-800 italic border-l-2 border-yellow-400 pl-3">
                        Pergunta para Reflexão:
                      </h5>
                      <p className="text-gray-700 mt-1 pl-3 italic">{item.actionable_suggestion}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recomendações para Prática Clínica - Cartão moderno */}
        <Card className="border-0 shadow-lg mt-6 border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center text-xl text-gray-800">
              <CheckSquare className="h-6 w-6 mr-2 text-blue-700" />Recomendações para Prática Clínica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Caso seja objeto PracticeRecommendations */}
              {recommendations && !Array.isArray(recommendations) && (
                <>
                  {recommendations.clinical_application && (
                    <div>
                      <h4 className="font-semibold flex items-center text-gray-800">
                        <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />Aplicação Clínica
                      </h4>
                      <p className="text-gray-700 mt-2">{recommendations.clinical_application}</p>
                    </div>
                  )}
                  {recommendations.monitoring_points && recommendations.monitoring_points.length > 0 && (
                    <div>
                      <h4 className="font-semibold flex items-center text-gray-800">
                        <Target className="h-5 w-5 mr-2 text-blue-500" />Pontos de Monitoramento
                      </h4>
                      <ul className="list-disc list-inside space-y-1 mt-2 text-gray-700">
                        {recommendations.monitoring_points.map((point, idx) => (
                          <li key={idx}>{point}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {recommendations.evidence_caveats && (
                    <div>
                      <h4 className="font-semibold flex items-center text-gray-800">
                        <AlertCircle className="h-5 w-5 mr-2 text-red-500" />Ressalvas da Evidência
                      </h4>
                      <p className="text-gray-700 mt-2">{recommendations.evidence_caveats}</p>
                    </div>
                  )}
                </>
              )}
              {/* Caso seja array de objetos recommendation/justification */}
              {Array.isArray(recommendations) && typeof recommendations[0] === 'object' && (
                <div className="space-y-4">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="p-3 border rounded-md">
                      <h4 className="font-semibold flex items-center text-gray-800">
                        <Lightbulb className="h-5 w-5 mr-2 text-amber-500" />{rec.recommendation}
                      </h4>
                      <p className="text-gray-700 mt-2">{rec.justification}</p>
                    </div>
                  ))}
                </div>
              )}
              {/* Caso seja array de strings */}
              {Array.isArray(recommendations) && typeof recommendations[0] === 'string' && (
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                  {recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              )}
              {/* Fallback */}
              {!recommendations && (
                <p className="text-muted-foreground">Nenhuma recomendação prática disponível.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <Card className={`w-full ${className} relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-l-4 border-green-600`}>
      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            <FileText className="mr-3 h-6 w-6 text-green-600" />
            Análise Crítica de Artigo (PDF)
          </CardTitle>
        </div>
        <CardDescription className="pl-9 text-gray-600">
          Faça o upload de um artigo em PDF para receber uma análise crítica completa baseada no framework GRADE.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10">
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
                <Badge variant="default">{formatFileSize(selectedFile.size)}</Badge>
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
              {isLoading ? (
                <div className="flex items-center">
                  <div className="relative mr-2">
                    <div className="w-4 h-4 border-2 border-green-200 rounded-full animate-spin">
                      <div className="absolute top-0 left-0 w-4 h-4 border-2 border-green-600 rounded-full animate-pulse border-t-transparent"></div>
                    </div>
                  </div>
                  Analisando...
                </div>
              ) : (
                <>
                  <FileText className="mr-2 h-4 w-4" />
                  Analisar PDF
                </>
              )}
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
            <div className="mt-6 p-6 border rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 text-center shadow-sm">
              <HelpCircle className="mx-auto h-10 w-10 text-green-600 mb-3" />
              <h3 className="text-lg font-semibold text-green-800">Pronto para começar?</h3>
              <p className="text-green-700 mt-2 leading-relaxed">
                Selecione um arquivo PDF para iniciar a análise e extrair insights valiosos sobre a qualidade da evidência.
              </p>
              <div className="mt-4 flex items-center justify-center text-sm text-green-600">
                <Brain className="h-4 w-4 mr-2" />
                <span>Dr. Corvus analisará metodologia, vieses e aplicabilidade clínica</span>
              </div>
            </div>
        )}

        {results && renderUnifiedResults()}
      </CardContent>
    </Card>
  );
}