'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MemberList } from '@/components/groups/MemberList';
import { MemberInviteForm } from '@/components/groups/MemberInviteForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Plus, Users } from 'lucide-react';
import { GroupMembership } from '@/types/group';
import { listGroupMembers } from '@/services/groupService';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useAuth } from '@clerk/nextjs';
import { canUserInviteMembers } from '@/utils/groupPermissions';

export default function GroupMembersPage({ params }: { params: { id: string } }) {
  const { getToken } = useAuth();
  const groupId = parseInt(params.id);
  const [members, setMembers] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [currentUserIdDb, setCurrentUserIdDb] = useState<number | null>(null);

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listGroupMembers(groupId);
      setMembers(response.items);
    } catch (err) {
      setError('Failed to load group members');
      console.error('Error fetching group members:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!isNaN(groupId)) {
      fetchMembers();
    }
  }, [groupId, fetchMembers]);

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

  const handleMemberAction = () => {
    fetchMembers();
    setShowInviteForm(false);
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

  // Compute client-side admin capability
  const currentUserMemberships = currentUserIdDb
    ? members.filter(m => m.user_id === currentUserIdDb)
    : [];

  const canInvite = canUserInviteMembers(currentUserMemberships, groupId);

  return (
    <div className="mt-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gerenciar Membros</h2>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Adicione ou remova membros do grupo
          </p>
        </div>
        {canInvite && (
          <Button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Convidar Membro
          </Button>
        )}
      </div>

      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle>Convidar Novo Membro</CardTitle>
          </CardHeader>
          <CardContent>
            <MemberInviteForm 
              groupId={groupId} 
              onSuccess={handleMemberAction} 
              onCancel={() => setShowInviteForm(false)} 
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
              <Users className="h-5 w-5" />
              Membros do Grupo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MemberList
              groupId={groupId}
              members={members}
              onMemberAction={handleMemberAction}
              currentUserMemberships={currentUserMemberships}
              currentUserIdDb={currentUserIdDb ?? undefined}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
