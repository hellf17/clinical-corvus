'use client';

import React, { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { SimulationHeader } from './SimulationHeader';
import { SimulationWorkspace } from './SimulationWorkspace';
import { StepNavigation } from './StepNavigation';
import { FeedbackDisplay } from './FeedbackDisplay';
import { Button } from '@/components/ui/Button';
import { Loader2, Send, Search, Brain, TrendingUp, Library, Target } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { ClinicalCase } from './cases';

// --- SNAPPS API Response Types ---
interface SummaryFeedbackOutput {
  feedback_strengths: string[];
  feedback_improvements: string[];
  missing_elements: string[];
  overall_assessment: string;
  next_step_guidance: string;
  socratic_questions: string[];
}

interface DifferentialAnalysisOutput {
  ddx_evaluation: {
    diagnosis: string;
    plausibility: 'Alta' | 'Moderada' | 'Baixa';
    supporting_findings: string[];
    contradicting_findings: string[];
  }[];
  missing_differentials: string[];
  prioritization_feedback: string;
  socratic_questions: string[];
  next_step_guidance: string;
}

interface AnalysisFeedbackOutput {
  response: string;
}

interface ProbeResponseOutput {
  answers_to_questions: { question: string; answer: string; rationale: string }[];
  additional_considerations: string[];
  counter_questions: string[];
  knowledge_gaps_identified: string[];
  learning_resources: string[];
}

interface PlanEvaluationOutput {
  plan_strengths: string[];
  plan_gaps: string[];
  investigation_priorities: string[];
  management_considerations: string[];
  safety_concerns: string[];
  cost_effectiveness_notes: string[];
  guidelines_alignment: string;
  next_step_guidance: string;
}

interface SessionSummaryOutput {
  overall_performance: string;
  key_strengths: string[];
  areas_for_development: string[];
  learning_objectives_met: string[];
  recommended_study_topics: string[];
  metacognitive_insights: string[];
  next_cases_suggestions: string[];
}

interface AllFeedback {
  summary: SummaryFeedbackOutput | null;
  differentials: DifferentialAnalysisOutput | null;
  analysis: AnalysisFeedbackOutput | null;
  probe: ProbeResponseOutput | null;
  plan: PlanEvaluationOutput | null;
  final: SessionSummaryOutput | null;
}

interface SimulationContainerProps {
  selectedCase: ClinicalCase;
  onExit: () => void;
}

const snappsWorkflowSteps = [
  { id: 'summary', title: 'S - Sumarizar', description: 'Resuma o caso clínico.', icon: Search },
  { id: 'differentials', title: 'N - Afunilar DDx', description: 'Liste seus diagnósticos.', icon: Brain },
  { id: 'analysis', title: 'A - Analisar DDx', description: 'Compare e contraste seu DDx.', icon: TrendingUp },
  { id: 'probe', title: 'P - Sondar Preceptor', description: 'Faça perguntas ao preceptor.', icon: Library },
  { id: 'plan', title: 'P - Planejar Manejo', description: 'Descreva seu plano.', icon: Target },
  { id: 'learningTopic', title: 'S - Selecionar Tópico', description: 'Escolha um tópico para estudar.', icon: Library },
];

// Helper to format the final feedback object into a markdown string
const formatFeedbackForDisplay = (feedback: AllFeedback | null): string => {
    if (!feedback || !feedback.final) return "## Feedback em Processamento\n\nAguarde um momento enquanto o Dr. Corvus prepara sua análise completa.";

    const { summary, differentials, analysis, probe, plan, final } = feedback;
    let markdown = `## Análise da Sessão de Simulação\n\n`;
    markdown += `**Avaliação Geral de Desempenho:** ${final.overall_performance}\n\n`;
    markdown += `### Principais Pontos Fortes\n${final.key_strengths.map(s => `- ${s}`).join('\n')}\n\n`;
    markdown += `### Áreas para Desenvolvimento\n${final.areas_for_development.map(a => `- ${a}`).join('\n')}\n\n`;

    if (summary) {
        markdown += `--- \n### Etapa 1: Resumo do Caso\n**Avaliação:** ${summary.overall_assessment}\n\n`;
    }
    if (differentials) {
        markdown += `--- \n### Etapa 2: Diagnósticos Diferenciais\n**Avaliação da Priorização:** ${differentials.prioritization_feedback}\n\n`;
    }
    if (analysis) {
        markdown += `--- \n### Etapa 3: Análise do DDx\n**Feedback:** ${analysis.response}\n\n`;
    }
    if (probe) {
        markdown += `--- \n### Etapa 4: Sondagem ao Preceptor\n**Insights sobre as Perguntas:**\n${probe.answers_to_questions.map(a => `- **Q:** ${a.question}\n  - **R:** ${a.answer}`).join('\n')}\n\n`;
    }
    if (plan) {
        markdown += `--- \n### Etapa 5: Plano de Manejo\n**Pontos Fortes do Plano:**\n${plan.plan_strengths.map(s => `- ${s}`).join('\n')}\n\n**Lacunas no Plano:**\n${plan.plan_gaps.map(g => `- ${g}`).join('\n')}\n\n`;
    }
    if (final.recommended_study_topics.length > 0) {
        markdown += `--- \n### Tópicos de Estudo Recomendados\n${final.recommended_study_topics.map(t => `- ${t}`).join('\n')}\n\n`;
    }

    return markdown;
};

const SimulationContainer: React.FC<SimulationContainerProps> = ({ selectedCase, onExit }) => {
  const { getToken } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [snappsInputs, setSnappsInputs] = useState({
    summary: '',
    differentials: '',
    analysis: '',
    probe: '',
    plan: '',
    learningTopic: '',
  });

  const [feedback, setFeedback] = useState<AllFeedback | null>(null);

  const handleInputChange = (value: string) => {
    const currentKey = snappsWorkflowSteps[currentStep].id as keyof typeof snappsInputs;
    setSnappsInputs(prev => ({ ...prev, [currentKey]: value }));
  };

  const handleNext = () => {
    if (currentStep < snappsWorkflowSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleBatchSubmit = async () => {
    setIsLoading(true);
    setError(null);
    const token = await getToken();

    if (!token) {
      setError('Authentication error. Please log in again.');
      setIsLoading(false);
      return;
    }

    const accumulatedFeedback: Partial<AllFeedback> = {};
    let sessionContext: any = {};

    try {
      const callSnappsApi = async (endpoint: string, payload: any) => {
        const response = await fetch(`/api/clinical-assistant/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred.' }));
          throw new Error(`API Error at ${endpoint}: ${errorData.message || response.statusText}`);
        }
        return response.json();
      };

      // Step 1: Summarize
      const summaryPayload = {
        case_description: `${selectedCase.fullDescription} ${selectedCase.presentingHistory}`,
        student_summary: snappsInputs.summary,
        case_context: {
          demographics: selectedCase.demographics,
          chief_complaint: selectedCase.chiefComplaint,
          physical_exam: selectedCase.physicalExam,
          vital_signs: selectedCase.vitalSigns,
        },
      };
      accumulatedFeedback.summary = await callSnappsApi('evaluate-summary-snapps', summaryPayload);
      sessionContext.summary = snappsInputs.summary;

      // Step 2: Narrow DDx
      const differentialsList = snappsInputs.differentials.split(/,|\n/).map(dx => dx.trim()).filter(dx => dx);
      const ddxPayload = {
        case_summary: sessionContext.summary,
        student_differential_diagnoses: differentialsList,
        case_context: {
          expected_differentials: selectedCase.expectedDifferentials || [],
          learning_objectives: selectedCase.learningObjectives || [],
        },
      };
      accumulatedFeedback.differentials = await callSnappsApi('analyze-differential-diagnoses-snapps', ddxPayload);
      sessionContext.differentials = differentialsList;

      // Step 3: Analyze DDx
      const analysisPayload = {
        case_summary: sessionContext.summary,
        differential_diagnoses: sessionContext.differentials,
        student_analysis: snappsInputs.analysis,
        case_context: {
          expert_analysis: selectedCase.expertAnalysis,
        },
      };
      accumulatedFeedback.analysis = await callSnappsApi('facilitate-ddx-analysis-snapps', analysisPayload);
      sessionContext.analysis = snappsInputs.analysis;

      // Step 4: Probe Preceptor
      const probePayload = {
        case_summary: sessionContext.summary,
        session_context: sessionContext,
        student_questions: snappsInputs.probe,
        case_data: selectedCase,
      };
      accumulatedFeedback.probe = await callSnappsApi('answer-probe-questions-snapps', probePayload);
      sessionContext.probeQuestions = snappsInputs.probe;

      // Step 5: Plan Management
      const planPayload = {
        case_summary: sessionContext.summary,
        session_context: sessionContext,
        student_plan: snappsInputs.plan,
        case_data: selectedCase,
      };
      accumulatedFeedback.plan = await callSnappsApi('evaluate-management-plan-snapps', planPayload);
      sessionContext.plan = snappsInputs.plan;

      // Step 6: Select Learning Topic & Get Final Summary
      const finalPayload = {
        full_session_context: sessionContext,
        student_selected_topic: snappsInputs.learningTopic,
        case_data: selectedCase,
        session_history: snappsInputs,
      };
      accumulatedFeedback.final = await callSnappsApi('provide-session-summary-snapps', finalPayload);

      setFeedback(accumulatedFeedback as AllFeedback);
      setIsCompleted(true);

    } catch (e: any) {
      setError(e.message || 'An error occurred during submission. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const resetSimulation = () => {
    setIsCompleted(false);
    setCurrentStep(0);
    setSnappsInputs({ summary: '', differentials: '', analysis: '', probe: '', plan: '', learningTopic: '' });
    setFeedback(null);
  };

  if (isCompleted && feedback) {
    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <FeedbackDisplay feedback={formatFeedbackForDisplay(feedback)} />
            <div className="mt-6 flex justify-center space-x-4">
                <Button onClick={resetSimulation} variant="outline">
                    Reiniciar Simulação
                </Button>
                 <Button onClick={onExit} variant="secondary">
                    Sair para Academia
                </Button>
            </div>
        </div>
    );
  }

  const currentWorkflowStep = snappsWorkflowSteps[currentStep];
  const allInputsCollected = Object.values(snappsInputs).every(input => input.trim() !== '');
  const completedSteps = Object.keys(snappsInputs).filter(key => snappsInputs[key as keyof typeof snappsInputs].trim() !== '');

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <SimulationHeader
        title={selectedCase.title}
        description={selectedCase.brief}
        showReset={true}
        onReset={resetSimulation}
      />
      <div className="mt-8 flex justify-end">
          <Button onClick={onExit} variant="ghost">Sair da Simulação</Button>
      </div>
      <div className="mt-8 flex flex-col gap-8">
        <StepNavigation
          steps={snappsWorkflowSteps}
          currentStepIndex={currentStep}
          completedSteps={completedSteps}
          onStepClick={(stepId) => {
              const stepIndex = snappsWorkflowSteps.findIndex(s => s.id === stepId);
              if (stepIndex !== -1) setCurrentStep(stepIndex);
          }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-3">
              <SimulationWorkspace
                currentStep={{
                    id: currentWorkflowStep.id,
                    title: currentWorkflowStep.title,
                    description: currentWorkflowStep.description,
                    completed: snappsInputs[currentWorkflowStep.id as keyof typeof snappsInputs].trim() !== '',
                    userInput: snappsInputs[currentWorkflowStep.id as keyof typeof snappsInputs],
                }}
                currentStepIndex={currentStep}
                isLoading={isLoading}
                showSubmitSuccess={false}
                batchMode={true}
                allInputsCollected={allInputsCollected}
                onInputChange={handleInputChange}
                onSubmitStep={() => {}} 
                onBatchSubmit={handleBatchSubmit}
                clinicalCase={selectedCase}
              />
              <div className="mt-6 flex justify-between items-center">
                <Button onClick={handleBack} disabled={currentStep === 0 || isLoading}>
                  Anterior
                </Button>
                
                {currentStep < snappsWorkflowSteps.length - 1 ? (
                  <Button onClick={handleNext} disabled={isLoading}>
                    Próximo
                  </Button>
                ) : (
                  <Button onClick={handleBatchSubmit} disabled={isLoading || !allInputsCollected} className="bg-green-600 hover:bg-green-700">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Analisar Caso Completo
                  </Button>
                )}
              </div>
              {error && <Alert variant="destructive" className="mt-4"><AlertDescription>{error}</AlertDescription></Alert>}
            </div>
        </div>
      </div>
    </div>
  );
};

export default SimulationContainer;
