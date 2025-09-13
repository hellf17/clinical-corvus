'use client';

import React, { useState } from 'react';
import { GroupMembership, GroupRole } from '@/types/group';
import { updateGroupMemberRole } from '@/services/groupService';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Crown, User } from 'lucide-react';

interface MemberRoleManagerProps {
  groupId: number;
  member: GroupMembership;
  onRoleChange?: () => void;
}

export const MemberRoleManager: React.FC<MemberRoleManagerProps> = ({ groupId, member, onRoleChange }) => {
  const [role, setRole] = useState<GroupRole>(member.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRoleChange = async (newRole: GroupRole) => {
    if (newRole === member.role) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await updateGroupMemberRole(groupId, member.user_id, { role: newRole });
      setRole(newRole);
      if (onRoleChange) onRoleChange();
    } catch (err) {
      setError('Failed to update member role');
      console.error('Error updating member role:', err);
      // Reset to previous role on error
      setRole(member.role);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Select 
        value={role} 
        onValueChange={handleRoleChange}
        disabled={loading}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue>
            <div className="flex items-center gap-1">
              {role === 'admin' ? (
                <>
                  <Crown className="h-4 w-4" />
                  Administrador
                </>
              ) : (
                <>
                  <User className="h-4 w-4" />
                  Membro
                </>
              )}
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="member">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4" />
              Membro
            </div>
          </SelectItem>
          <SelectItem value="admin">
            <div className="flex items-center gap-1">
              <Crown className="h-4 w-4" />
              Administrador
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};