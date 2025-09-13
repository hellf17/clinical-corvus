'use client';

import React, { useState } from 'react';
import { GroupPatient } from '@/types/group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FileText, Plus } from 'lucide-react';
import { PatientAssignmentForm } from './PatientAssignmentForm';
import { PatientActions } from './PatientActions';

interface PatientAssignmentListProps {
  groupId: number;
  patients: GroupPatient[];
  onPatientAction?: () => void;
}

export const PatientAssignmentList: React.FC<PatientAssignmentListProps> = ({ groupId, patients, onPatientAction }) => {
  const [showAssignForm, setShowAssignForm] = useState(false);

  const handleAssignSuccess = () => {
    setShowAssignForm(false);
    if (onPatientAction) onPatientAction();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <CardTitle>Pacientes do Grupo</CardTitle>
        <Button onClick={() => setShowAssignForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Paciente
        </Button>
      </div>

      {showAssignForm && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Paciente ao Grupo</CardTitle>
          </CardHeader>
          <CardContent>
            <PatientAssignmentForm 
              groupId={groupId} 
              onSuccess={handleAssignSuccess} 
              onCancel={() => setShowAssignForm(false)} 
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {patients.map((assignment) => (
          <Card key={assignment.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full p-2">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium">Paciente #{assignment.patient_id}</div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Adicionado em {new Date(assignment.assigned_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                
                <PatientActions 
                  groupId={groupId} 
                  patientId={assignment.patient_id} 
                  onAction={onPatientAction}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        
        {patients.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Nenhum paciente atribuído ao grupo ainda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};