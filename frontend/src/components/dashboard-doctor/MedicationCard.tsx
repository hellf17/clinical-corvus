'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Medication } from '@/types/medication';
import { Edit2, Trash2, Calendar, Clock, Pill, AlertTriangle, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface MedicationCardProps {
  medication: Medication;
  onEdit: (medication: Medication) => void;
  onDelete: (medicationId: number) => void;
  className?: string;
}

const MedicationCard: React.FC<MedicationCardProps> = ({
  medication,
  onEdit,
  onDelete,
  className = '',
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (window.confirm('Tem certeza que deseja excluir esta medicação?')) {
      setIsDeleting(true);
      try {
        await onDelete(medication.medication_id);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'Ativo';
      case 'suspended':
        return 'Suspenso';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const formatFrequency = (frequency: string) => {
    const frequencyMap: { [key: string]: string } = {
      'once': '1x',
      'daily': 'Diário',
      'bid': '2x ao dia',
      'tid': '3x ao dia',
      'qid': '4x ao dia',
      'continuous': 'Contínuo',
      'as_needed': 'Se necessário',
      'other': 'Outro',
      'Once daily': '1x ao dia',
      'Twice daily': '2x ao dia',
      'Three times daily': '3x ao dia',
      'Four times daily': '4x ao dia'
    };
    return frequencyMap[frequency] || frequency;
  };

  const formatRoute = (route: string) => {
    const routeMap: { [key: string]: string } = {
      'oral': 'Oral',
      'intravenous': 'Intravenosa',
      'intramuscular': 'Intramuscular',
      'subcutaneous': 'Subcutânea',
      'topical': 'Tópica',
      'inhalation': 'Inalatória',
      'rectal': 'Retal',
      'other': 'Outra'
    };
    return routeMap[route] || route;
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Pill className="h-5 w-5 text-blue-600" />
            {medication.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className={getStatusColor(medication.status)}>
              {getStatusLabel(medication.status)}
            </Badge>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(medication)}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dosage and Frequency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            <span className="text-sm text-slate-600">Dosagem:</span>
            <span className="text-sm font-medium">{medication.dosage}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600">Frequência:</span>
            <span className="text-sm font-medium">{formatFrequency(medication.frequency)}</span>
          </div>
        </div>

        {/* Route */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
          <span className="text-sm text-slate-600">Via:</span>
          <span className="text-sm font-medium">{formatRoute(medication.route)}</span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-500" />
            <span className="text-sm text-slate-600">Início:</span>
            <span className="text-sm font-medium">{formatDate(medication.start_date)}</span>
          </div>
          {medication.end_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">Fim:</span>
              <span className="text-sm font-medium">{formatDate(medication.end_date)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {medication.notes && (
          <div className="border-t pt-3">
            <h4 className="text-sm font-medium text-slate-800 mb-2">Observações:</h4>
            <p className="text-sm text-slate-600 leading-relaxed">
              {medication.notes}
            </p>
          </div>
        )}

        {/* Prescriber */}
        {medication.prescriber && (
          <div className="border-t pt-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-600">Médico Prescritor:</span>
              <span className="text-sm font-medium">{medication.prescriber}</span>
            </div>
          </div>
        )}

        {/* Status specific indicators */}
        {medication.status === 'active' && medication.active === false && (
          <div className="border-t pt-3 bg-yellow-50 p-3 rounded-md">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-800 font-medium">
                Atenção: Medicação marcada como inativa
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MedicationCard;