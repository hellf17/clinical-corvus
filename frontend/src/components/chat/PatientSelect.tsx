'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { usePatientStore } from '@/store/patientStore';

interface PatientSelectProps {
  onSelect: (patientId: string) => void;
}

const PatientSelect: React.FC<PatientSelectProps> = ({ onSelect }) => {
  const { patients, isLoading } = usePatientStore();
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const patientId = e.target.value;
    setSelectedPatientId(patientId);
  };

  const handleApplyPatient = () => {
    if (selectedPatientId) {
      onSelect(selectedPatientId);
    }
  };

  if (isLoading) {
    return <div>Carregando pacientes...</div>;
  }

  return (
    <div className="patient-select">
      <Select
        value={selectedPatientId}
        onValueChange={setSelectedPatientId}
        data-testid="patient-select"
      >
        <SelectTrigger className="patient-dropdown">
          <SelectValue placeholder="Selecione um paciente" />
        </SelectTrigger>
        <SelectContent>
          {patients.map(patient => (
            <SelectItem key={patient.patient_id} value={String(patient.patient_id)}>
              {patient.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button 
        onClick={handleApplyPatient}
        disabled={!selectedPatientId}
        data-testid="apply-patient-button"
      >
        Aplicar
      </Button>
    </div>
  );
};

export default PatientSelect; 