import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PlayCircle } from "lucide-react";

// Import the clinical case interface
interface ClinicalCase {
  id: string;
  title: string;
  brief: string;
  fullDescription?: string;
  difficulty: 'Básico' | 'Intermediário' | 'Avançado';
  specialties: string[];
  demographics?: string;
  chiefComplaint?: string;
  presentingHistory?: string;
  physicalExam?: string;
  vitalSigns?: string;
}

interface CaseSelectorProps {
  cases: ClinicalCase[];
  onSelectCase: (clinicalCase: ClinicalCase) => void;
}

// Helper function for difficulty border color
function getDifficultyBorderColor(difficulty: 'Básico' | 'Intermediário' | 'Avançado'): string {
  switch (difficulty) {
    case 'Básico':
      return 'border-l-green-500';
    case 'Intermediário':
      return 'border-l-yellow-500';
    case 'Avançado':
      return 'border-l-red-500';
    default:
      return 'border-l-gray-300'; 
  }
}

export function CaseSelector({ cases, onSelectCase }: CaseSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cases.map((clinicalCase) => (
        <Card 
          key={clinicalCase.id} 
          className={`border-l-4 ${getDifficultyBorderColor(clinicalCase.difficulty)} hover:shadow-lg transition-shadow`}
        >
          <CardHeader>
            <div className="flex justify-between items-start">
              <CardTitle className="text-xl">{clinicalCase.title}</CardTitle>
              <Badge variant={
                clinicalCase.difficulty === 'Básico' ? 'default' : 
                clinicalCase.difficulty === 'Intermediário' ? 'default' : 'secondary'
              }>
                {clinicalCase.difficulty}
              </Badge>
            </div>
            <CardDescription>{clinicalCase.brief}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {clinicalCase.specialties.map((specialty) => (
                <Badge key={specialty} variant="outline">{specialty}</Badge>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => onSelectCase(clinicalCase)} 
              className="w-full"
            >
              <PlayCircle className="mr-2 h-4 w-4" />
              Iniciar Simulação
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
