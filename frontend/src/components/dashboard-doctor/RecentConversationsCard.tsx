import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/Card";
import { MessageCircle, CheckCircle, Loader2 } from "lucide-react";
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';

interface Conversation {
  conversation_id: string;
  patient_name: string;
  last_message_content: string;
  unread_count: number;
}

interface ConversationListResponse {
  conversations: Conversation[];
}

const fetcher = async ([url, token]: [string, string | null]) => {
  if (!token) {
    throw new Error('Authentication token is not available.');
  }
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }
    const errorInfo = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(`API Error: ${response.status} - ${errorInfo.detail || errorInfo.error || 'Failed to fetch conversations'}`);
  }
  return response.json();
};

interface RecentConversationsCardProps {
  onItemClick: (id: string) => void;
  onViewAll: () => void;
}

export default function RecentConversationsCard({
  onItemClick,
  onViewAll
}: RecentConversationsCardProps) {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchToken = async () => {
      const jwtToken = await getToken();
      setToken(jwtToken);
    };
    fetchToken();
  }, [getToken]);

  const { data, error, isLoading } = useSWR<ConversationListResponse>(
    token ? [`/api/conversations`, token] : null,
    fetcher
  );

  if (isLoading) {
    return (
      <Card className="border rounded-lg p-4 bg-white h-full">
        <div className="flex items-center justify-center h-40">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border rounded-lg p-4 bg-white h-full">
        <div className="text-center py-4 text-red-500">
          <p>Erro ao carregar mensagens</p>
        </div>
      </Card>
    );
  }

  const items = data?.conversations || [];

  return (
    <Card className="border rounded-lg p-4 sm:p-6 bg-white transition-all duration-200 h-full hover:shadow-lg hover:border-blue-500">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start">
          <MessageCircle className="h-5 w-5 text-blue-500 mr-2 mt-0.5" />
          <div>
            <h3 className="font-semibold text-base sm:text-lg">Caixa de Entrada</h3>
            <p className="text-sm text-gray-500 mt-1">Mensagens do Dr. Corvus</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Ver todos
        </button>
      </div>
      
      <div className="space-y-3">
        {items.slice(0, 3).map((item) => (
          <div
            key={item.conversation_id}
            className="p-3 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
            onClick={() => onItemClick(item.conversation_id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onItemClick(item.conversation_id)}
          >
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <p className="text-sm font-medium text-blue-800">
                  {item.patient_name}
                </p>
                {item.unread_count > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {item.unread_count}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {item.last_message_content}
              </p>
            </div>
          </div>
        ))}
        
        {items.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <MessageCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Nenhuma mensagem recente</p>
          </div>
        )}
      </div>
    </Card>
  );
}