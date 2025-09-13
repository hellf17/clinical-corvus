import React, { useState, useEffect, useRef, useCallback, FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Loader2, SendHorizonal, Plus, Trash2, MessageSquare, Edit, AlertCircle } from 'lucide-react';
import { aiChatService } from '@/services/aiChatService';
import { saveAssistantMessage } from '@/services/chatService';
import {
  AIChatConversationSummary,
  AIChatConversationUpdate,
  AIChatMessage,
} from '@/types/ai_chat';
import { useChatStore } from '@/store/chatStore';
import { Spinner } from '@/components/ui/Spinner';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "@/components/ui/AlertDialog";
import ChatMessage from '../chat/ChatMessage';
import { useChat, UIMessage as Message } from '@ai-sdk/react';
import { ScrollArea } from "@/components/ui/ScrollArea";
import { toast } from 'sonner';
import { useAuth } from '@clerk/nextjs';

interface ConversationSummary extends AIChatConversationSummary {}

interface AIChatProps {
  patientId: string;
}

export default function AIChat({ patientId }: AIChatProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [errorLoadingConversations, setErrorLoadingConversations] = useState<string | null>(null);

  const [newConversationTitle, setNewConversationTitle] = useState('');
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState('');
  const [isDeletingConversationId, setIsDeletingConversationId] = useState<string | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [isLoadingInitialMessages, setIsLoadingInitialMessages] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const { settings } = useChatStore();
  const { getToken } = useAuth();

  const chatHelpers = useChat({
    onFinish: async (message: any) => {
      console.log('Finished receiving message for patient chat:', message);
      
      if (message.role === 'assistant' && selectedConversationId) {
        try {
          const token = await getToken();
          if (!token) {
              throw new Error("Authentication token not available.");
          }
          await saveAssistantMessage(selectedConversationId, { 
              content: message.content, 
              role: 'assistant', 
          }, token);
          console.log('Assistant message saved successfully.');
        } catch (error) {
          console.error("Failed to save assistant message:", error);
          toast.error("Falha ao salvar a resposta do assistente.", {
            description: error instanceof Error ? error.message : String(error),
          });
        }
      }
      
      loadConversations(false);
    },
    onError: (error: Error) => {
        console.error('AI Chat error:', error);
        toast.error("Erro na comunicação com Dr. Corvus", { description: error.message });
    },
  });

  const messages = chatHelpers.messages;
  const setMessages = chatHelpers.setMessages;
  
  // Local state for input handling
  const [input, setInput] = useState('');
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  // Aliases for consistency with the rest of the code
  const isAiLoading = (chatHelpers as any).isLoading;
  const aiError = (chatHelpers as any).error;

  

  const handleSelectConversation = useCallback(async (conversationId: string) => {
    if (conversationId === selectedConversationId) return;

    console.log('Selecting conversation in AIChat:', conversationId);
    setSelectedConversationId(conversationId);
    setIsLoadingInitialMessages(true);
    setMessages([]);

    try {
      const historicalMessages: AIChatMessage[] = await aiChatService.getMessages(conversationId);

      const coreMessages: any[] = historicalMessages
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .map(msg => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          createdAt: new Date(msg.created_at)
        }));

      setMessages(coreMessages);

    } catch (error: any) {
      console.error('Error loading initial messages:', error);
      toast.error("Erro ao carregar mensagens", { description: error.message });
      setMessages([]);
    } finally {
      setIsLoadingInitialMessages(false);
    }
  }, [selectedConversationId, setMessages]);

  const loadConversations = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoadingConversations(true);
    setErrorLoadingConversations(null);
    try {
      const response = await aiChatService.getConversationsForPatient(patientId, 0, 100);
      const sortedConversations = response.conversations.sort((a, b) =>
         new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setConversations(sortedConversations);

      if ((!selectedConversationId || !sortedConversations.some(c => c.id === selectedConversationId)) && sortedConversations.length > 0) {
         console.log("Auto-selecting first conversation:", sortedConversations[0].id)
         await handleSelectConversation(sortedConversations[0].id);
      } else if (sortedConversations.length === 0) {
         console.log("No conversations found, clearing selection.")
         setSelectedConversationId(null);
         setMessages([]);
      }

    } catch (error: any) {
      console.error('Error loading conversations:', error);
      setErrorLoadingConversations(error.message || 'Failed to load AI chat conversations');
      toast.error("Erro ao carregar conversas", { description: error.message });
    } finally {
      if (showLoading) setIsLoadingConversations(false);
    }
  }, [patientId, selectedConversationId, setMessages, handleSelectConversation]);

  const createNewConversation = async () => {
    if (!newConversationTitle.trim()) {
        toast.warning("Por favor, insira um título para a nova conversa.");
        return;
    }
    setIsCreatingConversation(true);
    try {
      const newConversation = await aiChatService.createConversationForPatient(
        patientId,
        newConversationTitle.trim()
      );
      
      setConversations(prev => [
        {
          id: newConversation.id,
          title: newConversation.title,
          last_message_content: newConversation.last_message_content,
          created_at: newConversation.created_at,
          updated_at: newConversation.updated_at,
          message_count: 0
        },
        ...prev
      ]);
      
      setNewConversationTitle('');
      await handleSelectConversation(newConversation.id);

    } catch (error: any) {
      console.error('Error creating conversation:', error);
      toast.error("Erro ao criar conversa", { description: error.message });
    } finally {
      setIsCreatingConversation(false);
    }
  };

  const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedConversationId || !input.trim()) return;

    console.log(`Submitting message via useChat to conversation ${selectedConversationId} with patient ${patientId}`);

    // Add the user message to the messages array immediately
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: input,
    };

    // Update the messages state
    // We'll use the append function from useChat if available, otherwise we won't add the message locally
    // since the type system doesn't allow us to mix the types
    if (typeof (chatHelpers as any).append === 'function') {
      (chatHelpers as any).append(userMessage);
    }
    // Note: We're not using setMessages here because of type incompatibility
    
    // Clear the input field
    setInput('');

    // Call the API directly with the required data
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication token not available.");
      }

      // Submit the message with additional data
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          conversationId: selectedConversationId,
          patientId: patientId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // The assistant response will be handled by the onFinish callback
    } catch (error) {
      console.error('Error submitting message:', error);
      toast.error("Erro ao enviar mensagem", { 
        description: error instanceof Error ? error.message : String(error) 
      });
      
      // Remove the user message if there was an error
      setMessages(messages);
    }
  };

  const startEditingTitle = (conv: ConversationSummary) => {
    setEditingTitleId(conv.id);
    setTempTitle(conv.title);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  };

  const cancelEditingTitle = () => {
    setEditingTitleId(null);
    setTempTitle('');
  };

  const saveTitle = async (conversationId: string) => {
    if (!tempTitle.trim()) {
        toast.warning("O título não pode ficar vazio.");
        return;
    }
    const originalTitle = conversations.find(c => c.id === conversationId)?.title;
    if (tempTitle.trim() === originalTitle) {
        cancelEditingTitle();
        return;
    }

      setConversations(prev => 
        prev.map(conv => 
            conv.id === conversationId ? { ...conv, title: tempTitle.trim() } : conv
        )
      );
    setEditingTitleId(null);

    try {
      await aiChatService.updateConversation(conversationId, { title: tempTitle.trim() });
      toast.success("Título da conversa atualizado.");
    } catch (error: any) {
      console.error('Error updating title:', error);
      toast.error("Erro ao atualizar título", { description: error.message });
       setConversations(prev =>
        prev.map(conv =>
            conv.id === conversationId ? { ...conv, title: originalTitle || 'Conversa' } : conv
        )
       );
    } finally {
       setTempTitle('');
    }
  };

  const handleDeleteRequest = (conversationId: string) => {
    setIsDeletingConversationId(conversationId);
  };

  const confirmDelete = async () => {
    if (!isDeletingConversationId) return;

    setIsSubmittingDelete(true);
    const idToDelete = isDeletingConversationId;

    try {
      await aiChatService.deleteConversation(idToDelete);

      setConversations(prev => prev.filter(c => c.id !== idToDelete));

      if (selectedConversationId === idToDelete) {
        const remainingConversations = conversations.filter(c => c.id !== idToDelete);
        if (remainingConversations.length > 0) {
            await handleSelectConversation(remainingConversations[0].id);
        } else {
            setSelectedConversationId(null);
            setMessages([]);
        }
      }
      toast.success("Conversa excluída com sucesso.");

    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast.error("Erro ao excluir conversa", { description: error.message });
    } finally {
      setIsDeletingConversationId(null);
      setIsSubmittingDelete(false);
    }
  };

  useEffect(() => {
    console.log("AIChat: Patient ID changed or mounted:", patientId);
    setSelectedConversationId(null);
    setMessages([]);
    loadConversations();
  }, [patientId, loadConversations, setMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }
  }, [messages]);

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
        <CardTitle className="text-lg">Chat Dr. Corvus</CardTitle>
      </CardHeader>
          
      <div className="flex flex-1 overflow-hidden">
         <div className="w-1/3 border-r flex flex-col">
          <div className="p-2 border-b">
              <Input
                  placeholder="Título da nova conversa"
                value={newConversationTitle}
                onChange={(e) => setNewConversationTitle(e.target.value)}
                  className="mb-2"
                disabled={isCreatingConversation}
              />
              <Button 
                onClick={createNewConversation}
                  className="w-full"
                  disabled={isCreatingConversation || !newConversationTitle.trim()}
              >
                  {isCreatingConversation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                  Nova Conversa
              </Button>
          </div>
          <ScrollArea className="flex-1 p-2">
            {isLoadingConversations && <Spinner className="mx-auto my-4" />}
            {errorLoadingConversations && (
              <div className="text-destructive p-2 text-sm flex items-center">
                  <AlertCircle className="mr-2 h-4 w-4"/> Erro ao carregar.
              </div>
            )}
            {!isLoadingConversations && conversations.length === 0 && !errorLoadingConversations && (
              <p className="text-muted-foreground text-sm p-4 text-center">Nenhuma conversa iniciada para este paciente.</p>
            )}
            {conversations.map((conv) => (
                <div 
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`p-2 mb-1 rounded-md cursor-pointer hover:bg-muted transition-colors group ${
                  selectedConversationId === conv.id ? 'bg-muted font-semibold' : ''
                }`}
              >
                {editingTitleId === conv.id ? (
                    <div className="flex items-center space-x-1">
                         <Input
                            ref={titleInputRef}
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onBlur={() => saveTitle(conv.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') saveTitle(conv.id);
                                if (e.key === 'Escape') cancelEditingTitle();
                            }}
                            className="h-7 px-1 flex-1"
                         />
                    </div>
                ) : (
                    <div className="flex items-center justify-between">
                        <span className="truncate text-sm flex-1 mr-2">{conv.title || 'Conversa'}</span>
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); startEditingTitle(conv); }}>
                                <Edit className="h-4 w-4" />
                             </Button>
                       <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                                    size="icon"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteRequest(conv.id); }}
                          >
                                    <Trash2 className="h-4 w-4" />
                          </Button>
                       </AlertDialogTrigger>
                  </div>
                </div>
            )}
          </div>
            ))}
          </ScrollArea>
      </div>
      
        <div className="w-2/3 flex flex-col">
            {selectedConversationId ? (
          <>
                    <ScrollArea className="flex-1 p-4 space-y-4 bg-background/50" ref={messageContainerRef}>
                        {isLoadingInitialMessages && <Spinner className="mx-auto my-4"/>}
                        {aiError && !isLoadingInitialMessages && (
                            <div className="text-destructive p-2 text-sm flex items-center justify-center">
                                <AlertCircle className="mr-2 h-4 w-4"/> Erro: {aiError.message}
                </div>
                        )}
                        {messages.length === 0 && !isLoadingInitialMessages && !aiError && (
                            <div className="text-center text-muted-foreground p-8">
                                <MessageSquare className="mx-auto h-10 w-10 mb-2"/>
                                Inicie a conversa enviando uma mensagem.
                </div>
              )}
                        {messages.map((m: Message) => (
                            <ChatMessage 
                                key={m.id} 
                                message={m} 
                             />
                      ))}
              <div ref={messagesEndRef} />
                    </ScrollArea>
                    <CardFooter className="p-4 border-t">
                        <form onSubmit={handleFormSubmit} className="flex w-full items-center space-x-2">
                <Input
                            value={input}
                            onChange={handleInputChange}
                            placeholder="Pergunte ao Dr. Corvus sobre este paciente..."
                            disabled={isAiLoading || isLoadingInitialMessages}
                />
                        <Button type="submit" disabled={isAiLoading || !input.trim() || isLoadingInitialMessages}>
                            {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
                            <span className="sr-only">Enviar</span>
                </Button>
              </form>
                    </CardFooter>
          </>
        ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
                   {isLoadingConversations ? (
                       <Spinner />
                   ) : conversations.length > 0 ? (
                       "Selecione uma conversa à esquerda para começar."
                   ) : (
                       "Crie uma nova conversa para iniciar o chat com Dr. Corvus sobre este paciente."
                   )}
          </div>
        )}
      </div>
    </div>

       <AlertDialog open={!!isDeletingConversationId} onOpenChange={(open: boolean) => !open && setIsDeletingConversationId(null)}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isSubmittingDelete}>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                    onClick={confirmDelete}
                    disabled={isSubmittingDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                {isSubmittingDelete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Excluir
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </Card>
  );
} 