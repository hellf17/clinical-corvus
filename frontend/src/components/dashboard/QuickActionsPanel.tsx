'use client';

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Link from 'next/link';
import { FilePlus2, MessageSquarePlus, UserPlus, BookHeart, ClipboardList } from 'lucide-react';

interface QuickActionsPanelProps {
  role: 'doctor' | undefined; // Future patient support (commented out for now)
}

const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({ role }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {role === 'doctor' && (
          <>
            <Link href="/patients/new" className="inline-block w-full">
              <Button variant="outline" className="w-full flex items-center justify-start">
                <UserPlus className="mr-2 h-4 w-4" />
                Adicionar Paciente
              </Button>
            </Link>
            <Link href="/chat" className="inline-block w-full"> 
              <Button variant="outline" className="w-full flex items-center justify-start">
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Iniciar Chat com IA
              </Button>
            </Link>
            {/* <Button variant="outline" className="w-full justify-start">
              <FilePlus2 className="mr-2 h-4 w-4" /> Nova Nota Clínica Rápida 
            </Button> */}
          </>
        )}
        {/* Future patient support (commented out for now) */}
        {/* {role === 'patient' && (
          <>
            <Link href="/dashboard-paciente/diario/novo" className="inline-block w-full">
              <Button variant="outline" className="w-full flex items-center justify-start">
                <BookHeart className="mr-2 h-4 w-4" />
                Registrar no Diário
              </Button>
            </Link>
            <Link href="/chat" className="inline-block w-full">
              <Button variant="outline" className="w-full flex items-center justify-start">
                <MessageSquarePlus className="mr-2 h-4 w-4" />
                Falar com Dr. Corvus
              </Button>
            </Link>
          </>
        )} */}
        <Link href="/docs" className="inline-block w-full">
            <Button variant="ghost" className="w-full flex items-center justify-start text-muted-foreground hover:text-foreground">
              Ver Documentação
            </Button>
        </Link>
      </CardContent>
    </Card>
  );
};

export default QuickActionsPanel; 