'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Patient, Exam } from '@/store/patientStore';
import { VitalSign } from '@/types/health';

// Format date helper
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

// Calculate age based on date of birth
const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Gender icon component
const GenderIcon = ({ gender }: { gender: string }) => {
  if (gender === 'male') return <span className="text-primary">♂</span>;
  if (gender === 'female') return <span className="text-muted-foreground">♀</span>;
  return <span className="text-muted-foreground">⚪</span>;
};

// Placeholder components
const PatientExams = ({ exams }: { exams: Exam[] }) => {
  // Ensure exams is an array with a default empty array
  const safeExams = Array.isArray(exams) ? exams : [];
  
  if (safeExams.length === 0) {
    return <p className="text-muted-foreground italic">Nenhum exame registrado</p>;
  }
  
  return (
    <div className="space-y-2">
      <h3 className="font-medium">Exames ({safeExams.length})</h3>
      <ul className="list-disc list-inside space-y-1">
        {safeExams.slice(0, 3).map(exam => (
          <li key={exam.exam_id} className="text-sm">
            {(exam.exam_type_name || exam.type)} - {formatDate(exam.exam_timestamp)}
          </li>
        ))}
        {safeExams.length > 3 && <li className="text-sm text-muted-foreground">+ {safeExams.length - 3} mais exames...</li>}
      </ul>
    </div>
  );
};

const VitalSigns = ({ vitalSigns }: { vitalSigns: VitalSign[] }) => {
  // Ensure vitalSigns is an array with a default empty array
  const safeVitalSigns = Array.isArray(vitalSigns) ? vitalSigns : [];
  
  if (safeVitalSigns.length === 0) {
    return <p className="text-foreground italic">Nenhum sinal vital registrado</p>;
  }
  
  // Get most recent vital signs
  const latestVitalSigns = [...safeVitalSigns].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )[0];
  
  return (
    <div className="space-y-2">
      <h3 className="font-medium">Sinais Vitais (mais recente: {formatDate(latestVitalSigns.timestamp)})</h3>
      <div className="grid grid-cols-2 gap-2 text-sm">
        {latestVitalSigns.temperature_c && (
          <div>
            <span className="font-medium">Temp:</span> {latestVitalSigns.temperature_c}°C
          </div>
        )}
        {latestVitalSigns.heart_rate && (
          <div>
            <span className="font-medium">FC:</span> {latestVitalSigns.heart_rate} bpm
          </div>
        )}
        {(latestVitalSigns.systolic_bp && latestVitalSigns.diastolic_bp) && (
          <div>
            <span className="font-medium">PA:</span> {latestVitalSigns.systolic_bp}/{latestVitalSigns.diastolic_bp} mmHg
          </div>
        )}
        {latestVitalSigns.oxygen_saturation && (
          <div>
            <span className="font-medium">SpO2:</span> {latestVitalSigns.oxygen_saturation}%
          </div>
        )}
      </div>
    </div>
  );
};

interface PatientCardProps {
  patient: Patient;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, onDelete, onSelect }) => {
  // Access vital signs correctly (it's an array of VitalSign)
  const latestVital = patient.vitalSigns?.length > 0 
    ? patient.vitalSigns.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
    : null;

  // Calculate age if missing, using correct property name
  const age = patient.age || calculateAge(patient.birthDate);

  return (
    <Card 
      className="w-full hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect(String(patient.patient_id))}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-1">
          <GenderIcon gender={patient.gender} />
          {patient.name} <span className="text-sm font-normal text-foreground">({age} anos)</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pb-4 space-y-3">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <div>
            <span className="font-medium">Nascimento:</span> {formatDate(patient.birthDate)}
          </div>
          
          {patient.admissionDate && (
            <div>
              <span className="font-medium">Internação:</span> {formatDate(patient.admissionDate)}
            </div>
          )}
          
          {patient.medicalRecord && (
            <div>
              <span className="font-medium">Prontuário:</span> {patient.medicalRecord}
            </div>
          )}
          
          {patient.hospital && (
            <div>
              <span className="font-medium">Hospital:</span> {patient.hospital}
            </div>
          )}
        </div>
        
        {/* Clinical Information */}
        <div className="space-y-2 mt-4 border-primary">
          {patient.anamnesis && (
            <div>
              <h3 className="font-medium">Anamnese</h3>
              <p className="text-sm line-clamp-2">{patient.anamnesis}</p>
            </div>
          )}
          
          {patient.physicalExamFindings && (
            <div>
              <h3 className="font-medium">Exame Físico</h3>
              <p className="text-sm line-clamp-2">{patient.physicalExamFindings}</p>
            </div>
          )}
          
          {patient.diagnosticHypotheses && (
            <div>
              <h3 className="font-medium">Hipóteses Diagnósticas</h3>
              <p className="text-sm line-clamp-2">{patient.diagnosticHypotheses}</p>
            </div>
          )}
        </div>
        
        {/* Exams and Vital Signs */}
        <div className="grid md:grid-cols-2 gap-4 mt-4 border-primary">
          <VitalSigns vitalSigns={patient.vitalSigns} />
          <PatientExams exams={patient.exams} />
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(String(patient.patient_id));
          }}
        >
          Ver Detalhes
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(String(patient.patient_id));
          }}
        >
          Excluir
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PatientCard; 