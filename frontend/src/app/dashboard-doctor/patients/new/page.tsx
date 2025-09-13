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
import { createPatientWithGroupAssignment } from "@/services/patientService.client"; // TODO: Implement createPatient in service
import { useAuth } from "@clerk/nextjs"; // Import client-side auth hook
import { listGroups, assignPatientToGroup } from "@/services/groupService"; // Import group service
import { Group } from "@/types/group"; // Import group types
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
  birthDate: z.string().min(1, { message: "Data de nascimento é obrigatória." })
     .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Use o formato AAAA-MM-DD." }),
  gender: z.enum(['male', 'female', 'other'], { required_error: "Gênero é obrigatório." }),
  ethnicity: z.string().optional(),
  diseaseHistory: z.string().optional(),
  familyDiseaseHistory: z.string().optional(),
  emergencyContact: emergencyContactSchema
});

type PatientFormData = z.infer<typeof patientFormSchema>;

export default function NewPatientPage() {
    const router = useRouter();
    const { getToken } = useAuth(); // Get client-side token function
    const [groups, setGroups] = React.useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = React.useState<number | null>(null);
    const [groupsLoading, setGroupsLoading] = React.useState(true);
    const [groupsError, setGroupsError] = React.useState<string | null>(null);
    
    // Fetch groups for selection
    React.useEffect(() => {
        const fetchGroups = async () => {
            try {
                setGroupsLoading(true);
                setGroupsError(null);
                const response = await listGroups();
                setGroups(response.items);
            } catch (err: any) {
                console.error("Error fetching groups:", err);
                setGroupsError(err.message || "Falha ao buscar grupos.");
            } finally {
                setGroupsLoading(false);
            }
        };
        
        fetchGroups();
    }, []);
    
    // Initialize react-hook-form
    const form = useForm<PatientFormData>({
        resolver: zodResolver(patientFormSchema),
        defaultValues: {
            name: '',
            birthDate: '',
            gender: undefined, // Default to undefined for Select placeholder
            ethnicity: '',
            diseaseHistory: '',
            familyDiseaseHistory: '',
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
            ethnicity: data.ethnicity || undefined,
            diseaseHistory: data.diseaseHistory || undefined,
            familyDiseaseHistory: data.familyDiseaseHistory || undefined,
            group_id: selectedGroupId || undefined, // Add group assignment to patient data
        };

        try {
            // Pass the token and group ID to the service function
            const newPatient: Patient = await createPatientWithGroupAssignment(patientData, selectedGroupId || undefined);
            toast.success(`Paciente "${newPatient.name}" criado com sucesso!`);
            
            // Use the patient_id from the response for navigation
            // Ensure backend returns consistent ID field (patient_id or id)
            router.push(`/dashboard-doctor/patients/${newPatient.patient_id}/overview`); // Use patient_id assuming it exists
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
  
                              {/* New fields for medical reasons */}
                              <FormField
                                  control={form.control}
                                  name="ethnicity"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Etnia (Opcional)</FormLabel>
                                          <FormControl>
                                              <Input placeholder="Ex: Caucasiana, Afrodescendente, Asiática, etc." {...field} disabled={formState.isSubmitting} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="diseaseHistory"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Histórico de Doenças (Opcional)</FormLabel>
                                          <FormControl>
                                              <Textarea placeholder="Doenças pré-existentes, cirurgias, internações, etc." {...field} disabled={formState.isSubmitting} rows={4} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="familyDiseaseHistory"
                                  render={({ field }) => (
                                      <FormItem>
                                          <FormLabel>Histórico Familiar de Doenças (Opcional)</FormLabel>
                                          <FormControl>
                                              <Textarea placeholder="Doenças relevantes na família (pais, avós, irmãos, etc.)" {...field} disabled={formState.isSubmitting} rows={4} />
                                          </FormControl>
                                          <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              
                              {/* Group Assignment - Moved up */}
                              <h3 className="text-lg font-semibold border-b pb-2 mt-6 mb-4">Atribuição de Grupo (Opcional)</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                      <Label htmlFor="group">Grupo (Opcional)</Label>
                                      {groupsLoading ? (
                                          <div className="flex items-center text-sm text-muted-foreground">
                                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                              Carregando grupos...
                                          </div>
                                      ) : groupsError ? (
                                          <div className="text-sm text-destructive">{groupsError}</div>
                                      ) : (
                                          <Select
                                              value={selectedGroupId?.toString() || ''}
                                              onValueChange={(value) => setSelectedGroupId(value ? parseInt(value) : null)}
                                          >
                                              <SelectTrigger>
                                                  <SelectValue placeholder="Selecione um grupo" />
                                              </SelectTrigger>
                                              <SelectContent>
                                                  <SelectItem value="">Nenhum grupo</SelectItem>
                                                  {groups.map((group) => (
                                                      <SelectItem key={group.id} value={group.id.toString()}>
                                                          {group.name}
                                                      </SelectItem>
                                                  ))}
                                              </SelectContent>
                                          </Select>
                                      )}
                                  </div>
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