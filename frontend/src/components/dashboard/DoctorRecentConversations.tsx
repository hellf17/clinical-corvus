'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Spinner } from '@/components/ui/Spinner';
import { AlertCircle } from 'lucide-react';
import { getRecentConversations, ConversationSummary } from '@/services/conversationService.client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DoctorRecentConversations() {
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { getToken } = useAuth();

    useEffect(() => {
        const fetchConversations = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const token = await getToken();
                if (!token) throw new Error("Authentication token not available.");
                const data = await getRecentConversations(token);
                setConversations(data);
            } catch (err: any) {
                setError(err.message || "Erro ao buscar conversas.");
                setConversations([]);
            } finally {
                setIsLoading(false);
            }
        };
        fetchConversations();
    }, [getToken]);

    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Conversas Recentes</CardTitle>
           <Link href="/chat" className="inline-block">
             <Button size="sm" variant="outline">
                Iniciar Chat
             </Button>
           </Link>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="flex justify-center items-center h-20"><Spinner /></div>
            ) : error ? (
                <Alert className="text-destructive border-destructive dark:border-destructive [&>svg]:text-destructive text-xs">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : conversations.length > 0 ? (
            <div className="divide-y divide-border">
                {conversations.map((conversation) => (
                    <div key={conversation.id} className="py-3 flex justify-between items-center">
                  <div>
                            <div className="font-medium text-foreground">{conversation.title || 'Conversa sem título'}</div>
                            {conversation.patientName && (
                                <div className="text-xs text-muted-foreground">Paciente: {conversation.patientName}</div>
                            )}
                            <div className="text-sm text-muted-foreground italic truncate w-64">
                                {conversation.lastMessageSnippet}
                            </div>
                            <div className="text-xs text-muted-foreground/80 mt-1">
                                Atualizada {formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                        <Link href={"/chat"} className="inline-block"> 
                            <Button size="sm" variant="outline">
                                Ver
                            </Button>
                        </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">Nenhuma conversa recente</p>
              <Link href="/chat" className="inline-block">
                <Button>
                    Conversar com Dr. Corvus
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    );
} 