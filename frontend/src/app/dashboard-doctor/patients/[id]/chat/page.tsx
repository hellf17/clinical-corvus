'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import type { UIMessage as ClinicalUIMessage } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import useSWR from 'swr';
import ChatWindow from '@/components/chat/ChatWindow';
import { MVPAgentIntegration } from '@/components/chat/MVPAgentIntegration';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PatientContext } from '@/types/chat';

interface Patient {
  patient_id: number;
  name: string;
  age: number;
  gender: string;
  status: string;
  primary_diagnosis?: string;
  birthDate?: string;
  created_at: string;
  updated_at: string;
}

interface Conversation {
  id: string;
  title: string;
  patientId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversationList {
  conversations: Conversation[];
}

const fetcher = async ([url, token]: [string, string | null]) => {
  if (!token) {
    throw new Error('Authentication token is not available.');
  }
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  if (!res.ok) {
    const errorInfo = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`API Error: ${res.status} - ${errorInfo.detail || 'Failed to fetch'}`);
  }
  return res.json();
};

export default function PatientChatPage() {
  const params = useParams();
  const patientId = params.id as string;
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const { getToken } = require('@clerk/nextjs').useAuth();
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);

  // Fetch patient information
  const { 
    data: patient, 
    error: patientError, 
    isLoading: patientLoading 
  } = useSWR<Patient>(
    token ? [`/api/patients/${patientId}`, token] : null, 
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch or create conversation for this patient
  const {
    data: conversationList,
    error: conversationError,
    isLoading: conversationLoading,
    mutate: mutateConversation
  } = useSWR<ConversationList>(
    token ? [`/api/conversations?patientId=${patientId}`, token] : null,
    fetcher,
    {
      revalidateOnFocus: false,
      onSuccess: (data) => {
        if (data && data.conversations && data.conversations.length > 0) {
          setConversationId(data.conversations[0].id);
        }
      }
    }
  );

  // Create conversation if none exists
  const createConversation = React.useCallback(async () => {
    if (!token) return;
    
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: `Conversa com ${patient?.name || 'Paciente'}`,
          patientId: patientId
        })
      });
      
      if (response.ok) {
        const newConversation = await response.json();
        setConversationId(newConversation.id);
        mutateConversation(); // Refresh the conversation list
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  }, [token, patient?.name, patientId, mutateConversation]);

  const {
    messages,
    sendMessage,
    status: chatStatus,
    error: chatError
  } = useChat<ClinicalUIMessage>({
    // Route through the unified multi‑agent chat API (streams + persists to backend)
    transport: new DefaultChatTransport({ api: `/api/chat` }),
    onError: (error) => {
      console.error('Chat error:', error);
    },
  });

  // Manage input state separately since useChat doesn't provide it
  const [input, setInput] = useState('');

  // Create custom handleSubmit function
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      sendMessage({
        text: input.trim()
      });
      setInput('');
    }
  };

  const handleSendMessage = (text: string) => {
    if (text.trim()) {
      sendMessage({
        text: text.trim()
      });
      setInput('');
    }
  };

  // Create patient context for the chat
  const patientContext: PatientContext | undefined = patient ? {
    patientId: patient.patient_id.toString(),
    patientName: patient.name,
    medications: [], // Could be fetched from medications API
    symptoms: [], // Could be fetched from patient data
  } : undefined;

  // Auto-create conversation if patient exists but no conversation exists
  React.useEffect(() => {
    if (patient && (!conversationList || conversationList.conversations.length === 0) && !conversationLoading && !conversationError) {
      // Pre-create disabled: rely on /api/chat to create conversation on first send.
    }
  }, [patient, conversationList, conversationLoading, conversationError, createConversation]);

  if (patientLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (patientError) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">Erro ao carregar conversas.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">Paciente não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Patient Header */}
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-sm border">
        <h1 className="text-2xl font-bold mb-2">Conversa com o Assistente Clínico</h1>
        <p className="text-muted-foreground">
          Paciente: {patient.name} • {patient.age} anos • {patient.gender}
        </p>
      </div>

      {/* MVP Agents Integration */}
      <MVPAgentIntegration
        patientId={patientId}
        conversationId={conversationId || undefined}
      />

      {/* Chat Window */}
      <div className="relative">
        {conversationId ? (
          <div className="bg-card border rounded-lg shadow-sm h-[70vh] flex flex-col">
            <ChatWindow
              messages={messages || []}
              onSendMessage={handleSendMessage}
              patientContext={patientContext}
              quickReplies={[
                "Quais são os possíveis diagnósticos?",
                "Quais exames devo solicitar?",
                "Qual o tratamento recomendado?",
                "Quais são os possíveis complicadores?"
              ]}
              input={input}
              setInput={setInput}
              handleSubmit={handleSubmit}
              isSending={chatStatus === 'submitted' || chatStatus === 'streaming'}
            />
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground mb-4">
                Iniciando conversa com o assistente clínico...
              </p>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
