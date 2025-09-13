'use client';

import React, { useState } from 'react';
import { GroupMembershipCreate, GroupRole } from '@/types/group';
import { inviteUserToGroup } from '@/services/groupService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { UserPlus } from 'lucide-react';

interface MemberInviteFormProps {
  groupId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const MemberInviteForm: React.FC<MemberInviteFormProps> = ({ groupId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    user_id: 0,
    role: 'member' as GroupRole,
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (name: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const inviteData: GroupMembershipCreate = {
        user_id: formData.user_id,
        role: formData.role,
      };
      
      await inviteUserToGroup(groupId, inviteData);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError('Failed to invite member');
      console.error('Error inviting member:', err);
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
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="user_id">ID do Usuário *</Label>
          <Input
            id="user_id"
            type="number"
            value={formData.user_id || ''}
            onChange={(e) => handleChange('user_id', parseInt(e.target.value) || 0)}
            required
            placeholder="ID do usuário"
          />
        </div>
        
        <div>
          <Label htmlFor="role">Função</Label>
          <Select 
            value={formData.role} 
            onValueChange={(value) => handleChange('role', value as GroupRole)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Membro</SelectItem>
              <SelectItem value="admin">Administrador</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          {loading ? 'Convidando...' : 'Convidar Membro'}
        </Button>
      </div>
    </form>
  );
};