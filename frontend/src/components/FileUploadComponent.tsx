'use client';
import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useUIStore } from '@/store/uiStore';
import { Spinner } from '@/components/ui/Spinner';
import { alertsService } from '@/services/alertsService';
import { AlertsPanel } from './patients/AlertsPanel';
import { AlertCircle, CheckCircle, FileText, Upload } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { useAuth } from "@clerk/nextjs";
import { CardContent } from "@/components/ui/Card";
import { LabResult as LabResultType } from "@/types/health";

interface FileUploadComponentProps {
  patientId: string | null;
  onSuccess?: (data: FileUploadApiResponse) => void;
}

// Define the expected API response structure
// MODIFIED: Added export and generated_alerts (with placeholder type for now)
export interface FileUploadApiResponse {
  message: string;
  filename: string;
  patient_id: number; 
  exam_id: number;
  exam_timestamp: string;
  lab_results: LabResultType[];
  analysis_results?: any; 
  generated_alerts?: any[]; // Placeholder type, ideally AlertBaseBackend[] from a shared types file
}

export const FileUploadComponent: React.FC<FileUploadComponentProps> = ({ 
  patientId, 
  onSuccess 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [showAlerts, setShowAlerts] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { addNotification } = useUIStore();
  const { getToken } = useAuth();

  const resetUpload = () => {
    setFile(null);
    setProgress(0);
    setShowAlerts(false);
    setUploadError(null);
    setUploadSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const refreshAlerts = async (patId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        console.error("Token not available for refreshing alerts.");
        return;
      }
      await alertsService.getPatientAlerts(patId, token, { limit: 50, onlyActive: true });
      setShowAlerts(true);
    } catch (error) {
      console.error('Erro ao atualizar alertas:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setShowAlerts(false);
    
    const selectedFile = e.target.files?.[0] || null;
    
    if (!selectedFile) {
      return;
    }
    
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setUploadError('Arquivo inválido. Por favor, envie apenas arquivos PDF.');
      resetUpload();
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      setUploadError('Arquivo muito grande. O tamanho máximo permitido é 10MB.');
      resetUpload();
      return;
    }
    
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file || !patientId) return;
    
    setIsUploading(true);
    setUploadError(null);
    setProgress(10);
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Falha na autenticação. Token não disponível.");
      }

      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://backend-api:8000'}/api/analyze/upload/${patientId}`;
      
      const headers = new Headers();
      headers.append('Authorization', `Bearer ${token}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: headers,
        body: formData,
      });
      
      setProgress(70);
      
      if (!response.ok) {
        let errorMessage = 'Erro ao processar o arquivo.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (jsonError) {
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data: FileUploadApiResponse = await response.json();
      setProgress(90);
      
      setProgress(100);
      addNotification({
        type: 'success',
        title: 'Exame Processado',
        message: `Exame ${file.name} (ID: ${data.exam_id}) processado e associado ao paciente.`
      });
      
      await refreshAlerts(patientId);
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      setUploadSuccess(file.name);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível processar o exame.';
      setUploadError(message);
      addNotification({
        type: 'error',
        title: 'Erro no upload',
        message: message
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGuestUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setUploadError(null);
    setProgress(10);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('analysis_type', 'pdf_upload');
    
    try {
      // Use the proper API URL configuration from config.ts
      const baseUrl = window.location.origin; // Use relative URL to current origin
      const apiUrl = `${baseUrl}/api/lab-analysis/guest`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });
      
      setProgress(70);
      
      if (!response.ok) {
        let errorMessage = 'Erro ao processar o arquivo.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (jsonError) {
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
      
      const data: FileUploadApiResponse = await response.json();
      setProgress(90);
      
      setProgress(100);
      addNotification({
        type: 'success',
        title: 'Exame Processado',
        message: `Exame ${file.name} (ID: ${data.exam_id}) processado e associado ao paciente.`
      });
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      setUploadSuccess(file.name);
      
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível processar o exame.';
      setUploadError(message);
      addNotification({
        type: 'error',
        title: 'Erro no upload',
        message: message
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <CardContent>
      <div className="w-full space-y-4">
        <div>
          <label 
            htmlFor="file-upload" 
            className="block text-sm font-medium text-foreground mb-1"
          >
            Upload de Exame (PDF, máx 10MB)
          </label>
          <div className="flex items-center space-x-2">
            <Input
              id="file-upload"
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              disabled={isUploading}
              className="flex-grow"
            />
            {patientId ? (
              <Button 
                onClick={handleUpload} 
                disabled={!file || isUploading}
              >
                {isUploading ? <Spinner size="sm" className="mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {isUploading ? 'Enviando...' : 'Enviar para Paciente'}
              </Button>
            ) : (
              <Button 
                onClick={handleGuestUpload} 
                disabled={!file || isUploading}
              >
                {isUploading ? <Spinner size="sm" className="mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
                {isUploading ? 'Enviando...' : 'Enviar Análise Rápida'}
              </Button>
            )}
          </div>
        </div>

        {/* Upload Status/Error */}
        {uploadError && (
          <Alert className="text-destructive border-destructive dark:border-destructive [&>svg]:text-destructive mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro no Upload</AlertTitle>
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        )}
        {uploadSuccess && (
          <Alert className="text-green-700 border-green-500 dark:text-green-400 dark:border-green-600 [&>svg]:text-green-500 mt-4">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Upload Completo</AlertTitle>
            <AlertDescription>Arquivo {uploadSuccess} enviado com sucesso!</AlertDescription>
          </Alert>
        )}

        {isUploading && (
          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div>
                <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-primary-foreground bg-primary">
                  {progress < 70 ? 'Enviando...' : 'Processando...'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold inline-block text-primary">
                  {progress}%
                </span>
              </div>
            </div>
            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-primary/20">
              <div 
                style={{ width: `${progress}%` }} 
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
              ></div>
            </div>
          </div>
        )}

        {!isUploading && progress === 100 && (
          <Alert className="text-green-700 border-green-500 dark:text-green-400 dark:border-green-600 [&>svg]:text-green-500">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>Processamento Concluído</AlertTitle>
            <AlertDescription>
              O exame foi analisado com sucesso. Veja os resultados abaixo.
              <Button variant="default" size="sm" onClick={resetUpload} className="ml-2">Enviar outro</Button>
            </AlertDescription>
          </Alert>
        )}

        {showAlerts && patientId && <AlertsPanel patientId={patientId} />}
      </div>
    </CardContent>
  );
};

export default FileUploadComponent; 