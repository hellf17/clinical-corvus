import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Input } from "@/components/ui/Input";
import { RefreshCw, Send, CheckCircle } from "lucide-react";
import { useState } from "react";

interface SNAPPSStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  userInput?: string;
  response?: string;
}

interface SimulationWorkspaceProps {
  currentStep: SNAPPSStep;
  currentStepIndex: number;
  isLoading: boolean;
  showSubmitSuccess: boolean;
  batchMode: boolean;
  allInputsCollected: boolean;
  onInputChange: (value: string) => void;
  onSubmitStep: () => void;
  onBatchSubmit: () => void;
  clinicalCase?: any; // Type can be refined based on actual case structure
}

export function SimulationWorkspace({
  currentStep,
  currentStepIndex,
  isLoading,
  showSubmitSuccess,
  batchMode,
  allInputsCollected,
  onInputChange,
  onSubmitStep,
  onBatchSubmit,
  clinicalCase
}: SimulationWorkspaceProps) {
  // Helper function to get placeholder text for the current step
  const getPlaceholderText = (stepId: string) => {
    switch (stepId) {
      case 'summarize-case':
        return 'Resuma os pontos principais do caso, incluindo dados demográficos, queixa principal, história e achados relevantes...';
      case 'narrow-ddx':
        return 'Liste 2-3 diagnósticos diferenciais principais que você está considerando...';
      case 'analyze-ddx':
        return 'Compare e contraste seus diagnósticos diferenciais. Por que você está considerando cada um? Qual é mais provável?';
      case 'probe-preceptor':
        return 'Que perguntas você tem para o Dr. Corvus sobre este caso? (ex: "Como diferenciar doença X de Y neste caso?")';
      case 'plan-management':
        return 'Descreva seu plano de investigação e manejo para este paciente...';
      case 'select-learning':
        return 'Qual tópico relacionado a este caso você gostaria de estudar mais a fundo?';
      default:
        return 'Digite sua resposta...';
    }
  };

  // Helper function to get the input component for the current step
  const renderInputComponent = () => {
    if (currentStep.id === 'narrow-ddx') {
      return (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Digite seus diagnósticos diferenciais principais (2-3), um por linha:
          </p>
          <Textarea
            placeholder={getPlaceholderText(currentStep.id)}
            className="min-h-[150px]"
            value={currentStep.userInput || ''}
            onChange={(e) => onInputChange(e.target.value)}
            disabled={isLoading}
          />
        </div>
      );
    } else {
      return (
        <Textarea
          placeholder={getPlaceholderText(currentStep.id)}
          className="min-h-[150px]"
          value={currentStep.userInput || ''}
          onChange={(e) => onInputChange(e.target.value)}
          disabled={isLoading}
        />
      );
    }
  };

  // Render case information if available
  const renderCaseInfo = () => {
    if (!clinicalCase) return null;
    
    return (
      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="font-bold text-blue-800 mb-2">Informações do Caso</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Paciente:</strong> {clinicalCase.demographics}</p>
          <p><strong>Queixa Principal:</strong> {clinicalCase.chiefComplaint}</p>
          <p><strong>História:</strong> {clinicalCase.presentingHistory}</p>
          {clinicalCase.physicalExam && (
            <p><strong>Exame Físico:</strong> {clinicalCase.physicalExam}</p>
          )}
          {clinicalCase.vitalSigns && (
            <p><strong>Sinais Vitais:</strong> {clinicalCase.vitalSigns}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{currentStep.title}</CardTitle>
        <CardDescription>{currentStep.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {renderCaseInfo()}
        {renderInputComponent()}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="flex w-full space-x-2">
          <Button
            onClick={onSubmitStep}
            disabled={isLoading || !currentStep.userInput}
            className="w-full"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Dr. Corvus está analisando...
              </>
            ) : showSubmitSuccess ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Enviado!
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Coletar Resposta
              </>
            )}
          </Button>
          
          {batchMode && allInputsCollected && (
            <Button 
              onClick={onBatchSubmit}
              disabled={isLoading || !allInputsCollected}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processando todas as respostas...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Enviar Todas as Respostas
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
