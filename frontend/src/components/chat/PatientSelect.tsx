'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';
import { usePatientStore } from '@/store/patientStore';

interface PatientSelectProps {
  onSelect: (patientId: string | null) => void;
  selectedPatientId: string | null;
}

const PatientSelect: React.FC<PatientSelectProps> = ({ onSelect, selectedPatientId }) => {
  const { patients, isLoading } = usePatientStore();
  const [localSelectedPatientId, setLocalSelectedPatientId] = useState<string>('');

  const handleSelectChange = (patientId: string) => {
    setLocalSelectedPatientId(patientId);
  };

  const handleApplyPatient = () => {
    if (localSelectedPatientId === 'todos') {
      onSelect(null);
    } else if (localSelectedPatientId) {
      onSelect(localSelectedPatientId);
    }
  };

  const handleClearPatient = () => {
    setLocalSelectedPatientId('');
    onSelect(null);
  };

  if (isLoading) {
    return <div className="text-sm text-gray-600">Carregando pacientes...</div>;
  }

  return (
    <div className="patient-select flex items-center gap-2">
      <Select
        value={localSelectedPatientId}
        onValueChange={handleSelectChange}
        data-testid="patient-select"
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Todos os Pacientes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos os Pacientes</SelectItem>
          {patients.map(patient => (
            <SelectItem key={patient.patient_id} value={String(patient.patient_id)}>
              {patient.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Button
        onClick={handleApplyPatient}
        disabled={!localSelectedPatientId}
        size="sm"
        variant="outline"
        data-testid="apply-patient-button"
      >
        Aplicar
      </Button>
      
      {selectedPatientId && (
        <Button
          onClick={handleClearPatient}
          size="sm"
          variant="ghost"
          className="text-xs"
        >
          Limpar
        </Button>
      )}
    </div>
  );
};

export default PatientSelect;