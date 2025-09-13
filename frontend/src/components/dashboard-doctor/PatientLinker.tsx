import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { RadioGroupComponent, RadioGroupItem } from "@/components/ui/Radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { useToast } from "@/components/ui/use-toast";
import { createPatient, linkAnalysisToPatient } from "@/services/patientService";
import { Patient } from "@/types/patient";
import { LabAnalysisResult } from "@/types/labAnalysis";

interface PatientLinkerProps {
  analysisData: LabAnalysisResult;
  onCancel: () => void;
  onLinked: () => void;
}

export function PatientLinker({ analysisData, onCancel, onLinked }: PatientLinkerProps) {
  const [linkOption, setLinkOption] = useState<'existing' | 'new'>('existing');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [newPatientData, setNewPatientData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const response = await fetch('/api/patients');
        const data = await response.json();
        setPatients(data.items || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
      }
    };
    fetchPatients();
  }, []);

  const handleLinkToPatient = async () => {
    setIsSubmitting(true);
    try {
      if (linkOption === 'existing') {
        if (!selectedPatientId) {
          toast({
            title: "Erro",
            description: "Por favor, selecione um paciente",
            variant: "destructive",
          });
          return;
        }
        await linkAnalysisToPatient(selectedPatientId, analysisData);
      } else {
        if (!newPatientData.name) {
          toast({
            title: "Erro",
            description: "Por favor, preencha o nome do paciente",
            variant: "destructive",
          });
          return;
        }
        const newPatient = await createPatient({
          ...newPatientData,
          birthDate: new Date().toISOString().split('T')[0], // Default birth date
          gender: 'other', // Default gender
          address: '',
          city: '',
          state: '',
          zipCode: '',
          documentNumber: '',
          patientNumber: '',
          emergencyContact: { name: '', relationship: '', phone: '' }
        });
        await linkAnalysisToPatient(newPatient.patient_id.toString(), analysisData);
      }

      toast({
        title: "Sucesso",
        description: "Resultados vinculados com sucesso!",
      });
      onLinked();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Falha ao vincular resultados. Por favor, tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="font-semibold text-lg">Vincular resultados a um paciente</h3>
        <p className="text-gray-600">
          Escolha vincular a um paciente existente ou crie um novo paciente.
        </p>
      </div>

      <RadioGroupComponent
        value={linkOption}
        onValueChange={(value: 'existing' | 'new') => setLinkOption(value)}
        className="space-y-4"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="existing" id="existing" />
          <Label htmlFor="existing">Paciente existente</Label>
        </div>
        
        {linkOption === 'existing' && (
          <div className="ml-6 space-y-3">
            <Select onValueChange={setSelectedPatientId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione um paciente" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.patient_id} value={patient.patient_id.toString()}>
                    {patient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <RadioGroupItem value="new" id="new" />
          <Label htmlFor="new">Novo paciente</Label>
        </div>
        
        {linkOption === 'new' && (
          <div className="ml-6 space-y-3">
            <div>
              <Label htmlFor="name">Nome completo *</Label>
              <Input
                id="name"
                value={newPatientData.name}
                onChange={(e) => setNewPatientData({...newPatientData, name: e.target.value})}
                placeholder="Nome do paciente"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newPatientData.email}
                onChange={(e) => setNewPatientData({...newPatientData, email: e.target.value})}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={newPatientData.phone}
                onChange={(e) => setNewPatientData({...newPatientData, phone: e.target.value})}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
        )}
      </RadioGroupComponent>

      <div className="flex justify-end gap-3 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancelar
        </Button>
        <Button onClick={handleLinkToPatient} disabled={isSubmitting}>
          {isSubmitting ? "Salvando..." : "Vincular Resultados"}
        </Button>
      </div>
    </div>
  );
}