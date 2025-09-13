'use client';

import React, { useState } from 'react';
import { GroupMembership } from '@/types/group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { UserPlus, Crown, User } from 'lucide-react';
import { MemberInviteForm } from './MemberInviteForm';
import { MemberRoleManager } from './MemberRoleManager';
import { MemberActions } from './MemberActions';
import { useUser } from '@clerk/nextjs';
import {
  isUserAdminOfGroup,
  canUserInviteMembers,
  canUserRemoveMembers,
  canUserChangeMemberRole
} from '@/utils/groupPermissions';

interface MemberListProps {
  groupId: number;
  members: GroupMembership[];
  onMemberAction?: () => void;
  currentUserMemberships?: GroupMembership[]; // Optional prop for current user's memberships
  currentUserIdDb?: number; // Optional DB user id for more accurate gating
}

export const MemberList: React.FC<MemberListProps> = ({ groupId, members, onMemberAction, currentUserMemberships, currentUserIdDb }) => {
  const { user } = useUser();
  const [showInviteForm, setShowInviteForm] = useState(false);
  
  // If currentUserMemberships is not provided, derive from members array
  const userMemberships = currentUserMemberships || (
    currentUserIdDb != null
      ? members.filter(m => m.user_id === currentUserIdDb)
      : members.filter(m => m.user_id === Number(user?.id))
  );

  // Check if current user can perform actions
  const canInvite = user ? canUserInviteMembers(userMemberships, groupId) : false;
  
  const handleInviteSuccess = () => {
    setShowInviteForm(false);
    if (onMemberAction) onMemberAction();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <CardTitle>Membros do Grupo</CardTitle>
        {canInvite && (
          <Button onClick={() => setShowInviteForm(true)} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Convidar Membro
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Nota: apenas administradores podem convidar membros ou gerenciar permissões do grupo.
      </p>

      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle>Convidar Novo Membro</CardTitle>
          </CardHeader>
          <CardContent>
            <MemberInviteForm 
              groupId={groupId} 
              onSuccess={handleInviteSuccess} 
              onCancel={() => setShowInviteForm(false)} 
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {members.map((member) => (
          <Card key={member.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-200 dark:bg-gray-700 rounded-full p-2">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Usuário #{member.user_id}</span>
                      {member.role === 'admin' ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          Administrador
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Membro
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Entrou em {new Date(member.joined_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {canUserChangeMemberRole(userMemberships, groupId, member.user_id, Number(user?.id) || 0) && (
                    <MemberRoleManager
                      groupId={groupId}
                      member={member}
                      onRoleChange={onMemberAction}
                    />
                  )}
                  {canUserRemoveMembers(userMemberships, groupId, member.user_id, Number(user?.id) || 0) && (
                    <MemberActions
                      groupId={groupId}
                      member={member}
                      onAction={onMemberAction}
                    />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {members.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              Nenhum membro no grupo ainda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
