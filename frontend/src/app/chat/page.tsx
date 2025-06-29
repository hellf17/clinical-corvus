'use client';

import React, { useState, useEffect, useRef, FormEvent, useCallback } from 'react';
// import { Button } from '@/components/ui/Button'; // Keep for other buttons if needed
// import { useRouter } from 'next/navigation'; // Keep if needed for navigation
// import { useChatStore } from '@/store/chatStore'; // Remove store dependency for core chat
import { usePatientStore } from '@/store/patientStore'; // Keep for patient context selection
import ConversationItem from '@/components/chat/ConversationItem'; // Keep for sidebar
import ChatMessage from '@/components/chat/ChatMessage'; // Keep for rendering messages
import PatientSelect from '@/components/chat/PatientSelect'; // Keep for patient context selection
import { useChat, Message } from 'ai/react'; // Changed CoreMessage to Message
import { useAuth } from "@clerk/nextjs";
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { ScrollArea } from "@/components/ui/ScrollArea"
import { SendHorizonal, Loader2, AlertCircle, Trash2 } from 'lucide-react'; // Import icons and Trash2
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger, // Keep if we decide to trigger differently
} from "@/components/ui/AlertDialog"
import { toast } from 'sonner'; // Assuming sonner for toast notifications

// TODO: Potentially move conversation list/management to a separate component 
// or integrate with useChat if its API supports multiple conversations easily.
// For now, we keep the basic structure and useChat for the active chat messages.

// Type for conversation objects fetched from API
interface Conversation {
    id: string;
    title: string | null; // Assuming title might be nullable
    createdAt: string; // Or Date? Adjust as needed
    userId: string;
}

// Interface for messages fetched from the backend (might have more fields)
interface FetchedMessage {
    id: string;
    conversationId: string;
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
    toolName?: string;
    toolInput?: string;
    toolResult?: string;
    createdAt: string; // Ensure createdAt is present
}

export default function ChatPage() {
  // const router = useRouter(); // Keep if navigation logic is added back
  const messageContainerRef = useRef<HTMLDivElement>(null);
  
  // --- State ---
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState<boolean>(true);
  const [errorLoadingConversations, setErrorLoadingConversations] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState<boolean>(false);
  const [errorLoadingMessages, setErrorLoadingMessages] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [conversationToDeleteId, setConversationToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // --- Patient Context State ---
  const [selectedPatientIdForChat, setSelectedPatientIdForChat] = useState<string | null>(null);
  const { patients } = usePatientStore(); // Get patient list for selector

  // --- AI SDK useChat Hook --- 
  const { 
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit, // Rename original handleSubmit
    isLoading: isAiLoading, // Rename isLoading from useChat
    error: aiError, // Rename error from useChat
    setMessages,
    reload,
    stop,
  } = useChat({
    api: '/api/chat',
    // Remove body from here, will be added in custom submit handler
    // initialMessages: [], // Start with empty messages initially
    onFinish(message) {
      console.log('Finished receiving message:', message);
      // Optional: Re-fetch conversation list if title might have changed?
    },
    onError(error) {
        console.error('Chat error:', error);
      // Display AI error separately or integrate with other errors
    }
  });

  // --- Fetch Conversations Effect ---
  useEffect(() => {
    const fetchConversations = async () => {
      setIsLoadingConversations(true);
      setErrorLoadingConversations(null);
      try {
        const response = await fetch('/api/conversations');
        if (!response.ok) {
          throw new Error(`Failed to fetch conversations: ${response.statusText}`);
        }
        const data: Conversation[] = await response.json();
        // Sort by creation date, newest first
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setConversations(data);
      } catch (error: any) {
        console.error("Error fetching conversations:", error);
        setErrorLoadingConversations(error.message || 'Could not load conversations.');
      } finally {
        setIsLoadingConversations(false);
      }
    };
    fetchConversations();
  }, []); // Run only on mount

  // --- Handle Conversation Selection ---
  const handleSelectConversation = async (conversationId: string) => {
    if (conversationId === selectedConversationId) return; // Avoid reloading same convo

    console.log('Selecting conversation:', conversationId);
    setSelectedConversationId(conversationId);
    setIsLoadingMessages(true);
    setErrorLoadingMessages(null);
    setMessages([]); // Clear previous messages immediately

    try {
      const response = await fetch(`/api/conversations/${conversationId}/messages`);
      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }
      const fetchedMessages: FetchedMessage[] = await response.json();

      // Map FetchedMessage to Message format expected by useChat
      const coreMessages: Message[] = fetchedMessages
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map(msg => ({
          id: msg.id,
          role: msg.role === 'tool' ? 'data' : msg.role, 
          content: msg.content,
          createdAt: new Date(msg.createdAt) // Add createdAt as Date object
        }));

      setMessages(coreMessages);
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      setErrorLoadingMessages(error.message || 'Could not load messages.');
      setMessages([]); // Clear messages on error
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // --- Handle New Conversation ---
  const handleCreateConversation = async () => {
    console.log('Creating new conversation...');
    // Optionally add loading state for creation
    try {
      const response = await fetch('/api/conversations', { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Failed to create conversation: ${response.statusText}`);
      }
      const newConversation: Conversation = await response.json();
      console.log('Created new conversation:', newConversation);

      // Add to list and select it
      setConversations(prev => [newConversation, ...prev]); // Prepend to list
      // Select the new conversation - clear messages, set ID
      setSelectedConversationId(newConversation.id);
      setMessages([]);
      setErrorLoadingMessages(null); // Clear any previous message errors
      // Or call handleSelectConversation(newConversation.id) if you want to load potential initial messages immediately

    } catch (error: any) {
      console.error("Error creating conversation:", error);
      // TODO: Show error to user
    } finally {
      // Optionally set loading state false
    }
  };

  // --- Custom Submit Handler ---
  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedConversationId || !input.trim()) return;
    
    console.log("Submitting message to conversation:", selectedConversationId);
    
    // Pass patient ID in the data field
    originalHandleSubmit(e, {
         data: { patientId: selectedPatientIdForChat } // Pass selectedPatientId here
    });
    
    // Optional: Manually add user message to UI state immediately for better UX
    // (useChat might handle this automatically depending on configuration)
    // setMessages(prev => [...prev, { id: generateId(), role: 'user', content: input }]);
  };

  // --- Effect to scroll down --- 
  useEffect(() => {
    if (messageContainerRef.current) {
      messageContainerRef.current.scrollTop = messageContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Patient Selection Handler --- 
  const handlePatientSelect = (patientId: string | null) => {
    setSelectedPatientIdForChat(patientId);
    // Note: Changing patient context doesn't automatically switch conversations
    // or send a new message. It will be included in the *next* message sent.
    console.log('Selected patient for chat context:', patientId);
  }

  // --- Handle Delete Conversation Request ---
  const handleDeleteConversationRequest = (conversationId: string) => {
    console.log('Requesting delete for conversation:', conversationId);
    setConversationToDeleteId(conversationId);
    setIsDeleteDialogOpen(true);
  };

  // --- Handle Confirm Delete ---
  const handleConfirmDelete = async () => {
    if (!conversationToDeleteId) return;

    console.log('Confirming delete for conversation:', conversationToDeleteId);
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/conversations/${conversationToDeleteId}`, { 
        method: 'DELETE' 
      });

      if (!response.ok) {
         const errorData = await response.json().catch(() => ({})); // Try to parse error
         throw new Error(errorData.error || `Failed to delete conversation: ${response.statusText}`);
      }
      
      toast.success("Conversa excluída com sucesso."); // Success feedback

      // Update state locally
      setConversations(prev => prev.filter(c => c.id !== conversationToDeleteId));
      if (selectedConversationId === conversationToDeleteId) {
        setSelectedConversationId(null);
        setMessages([]); // Clear messages if the active one was deleted
        setErrorLoadingMessages(null);
      }
      
    } catch (error: any) {
      console.error("Error deleting conversation:", error);
      toast.error(`Erro ao excluir conversa: ${error.message}`); // Error feedback
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setConversationToDeleteId(null);
    }
  };
  
  return (
    <div className="flex h-[calc(100vh-theme(space.16))] overflow-hidden"> {/* Adjusted height */}
      {/* Conversation Sidebar */}
      <div className="w-1/4 border-r border-border bg-background p-4 hidden lg:flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Conversas</h2>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleCreateConversation}
            data-testid="new-conversation-button"
          >
            Nova Conversa
          </Button>
        </div>
        <ScrollArea className="flex-grow">
          {isLoadingConversations ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : errorLoadingConversations ? (
            <div className="text-center text-destructive text-sm p-4">
                <AlertCircle className="h-4 w-4 inline mr-1" /> {errorLoadingConversations}
            </div>
          ) : (
            <div className="space-y-1"> {/* Reduced spacing */}
              {conversations.length > 0 ? conversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
                  message={conversation.title || `Conversa ${conversation.id.substring(0, 8)}...`} // Fallback title
                  timestamp={new Date(conversation.createdAt).toLocaleString()} // Show timestamp
                  onClick={() => handleSelectConversation(conversation.id)}
                  isActive={selectedConversationId === conversation.id}
                  onDelete={(e) => {
                       e.stopPropagation(); // Ensure propagation is stopped here too
                       handleDeleteConversationRequest(conversation.id);
                   }}
                  data-testid={`conversation-item-${conversation.id}`}
            />
            )) : (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma conversa encontrada.</p>
            )}
        </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Main Chat Area */} 
      <div className="flex-1 flex flex-col bg-muted/40"> {/* Added bg */}
        {/* Conditional Rendering based on selection/loading */}
        {!selectedConversationId && !isLoadingConversations ? (
          <div className="flex-grow flex items-center justify-center">
            <p className="text-muted-foreground">Selecione uma conversa ou crie uma nova para começar.</p>
          </div>
        ) : (
          <>
            {/* Message Loading/Error State */}
            {isLoadingMessages && (
              <div className="flex justify-center items-center p-4 border-b border-border">
                 <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando mensagens...
              </div>
            )}
            {errorLoadingMessages && (
               <div className="p-4 border-b border-destructive bg-destructive/10 text-destructive text-sm flex items-center">
                 <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0"/> Erro ao carregar mensagens: {errorLoadingMessages}
              </div>
            )}
            {/* AI Error State */}
            {aiError && !errorLoadingMessages && ( // Show AI error only if not masked by message loading error
                <div className="p-4 border-b border-destructive bg-destructive/10 text-destructive text-sm flex items-center">
                    <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0"/> Erro na IA: {aiError.message}
                    <Button variant="ghost" size="sm" onClick={() => reload()} className="ml-auto">Tentar Novamente</Button>
                </div>
            )}
            
            <ScrollArea className="flex-grow p-4" ref={messageContainerRef}>
              <div className="space-y-4">
                {messages.map(m => (
                  // Pass CoreMessage directly if ChatMessage is compatible
                  // Or adapt ChatMessage to accept CoreMessage type
                    <ChatMessage key={m.id} message={m} />
                ))}
                {/* Show AI loading indicator */}
                {isAiLoading && (
                  <ChatMessage 
                    key="loading" 
                    message={{ 
                      id: 'ai-loading', 
                      role: 'assistant', 
                      content: '...' 
                      // timestamp: Date.now() // Removed timestamp
                    }} 
                  />
                )}
            </div>
              {/* Show placeholder only if no messages and not loading */}
              {!isLoadingMessages && messages.length === 0 && !isAiLoading && (
                 <div className="flex-grow flex items-center justify-center text-muted-foreground">
                     Envie uma mensagem para começar.
                 </div>
              )}
            </ScrollArea>
            
            {/* Input Form */}
            <form onSubmit={handleFormSubmit} className="p-4 border-t bg-background">
              <div className="relative flex items-center">
                <Input
                  value={input}
                  onChange={handleInputChange}
                  placeholder={
                    selectedConversationId
                      ? "Digite sua mensagem para Dr. Corvus..."
                      : "Selecione uma conversa"
                  }
                  className="pr-12"
                  disabled={!selectedConversationId || isLoadingMessages || isAiLoading} // Disable if no convo or loading
                data-testid="message-input"
              />
              <Button 
                type="submit"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  disabled={!selectedConversationId || isLoadingMessages || isAiLoading || !input.trim()} // More comprehensive disable check
                data-testid="send-message-button"
              >
                  {isAiLoading ? (
                     <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                  <SendHorizonal className="h-4 w-4" />
                  )}
              </Button>
              </div>
            </form>
          </>
        )}
      </div>
      
      {/* Patient Context Sidebar */} 
      <div className="w-1/4 border-l border-border bg-background p-4 hidden xl:flex flex-col">
        <h3 className="text-lg font-semibold mb-4">Contexto do Paciente</h3>
        {selectedPatientIdForChat && (
            <div className="mt-4 text-sm text-muted-foreground">
                Contexto: {patients.find(p => String(p.patient_id) === selectedPatientIdForChat)?.name || 'N/A'} {/* Use patient_id and compare as strings */}
            </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            {/* <AlertDialogTrigger>Open</AlertDialogTrigger> // Not needed if opened programmatically */}
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                    Tem certeza que deseja excluir esta conversa? Esta ação não pode ser desfeita e todas as mensagens serão perdidas permanentemente.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {isDeleting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                    ) : (
                        <Trash2 className="mr-2 h-4 w-4" />
                    )}
                   Excluir
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

    </div>
  );
} 