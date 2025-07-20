import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { RefreshCw, CheckCircle, Send, User, Bot, ChevronDown, ChevronUp, Brain, Activity, Zap, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from "react";

// Import new structured feedback components
import SummaryFeedbackComponent from './SummaryFeedbackComponent';
import DifferentialFeedbackComponent from './DifferentialFeedbackComponent';
import AnalysisFeedbackComponent from './AnalysisFeedbackComponent';
import ProbeFeedbackComponent from './ProbeFeedbackComponent';
import PlanFeedbackComponent from './PlanFeedbackComponent';
import SessionSummaryComponent from './SessionSummaryComponent';

// Import data interfaces for feedback components
import { SummaryFeedbackData } from './SummaryFeedbackComponent';
import { DifferentialFeedbackData } from './DifferentialFeedbackComponent';
import { AnalysisFeedbackData } from './AnalysisFeedbackComponent';
import { ProbeFeedbackData } from './ProbeFeedbackComponent';
import { PlanFeedbackData } from './PlanFeedbackComponent';
import { SessionSummaryData } from './SessionSummaryComponent';

// Interfaces for the Simulation Workspace
interface SNAPPSStep {
  id: string;
  title: string;
  description: string;
  userInput?: string;
  completed: boolean;
}

interface ChatMessage {
  sender: 'user' | 'ai';
  content: React.ReactNode;
}

interface SubmissionFeedback extends
  SummaryFeedbackData,
  DifferentialFeedbackData,
  AnalysisFeedbackData,
  ProbeFeedbackData,
  PlanFeedbackData,
  SessionSummaryData {}

interface Submission {
  step: string;
  userInput: string; // Added userInput to match SimulationContainer
  feedback: SubmissionFeedback;
}

interface SimulationWorkspaceProps {
  currentStep: SNAPPSStep;
  isLoading: boolean;
  onInputChange: (value: string) => void;
  onSubmitStep: () => void;
  clinicalCase?: any; 
  feedback?: any; 
  feedbackHistory: Submission[];
}

export function SimulationWorkspace({
  currentStep,
  isLoading,
  onInputChange,
  onSubmitStep,
  clinicalCase,
  feedbackHistory
}: SimulationWorkspaceProps) {
  const [isCaseInfoOpen, setIsCaseInfoOpen] = useState(true);

  const getPlaceholderText = (stepId: string) => {
    const placeholders: { [key: string]: string } = {
      SUMMARIZE: 'Ex: Paciente masculino, 58 anos, com dor torácica opressiva há 2 horas...',
      NARROW: 'Ex: 1. Infarto Agudo do Miocárdio, 2. Embolia Pulmonar, 3. Dissecção de Aorta',
      ANALYZE: 'Ex: O IAM é mais provável pela natureza da dor e fatores de risco...',
      PROBE: 'Ex: O eletrocardiograma mostrou alguma alteração de segmento ST?',
      PLAN: 'Ex: Solicitar ECG, troponinas seriadas, D-dímero. Iniciar AAS...',
      SELECT: 'Ex: Gostaria de aprender mais sobre a interpretação de alterações do segmento ST.',
    };
    return placeholders[stepId as keyof typeof placeholders] || 'Digite sua resposta...';
  };

  const getStepTitle = (stepId: string) => {
    const titles: { [key: string]: string } = {
      SUMMARIZE: 'Resumo do Caso',
      NARROW: 'Diagnósticos Diferenciais',
      ANALYZE: 'Análise Comparativa',
      PROBE: 'Investigação',
      PLAN: 'Plano de Ação',
      SELECT: 'Aprendizado Selecionado',
    };
    return titles[stepId as keyof typeof titles] || stepId;
  };

  const splitFeedback = (content: any): string[] => {
    if (!content) return [];
    if (Array.isArray(content)) return content.filter(Boolean);
    if (typeof content === 'string' && content.includes('\n')) return content.split(/\n+/).filter(Boolean);
    return [String(content)].filter(Boolean);
  };

  const renderCaseInfo = () => {
    if (!clinicalCase) return null;
    return (
      <section
        className={cn(
          'mb-4 rounded-xl border bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200 shadow-lg transition-all duration-300 overflow-hidden group',
          isCaseInfoOpen ? 'max-h-96' : 'max-h-16'
        )}
        aria-label="Informações do Caso"
      >
        <button
          className="w-full flex items-center justify-between p-4 focus:outline-none focus:ring-2 focus:ring-cyan-400 cursor-pointer bg-transparent hover:bg-cyan-100/50 transition-colors duration-200"
          onClick={() => setIsCaseInfoOpen((v) => !v)}
          aria-expanded={isCaseInfoOpen}
          aria-controls="case-info-panel"
        >
          <h4 className="font-semibold text-lg text-left text-cyan-800 flex items-center">
            <Activity className="mr-2 h-5 w-5 text-cyan-600" />
            Informações do Caso
          </h4>
          {isCaseInfoOpen ? <ChevronUp className="h-5 w-5 text-cyan-600" /> : <ChevronDown className="h-5 w-5 text-cyan-600" />}
        </button>
        <div
          id="case-info-panel"
          className={cn(
            'transition-all duration-300 px-4',
            isCaseInfoOpen ? 'opacity-100 py-2' : 'opacity-0 py-0 pointer-events-none h-0'
          )}
          tabIndex={-1}
        >
          {isCaseInfoOpen && (
            <div className="text-base space-y-3">
              <p><strong className="text-cyan-700">Queixa Principal:</strong> <span className="text-gray-700">{clinicalCase.brief}</span></p>
              <p><strong className="text-cyan-700">Detalhes:</strong> <span className="text-gray-700">{clinicalCase.details}</span></p>
            </div>
          )}
        </div>
      </section>
    );
  };

  const renderChatDialog = () => {
    const messages: ChatMessage[] = [];

    // Show all historical submissions across all steps
    const allSubmissions = feedbackHistory;
    
    if (allSubmissions.length > 0) {
      // Group submissions by step
      const submissionsByStep = allSubmissions.reduce((acc, submission) => {
        if (!acc[submission.step]) {
          acc[submission.step] = [];
        }
        acc[submission.step].push(submission);
        return acc;
      }, {} as Record<string, Submission[]>);

      // Add historical submissions
      Object.entries(submissionsByStep).forEach(([stepId, submissions]) => {
        const stepTitle = getStepTitle(stepId);
        
        // Add step header
        messages.push({
          sender: 'ai',
          content: <div className="font-bold text-cyan-700 border-b border-cyan-200 pb-1 mb-2">{stepTitle}</div>
        });

        submissions.forEach((submission: Submission) => {
          // Render user input
          messages.push({ sender: 'user', content: submission.userInput });

          // Render structured feedback component based on step
          switch (stepId) {
            case 'SUMMARIZE':
              messages.push({ sender: 'ai', content: <SummaryFeedbackComponent feedback={submission.feedback} userInput={submission.userInput} /> });
              break;
            case 'NARROW':
              messages.push({ sender: 'ai', content: <DifferentialFeedbackComponent feedback={submission.feedback} userInput={submission.userInput} /> });
              break;
            case 'ANALYZE':
              messages.push({ sender: 'ai', content: <AnalysisFeedbackComponent feedback={submission.feedback} userInput={submission.userInput} /> });
              break;
            case 'PROBE':
              messages.push({ sender: 'ai', content: <ProbeFeedbackComponent feedback={submission.feedback} userInput={submission.userInput} /> });
              break;
            case 'PLAN':
              messages.push({ sender: 'ai', content: <PlanFeedbackComponent feedback={submission.feedback} userInput={submission.userInput} /> });
              break;
            case 'SELECT':
              messages.push({ sender: 'ai', content: <SessionSummaryComponent feedback={submission.feedback} userInput={submission.userInput} /> });
              break;
            default:
              // Fallback for any unhandled steps or generic feedback
              messages.push({ sender: 'ai', content: JSON.stringify(submission.feedback, null, 2) });
              break;
          }
        });
      });
    }

    // Add current step instruction
    messages.push({
      sender: 'ai',
      content: <div className="font-bold text-cyan-700 border-t border-cyan-200 pt-2 mt-2">Passo Atual: {currentStep.description}</div>
    });

    return (
      <div className="mt-4 space-y-6 flex flex-col">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={cn(
              'flex items-start max-w-[85%] gap-3 transition-all duration-200 hover:scale-105',
              msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'
            )}
          >
            <span className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold shadow-lg',
              msg.sender === 'ai' ? 'bg-cyan-100 text-cyan-700 border-2 border-cyan-300' : 'bg-cyan-600 text-white'
            )}>
              {msg.sender === 'ai' ? <Brain size={18} /> : <User size={18} />}
            </span>
            <div
              className={cn(
                'rounded-lg px-4 py-3 text-sm shadow-md transition-all duration-200',
                msg.sender === 'ai'
                  ? 'bg-gradient-to-r from-cyan-50 to-blue-50 text-gray-800 border border-cyan-200'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {!currentStep.completed && (
          <div className="mt-4 flex w-full items-center space-x-2 self-center pt-4 border-t-2 border-cyan-200">
            <Textarea
              placeholder={getPlaceholderText(currentStep.id)}
              value={currentStep.userInput || ''}
              onChange={(e) => onInputChange(e.target.value)}
              className="flex-1 bg-gradient-to-r from-cyan-50 to-blue-50 text-gray-800 placeholder:text-cyan-600 rounded-lg border-2 border-cyan-200 focus:border-cyan-500 focus:ring-cyan-500 transition-all duration-300 shadow-sm"
              rows={3}
              disabled={isLoading}
            />
          </div>
        )}
      </div>
    );
  };


  return (
    <Card className="relative overflow-hidden group hover:shadow-xl transition-all duration-300 border-l-4 border-cyan-600">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <CardHeader className="relative z-10">
        <CardTitle className="flex items-center text-xl font-semibold text-cyan-800">
          <Zap className="mr-3 h-6 w-6 text-cyan-600" />
          {currentStep.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        {renderCaseInfo()}
        {renderChatDialog()}
      </CardContent>
    </Card>
  );
}
