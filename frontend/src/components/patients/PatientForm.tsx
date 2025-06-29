'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Label } from "@/components/ui/Label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Patient } from '@/store/patientStore';

interface PatientFormProps {
  onSubmit: (data: Omit<Patient, 'id' | 'exams' | 'vitalSigns'>) => void;
  onCancel: () => void;
  initialData?: Partial<Patient>;
  isSubmitting?: boolean;
}

const PatientForm: React.FC<PatientFormProps> = ({
  onSubmit,
  onCancel,
  initialData = {},
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    birthDate: initialData.birthDate || '',
    gender: initialData.gender || 'male',
    medicalRecord: initialData.medicalRecord || '',
    hospital: initialData.hospital || '',
    admissionDate: initialData.admissionDate || '',
    anamnesis: initialData.anamnesis || '',
    physicalExamFindings: initialData.physicalExamFindings || '',
    diagnosticHypotheses: initialData.diagnosticHypotheses || '',
    primary_diagnosis: initialData.primary_diagnosis || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!formData.birthDate) {
      newErrors.birthDate = 'Data de nascimento é obrigatória';
    } else {
      const birthDate = new Date(formData.birthDate);
      const today = new Date();
      if (birthDate > today) {
        newErrors.birthDate = 'Data de nascimento não pode ser no futuro';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onSubmit(formData as Omit<Patient, 'id' | 'exams' | 'vitalSigns'>);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{initialData.name ? `Edit Patient: ${initialData.name}` : 'Add New Patient'}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" value={formData.name} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="birthDate">Data Nascimento</Label>
              <Input id="birthDate" name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} />
            </div>
            <div>
              <Label htmlFor="gender">Gênero</Label>
              <Select name="gender" value={formData.gender} onValueChange={(value) => handleChange({ target: { name: 'gender', value } } as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Masculino</SelectItem>
                  <SelectItem value="female">Feminino</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="medicalRecord">Prontuário</Label>
              <Input id="medicalRecord" name="medicalRecord" value={formData.medicalRecord} onChange={handleChange} />
            </div>
          </div>
          
          <div>
            <Label htmlFor="hospital">Hospital</Label>
            <Input id="hospital" name="hospital" value={formData.hospital} onChange={handleChange} />
          </div>
          
          <div>
            <Label htmlFor="admissionDate">Data de Internação</Label>
            <Input id="admissionDate" name="admissionDate" type="date" value={formData.admissionDate} onChange={handleChange} />
          </div>
          
          <div>
            <Label htmlFor="primary_diagnosis">Diagnóstico Principal</Label>
            <Input id="primary_diagnosis" name="primary_diagnosis" value={formData.primary_diagnosis} onChange={handleChange} />
          </div>
          
          <div>
            <Label htmlFor="anamnesis">Anamnese</Label>
            <Textarea id="anamnesis" name="anamnesis" value={formData.anamnesis} onChange={handleChange} rows={4} />
          </div>
          
          <div>
            <Label htmlFor="physicalExamFindings">Exame Físico</Label>
            <Textarea id="physicalExamFindings" name="physicalExamFindings" value={formData.physicalExamFindings} onChange={handleChange} rows={4} />
          </div>
          
          <div>
            <Label htmlFor="diagnosticHypotheses">Hipóteses Diagnósticas</Label>
            <Textarea id="diagnosticHypotheses" name="diagnosticHypotheses" value={formData.diagnosticHypotheses} onChange={handleChange} rows={3} />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar Paciente'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default PatientForm; 