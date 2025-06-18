'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { VitalSign } from '@/types/health';
import { Label } from "@/components/ui/Label";

interface VitalSignsFormProps {
  onSubmit: (data: Omit<VitalSign, 'vital_id' | 'patient_id' | 'created_at'>) => void;
  onCancel: () => void;
  initialData?: Partial<VitalSign>;
  isSubmitting?: boolean;
}

const VitalSignsForm: React.FC<VitalSignsFormProps> = ({
  onSubmit,
  onCancel,
  initialData = {},
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<Partial<Omit<VitalSign, 'vital_id' | 'patient_id' | 'created_at'>>>({
    temperature_c: initialData.temperature_c || undefined,
    heart_rate: initialData.heart_rate || undefined,
    respiratory_rate: initialData.respiratory_rate || undefined,
    systolic_bp: initialData.systolic_bp || undefined,
    diastolic_bp: initialData.diastolic_bp || undefined,
    oxygen_saturation: initialData.oxygen_saturation || undefined,
    glasgow_coma_scale: initialData.glasgow_coma_scale || undefined,
    timestamp: initialData.timestamp || new Date().toISOString(),
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name !== 'timestamp') {
      const numValue = value === '' ? undefined : parseFloat(value);
      setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
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
    
    if (!formData.timestamp) {
      newErrors.timestamp = 'Data e Hora são obrigatórios';
    } else {
        try {
            if (!formData.timestamp || isNaN(new Date(formData.timestamp).getTime())) {
                 newErrors.timestamp = 'Formato inválido de Data e Hora.';
            }
        } catch (e) {
            newErrors.timestamp = 'Formato inválido de Data e Hora.';
        }
    }
    
    if (
      formData.temperature_c === undefined &&
      formData.heart_rate === undefined &&
      formData.respiratory_rate === undefined &&
      formData.systolic_bp === undefined &&
      formData.diastolic_bp === undefined &&
      formData.oxygen_saturation === undefined &&
      formData.glasgow_coma_scale === undefined
    ) {
      newErrors.general = 'Pelo menos um sinal vital deve ser preenchido';
    }
    
    if (formData.temperature_c !== undefined && formData.temperature_c !== null && (formData.temperature_c < 30 || formData.temperature_c > 45)) {
      newErrors.temperature_c = 'Temperatura deve estar entre 30°C e 45°C';
    }
    
    if (formData.heart_rate !== undefined && formData.heart_rate !== null && (formData.heart_rate < 30 || formData.heart_rate > 250)) {
      newErrors.heart_rate = 'Frequência cardíaca deve estar entre 30 e 250 bpm';
    }
    
    if (formData.respiratory_rate !== undefined && formData.respiratory_rate !== null && (formData.respiratory_rate < 5 || formData.respiratory_rate > 60)) {
      newErrors.respiratory_rate = 'Frequência respiratória deve estar entre 5 e 60 irpm';
    }
    
    if (formData.systolic_bp !== undefined && formData.systolic_bp !== null && (formData.systolic_bp < 40 || formData.systolic_bp > 300)) {
      newErrors.systolic_bp = 'Pressão sistólica deve estar entre 40 e 300 mmHg';
    }
    
    if (formData.diastolic_bp !== undefined && formData.diastolic_bp !== null && (formData.diastolic_bp < 20 || formData.diastolic_bp > 200)) {
      newErrors.diastolic_bp = 'Pressão diastólica deve estar entre 20 e 200 mmHg';
    }
    
    if (formData.oxygen_saturation !== undefined && formData.oxygen_saturation !== null && (formData.oxygen_saturation < 50 || formData.oxygen_saturation > 100)) {
      newErrors.oxygen_saturation = 'Saturação de oxigênio deve estar entre 50% e 100%';
    }
    
    if (formData.glasgow_coma_scale !== undefined && formData.glasgow_coma_scale !== null && (formData.glasgow_coma_scale < 3 || formData.glasgow_coma_scale > 15)) {
      newErrors.glasgow_coma_scale = 'Escala de Glasgow deve estar entre 3 e 15';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
       const dataToSubmit = {
           ...formData,
           timestamp: formData.timestamp ? new Date(formData.timestamp).toISOString() : new Date().toISOString()
       }
      onSubmit(dataToSubmit as Omit<VitalSign, 'vital_id' | 'patient_id' | 'created_at'>);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Registro de Sinais Vitais</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
              <Label htmlFor="timestamp">Data e Hora*</Label>
              <Input
                id="timestamp"
                name="timestamp"
                type="datetime-local"
                value={formData.timestamp ? formData.timestamp.substring(0, 16) : ''}
                onChange={handleChange}
                className="w-full mt-1"
                required
             />
             {errors.timestamp && <p className="text-sm text-destructive mt-1">{errors.timestamp}</p>}
          </div>
          
          {errors.general && <p className="text-sm text-destructive mt-1">{errors.general}</p>}
          
          <div>
             <Label htmlFor="temperature_c">Temperatura (°C)</Label>
             <Input
                id="temperature_c"
                name="temperature_c"
                type="number"
                step="0.1"
                value={formData.temperature_c ?? ''}
                onChange={handleChange}
                className="w-full mt-1"
             />
             {errors.temperature_c && <p className="text-sm text-destructive mt-1">{errors.temperature_c}</p>}
          </div>
          
          <div>
             <Label htmlFor="heart_rate">Frequência Cardíaca (bpm)</Label>
             <Input
                id="heart_rate"
                name="heart_rate"
                type="number"
                step="1"
                value={formData.heart_rate ?? ''}
                onChange={handleChange}
                className="w-full mt-1"
            />
            {errors.heart_rate && <p className="text-sm text-destructive mt-1">{errors.heart_rate}</p>}
          </div>
          
          <div>
            <Label htmlFor="respiratory_rate">Frequência Respiratória (irpm)</Label>
            <Input
                id="respiratory_rate"
                name="respiratory_rate"
                type="number"
                step="1"
                value={formData.respiratory_rate ?? ''}
                onChange={handleChange}
                className="w-full mt-1"
            />
            {errors.respiratory_rate && <p className="text-sm text-destructive mt-1">{errors.respiratory_rate}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="systolic_bp">PA Sistólica (mmHg)</Label>
              <Input
                id="systolic_bp"
                name="systolic_bp"
                type="number"
                step="1"
                value={formData.systolic_bp ?? ''}
                onChange={handleChange}
                className="w-full mt-1"
               />
              {errors.systolic_bp && <p className="text-sm text-destructive mt-1">{errors.systolic_bp}</p>}
            </div>
            
            <div>
               <Label htmlFor="diastolic_bp">PA Diastólica (mmHg)</Label>
               <Input
                id="diastolic_bp"
                name="diastolic_bp"
                type="number"
                step="1"
                value={formData.diastolic_bp ?? ''}
                onChange={handleChange}
                className="w-full mt-1"
              />
              {errors.diastolic_bp && <p className="text-sm text-destructive mt-1">{errors.diastolic_bp}</p>}
            </div>
          </div>
          
          <div>
             <Label htmlFor="oxygen_saturation">Saturação de O2 (%)</Label>
             <Input
                id="oxygen_saturation"
                name="oxygen_saturation"
                type="number"
                step="1"
                min="50"
                max="100"
                value={formData.oxygen_saturation ?? ''}
                onChange={handleChange}
                className="w-full mt-1"
            />
            {errors.oxygen_saturation && <p className="text-sm text-destructive mt-1">{errors.oxygen_saturation}</p>}
          </div>
          
          <div>
             <Label htmlFor="glasgow_coma_scale">Escala de Glasgow (3-15)</Label>
             <Input
                id="glasgow_coma_scale"
                name="glasgow_coma_scale"
                type="number"
                step="1"
                min="3"
                max="15"
                value={formData.glasgow_coma_scale ?? ''}
                onChange={handleChange}
                className="w-full mt-1"
              />
              {errors.glasgow_coma_scale && <p className="text-sm text-destructive mt-1">{errors.glasgow_coma_scale}</p>}
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            isLoading={isSubmitting}
          >
            Salvar Sinais Vitais
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default VitalSignsForm; 