"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/Calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/Popover";
import { VitalSignCreateInput } from "@/types/health";
import { addVitalSignClient } from "@/services/patientService.client";

import { Button } from "@/components/ui/Button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";
import { Input } from "@/components/ui/Input";

// Zod schema for validation - matches VitalSignCreate backend schema
const vitalSignFormSchema = z.object({
  timestamp: z.date({
    required_error: "Timestamp is required.",
  }),
  temperature_c: z.coerce.number().optional().nullable(),
  heart_rate: z.coerce.number().int().positive().optional().nullable(),
  respiratory_rate: z.coerce.number().int().positive().optional().nullable(),
  systolic_bp: z.coerce.number().int().positive().optional().nullable(),
  diastolic_bp: z.coerce.number().int().positive().optional().nullable(),
  oxygen_saturation: z.coerce.number().min(0).max(100).optional().nullable(),
  glasgow_coma_scale: z.coerce.number().int().min(3).max(15).optional().nullable(),
  fio2_input: z.coerce.number().min(0.21).max(1.0).optional().nullable(),
});

type VitalSignFormValues = z.infer<typeof vitalSignFormSchema>;

interface VitalSignsEntryFormProps {
  patientId: number | string;
  onSuccess?: () => void; // Optional callback on successful submission
}

export function VitalSignsEntryForm({ patientId, onSuccess }: VitalSignsEntryFormProps) {
  const { getToken } = useAuth();

  const form = useForm<VitalSignFormValues>({
    resolver: zodResolver(vitalSignFormSchema),
    defaultValues: { // Set sensible defaults
      timestamp: new Date(),
      temperature_c: null,
      heart_rate: null,
      respiratory_rate: null,
      systolic_bp: null,
      diastolic_bp: null,
      oxygen_saturation: null,
      glasgow_coma_scale: 15, // Default GCS often 15 if not impaired
      fio2_input: 0.21, // Default FiO2 to room air
    },
  });

  const onSubmit = async (data: VitalSignFormValues) => {
    const token = await getToken();
    if (!token) {
      toast.error("Authentication Error", { description: "Unable to get authentication token." });
      return;
    }

    // Prepare data for the API (match VitalSignCreateInput)
    const apiData: VitalSignCreateInput = {
        ...data,
        // Convert optional empty strings from number inputs back to null
        temperature_c: data.temperature_c || null,
        heart_rate: data.heart_rate || null,
        respiratory_rate: data.respiratory_rate || null,
        systolic_bp: data.systolic_bp || null,
        diastolic_bp: data.diastolic_bp || null,
        oxygen_saturation: data.oxygen_saturation || null,
        glasgow_coma_scale: data.glasgow_coma_scale || null,
        fio2_input: data.fio2_input || null,
    };

    const toastId = toast.loading("Saving Vital Signs...");

    try {
      const result = await addVitalSignClient(patientId, apiData, token);
      toast.success("Vital Signs Saved", {
        id: toastId,
        description: `Record ID: ${result.vital_id} at ${format(new Date(result.timestamp), "PPpp")}`,
      });
      form.reset(); // Reset form to defaults
      onSuccess?.(); // Call optional success callback
    } catch (error) {
      console.error("Failed to save vital signs:", error);
      toast.error("Failed to Save", {
        id: toastId,
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Timestamp Field (Date Picker) */}
        <FormField
          control={form.control}
          name="timestamp"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Timestamp</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP HH:mm") // Include time
                      ) : (
                        <span>Pick a date and time</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  {/* Need a DateTime picker, Calendar only does Date. Using Calendar for now. */}
                  {/* For real app, use a DateTime picker component */}
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                  {/* Simple time input (could be improved) */}
                   <div className="p-2 border-t border-border">
                     <Input 
                        type="time" 
                        defaultValue={format(field.value || new Date(), 'HH:mm')} 
                        onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(':').map(Number);
                            const newDate = new Date(field.value);
                            newDate.setHours(hours, minutes);
                            field.onChange(newDate);
                        }}
                     />
                   </div>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Date and time when the vital signs were recorded.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Vital Sign Fields in a Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="temperature_c"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Temperature (°C)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" placeholder="e.g., 36.6" {...field} value={field.value ?? ''}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="heart_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Heart Rate (bpm)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 70" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="respiratory_rate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Respiratory Rate (rpm)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 16" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="systolic_bp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Systolic BP (mmHg)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 120" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="diastolic_bp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Diastolic BP (mmHg)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 80" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="oxygen_saturation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SpO2 (%)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" placeholder="e.g., 98" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="glasgow_coma_scale"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Glasgow Coma Scale</FormLabel>
                <FormControl>
                  <Input type="number" min="3" max="15" placeholder="3-15" {...field} value={field.value ?? ''} />
                </FormControl>
                 <FormDescription>Score from 3 (deep coma) to 15 (fully alert).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="fio2_input"
            render={({ field }) => (
              <FormItem>
                <FormLabel>FiO2 (as decimal)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0.21" max="1.0" placeholder="0.21-1.0" {...field} value={field.value ?? ''} />
                </FormControl>
                 <FormDescription>Fraction of inspired O2 (e.g., 0.21 for room air).</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save Vital Signs"}
        </Button>
      </form>
    </Form>
  );
} 