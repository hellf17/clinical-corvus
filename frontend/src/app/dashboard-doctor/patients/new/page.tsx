'use client'; // This page will involve a form, make it client component

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label'; // Corrected casing
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Patient, PatientCreate, EmergencyContact } from "@/types/patient"; // Import types
import { createPatientClient } from "@/services/patientService.client"; // TODO: Implement createPatient in service
import { useAuth } from "@clerk/nextjs"; // Import client-side auth hook
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form"; // Correct casing

// Define Zod schema for validation
const emergencyContactSchema = z.object({
  name: z.string().min(1, { message: "Nome do contato é obrigatório." }),
  relationship: z.string().min(1, { message: "Parentesco é obrigatório." }),
  phone: z.string()
    .min(1, { message: "Telefone do contato é obrigatório." })
    .regex(/^\d{10,11}$/, { message: "Telefone deve ter 10 ou 11 dígitos." }) // Basic digit check
});

const patientFormSchema = z.object({
  name: z.string().min(1, { message: "Nome completo é obrigatório." }),
  email: z.string().email({ message: "Email inválido." }).min(1, { message: "Email é obrigatório." }),
  birthDate: z.string().min(1, { message: "Data de nascimento é obrigatória." })
     .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Use o formato AAAA-MM-DD." }),
  gender: z.enum(['male', 'female', 'other'], { required_error: "Gênero é obrigatório." }),
  phone: z.string()
    .min(1, { message: "Telefone é obrigatório." })
    .regex(/^\d{10,11}$/, { message: "Telefone deve ter 10 ou 11 dígitos." }), // Basic digit check
  documentNumber: z.string()
    .min(1, { message: "Documento (CPF/RG) é obrigatório." })
    .regex(/^\d{7,11}$/, { message: "CPF/RG deve ter entre 7 e 11 dígitos." }), // Basic digit check (CPF or RG)
  patientNumber: z.string().min(1, { message: "Número do paciente (prontuário) é obrigatório." }),
  address: z.string().min(1, { message: "Logradouro é obrigatório." }),
  city: z.string().min(1, { message: "Cidade é obrigatória." }),
  state: z.string().min(1, { message: "Estado é obrigatório." }),
  zipCode: z.string()
    .min(1, { message: "CEP é obrigatório." })
    .regex(/^\d{5}-?\d{3}$/, { message: "CEP inválido (use XXXXX-XXX ou XXXXXXXX)." }), // Basic CEP format
  insuranceProvider: z.string().optional(),
  insuranceNumber: z.string().optional(),
  emergencyContact: emergencyContactSchema
});

type PatientFormData = z.infer<typeof patientFormSchema>;

export default function NewPatientPage() {
    const router = useRouter();
    const { getToken } = useAuth(); // Get client-side token function
    
    // Initialize react-hook-form
    const form = useForm<PatientFormData>({
        resolver: zodResolver(patientFormSchema),
        defaultValues: {
            name: '',
            email: '',
            birthDate: '', 
            gender: undefined, // Default to undefined for Select placeholder
            phone: '',
            documentNumber: '',
            patientNumber: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            insuranceProvider: '',
            insuranceNumber: '',
            emergencyContact: {
                name: '',
                relationship: '',
                phone: ''
            }
        },
    });

    const { formState } = form; // Get form state

    // Refactored submit handler
    async function onSubmit(data: PatientFormData) {
        const token = await getToken(); // Get token on submit
        if (!token) {
            toast.error("Erro de Autenticação", { description: "Não foi possível obter o token de autenticação. Faça login novamente." });
            return;
        }

        // Map Zod schema data to PatientCreate type (should be compatible)
        const patientData: PatientCreate = {
            ...data,
            gender: data.gender, // Already correct type from enum
            // Ensure optional fields are undefined if empty string (or handle in backend)
            insuranceProvider: data.insuranceProvider || undefined,
            insuranceNumber: data.insuranceNumber || undefined,
        };

        try {
            // Pass the token to the service function
            const newPatient: Patient = await createPatientClient(patientData, token);
            toast.success(`Paciente "${newPatient.name}" criado com sucesso!`);
            // Use the patient_id from the response for navigation
            // Ensure backend returns consistent ID field (patient_id or id)
            router.push(`/patients/${newPatient.patient_id}`); // Use patient_id assuming it exists
        } catch (error: any) {
            console.error("Failed to create patient:", error);
            // Display the detailed error message from the service function
            toast.error("Falha ao Criar Paciente", { description: error.message || 'Erro desconhecido ao salvar paciente.' });
        } 
        // No need for manual setIsSubmitting(false), react-hook-form handles it
        }

    return (
        <div className="container mx-auto max-w-3xl py-8">
            {/* Use Shadcn Form component */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Adicionar Novo Paciente</CardTitle>
                    </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Personal Information Section */}
                            <h3 className="text-lg font-semibold border-b pb-2 mb-4">Informações Pessoais</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome Completo</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome do Paciente" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="email@example.com" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="birthDate"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data de Nascimento</FormLabel>
                                            <FormControl>
                                                <Input type="date" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                  control={form.control}
                                  name="gender"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Gênero</FormLabel>
                                      <Select 
                                        onValueChange={field.onChange} 
                                        defaultValue={field.value} 
                                        disabled={formState.isSubmitting}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                        </FormControl>
                                    <SelectContent>
                                        <SelectItem value="male">Masculino</SelectItem>
                                        <SelectItem value="female">Feminino</SelectItem>
                                        <SelectItem value="other">Outro</SelectItem>
                                    </SelectContent>
                                </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone</FormLabel>
                                            <FormControl>
                                                <Input type="tel" placeholder="(XX) XXXXX-XXXX" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="documentNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Documento (CPF/RG)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Número do Documento" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="patientNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Número do Paciente (Prontuário)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Número Interno" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            {/* Address Section */}
                            <h3 className="text-lg font-semibold border-b pb-2 mt-6 mb-4">Endereço</h3>
                            <FormField
                                control={form.control}
                                name="address"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Logradouro</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Rua, Avenida, etc." {...field} disabled={formState.isSubmitting} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cidade</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Cidade" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado</FormLabel>
                                            <FormControl>
                                                <Input placeholder="UF" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="zipCode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CEP</FormLabel>
                                            <FormControl>
                                                <Input placeholder="XXXXX-XXX" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Insurance Section */}
                            <h3 className="text-lg font-semibold border-b pb-2 mt-6 mb-4">Convênio (Opcional)</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="insuranceProvider"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome do Convênio</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome da Seguradora" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="insuranceNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Número da Carteirinha</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Número do Plano" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Emergency Contact Section */}
                            <h3 className="text-lg font-semibold border-b pb-2 mt-6 mb-4">Contato de Emergência</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="emergencyContact.name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nome do Contato" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="emergencyContact.relationship"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Parentesco</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Pai, Mãe, Cônjuge..." {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="emergencyContact.phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone</FormLabel>
                                            <FormControl>
                                                <Input type="tel" placeholder="(XX) XXXXX-XXXX" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                        </div>
                    </CardContent>
                        <CardFooter className="flex justify-end gap-2 border-t pt-6">
                            <Button type="button" variant="outline" onClick={() => router.back()} disabled={formState.isSubmitting}>
                            Cancelar
                        </Button>
                            <Button type="submit" disabled={formState.isSubmitting || !formState.isValid}> {/* Disable if submitting or form invalid */}
                                {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Paciente
                        </Button>
                    </CardFooter>
                </Card>
            </form>
            </Form>
        </div>
    );
} 