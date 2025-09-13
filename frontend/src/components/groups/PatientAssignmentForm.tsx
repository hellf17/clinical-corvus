'use client';

import React, { useState } from 'react';
import { GroupPatientCreate } from '@/types/group';
import { assignPatientToGroup } from '@/services/groupService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { FileText } from 'lucide-react';

interface PatientAssignmentFormProps {
  groupId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const PatientAssignmentForm: React.FC<PatientAssignmentFormProps> = ({ groupId, onSuccess, onCancel }) => {
  const [patientId, setPatientId] = useState<number>(0);
 const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const assignmentData: GroupPatientCreate = {
        patient_id: patientId,
      };
      
      await assignPatientToGroup(groupId, assignmentData);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError('Failed to assign patient to group');
      console.error('Error assigning patient:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div>
        <Label htmlFor="patient_id">ID do Paciente *</Label>
        <Input
          id="patient_id"
          type="number"
          value={patientId || ''}
          onChange={(e) => setPatientId(parseInt(e.target.value) || 0)}
          required
          placeholder="ID do paciente"
        />
      </div>
      
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          {loading ? 'Adicionando...' : 'Adicionar Paciente'}
        </Button>
      </div>
    </form>
  );
};