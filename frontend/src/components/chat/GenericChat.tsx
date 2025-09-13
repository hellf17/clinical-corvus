'use client';

import { useChat } from '@ai-sdk/react';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert, AlertDescription } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Send, Brain, Microscope, Search, Zap, CheckCircle, XCircle, AlertTriangle, Loader2, Activity, FileText, BookOpen } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ClinicalUIMessage } from '@/types/clinical-chat';
import { getToolDescription } from '@/lib/clinical-tools';

interface GenericChatProps {
  patientId: string | null;
  apiEndpoint?: string;
  academyModule?: string;
}

export default function GenericChat({ patientId, apiEndpoint = '/api/chat', academyModule }: GenericChatProps) {
  const { messages, sendMessage, addToolResult, status, error, stop } = useChat<ClinicalUIMessage>({
    // Handle client-side tools that are automatically executed
    async onToolCall({ toolCall }) {
      // Check if it's a dynamic tool first for proper type narrowing
      if (toolCall.dynamic) {
        return;
      }

      // Handle client-side tools that should be automatically executed
      // (None in our current implementation - all require user interaction)
      console.log('Tool call received:', toolCall.toolName);
    },

    onFinish: ({ message }) => {
      console.log('Clinical consultation completed:', {
        messageId: message.id,
        patientId,
        academyModule,
        toolsUsed: message.parts.filter(p => p.type.startsWith('tool-')).length,
      });
    },

    onError: (error) => {
      console.error('Clinical chat error:', error);
    },
  });

  const [input, setInput] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && status === 'ready') {
      sendMessage(
        { text: input },
        {
          body: { data: { patientId: patientId ? parseInt(patientId, 10) : null } },
        }
      );
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      <ScrollArea className="flex-1 mb-4 pr-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg shadow-md ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white border border-gray-200'
              }`}>
                <div className="p-3">
                  {message.parts && message.parts.length > 0 ? (
                    message.parts.map((part, index) => {
                      if (part.type === 'text') {
                        return (
                          <div key={index} className="whitespace-pre-wrap text-sm">
                            {part.text}
                          </div>
                        );
                      }
                      return null;
                    })
                  ) : (
                    <div className="whitespace-pre-wrap text-sm">
                      {/* Fallback to content if parts don't exist */}
                      {'content' in message ? (message.content as string) : ''}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Status indicators */}
      {(status === 'submitted' || status === 'streaming') && (
        <div className="mb-3 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            {status === 'submitted' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
            {status === 'streaming' && <Activity className="h-4 w-4 text-blue-600 animate-pulse" />}
            <span className="text-sm text-blue-800">
              {status === 'submitted' ? 'Enviando mensagem...' : 'Dr. Corvus está analisando...'}
            </span>
          </div>
          <Button size="sm" variant="outline" onClick={() => stop()}>
            Parar
          </Button>
        </div>
      )}

      {/* Error display */}
      {error && (
        <Alert className="mb-3 border-red-200 bg-red-50">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>Ocorreu um erro no chat clínico.</span>
              <Button size="sm" variant="outline" onClick={() => sendMessage({ text: input })}>
                Tentar Novamente
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Pergunte ao Dr. Corvus sobre diagnósticos, exames, evidências..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1"
          disabled={status !== 'ready'}
        />
        <Button
          type="submit"
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white"
          disabled={status !== 'ready' || !input.trim()}
        >
          {status === 'ready' ? <Send className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
        </Button>
      </form>

      {/* Academy module indicator */}
      {academyModule && (
        <div className="mt-2 text-center">
          <Badge variant="outline" className="text-xs">
            <BookOpen className="h-3 w-3 mr-1" />
            Módulo: {academyModule}
          </Badge>
        </div>
      )}
    </div>
  );
}
