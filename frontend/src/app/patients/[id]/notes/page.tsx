'use client';

import React from 'react';
import { useParams } from 'next/navigation'; // Use App Router hook
import ClinicalNotes from '@/components/patients/ClinicalNotes';
import AIChat from '@/components/patients/AIChat';

export default function PatientNotesPage() {
  const params = useParams();
  const patientId = params.id as string;

  if (!patientId) {
    // This case should ideally be handled by the layout or middleware
    return <div>Carregando ID do paciente...</div>; 
  }

  return (
    <div className="space-y-6">
      {/* Title might be redundant if included in layout/header */}
      {/* <h1 className="text-xl font-bold">Notas Clínicas</h1> */}
      <ClinicalNotes patientId={patientId} />
      
      {/* Chat section */}
      {/* Consider if chat should be part of the layout or specific pages */}
      <div className="mt-8">
        <AIChat patientId={patientId} />
      </div>
    </div>
  );
} 