import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from 'lucide-react';

export interface PlanFeedbackData {
  plan_strengths: string[];
  plan_gaps: string[];
  investigation_priorities: string[];
  management_considerations: string[];
  safety_concerns: string[];
  cost_effectiveness_notes: string[];
  guidelines_alignment: string;
  next_step_guidance: string;
}

interface PlanFeedbackComponentProps {
  feedback: PlanFeedbackData;
  userInput: string;
}

const PlanFeedbackComponent: React.FC<PlanFeedbackComponentProps> = ({ feedback, userInput }) => {
  return (
    <div className="w-full space-y-2">
      <div className="bg-blue-100 p-3 rounded-md">
        <p className="font-semibold">Sua Resposta:</p>
        <p className="text-sm text-gray-800">{userInput}</p>
      </div>

      <Accordion type="single" className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="flex items-center justify-between w-full px-4 py-2 text-left font-medium text-white bg-gradient-to-r from-blue-500 to-blue-300 rounded-md shadow-md hover:from-blue-600 hover:to-purple-700 transition-all duration-300 ease-in-out">
            <span>Feedback do Dr. Corvus sobre Plano de Manejo</span>
            <ChevronDownIcon className="h-5 w-5 shrink-0 transition-transform duration-200" />
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-white border border-t-0 border-gray-200 rounded-b-md shadow-sm">
            <div className="space-y-3">
              {feedback.plan_strengths.length > 0 && (
                <div>
                  <p className="font-semibold text-green-700">Pontos Fortes do Plano:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.plan_strengths.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.plan_gaps.length > 0 && (
                <div>
                  <p className="font-semibold text-red-700">Lacunas do Plano:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.plan_gaps.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.investigation_priorities.length > 0 && (
                <div>
                  <p className="font-semibold text-blue-700">Prioridades de Investigação:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.investigation_priorities.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.management_considerations.length > 0 && (
                <div>
                  <p className="font-semibold text-purple-700">Considerações de Manejo:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.management_considerations.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.safety_concerns.length > 0 && (
                <div>
                  <p className="font-semibold text-orange-700">Preocupações de Segurança:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.safety_concerns.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.cost_effectiveness_notes.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700">Notas de Custo-Efetividade:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.cost_effectiveness_notes.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.guidelines_alignment && (
                <div>
                  <p className="font-semibold text-green-700">Alinhamento com Diretrizes:</p>
                  <p className="text-gray-700">{feedback.guidelines_alignment}</p>
                </div>
              )}
              {feedback.next_step_guidance && (
                <div>
                  <p className="font-semibold text-blue-700">Orientação para Próximo Passo:</p>
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

export default PlanFeedbackComponent;