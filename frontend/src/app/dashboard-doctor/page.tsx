'use client';

import CriticalAlertsCard from '@/components/dashboard-doctor/CriticalAlertsCard';
import RecentConversationsCard from '@/components/dashboard-doctor/RecentConversationsCard';
import QuickAnalysisCard from '@/components/dashboard-doctor/QuickAnalysisCard';
import EducationalContentCard from '@/components/dashboard-doctor/EducationalContentCard';
import DoctorPatientList from '@/components/dashboard-doctor/DoctorPatientList';
import GroupOverviewCard from '@/components/dashboard-doctor/GroupOverviewCard';
import { BookOpen, Brain, Search } from 'lucide-react';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { GroupForm } from '@/components/groups/GroupForm';

export default function DashboardPage() {
  const [isCreateGroupModalOpen, setIsCreateGroupModalOpen] = useState(false);

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
          {/* Row 1: Alerts and Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
            <div className="lg:col-span-3">
              <CriticalAlertsCard
                onViewAll={() => console.log('View all alerts')}
                onAlertClick={(id) => console.log('Alert clicked:', id)}
              />
            </div>
            <div className="lg:col-span-2">
              <QuickAnalysisCard
                onClick={() => console.log('Open lab analysis')}
              />
            </div>
          </div>

          {/* Row 2: Recent Chats and MBE */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
            <div className="lg:col-span-3">
              <RecentConversationsCard
                onItemClick={(id) => console.log('Conversation clicked:', id)}
                onViewAll={() => console.log('View all conversations')}
              />
            </div>
            <div className="lg:col-span-2">
              <EducationalContentCard
                title="Medicina Baseada em Evidências"
                description="Domine a arte de formular perguntas PICO e buscar evidências científicas."
                icon={<Search className="h-6 w-6 text-purple-600" />}
                link="/academy/evidence-based-medicine"
                examples={[
                  {
                    title: 'Pesquisa de tratamentos mais recentes',
                    description: 'Buscar evidências atualizadas para otimizar tratamento de Hipertensão',
                    icon: <Brain className="h-4 w-4 text-purple-600" />,
                  },
                  {
                    title: 'Análise de guidelines clínicas',
                    description: 'Acessar diretrizes mais recentes para manejo adequado de Pneumonia',
                    icon: <BookOpen className="h-4 w-4 text-purple-600" />,
                  },
                ]}
              />
            </div>
          </div>

          {/* Row 3: Groups */}
          <div className="grid grid-cols-1">
            <GroupOverviewCard
              onViewAll={() => console.log('View all groups')}
              onCreateGroup={() => setIsCreateGroupModalOpen(true)}
            />
          </div>

          {/* Row 4: Patient List */}
          <div className="grid grid-cols-1">
            <DoctorPatientList />
          </div>
          
          {/* Create Group Modal */}
          <Dialog open={isCreateGroupModalOpen} onOpenChange={setIsCreateGroupModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Grupo</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <GroupForm
                  onSuccess={() => {
                    setIsCreateGroupModalOpen(false);
                    // Refresh the group list
                    window.location.reload();
                  }}
                  onCancel={() => setIsCreateGroupModalOpen(false)}
                />
              </div>
            </DialogContent>
          </Dialog>
    </div>
  );
}