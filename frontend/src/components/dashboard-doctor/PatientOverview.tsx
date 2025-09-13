'use client';

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Patient } from '@/types/patient';
import { User, Calendar, HeartPulse, Stethoscope } from 'lucide-react';

interface PatientOverviewProps {
  patient: Patient;
}

const PatientOverview: React.FC<PatientOverviewProps> = ({ patient }) => {
  // Helper to calculate age from birthdate
  const getAge = (birthdate?: string) => {
    if (!birthdate) return 'N/A';
    const birth = new Date(birthdate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          {patient.name}
          {patient.user_id && (
            <Badge variant="default" className="ml-2">
              Ativo
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>Idade: {getAge(patient.birthDate)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Stethoscope className="h-4 w-4" />
            <span>Sexo: {patient.gender || 'N/A'}</span>
          </div>
          {(patient.primary_diagnosis || patient.secondary_diagnosis) && (
            <div className="flex items-center gap-1">
              <HeartPulse className="h-4 w-4" />
              <span>Diagnóstico: {patient.primary_diagnosis || patient.secondary_diagnosis}</span>
            </div>
          )}
        </div>
        {patient.diseaseHistory && (
          <div className="mt-2 text-xs text-muted-foreground">
            <span className="font-semibold">Observações:</span> {patient.diseaseHistory}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientOverview; 