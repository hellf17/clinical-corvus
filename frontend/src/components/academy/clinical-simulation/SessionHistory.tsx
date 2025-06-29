import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { MessageSquare, User } from "lucide-react";
import { FeedbackDisplay } from "./FeedbackDisplay";
import { RefObject } from "react";

interface SNAPPSStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  userInput?: string;
  response?: string;
}

interface SessionHistoryProps {
  steps: SNAPPSStep[];
  responseRef: RefObject<HTMLDivElement | null>;
}

export function SessionHistory({ steps, responseRef }: SessionHistoryProps) {
  const completedSteps = steps.filter(step => step.completed);
  
  if (completedSteps.length === 0) return null;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-2" />
          Histórico da Sessão
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {completedSteps.map((step, index) => (
          <div 
            key={step.id} 
            className="space-y-3" 
            ref={index === completedSteps.length - 1 ? responseRef : undefined}
          >
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-blue-500" />
              <span className="font-semibold text-sm">{step.title}</span>
            </div>
            <div className="ml-6 p-3 bg-blue-50 rounded-md">
              <p className="text-sm">{step.userInput}</p>
            </div>
            
            {step.response && <FeedbackDisplay feedback={step.response} />}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
