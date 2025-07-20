import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/Accordion';
import { cn } from '@/lib/utils';
import { ChevronDownIcon } from 'lucide-react';

export interface AnalysisFeedbackData {
  overallFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  missingConsiderations: string[];
}

interface AnalysisFeedbackComponentProps {
  feedback: AnalysisFeedbackData;
  userInput: string;
}

const AnalysisFeedbackComponent: React.FC<AnalysisFeedbackComponentProps> = ({ feedback, userInput }) => {
  return (
    <div className="w-full space-y-2">
      <div className="bg-blue-100 p-3 rounded-md">
        <p className="font-semibold">Your Input:</p>
        <p className="text-sm text-gray-800">{userInput}</p>
      </div>

      <Accordion type="single" className="w-full">
        <AccordionItem value="item-1">
          <AccordionTrigger className="flex items-center justify-between w-full px-4 py-2 text-left font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 rounded-md shadow-md hover:from-blue-600 hover:to-purple-700 transition-all duration-300 ease-in-out">
            <span>Dr. Corvus's Feedback on Analysis</span>
            <ChevronDownIcon className="h-5 w-5 shrink-0 transition-transform duration-200" />
          </AccordionTrigger>
          <AccordionContent className="p-4 bg-white border border-t-0 border-gray-200 rounded-b-md shadow-sm">
            <div className="space-y-3">
              <p className="text-gray-700"><strong>Overall Feedback:</strong> {feedback.overallFeedback}</p>
              {feedback.strengths.length > 0 && (
                <div>
                  <p className="font-semibold text-green-700">Strengths:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.strengths.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.areasForImprovement.length > 0 && (
                <div>
                  <p className="font-semibold text-yellow-700">Areas for Improvement:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.areasForImprovement.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {feedback.missingConsiderations.length > 0 && (
                <div>
                  <p className="font-semibold text-red-700">Missing Considerations:</p>
                  <ul className="list-disc list-inside text-gray-700">
                    {feedback.missingConsiderations.map((item, index) => (
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

export default AnalysisFeedbackComponent;