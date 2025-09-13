import { useState } from 'react';
import { Card } from "@/components/ui/Card";
import PatientSelect from '@/components/chat/PatientSelect';
import GenericChat from '@/components/chat/GenericChat';

export default function QuickChatPanel() {
  const [patientId, setPatientId] = useState<string | null>(null);

  const handlePatientSelect = (selectedPatientId: string | null) => {
    setPatientId(selectedPatientId);
  };

  return (
    <Card className="p-4 flex flex-col h-[600px] w-full max-w-2xl mx-auto">
      <h3 className="font-semibold mb-3 text-lg">Sessão Rápida com Dr. Corvus</h3>
      <div className="mb-3">
        <PatientSelect onSelect={handlePatientSelect} selectedPatientId={patientId} />
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        <GenericChat patientId={patientId} apiEndpoint="/api/chat" />
      </div>
    </Card>
  );
}