import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from 'lucide-react';

export interface SessionSummaryData {
  overall_performance: string;
  key_strengths: string[];
  areas_for_development: string[];
  learning_objectives_met: string[];
  recommended_study_topics: string[];
  metacognitive_insights: string[];
  next_cases_suggestions: string[];
}

interface SessionSummaryComponentProps {
  feedback: SessionSummaryData;
  userInput: string; // User input for the last step, or general session context
}

const SessionSummaryComponent: React.FC<SessionSummaryComponentProps> = ({ feedback, userInput }) => {
  return (
    <div className="w-full space-y-2">
      <div className="bg-blue-100 p-3 rounded-md">
        <p className="font-semibold">Sua Resposta:</p>
        <p className="text-sm text-gray-800">{userInput}</p>
      </div>

      <Accordion type="single" className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="flex items-center justify-between w-full px-4 py-2 text-left font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 rounded-md shadow-md hover:from-blue-600 hover:to-purple-700 transition-all duration-300 ease-in-out">
            <span>Resumo da Sessão do Dr. Corvus</span>
            <ChevronDownIcon className="h-5 w-5 shrink-0 transition-transform duration-200" />
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-white border border-t-0 border-gray-200 rounded-b-md shadow-sm">
            <div className="space-y-3">
              <p className="text-gray-700"><strong>Performance Geral:</strong> {feedback.overall_performance}</p>
              {feedback.key_strengths.length > 0 && (
                <div>
                  <p className="font-semibold text-green-700">Pontos Fortes:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.key_strengths.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.areas_for_development.length > 0 && (
                <div>
                  <p className="font-semibold text-yellow-700">Áreas para Desenvolvimento:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.areas_for_development.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.learning_objectives_met.length > 0 && (
                <div>
                  <p className="font-semibold text-blue-700">Objetivos de Aprendizado Atingidos:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.learning_objectives_met.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.recommended_study_topics.length > 0 && (
                <div>
                  <p className="font-semibold text-purple-700">Tópicos de Estudo Recomendados:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.recommended_study_topics.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.metacognitive_insights.length > 0 && (
                <div>
                  <p className="font-semibold text-orange-700">Insights Metacognitivos:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.metacognitive_insights.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.next_cases_suggestions.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-700">Sugestões de Próximos Casos:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.next_cases_suggestions.map((item, index) => (
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

export default SessionSummaryComponent;