"use client";

import React from 'react';
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Brain, Users, RefreshCw, Info } from "lucide-react";

interface ClinicalFinding {
  finding_name: string;
  details?: string;
  onset_duration_pattern?: string;
  severity_level?: string;
}

interface CaseScenario {
  case_vignette: string;
  initial_findings: ClinicalFinding[];
  plausible_hypotheses: string[];
}

interface HypothesisFindingAnalysis {
  finding_name: string;
  hypothesis_name: string;
  student_evaluation: 'SUPPORTS' | 'NEUTRAL' | 'REFUTES';
  student_rationale?: string;
}

interface ExpertHypothesisFindingAnalysis {
  finding_name: string;
  hypothesis_name: string;
  expert_evaluation: 'SUPPORTS' | 'NEUTRAL' | 'REFUTES';
  expert_rationale: string;
}

interface MatrixFeedbackOutput {
  overall_matrix_feedback: string;
  discriminator_feedback: string;
  expert_matrix_analysis: ExpertHypothesisFindingAnalysis[];
  expert_recommended_discriminator: string;
  expert_discriminator_rationale: string;
  learning_focus_suggestions: string[];
  matrix_accuracy_score?: number;
}

interface MatrixHypothesisComparisonProps {
  currentCase: CaseScenario;
  matrixAnalysis: HypothesisFindingAnalysis[];
  selectedDiscriminator: string;
  matrixFeedback: MatrixFeedbackOutput | null;
  isMatrixLoading: boolean;
  matrixError: string | null;
  authIsLoaded: boolean;
  onMatrixCellChange: (findingName: string, hypothesisName: string, evaluation: 'SUPPORTS' | 'NEUTRAL' | 'REFUTES') => void;
  onDiscriminatorChange: (discriminator: string) => void;
  onSubmitAnalysis: (e: React.FormEvent) => void;
}

const getEvaluationIcon = (evaluation: 'SUPPORTS' | 'NEUTRAL' | 'REFUTES') => {
  switch (evaluation) {
    case 'SUPPORTS': return '✅';
    case 'NEUTRAL': return '⚪';
    case 'REFUTES': return '❌';
    default: return '⚪';
  }
};

const getEvaluationColor = (evaluation: 'SUPPORTS' | 'NEUTRAL' | 'REFUTES') => {
  switch (evaluation) {
    case 'SUPPORTS': return 'text-green-600 bg-green-50 border-green-200';
    case 'NEUTRAL': return 'text-gray-600 bg-gray-50 border-gray-200';
    case 'REFUTES': return 'text-red-600 bg-red-50 border-red-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const HypothesisAnalysisSkeleton = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
    <div className="h-32 bg-gray-200 rounded"></div>
  </div>
);

export default function MatrixHypothesisComparison({
  currentCase,
  matrixAnalysis,
  selectedDiscriminator,
  matrixFeedback,
  isMatrixLoading,
  matrixError,
  authIsLoaded,
  onMatrixCellChange,
  onDiscriminatorChange,
  onSubmitAnalysis
}: MatrixHypothesisComparisonProps) {
  return (
    <form onSubmit={onSubmitAnalysis}>
      <CardContent className="relative z-10 space-y-6">
        {/* Apresentação do Caso */}
        <div className="p-4 border rounded-md bg-secondary/20">
          <h3 className="text-lg font-semibold mb-2">Caso Clínico:</h3>
          <p className="mb-4">{currentCase.case_vignette}</p>
          
          <h4 className="font-medium mb-2">Achados Principais:</h4>
          <ul className="list-disc pl-5 space-y-1">
            {currentCase.initial_findings.map((finding, idx) => (
              <li key={idx} className="text-base">
                <span className="font-medium">{finding.finding_name}</span>
                {finding.details && <span>: {finding.details}</span>}
                {finding.onset_duration_pattern && <span> ({finding.onset_duration_pattern})</span>}
                {finding.severity_level && <span>, {finding.severity_level}</span>}
              </li>
            ))}
          </ul>
          
          <h4 className="font-medium mt-4 mb-2">Hipóteses a Analisar:</h4>
          <div className="flex flex-wrap gap-2">
            {currentCase.plausible_hypotheses.map((hypothesis, idx) => (
              <Badge key={idx} variant="outline" className="text-base">
                {hypothesis}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Passo 1: A Matriz de Análise */}
        <div className="space-y-6">
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-indigo-600 font-bold text-sm">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-indigo-800">Passo 1: Sua Análise das Hipóteses</h3>
            </div>
            <p className="text-sm text-indigo-700">
              Para cada achado clínico listado abaixo, avalie como ele se relaciona com cada hipótese.
            </p>
          </div>

          {/* The Interactive Matrix */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 bg-white rounded-lg shadow-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 p-3 text-left font-semibold text-gray-700">
                    Achado Clínico
                  </th>
                  {currentCase.plausible_hypotheses.map((hypothesis, idx) => (
                    <th key={idx} className="border border-gray-300 p-3 text-center font-semibold text-gray-700 min-w-[180px]">
                      {hypothesis}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentCase.initial_findings.map((finding, findingIdx) => (
                  <tr key={findingIdx} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-3 font-medium text-gray-800">
                      <div>
                        <div className="font-semibold">{finding.finding_name}</div>
                        {finding.details && (
                          <div className="text-sm text-gray-600 mt-1">{finding.details}</div>
                        )}
                      </div>
                    </td>
                    {currentCase.plausible_hypotheses.map((hypothesis, hypothesisIdx) => {
                      const cellAnalysis = matrixAnalysis.find(
                        item => item.finding_name === finding.finding_name && item.hypothesis_name === hypothesis
                      );
                      
                      return (
                        <td key={hypothesisIdx} className="border border-gray-300 p-2 text-center">
                          <div className="flex flex-col space-y-1">
                            {(['SUPPORTS', 'NEUTRAL', 'REFUTES'] as const).map((evaluation) => (
                              <label
                                key={evaluation}
                                className={`flex items-center justify-center p-2 rounded-md border cursor-pointer transition-all hover:shadow-sm ${
                                  cellAnalysis?.student_evaluation === evaluation
                                    ? getEvaluationColor(evaluation)
                                    : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`${finding.finding_name}-${hypothesis}`}
                                  value={evaluation}
                                  checked={cellAnalysis?.student_evaluation === evaluation}
                                  onChange={() => onMatrixCellChange(finding.finding_name, hypothesis, evaluation)}
                                  className="sr-only"
                                />
                                <span className="text-lg mr-2">{getEvaluationIcon(evaluation)}</span>
                                <span className="text-xs font-medium">
                                  {evaluation === 'SUPPORTS' ? 'Suporta' : 
                                   evaluation === 'NEUTRAL' ? 'Neutro' : 'Refuta'}
                                </span>
                              </label>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Passo 2: Identificação do Discriminador Chave */}
        <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
              <span className="text-yellow-600 font-bold text-sm">🎯</span>
            </div>
            <h3 className="text-lg font-semibold text-yellow-800">Passo 2: Qual é o Achado Decisivo?</h3>
          </div>
          <p className="text-sm text-yellow-700 mb-4">
            Com base na sua análise acima, qual único achado é o mais poderoso para diferenciar entre as hipóteses mais prováveis?
          </p>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-yellow-800">
              Selecione o discriminador chave:
            </label>
            <select
              value={selectedDiscriminator}
              onChange={(e) => onDiscriminatorChange(e.target.value)}
              className="w-full p-3 border border-yellow-300 rounded-md bg-white focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              disabled={isMatrixLoading}
            >
              <option value="">Selecionar o discriminador chave...</option>
              {currentCase.initial_findings.map((finding, idx) => (
                <option key={idx} value={finding.finding_name}>
                  {finding.finding_name}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <Button type="submit" disabled={isMatrixLoading || !authIsLoaded} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white">
          {isMatrixLoading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Analisando matriz...
            </>
          ) : "Ver Feedback do Dr. Corvus"}
        </Button>
        
        {isMatrixLoading && <HypothesisAnalysisSkeleton />}
        {matrixError && (
          <Alert variant="destructive" className="mt-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Ops! Algo deu errado</AlertTitle>
            <AlertDescription className="mt-2">
              {matrixError}
              <br />
              <span className="text-sm mt-2 block">Se o problema persistir, tente recarregar a página ou entre em contato conosco.</span>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Passo 3: O Feedback do Dr. Corvus */}
        {matrixFeedback && (
          <div className="mt-8 space-y-6">
            {/* Feedback Geral */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-purple-600 font-bold text-sm">👨‍⚕️</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-purple-800">Análise da Matriz - Dr. Corvus</h3>
                  <p className="text-sm text-purple-700 leading-relaxed">{matrixFeedback.overall_matrix_feedback}</p>
                </div>
              </div>
            </div>

            {/* Análise do Discriminador */}
            <div className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start">
                <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                  <span className="text-yellow-600 font-bold text-sm">🎯</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-yellow-800">Análise do Discriminador</h3>
                  <p className="text-sm text-yellow-700 leading-relaxed mb-3">{matrixFeedback.discriminator_feedback}</p>
                  
                  <div className="bg-yellow-100 p-3 rounded-md">
                    <p className="text-sm font-medium text-yellow-800 mb-1">
                      <strong>Discriminador Recomendado pelo Expert:</strong> {matrixFeedback.expert_recommended_discriminator}
                    </p>
                    <p className="text-xs text-yellow-700">{matrixFeedback.expert_discriminator_rationale}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Matriz Expert */}
            {matrixFeedback.expert_matrix_analysis.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-gray-800">Matriz Expert para Comparação:</h4>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-300 bg-white rounded-lg shadow-sm">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-3 text-left font-semibold text-gray-700">
                          Achado Clínico
                        </th>
                        {currentCase.plausible_hypotheses.map((hypothesis, idx) => (
                          <th key={idx} className="border border-gray-300 p-3 text-center font-semibold text-gray-700 min-w-[200px]">
                            {hypothesis}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentCase.initial_findings.map((finding, findingIdx) => (
                        <tr key={findingIdx} className="hover:bg-gray-50">
                          <td className="border border-gray-300 p-3 font-medium text-gray-800">
                            {finding.finding_name}
                          </td>
                          {currentCase.plausible_hypotheses.map((hypothesis, hypothesisIdx) => {
                            const expertAnalysis = matrixFeedback.expert_matrix_analysis.find(
                              item => item.finding_name === finding.finding_name && item.hypothesis_name === hypothesis
                            );
                            const studentAnalysis = matrixAnalysis.find(
                              item => item.finding_name === finding.finding_name && item.hypothesis_name === hypothesis
                            );
                            
                            const isMatch = expertAnalysis && studentAnalysis && 
                                           expertAnalysis.expert_evaluation === studentAnalysis.student_evaluation;
                            
                            return (
                              <td key={hypothesisIdx} className="border border-gray-300 p-2 text-center">
                                {expertAnalysis ? (
                                  <div className={`p-2 rounded-md border ${
                                    isMatch ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                  }`}>
                                    <div className="flex items-center justify-center mb-2">
                                      <span className="text-lg mr-2">{getEvaluationIcon(expertAnalysis.expert_evaluation)}</span>
                                      <span className="text-xs font-medium">
                                        {expertAnalysis.expert_evaluation === 'SUPPORTS' ? 'Suporta' : 
                                         expertAnalysis.expert_evaluation === 'NEUTRAL' ? 'Neutro' : 'Refuta'}
                                      </span>
                                      {isMatch && <span className="ml-2 text-green-600">✓</span>}
                                      {!isMatch && <span className="ml-2 text-red-600">✗</span>}
                                    </div>
                                    <p className="text-xs text-gray-600 leading-tight">
                                      {expertAnalysis.expert_rationale}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-gray-400">N/A</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Pontuação e Sugestões de Aprendizado */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matrixFeedback.matrix_accuracy_score !== undefined && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold text-sm">📊</span>
                    </div>
                    <h4 className="font-semibold text-blue-800">Pontuação de Precisão</h4>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {Math.round(matrixFeedback.matrix_accuracy_score * 100)}%
                    </div>
                    <p className="text-sm text-blue-700">Precisão da sua matriz</p>
                  </div>
                </div>
              )}
              
              <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center mr-3 flex-shrink-0">
                    <span className="text-emerald-600 font-bold text-sm">📚</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-emerald-800 mb-2">Foco de Aprendizado</h4>
                    <ul className="text-sm text-emerald-700 space-y-1">
                      {matrixFeedback.learning_focus_suggestions.map((suggestion, idx) => (
                        <li key={idx} className="flex items-start">
                          <span className="text-emerald-500 mr-2 mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </form>
  );
} 