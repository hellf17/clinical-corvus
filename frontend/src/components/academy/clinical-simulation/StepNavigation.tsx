import { WorkflowStepper } from './WorkflowStepper';
import type { WorkflowStep } from './WorkflowStepper';

interface StepNavigationProps {
  steps: WorkflowStep[];
  currentStepIndex: number;
  completedSteps?: string[];
  onStepClick: (stepId: string) => void;
}

export function StepNavigation({ steps, currentStepIndex, completedSteps = [], onStepClick }: StepNavigationProps) {
  const activeStepId = steps[currentStepIndex]?.id;

  return (
    <div className="w-full">
      <WorkflowStepper
        steps={steps}
        activeStepId={activeStepId}
        completedSteps={completedSteps}
        onStepClick={onStepClick}
      />
    </div>
  );
}
