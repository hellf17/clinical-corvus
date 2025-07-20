'use client';

import React, { useState, useCallback } from 'react';
import { useParams } from 'next/navigation'; // Use App Router hook
import { usePatientStore } from '@/store/patientStore';
import { ExamResultsDashboard } from '@/components/ExamResultsDashboard';
import SystemExamsViewer from '@/components/SystemExamsViewer';
import AIChat from '@/components/patients/AIChat';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { PlusCircle } from 'lucide-react';
import { ManualLabEntryForm } from '@/components/patients/ManualLabEntryForm';

// Updated LabResultsDisplay to use ExamResultsDashboard
const LabResultsDisplay = ({ patientId, refreshKey }: { patientId: number, refreshKey: number }) => {
  // Pass patientId and use refreshKey to force re-fetch when needed
  // ExamResultsDashboard fetches its own data via useEffect triggered by patientId or refreshKey change
  return <ExamResultsDashboard key={refreshKey} patientId={patientId} />;
};

export default function PatientLabsPage() {
  const params = useParams();
  const patientId = parseInt(params.id as string, 10);
  const { getPatient } = usePatientStore();
  const patient = getPatient(patientId);

  // State to trigger refresh of the display component
  const [refreshKey, setRefreshKey] = useState(0);

  // Callback to increment the refresh key, triggering a re-render/re-fetch
  const handleRefreshResults = useCallback(() => {
      console.log("Refreshing lab results display...");
      setRefreshKey(prevKey => prevKey + 1);
      // Optionally show a toast confirmation here as well
  }, []);

  // Loading state handled by layout
  if (!patient) {
    return null;
  }

  if (isNaN(patientId)) {
    return (
        <Card className="mt-4">
             <CardHeader><CardTitle>Erro</CardTitle></CardHeader>
             <CardContent><p className="text-destructive">ID de paciente inválido na URL.</p></CardContent>
         </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Resultados Laboratoriais</h1>
      
      {/* Form to add results manually */}
      <ManualLabEntryForm patientId={patientId} onResultAdded={handleRefreshResults} />

      {/* Display existing lab results */} 
      {/* Pass refreshKey to the display component */}
      <LabResultsDisplay patientId={patientId} refreshKey={refreshKey} />

      <div className="mt-8">
        <AIChat patientId={String(patientId)} />
      </div>

      <SystemExamsViewer patientId={patientId} />
    </div>
  );
} 