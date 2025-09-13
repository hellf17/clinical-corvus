'use client';

import React from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { PatientCreate } from "@/types/patient";
import { createPatientWithGroupAssignment } from "@/services/patientService.client";
import { useAuth } from "@clerk/nextjs";
import { listGroups } from "@/services/groupService";
import { Group } from "@/types/group";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/Form";

// Define common diseases and conditions
const COMMON_DISEASES = [
  'Hipertensão Arterial',
  'Diabetes Mellitus tipo I',
  'Diabetes Mellitus tipo II',
  'Hipertensão pulmonar',
  'Valvopatia',
  'Aneurisma de aorta toracica',
  'Aneurisma de aorta abdominal',
  'Asma',
  'DPOC (Doença Pulmonar Obstrutiva Crônica)',
  'Artrite Reumatoide',
  'Osteoporose',
  'Depressão',
  'Transtorno de Ansiedade',
  'Hipotireoidismo',
  'Hipertireoidismo',
  'Dislipidemia (Colesterol Alto)',
  'Obesidade',
  'Neoplasia SNC',
  'Melanoma',
  'Carcinoma basocelular',
  'Carcinoma espinocelular',
  'Acidente Vascular Cerebral (AVC)',
  'Insuficiência Cardíaca',
  'Fibromialgia',
  'Enxaqueca Crônica',
  'Epilepsia',
  'Doença Renal Crônica',
  'Doença Hepática Crônica (ex: Cirrose)',
  'Infecções Crônicas (ex: HIV, Hepatite C)',
  'Doença Inflamatória Intestinal (Crohn, Retocolite)',
  'Lúpus Eritematoso Sistêmico',
  'Esquizofrenia',
  'Transtorno Bipolar',
  'Etilismo',
  'Doença de Parkinson',
  'Doença de Alzheimer',
  'Esclerose Múltipla',
  'Doença de Crohn',
  'Retocolite Ulcerativa',
  'Psoríase',
  'Dermatite Atópica',
  'Gota',
  'Lombalgia Crônica',
  'Cervicalgia Crônica',
  'Síndrome do Intestino Irritável',
  'Refluxo Gastroesofágico',
  'Pancreatite Crônica',
  'Colecistite Crônica',
  'Hepatite Autoimune',
  'Cirrose Biliar Primária',
  'Anemia Ferropriva',
  'Talassemia',
  'Hemofilia',
  'Linfoma',
  'Leucemia',
  'Mieloma Múltiplo',
  'Câncer de Mama',
  'Câncer de Pulmão',
  'Câncer Colorretal',
  'Câncer de Próstata',
  'Câncer de Ovário',
  'Câncer de Colo de Útero',
  'Câncer de Fígado',
  'Câncer de Pâncreas',
  'Câncer de Rim',
  'Doença de Paget',
  'Doença de Addison',
  'Síndrome de Cushing',
  'Feocromocitoma',
  'Acromegalia',
  'Diabetes Insipidus',
  'Insuficiência Adrenal',
  'Síndrome do Ovário Policístico (SOP)',
  'Endometriose',
  'Mioma Uterino',
  'Doença Inflamatória Pélvica (DIP)',
  'Infertilidade',
  'Disfunção Erétil',
  'Hiperplasia Prostática Benigna (HPB)',
  'Glaucoma',
  'Catarata',
  'Degeneração Macular',
  'Retinopatia Diabética',
  'Otite Média Crônica',
  'Sinusite Crônica',
  'Amigdalite Crônica',
  'Desvio de Septo Nasal',
  'Apneia Obstrutiva do Sono (AOS)',
  'Narcolepsia',
  'Síndrome das Pernas Inquietas',
  'Insônia Crônica',
  'Transtorno do Pânico',
  'Fobia Social',
  'Transtorno Obsessivo-Compulsivo (TOC)',
  'Transtorno de Estresse Pós-Traumático (TEPT)',
  'Anorexia Nervosa',
  'Bulimia Nervosa',
  'Transtorno de Compulsão Alimentar',
  'Distimia',
  'Ciclotimia',
  'Transtorno Afetivo Sazonal',
  'Esclerose Lateral Amiotrófica (ELA)',
  'Distrofia Muscular',
  'Miastenia Gravis',
  'Neuropatia Periférica',
  'Neuralgia do Trigêmeo',
  'Paralisia de Bell',
  'Síndrome de Guillain-Barré',
  'Meningite Crônica',
  'Encefalite Crônica',
  'Hidrocefalia',
  'Malformação de Chiari',
  'Síndrome de Tourette',
  'Autismo',
  'Transtorno do Déficit de Atenção com Hiperatividade (TDAH)',
  'Síndrome de Down',
  'Fibrose Cística',
  'Doença de Wilson',
  'Hemocromatose',
  'Deficiência de G6PD',
  'Trombofilia',
  'Doença de Von Willebrand',
  'Linfedema',
  'Varizes',
  'Trombose Venosa Profunda (TVP)',
  'Embolia Pulmonar',
  'Aterosclerose',
  'Angina Pectoris',
  'Infarto Agudo do Miocárdio (IAM)',
  'Cardiomiopatia',
  'Pericardite',
  'Endocardite',
  'Doença de Chagas',
  'Febre Reumática',
  'Síndrome de Raynaud',
  'Arterite Temporal',
  'Granulomatose com Poliangiite (Wegener)',
  'Policondrite Recidivante',
  'Retinopatia Hipertensiva',
  'Neuropatia Óptica Isquêmica',
  'Uveíte',
  'Ceratocone',
  'Glomerulonefrite',
  'Pielonefrite Crônica',
  'Cistite Intersticial',
  'Cálculos Renais',
  'Incontinência Urinária',
  'Doença de Peyronie',
  'Priapismo',
  'Criptorquidia',
  'Varicocele',
  'Hidrocele',
  'Doença de Paget do Osso',
  'Osteomalácia',
  'Raquitismo',
  'Condromalácia Patelar',
  'Bursite Crônica',
  'Tendinite Crônica',
  'Epicondilite Lateral (Cotovelo de Tenista)',
  'Síndrome do Túnel do Carpo',
  'Fascíte Plantar',
  'Esporão do Calcâneo',
  'Gastroenterite Crônica',
  'Síndrome Pós-Colecistectomia',
  'Doença Celíaca',
  'Diverticulite',
  'Hemorroidas',
  'Fissura Anal',
  'Fístula Anal',
  'Hérnia de Hiato',
  'Esofagite Eosinofílica',
  'Acalasia',
  'Doença de Hirschsprung',
  'Megacólon Chagasico',
  'Colite Microscópica',
  'Parasitoses Intestinais Crônicas',
  'Giardíase Crônica',
  'Amebíase Crônica',
  'Toxoplasmose Crônica',
  'Malária Crônica',
  'Leishmaniose Visceral',
  'Doença de Lyme Crônica',
  'Brucelose Crônica',
  'Hanseníase',
  'Tuberculose Extrapulmonar',
  'Histoplasmose',
  'Coccidioidomicose',
  'Paracoccidioidomicose',
  'Candidíase Sistêmica',
  'Aspergilose Invasiva',
  'Criptococose',
  'Pneumocistose',
  'Síndrome da Fadiga Crônica',
  'Sensibilidade Química Múltipla',
  'Síndrome do Edifício Doente',
  'Intoxicação por Metais Pesados',
  'Doença da Arranhadura do Gato',
  'Doença de Kawasaki',
  'Púrpura de Henoch-Schönlein',
  'Vasculite de Pequenos Vasos',
  'Crioglobulinemia',
  'Síndrome de Sjögren',
  'Esclerodermia',
  'Dermatomiosite',
  'Polimiosite',
  'Sarcoidose',
  'Amiloidose',
  'Anemia Falciforme',
  'Aplasia de Medula Óssea',
  'Mielodisplasia',
  'Policitemia Vera',
  'Trombocitemia Essencial',
  'Mielofibrose Primária',
  'Linfoma de Hodgkin',
  'Linfoma Não-Hodgkin',
  'Leucemia Mieloide Crônica (LMC)',
  'Leucemia Linfoide Crônica (LLC)',
  'Outra',
];

const ETHNICITY_OPTIONS = [
  { value: 'caucasian', label: 'Caucasiano/Branco' },
  { value: 'black', label: 'Negro/Afrodescendente' },
  { value: 'mixed', label: 'Pardo' },
  { value: 'asian', label: 'Asiático' },
  { value: 'indigenous', label: 'Indígena' },
  { value: 'other', label: 'Outro' },
  { value: 'prefer_not_to_say', label: 'Prefiro não informar' },
];

const patientFormSchema = z.object({
  name: z.string().min(1, { message: "Nome completo é obrigatório." }),
  birthDate: z.string().min(1, { message: "Data de nascimento é obrigatória." })
     .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Use o formato AAAA-MM-DD." }),
  gender: z.enum(['male', 'female', 'other'], { required_error: "Gênero é obrigatório." }),
  primary_diagnosis: z.string().min(1, { message: "Diagnóstico principal é obrigatório." }),
  weight: z.number().optional(),
  height: z.number().optional(),
  ethnicity: z.string().optional(),
  diseases: z.array(z.string()).default([]),
  otherDiseases: z.string().optional(),
});

type PatientFormData = z.infer<typeof patientFormSchema> & {
  weight?: number;
  height?: number;
};

interface NewPatientModalProps {
  onPatientCreated?: () => void;
}

export default function NewPatientModal({ onPatientCreated }: NewPatientModalProps) {
  const { getToken } = useAuth();
  const [groups, setGroups] = React.useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = React.useState<number | null>(null);
  const [groupsLoading, setGroupsLoading] = React.useState(true);
  const [groupsError, setGroupsError] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  
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
    
    if (open) {
      fetchGroups();
    }
  }, [open]);
  
  // Initialize react-hook-form
  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: {
      name: '',
      birthDate: '',
      gender: undefined,
      primary_diagnosis: '',
      weight: undefined,
      height: undefined,
      ethnicity: '',
      diseases: [],
      otherDiseases: ''
    }}
  );

  const { formState } = form;

  // Submit handler
  async function onSubmit(data: PatientFormData) {
    // Combine selected diseases with other diseases
    const comorbidities = [
      ...data.diseases,
      ...(data.otherDiseases ? [data.otherDiseases] : [])
    ].join(', ');

    const patientData: PatientCreate = {
      name: data.name,
      birthDate: data.birthDate,
      gender: data.gender,
      primary_diagnosis: data.primary_diagnosis || undefined,
      weight: data.weight || undefined,
      height: data.height || undefined,
      ethnicity: data.ethnicity || undefined,
      comorbidities: comorbidities || undefined,
      group_id: selectedGroupId || undefined
    };

    try {
      const newPatient = await createPatientWithGroupAssignment(patientData, selectedGroupId || undefined);
      toast.success(`Paciente "${newPatient.name}" criado com sucesso!`);
      
      // Reset form and close modal
      form.reset();
      setSelectedGroupId(null);
      setOpen(false);
      
      // Trigger refresh callback
      if (onPatientCreated) {
        onPatientCreated();
      }
      
    } catch (error: any) {
      console.error("Failed to create patient:", error);
      toast.error("Falha ao Criar Paciente", { description: error.message || 'Erro desconhecido ao salvar paciente.' });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-white text-white hover:bg-white/10 hidden md:flex items-center shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Paciente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Paciente</DialogTitle>
          <DialogDescription>
            Preencha as informações do paciente abaixo.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Personal Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Informações Pessoais</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
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
              </div>
              
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

            {/* Physical Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Informações Físicas</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso (kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" placeholder="Peso do paciente" {...field} disabled={formState.isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Altura (m)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="Altura do paciente" {...field} disabled={formState.isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Group Assignment */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Grupo (Opcional)</h4>
              <div className="space-y-2">
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
                      <SelectItem value="none">Nenhum grupo</SelectItem>
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

            {/* Medical History */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900">Histórico Médico</h4>
              
              <FormField
                control={form.control}
                name="ethnicity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etnia</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                      disabled={formState.isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma etnia" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ETHNICITY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="space-y-2">
                <Label>Histórico de Doenças</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border rounded">
                  {COMMON_DISEASES.map((disease) => (
                    <FormField
                      key={disease}
                      control={form.control}
                      name={`diseases`}
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={disease}
                            className="flex flex-row items-start space-x-3 space-y-0"
                          >
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value?.includes(disease)}
                                onChange={(e) => {
                                  const newValue = e.target.checked
                                    ? [...(field.value || []), disease]
                                    : (field.value || []).filter((d: string) => d !== disease);
                                  field.onChange(newValue);
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                disabled={formState.isSubmitting}
                              />
                            </FormControl>
                            <FormLabel className="font-normal text-sm">
                              {disease}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <FormField
                control={form.control}
                name="otherDiseases"
                render={({ field }) => {
                  const diseases = form.watch("diseases");
                  if (!diseases.includes('Outra')) return <></>;
                  return (
                    <FormItem>
                      <FormLabel>Outras Doenças (especifique)</FormLabel>
                      <FormControl>
                        <Input placeholder="Especifique outras doenças" {...field} disabled={formState.isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )
                }}
              />
              
            </div>
            
            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={formState.isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={formState.isSubmitting}>
                {formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar Paciente
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}