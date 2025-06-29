'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import ReactMarkdown from 'react-markdown';
import MultiAnalysisResult from '@/components/analysis/MultiAnalysisResult';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { AlertTriangle, UploadCloud, FileText, Trash2, CheckCircle, RefreshCw, UserPlus, Info, History, BookOpen, Copy, Sparkles, Brain, Bird, Eye, EyeOff, FileDown, FlaskConical, HelpCircle, Lightbulb, Loader2, XCircle } from 'lucide-react';
import { Switch } from "@/components/ui/Switch";
import { Label } from "@/components/ui/Label";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/Accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/Dialog";
import { LabResult, ManualLabResultInput } from '@/types/health';
import { AnalysisResult as AnalysisResultType, ScoreResultType as AnalysisScoreResultType, FrontendAlertType as AnalysisFrontendAlertType } from '@/types/analysis';
import Image from 'next/image';
import FileUploadComponent from '@/components/FileUploadComponent';
import { type FileUploadApiResponse } from '@/components/FileUploadComponent';
import DrCorvusIcon from '@/../public/Icon.png';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { toast } from 'sonner';
import { useUser } from '@clerk/nextjs';
import { getAPIUrl } from '@/config';

// Define a basic type for backend alerts until a more formal one is established
interface AlertBaseBackend {
  message: string;
  severity?: string;
  category?: string;
  alert_type?: string;
  parameter?: string;
  interpretation?: string;
  recommendation?: string;
  details?: any;
  value?: string | number;
  reference?: string;
  status?: string;
}

// Exam categories with Portuguese names
const EXAM_CATEGORIES: Record<string, {title: string, tests: string[]}> = {
  hematology: {
    title: "Sistema Hematológico",
    tests: ["Hemoglobina", "Leucócitos", "Plaquetas", "Hematócrito", "Eritrócitos", "VCM", "HCM", "CHCM", "RDW", "Hemácias"]
  },
  renal: {
    title: "Função Renal", 
    tests: ["Creatinina", "Ureia", "TFG", "Ácido Úrico", "Microalbuminúria"]
  },
  hepatic: {
    title: "Função Hepática",
    tests: ["TGO", "TGP", "GGT", "Fosfatase Alcalina", "Bilirrubina", "Albumina", "Proteínas Totais"]
  },
  electrolytes: {
    title: "Eletrólitos",
    tests: ["Sódio", "Potássio", "Cloro", "Cálcio", "Magnésio", "Fósforo"]
  },
  bloodGas: {
    title: "Gasometria",
    tests: ["pH", "pCO2", "pO2", "HCO3", "BE", "Lactato", "SatO2", "FiO2"]
  },
  cardiac: {
    title: "Marcadores Cardíacos",
    tests: ["Troponina", "CK", "CK-MB", "BNP", "NT-proBNP", "LDH"]
  },
  metabolic: {
    title: "Metabolismo",
    tests: ["Glicose", "HbA1c", "Triglicérides", "Colesterol Total", "HDL", "LDL", "TSH", "T4 Livre"]
  },
  inflammation: {
    title: "Marcadores Inflamatórios",
    tests: ["PCR", "Procalcitonina", "VHS", "Ferritina", "Fibrinogênio", "D-dímero"]
  },
  microbiology: {
    title: "Microbiologia",
    tests: ["Hemocultura", "Urocultura", "Cultura de Escarro", "Cultura de Secreção"]
  },
  pancreatic: {
    title: "Função Pancreática",
    tests: ["Amilase", "Lipase"]
  }
};

// Frontend reference ranges with Portuguese unit names
const FRONTEND_REFERENCE_RANGES: Record<string, { unit: string; low?: number; high?: number; isMicrobiology?: boolean }> = {
  // Hematology
  "Hemoglobina": { unit: "g/dL", low: 12, high: 16 },
  "Leucócitos": { unit: "/mm³", low: 4000, high: 10000 },
  "Plaquetas": { unit: "/mm³", low: 150000, high: 450000 },
  "Hematócrito": { unit: "%", low: 36, high: 46 },
  "Eritrócitos": { unit: "milhões/mm³" },
  "VCM": { unit: "fL" },
  "HCM": { unit: "pg" },
  "CHCM": { unit: "g/dL" },
  "RDW": { unit: "%" },
  "Hemácias": { unit: "/µL" },

  // Renal
  "Creatinina": { unit: "mg/dL", low: 0.6, high: 1.2 },
  "Ureia": { unit: "mg/dL", low: 10, high: 50 },
  "TFG": { unit: "mL/min/1.73m²" },
  "Ácido Úrico": { unit: "mg/dL", low: 3.5, high: 7.2 },
  "Microalbuminúria": { unit: "mg/L" },

  // Hepatic
  "TGO": { unit: "U/L" },
  "TGP": { unit: "U/L" },
  "GGT": { unit: "U/L" },
  "Fosfatase Alcalina": { unit: "U/L" },
  "Bilirrubina": { unit: "mg/dL" },
  "Albumina": { unit: "g/dL", low: 3.5, high: 5.2 },
  "Proteínas Totais": { unit: "g/dL" },

  // Electrolytes
  "Sódio": { unit: "mmol/L", low: 135, high: 145 },
  "Potássio": { unit: "mmol/L", low: 3.5, high: 5.0 },
  "Cloro": { unit: "mmol/L" },
  "Cálcio": { unit: "mg/dL", low: 8.5, high: 10.5 },
  "Magnésio": { unit: "mg/dL", low: 1.5, high: 2.5 },
  "Fósforo": { unit: "mg/dL", low: 2.5, high: 4.5 },

  // Blood Gas
  "pH": { unit: "", low: 7.35, high: 7.45 },
  "pCO2": { unit: "mmHg", low: 35, high: 45 },
  "pO2": { unit: "mmHg", low: 80, high: 100 },
  "HCO3": { unit: "mmol/L", low: 22, high: 26 },
  "BE": { unit: "mmol/L", low: -3, high: 3 },
  "Lactato": { unit: "mg/dL", low: 4.5, high: 19.8 },
  "SatO2": { unit: "%", low: 95, high: 100 },
  "FiO2": { unit: "%" },

  // Cardiac Markers
  "Troponina": { unit: "ng/mL" },
  "CK": { unit: "U/L", low: 26, high: 192 },
  "CK-MB": { unit: "U/L" },
  "BNP": { unit: "pg/mL" },
  "NT-proBNP": { unit: "pg/mL" },
  "LDH": { unit: "U/L", low: 140, high: 280 },

  // Metabolic
  "Glicose": { unit: "mg/dL", low: 70, high: 100 },
  "HbA1c": { unit: "%", low: 4.0, high: 5.7 },
  "Triglicérides": { unit: "mg/dL" },
  "Colesterol Total": { unit: "mg/dL" },
  "HDL": { unit: "mg/dL" },
  "LDL": { unit: "mg/dL" },
  "TSH": { unit: "µUI/mL", low: 0.4, high: 4.0 },
  "T4 Livre": { unit: "ng/dL", low: 0.7, high: 1.8 },

  // Inflammatory Markers
  "PCR": { unit: "mg/dL", low: 0, high: 0.5 },
  "Procalcitonina": { unit: "ng/mL" },
  "VHS": { unit: "mm/h" },
  "Ferritina": { unit: "ng/mL" },
  "Fibrinogênio": { unit: "mg/dL" },
  "D-dímero": { unit: "ng/mL FEU" },

  // Pancreatic
  "Amilase": { unit: "U/L", low: 28, high: 100 },
  "Lipase": { unit: "U/L" },

  // Microbiology tests
  "Hemocultura": { unit: "", isMicrobiology: true },
  "Urocultura": { unit: "", isMicrobiology: true },
  "Cultura de Escarro": { unit: "", isMicrobiology: true },
  "Cultura de Secreção": { unit: "", isMicrobiology: true }
};

// Create ordered categories for manual input display
const orderedManualCategories = Object.keys(EXAM_CATEGORIES).map(key => ({
  key,
  title: EXAM_CATEGORIES[key].title,
  tests: EXAM_CATEGORIES[key].tests
}));

// Manual test entry interface
interface ManualTestEntry {
  id: string;
  categoryKey: string;
  categoryTitle: string;
  testName: string;
  value: string; 
  unit: string;
  refLow: string; 
  refHigh: string; 
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

// User role enum for LLM
enum UserRoleForLLM {
  // PATIENT = "PATIENT", // Future patient support (commented out for now)
  DOCTOR_STUDENT = "DOCTOR_STUDENT"
}

// Lab analysis input interface
interface LabAnalysisInputForLLM {
  lab_results: LabTestResultForLLM[];
  user_role: UserRoleForLLM;
  patient_context?: string;
  specific_user_query?: string;
}

// Lab insights output interface
interface LabInsightsOutputFromLLM {
  patient_friendly_summary?: string;
  potential_health_implications_patient?: string[];
  lifestyle_tips_patient?: string[];
  questions_to_ask_doctor_patient?: string[];
  key_abnormalities_professional?: string[];
  potential_patterns_and_correlations?: string[];
  differential_considerations_professional?: string[];
  suggested_next_steps_professional?: string[];
  important_results_to_discuss_with_doctor?: string[];
  professional_detailed_reasoning_cot?: string;
}

// Loading Component
const LoadingSpinner = ({ message = "Carregando..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center p-8 space-y-4">
    <div className="relative">
      <RefreshCw className="animate-spin h-8 w-8 text-blue-600" />
    </div>
    <p className="text-gray-600 font-medium">{message}</p>
  </div>
);

// Error Alert Component
const ErrorAlert = ({ 
  title = "Erro", 
  message, 
  onDismiss 
}: { 
  title?: string; 
  message: string; 
  onDismiss?: () => void;
}) => (
  <Alert className="border-red-500 text-red-700 bg-red-50 mb-6">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle className="font-semibold">{title}</AlertTitle>
    <AlertDescription className="mt-1">
      {message}
      {onDismiss && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDismiss}
          className="ml-2 h-auto p-1 text-red-700 hover:text-red-900"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      )}
    </AlertDescription>
  </Alert>
);

// Success Alert Component
const SuccessAlert = ({ 
  title = "Sucesso", 
  message, 
  onDismiss 
}: { 
  title?: string; 
  message: string; 
  onDismiss?: () => void;
}) => (
  <Alert className="border-green-500 text-green-700 bg-green-50 mb-6">
    <CheckCircle className="h-4 w-4" />
    <AlertTitle className="font-semibold">{title}</AlertTitle>
    <AlertDescription className="mt-1">
      {message}
      {onDismiss && (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onDismiss}
          className="ml-2 h-auto p-1 text-green-700 hover:text-green-900"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      )}
    </AlertDescription>
  </Alert>
);

export default function AnalysisPage() {
  const { userId, getToken, isLoaded: authIsLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
  
  // Core states
  const [isDoctor, setIsDoctor] = useState(false);
  const [targetPatientId, setTargetPatientId] = useState<string | null>(null);
  const [pageAnalysisResults, setPageAnalysisResults] = useState<{ [analyzerKey: string]: AnalysisResultType } | null>(null);
  const [labResultsForTable, setLabResultsForTable] = useState<LabResult[]>([]);
  const [generatedAlerts, setGeneratedAlerts] = useState<AlertBaseBackend[]>([]);
  
  // Error and success states
  const [pageUploadError, setPageUploadError] = useState<string | null>(null);
  const [pageUploadSuccessMessage, setPageUploadSuccessMessage] = useState<string | null>(null);
  
  // Refs
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const insightsContainerRef = useRef<HTMLDivElement>(null);

  // Manual input states
  const [isManualInput, setIsManualInput] = useState(false);
  const [manualPatientId, setManualPatientId] = useState("");
  const [manualExamDate, setManualExamDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualResultsData, setManualResultsData] = useState<ManualTestEntry[]>([]);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  
  // Dr. Corvus Insights states
  const [drCorvusInsights, setDrCorvusInsights] = useState<LabInsightsOutputFromLLM | null>(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);
  const [showInsightsModal, setShowInsightsModal] = useState(false);
  const [generalNotes, setGeneralNotes] = useState<string>("");
  const [currentUserRoleForLLM, setCurrentUserRoleForLLM] = useState<UserRoleForLLM>(UserRoleForLLM.DOCTOR_STUDENT);
  const [specificUserQuery, setSpecificUserQuery] = useState<string>("");

  // UI states
  const [hasMounted, setHasMounted] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Effects
  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (authIsLoaded && userId && user) {
      const userRole = user.publicMetadata?.role as string | undefined;
      setIsDoctor(userRole === 'doctor');
      if (userRole === 'doctor') {
        setCurrentUserRoleForLLM(UserRoleForLLM.DOCTOR_STUDENT);
      } 
      // Future patient support (commented out for now)
      // else {
      //   setCurrentUserRoleForLLM(UserRoleForLLM.PATIENT);
      // }
    }
  }, [authIsLoaded, userId, user]);

  // Initialize manual inputs with better error handling
  const initializeManualInputs = useCallback(() => {
    try {
      const initialData: ManualTestEntry[] = [];
      orderedManualCategories.forEach(category => {
        category.tests.forEach(testName => {
          const refRange = FRONTEND_REFERENCE_RANGES[testName] || { unit: 'N/A', isMicrobiology: false };
          initialData.push({
            id: `${category.key}-${testName}`,
            categoryKey: category.key,
            categoryTitle: category.title,
            testName: testName,
            value: '',
            unit: refRange.isMicrobiology ? '' : refRange.unit,
            refLow: refRange.isMicrobiology || refRange.low === undefined ? '' : String(refRange.low),
            refHigh: refRange.isMicrobiology || refRange.high === undefined ? '' : String(refRange.high),
          });
        });
      });
      setManualResultsData(initialData);
    } catch (error) {
      console.error('Erro ao inicializar dados manuais:', error);
      toast.error('Erro ao inicializar formulário manual');
    }
  }, []);

  useEffect(() => {
    if (isManualInput) {
      initializeManualInputs();
    }
  }, [isManualInput, initializeManualInputs]);

  // Handle manual result changes with validation
  const handleManualResultChange = (id: string, field: keyof ManualTestEntry, value: string) => {
    try {
      setManualResultsData(prevData =>
        prevData.map(item => (item.id === id ? { ...item, [field]: value } : item))
      );
    } catch (error) {
      console.error('Erro ao atualizar resultado manual:', error);
      toast.error('Erro ao atualizar campo');
    }
  };

  // Enhanced manual upload with better error handling and loading states
  const handleUpload = async () => {
    if (!isManualInput) {
      console.warn("handleUpload chamado quando não está no modo de entrada manual.");
      return;
    }

    // Clear previous messages
    setPageUploadError(null);
    setPageUploadSuccessMessage(null);

    // Validate manual submission
    if (process.env.NEXT_PUBLIC_ALLOW_GUEST_MANUAL_SUBMISSION === 'false' && !manualPatientId.trim()) {
      const errorMsg = "A submissão manual para convidados está desabilitada e nenhum ID de Paciente foi fornecido.";
      setPageUploadError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    
    const filteredManualResults = manualResultsData.filter(item => item.value.trim() !== '');
    if (filteredManualResults.length === 0) {
      const errorMsg = "Nenhum resultado inserido para análise. Por favor, preencha pelo menos um campo.";
      setPageUploadError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Start loading state
    setIsSubmittingManual(true);
    
    // Clear previous results
    setPageAnalysisResults(null);
    setLabResultsForTable([]);
    setGeneratedAlerts([]);
    setDrCorvusInsights(null);
    setInsightsError(null);

    try {
      const token = await getToken();

      // Prepare lab results payload
      const labResultsPayload: ManualLabResultInput[] = filteredManualResults.map(item => ({
        test_name: item.testName,
        value_numeric: (FRONTEND_REFERENCE_RANGES[item.testName]?.isMicrobiology || isNaN(parseFloat(item.value))) ? undefined : parseFloat(item.value),
        value_text: (FRONTEND_REFERENCE_RANGES[item.testName]?.isMicrobiology || !isNaN(parseFloat(item.value))) ? item.value : undefined,
        unit: item.unit === 'N/A' ? undefined : item.unit,
        timestamp: new Date(manualExamDate).toISOString(),
        reference_range_low: item.refLow !== '' ? parseFloat(item.refLow) : undefined,
        reference_range_high: item.refHigh !== '' ? parseFloat(item.refHigh) : undefined,
      }));
      
      const effectivePatientId = manualPatientId.trim() !== '' ? manualPatientId.trim() : null;

      const manualDataForJson = {
        ...(effectivePatientId && { patient_id: effectivePatientId }), 
        exam_date: manualExamDate,
        lab_results: labResultsPayload
      };

      const apiUrl = `${getAPIUrl()}/api/clinical-assistant/guest-analysis`; // TODO: implement the guest API in frontend and backend

      // Create FormData
      const formData = new FormData();
      formData.append('analysis_type', 'manual_submission');
      formData.append('manualLabDataJSON', JSON.stringify(manualDataForJson));

      toast.info('Enviando dados para análise...', { 
        description: `${filteredManualResults.length} resultado(s) sendo processado(s)` 
      });

      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: "Erro desconhecido no servidor ao submeter dados manuais." 
        }));
        const errorMsg = errorData.detail || errorData.message || `Erro HTTP! Status: ${response.status}`;
        throw new Error(errorMsg);
      }

      const data: FileUploadApiResponse = await response.json();
      
      // Update page state on success
      if (data.lab_results) setLabResultsForTable(data.lab_results);
      if (data.analysis_results) setPageAnalysisResults(data.analysis_results);
      if (data.generated_alerts) setGeneratedAlerts(data.generated_alerts);
      
      const successMsg = data.message || "Dados manuais analisados com sucesso!";
      setPageUploadSuccessMessage(successMsg);
      
      toast.success('Análise concluída!', { 
        description: successMsg
      });
      
      // Scroll to results
      setTimeout(() => {
        resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (error: any) {
      const errorMsg = error.message || "Falha inesperada ao submeter dados manuais.";
      console.error("Erro na submissão manual:", error);
      setPageUploadError(errorMsg);
      toast.error('Erro na análise', { 
        description: errorMsg 
      });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  // Enhanced copy results function
  const handleCopyAllResults = () => {
    try {
      let copyText = "=== RESULTADOS DA ANÁLISE DR. CORVUS ===\n\n";
      
      if (labResultsForTable.length > 0) {
        copyText += "📊 RESULTADOS DE LABORATÓRIO:\n";
        labResultsForTable.forEach(lr => {
          const valueDisplay = lr.value_numeric !== null ? lr.value_numeric : lr.value_text || "N/A";
          const status = lr.is_abnormal ? "⚠️ ALTERADO" : "✅ NORMAL";
          copyText += `• ${lr.test_name}: ${valueDisplay} ${lr.unit || ''} [${status}]\n`;
        });
        copyText += "\n";
      }

      if (generatedAlerts.length > 0) {
        copyText += "🚨 ALERTAS CLÍNICOS:\n";
        generatedAlerts.forEach(alert => {
          copyText += `• ${alert.message}\n`;
        });
        copyText += "\n";
      }

      if (drCorvusInsights) {
        copyText += "🧠 INSIGHTS DO DR. CORVUS:\n";
        
        // Future patient support (commented out for now)
        // if (currentUserRoleForLLM === UserRoleForLLM.PATIENT) {
        //   if (drCorvusInsights.patient_friendly_summary) {
        //     copyText += `\nResumo Amigável:\n${drCorvusInsights.patient_friendly_summary}\n`;
        //   }
        //   if (drCorvusInsights.potential_health_implications_patient) {
        //     copyText += "\nImplicações para Saúde:\n";
        //     drCorvusInsights.potential_health_implications_patient.forEach(impl => {
        //       copyText += `• ${impl}\n`;
        //     });
        //   }
        // } else {
          if (drCorvusInsights.key_abnormalities_professional) {
            copyText += "\nPrincipais Anormalidades:\n";
            drCorvusInsights.key_abnormalities_professional.forEach(abnormality => {
              copyText += `• ${abnormality}\n`;
            });
          }
          if (drCorvusInsights.differential_considerations_professional) {
            copyText += "\nConsiderações Diagnósticas:\n";
            drCorvusInsights.differential_considerations_professional.forEach(consideration => {
              copyText += `• ${consideration}\n`;
            });
          }
      }

      copyText += `\n=== Relatório gerado em ${new Date().toLocaleString('pt-BR')} ===`;

      navigator.clipboard.writeText(copyText).then(() => {
        toast.success('Resultados copiados!', { 
          description: 'Todos os resultados foram copiados para a área de transferência' 
        });
      }).catch(() => {
        toast.error('Erro ao copiar', { 
          description: 'Não foi possível copiar os resultados' 
        });
      });
    } catch (error) {
      console.error('Erro ao copiar resultados:', error);
      toast.error('Erro ao processar dados para cópia');
    }
  };

  // Enhanced Dr. Corvus insights generation with better error handling
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

      let preparedLabResults: LabTestResultForLLM[] = [];

      // Prepare data from manual input
      if (isManualInput && manualResultsData.length > 0) {
        preparedLabResults = manualResultsData
          .filter(item => item.value.trim() !== '')
          .map(item => ({
            test_name: item.testName,
            value: item.value,
            unit: item.unit === 'N/A' ? undefined : item.unit,
            reference_range_low: item.refLow === '' ? undefined : item.refLow,
            reference_range_high: item.refHigh === '' ? undefined : item.refHigh,
            notes: undefined
          }));
      } 
      // Prepare data from uploaded results
      else if (labResultsForTable.length > 0) {
        preparedLabResults = labResultsForTable.map(lr => {
          const valueStr = lr.value_numeric !== null && lr.value_numeric !== undefined ? String(lr.value_numeric) : lr.value_text || "";
          
          let interpretationFlag: string | undefined = undefined;
          const refRangeLow = lr.reference_range_low;
          const refRangeHigh = lr.reference_range_high;

          if (lr.is_abnormal) {
            if (lr.value_text === "Positivo" || lr.value_text === "Reagente") {
              interpretationFlag = lr.value_text;
            } else if (typeof lr.value_numeric === 'number' && typeof refRangeHigh === 'number' && lr.value_numeric > refRangeHigh) {
              interpretationFlag = "Alto";
            } else if (typeof lr.value_numeric === 'number' && typeof refRangeLow === 'number' && lr.value_numeric < refRangeLow) {
              interpretationFlag = "Baixo";
            } else {
              interpretationFlag = "Alterado";
            }
          } else if (lr.value_text === "Negativo" || lr.value_text === "Não Reagente") {
            interpretationFlag = lr.value_text;
          } else if (!lr.is_abnormal && (lr.value_numeric !== null || lr.value_text !== null)) {
            interpretationFlag = "Normal";
          }

          return {
            test_name: lr.test_name,
            value: valueStr,
            unit: lr.unit === null ? undefined : lr.unit,
            reference_range_low: lr.reference_range_low !== null && lr.reference_range_low !== undefined ? String(lr.reference_range_low) : undefined,
            reference_range_high: lr.reference_range_high !== null && lr.reference_range_high !== undefined ? String(lr.reference_range_high) : undefined,
            interpretation_flag: interpretationFlag,
            notes: lr.comments === null ? undefined : lr.comments,
          };
        });
      } else {
        const errorMsg = "Nenhum resultado de exame disponível para gerar insights.";
        setInsightsError(errorMsg);
        setIsGeneratingInsights(false);
        toast.error('Dados insuficientes', { description: errorMsg });
        return;
      }

      if (preparedLabResults.length === 0) {
        const errorMsg = "Nenhum resultado de exame válido encontrado para enviar ao Dr. Corvus.";
        setInsightsError(errorMsg);
        setIsGeneratingInsights(false);
        toast.error('Dados insuficientes', { description: errorMsg });
        return;
      }

      const payloadForLLM: LabAnalysisInputForLLM = {
        lab_results: preparedLabResults,
        user_role: currentUserRoleForLLM,
        patient_context: generalNotes,
        specific_user_query: specificUserQuery,
      };

      toast.info('Dr. Corvus está analisando...', { 
        description: `Processando ${preparedLabResults.length} resultado(s)` 
      });

      const response = await fetch('/api/clinical-assistant/insights-translated', {
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
      
      // Scroll to insights after a short delay
      setTimeout(() => {
        insightsContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);

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
  
  // Standardized loading banner
  if (!authIsLoaded) {
    return (
      <div className="container mx-auto p-4 md:p-8 space-y-12">
        <section className="text-center py-10 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl border border-primary/20 shadow-lg">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight flex items-center justify-center mb-4">
              <RefreshCw className="h-10 w-10 md:h-12 md:w-12 mr-3 animate-spin" />
              Central de Análise Dr. Corvus
            </h1>
            <p className="mt-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
              Carregando a Central de Análise...
            </p>
          </div>
        </section>
        {/* No tab placeholders needed for analysis page */}
      </div>
    );
  }

  // Calculate total score for APACHE II (if applicable)
  let apacheScoreObj: AnalysisScoreResultType | undefined = undefined;
  if (pageAnalysisResults) {
    for (const key in pageAnalysisResults) {
      const resultCategory = pageAnalysisResults[key];
      if (resultCategory && resultCategory.details && Array.isArray(resultCategory.details.score_results)) {
        apacheScoreObj = resultCategory.details.score_results.find(
          (s: AnalysisScoreResultType) => s.score_name === 'APACHE II'
        );
        if (apacheScoreObj) break;
      }
    }
  }
  const isApacheCritical = apacheScoreObj && typeof apacheScoreObj.score_value === 'number' && apacheScoreObj.score_value >= 15;

  // Dr. Corvus Insights Button (conditionally rendered)
  const showDrCorvusButton = (pageAnalysisResults && Object.keys(pageAnalysisResults).length > 0) || (isManualInput && manualResultsData.some(item => item.value.trim() !== ''));

  const drCorvusButton = showDrCorvusButton ? (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            onClick={() => {
              if (!isSignedIn) {
                const errorMsg = "Por favor, faça login para utilizar os insights do Dr. Corvus. O conhecimento aguarda os autenticados!";
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
  ) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-6">
      <div className="container mx-auto px-4 md:px-8">
        <div className="w-full max-w-6xl mx-auto bg-white shadow-xl rounded-lg overflow-hidden">

          
          
          {/* Header Section - Standardized */}
          <section className="text-center py-12 academy-gradient-header rounded-xl border border-primary/20 shadow-lg">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center justify-center mb-4">
              <FlaskConical className="h-12 w-12 mr-4" />
              Central de Análise Dr. Corvus
            </h1>
            <p className="mt-4 text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed">
              Faça upload de um PDF de exame ou insira os dados manualmente para análise inteligente.
            </p>
            
            {/* Status Indicators */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                Sistema Ativo
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
                <Brain className="w-3 h-3 mr-1" />
                Análise Avançada com Insights
              </div>
            </div>
          </section>

          <div className="p-6 md:p-10">
            
            {/* Error and Success Messages */}
            {pageUploadError && (
              <ErrorAlert 
                title="Erro na Análise"
                message={pageUploadError} 
                onDismiss={() => setPageUploadError(null)}
              />
            )}
            
            {pageUploadSuccessMessage && (
              <SuccessAlert 
                title="Análise Concluída"
                message={pageUploadSuccessMessage} 
                onDismiss={() => setPageUploadSuccessMessage(null)}
              />
            )}

            {/* Input Mode Toggle */}
            <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50 shadow-sm">
              <div className="flex items-center space-x-4 mb-6">
                <Switch 
                  id="manual-input-switch"
                  checked={isManualInput}
                  onCheckedChange={() => {
                    setIsManualInput(!isManualInput);
                    setPageAnalysisResults(null);
                    setLabResultsForTable([]);
                    setGeneratedAlerts([]);
                    setPageUploadError(null);
                    setPageUploadSuccessMessage(null);
                    setDrCorvusInsights(null);
                    setInsightsError(null);
                    toast.info(
                      isManualInput ? 'Modo upload de arquivo ativado' : 'Modo entrada manual ativado'
                    );
                  }}
                />
                <Label htmlFor="manual-input-switch" className="text-lg font-semibold text-gray-700 cursor-pointer">
                  {isManualInput ? 'Entrada Manual Ativa' : 'Upload de Arquivo Ativo'}
                </Label>
              </div>
              
              <p className="text-gray-600 mb-4">
                {isManualInput 
                  ? 'Insira os valores dos exames manualmente nos campos abaixo. Preencha apenas os campos com valores conhecidos.'
                  : 'Faça upload de um arquivo PDF contendo os resultados dos exames para análise automática.'
                }
              </p>

              {/* File Upload Section */}
              {!isManualInput && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
                  <FileUploadComponent
                    patientId={null}
                    onSuccess={(data: FileUploadApiResponse) => {
                      if (data.lab_results) setLabResultsForTable(data.lab_results);
                      if (data.analysis_results) setPageAnalysisResults(data.analysis_results);
                      if (data.generated_alerts) setGeneratedAlerts(data.generated_alerts);
                      setPageUploadSuccessMessage(data.message || "Arquivo analisado com sucesso!");
                      setPageUploadError(null);
                      toast.success('Upload concluído!', { 
                        description: data.message || "Arquivo analisado com sucesso!"
                      });
                      setTimeout(() => {
                        resultsContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                  />
                </div>
              )}

              {/* Manual Input Section */}
              {isManualInput && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="manual-patient-id" className="text-sm font-medium text-gray-700">
                        ID do Paciente (Opcional)
                      </Label>
                      <Input
                        id="manual-patient-id"
                        value={manualPatientId}
                        onChange={(e) => setManualPatientId(e.target.value)}
                        placeholder="Ex: P001"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="manual-exam-date" className="text-sm font-medium text-gray-700">
                        Data do Exame
                      </Label>
                      <Input
                        id="manual-exam-date"
                        type="date"
                        value={manualExamDate}
                        onChange={(e) => setManualExamDate(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  {/* Manual Results Grid */}
                  <div className="grid gap-6">
                    {orderedManualCategories.map(category => (
                      <div key={category.key} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">
                          {category.title}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {category.tests.map(testName => {
                            const entryId = `${category.key}-${testName}`;
                            const entry = manualResultsData.find(item => item.id === entryId);
                            const isMicrobiology = FRONTEND_REFERENCE_RANGES[testName]?.isMicrobiology;

                            return (
                              <div key={entryId} className="space-y-2">
                                <Label className="text-sm font-medium text-gray-700">
                                  {testName}
                                </Label>
                                <div className="grid grid-cols-3 gap-2 items-center">
                                  <Input
                                    value={entry?.value || ''}
                                    onChange={(e) => handleManualResultChange(entryId, 'value', e.target.value)}
                                    placeholder={isMicrobiology ? "Ex: Positivo" : "Valor"}
                                    className="text-sm col-span-2"
                                  />
                                  {isMicrobiology ? (
                                    <Input
                                      defaultValue={entry?.unit || ''} // Should be '' for microbiology
                                      placeholder="-"
                                      className="text-sm col-span-1"
                                      disabled
                                      readOnly
                                    />
                                  ) : (
                                    <Select
                                      value={entry?.unit || ''}
                                      onValueChange={(newUnitValue) => handleManualResultChange(entryId, 'unit', newUnitValue)}
                                      disabled={!entry?.unit || entry.unit === '' || entry.unit === 'N/A'}
                                    >
                                      <SelectTrigger className="text-sm col-span-1">
                                        <SelectValue placeholder="Unid." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {entry?.unit && entry.unit !== '' && (
                                          <SelectItem value={entry.unit}>{entry.unit}</SelectItem>
                                        )}
                                      </SelectContent>
                                    </Select>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Manual Submit Button */}
                  <div className="flex justify-center pt-6">
                    <Button
                      onClick={handleUpload}
                      className="w-full md:w-auto py-3 px-8 text-base bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all duration-300 ease-in-out transform hover:scale-105 flex items-center justify-center shadow-lg"
                      disabled={isSubmittingManual}
                      size="lg"
                    >
                      {isSubmittingManual ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> 
                          Analisando Dados...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-5 w-5" />
                          Analisar Dados Manuais
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Results Display Area */}
            {(pageAnalysisResults || labResultsForTable.length > 0) && (
              <div ref={resultsContainerRef} className="mt-8 p-6 border border-gray-200 rounded-lg shadow-lg bg-white">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-6 pb-4 border-b">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <FlaskConical className="mr-2 h-6 w-6 text-blue-600" />
                    Resultados da Análise
                  </h2>
                  <div className="flex items-center space-x-3 mt-3 sm:mt-0">
                    {drCorvusButton}
                    <Button 
                      onClick={handleCopyAllResults} 
                      variant="default" 
                      size="sm"
                      className="hover:bg-gray-50"
                    >
                      <Copy className="mr-2 h-4 w-4" /> 
                      Copiar Relatório
                    </Button>
                  </div>
                </div>
                
                {/* Standard Analysis Results */}
                {pageAnalysisResults && (
                  <div className="mb-6">
                    <MultiAnalysisResult results={pageAnalysisResults} />
                  </div>
                )}

                {/* Lab Results Table Summary */}
                {labResultsForTable.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                      <FileText className="mr-2 h-5 w-5" />
                      Resumo dos Exames ({labResultsForTable.length} resultado{labResultsForTable.length !== 1 ? 's' : ''})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {labResultsForTable.slice(0, 9).map((result, index) => {
                        const value = result.value_numeric !== null ? result.value_numeric : result.value_text;
                        const abnormalFlag = result.is_abnormal ? '⚠️' : '✅';
                        return (
                          <div key={index} className="text-sm p-2 bg-white rounded border">
                            <span className="font-medium">{result.test_name}:</span> {value} {result.unit || ''} {abnormalFlag}
                          </div>
                        );
                      })}
                      {labResultsForTable.length > 9 && (
                        <div className="text-sm p-2 bg-blue-50 rounded border border-blue-200 text-blue-700 font-medium">
                          +{labResultsForTable.length - 9} mais resultado{labResultsForTable.length - 9 !== 1 ? 's' : ''}...
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Generated Alerts */}
                {generatedAlerts.length > 0 && (
                  <div className="mt-6 space-y-2">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                      <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
                      Alertas Clínicos
                    </h3>
                    {generatedAlerts.map((alert, index) => (
                      <Alert key={index} className="border-amber-200 bg-amber-50">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <AlertDescription className="text-amber-800">
                          {alert.message}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                <ErrorAlert 
                  title="Erro ao Gerar Insights"
                  message={insightsError}
                  onDismiss={() => setInsightsError(null)}
                />
              </div>
            )}

            {/* Dr. Corvus Insights Display Area */}
            {drCorvusInsights && !isGeneratingInsights && (
              <div ref={insightsContainerRef} className="mt-8 p-6 border-2 border-blue-900 rounded-lg shadow-xl">
                <div className="flex items-center mb-6 pb-4 border-b border-blue-900">
                  <Image src={DrCorvusIcon} alt="Dr. Corvus" width={32} height={32} className="mr-3 rounded-full" />
                  <h2 className="text-2xl font-bold text-blue-800">Insights do Dr. Corvus</h2>
                  <div className="ml-auto">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                  </div>
                </div>

                <Accordion type="multiple" className="w-full space-y-3">
                  {/* Future patient support sections (commented out for now) */}
                  {/* {currentUserRoleForLLM === UserRoleForLLM.PATIENT && (
                    <>
                      {drCorvusInsights.patient_friendly_summary && (
                        <AccordionItem value="patient-summary" className="border border-blue-200 rounded-lg px-4">
                          <AccordionTrigger className="text-lg font-semibold text-blue-800 hover:text-blue-900">
                            📋 Resumo Amigável
                          </AccordionTrigger>
                          <AccordionContent className="text-base text-gray-700 whitespace-pre-wrap pt-2 pb-4">
                            {drCorvusInsights.patient_friendly_summary}
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {drCorvusInsights.potential_health_implications_patient && drCorvusInsights.potential_health_implications_patient.length > 0 && (
                        <AccordionItem value="patient-implications" className="border border-blue-200 rounded-lg px-4">
                          <AccordionTrigger className="text-lg font-semibold text-blue-800 hover:text-blue-900">
                            🏥 O que isso pode significar para sua saúde?
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-4">
                            <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
                              {drCorvusInsights.potential_health_implications_patient.map((item, idx) => (
                                <li key={idx} className="leading-relaxed">{item}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {drCorvusInsights.lifestyle_tips_patient && drCorvusInsights.lifestyle_tips_patient.length > 0 && (
                        <AccordionItem value="patient-lifestyle" className="border border-blue-200 rounded-lg px-4">
                          <AccordionTrigger className="text-lg font-semibold text-blue-800 hover:text-blue-900">
                            💡 Dicas de Estilo de Vida
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-4">
                            <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
                              {drCorvusInsights.lifestyle_tips_patient.map((item, idx) => (
                                <li key={idx} className="leading-relaxed">{item}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {drCorvusInsights.questions_to_ask_doctor_patient && drCorvusInsights.questions_to_ask_doctor_patient.length > 0 && (
                        <AccordionItem value="patient-questions" className="border border-blue-200 rounded-lg px-4">
                          <AccordionTrigger className="text-lg font-semibold text-blue-800 hover:text-blue-900">
                            ❓ Perguntas para seu Médico
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-4">
                            <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
                              {drCorvusInsights.questions_to_ask_doctor_patient.map((item, idx) => (
                                <li key={idx} className="leading-relaxed">{item}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </>
                  )} */}

                  {/* Professional Sections */}
                  {currentUserRoleForLLM === UserRoleForLLM.DOCTOR_STUDENT && (
                    <>
                      {drCorvusInsights.professional_detailed_reasoning_cot && (
                        <AccordionItem value="prof-detailed-reasoning" className="border border-blue-900 rounded-lg px-4">
                          <AccordionTrigger className="text-lg font-semibold text-gray-700 hover:text-blue-900">
                            🧠 Processo de Pensamento Detalhado
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
                                }}
                              >
                                {drCorvusInsights.professional_detailed_reasoning_cot}
                              </ReactMarkdown>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {drCorvusInsights.key_abnormalities_professional && drCorvusInsights.key_abnormalities_professional.length > 0 && (
                        <AccordionItem value="prof-abnormalities" className="border border-blue-900 rounded-lg px-4">
                          <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-blue-900">
                            🔍 Principais Anormalidades Notadas
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-4">
                            <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
                              {drCorvusInsights.key_abnormalities_professional.map((item, idx) => (
                                <li key={idx} className="leading-relaxed">{item}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {drCorvusInsights.potential_patterns_and_correlations && drCorvusInsights.potential_patterns_and_correlations.length > 0 && (
                        <AccordionItem value="prof-patterns" className="border border-blue-900 rounded-lg px-4">
                          <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-blue-900">
                            📊 Padrões e Correlações Potenciais
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-4">
                            <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
                              {drCorvusInsights.potential_patterns_and_correlations.map((item, idx) => (
                                <li key={idx} className="leading-relaxed">{item}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {drCorvusInsights.differential_considerations_professional && drCorvusInsights.differential_considerations_professional.length > 0 && (
                        <AccordionItem value="prof-differential" className="border border-blue-900 rounded-lg px-4">
                          <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-blue-900">
                            🎯 Considerações Diagnósticas Diferenciais
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-4">
                            <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
                              {drCorvusInsights.differential_considerations_professional.map((item, idx) => (
                                <li key={idx} className="leading-relaxed">{item}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                      {drCorvusInsights.suggested_next_steps_professional && drCorvusInsights.suggested_next_steps_professional.length > 0 && (
                        <AccordionItem value="prof-next-steps" className="border border-blue-900 rounded-lg px-4">
                          <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-blue-900">
                            🚀 Próximos Passos Sugeridos
                          </AccordionTrigger>
                          <AccordionContent className="pt-2 pb-4">
                            <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
                              {drCorvusInsights.suggested_next_steps_professional.map((item, idx) => (
                                <li key={idx} className="leading-relaxed">{item}</li>
                              ))}
                            </ul>
                          </AccordionContent>
                        </AccordionItem>
                      )}
                    </>
                  )}

                  {/* Common Section for Both User Types */}
                  {drCorvusInsights.important_results_to_discuss_with_doctor && drCorvusInsights.important_results_to_discuss_with_doctor.length > 0 && (
                    <AccordionItem value="common-discuss" className="border border-blue-900 rounded-lg px-4 bg-blue-50">
                      <AccordionTrigger className="text-lg font-semibold text-foreground hover:text-blue-900">
                        💬 {/* {currentUserRoleForLLM === UserRoleForLLM.PATIENT ? 'Resultados Importantes para Discutir com o Médico' : */ 'Resultados Importantes para Discutir com o Paciente' /* } */}
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
                      <span>Os resultados aqui apresentados foram gerados por um assistente de IA após análise de dados e devem ser confirmados por um profissional de saúde.                        
                      </span>
                    </AlertDescription>
                  </Alert>
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
                    <ErrorAlert 
                      title="Erro na Geração de Insights"
                      message={insightsError}
                      onDismiss={() => setInsightsError(null)}
                    />
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

          </div>
        </div>
      </div>
    </div>
  );
}