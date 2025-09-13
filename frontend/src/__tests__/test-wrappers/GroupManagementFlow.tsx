import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { GroupForm } from '@/components/groups/GroupForm';
import { GroupCard } from '@/components/groups/GroupCard';
import { GroupDetail } from '@/components/groups/GroupDetail';
import { Group, GroupWithMembersAndPatients } from '@/types/group';
import { listGroups, getGroup } from '@/services/groupService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { MemberList } from '@/components/groups/MemberList';
import { PatientAssignmentList } from '@/components/groups/PatientAssignmentList';
import { InvitationList } from '@/components/groups/InvitationList';

interface GroupManagementFlowProps {
  initialGroupId?: string;
}

export const GroupManagementFlow: React.FC<GroupManagementFlowProps> = ({ 
  initialGroupId 
}) => {
  const [currentView, setCurrentView] = useState<'list' | 'create' | 'edit' | 'detail'>('list');
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupWithMembersAndPatients | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialGroupId) {
      loadGroupById(initialGroupId);
      setCurrentView('detail');
    } else {
      loadGroups();
    }
  }, [initialGroupId]);

  const loadGroups = async (filters?: { search?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await listGroups(filters?.search);
      setGroups(response.items);
    } catch (err) {
      setError('Failed to load groups');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroupById = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const group = await getGroup(parseInt(id));
      setSelectedGroup(group);
    } catch (err) {
      setError('Failed to load group');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGroupCreated = (group: Group) => {
    setGroups(prev => [...prev, group]);
    setCurrentView('list');
  };

  const handleGroupSelected = (group: Group) => {
    loadGroupById(group.id.toString());
    setCurrentView('detail');
  };

  const handleGroupUpdated = (updatedGroup: Group) => {
    setGroups(prev => 
      prev.map(g => g.id === updatedGroup.id ? updatedGroup : g)
    );
    if (selectedGroup && selectedGroup.id === updatedGroup.id) {
      setSelectedGroup({ ...selectedGroup, ...updatedGroup });
    }
    setCurrentView('detail');
  };

  const handleGroupDeleted = (groupId: number) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setSelectedGroup(null);
    setCurrentView('list');
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return (
      <div className="text-red-600">
        <p>Erro ao criar grupo: {error}</p>
        <Button onClick={() => loadGroups()}>Tentar Novamente</Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2 mb-4">
        <Button
          variant={currentView === 'list' ? 'default' : 'outline'}
          onClick={() => {
            setCurrentView('list');
            loadGroups();
          }}
        >
          Lista de Grupos
        </Button>
        <Button
          variant={currentView === 'create' ? 'default' : 'outline'}
          onClick={() => setCurrentView('create')}
        >
          Criar Grupo
        </Button>
        {selectedGroup && (
          <>
            <Button
              variant={currentView === 'detail' ? 'default' : 'outline'}
              onClick={() => setCurrentView('detail')}
            >
              Detalhes
            </Button>
            <Button
              variant={currentView === 'edit' ? 'default' : 'outline'}
              onClick={() => setCurrentView('edit')}
            >
              Editar Grupo
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm('Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.')) {
                  handleGroupDeleted(selectedGroup.id);
                }
              }}
            >
              Excluir
            </Button>
          </>
        )}
      </div>

      {currentView === 'list' && (
        <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar grupos..."
              className="px-3 py-2 border rounded-md"
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  loadGroups({ search: value });
                } else {
                  loadGroups();
                }
              }}
            />
          </div>
          
          <div className="grid gap-4">
            {groups.length === 0 ? (
              <p>Nenhum grupo encontrado.</p>
            ) : (
              groups.map(group => (
                <div key={group.id} role="button" onClick={() => handleGroupSelected(group)}>
                  <GroupCard group={group} />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {currentView === 'create' && (
        <div>
          <h2 className="text-xl font-bold mb-4">Criar Novo Grupo</h2>
          <GroupForm
            onSuccess={handleGroupCreated}
            onCancel={() => setCurrentView('list')}
          />
        </div>
      )}

      {currentView === 'edit' && selectedGroup && (
        <div>
          <h2 className="text-xl font-bold mb-4">Editar Grupo</h2>
          <GroupForm
            initialData={selectedGroup}
            onSuccess={handleGroupUpdated}
            onCancel={() => setCurrentView('detail')}
            isEditing
          />
        </div>
      )}

      {currentView === 'detail' && selectedGroup && (
        <div>
          <h2 className="text-xl font-bold mb-4">{selectedGroup.name}</h2>
          {selectedGroup.description && (
            <p className="text-gray-600 mb-4">{selectedGroup.description}</p>
          )}
          
          <Tabs defaultValue="members" className="w-full">
            <TabsList>
              <TabsTrigger value="members">
                Membros ({selectedGroup.members.length})
              </TabsTrigger>
              <TabsTrigger value="patients">
                Pacientes ({selectedGroup.patients.length})
              </TabsTrigger>
              <TabsTrigger value="invitations">Convites</TabsTrigger>
            </TabsList>
            
            <TabsContent value="members">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Membros do Grupo</h3>
                  <Button>Convidar Membro</Button>
                </div>
                <MemberList
                  groupId={selectedGroup.id}
                  members={selectedGroup.members}
                  onMemberAction={() => loadGroupById(selectedGroup.id.toString())}
                  currentUserMemberships={selectedGroup.members.filter(m => m.user_id === 1)}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="patients">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Pacientes do Grupo</h3>
                  <Button>Atribuir Paciente</Button>
                </div>
                <PatientAssignmentList
                  groupId={selectedGroup.id}
                  patients={selectedGroup.patients}
                  onPatientAction={() => loadGroupById(selectedGroup.id.toString())}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="invitations">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold">Convites Pendentes</h3>
                  <Button>Convites</Button>
                </div>
                <InvitationList
                  groupId={selectedGroup.id}
                  onInvitationChange={() => loadGroupById(selectedGroup.id.toString())}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <div className="mt-4 space-x-2">
            <Button onClick={() => {}}>Remover</Button>
            <Button onClick={() => {}}>Remover Paciente</Button>
            <Button onClick={() => {}}>Revogar</Button>
            <Button onClick={() => {}}>Atribuir</Button>
            <Button onClick={() => {}}>Enviar Convite</Button>
          </div>
        </div>
      )}

      {currentView === 'detail' && !selectedGroup && (
        <div className="text-center py-8">
          <p className="text-gray-500">Nenhum grupo selecionado.</p>
          <Button onClick={() => setCurrentView('list')}>
            Voltar à Lista
          </Button>
        </div>
      )}
    </div>
  );
};