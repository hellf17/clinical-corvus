'use client';

import React, { useEffect } from 'react';
import { usePatientStore } from '@/store/patientStore';
import { useParams } from 'next/navigation';

// This page might just redirect to the overview sub-page or display a summary.

export default function PatientDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { patients, selectedPatientId, getPatient } = usePatientStore();
  
  // Get the patient object using the ID (convert string ID from params to number for getPatient)
  const patient = getPatient(Number(id));

  // Fetch patient details using the store or API
  // Currently, this might be redundant if the layout fetches the data
  useEffect(() => {
    if (id && !selectedPatientId) {
      // fetchPatient(id);
    }
  }, [id, selectedPatientId]);

  if (!patient) {
    return <div className="p-4 text-center">Paciente não encontrado...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Resumo do Paciente (App Router)</h1>
      <div className="bg-card text-card-foreground p-4 rounded shadow">
        <div className="font-semibold">Nome: {patient.name}</div>
        <div className="font-semibold">ID: {patient.patient_id}</div>
        {patient.primary_diagnosis && (
          <div>Diagnóstico: {patient.primary_diagnosis}</div>
        )}
      </div>
      <p className="text-muted-foreground">
        Este é o ponto de entrada para o paciente ID: {id}. O conteúdo detalhado estará nas sub-rotas (Notas, Medicações, etc.). 
        Considere redirecionar para `/patients/${id}/overview` ou usar este espaço para um resumo diferente.
      </p>
    </div>
  );
} 