import React from 'react';
import { Message } from 'ai/react';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const timestamp = message.createdAt ? new Date(message.createdAt) : null;
  const formattedTime = timestamp 
    ? timestamp.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-none'
            : 'bg-muted dark:bg-muted rounded-tl-none'
        }`}
      >
        <div className="flex flex-col">
          <div className={`text-sm ${isUser ? 'text-primary-foreground opacity-80' : 'text-muted-foreground'}`}>
            {isUser ? 'Você' : 'Dr. Corvus'}
          </div>
          <div className="whitespace-pre-wrap">{message.content}</div>
          {formattedTime && (
            <div
              className={`text-xs mt-1 self-end ${
                isUser ? 'text-primary-foreground opacity-80' : 'text-muted-foreground dark:text-muted-foreground/70'
              }`}
            >
              {formattedTime}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage; 