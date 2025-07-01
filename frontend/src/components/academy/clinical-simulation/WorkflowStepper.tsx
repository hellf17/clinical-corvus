"use client";

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkflowStep {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
}

interface WorkflowStepperProps {
  steps: WorkflowStep[];
  activeStepId: string;
  completedSteps: string[];
  onStepClick: (stepId: string) => void;
}

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  steps,
  activeStepId,
  completedSteps,
  onStepClick,
}) => {
  return (
    <div className="w-full p-4 border-b bg-gray-50/50 rounded-lg">
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center justify-between space-x-4 md:space-x-8">
          {steps.map((step, stepIdx) => {
            const isCompleted = completedSteps.includes(step.id);
            const isActive = activeStepId === step.id;
            const StepIcon = step.icon;

            return (
              <li key={step.title} className="relative flex-1">
                <div
                  className="group flex flex-col items-center text-center md:flex-row md:text-left w-full cursor-pointer"
                  onClick={() => onStepClick(step.id)}
                >
                  <span
                    className={cn(
                      'flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full group-hover:bg-blue-200 transition-colors duration-200',
                      isActive ? 'bg-blue-600 text-white ring-4 ring-blue-200' : isCompleted ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-600'
                    )}
                  >
                    {isCompleted ? <CheckCircle className="h-7 w-7" /> : <StepIcon className="h-7 w-7" />}
                  </span>
                  <span className="mt-2 md:mt-0 md:ml-4 flex flex-col">
                    <span className={cn('text-sm font-semibold', isActive ? 'text-blue-700' : 'text-gray-800')}>
                      {step.title}
                    </span>
                    <span className="text-xs text-gray-500 hidden lg:block">{step.description}</span>
                  </span>
                </div>
                {/* Connector Line */}
                {stepIdx !== steps.length - 1 ? (
                  <div className="absolute top-6 left-1/2 w-full h-0.5 bg-gray-200 -translate-x-1/2 md:translate-x-0 md:left-0 md:top-6" aria-hidden="true" />
                ) : null}
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};
