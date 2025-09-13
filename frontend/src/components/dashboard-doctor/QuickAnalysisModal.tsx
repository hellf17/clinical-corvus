import { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/Accordion";
import { DialogFooter, DialogClose } from "@/components/ui/Dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import FileUploader from "@/components/file-upload/FileUploader";
import MultiAnalysisResult from "@/components/analysis/MultiAnalysisResult";
import { PatientLinker } from "./PatientLinker";
import { analyzeLabFile } from "@/services/labAnalysisService";
import { LabAnalysisResult } from "@/types/labAnalysis";
import { AnalysisResult } from "@/types/analysis";
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import DOMPurify from 'isomorphic-dompurify';
import Image from 'next/image';
import DrCorvusIcon from '@/../public/Icon.png';
import { Loader2, Sparkles, Info, XCircle, CheckCircle, User, Save } from 'lucide-react';

// Lab insights output interface
interface LabInsightsOutputFromLLM {
  professional_detailed_reasoning_cot?: string;
  clinical_summary?: string;
  important_results_to_discuss_with_doctor?: string[];
}

// Lab test result for LLM interface
interface LabTestResultForLLM {
  test_name: string;
  value: string;
  unit?: string;
  reference_range_low?: string;
  reference_range_high?: string;
  interpretation_flag?: string;
  notes?: string;
}


interface QuickAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickAnalysisModal({ open, onOpenChange }: QuickAnalysisModalProps) {
  const { getToken, isSignedIn } = useAuth();
  const [step, setStep] = useState<'upload' | 'analyzing' | 'results' | 'linking' | 'saving'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<LabAnalysisResult | null>(null);
  const [analysisResults, setAnalysisResults] = useState<{ [key: string]: AnalysisResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Patient saving states
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isSavingToPatient, setIsSavingToPatient] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [patients, setPatients] = useState<any[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);

  // Dr. Corvus Insights states
  const [drCorvusInsights, setDrCorvusInsights] = useState<LabInsightsOutputFromLLM | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [generalNotes, setGeneralNotes] = useState<string>("");
  const [specificUserQuery, setSpecificUserQuery] = useState<string>("");

  const handleFileUpload = useCallback(async (files: File[]) => {
    if (files.length > 0) {
      const selectedFile = files[0];
      setFile(selectedFile);
      setStep('analyzing');
      setError(null);
      setSuccessMessage(null);

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (selectedFile.size > maxSize) {
        setError('Arquivo muito grande. O tamanho máximo permitido é 10MB.');
        setStep('upload');
        return;
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Tipo de arquivo não suportado. Use PDF, JPG ou PNG.');
        setStep('upload');
        return;
      }

      try {
        toast.info('Analisando arquivo...', {
          description: `Processando ${selectedFile.name}`
        });

        const formData = new FormData();
        formData.append('file', selectedFile);

        const result = await analyzeLabFile(formData);
        setAnalysisResult(result);

        // Convert LabAnalysisResult to the format expected by MultiAnalysisResult
        const convertedResults: { [key: string]: AnalysisResult } = {};

        // Get lab results and analysis results from backend response
        const backendLabResults = result.lab_results || [];
        const backendAnalysisResults = result.analysis_results || {};

        // Convert each system analysis from the backend analysis_results
        Object.entries(backendAnalysisResults).forEach(([categoryKey, analysisData]) => {
          if (analysisData && typeof analysisData === 'object') {
            // Filter lab results for this category
            const categoryLabResults = backendLabResults.filter((lr: any) => {
              const testName = lr.test_name?.toLowerCase() || '';
              switch (categoryKey) {
                case 'hematology':
                  return testName.includes('hemoglobina') || testName.includes('leucócito') ||
                         testName.includes('plaqueta') || testName.includes('hematócrito') ||
                         testName.includes('eritrócito');
                case 'hepatic':
                  return testName.includes('tgo') || testName.includes('tgp') ||
                         testName.includes('ggt') || testName.includes('fosfatase') ||
                         testName.includes('bilirrubina') || testName.includes('albumina');
                case 'renal':
                  return testName.includes('creatinina') || testName.includes('ureia') ||
                         testName.includes('tfg');
                case 'cardiac':
                  return testName.includes('troponina') || testName.includes('ck') ||
                         testName.includes('bnp');
                case 'metabolic':
                  return testName.includes('glicose') || testName.includes('hba1c') ||
                         testName.includes('colesterol');
                case 'electrolytes':
                  return testName.includes('sódio') || testName.includes('potássio') ||
                         testName.includes('cálcio');
                case 'microbiology':
                  return testName.includes('cultura') || testName.includes('hemocultura');
                default:
                  return false;
              }
            });

            // Convert backend LabResult to frontend LabResult format
            const convertedLabResults = categoryLabResults.map((lr: any) => ({
              result_id: lr.result_id || -1,
              patient_id: lr.patient_id || -1,
              exam_id: lr.exam_id || null,
              user_id: lr.user_id || -1,
              category_id: lr.category_id || null,
              test_name: lr.test_name || '',
              value_numeric: lr.value_numeric || null,
              value_text: lr.value_text || null,
              unit: lr.unit || null,
              timestamp: lr.timestamp || lr.created_at || new Date().toISOString(),
              reference_range_low: lr.reference_range_low || null,
              reference_range_high: lr.reference_range_high || null,
              is_abnormal: lr.is_abnormal || null,
              collection_datetime: lr.collection_datetime || null,
              created_at: lr.created_at || lr.timestamp || new Date().toISOString(),
              created_by: lr.created_by || null,
              test_category_id: lr.test_category_id || null,
              reference_text: lr.reference_text || null,
              comments: lr.comments || null,
              updated_at: lr.updated_at || null,
              report_datetime: lr.report_datetime || null,
            }));

            convertedResults[categoryKey] = {
              interpretation: analysisData.interpretation || "Interpretação não disponível.",
              abnormalities: analysisData.abnormalities || [],
              is_critical: analysisData.is_critical || false,
              recommendations: analysisData.recommendations || [],
              details: {
                lab_results: convertedLabResults,
                alerts: []
              }
            };
          }
        });

        setAnalysisResults(convertedResults);
        setStep('results');

        toast.success('Análise concluída!', {
          description: 'Resultados processados com sucesso'
        });

      } catch (err: any) {
        console.error('Erro na análise do arquivo:', err);

        let errorMessage = 'Falha ao analisar o arquivo. Por favor, tente novamente.';

        if (err.message?.includes('network') || err.message?.includes('fetch')) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        } else if (err.message?.includes('timeout')) {
          errorMessage = 'Tempo limite excedido. O arquivo pode ser muito complexo.';
        } else if (err.message?.includes('unauthorized') || err.message?.includes('403')) {
          errorMessage = 'Acesso não autorizado. Faça login novamente.';
        } else if (err.message?.includes('500')) {
          errorMessage = 'Erro interno do servidor. Tente novamente em alguns minutos.';
        }

        setError(errorMessage);
        setStep('upload');

        toast.error('Erro na análise', {
          description: errorMessage
        });
      }
    }
  }, []);

  const handleLinkToPatient = () => {
    setStep('linking');
  };

  const fetchPatients = useCallback(async () => {
    if (!isSignedIn) return;

    setIsLoadingPatients(true);
    try {
      const token = await getToken();
      if (!token) return;

      const response = await fetch('/api/patients', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPatients(data.items || data || []);
      } else {
        console.error('Erro ao buscar pacientes:', response.statusText);
        // Fallback to demo data if API fails
        setPatients([
          { patient_id: 'demo-patient-1', name: 'João Silva', medical_record_number: '001' },
          { patient_id: 'demo-patient-2', name: 'Maria Santos', medical_record_number: '002' },
          { patient_id: 'demo-patient-3', name: 'Pedro Oliveira', medical_record_number: '003' },
        ]);
      }
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error);
      // Fallback to demo data
      setPatients([
        { patient_id: 'demo-patient-1', name: 'João Silva', medical_record_number: '001' },
        { patient_id: 'demo-patient-2', name: 'Maria Santos', medical_record_number: '002' },
        { patient_id: 'demo-patient-3', name: 'Pedro Oliveira', medical_record_number: '003' },
      ]);
    } finally {
      setIsLoadingPatients(false);
    }
  }, [isSignedIn, getToken]);

  const handleNewAnalysis = () => {
    setFile(null);
    setAnalysisResult(null);
    setAnalysisResults(null);
    setDrCorvusInsights(null);
    setInsightsError(null);
    setError(null);
    setSuccessMessage(null);
    setSelectedPatientId(null);
    setSaveError(null);
    setStep('upload');

    toast.info('Nova análise iniciada', {
      description: 'Pronto para fazer upload de um novo arquivo'
    });
  };

  const handleSaveToPatient = async () => {
    if (!selectedPatientId || !analysisResult?.lab_results) {
      setSaveError('Paciente não selecionado ou sem resultados para salvar.');
      return;
    }

    setIsSavingToPatient(true);
    setSaveError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Usuário não autenticado');
      }

      // Save each lab result to the patient
      const savePromises = analysisResult.lab_results.map(async (labResult: any) => {
        const labData = {
          test_name: labResult.test_name,
          value_numeric: labResult.value_numeric,
          value_text: labResult.value_text,
          unit: labResult.unit,
          timestamp: labResult.timestamp || new Date().toISOString(),
          reference_range_low: labResult.reference_range_low,
          reference_range_high: labResult.reference_range_high,
          comments: `Resultado extraído de arquivo: ${file?.name || 'Arquivo não identificado'}`
        };

        const response = await fetch(`/api/patients/${selectedPatientId}/lab_results`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(labData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || `Erro ao salvar resultado: ${labResult.test_name}`);
        }

        return response.json();
      });

      await Promise.all(savePromises);

      toast.success('Resultados salvos com sucesso!', {
        description: `${analysisResult.lab_results.length} resultados laboratoriais salvos para o paciente.`
      });

      setStep('saving');
      setSuccessMessage('Resultados salvos com sucesso no perfil do paciente!');

      // Auto-close after success
      setTimeout(() => {
        onOpenChange(false);
        handleNewAnalysis();
      }, 3000);

    } catch (err: any) {
      console.error('Erro ao salvar resultados:', err);
      const errorMessage = err.message || 'Erro ao salvar resultados para o paciente.';
      setSaveError(errorMessage);

      toast.error('Erro ao salvar', {
        description: errorMessage
      });
    } finally {
      setIsSavingToPatient(false);
    }
  };

  // Fetch patients when component mounts or when results step is reached
  useEffect(() => {
    if (isSignedIn && (step === 'results' || step === 'saving')) {
      fetchPatients();
    }
  }, [isSignedIn, step, fetchPatients]);

  // Enhanced Dr. Corvus insights generation
  const handleGenerateDrCorvusInsights = async () => {
    setIsGeneratingInsights(true);
    setDrCorvusInsights(null);
    setInsightsError(null);

    // Check authentication
    if (!isSignedIn) {
      const errorMsg = "Por favor, faça login para utilizar os insights do Dr. Corvus. O conhecimento aguarda os autenticados!";
      setInsightsError(errorMsg);
      setIsGeneratingInsights(false);
      toast.info("Autenticação Necessária", { description: errorMsg });
      return;
    }

    try {
      const token = await getToken();
      if (!token) {
        const errorMsg = "Sessão de autenticação não encontrada. Por favor, tente fazer login novamente.";
        setInsightsError(errorMsg);
        setIsGeneratingInsights(false);
        toast.error('Erro de autenticação', { description: errorMsg });
        return;
      }

      // Prepare lab results from analysis results
      let preparedLabResults: LabTestResultForLLM[] = [];

      // Extract lab results from analysis results
      if (analysisResults) {
        Object.values(analysisResults).forEach(systemResult => {
          if (systemResult.details?.lab_results) {
            systemResult.details.lab_results.forEach(lr => {
              let interpretationFlag: string | undefined = undefined;
              if (lr.is_abnormal) {
                interpretationFlag = "Alterado";
              } else if (!lr.is_abnormal) {
                interpretationFlag = "Normal";
              }

              preparedLabResults.push({
                test_name: lr.test_name,
                value: lr.value_numeric !== null && lr.value_numeric !== undefined ? String(lr.value_numeric) : lr.value_text || "",
                unit: lr.unit === null ? undefined : lr.unit,
                reference_range_low: lr.reference_range_low !== null && lr.reference_range_low !== undefined ? String(lr.reference_range_low) : undefined,
                reference_range_high: lr.reference_range_high !== null && lr.reference_range_high !== undefined ? String(lr.reference_range_high) : undefined,
                interpretation_flag: interpretationFlag,
                notes: lr.comments === null ? undefined : lr.comments,
              });
            });
          }
        });
      }

      if (preparedLabResults.length === 0) {
        const errorMsg = "Nenhum resultado de exame válido encontrado para enviar ao Dr. Corvus.";
        setInsightsError(errorMsg);
        setIsGeneratingInsights(false);
        toast.error('Dados insuficientes', { description: errorMsg });
        return;
      }

      const payloadForLLM = {
        lab_results: preparedLabResults,
        user_role: "DOCTOR_STUDENT",
        patient_context: generalNotes,
        specific_user_query: specificUserQuery,
      };

      toast.info('Dr. Corvus está analisando...', {
        description: `Processando ${preparedLabResults.length} resultado(s)`
      });

      const response = await fetch('/api/clinical-assistant/generate-lab-insights-translated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payloadForLLM),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          message: "Erro desconhecido ao gerar insights."
        }));
        const errorMsg = errorData.detail || errorData.message || `Erro HTTP! Status: ${response.status}`;
        throw new Error(errorMsg);
      }

      const insights: LabInsightsOutputFromLLM = await response.json();

      setDrCorvusInsights(insights);
      setShowInsightsModal(false);

      toast.success('Insights gerados!', {
        description: 'Dr. Corvus completou a análise dos seus resultados'
      });

    } catch (error: any) {
      const errorMsg = error.message || "Falha ao gerar insights do Dr. Corvus.";
      console.error('Erro ao gerar insights:', error);
      setInsightsError(errorMsg);
      toast.error('Erro nos insights', {
        description: errorMsg
      });
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {step === 'upload' && 'Análise Laboratorial Rápida'}
            {step === 'analyzing' && 'Analisando arquivo...'}
            {step === 'results' && 'Resultados da Análise'}
            {step === 'linking' && 'Vincular a Paciente'}
          </DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <p className="text-gray-600 text-center mb-4">
              Faça upload de um arquivo PDF ou imagem contendo os resultados dos exames para análise automática.
            </p>
            <FileUploader
              onFileDrop={handleFileUpload}
              accept="application/pdf,image/jpeg,image/png"
              maxFiles={1}
            />
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
              <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-purple-500 animate-spin animation-delay-75"></div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-800">Dr. Corvus está analisando...</h3>
              <p className="text-gray-600">Processando dados laboratoriais com inteligência artificial</p>
              {file && (
                <p className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-full inline-block">
                  📄 {file.name}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce animation-delay-100"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce animation-delay-200"></div>
              </div>
              <p className="text-xs text-gray-400">Isso pode levar alguns segundos...</p>
            </div>
          </div>
        )}

        {step === 'saving' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <div className="relative">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-500"></div>
              <div className="absolute inset-0 rounded-full border-t-2 border-b-2 border-green-600 animate-spin animation-delay-75"></div>
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-gray-800">Salvando Resultados...</h3>
              <p className="text-gray-600">Os resultados estão sendo salvos no perfil do paciente</p>
              {selectedPatientId && (
                <p className="text-sm text-gray-500 bg-green-50 px-3 py-1 rounded-full inline-block">
                  👤 Paciente ID: {selectedPatientId}
                </p>
              )}
            </div>

            <div className="flex flex-col items-center space-y-2">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce animation-delay-100"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce animation-delay-200"></div>
              </div>
              <p className="text-xs text-gray-400">Aguarde enquanto processamos...</p>
            </div>

            {successMessage && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-800 mb-1">Sucesso!</h4>
                    <p className="text-green-700 text-sm leading-relaxed">{successMessage}</p>
                    <p className="text-xs text-green-600 mt-2">Esta janela será fechada automaticamente em alguns segundos...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'results' && analysisResults && (
          <div className="space-y-4">
            {/* Header with Dr. Corvus Button */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                Resultados da Análise
              </h2>
              <div className="flex items-center space-x-3 mt-3 sm:mt-0">
                <TooltipProvider>
                  <Tooltip delayDuration={300}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => {
                          if (!isSignedIn) {
                            const errorMsg = "Por favor, faça login para utilizar os insights do Dr. Corvus.";
                            setInsightsError(errorMsg);
                            toast.info("Autenticação Necessária", { description: errorMsg });
                          } else {
                            setShowInsightsModal(true);
                          }
                        }}
                        className="dr-corvus-image-button relative rounded-full p-1 transition-all duration-300 ease-in-out hover:shadow-lg hover:ring-2 hover:ring-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                        aria-label="Gerar Insights com Dr. Corvus"
                      >
                        <Image
                          src={DrCorvusIcon}
                          alt="Dr. Corvus"
                          width={32}
                          height={32}
                          className="rounded-full transition-transform duration-300 hover:scale-110"
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 text-white p-2 rounded-md shadow-lg">
                      <p>Gerar Insights com Dr. Corvus</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            <MultiAnalysisResult results={analysisResults} />

            {/* Dr. Corvus Insights Loading State */}
            {isGeneratingInsights && (
              <div className="mt-8 p-8 border border-blue-200 rounded-lg shadow-lg bg-blue-50">
                <div className="flex flex-col items-center text-center">
                  <div className="relative mb-4">
                    <Image
                      src={DrCorvusIcon}
                      alt="Dr. Corvus"
                      width={48}
                      height={48}
                      className="rounded-full animate-pulse"
                    />
                    <div className="absolute -inset-1 rounded-full border-2 border-blue-400 animate-ping"></div>
                  </div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    Dr. Corvus está analisando...
                  </h3>
                  <p className="text-blue-600">
                    Gerando insights personalizados baseados nos seus resultados
                  </p>
                </div>
              </div>
            )}

            {/* Insights Error Display */}
            {insightsError && (
              <div className="mt-8">
                <Alert className="border-red-500 text-red-700 bg-red-50">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle className="font-semibold">Erro ao Gerar Insights</AlertTitle>
                  <AlertDescription className="mt-1">
                    {insightsError}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Dr. Corvus Insights Display */}
            {drCorvusInsights && !isGeneratingInsights && (
              <div className="mt-8 p-6 border-2 border-blue-900 rounded-lg shadow-xl">
                <div className="flex items-center mb-6 pb-4 border-b border-blue-900">
                  <Image src={DrCorvusIcon} alt="Dr. Corvus" width={32} height={32} className="mr-3 rounded-full" />
                  <h2 className="text-2xl font-bold text-blue-800">Insights do Dr. Corvus</h2>
                  <div className="ml-auto">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                  </div>
                </div>

                <Accordion type="multiple" className="w-full space-y-3">
                  {/* Clinical Summary Section */}
                  {drCorvusInsights.clinical_summary && (
                    <AccordionItem value="clinical-summary" className="border border-blue-900 rounded-lg px-4 bg-blue-50">
                      <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-blue-900">
                        📋 Resumo Clínico Objetivo
                      </AccordionTrigger>
                      <AccordionContent className="text-base text-gray-700 whitespace-pre-wrap pt-2 pb-4">
                        {drCorvusInsights.clinical_summary}
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Detailed Reasoning Section */}
                  {drCorvusInsights.professional_detailed_reasoning_cot && (
                    <AccordionItem value="detailed-reasoning" className="border border-blue-900 rounded-lg px-4">
                      <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-blue-900">
                        🧠 Raciocínio Clínico Detalhado
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4">
                        <div className="prose prose-sm max-w-none text-gray-700">
                          <ReactMarkdown
                            components={{
                              strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                              p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                              h2: ({ children }) => <h2 className="text-lg font-bold text-blue-800 mt-6 mb-3 border-b border-gray-200 pb-2">{children}</h2>,
                              hr: () => <hr className="my-4 border-gray-300" />,
                            }}
                          >
                            {DOMPurify.sanitize(drCorvusInsights.professional_detailed_reasoning_cot || '')}
                          </ReactMarkdown>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  )}

                  {/* Important Results Section */}
                  {drCorvusInsights.important_results_to_discuss_with_doctor && drCorvusInsights.important_results_to_discuss_with_doctor.length > 0 && (
                    <AccordionItem value="important-results" className="border border-red-200 rounded-lg px-4 bg-red-50">
                      <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-red-900">
                        ⚠️ Resultados Importantes para Discussão Imediata
                      </AccordionTrigger>
                      <AccordionContent className="pt-2 pb-4">
                        <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
                          {drCorvusInsights.important_results_to_discuss_with_doctor.map((item, idx) => (
                            <li key={idx} className="leading-relaxed">{item}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  )}
                </Accordion>

                {/* Disclaimer */}
                <Alert className="mt-6 border-gray-300 bg-gray-100 text-gray-700">
                  <Info className="h-4 w-4 text-gray-700" />
                  <AlertTitle className="text-gray-700 font-semibold">Aviso Importante</AlertTitle>
                  <AlertDescription className="text-sm text-gray-600 mt-1">
                    <span>Os resultados aqui apresentados foram gerados por um assistente de IA após análise de dados e devem ser confirmados por um profissional de saúde.</span>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Patient Selection Section */}
            <div className="mt-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Salvar Resultados para Paciente
              </h3>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="patient-select" className="text-sm font-medium text-gray-700">
                    Selecione o Paciente
                  </Label>
                  <Select value={selectedPatientId || ""} onValueChange={setSelectedPatientId}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Escolha um paciente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingPatients ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-gray-500">Carregando pacientes...</span>
                        </div>
                      ) : patients.length > 0 ? (
                        patients.map((patient) => (
                          <SelectItem key={patient.patient_id} value={patient.patient_id}>
                            {patient.name || 'Nome não informado'} (ID: {patient.medical_record_number || patient.patient_id})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-4 text-center text-sm text-gray-500">
                          Nenhum paciente encontrado
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    Os resultados laboratoriais serão salvos no perfil do paciente selecionado.
                  </p>
                </div>

                {saveError && (
                  <Alert className="border-red-500 text-red-700 bg-red-50">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">Erro ao Salvar</AlertTitle>
                    <AlertDescription className="mt-1">
                      {saveError}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={handleNewAnalysis}>
                    Nova Análise
                  </Button>
                  <Button
                    onClick={handleSaveToPatient}
                    disabled={!selectedPatientId || isSavingToPatient}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSavingToPatient ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar para Paciente
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'linking' && analysisResult && (
          <PatientLinker
            analysisData={analysisResult}
            onCancel={() => setStep('results')}
            onLinked={() => onOpenChange(false)}
          />
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-red-800 mb-1">Erro na Análise</h4>
                <p className="text-red-700 text-sm leading-relaxed">{error}</p>
                <div className="mt-3 flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setError(null)}
                    className="text-red-700 border-red-300 hover:bg-red-100"
                  >
                    Tentar Novamente
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setError(null)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-800 mb-1">Sucesso!</h4>
                <p className="text-green-700 text-sm leading-relaxed">{successMessage}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSuccessMessage(null)}
                  className="mt-2 text-green-600 hover:text-green-800"
                >
                  Fechar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Dr. Corvus Insights Configuration Dialog */}
        <Dialog open={showInsightsModal} onOpenChange={setShowInsightsModal}>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center text-xl">
                <Image src={DrCorvusIcon} alt="Dr. Corvus" width={24} height={24} className="mr-2 rounded-full" />
                Configurar Insights com Dr. Corvus
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Forneça contexto adicional ou perguntas específicas para refinar os insights gerados pelo Dr. Corvus.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-4">
              <div>
                <Label htmlFor="dialogGeneralNotes" className="text-sm font-medium text-gray-700 mb-2 block">
                  Contexto do Paciente (Opcional)
                </Label>
                <Textarea
                  id="dialogGeneralNotes"
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Diagnósticos prévios, sintomas atuais, medicações em uso, história clínica relevante..."
                  rows={4}
                  className="text-sm resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Informações contextuais ajudam o Dr. Corvus a gerar insights mais relevantes e personalizados.
                </p>
              </div>

              <div>
                <Label htmlFor="dialogSpecificUserQuery" className="text-sm font-medium text-gray-700 mb-2 block">
                  Pergunta Específica (Opcional)
                </Label>
                <Input
                  id="dialogSpecificUserQuery"
                  value={specificUserQuery}
                  onChange={(e) => setSpecificUserQuery(e.target.value)}
                  placeholder="Ex: Há risco de interações medicamentosas? Quais exames complementares são necessários?"
                  className="text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Faça uma pergunta específica para focar a análise do Dr. Corvus.
                </p>
              </div>

              {insightsError && (
                <Alert className="border-red-500 text-red-700 bg-red-50">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle className="font-semibold">Erro na Geração de Insights</AlertTitle>
                  <AlertDescription className="mt-1">
                    {insightsError}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="gap-3">
              <DialogClose asChild>
                <Button variant="default" className="flex-1">
                  Cancelar
                </Button>
              </DialogClose>
              <Button
                onClick={handleGenerateDrCorvusInsights}
                disabled={isGeneratingInsights}
                className="flex-1"
                variant="default"
              >
                {isGeneratingInsights ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Gerar Insights
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
