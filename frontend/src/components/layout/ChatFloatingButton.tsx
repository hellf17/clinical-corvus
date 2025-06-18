import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

const ChatFloatingButton = () => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Link href="/chat">
        <Button 
          className="rounded-full h-14 w-14 md:h-16 md:w-16 flex items-center justify-center shadow-lg group relative"
          aria-label="Dr. Corvus Chat"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <svg
            className="h-6 w-6 md:h-7 md:w-7 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          
          {isHovered && (
            <span className="absolute -top-10 right-0 bg-white dark:bg-background text-foreground dark:text-white px-3 py-1 rounded-md shadow-md text-sm whitespace-nowrap">
              Dr. Corvus
            </span>
          )}
        </Button>
      </Link>
    </div>
  );
};

export default ChatFloatingButton; 