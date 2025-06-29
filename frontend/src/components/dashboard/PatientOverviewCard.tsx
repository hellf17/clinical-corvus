'use client'; // Mark as client component

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { User, AlertCircle, CalendarClock, Pill } from 'lucide-react';
import { Patient } from '@/types/patient'; // Use type from types directory
import { Skeleton } from '@/components/ui/Skeleton';
import { Alert, AlertDescription } from "@/components/ui/Alert"; // Import Alert for errors
import { MedicationStatus } from '@/types/enums'; // Correct import path for enum

interface PatientOverviewCardProps {
  patient: Patient;
}

export default function PatientOverviewCard({ patient }: PatientOverviewCardProps) {
  // Using placeholders for now.
  const nextAppointment = "Amanhã, 10:00 - Dr. André"; // Placeholder
  const recentAlert = "Glicemia levemente alta no último exame"; // Placeholder
  // Filter active medications using the enum
  const currentMedications = patient?.medications?.filter(
      m => m.status === MedicationStatus.ACTIVE
  ) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <User className="mr-2 h-5 w-5 text-primary" />
          {`Resumo Rápido: ${patient?.name}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm flex items-center">
            <CalendarClock className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="font-medium text-muted-foreground mr-1">Próx. Consulta:</span>
            <span className="truncate">{nextAppointment || 'Nenhuma agendada'}</span>
        </div>
        <div className="text-sm flex items-center">
            <AlertCircle className="mr-2 h-4 w-4 text-yellow-500 flex-shrink-0" />
            <span className="font-medium text-muted-foreground mr-1">Alerta Recente:</span>
            <span className="truncate">{recentAlert || 'Nenhum'}</span>
        </div>
        <div className="text-sm flex items-start"> {/* Align items start */} 
            <Pill className="mr-2 h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <span className="font-medium text-muted-foreground mr-1 whitespace-nowrap">Medicação:</span>
             {/* Use actual medication data if available in patientData */} 
             {currentMedications.length > 0 ? (
                 <span className="leading-snug">
                     {currentMedications.map(m => m.name).join(', ')}
                 </span>
             ) : (
                 <span className="italic">Nenhuma medicação ativa</span> 
             )}
        </div>
         {/* Add more fields as needed */}
      </CardContent>
    </Card>
  );
} 