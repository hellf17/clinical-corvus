"use client";

import React from 'react';
import { TrendingUp, Library, Search, Brain, RotateCcw, CheckCircle, ArrowRight, Target, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react'; // Import as type if possible, or use ElementType
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';

export interface WorkflowStep {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  statusText?: string; // e.g., "Viés X Selecionado" or "Caso analisado"
  statusTextBadgeClasses?: string; // e.g., "text-xs bg-emerald-100 text-emerald-800 border-emerald-200"
  isStatusTextVisibleWhenCompleted?: boolean;
  targetIcon?: React.ElementType;
}

interface IntegratedWorkflowCardProps {
  title: string;
  subtitle: string;
  steps: WorkflowStep[];
  activeStepId: string;
  completedSteps: string[];
  onStepClick: (stepId: string) => void;
  themeColorName: 'purple' | 'blue' | 'teal' | 'green' | 'indigo'; // Extend as needed
  totalSteps: number;
  integrationInfo?: React.ReactNode;
  mainIcon?: React.ElementType;
}

const themeStyles = {
  purple: {
    cardBg: 'bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50',
    cardBorder: 'border-purple-200',
    iconContainerBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    titleColor: 'text-purple-900',
    descriptionColor: 'text-purple-700',
    activeStepBg: 'bg-purple-100',
    activeStepBorder: 'border-purple-300',
    activeStepRing: 'ring-purple-200',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-300',
  },
  blue: {
    cardBg: 'bg-gradient-to-br from-blue-100 via-sky-100 to-cyan-100',
    cardBorder: 'border-blue-200',
    iconContainerBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    titleColor: 'text-blue-900',
    descriptionColor: 'text-blue-700',
    activeStepBg: 'bg-blue-100',
    activeStepBorder: 'border-blue-300',
    activeStepRing: 'ring-blue-200',
    badgeText: 'text-blue-700',
    badgeBorder: 'border-blue-300',
  },
  teal: {
    cardBg: 'bg-gradient-to-br from-teal-100 via-emerald-100 to-green-100',
    cardBorder: 'border-teal-200',
    iconContainerBg: 'bg-teal-100',
    iconColor: 'text-teal-600',
    titleColor: 'text-teal-900',
    descriptionColor: 'text-teal-700',
    activeStepBg: 'bg-teal-100',
    activeStepBorder: 'border-teal-300',
    activeStepRing: 'ring-teal-200',
    badgeText: 'text-teal-700',
    badgeBorder: 'border-teal-300',
  },
  green: {
    cardBg: 'bg-gradient-to-br from-green-50 via-emerald-50 to-lime-50',
    cardBorder: 'border-green-300',
    iconContainerBg: 'bg-green-100',
    iconColor: 'text-[#4d9e3f]',
    titleColor: 'text-green-900',
    descriptionColor: 'text-[#4d9e3f]',
    activeStepBg: 'bg-green-100',
    activeStepBorder: 'border-green-400',
    activeStepRing: 'ring-green-300',
    badgeText: 'text-[#4d9e3f]',
    badgeBorder: 'border-green-400',
  },
  indigo: {
    cardBg: 'bg-gradient-to-br from-indigo-50 via-blue-50 to-purple-50',
    cardBorder: 'border-indigo-200',
    iconContainerBg: 'bg-indigo-100',
    iconColor: 'text-indigo-600',
    titleColor: 'text-indigo-900',
    descriptionColor: 'text-indigo-700',
    activeStepBg: 'bg-indigo-100',
    activeStepBorder: 'border-indigo-300',
    activeStepRing: 'ring-indigo-200',
    badgeText: 'text-indigo-700',
    badgeBorder: 'border-indigo-300',
  },
  cyan: {
    cardBg: 'bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50',
    cardBorder: 'border-cyan-200',
    iconContainerBg: 'bg-cyan-100',
    iconColor: 'text-cyan-600',
    titleColor: 'text-cyan-900',
    descriptionColor: 'text-cyan-700',
    activeStepBg: 'bg-cyan-100',
    activeStepBorder: 'border-cyan-300',
    activeStepRing: 'ring-cyan-200',
    badgeText: 'text-cyan-700',
    badgeBorder: 'border-cyan-300',
  }
}

export const IntegratedWorkflowCard: React.FC<IntegratedWorkflowCardProps> = ({
  title,
  subtitle,
  steps,
  activeStepId,
  completedSteps,
  onStepClick,
  themeColorName,
  totalSteps,
  integrationInfo,
  mainIcon: MainIcon = TrendingUp, // Default icon for the card header
}) => {
  const currentTheme = themeStyles[themeColorName];

  return (
    <section className="mt-12">
      <div className={`p-8 ${currentTheme.cardBg} ${currentTheme.cardBorder} rounded-xl shadow-lg`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className={`w-12 h-12 ${currentTheme.iconContainerBg} rounded-full flex items-center justify-center mr-4`}>
              <MainIcon className={`h-6 w-6 ${currentTheme.iconColor}`} />
            </div>
            <div>
              <h3 className={`text-2xl font-bold ${currentTheme.titleColor}`}>{title}</h3>
              <p className={`${currentTheme.descriptionColor} mt-1`}>{subtitle}</p>
            </div>
          </div>
          <Badge variant="outline" className={`bg-white ${currentTheme.badgeText} ${currentTheme.badgeBorder}`}>
            {completedSteps.length || 0}/{totalSteps} Completas
          </Badge>
        </div>

        {/* Steps Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-${steps.length > 2 ? '4' : steps.length} gap-6 mb-8`}> 
          {steps.map((step) => {
            const StepIcon = step.icon;
            const TargetStepIcon = step.targetIcon || ArrowRight;
            const isCompleted = completedSteps.includes(step.id);
            const isActive = activeStepId === step.id;
            const showStatusBadge = step.isStatusTextVisibleWhenCompleted && step.statusText && isCompleted;

            return (
              <div 
                key={step.id}
                className={`relative p-6 rounded-lg border transition-all duration-300 cursor-pointer group ${
                  isActive 
                    ? `${currentTheme.activeStepBg} ${currentTheme.activeStepBorder} ring-2 ${currentTheme.activeStepRing} shadow-md` 
                    : isCompleted
                    ? 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100' // Standard completion color
                    : 'bg-white/80 border-gray-200 hover:bg-white hover:shadow-md' // Default non-completed, non-active
                }`} 
                onClick={() => onStepClick(step.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 ${currentTheme.iconContainerBg} rounded-full flex items-center justify-center`}>
                    <StepIcon className={`h-5 w-5 ${currentTheme.iconColor}`} />
                  </div>
                  {isCompleted && (
                    <CheckCircle className="w-5 h-5 text-emerald-600" /> // Standard completion icon
                  )}
                </div>
                <h4 className={`font-bold ${currentTheme.titleColor} text-lg`}>{step.title}</h4>
                <p className={`text-sm ${currentTheme.descriptionColor} mt-1`}>{step.description}</p>
                {showStatusBadge && (
                  <div className="mt-3">
                    <Badge variant="outline" className={step.statusTextBadgeClasses || 'text-xs bg-emerald-100 text-emerald-800 border-emerald-200'}>
                      ✓ {step.statusText}
                    </Badge>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <TargetStepIcon className={`w-4 h-4 ${currentTheme.iconColor}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Integration Info (Optional) */}
        {integrationInfo}
      </div>
    </section>
  );
};
