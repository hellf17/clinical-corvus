'use client';

import React, { useState, useEffect } from 'react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
// import { Button } from '@/components/ui/Button'; // Needed?
import { PatientSummary, Patient } from '@/types/patient'; // Use types
// import { useUIStore } from '@/store/uiStore'; // Use if needed
import FileUploadComponent from '@/components/FileUploadComponent';
// Import service if fetching full details on select
import { getPatientByIdClient as getPatientById } from '@/services/patientService.client';
import { useAuth } from "@clerk/nextjs"; // Import useAuth for client-side token

interface AnalysisClientProps {
  initialPatients: PatientSummary[];
}

export default function AnalysisClient({ initialPatients }: AnalysisClientProps) {
  // const { addNotification } = useUIStore(); // Use if needed
  const { getToken } = useAuth(); // Clerk hook for token
  const [patients, setPatients] = useState<PatientSummary[]>(initialPatients);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  // State to hold full patient details when selected
  const [currentPatientDetails, setCurrentPatientDetails] = useState<Patient | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
  const [errorLoadingDetails, setErrorLoadingDetails] = useState<string | null>(null);

  // Effect to fetch full patient details when selectedPatientId changes
  useEffect(() => {
    const fetchDetails = async () => {
      if (!selectedPatientId) {
        setCurrentPatientDetails(null);
        setErrorLoadingDetails(null);
        return;
      }

      setIsLoadingDetails(true);
      setErrorLoadingDetails(null);
      setCurrentPatientDetails(null); // Clear previous details

      try {
        // Fetch full patient details using the service
        // getPatientById now uses server-side token helper by default.
        // If this component needs a specific token (e.g., passed from parent), adjust service.
        // For now, assume getPatientById works correctly when called client-side (may need review).
        const details = await getPatientById(selectedPatientId);
        if (details) {
             setCurrentPatientDetails(details);
        } else {
             // Handle case where patient exists in list but details fetch fails (e.g., 404, 403)
             throw new Error("Paciente não encontrado ou acesso negado.");
        }
       
      } catch (error) {
        console.error("Failed to fetch patient details:", error);
        setErrorLoadingDetails(error instanceof Error ? error.message : "Falha ao carregar detalhes do paciente.");
        // addNotification({ message: "Failed to load patient details", type: "error" });
      } finally {
        setIsLoadingDetails(false);
      }
    };

    fetchDetails();
  }, [selectedPatientId, getToken]); // Re-run if selected ID or token changes

  
  // Use detailed data if available, otherwise null
  const displayPatient = currentPatientDetails;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Selecionar Paciente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {patients.length > 0 ? (
            <>
              <div className="flex flex-col gap-1.5">
                <label 
                  htmlFor="patientSelect" 
                  className="text-sm font-medium text-foreground"
                >
                  Paciente (opcional)
                </label>
                {/* Use selectedPatientId state for Select value */}
                <Select value={selectedPatientId || ''} onValueChange={v => setSelectedPatientId(v === '' ? null : v)}>
                  <SelectTrigger id="patientSelect" className="w-full">
                    <SelectValue placeholder="Análise anônima (sem paciente)" />
                  </SelectTrigger>
                  <SelectContent>
                    
                    {patients.map((patient) => (
                      <SelectItem key={patient.patient_id} value={patient.patient_id.toString()}>{patient.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* File upload uses the selected ID */}
              <FileUploadComponent patientId={selectedPatientId || null} /> 
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">Nenhum paciente associado encontrado. Use a análise rápida anônima abaixo:</p>
              <FileUploadComponent patientId={null} />
            </div>
          )}
        </CardContent>
      </Card>
      
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>
            {/* Adjust title based on loading/selected state */}
            {selectedPatientId 
              ? (isLoadingDetails ? 'Carregando...' : (displayPatient ? `Exames de ${displayPatient.name}` : 'Erro ao carregar'))
              : 'Selecione um paciente ou faça upload anônimo'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingDetails ? (
            <div className="text-center py-12 text-muted-foreground">Carregando detalhes do paciente...</div>
          ) : errorLoadingDetails ? (
            <div className="text-center py-12 text-destructive">{errorLoadingDetails}</div>
          ) : displayPatient && displayPatient.exams && displayPatient.exams.length > 0 ? (
             <div className="space-y-4">
                 {/* Render exam table based on assumed structure */}
                 <table className="w-full text-sm border-collapse">
                   <thead className="border-b">
                     <tr className="border-b">
                       <th className="py-2 px-3 text-left font-medium text-muted-foreground">Data</th>
                       <th className="py-2 px-3 text-left font-medium text-muted-foreground">Resultados</th>
                     </tr>
                   </thead>
                   <tbody>
                     {displayPatient.exams.map((exam, index) => (
                       <tr key={exam.exam_id || index} className="border-b hover:bg-muted/50">
                         <td className="py-2 px-3">{exam.exam_timestamp ? new Date(exam.exam_timestamp).toLocaleDateString() : 'N/A'}</td>
                         <td className="py-2 px-3">{Array.isArray(exam.lab_results) ? exam.lab_results.length : 0}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>           
             </div>
          ) : displayPatient ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Nenhum exame encontrado para este paciente</p>
              <p className="text-sm text-muted-foreground">
                Faça upload de um exame para começar a análise
              </p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                {selectedPatientId 
                    ? 'Erro ao carregar detalhes.' // Should be caught by errorLoadingDetails state
                    : 'Selecione um paciente ou faça upload para análise anônima'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 