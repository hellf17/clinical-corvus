'use client';

import React, { useState } from 'react';
import { GroupCreate, GroupUpdate, Group } from '@/types/group';
import { createGroup, updateGroup } from '@/services/groupService';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';

interface GroupFormProps {
  group?: Group;
  onSuccess?: (group: Group) => void;
  onCancel?: () => void;
}

export const GroupForm: React.FC<GroupFormProps> = ({ group, onSuccess, onCancel }) => {
  const { getToken } = useAuth();
  const [formData, setFormData] = useState<GroupCreate>({
    name: group?.name || '',
    description: group?.description || '',
    max_patients: group?.max_patients || 20, // Default to 20 patients
    max_members: group?.max_members || 10, // Default to 10 doctors
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'max_patients' || name === 'max_members' ? parseInt(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    
        try {
          
    
          let result: Group;
          
          if (group) {
            // Update existing group
            const updateData: GroupUpdate = {
              name: formData.name,
              description: formData.description,
              // Don't update limits for existing groups
            };
            result = await updateGroup(group.id, updateData);
          } else {
            // Create new group with default limits
            const createData: GroupCreate = {
              name: formData.name,
              description: formData.description,
              max_patients: 20, // Default limit
              max_members: 10,  // Default limit
            };
            result = await createGroup(createData);
          }
          
          if (onSuccess) {
            onSuccess(result);
          } else {
            router.push(`/dashboard-doctor/groups/${result.id}`);
          }
        } catch (err) {
          setError('Failed to save group');
          console.error('Error saving group:', err);
        } finally {
          setLoading(false);
        }
      };
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nome do Grupo *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            placeholder="Nome do grupo"
          />
        </div>
        
        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Descrição do grupo"
            rows={3}
          />
        </div>
        
        {/* Hidden fields with default values */}
        <input
          type="hidden"
          name="max_patients"
          value={formData.max_patients}
        />
        <input
          type="hidden"
          name="max_members"
          value={formData.max_members}
        />
      </div>
      
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? 'Salvando...' : (group ? 'Atualizar Grupo' : 'Criar Grupo')}
        </Button>
      </div>
    </form>
  );
};