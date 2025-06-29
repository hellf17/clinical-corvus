import React from 'react';
import { Button } from '@/components/ui/Button'; // Corrected casing
import { PatientContext } from '../../types/chat'; // Import the type

interface QuickRepliesProps {
  patientContext?: PatientContext; // Use the imported type
  onReplyClick?: (text: string) => void;
}

const SUGGESTIONS = [
  'Como posso ajudar?',
  'Quais sintomas você está sentindo?',
  'Precisa de orientação sobre exames?',
];

const QuickReplies: React.FC<QuickRepliesProps> = ({ patientContext, onReplyClick }) => {
  // Sugestões baseadas no contexto do paciente
  let replies = SUGGESTIONS;
  if (patientContext && typeof patientContext === 'object') {
    replies = [];
    if (patientContext.lastExam)
      replies.push('Deseja discutir seu último exame?');
    if (patientContext.medications && patientContext.medications.length > 0)
      replies.push('Precisa de orientação sobre suas medicações?');
    if (patientContext.symptoms && patientContext.symptoms.length > 0)
      replies.push('Vamos revisar seus sintomas recentes?');
    // fallback
    if (replies.length === 0) replies = SUGGESTIONS;
  }

  return (
    <div className="flex gap-2 p-2 border-t border-border-primary dark:border-border-foreground bg-bg-background dark:bg-bg-background">
      {replies.map((reply, idx) => (
        <Button // Use the Button component
          key={idx}
          variant="default" // Use a suitable variant, default seems appropriate
          size="sm" // Use a suitable size, sm seems appropriate
          className="min-w-[44px] min-h-[44px]" // Keep minimum dimensions if needed, Button already has padding
          aria-label={`Sugestão: ${reply}`}
          onClick={() => onReplyClick && onReplyClick(reply)}
        >
          {reply}
        </Button>
      ))}
    </div>
  );
};

export default QuickReplies;
