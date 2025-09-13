'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Medication, MedicationCreate } from '@/types/medication';
import { MedicationStatus, MedicationRoute, MedicationFrequency } from '@/types/enums';
import { Save, X, AlertTriangle, Search } from 'lucide-react';
import { toast } from 'sonner';

interface MedicationFormProps {
  medication?: Medication | null;
  patientId: string;
  onSave: (medicationData: Partial<MedicationCreate>) => Promise<void>;
  onCancel: () => void;
}

const MedicationForm: React.FC<MedicationFormProps> = ({
  medication,
  patientId,
  onSave,
  onCancel,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    route: MedicationRoute.ORAL,
    frequency: MedicationFrequency.DAILY,
    raw_frequency: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    status: MedicationStatus.ACTIVE,
    notes: '',
    prescriber: '',
    active: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [drugInteractions, setDrugInteractions] = useState<string[]>([]);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Common medications for search suggestions
  const commonMedications = [
    'Paracetamol', 'Ibuprofeno', 'Omeprazol', 'Losartana', 'Metformina',
    'Sinvastatina', 'Hidroclorotiazida', 'Atenolol', 'Captopril', 'Furosemida',
    'Prednisona', 'Dipirona', 'Aspirina', 'Amoxicilina', 'Azitromicina',
    'Dexametasona', 'Insulina', 'Varfarina', 'Digoxina', 'Propranolol'
  ];

  useEffect(() => {
    if (medication) {
      setFormData({
        name: medication.name || '',
        dosage: medication.dosage || '',
        route: medication.route || MedicationRoute.ORAL,
        frequency: medication.frequency || MedicationFrequency.DAILY,
        raw_frequency: medication.raw_frequency || '',
        start_date: medication.start_date ? new Date(medication.start_date).toISOString().split('T')[0] : '',
        end_date: medication.end_date ? new Date(medication.end_date).toISOString().split('T')[0] : '',
        status: medication.status || MedicationStatus.ACTIVE,
        notes: medication.notes || '',
        prescriber: medication.prescriber || '',
        active: medication.active !== false,
      });
    }
  }, [medication]);

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Handle medication name search suggestions
    if (field === 'name' && typeof value === 'string') {
      const suggestions = commonMedications.filter(med =>
        med.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      setSearchSuggestions(suggestions);
      setShowSuggestions(value.length > 0 && suggestions.length > 0);

      // Check for potential drug interactions
      checkDrugInteractions(value);
    }
  };

  const checkDrugInteractions = (medicationName: string) => {
    // This is a simplified interaction checker
    // In a real application, this would integrate with a proper drug interaction database
    const commonInteractions: { [key: string]: string[] } = {
      'varfarina': ['aspirina', 'ibuprofeno', 'omeprazol'],
      'aspirina': ['varfarina', 'ibuprofeno', 'prednisona'],
      'metformina': ['insulina', 'furosemida'],
      'digoxina': ['furosemida', 'hidroclorotiazida'],
      'ibuprofeno': ['aspirina', 'varfarina', 'captopril', 'losartana'],
    };

    const interactions = commonInteractions[medicationName.toLowerCase()] || [];
    setDrugInteractions(interactions);
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      toast.error('Nome da medicação é obrigatório');
      return false;
    }
    if (!formData.dosage.trim()) {
      toast.error('Dosagem é obrigatória');
      return false;
    }
    if (!formData.start_date) {
      toast.error('Data de início é obrigatória');
      return false;
    }
    if (formData.end_date && new Date(formData.end_date) <= new Date(formData.start_date)) {
      toast.error('Data de fim deve ser posterior à data de início');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const medicationData: Partial<MedicationCreate> = {
        ...formData,
        patient_id: parseInt(patientId),
      };
      
      await onSave(medicationData);
      toast.success(medication ? 'Medicação atualizada com sucesso!' : 'Medicação adicionada com sucesso!');
    } catch (error) {
      toast.error('Erro ao salvar medicação');
      console.error('Error saving medication:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setFormData(prev => ({ ...prev, name: suggestion }));
    setShowSuggestions(false);
    checkDrugInteractions(suggestion);
  };

  const getFrequencyLabel = (frequency: MedicationFrequency) => {
    const frequencyLabels: { [key in MedicationFrequency]: string } = {
      [MedicationFrequency.ONCE]: '1x',
      [MedicationFrequency.DAILY]: 'Diário',
      [MedicationFrequency.BID]: '2x ao dia',
      [MedicationFrequency.TID]: '3x ao dia',
      [MedicationFrequency.QID]: '4x ao dia',
      [MedicationFrequency.CONTINUOUS]: 'Contínuo',
      [MedicationFrequency.AS_NEEDED]: 'Se necessário',
      [MedicationFrequency.OTHER]: 'Outro',
      [MedicationFrequency.ONCE_DAILY]: '1x ao dia',
      [MedicationFrequency.TWICE_DAILY]: '2x ao dia',
      [MedicationFrequency.THREE_TIMES_DAILY]: '3x ao dia',
      [MedicationFrequency.FOUR_TIMES_DAILY]: '4x ao dia',
    };
    return frequencyLabels[frequency] || frequency;
  };

  const getRouteLabel = (route: MedicationRoute) => {
    const routeLabels: { [key in MedicationRoute]: string } = {
      [MedicationRoute.ORAL]: 'Oral',
      [MedicationRoute.INTRAVENOUS]: 'Intravenosa',
      [MedicationRoute.INTRAMUSCULAR]: 'Intramuscular',
      [MedicationRoute.SUBCUTANEOUS]: 'Subcutânea',
      [MedicationRoute.TOPICAL]: 'Tópica',
      [MedicationRoute.INHALATION]: 'Inalatória',
      [MedicationRoute.RECTAL]: 'Retal',
      [MedicationRoute.OTHER]: 'Outra',
    };
    return routeLabels[route] || route;
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {medication ? 'Editar Medicação' : 'Nova Medicação'}
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label htmlFor="name">Nome da Medicação *</Label>
              <div className="relative">
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Digite o nome da medicação"
                  className="pr-8"
                />
                <Search className="absolute right-2 top-2.5 h-4 w-4 text-gray-400" />
              </div>
              {showSuggestions && (
                <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-md shadow-lg mt-1">
                  {searchSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-gray-100 first:rounded-t-md last:rounded-b-md"
                      onClick={() => selectSuggestion(suggestion)}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="prescriber">Médico Prescritor</Label>
              <Input
                id="prescriber"
                value={formData.prescriber}
                onChange={(e) => handleInputChange('prescriber', e.target.value)}
                placeholder="Nome do médico prescritor"
              />
            </div>
          </div>

          {/* Drug Interactions Warning */}
          {drugInteractions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <h4 className="font-medium text-amber-800">Possíveis Interações Medicamentosas</h4>
              </div>
              <p className="text-sm text-amber-700 mb-2">
                Esta medicação pode interagir com:
              </p>
              <div className="flex flex-wrap gap-2">
                {drugInteractions.map((drug, index) => (
                  <Badge key={index} variant="outline" className="text-amber-700 border-amber-300">
                    {drug.charAt(0).toUpperCase() + drug.slice(1)}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-amber-600 mt-2">
                Verifique com o paciente se ele faz uso de alguma dessas medicações.
              </p>
            </div>
          )}

          {/* Dosage and Administration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dosage">Dosagem *</Label>
              <Input
                id="dosage"
                value={formData.dosage}
                onChange={(e) => handleInputChange('dosage', e.target.value)}
                placeholder="Ex: 500mg, 1 comprimido"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="route">Via de Administração</Label>
              <Select value={formData.route} onValueChange={(value) => handleInputChange('route', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(MedicationRoute).map((route) => (
                    <SelectItem key={route} value={route}>
                      {getRouteLabel(route)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Frequency and Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select value={formData.frequency} onValueChange={(value) => handleInputChange('frequency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(MedicationFrequency).map((frequency) => (
                    <SelectItem key={frequency} value={frequency}>
                      {getFrequencyLabel(frequency)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={MedicationStatus.ACTIVE}>Ativo</SelectItem>
                  <SelectItem value={MedicationStatus.SUSPENDED}>Suspenso</SelectItem>
                  <SelectItem value={MedicationStatus.COMPLETED}>Concluído</SelectItem>
                  <SelectItem value={MedicationStatus.CANCELLED}>Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data de Início *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => handleInputChange('start_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data de Fim (opcional)</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => handleInputChange('end_date', e.target.value)}
              />
            </div>
          </div>

          {/* Raw Frequency */}
          <div className="space-y-2">
            <Label htmlFor="raw_frequency">Frequência Personalizada (opcional)</Label>
            <Input
              id="raw_frequency"
              value={formData.raw_frequency}
              onChange={(e) => handleInputChange('raw_frequency', e.target.value)}
              placeholder="Ex: 2 comprimidos pela manhã e 1 à noite"
            />
            <p className="text-xs text-gray-500">
              Use este campo para especificar instruções de dosagem mais detalhadas
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Observações adicionais sobre a medicação..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  Salvando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  {medication ? 'Atualizar' : 'Salvar'} Medicação
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default MedicationForm;