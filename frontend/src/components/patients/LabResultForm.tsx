'use client';

import React, { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { Textarea } from '@/components/ui/Textarea';
import { LabResult } from '@/types/health';
import { Calendar } from "@/components/ui/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { toast } from "sonner";

interface LabResultFormProps {
  onSubmit: (data: Omit<LabResult, 'result_id' | 'patient_id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  initialData?: Partial<LabResult>;
  isSubmitting?: boolean;
}

const LabResultForm: React.FC<LabResultFormProps> = ({
  onSubmit,
  onCancel,
  initialData = {},
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState({
    test_name: initialData.test_name || '',
    value_numeric: initialData.value_numeric !== undefined ? initialData.value_numeric : undefined,
    value_text: initialData.value_text || '',
    unit: initialData.unit || '',
    reference_range_low: initialData.reference_range_low !== undefined ? initialData.reference_range_low : undefined,
    reference_range_high: initialData.reference_range_high !== undefined ? initialData.reference_range_high : undefined,
    timestamp: initialData.timestamp || new Date().toISOString().split('T')[0],
    is_abnormal: initialData.is_abnormal || false,
    comments: initialData.comments || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    const numericFields = ['value_numeric', 'reference_range_low', 'reference_range_high'];

    if (numericFields.includes(name)) {
        const numValue = value === '' ? undefined : parseFloat(value);
        setFormData((prev) => ({ ...prev, [name]: numValue }));
    } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    // Clear error when field is modified
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
     setFormData((prev) => ({ ...prev, is_abnormal: !!checked }));
     if (errors.is_abnormal) {
        setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors.is_abnormal;
            return newErrors;
        });
     }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.test_name?.trim()) {
      newErrors.test_name = 'Nome do exame é obrigatório';
    }
    
    if (formData.value_numeric === undefined && !formData.value_text?.trim()) {
      newErrors.value = 'Valor numérico ou textual do resultado é obrigatório';
    }
    
    if (!formData.timestamp) {
      newErrors.timestamp = 'Data é obrigatória';
    } else {
        try {
            if (isNaN(new Date(formData.timestamp).getTime())) {
                 newErrors.timestamp = 'Formato inválido de Data.';
            }
        } catch (e) {
            newErrors.timestamp = 'Formato inválido de Data.';
        }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
       const dataToSubmit = {
           ...formData,
           timestamp: formData.timestamp ? new Date(formData.timestamp).toISOString() : new Date().toISOString(),
           is_abnormal: !!formData.is_abnormal
       };
       Object.keys(dataToSubmit).forEach(key => {
            if (dataToSubmit[key as keyof typeof dataToSubmit] === undefined) {
                 delete dataToSubmit[key as keyof typeof dataToSubmit];
            }
       });

      onSubmit(dataToSubmit);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Registro de Resultado de Exame</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test_name">Nome do Exame</Label>
            <Input
                id="test_name"
                name="test_name" 
                value={formData.test_name}
                onChange={handleChange}
                className="w-full mt-1"
                required
            />
            {errors.test_name && <p className="text-sm text-destructive mt-1">{errors.test_name}</p>}
           </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div>
                <Label htmlFor="value_numeric">Valor Numérico</Label>
                <Input
                id="value_numeric"
                name="value_numeric"
                type="number"
                step="any" 
                value={formData.value_numeric ?? ''}
                onChange={handleChange}
                className="w-full mt-1"
                />
                {errors.value && <p className="text-sm text-destructive mt-1">{errors.value}</p>}
             </div>
             <div>
                <Label htmlFor="value_text">Valor Textual</Label>
                 <Input
                id="value_text"
                name="value_text"
                value={formData.value_text ?? ''}
                onChange={handleChange}
                className="w-full mt-1"
                />
                {errors.value && <p className="text-sm text-destructive mt-1">{errors.value}</p>}
             </div>
          </div>
           <div>
              <Label htmlFor="unit">Unidade</Label>
              <Input
                id="unit"
                name="unit"
                value={formData.unit ?? ''}
                onChange={handleChange}
                className="w-full mt-1"
                />
                {errors.unit && <p className="text-sm text-destructive mt-1">{errors.unit}</p>}
           </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
                <Label htmlFor="reference_range_low">Ref. Inferior</Label>
                 <Input
                    id="reference_range_low"
                    name="reference_range_low"
                    type="number"
                    step="any"
                    value={formData.reference_range_low ?? ''}
                    onChange={handleChange}
                    className="w-full mt-1"
                />
             </div>
             <div>
                <Label htmlFor="reference_range_high">Ref. Superior</Label>
                 <Input
                    id="reference_range_high"
                    name="reference_range_high"
                    type="number"
                    step="any"
                    value={formData.reference_range_high ?? ''}
                    onChange={handleChange}
                    className="w-full mt-1"
                />
             </div>
          </div>
          
          <div>
            <Label htmlFor="timestamp">Data do Exame</Label>
            <Input
                id="timestamp"
                name="timestamp"
                type="date"
                value={formData.timestamp.substring(0, 10)} 
                onChange={handleChange}
                className="w-full mt-1"
                required
            />
             {errors.timestamp && <p className="text-sm text-destructive mt-1">{errors.timestamp}</p>}
          </div>
          
          <div className="flex items-center space-x-2 mt-2">
            <Checkbox
              id="is_abnormal"
              name="is_abnormal"
              checked={formData.is_abnormal}
              onCheckedChange={handleCheckboxChange}
            />
            <Label 
              htmlFor="is_abnormal" 
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Resultado anormal/fora da faixa de referência
            </Label>
          </div>
          
          <div>
             <Label htmlFor="comments">Observações (opcional)</Label>
              <Textarea
                id="comments"
                name="comments"
                placeholder="Observações adicionais..."
                value={formData.comments ?? ''}
                onChange={handleChange}
                className="w-full mt-1"
             />
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
            Salvar Resultado
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LabResultForm; 