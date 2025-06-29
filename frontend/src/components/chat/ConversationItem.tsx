import React from 'react';
import { Button } from '@/components/ui/Button';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConversationItemProps extends React.HTMLAttributes<HTMLButtonElement> {
  message: string;
  timestamp?: string;
  isActive?: boolean;
  onDelete?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const ConversationItem = React.forwardRef<HTMLButtonElement, ConversationItemProps>(
  ({ className, message, timestamp, isActive, onDelete, onClick, ...props }, ref) => {
    
    const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      onDelete?.(e);
    };

  return (
      <Button
        ref={ref}
        variant="ghost"
        onClick={onClick}
        className={cn(
          "group relative flex h-auto flex-col items-start justify-between px-3 py-2 w-full text-left whitespace-normal hover:bg-accent",
          isActive ? "bg-accent text-accent-foreground" : "text-foreground",
          className
        )}
        {...props}
      >
        <div className="flex justify-between w-full items-center">
          <div className="flex-1 overflow-hidden mr-2">
              <p className="text-sm font-medium truncate">{message}</p>
             {timestamp && <p className="text-xs text-muted-foreground">{timestamp}</p>}
          </div>
          
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleDeleteClick}
              aria-label="Delete conversation"
              data-testid="delete-conversation-button"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
    </div>
      </Button>
  );
}
);

ConversationItem.displayName = "ConversationItem";

export default ConversationItem;
