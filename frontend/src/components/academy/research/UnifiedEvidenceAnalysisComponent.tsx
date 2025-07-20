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
  Loader2,
  Shield,
  Activity,
  Eye,
  Brain,
  Zap,
  ChevronDown,
  ChevronUp,
  Lightbulb
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
  id: string;
  factor_name: string;
  assessment: string; // 'POSITIVE', 'NEUTRAL', 'NEGATIVE'
  justification: string;
}

interface BiasAnalysisItem {
  id: string;
  bias_type: string;
  potential_impact: string;
  mitigation_strategies: string;
  actionable_suggestion: string;
}

interface RecommendationBalance {
  positive_factors: string[];
  negative_factors: string[];
  overall_balance: string;
  reasoning_tags: string[];
}

interface GradeSummary {
  overall_quality: string; // 'ALTA', 'MODERADA', 'BAIXA', 'MUITO BAIXA'
  recommendation_strength: string; // 'FORTE', 'FRACA'
  summary_of_findings: string;
  recommendation_balance: RecommendationBalance;
  reasoning_tags: Array<{
    tag: string;
    reference_id: string;
  }>;
}

interface PracticeRecommendations {
  clinical_application: string;
  monitoring_points: string[];
  evidence_caveats: string;
}

interface GradeEvidenceAppraisalOutput {
  grade_summary: GradeSummary;
  quality_factors: QualityFactor[];
  bias_analysis: BiasAnalysisItem[];
  practice_recommendations: PracticeRecommendations;
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

  // Text State
  const [evidenceText, setEvidenceText] = useState(initialContent);
  
  // Unified Dashboard State
  const [unifiedResults, setUnifiedResults] = useState<GradeEvidenceAppraisalOutput | null>(null);
  const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  // Helper function to determine evidence impact severity
  const getEvidenceImpactSeverity = (quality: string, strength: string) => {
    if (quality === 'ALTA' && strength === 'FORTE') return 'high';
    if (quality === 'ALTA' || strength === 'FORTE') return 'medium';
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

      const response = await fetch('/api/research-assistant/unified-evidence-analysis-translated', {
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

  const getAssessmentColor = (assessment: string) => {
    const normalizedAssessment = assessment?.toUpperCase();
    switch (normalizedAssessment) {
      case 'POSITIVE': 
      case 'POSITIVO': return 'text-green-600';
      case 'NEUTRAL': 
      case 'NEUTRO': return 'text-amber-600';
      case 'NEGATIVE': 
      case 'NEGATIVO': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getAssessmentIcon = (assessment: string) => {
    const normalizedAssessment = assessment?.toUpperCase();
    switch (normalizedAssessment) {
      case 'POSITIVE': 
      case 'POSITIVO': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'NEUTRAL': 
      case 'NEUTRO': return <AlertCircle className="h-5 w-5 text-amber-600" />;
      case 'NEGATIVE': 
      case 'NEGATIVO': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <HelpCircle className="h-5 w-5 text-gray-600" />;
    }
  };
  
  const translateAssessment = (assessment: string) => {
    const normalizedAssessment = assessment?.toUpperCase();
    switch (normalizedAssessment) {
      case 'POSITIVE': return 'POSITIVO';
      case 'NEUTRAL': return 'NEUTRO';
      case 'NEGATIVE': return 'NEGATIVO';
      default: return assessment;
    }
  };

  const getRecommendationColor = (strength: string) => {
    return strength === 'FORTE' ? 'text-blue-600' : 'text-amber-600';
  };

  const renderUnifiedResults = () => unifiedResults && (
    <div className="space-y-8 animate-fade-in">
      {/* Dashboard de Confiança - Cabeçalho */}
      <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-t-4 border-t-green-600">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            <Award className="mr-3 h-6 w-6 text-green-600" />
            Dashboard de Confiança da Evidência
          </CardTitle>
          <CardDescription className="text-gray-600">
            Avaliação estruturada baseada no framework GRADE
          </CardDescription>
          <div className="flex items-center justify-center space-x-2 mt-4">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span className="text-sm text-gray-500">Análise completa de qualidade metodológica</span>
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Qualidade da Evidência */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">Qualidade da Evidência</h3>
                <div className={`px-6 py-3 rounded-lg font-bold text-lg border-2 shadow-lg ${
                  unifiedResults?.grade_summary?.overall_quality === 'ALTA' ? 'bg-green-100 text-green-900 border-green-300' : 
                  unifiedResults?.grade_summary?.overall_quality === 'MODERADA' ? 'bg-amber-100 text-amber-900 border-amber-300' : 
                  unifiedResults?.grade_summary?.overall_quality === 'BAIXA' ? 'bg-orange-100 text-orange-900 border-orange-300' : 
                  'bg-red-100 text-red-900 border-red-300'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Award className="h-5 w-5" />
                    <span>{unifiedResults?.grade_summary?.overall_quality}</span>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">{unifiedResults?.grade_summary?.summary_of_findings}</p>
              
              {/* Legenda de cores para Qualidade */}
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full bg-green-100 border border-green-800 mr-1"></div>
                  <span>Alta</span>
                </div>
                <div className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-800 mr-1"></div>
                  <span>Moderada</span>
                </div>
                <div className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full bg-orange-100 border border-orange-800 mr-1"></div>
                  <span>Baixa</span>
                </div>
                <div className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full bg-red-100 border border-red-800 mr-1"></div>
                  <span>Muito Baixa</span>
                </div>
              </div>
            </div>

            {/* Força da Recomendação */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-lg">Força da Recomendação</h3>
                <div className={`px-6 py-3 rounded-lg font-bold text-lg border-2 shadow-lg ${
                  unifiedResults?.grade_summary?.recommendation_strength === 'FORTE' ? 
                  'bg-blue-100 text-blue-900 border-blue-300' : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>{unifiedResults?.grade_summary?.recommendation_strength}</span>
                  </div>
                </div>
              </div>
              <p className="text-muted-foreground text-sm">{unifiedResults?.grade_summary?.summary_of_findings}</p>
              
              {/* Legenda de cores para Força da Recomendação */}
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full bg-blue-100 border border-blue-800 mr-1"></div>
                  <span>Forte</span>
                </div>
                <div className="flex items-center text-xs">
                  <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-800 mr-1"></div>
                  <span>Fraca</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fatores de Qualidade */}
      <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 to-emerald-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CardTitle className="flex items-center text-xl font-semibold text-gray-800">
                <BarChart3 className="mr-3 h-6 w-6 text-green-600" />
                Fatores que Influenciam a Qualidade
              </CardTitle>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm font-medium text-green-700">
                  {unifiedResults?.quality_factors?.length || 0} fator(es)
                </span>
                <Activity className="h-4 w-4 text-green-700" />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSectionExpansion('quality_factors')}
              className="hover:bg-green-50 transition-colors"
            >
              <span className="text-sm mr-2">
                {expandedSections['quality_factors'] ? 'Ocultar detalhes' : 'Ver detalhes'}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedSections['quality_factors'] ? 'rotate-180' : ''}`} />
            </Button>
          </div>
          <CardDescription className="text-gray-600">Detalhamento dos fatores que impactam a qualidade da evidência</CardDescription>
        </CardHeader>
        <CardContent>
          {expandedSections['quality_factors'] && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unifiedResults?.quality_factors?.map((factor: QualityFactor, index: number) => {
                // Localization mapping for quality factor titles
                const factorTitleMap: Record<string, string> = {
                  'Study Design': 'Desenho do Estudo',
                  'Risk of Bias': 'Risco de Viés',
                  'Inconsistency': 'Inconsistência',
                  'Indirectness': 'Evidência Indireta',
                  'Imprecision': 'Imprecisão',
                  'Publication Bias': 'Viés de Publicação',
                  'Large Effect': 'Efeito Grande',
                  'Dose Response': 'Resposta à Dose',
                  'Confounders': 'Fatores de Confusão'
                };
                
                const localizedTitle = factorTitleMap[factor.factor_name] || factor.factor_name;
                
                return (
                  <Card key={index} className="bg-white border-l-4 border-l-blue-600">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-md flex items-center">
                        {getAssessmentIcon(factor.assessment)}
                        <span className="ml-2">{localizedTitle}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge 
                        variant="outline" 
                        className={`mb-2 ${getAssessmentColor(factor.assessment)}`}
                      >
                        {translateAssessment(factor.assessment)}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{factor.justification}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Análise de Viés */}
      <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/3 to-red-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <CardHeader className="relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CardTitle className="flex items-center text-xl font-semibold text-gray-800">
                <Scale className="mr-3 h-6 w-6 text-orange-600" />
                Análise de Viés
              </CardTitle>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm font-medium text-orange-700">
                  {unifiedResults?.bias_analysis?.length || 0} análise(s) de viés
                </span>
                <Shield className="h-4 w-4 text-orange-700" />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleSectionExpansion('bias_analysis')}
              className="hover:bg-orange-50 transition-colors"
            >
              <span className="text-sm mr-2">
                {expandedSections['bias_analysis'] ? 'Ocultar detalhes' : 'Ver detalhes'}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expandedSections['bias_analysis'] ? 'rotate-180' : ''}`} />
            </Button>
          </div>
          <CardDescription className="text-gray-600">Avaliação dos principais tipos de viés no estudo</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
          {expandedSections['bias_analysis'] && (
            <>
              {/* Check if any bias analysis is available */}
              {unifiedResults.bias_analysis && unifiedResults.bias_analysis.length > 0 ? (
                <div className="space-y-6">
                  {unifiedResults.bias_analysis.map((item: BiasAnalysisItem) => (
                    <Card key={item.id} className="p-4 border border-orange-200 bg-gradient-to-r from-orange-50 to-red-50">
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Shield className="h-5 w-5 text-orange-600" />
                          <h4 className="font-semibold text-lg text-orange-800">{item.bias_type}</h4>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="p-3 bg-orange-100 rounded-lg border-l-4 border-orange-400">
                            <h5 className="font-medium text-orange-800 mb-1 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-2" />
                              Impacto Potencial
                            </h5>
                            <p className="text-sm text-orange-700">{item.potential_impact}</p>
                          </div>
                          
                          <div className="p-3 bg-blue-100 rounded-lg border-l-4 border-blue-400">
                            <h5 className="font-medium text-blue-800 mb-1 flex items-center">
                              <Shield className="h-4 w-4 mr-2" />
                              Estratégias de Mitigação
                            </h5>
                            <p className="text-sm text-blue-700">{item.mitigation_strategies}</p>
                          </div>
                          
                          <div className="p-3 bg-green-100 rounded-lg border-l-4 border-green-400">
                            <h5 className="font-medium text-green-800 mb-1 flex items-center">
                              <Lightbulb className="h-4 w-4 mr-2" />
                              Sugestão Acionável
                            </h5>
                            <p className="text-sm text-green-700">{item.actionable_suggestion}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Análise de Viés Não Disponível</AlertTitle>
                  <AlertDescription>
                    Não foi possível realizar uma análise detalhada dos viéses neste estudo com base nas informações disponíveis.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Recomendações para Prática */}
      <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 border-l-4 border-green-400">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/3 to-emerald-500/3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center text-xl font-semibold text-gray-800">
            <CheckSquare className="mr-3 h-6 w-6 text-green-600" />
            Recomendações para Prática Clínica
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Aplicação Clínica</AlertTitle>
            <AlertDescription>
              <p className="text-gray-700">{unifiedResults?.practice_recommendations?.clinical_application}</p>
              <p className="text-gray-700 mt-2"><strong>Pontos de Monitoramento:</strong></p>
              <ul className="list-disc list-outside pl-5 space-y-1 mt-1">
                {unifiedResults?.practice_recommendations?.monitoring_points?.map((point, index) => (
                  <li key={index} className="text-gray-700">{point}</li>
                ))}
              </ul>
              <p className="text-gray-700 mt-2"><strong>Caveats da Evidência:</strong></p>
              <p className="text-gray-700">{unifiedResults?.practice_recommendations?.evidence_caveats}</p>
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
    setUnifiedResults(null); // Use the unified state

    try {
      const token = await getToken();
      if (!token) throw new Error('Erro de autenticação. Por favor, faça login novamente.');

      const formData = new FormData();
      formData.append('file', selectedFile);
      
      if (clinicalQuestion.trim()) {
        formData.append('clinical_question', clinicalQuestion.trim());
      }

      // Call the new unified PDF endpoint
      const response = await fetch('/api/research-assistant/unified-evidence-analysis-from-pdf-translated', {
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

      const data: GradeEvidenceAppraisalOutput = await response.json();
      setUnifiedResults(data); // Set the unified results
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao processar sua solicitação.');
      console.error("Error in PDF analysis:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full mx-auto space-y-6">
      <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
            <BarChart3 className="h-6 w-6 mr-2 text-green-500" />
            Análise de Evidências Unificada
          </CardTitle>
          <CardDescription className="pl-9 text-gray-600">
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
                    <div className="flex items-center">
                      <div className="relative mr-2">
                        <div className="w-4 h-4 border-2 border-green-200 rounded-full animate-spin">
                          <div className="absolute top-0 left-0 w-4 h-4 border-2 border-green-600 rounded-full animate-pulse border-t-transparent"></div>
                        </div>
                      </div>
                      Analisando com Dr. Corvus...
                    </div>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analisar Evidência
                    </>
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
                    <div className="flex items-center">
                      <div className="relative mr-2">
                        <div className="w-4 h-4 border-2 border-green-200 rounded-full animate-spin">
                          <div className="absolute top-0 left-0 w-4 h-4 border-2 border-green-600 rounded-full animate-pulse border-t-transparent"></div>
                        </div>
                      </div>
                      Analisando com Dr. Corvus...
                    </div>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analisar Evidência
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

    {/* Display unified results regardless of source */}
    {unifiedResults && renderUnifiedResults()}
    
    {/* Remove the dedicated PDF results rendering */}
    {/* {renderPDFResults()} */}

    {isLoading && !unifiedResults && (
      <div className="mt-6 flex flex-col items-center justify-center py-12 space-y-6 animate-fade-in">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-green-200 rounded-full animate-spin">
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-green-600 rounded-full animate-pulse border-t-transparent"></div>
          </div>
          <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-green-600 animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-semibold text-gray-700 animate-pulse">Dr. Corvus está analisando evidências...</p>
          <p className="text-sm text-gray-500">Avaliando qualidade metodológica e aplicabilidade clínica</p>
        </div>
        <div className="w-80 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full animate-pulse transition-all duration-1000" style={{ width: '75%' }}></div>
        </div>
      </div>
    )}

    {error && (
      <Alert variant="destructive" className="mt-6">
        <AlertTitle>Erro</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )}
  </div>
);
}