import ReactMarkdown from 'react-markdown';
import { Bot } from 'lucide-react';

interface FeedbackDisplayProps {
  feedback: string;
  title?: string;
}

export function FeedbackDisplay({ feedback, title = "Dr. Corvus" }: FeedbackDisplayProps) {
  if (!feedback) return null;
  
  return (
    <div className="space-y-3">
      <div className="flex items-center">
        <Bot className="h-4 w-4 mr-2 text-green-500" />
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <div className="ml-6 p-3 bg-green-50 rounded-md">
        <div className="text-sm prose prose-blue max-w-none prose-headings:text-cyan-700 prose-strong:text-cyan-700 prose-li:my-1">
          <ReactMarkdown>{feedback}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
