'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Patient, PatientUpdate, EmergencyContact } from "@/types/patient";
import { updatePatientClient, getPatientByIdClient } from "@/services/patientService.client";
import { useAuth } from "@clerk/nextjs";
import { listGroups, assignPatientToGroup, removePatientFromGroup, listGroupPatients } from "@/services/groupService";
import { Group, GroupPatient } from "@/types/group";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";

// Define Zod schema for validation
const emergencyContactSchema = z.object({
  name: z.string().min(1, { message: "Nome do contato é obrigatório." }),
  relationship: z.string().min(1, { message: "Parentesco é obrigatório." }),
  phone: z.string()
    .min(1, { message: "Telefone do contato é obrigatório." })
    .regex(/^\d{10,11}$/, { message: "Telefone deve ter 10 ou 11 dígitos." }) // Basic digit check
}).partial();

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
  emergencyContact: emergencyContactSchema.optional(),
  primary_diagnosis: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientFormSchema>;

export default function EditPatientPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;
    
    const { getToken } = useAuth();
    const [patient, setPatient] = useState<Patient | null>(null);
    const [groups, setGroups] = useState<Group[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
    const [currentGroupId, setCurrentGroupId] = useState<number | null>(null);
    const [groupsLoading, setGroupsLoading] = useState(true);
    const [groupsError, setGroupsError] = useState<string | null>(null);
    const [patientLoading, setPatientLoading] = useState(true);
    const [patientError, setPatientError] = useState<string | null>(null);
    
    // Initialize react-hook-form
    const form = useForm<PatientFormData>({
        resolver: zodResolver(patientFormSchema),
        defaultValues: {
            name: '',
            email: '',
            birthDate: '', 
            gender: undefined,
            phone: '',
            documentNumber: '',
            patientNumber: '',
            address: '',
            city: '',
            state: '',
            zipCode: '',
            insuranceProvider: '',
            insuranceNumber: '',
            primary_diagnosis: '',
            emergencyContact: {
                name: '',
                relationship: '',
                phone: ''
            }
        },
    });
    
    // Fetch groups for selection
    useEffect(() => {
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
    
    // Fetch patient data
    useEffect(() => {
        const fetchPatient = async () => {
            try {
                setPatientLoading(true);
                setPatientError(null);
                
                const patientData = await getPatientByIdClient(id);
                if (patientData) {
                    setPatient(patientData);
                    
                    // Set form default values
                    form.reset({
                        name: patientData.name || '',
                        email: patientData.email || '',
                        birthDate: patientData.birthDate || '',
                        gender: patientData.gender || undefined,
                        phone: patientData.phone || '',
                        documentNumber: patientData.documentNumber || '',
                        patientNumber: patientData.patientNumber || '',
                        address: patientData.address || '',
                        city: patientData.city || '',
                        state: patientData.state || '',
                        zipCode: patientData.zipCode || '',
                        insuranceProvider: patientData.insuranceProvider || '',
                        insuranceNumber: patientData.insuranceNumber || '',
                        primary_diagnosis: patientData.primary_diagnosis || '',
                        emergencyContact: patientData.emergencyContact || {
                            name: '',
                            relationship: '',
                            phone: ''
                        }
                    });
                    
                    // Check if patient is already in a group
                    // This is a simplified approach - in a real implementation, you would
                    // have a more efficient way to get patient's current group
                    for (const group of groups) {
                            try {
                                const patientsResponse = await listGroupPatients(group.id);
                                const patientInGroup = patientsResponse.items?.find((p: GroupPatient) => p.patient_id === parseInt(id));
                                if (patientInGroup) {
                                    setCurrentGroupId(group.id);
                                    setSelectedGroupId(group.id);
                                    break;
                                }
                            } catch (err) {
                                console.warn(`Failed to check group ${group.id} for patient assignment`, err);
                            }
                        }
                }
            } catch (err: any) {
                console.error("Error fetching patient:", err);
                setPatientError(err.message || "Falha ao buscar paciente.");
            } finally {
                setPatientLoading(false);
            }
        };
        
        if (id && groups.length > 0) {
            fetchPatient();
        }
    }, [id, groups, form, getToken]);

    const { formState } = form;

    // Submit handler
    async function onSubmit(data: PatientFormData) {
        try {
            // Map Zod schema data to PatientUpdate type
            const patientData: PatientUpdate = {
                name: data.name,
                email: data.email,
                birthDate: data.birthDate,
                gender: data.gender,
                phone: data.phone,
                address: data.address,
                city: data.city,
                state: data.state,
                zipCode: data.zipCode,
                documentNumber: data.documentNumber,
                patientNumber: data.patientNumber,
                insuranceProvider: data.insuranceProvider || undefined,
                insuranceNumber: data.insuranceNumber || undefined,
                emergencyContact: data.emergencyContact &&
                    data.emergencyContact.name &&
                    data.emergencyContact.phone &&
                    data.emergencyContact.relationship ? {
                    name: data.emergencyContact.name,
                    phone: data.emergencyContact.phone,
                    relationship: data.emergencyContact.relationship
                } : undefined,
            };

            // Update the patient
            const updatedPatient: Patient = await updatePatientClient(parseInt(id), patientData);
            
            // Handle group assignment changes
            // Remove from current group if needed
            if (currentGroupId && selectedGroupId !== currentGroupId) {
                try {
                    await removePatientFromGroup(currentGroupId, parseInt(id));
                } catch (err) {
                    console.warn("Failed to remove patient from old group:", err);
                }
            }
            
            // Add to new group if needed
            if (selectedGroupId && selectedGroupId !== currentGroupId) {
                try {
                    await assignPatientToGroup(selectedGroupId, { patient_id: parseInt(id) });
                } catch (err: any) {
                    console.error("Failed to assign patient to group:", err);
                    toast.error("Paciente atualizado, mas falha ao atribuir ao grupo", {
                        description: err.message || 'Erro ao atribuir paciente ao grupo.'
                    });
                }
            } else {
                toast.success(`Paciente "${updatedPatient.name}" atualizado com sucesso!`);
            }
            
            router.push(`/dashboard-doctor/patients/${id}/overview`);
        } catch (error: any) {
            console.error("Failed to update patient:", error);
            toast.error("Falha ao Atualizar Paciente", { description: error.message || 'Erro desconhecido ao salvar paciente.' });
        }
    }

    if (patientLoading) {
        return (
            <div className="container mx-auto max-w-3xl py-8">
                <div className="flex items-center justify-center">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span>Carregando paciente...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (patientError) {
        return (
            <div className="container mx-auto max-w-3xl py-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-destructive">Erro</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive">{patientError}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="container mx-auto max-w-3xl py-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Erro</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-destructive">Paciente não encontrado.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-3xl py-8">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Editar Paciente</CardTitle>
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
                                <FormField
                                    control={form.control}
                                    name="primary_diagnosis"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Diagnóstico Principal</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Diagnóstico principal do paciente" {...field} disabled={formState.isSubmitting} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            
                            {/* Group Assignment */}
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
                            <Button type="submit" disabled={formState.isSubmitting || !formState.isValid}>
                                {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar Alterações
                        </Button>
                    </CardFooter>
                </Card>
            </form>
            </Form>
        </div>
    );
}