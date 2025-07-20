"use client";

import React from 'react';
import { CheckCircle, Activity, Zap } from 'lucide-react';
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
  const activeStepIndex = steps.findIndex(s => s.id === activeStepId);

  return (
    <div className="w-full py-6 px-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl shadow-lg mb-10 border-2 border-cyan-200 transition-all duration-300 hover:shadow-xl group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative z-10 flex items-center justify-center mb-4">
        <Activity className="h-5 w-5 text-cyan-600 mr-2" />
        <span className="text-sm font-medium text-cyan-700">Progresso da Simulação SNAPPS</span>
      </div>
      <nav aria-label="Progress" className="relative z-10">
        <ol role="list" className="flex items-center justify-between gap-2 relative">
          {/* Background connector line */}
          <div className="absolute top-1/2 left-8 right-8 h-2 bg-cyan-200 rounded-full -translate-y-1/2 -z-10" />
          {/* Active connector line */}
          <div 
            className="absolute top-1/2 left-8 h-2 bg-cyan-500 rounded-full -translate-y-1/2 transition-all duration-500 ease-in-out -z-10"
            style={{ 
              width: `calc(${Math.max(0, activeStepIndex) * (100 / (steps.length - 1))}% - 4rem + ${Math.max(0, activeStepIndex) * 4}rem / ${steps.length - 1})`,
              maxWidth: 'calc(100% - 4rem)'
            }}
          />
          {steps.map((step, stepIdx) => {
            const isCompleted = completedSteps.includes(step.id) || stepIdx < activeStepIndex;
            const isActive = step.id === activeStepId;
            const isFuture = !isCompleted && !isActive;
            const StepIcon = step.icon;

            return (
              <li
                key={step.id}
                className={cn(
                  'relative flex-1 flex flex-col items-center transition-all duration-300',
                  isActive && 'z-10',
                )}
              >
                <div
                  className={cn(
                    'relative flex flex-col items-center cursor-pointer group transition-all duration-300',
                    isActive ? 'scale-125 drop-shadow-xl' : 'hover:scale-110',
                  )}
                  tabIndex={0}
                  aria-current={isActive ? 'step' : undefined}
                  onClick={() => onStepClick(step.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') onStepClick(step.id);
                  }}
                >
                  <span
                    className={cn(
                      'flex h-16 w-16 items-center justify-center rounded-full ring-4 transition-all duration-300 shadow-lg',
                      {
                        'bg-cyan-600 text-white ring-cyan-300 shadow-xl hover:shadow-2xl': isCompleted && !isActive,
                        'bg-cyan-700 text-white ring-cyan-400 shadow-2xl border-4 border-white animate-pulse': isActive,
                        'bg-cyan-100 text-cyan-400 ring-cyan-200 opacity-70 group-hover:opacity-100 group-hover:bg-cyan-200 group-hover:text-cyan-600': isFuture,
                      }
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-9 w-9 text-white animate-bounceIn" />
                    ) : isActive ? (
                      <StepIcon className="h-9 w-9 animate-pulse text-white" />
                    ) : (
                      <StepIcon className="h-8 w-8" />
                    )}
                  </span>
                  <span className="mt-3 text-center">
                    <p
                      className={cn(
                        'text-base font-bold transition-colors duration-200',
                        isActive ? 'text-cyan-700' : isCompleted ? 'text-cyan-600' : 'text-gray-600 group-hover:text-cyan-700'
                      )}
                    >
                      {step.title}
                    </p>
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};
