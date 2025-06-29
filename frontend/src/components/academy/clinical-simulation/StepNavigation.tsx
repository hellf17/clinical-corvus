import { IntegratedWorkflowCard, WorkflowStep } from '@/components/academy/IntegratedWorkflowCard';

interface StepNavigationProps {
  steps: WorkflowStep[];
  currentStepIndex: number;
  completedSteps?: string[];
  onStepClick: (stepId: string) => void;
}

export function StepNavigation({ steps, currentStepIndex, completedSteps = [], onStepClick }: StepNavigationProps) {
  // Map currentStepIndex to step id
  const activeStepId = steps[currentStepIndex]?.id;
  // Defensive: Provide a default no-op if onStepClick is not supplied (should never happen)
  const handleStepClick = onStepClick || (() => {});
  return (
    <div className="w-full md:w-1/3 lg:w-1/4 space-y-4">
      <IntegratedWorkflowCard
        steps={steps}
        activeStepId={activeStepId}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
        title={"Workflow"}
        subtitle={""}
        themeColorName={"blue"}
        totalSteps={steps.length}
      />
    </div>
  );
}
