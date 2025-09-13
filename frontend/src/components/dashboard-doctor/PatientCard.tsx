import { Card } from "@/components/ui/Card";
import { AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  status: 'Internada' | 'Ambulatorial' | 'Alta';
  diagnosis: string;
  lastNote: string;
  alert?: string;
  riskScore: number;
  lastUpdated: Date;
  hasAlerts?: boolean;
}

export type { Patient };

interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
}

export default function PatientCard({ patient, onClick }: PatientCardProps) {
  // Enhanced status colors with better contrast
  const getStatusColor = () => {
    switch (patient.status) {
      case 'Internada': return 'bg-red-100 text-red-800 border-red-200';
      case 'Ambulatorial': return 'bg-green-100 text-green-800 border-green-200';
      case 'Alta': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Improved risk assessment with clearer clinical meaning
  const getRiskInfo = () => {
    if (patient.riskScore <= 25) return { level: 'Baixo', color: 'bg-green-500' };
    if (patient.riskScore <= 50) return { level: 'Moderado', color: 'bg-yellow-500' };
    if (patient.riskScore <= 75) return { level: 'Alto', color: 'bg-orange-500' };
    return { level: 'Crítico', color: 'bg-red-500' };
  };

  const riskInfo = getRiskInfo();

  // Format time with Portuguese locale for better readability
  const formatTime = (date: Date) => {
    try {
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: ptBR
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  // Gender display with appropriate symbols
  const getGenderDisplay = () => {
    switch (patient.gender.toLowerCase()) {
      case 'masculino':
      case 'male':
        return '♂';
      case 'feminino':
      case 'female':
        return '♀';
      default:
        return '';
    }
  };

  return (
    <Card
      className={cn(
        "border rounded-lg p-3 sm:p-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-blue-500",
        patient.hasAlerts ? "border-red-500 bg-red-50" : "border-gray-200"
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      {/* Patient header with improved layout */}
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="text-md sm:text-lg font-bold text-gray-900 truncate">{patient.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs sm:text-sm text-gray-600">
              {patient.age} anos {getGenderDisplay() && `(${getGenderDisplay()})`}
            </span>
          </div>
        </div>
        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor()}`}>
          {patient.status}
        </span>
      </div>

      {/* Diagnosis section with better visual hierarchy */}
      <div className="mt-3">
        <h4 className="text-xs sm:text-sm font-semibold text-gray-700">Hipótese Principal</h4>
        <p className="text-sm text-gray-800 mt-1 leading-relaxed line-clamp-2">{patient.diagnosis}</p>
      </div>

      {/* Last note with improved styling */}
      {patient.lastNote && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">Última Nota</p>
          <p className="text-sm text-gray-700 italic line-clamp-2">{patient.lastNote}</p>
        </div>
      )}

      {/* Alert section with better visibility */}
      {patient.alert && (
        <div className="flex items-start mt-3 p-2 bg-red-50 border border-red-100 rounded-md">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{patient.alert}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-sm text-red-700 ml-2">{patient.alert}</span>
        </div>
      )}

      {/* Risk assessment with clearer labeling */}
      <div className="mt-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">Risco Clínico</span>
          <span className="text-sm font-semibold text-gray-900">{patient.riskScore}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`${riskInfo.color} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${Math.min(patient.riskScore, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-gray-500">{riskInfo.level}</span>
          <span className="text-xs text-gray-500">0% - 100%</span>
        </div>
      </div>

      {/* Updated timestamp with icon */}
      <div className="flex items-center mt-3 pt-2 border-t border-gray-100">
        <Clock className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
        <span className="text-xs text-gray-500">
          Atualizado {formatTime(patient.lastUpdated)}
        </span>
      </div>
    </Card>
  );
}