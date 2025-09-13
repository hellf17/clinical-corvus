'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';

import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { Calendar } from "@/components/ui/Calendar";
import { cn } from "@/lib/utils";
import { CalendarIcon, PlusCircle, Loader2 } from 'lucide-react';
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

import { addManualLabResultClient } from '@/services/patientService.client';
// import { ManualLabResultInput } from '@/types/health'; // Remove incorrect import

// Define the input type locally based on form fields
interface ManualLabResultInput {
    test_name: string;
    value_numeric?: number | null;
    value_text?: string | null;
    unit?: string | null;
    timestamp: string; // Date string from input
    reference_range_low?: number | null;
    reference_range_high?: number | null;
    is_abnormal: boolean;
    comments?: string | null;
}

// Zod schema for form validation - simplified numeric handling
const labResultSchema = z.object({
  test_name: z.string().min(1, { message: "Nome do exame é obrigatório." }),
  timestamp: z.date({ required_error: "Data e hora do resultado são obrigatórios." }),
  
  // Accept strings, parse/validate later or on submit
  value_numeric: z.string().optional(), 
  value_text: z.string().nullish(),
  unit: z.string().nullish(),
  reference_range_low: z.string().optional(),
  reference_range_high: z.string().optional(),
  reference_text: z.string().nullish(),
  collection_datetime: z.date().nullish(),
  comments: z.string().nullish(),

}).refine(data => (data.value_numeric && data.value_numeric.trim() !== '') || (data.value_text && data.value_text.trim() !== ''), {
  // Refine check based on string values
  message: "Deve ser fornecido um valor numérico ou textual.",
  path: ["value_numeric"], // Attach error to one field for display
});

type LabResultFormValues = z.infer<typeof labResultSchema>;

interface ManualLabEntryFormProps {
  patientId: number;
  onResultAdded: () => void; // Callback to trigger refresh
}

export const ManualLabEntryForm: React.FC<ManualLabEntryFormProps> = ({ patientId, onResultAdded }) => {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { getToken } = useAuth();

  const form = useForm<LabResultFormValues>({
    resolver: zodResolver(labResultSchema), // Resolver now works with string types
    defaultValues: {
      test_name: '',
      timestamp: new Date(),
      value_numeric: '', // Default to empty string
      value_text: null,
      unit: null,
      reference_range_low: '', // Default to empty string
      reference_range_high: '', // Default to empty string
      reference_text: null,
      collection_datetime: null,
      comments: null,
    },
  });

  // Parse string values to number | null helper
  const parseOptionalFloat = (val: string | undefined | null): number | null => {
       if (val === undefined || val === null || val.trim() === '') return null;
       const parsed = parseFloat(val);
       return isNaN(parsed) ? null : parsed; // Return null if NaN
  };

  const onSubmit = async (values: LabResultFormValues) => {
    setIsSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("Token de autenticação não encontrado.");
      }
      
      // Manually parse numeric strings before sending to service
      const inputData: ManualLabResultInput = {
        test_name: values.test_name,
        timestamp: values.timestamp.toISOString(), // Ensure ISO string
        value_numeric: parseOptionalFloat(values.value_numeric),
        value_text: values.value_text,
        unit: values.unit,
        reference_range_low: parseOptionalFloat(values.reference_range_low),
        reference_range_high: parseOptionalFloat(values.reference_range_high),
        // reference_text: values.reference_text, // Not in ManualLabResultInput
        // collection_datetime: values.collection_datetime?.toISOString(), // Not in ManualLabResultInput
        comments: values.comments,
        // is_abnormal is not directly in the form, needs derivation or separate handling if required by service
        is_abnormal: false, // Placeholder - derive if needed based on parsed numbers and ranges
      };
      
       // Optional: derive is_abnormal based on parsed values
       if (inputData.value_numeric !== null && inputData.value_numeric !== undefined && 
           inputData.reference_range_low !== null && inputData.reference_range_low !== undefined && 
           inputData.value_numeric < inputData.reference_range_low) {
           inputData.is_abnormal = true;
       }
       if (inputData.value_numeric !== null && inputData.value_numeric !== undefined && 
           inputData.reference_range_high !== null && inputData.reference_range_high !== undefined && 
           inputData.value_numeric > inputData.reference_range_high) {
           inputData.is_abnormal = true;
       }

      const createdResult = await addManualLabResultClient(patientId, inputData);
      
      toast.success(`Resultado para "${createdResult.test_name}" adicionado com sucesso!`);
      onResultAdded(); 
      setShowForm(false); 
      form.reset(); 

    } catch (error: any) {
      console.error("Erro ao adicionar resultado manual:", error);
      toast.error("Falha ao adicionar resultado", {
        description: error.message || "Ocorreu um erro inesperado.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showForm) {
    return (
      <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4 mb-2">
        <PlusCircle className="mr-2 h-4 w-4" />
        Adicionar Resultado Manualmente
      </Button>
    );
  }

  return (
    <Card className="mt-4 mb-6 border-primary/20 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Adicionar Resultado Manual</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Row 1: Test Name & Result Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="test_name">Nome do Exame <span className="text-destructive">*</span></Label>
              <Input id="test_name" {...form.register("test_name")} />
              {form.formState.errors.test_name && <p className="text-sm text-destructive mt-1">{form.formState.errors.test_name.message}</p>}
            </div>
            <div>
              <Label htmlFor="timestamp">Data/Hora do Resultado <span className="text-destructive">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !form.watch("timestamp") && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.watch("timestamp") ? format(form.watch("timestamp"), "PPP HH:mm", { locale: ptBR }) : <span>Escolha uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={form.watch("timestamp")}
                    onSelect={(date) => form.setValue("timestamp", date || new Date(), { shouldValidate: true })}
                    initialFocus
                    locale={ptBR}
                  />
                   {/* Basic Time Input - Consider a dedicated time picker library for better UX */}
                   <div className="p-2 border-t">
                       <Input 
                         type="time" 
                         defaultValue={form.watch("timestamp") ? format(form.watch("timestamp"), 'HH:mm') : '00:00'}
                         onChange={(e) => {
                             const currentTime = form.watch("timestamp") || new Date();
                             const [hours, minutes] = e.target.value.split(':').map(Number);
                             currentTime.setHours(hours);
                             currentTime.setMinutes(minutes);
                             form.setValue("timestamp", new Date(currentTime), { shouldValidate: true });
                         }}
                       />
                   </div>
                </PopoverContent>
              </Popover>
              {form.formState.errors.timestamp && <p className="text-sm text-destructive mt-1">{form.formState.errors.timestamp.message}</p>}
            </div>
          </div>
          
          {/* Row 2: Numeric Value & Text Value */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="value_numeric">Valor Numérico</Label>
              {/* Register as string, type=text or number okay */}
              <Input id="value_numeric" type="text" {...form.register("value_numeric")} />
            </div>
            <div>
              <Label htmlFor="value_text">Valor Textual</Label>
              <Input id="value_text" {...form.register("value_text")} />
            </div>
          </div>
           {form.formState.errors.value_numeric && 
             <p className="text-sm text-destructive mt-1">{form.formState.errors.value_numeric.message}</p>}

          {/* Row 3: Unit & Collection Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
              <Label htmlFor="unit">Unidade</Label>
              <Input id="unit" {...form.register("unit")} />
            </div>
            <div>
               <Label htmlFor="collection_datetime">Data/Hora da Coleta (Opcional)</Label>
               <Popover>
                 <PopoverTrigger asChild>
                   <Button
                     variant={"outline"}
                     className={cn(
                       "w-full justify-start text-left font-normal",
                       !form.watch("collection_datetime") && "text-muted-foreground"
                     )}
                   >
                     <CalendarIcon className="mr-2 h-4 w-4" />
                     {form.watch("collection_datetime") ? format(form.watch("collection_datetime")!, "PPP HH:mm", { locale: ptBR }) : <span>Escolha uma data</span>}
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0">
                   <Calendar
                     mode="single"
                     selected={form.watch("collection_datetime") || undefined}
                     onSelect={(date) => form.setValue("collection_datetime", date || null)}
                     initialFocus
                     locale={ptBR}
                   />
                   <div className="p-2 border-t">
                       <Input 
                         type="time" 
                         defaultValue={form.watch("collection_datetime") ? format(form.watch("collection_datetime")!, 'HH:mm') : ''}
                         onChange={(e) => {
                             const currentDate = form.watch("collection_datetime") || new Date();
                             const [hours, minutes] = e.target.value.split(':').map(Number);
                             currentDate.setHours(hours);
                             currentDate.setMinutes(minutes);
                             form.setValue("collection_datetime", new Date(currentDate));
                         }}
                       />
                   </div>
                 </PopoverContent>
               </Popover>
             </div>
          </div>

          {/* Row 4: Reference Range (Numeric or Text) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reference_range_low">Ref. Inferior</Label>
              <Input id="reference_range_low" type="text" {...form.register("reference_range_low")} />
            </div>
            <div>
              <Label htmlFor="reference_range_high">Ref. Superior</Label>
              <Input id="reference_range_high" type="text" {...form.register("reference_range_high")} />
            </div>
          </div>

          {/* Row 5: Comments */}
          <div>
            <Label htmlFor="comments">Observações</Label>
            <Textarea id="comments" {...form.register("comments")} />
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
                type="button" 
                variant="ghost" 
                onClick={() => {
                    setShowForm(false);
                    form.reset();
                }} 
                disabled={isSubmitting}
             > 
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar Resultado
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}; 