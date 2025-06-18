'use client';

import React, { useMemo } from 'react';
import { useParams } from 'next/navigation'; // Use App Router hook
import { usePatientStore } from '@/store/patientStore';
import ResultsTimelineChart from '@/components/charts/ResultsTimelineChart';
// import ResultsTimelineComparison from '@/components/charts/ResultsTimelineComparison'; // Commented out
import SystemExamsViewer from '@/components/SystemExamsViewer';
import AIChat from '@/components/patients/AIChat';
import { Switch } from "@/components/ui/Switch"; // Corrected casing
import { Label } from "@/components/ui/Label";

export default function PatientChartsPage({ params }: { params: { id: string } }) {
  const patientId = params.id as string;
  const { getPatient } = usePatientStore();
  const patient = getPatient(Number(patientId));

  const [compareMode, setCompareMode] = React.useState(false);
  // const [selectedChart, setSelectedChart] = React.useState<string>('overview'); // Not used

  // Calculate flattened lab results using useMemo
  const allLabResults = useMemo(() => {
    if (!patient || !patient.exams) return [];
    return patient.exams.flatMap(exam => exam.lab_results || []);
  }, [patient]); // Remove patient?.exams from dependency array

  // Loading state handled by layout
  if (!patient) {
    return null; 
  }

  return (
    <div className="space-y-6">
      {/* <h1 className="text-xl font-bold">Visualização Gráfica</h1> */}
      
      <div className="flex items-center space-x-2 mt-4 mb-4">
        <Switch 
          id="compare-mode-charts"
          checked={compareMode}
          onCheckedChange={setCompareMode}
        />
        <Label htmlFor="compare-mode-charts">Comparar Exames</Label>
      </div>

      {/* Conditional rendering based on compareMode */}
      {/* {compareMode ? (
        <ResultsTimelineComparison exams={patient.exams} />
      ) : ( */} 
      <ResultsTimelineChart 
        results={allLabResults} 
        title="Evolução Laboratorial (Último Exame)" 
      />
      {/* )} */}

      {/* Display results by system for context? */}
      <SystemExamsViewer patientId={Number(patientId)} />

      <div className="mt-8">
        <AIChat patientId={patientId} />
      </div>
    </div>
  );
} 