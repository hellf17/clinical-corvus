'use client';

import React from 'react';
import { useParams } from 'next/navigation'; // Use App Router hook
import MedicationsTable from '@/components/patients/MedicationsTable';
import AIChat from '@/components/patients/AIChat';

export default function PatientMedicationsPage() {
  const params = useParams();
  const patientId = params.id as string;

  if (!patientId) {
    return <div>Carregando ID do paciente...</div>; 
  }

  return (
    <div className="space-y-6">
      {/* <h1 className="text-xl font-bold">Medicações</h1> */}
      <MedicationsTable patientId={patientId} />
      
      <div className="mt-8">
        <AIChat patientId={patientId} />
      </div>
    </div>
  );
} 