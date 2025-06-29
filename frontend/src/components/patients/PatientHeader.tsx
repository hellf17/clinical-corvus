import React from 'react';
import { Patient } from '@/types/patient';

function calculateAge(birthDate?: string) {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function PatientHeader({ patient }: { patient: Patient }) {
  const age = calculateAge(patient.birthDate || patient.dateOfBirth);
  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between p-4 border-b bg-muted/30 rounded-t-lg">
      <div>
        <h2 className="text-xl font-bold">{patient.name}</h2>
        <div className="text-sm text-muted-foreground">
          {age !== null && <span>{age} anos</span>}
          {patient.gender && <span> &middot; {patient.gender === 'male' ? 'Masculino' : patient.gender === 'female' ? 'Feminino' : 'Outro'}</span>}
          {patient.primary_diagnosis && <span> &middot; {patient.primary_diagnosis}</span>}
        </div>
        {patient.admissionDate && (
          <div className="text-xs text-muted-foreground mt-1">Admitido em: {new Date(patient.admissionDate).toLocaleDateString()}</div>
        )}
      </div>
      {patient.patient_id && (
        <div className="mt-2 md:mt-0 text-xs text-muted-foreground">ID: {patient.patient_id}</div>
      )}
    </header>
  );
} 