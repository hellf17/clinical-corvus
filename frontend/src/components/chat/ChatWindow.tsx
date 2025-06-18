import React, { useRef, useEffect, useState } from 'react';
import ChatMessage from './ChatMessage';
import QuickReplies from './QuickReplies'; // Path is correct, ensure file exists and extension matches (should be .tsx)
import { PatientContext } from '../../types/chat'; // Remove Message import
import { Message } from 'ai/react'; // Import Message from ai/react

interface ChatWindowProps {
  messages: Message[]; // Use imported Message type
  onSendMessage: (text: string) => void;
  quickReplies?: string[];
  onQuickReply?: (reply: string) => void;
  patientContext?: PatientContext; // Use PatientContext type
}

const ChatWindow = ({ messages, onSendMessage, quickReplies, onQuickReply, patientContext }: ChatWindowProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSending, setIsSending] = useState<boolean>(false); // Loading state
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Foco automático no input ao abrir o chat
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // State for the input field
  const [inputText, setInputText] = useState('');

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (inputText.trim()) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  // Handler para cliques nas Quick Replies
  const handleQuickReply = (replyText: string) => {
    if (inputRef.current) {
      inputRef.current.value = replyText; // Preenche o input
      inputRef.current.focus(); // Foca no input
    }
  };

  return (
    <aside
      className="fixed bottom-0 text-foreground w-full md:w-96 h-[60vh] md:h-[80vh] bg-bg-background border-t md:border-l border-border-primary dark:border-border-foreground shadow-lg flex flex-col z-50"
      role="complementary"
      aria-label="Janela de chat"
    >
      <header className="p-4 border-b border-border-primary dark:border-border-foreground flex items-center justify-between">
        <h2 className="font-semibold text-lg">Chat</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-4" aria-live="polite" aria-atomic="false">
        {messages.length === 0 && (
          <div className="text-muted-foreground text-center">Nenhuma mensagem ainda.</div>
        )}
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      {quickReplies && quickReplies.length > 0 && (
        <QuickReplies onReplyClick={onQuickReply} />
      )}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border-primary dark:border-border-foreground flex gap-2">
        <input
          ref={inputRef}
          type="text"
          className="flex-1 rounded border border-border-primary px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
          placeholder={isSending ? "Sending..." : "Digite sua mensagem..."}
          tabIndex={0}
          aria-label="Digite sua mensagem"
          disabled={isSending}
          value={inputText}
          onChange={handleInputChange}
        />
        <button
          type="submit"
          className="rounded bg-primary text-white px-4 py-2 min-w-[44px] min-h-[44px] disabled:opacity-50"
          tabIndex={0}
          disabled={isSending}
        >
          {isSending ? '...' : 'Enviar'}
        </button>
      </form>
    </aside>
  );
};

export default ChatWindow;
