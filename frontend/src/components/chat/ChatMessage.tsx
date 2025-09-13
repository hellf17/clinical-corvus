import React from 'react';
import { UIMessage as Message } from '@ai-sdk/react';
import type { ToolUIPart } from 'ai';
import { ToolResult } from './ToolResult';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  
  // Try to get timestamp from metadata or use null as fallback
  let timestamp = null;
  if (message.metadata && typeof message.metadata === 'object' && 'timestamp' in message.metadata) {
    timestamp = new Date(message.metadata.timestamp as string | number | Date);
  }
  
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
          {message.parts && message.parts.length > 0 ? (
            message.parts.map((part, index) => {
              // Type guard for tool parts
              if (part.type.startsWith('tool-') && 'toolCallId' in part) {
                const toolPart = part as ToolUIPart;
                return (
                  <ToolResult
                    key={`${toolPart.toolCallId}-${index}`}
                    toolName={toolPart.type.replace('tool-', '')}
                    toolData={toolPart.state === 'output-available' ? toolPart.output : undefined}
                  />
                );
              }
              if (part.type === 'text') {
                return (
                  <div key={index} className="whitespace-pre-wrap">
                    {part.text}
                  </div>
                );
              }
              return null;
            })
          ) : (
            <div className="whitespace-pre-wrap">
              {/* Fallback to content if parts don't exist */}
              {'content' in message ? (message.content as string) : ''}
            </div>
          )}
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