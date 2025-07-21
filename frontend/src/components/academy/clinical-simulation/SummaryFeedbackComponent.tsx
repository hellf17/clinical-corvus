import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from 'lucide-react';

export interface SummaryFeedbackData {
  feedback_strengths: string[];
  feedback_improvements: string[];
  missing_elements: string[];
  overall_assessment: string;
  next_step_guidance: string;
  socratic_questions: string[];
}

interface SummaryFeedbackComponentProps {
  feedback: SummaryFeedbackData;
  userInput: string;
}

const SummaryFeedbackComponent: React.FC<SummaryFeedbackComponentProps> = ({ feedback, userInput }) => {
  return (
    <div className="w-full space-y-2">
      <div className="bg-blue-100 p-3 rounded-md">
        <p className="font-semibold">Sua Resposta:</p>
        <p className="text-sm text-gray-800">{userInput}</p>
      </div>

      <Accordion type="single" className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="flex items-center justify-between w-full px-4 py-2 text-left font-medium text-white bg-gradient-to-r from-blue-500 to-blue-300 rounded-md shadow-md hover:from-blue-600 hover:to-purple-700 transition-all duration-300 ease-in-out">
            <span>Feedback do Dr. Corvus sobre o Resumo</span>
            <ChevronDownIcon className="h-5 w-5 shrink-0 transition-transform duration-200" />
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-white border border-t-0 border-gray-200 rounded-b-md shadow-sm">
            <div className="space-y-3">
              <p className="text-gray-700"><strong>Feedback Geral:</strong> {feedback.overall_assessment}</p>
              {feedback.feedback_strengths.length > 0 && (
                <div>
                  <p className="font-semibold text-green-700">Pontos Fortes:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.feedback_strengths.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.feedback_improvements.length > 0 && (
                <div>
                  <p className="font-semibold text-yellow-700">Áreas para Melhoria:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.feedback_improvements.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.missing_elements.length > 0 && (
                <div>
                  <p className="font-semibold text-red-700">Elementos Ausentes:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.missing_elements.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
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
                  <p className="font-semibold text-blue-700">Orientação para Próximo Passo:</p>
                  <p className="text-gray-700">{feedback.next_step_guidance}</p>
                </div>
              )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default SummaryFeedbackComponent;