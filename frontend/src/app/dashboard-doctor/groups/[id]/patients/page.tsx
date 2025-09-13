'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { PatientAssignmentList } from '@/components/groups/PatientAssignmentList';
import { PatientAssignmentForm } from '@/components/groups/PatientAssignmentForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, FileText } from 'lucide-react';
import { GroupPatient, GroupMembership } from '@/types/group';
import { listGroupPatients, listGroupMembers } from '@/services/groupService';
import { canUserAssignPatients } from '@/utils/groupPermissions';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useAuth } from '@clerk/nextjs';

export default function GroupPatientsPage({ params }: { params: { id: string } }) {
  const { getToken } = useAuth();
  const groupId = parseInt(params.id);
  const [patients, setPatients] = useState<GroupPatient[]>([]);
  const [members, setMembers] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [currentUserIdDb, setCurrentUserIdDb] = useState<number | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listGroupPatients(groupId);
      setPatients(response.items);
    } catch (err) {
      setError('Failed to load group patients');
      console.error('Error fetching group patients:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!isNaN(groupId)) {
      fetchPatients();
    }
  }, [groupId, fetchPatients]);

  // Fetch members for permission checks
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const response = await listGroupMembers(groupId);
        setMembers(response.items);
      } catch (err) {
        console.warn('Failed to load group members for permission checks');
      }
    };
    if (!isNaN(groupId)) fetchMembers();
  }, [groupId]);

  // Fetch current DB user id via /api/me
  useEffect(() => {
    const loadMe = async () => {
      try {
        const res = await fetch('/api/me');
        if (res.ok) {
          const data = await res.json();
          if (data?.user?.user_id) setCurrentUserIdDb(data.user.user_id);
        }
      } catch (e) {
        console.warn('Failed to load current user info');
      }
    };
    loadMe();
  }, []);

  const handlePatientAction = () => {
    fetchPatients();
    setShowPatientSearch(false);
 };

  if (isNaN(groupId)) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          Grupo não encontrado.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gerenciar Pacientes</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Atribua ou remova pacientes do grupo
          </p>
        </div>
        {canUserAssignPatients(
          currentUserIdDb != null ? members.filter(m => m.user_id === currentUserIdDb) : [],
          groupId
        ) && (
          <Button 
            onClick={() => setShowPatientSearch(true)} 
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Atribuir Paciente
          </Button>
        )}
      </div>

      {showPatientSearch && (
        <Card>
          <CardHeader>
            <CardTitle>Atribuir Novo Paciente</CardTitle>
          </CardHeader>
          <CardContent>
            <PatientAssignmentForm
              groupId={groupId} 
              onSuccess={handlePatientAction} 
              onCancel={() => setShowPatientSearch(false)} 
            />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Spinner className="h-8 w-8" />
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Pacientes do Grupo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground mb-2">Nota: apenas administradores podem atribuir ou remover pacientes do grupo.</p>
            <PatientAssignmentList 
              groupId={groupId} 
              patients={patients} 
              onPatientAction={handlePatientAction}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
