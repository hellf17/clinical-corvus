'use client';

import React, { useState } from 'react';
import { GroupList } from '@/components/groups/GroupList';
import { Users, UserPlus, FileText, Settings, Plus, Lightbulb, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { GroupForm } from '@/components/groups/GroupForm';

export default function GroupsPage() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Grupos</h1>
          <p className="text-gray-600">Organize e colabore com equipes multidisciplinares</p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Grupo
          </Button>
        </div>
      </div>

      {/* Quick Actions Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {/* Manage Members Action */}
        <Button
          className={`h-auto p-4 flex flex-col items-center justify-center space-y-2 transition-all duration-200 ${
            selectedGroup
              ? 'border-white text-white hover:bg-white/10 shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
          }`}
          onClick={() => {
            if (selectedGroup) {
              window.location.href = `/dashboard-doctor/groups/${selectedGroup}/members`;
            } else {
              alert('Selecione um grupo primeiro para gerenciar membros');
            }
          }}
          disabled={!selectedGroup}
        >
          <Users className="h-5 w-5" />
          <div className="text-center">
            <div className="font-semibold text-sm">Gerenciar Membros</div>
            <div className="text-xs opacity-80">
              {selectedGroup ? 'Adicionar membros' : 'Selecione um grupo'}
            </div>
          </div>
        </Button>
        
        {/* Assign Patients Action */}
        <Button
          className={`h-auto p-4 flex flex-col items-center justify-center space-y-2 transition-all duration-200 ${
            selectedGroup
              ? 'border-white text-white hover:bg-white/10 shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
          }`}
          onClick={() => {
            if (selectedGroup) {
              window.location.href = `/dashboard-doctor/groups/${selectedGroup}/patients`;
            } else {
              alert('Selecione um grupo primeiro para atribuir pacientes');
            }
          }}
          disabled={!selectedGroup}
        >
          <FileText className="h-5 w-5" />
          <div className="text-center">
            <div className="font-semibold text-sm">Atribuir Pacientes</div>
            <div className="text-xs opacity-80">
              {selectedGroup ? 'Associar pacientes' : 'Selecione um grupo'}
            </div>
          </div>
        </Button>

        {/* Settings Action (placeholder for future use) */}
        <Button
          className={`h-auto p-4 flex flex-col items-center justify-center space-y-2 transition-all duration-200 ${
            selectedGroup
              ? 'border-white text-white hover:bg-white/10 shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
          }`}
          onClick={() => {
            if (selectedGroup) {
              window.location.href = `/dashboard-doctor/groups/${selectedGroup}/settings`;
            } else {
              alert('Selecione um grupo primeiro para acessar configurações');
            }
          }}
          disabled={!selectedGroup}
        >
          <Settings className="h-5 w-5" />
          <div className="text-center">
            <div className="font-semibold text-sm">Configurações</div>
            <div className="text-xs opacity-80">
              {selectedGroup ? 'Gerenciar grupo' : 'Selecione um grupo'}
            </div>
          </div>
        </Button>
      </div>

      {/* Main Content - Full Width Group List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Group List - Full Width */}
        <div className="lg:col-span-3">
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center">
                  <Users className="h-6 w-6 mr-3 text-blue-600" />
                  Seus Grupos
                </CardTitle>
                <div className="text-sm text-gray-500">
                  {selectedGroup ? 'Grupo selecionado' : 'Selecione um grupo para ativar as ações'}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <GroupList
                selectedGroupId={selectedGroup || undefined}
                onGroupSelect={setSelectedGroup}
                onCreateGroup={() => setIsCreateModalOpen(true)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Tips Card - Sidebar */}
        <div className="lg:col-span-1">
          <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center">
                <Lightbulb className="h-5 w-5 mr-2 text-amber-600" />
                Dicas Úteis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3"></div>
                  <span className="text-sm text-gray-700">Organize grupos por <strong>especialidade</strong> ou departamento</span>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full mt-2 mr-3"></div>
                  <span className="text-sm text-gray-700">Convide colegas para <strong>colaborar</strong> no cuidado</span>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-2 h-2 bg-purple-500 rounded-full mt-2 mr-3"></div>
                  <span className="text-sm text-gray-700">Atribua pacientes para <strong>acompanhamento</strong> em equipe</span>
                </div>
                <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3"></div>
                    <span className="text-sm font-medium text-blue-800">
                      Clique em um grupo na lista para ativar as ações
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Create Group Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Grupo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <GroupForm
              onSuccess={() => {
                setIsCreateModalOpen(false);
                // Refresh the group list
                window.location.reload();
              }}
              onCancel={() => setIsCreateModalOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}