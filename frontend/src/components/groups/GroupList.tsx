'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { GroupWithCounts } from '@/types/group';
import { listGroups } from '@/services/groupService';
import { GroupCard } from './GroupCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Search, Plus, Shield, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { useToast } from '@/hooks/use-toast';

interface GroupListProps {
  onCreateGroup?: () => void;
  selectedGroupId?: string;
  onGroupSelect?: (groupId: string) => void;
}

export const GroupList: React.FC<GroupListProps> = ({ onCreateGroup, selectedGroupId, onGroupSelect }) => {
  const [groups, setGroups] = useState<GroupWithCounts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listGroups(searchTerm || undefined);
      setGroups(response.items);
    } catch (err: any) {
      let errorMessage = err.response?.data?.error || 'Failed to load groups';
      
      // Handle specific authentication errors
      if (err.response?.status === 401) {
        errorMessage = 'Sua sessão expirou. Por favor, faça login novamente.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Você não tem permissão para acessar os grupos.';
      }
      
      setError(errorMessage);
      console.error('Error fetching groups:', err);
      
      // Show toast notification for error
      toast({
        title: "Erro ao carregar grupos",
        description: errorMessage,
        variant: "destructive",
      });
      
      // If it's an authentication error, redirect to login
      if (err.response?.status === 401) {
        setTimeout(() => {
          router.push('/sign-in');
        }, 3000);
      }
    } finally {
      setLoading(false);
    }
  }, [searchTerm, toast, router]);

  useEffect(() => {
    // Debounce search to avoid excessive API calls
    const timer = setTimeout(() => {
      fetchGroups();
    }, searchTerm ? 500 : 0); // 500ms delay for searches, immediate for initial load

    return () => clearTimeout(timer);
  }, [fetchGroups, searchTerm]);

  const handleCreateGroup = () => {
    try {
      if (onCreateGroup) {
        onCreateGroup();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create group';
      console.error('Error creating group:', err);
      
      // Show toast notification for error
      toast({
        title: "Erro ao criar grupo",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64" role="status" aria-label="Carregando grupos">
        <Spinner className="h-8 w-8" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Seus Grupos</h2>
        <Button
          onClick={handleCreateGroup}
          className="flex items-center gap-2 w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          aria-label="Criar novo grupo"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Criar Grupo
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Buscar grupos por nome ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full md:w-96 shadow-sm border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          aria-label="Buscar grupos"
        />
      </div>

      {error && (
        <Alert
          variant="destructive"
          className="flex items-center"
          role="alert"
          aria-live="assertive"
        >
          <Shield className="h-4 w-4 mr-2" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {groups.length === 0 ? (
        <div
          className="text-center py-12"
          role="region"
          aria-label={searchTerm ? "Nenhum grupo encontrado" : "Você ainda não tem grupos"}
        >
          <div className="mx-auto w-24 h-24 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-6">
            <Users className="h-12 w-12 text-blue-500 dark:text-blue-400" aria-hidden="true" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {searchTerm ? 'Nenhum grupo encontrado' : 'Você ainda não tem grupos'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">
            {searchTerm
              ? 'Tente ajustar sua busca ou navegar por todos os grupos.'
              : 'Crie um novo grupo para começar a colaborar com outros profissionais de saúde.'}
          </p>
          {!searchTerm && (
            <Button onClick={handleCreateGroup} className="mt-4">
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              Criar seu primeiro grupo
            </Button>
          )}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          role="region"
          aria-label="Lista de grupos"
        >
          {groups.map((group) => (
            <GroupCard 
              key={group.id} 
              group={group}
              isSelected={selectedGroupId === group.id.toString()}
              onSelect={onGroupSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};