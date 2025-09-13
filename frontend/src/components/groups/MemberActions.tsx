'use client';

import React, { useState } from 'react';
import { GroupMembership } from '@/types/group';
import { removeUserFromGroup } from '@/services/groupService';
import { Button } from '@/components/ui/Button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/AlertDialog';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Trash2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface MemberActionsProps {
  groupId: number;
  member: GroupMembership;
  onAction?: () => void;
}

export const MemberActions: React.FC<MemberActionsProps> = ({ groupId, member, onAction }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemoveMember = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await removeUserFromGroup(groupId, member.user_id);
      if (onAction) onAction();
    } catch (err) {
      setError('Failed to remove member');
      console.error('Error removing member:', err);
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
                Remover Membro
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover Membro</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja remover este membro do grupo? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRemoveMember} disabled={loading}>
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