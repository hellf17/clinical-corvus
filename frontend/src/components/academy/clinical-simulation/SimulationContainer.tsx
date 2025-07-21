'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { SimulationHeader } from './SimulationHeader';
import { SimulationWorkspace } from './SimulationWorkspace';
import { StepNavigation } from './StepNavigation';
import { SimulationSummaryDashboard } from './SimulationSummaryDashboard';
import { Button } from '@/components/ui/Button';
import { Loader2, Send, Search, Brain, CircleQuestionMark, Library, Target, Activity, Zap, Eye } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { ClinicalCase } from './cases';

// --- Type definitions based on the new stateful API ---

// From BAML: enum SNAPPSStep { SUMMARIZE, NARROW, ANALYZE, PROBE, PLAN, SELECT }
enum SNAPPSStep {
  SUMMARIZE = 'SUMMARIZE',
  NARROW = 'NARROW',
  ANALYZE = 'ANALYZE',
  PROBE = 'PROBE',
  PLAN = 'PLAN',
  SELECT = 'SELECT',
}

interface SessionState {
  case_context: ClinicalCase;
  student_summary?: string;
  student_ddx?: string[];
  student_analysis?: string;
  student_probe_questions?: string[];
  student_management_plan?: string;
  student_selected_topic?: string;
  feedback_history: string[];
}

interface SimulationContainerProps {
  selectedCase: ClinicalCase;
  onExit: () => void;
}

const snappsWorkflowSteps = [
  { id: SNAPPSStep.SUMMARIZE, title: 'Sumarizar (S)', description: 'Resuma o caso clínico em 1-2 frases.', icon: Search },
  { id: SNAPPSStep.NARROW, title: 'Afunilar DDx (N)', description: 'Liste 2-3 diagnósticos diferenciais.', icon: Brain },
  { id: SNAPPSStep.ANALYZE, title: 'Analisar DDx (A)', description: 'Compare e contraste seu DDx com base nos dados.', icon: Eye },
  { id: SNAPPSStep.PROBE, title: 'Sondar Preceptor (P)', description: 'Faça 1-2 perguntas para esclarecer dúvidas.', icon: Library },
  { id: SNAPPSStep.PLAN, title: 'Planejar Manejo (P)', description: 'Descreva seu plano de investigação e tratamento.', icon: Target },
  { id: SNAPPSStep.SELECT, title: 'Selecionar Tópico (S)', description: 'Escolha um tópico deste caso para estudar.', icon: Library },
];

export const SimulationContainer = ({ selectedCase, onExit }: SimulationContainerProps) => {
  const [sessionState, setSessionState] = useState<SessionState | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState('');
  const [feedbackHistory, setFeedbackHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);

  const initializeSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[SimulationContainer] Iniciando simulação clínica...', { 
        caseTitle: selectedCase.title,
        caseId: selectedCase.id,
      });
      
      const requestBody = { case_context: selectedCase };
      console.log('[SimulationContainer] Corpo da requisição:', requestBody);
      
      const response = await fetch('/api/clinical-simulation/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      console.log('[SimulationContainer] Resposta da API:', { 
        status: response.status, 
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Sem detalhes do erro');
        console.error('[SimulationContainer] Erro na API:', { 
          status: response.status, 
          error: errorText 
        });
        throw new Error(`Falha ao iniciar a simulação (${response.status}): ${errorText}`);
      }
      
      const initialSessionState: SessionState = await response.json();
      console.log('[SimulationContainer] Estado inicial da sessão recebido:', initialSessionState);
      setSessionState(initialSessionState);
    } catch (e: any) {
      console.error('[SimulationContainer] Erro ao inicializar simulação:', e);
      setError(e.message || 'Erro desconhecido ao iniciar simulação');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCase]);

  useEffect(() => {
    initializeSession();
  }, [initializeSession]);


  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-red-800">Ocorreu um Erro</h3>
        <p className="text-red-600 mt-2 text-center font-medium">{error}</p>
        <div className="mt-4 space-x-4">
          <button
            onClick={initializeSession}
            className=""
          >
            <Zap className="inline mr-2 h-4 w-4" />
            Tentar Novamente
          </button>
          <button
            onClick={onExit}
          >
            Sair da Simulação
          </button>
        </div>
      </div>
    );
  }

  const handleSubmitStep = async () => {
    if (!sessionState || !currentInput.trim()) return;

    setIsLoading(true);
    setError(null);

    const payload = {
      session_state: sessionState,
      current_step: snappsWorkflowSteps[currentStepIndex].id,
      current_input: currentInput,
    };

    try {
      const response = await fetch('/api/clinical-simulation/step-translated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro do servidor: ${errorText}`);
      }

      const result = await response.json();
      setSessionState(result.updated_session_state);
      setFeedbackHistory(prev => [...prev, {
        step: snappsWorkflowSteps[currentStepIndex].id,
        userInput: currentInput, // Add user input here
        feedback: result.feedback
      }]);
      setCurrentInput('');

      if (currentStepIndex === snappsWorkflowSteps.length - 1) {
        setIsCompleted(true);
        setShowChatHistory(true); // Show chat history first upon completion
      } else {
        setCurrentStepIndex(currentStepIndex + 1);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const resetSimulation = () => {
    setIsCompleted(false);
    setShowChatHistory(false); // Reset this state too
    setCurrentStepIndex(0);
    setCurrentInput('');
    setFeedbackHistory([]);
    initializeSession();
  };

  // Pre-simulation start screen
  if (!sessionState) {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-screen space-y-6 animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-cyan-200 rounded-full animate-spin">
              <div className="absolute top-0 left-0 w-16 h-16 border-4 border-cyan-600 rounded-full animate-pulse border-t-transparent"></div>
            </div>
            <Brain className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-6 w-6 text-cyan-600 animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-2xl font-bold text-gray-700 animate-pulse">Iniciando simulação clínica...</p>
            <p className="text-sm text-gray-500">Preparando ambiente de aprendizado avançado</p>
          </div>
          <div className="w-80 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full animate-pulse transition-all duration-1000" style={{ width: '75%' }}></div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="max-w-2xl mx-auto p-8 text-center bg-white rounded-lg shadow-xl border-l-4 border-red-500">
          <Alert variant="destructive" className="bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
            <AlertDescription className="text-lg font-medium">{error}</AlertDescription>
          </Alert>
          <div className="mt-6 flex justify-center gap-4">
            <Button onClick={initializeSession} size="lg" variant="default" className="">
              <Zap className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
            <Button onClick={onExit} variant="default" className="">
              Voltar
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto p-8 text-center bg-white rounded-2xl shadow-2xl border-t-4 border-cyan-500 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            {selectedCase.title}
          </h2>
          <p className="mt-4 text-lg text-gray-600 leading-relaxed">
            {selectedCase.brief}
          </p>
          <div className="mt-8 flex items-center justify-center space-x-2 mb-6">
            <Activity className="h-5 w-5 text-cyan-500" />
            <span className="text-sm text-gray-500">Simulação Clínica Interativa</span>
          </div>
          <Button onClick={initializeSession} size="lg" className="text-xl px-10 py-6 bg-cyan-600 hover:bg-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl">
            <Brain className="mr-3 h-6 w-6" />
            Começar Simulação
          </Button>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    const finalFeedback = feedbackHistory.find(f => f.step === SNAPPSStep.SELECT)?.feedback;
    const safeFeedback = finalFeedback || {
      key_strengths: [],
      areas_for_development: [],
      metacognitive_insight: 'Nenhum feedback final disponível.',
      performance_metrics: []
    };

    if (showChatHistory) {
      return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">Revisão da Simulação</h2>
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <SimulationWorkspace
              currentStep={{ id: 'REVIEW', title: 'Revisão Completa', description: 'Revise todas as suas interações na simulação.', completed: true }}
              isLoading={false}
              onInputChange={() => {}} // No input allowed in review mode
              onSubmitStep={() => {}} // No submission in review mode
              clinicalCase={selectedCase}
              feedbackHistory={feedbackHistory}
            />
          </div>
          <div className="mt-8 flex justify-center space-x-4">
            <Button onClick={() => setShowChatHistory(false)} variant="default" className="">
              <Activity className="mr-2 h-4 w-4" />
              Ver Dashboard de Performance
            </Button>
            <Button onClick={resetSimulation} variant="default" className="">
              <Brain className="mr-2 h-4 w-4" />
              Reiniciar Simulação
            </Button>
            <Button onClick={onExit} variant="default" className="">
              <Target className="mr-2 h-4 w-4" />
              Sair para Academia
            </Button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
          <SimulationSummaryDashboard feedback={safeFeedback} />
          <div className="mt-8 flex justify-center space-x-4">
            <Button onClick={() => setShowChatHistory(true)} variant="default" className="">
              <Eye className="mr-2 h-4 w-4" />
              Voltar para Histórico do Chat
            </Button>
            <Button onClick={resetSimulation} variant="default" className="">
              <Brain className="mr-2 h-4 w-4" />
              Reiniciar Simulação
            </Button>
            <Button onClick={onExit} variant="default" className="">
              <Target className="mr-2 h-4 w-4" />
              Sair para Academia
            </Button>
          </div>
        </div>
      );
    }
  }

  const currentWorkflowStep = snappsWorkflowSteps[currentStepIndex];
  const lastFeedbackForStep = [...feedbackHistory].reverse().find(f => f.step === currentWorkflowStep.id);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <SimulationHeader
        title={selectedCase.title}
        description={selectedCase.brief}
        showReset={true}
        onReset={resetSimulation}
      />
      <div className="mt-8 flex justify-end">
          <Button onClick={onExit} variant="ghost" className="text-cyan-600 hover:bg-cyan-50 transition-colors">
            <Eye className="mr-2 h-4 w-4" />
            Sair da Simulação
          </Button>
      </div>
      <div className="mt-8 flex flex-col gap-8">
        <StepNavigation
          steps={snappsWorkflowSteps.map(({id, title, icon, description}) => ({id, title, icon, description}))}
          currentStepIndex={currentStepIndex}
          completedSteps={feedbackHistory.map(f => f.step)}
          onStepClick={(stepId) => {
              const stepIndex = snappsWorkflowSteps.findIndex(s => s.id === stepId);
              if (stepIndex !== -1 && stepIndex < currentStepIndex) {
                  setCurrentStepIndex(stepIndex);
              }
          }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-3">
              <SimulationWorkspace
                currentStep={{
                    id: currentWorkflowStep.id,
                    title: currentWorkflowStep.title,
                    description: currentWorkflowStep.description,
                    userInput: currentInput,
                    completed: feedbackHistory.some(f => f.step === currentWorkflowStep.id),
                }}
                isLoading={isLoading}
                onInputChange={setCurrentInput}
                onSubmitStep={handleSubmitStep}
                clinicalCase={selectedCase}
                feedback={lastFeedbackForStep?.feedback}
                feedbackHistory={feedbackHistory}
              />
              <div className="mt-6 flex justify-between items-center">
                <Button onClick={handleBack} disabled={currentStepIndex === 0 || isLoading} variant="default" className="">
                  Anterior
                </Button>
                <Button onClick={handleSubmitStep} disabled={isLoading || !currentInput.trim()} variant="default" className="">
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="relative mr-2">
                        <div className="w-4 h-4 border-2 border-cyan-200 rounded-full animate-spin">
                          <div className="absolute top-0 left-0 w-4 h-4 border-2 border-cyan-600 rounded-full animate-pulse border-t-transparent"></div>
                        </div>
                      </div>
                      Processando...
                    </div>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {currentStepIndex === snappsWorkflowSteps.length - 1 ? 'Finalizar Simulação' : 'Enviar e Próximo'}
                    </>
                  )}
                </Button>
              </div>
              {error && (
                <Alert variant="destructive" className="mt-4 bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
                  <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
              )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationContainer;
