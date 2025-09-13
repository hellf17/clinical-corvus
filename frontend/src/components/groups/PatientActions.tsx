'use client';

import React, { useState } from 'react';
import { removePatientFromGroup } from '@/services/groupService';
import { Button } from '@/components/ui/Button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/AlertDialog';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Trash2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface PatientActionsProps {
  groupId: number;
  patientId: number;
  onAction?: () => void;
}

export const PatientActions: React.FC<PatientActionsProps> = ({ groupId, patientId, onAction }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemovePatient = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await removePatientFromGroup(groupId, patientId);
      if (onAction) onAction();
    } catch (err) {
      setError('Failed to remove patient from group');
      console.error('Error removing patient:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                <Trash2 className="h-4 w-4 mr-2" />
                Remover Paciente
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover Paciente</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover este paciente do grupo? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemovePatient} disabled={loading}>
                  {loading ? 'Removendo...' : 'Remover'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};