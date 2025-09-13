'use client';

import React, { useState } from 'react';
import { GroupInvitationCreate } from '@/types/groupInvitation';
import { createGroupInvitation } from '@/services/groupInvitationService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { UserPlus } from 'lucide-react';

interface InvitationFormProps {
  groupId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const InvitationForm: React.FC<InvitationFormProps> = ({ groupId, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    email: '',
    role: 'member',
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (name: string, value: string) => {
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
      const invitationData: GroupInvitationCreate = {
        group_id: groupId,
        email: formData.email,
        role: formData.role,
      };
      
      await createGroupInvitation(invitationData);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError('Failed to send invitation');
      console.error('Error sending invitation:', err);
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
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            required
            placeholder="Enter email address"
          />
        </div>
        
        <div>
          <Label htmlFor="role">Role</Label>
          <Select 
            value={formData.role} 
            onValueChange={(value) => handleChange('role', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          {loading ? 'Sending...' : 'Send Invitation'}
        </Button>
      </div>
    </form>
  );
};