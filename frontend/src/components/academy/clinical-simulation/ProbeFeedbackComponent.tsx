import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from 'lucide-react';

export interface ProbeFeedbackData {
  answers_to_questions: Array<{
    question: string;
    answer: string;
    rationale: string;
  }>;
  additional_considerations: string[];
  counter_questions: string[];
  knowledge_gaps_identified: string[];
  learning_resources: string[];
}

interface ProbeFeedbackComponentProps {
  feedback: ProbeFeedbackData;
  userInput: string;
}

const ProbeFeedbackComponent: React.FC<ProbeFeedbackComponentProps> = ({ feedback, userInput }) => {
  return (
    <div className="w-full space-y-2">
      <div className="bg-blue-100 p-3 rounded-md">
        <p className="font-semibold">Sua Resposta:</p>
        <p className="text-sm text-gray-800">{userInput}</p>
      </div>

      <Accordion type="single" className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="flex items-center justify-between w-full px-4 py-2 text-left font-medium text-white bg-gradient-to-r from-blue-500 to-blue-300 rounded-md shadow-md hover:from-blue-600 hover:to-purple-700 transition-all duration-300 ease-in-out">
            <span>Feedback do Dr. Corvus sobre Perguntas de Investigação</span>
            <ChevronDownIcon className="h-5 w-5 shrink-0 transition-transform duration-200" />
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-white border border-t-0 border-gray-200 rounded-b-md shadow-sm">
            <div className="space-y-3">
              {feedback.answers_to_questions.length > 0 && (
                <div>
                  <p className="font-semibold text-green-700">Respostas às Perguntas:</p>
                  <ul className="list-disc list-inside text-gray-700 space-y-2">
                    {feedback.answers_to_questions.map((item, index) => (
                      <li key={index}>
                        <strong>Q: {item.question}</strong><br />
                        A: {item.answer}<br />
                        <span className="text-xs italic text-gray-500">Rationale: {item.rationale}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.additional_considerations.length > 0 && (
                <div>
                  <p className="font-semibold text-blue-700">Considerações Adicionais:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.additional_considerations.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.counter_questions.length > 0 && (
                <div>
                  <p className="font-semibold text-purple-700">Perguntas de Contra-Argumento:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.counter_questions.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.knowledge_gaps_identified.length > 0 && (
                <div>
                  <p className="font-semibold text-red-700">Lacunas de Conhecimento Identificadas:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.knowledge_gaps_identified.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.learning_resources.length > 0 && (
                <div>
                  <p className="font-semibold text-orange-700">Recursos de Aprendizagem:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.learning_resources.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default ProbeFeedbackComponent;