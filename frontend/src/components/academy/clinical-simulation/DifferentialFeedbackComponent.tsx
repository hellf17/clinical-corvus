import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from 'lucide-react';

export interface DifferentialFeedbackData {
  ddx_evaluation: Array<{
    diagnosis: string;
    plausibility: string;
    supporting_findings: string[];
    contradicting_findings: string[];
  }>;
  missing_differentials: string[];
  prioritization_feedback: string;
  socratic_questions: string[];
  next_step_guidance: string;
}

interface DifferentialFeedbackComponentProps {
  feedback: DifferentialFeedbackData;
  userInput: string;
}

const DifferentialFeedbackComponent: React.FC<DifferentialFeedbackComponentProps> = ({ feedback, userInput }) => {
  return (
    <div className="w-full space-y-2">
      <div className="bg-blue-100 p-3 rounded-md">
        <p className="font-semibold">Sua Resposta:</p>
        <p className="text-sm text-gray-800">{userInput}</p>
      </div>

      <Accordion type="single" className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="flex items-center justify-between w-full px-4 py-2 text-left font-medium text-white bg-gradient-to-r from-blue-500 to-blue-300 rounded-md shadow-md hover:from-blue-600 hover:to-purple-700 transition-all duration-300 ease-in-out">
            <span>Feedback do Dr. Corvus sobre Diagnósticos Diferenciais</span>
            <ChevronDownIcon className="h-5 w-5 shrink-0 transition-transform duration-200" />
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-white border border-t-0 border-gray-200 rounded-b-md shadow-sm">
            <div className="space-y-3">
              <p className="text-gray-700"><strong>Feedback sobre Priorização:</strong> {feedback.prioritization_feedback}</p>
              {feedback.ddx_evaluation.length > 0 && (
                <div>
                  <p className="font-semibold text-blue-700">Avaliação DDx:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    {feedback.ddx_evaluation.map((item, index) => (
                      <li key={index}>
                        <strong>{item.diagnosis}</strong> (Plausibility: {item.plausibility})
                        {item.supporting_findings.length > 0 && (
                          <p className="text-sm ml-4">Supporting: {item.supporting_findings.join(', ')}</p>
                        )}
                        {item.contradicting_findings.length > 0 && (
                          <p className="text-sm ml-4">Contradicting: {item.contradicting_findings.join(', ')}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.missing_differentials.length > 0 && (
                <div>
                  <p className="font-semibold text-yellow-700">Diferenciais Ausentes:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.missing_differentials.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.socratic_questions.length > 0 && (
                <div>
                  <p className="font-semibold text-purple-700">Perguntas Socráticas:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.socratic_questions.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.next_step_guidance && (
                <div>
                  <p className="font-semibold text-green-700">Orientação para Próximo Passo:</p>
                  <p className="text-gray-700">{feedback.next_step_guidance}</p>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default DifferentialFeedbackComponent;