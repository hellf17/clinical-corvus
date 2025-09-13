'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GroupWithMembersAndPatients } from '@/types/group';
import { getGroup } from '@/services/groupService';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { MemberList } from './MemberList';
import { PatientAssignmentList } from './PatientAssignmentList';
import { Button } from '@/components/ui/Button';
import { Edit, Users, UserPlus, FileText } from 'lucide-react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import { useAuth } from '@clerk/nextjs';
import { canUserManageGroup } from '@/utils/groupPermissions';

interface GroupDetailProps {
  groupId: number;
  onEdit?: () => void;
}

export const GroupDetail: React.FC<GroupDetailProps> = ({ groupId, onEdit }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [group, setGroup] = useState<GroupWithMembersAndPatients | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroup = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const groupData = await getGroup(groupId);
      setGroup(groupData);
    } catch (err) {
      setError('Failed to load group details');
      console.error('Error fetching group:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [groupId, fetchGroup]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!group) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Grupo não encontrado</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
          {group.description && (
            <p className="text-gray-600 dark:text-gray-300 mt-1">{group.description}</p>
          )}
        </div>
        {onEdit && user && canUserManageGroup(group.members.filter(m => m.user_id === Number(user.id)), group.id) && (
          <Button onClick={onEdit} className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Editar Grupo
          </Button>
        )}
      </div>

      <Tabs defaultValue="members" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Membros ({group.members.length})
          </TabsTrigger>
          <TabsTrigger value="patients" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pacientes ({group.patients.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="members" className="mt-6">
          <MemberList
            groupId={group.id}
            members={group.members}
            onMemberAction={fetchGroup}
            currentUserMemberships={user ? group.members.filter(m => m.user_id === Number(user.id)) : []}
          />
        </TabsContent>
        
        <TabsContent value="patients" className="mt-6">
          <PatientAssignmentList 
            groupId={group.id} 
            patients={group.patients} 
            onPatientAction={fetchGroup}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};