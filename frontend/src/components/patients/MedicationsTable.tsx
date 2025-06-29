import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useUIStore } from '@/store/uiStore';
import { Edit, Trash, Plus, Power, PowerOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from '@/components/ui/Spinner';
import { 
    AlertDialog, 
    AlertDialogAction, 
    AlertDialogCancel, 
    AlertDialogContent, 
    AlertDialogDescription, 
    AlertDialogFooter, 
    AlertDialogHeader, 
    AlertDialogTitle, 
    AlertDialogTrigger 
} from "@/components/ui/AlertDialog";
import { Medication, MedicationCreate, MedicationUpdate } from '@/types/medication';
import { MedicationStatus, MedicationRoute, MedicationFrequency } from '@/types/enums';
import { medicationService } from '@/services/medicationService';
import { useAuth } from '@clerk/nextjs';
import useSWR from 'swr';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { Label } from '@/components/ui/Label';

// Human-readable labels
const routeLabels = {
  [MedicationRoute.ORAL]: "Oral",
  [MedicationRoute.INTRAVENOUS]: "Intravenoso",
  [MedicationRoute.INTRAMUSCULAR]: "Intramuscular",
  [MedicationRoute.SUBCUTANEOUS]: "Subcutâneo",
  [MedicationRoute.INHALATION]: "Inalação",
  [MedicationRoute.TOPICAL]: "Tópico",
  [MedicationRoute.RECTAL]: "Retal",
  [MedicationRoute.OTHER]: "Outro"
};

const frequencyLabels = {
  [MedicationFrequency.ONCE]: "Dose única",
  [MedicationFrequency.DAILY]: "Uma vez ao dia",
  [MedicationFrequency.BID]: "Duas vezes ao dia (12/12h)",
  [MedicationFrequency.TID]: "Três vezes ao dia (8/8h)",
  [MedicationFrequency.QID]: "Quatro vezes ao dia (6/6h)",
  [MedicationFrequency.CONTINUOUS]: "Contínuo",
  [MedicationFrequency.AS_NEEDED]: "Se necessário",
  [MedicationFrequency.OTHER]: "Outro"
};

const statusLabels = {
  [MedicationStatus.ACTIVE]: "Ativo",
  [MedicationStatus.COMPLETED]: "Concluído",
  [MedicationStatus.CANCELLED]: "Cancelado",
  [MedicationStatus.SUSPENDED]: "Suspenso"
};

interface MedicationsTableProps {
  patientId: number | string;
}

// Define SWR fetcher function
const fetcher = async ([url, token]: [string, string | null]) => {
  if (!token) {
    throw new Error('Authentication token is not available.');
  }
  const res = await fetch(url, { 
      headers: { 'Authorization': `Bearer ${token}` },
      cache: 'no-store' // Ensure fresh data
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API error fetching medications: ${res.statusText} - ${errorText}`);
  }
  return res.json();
};

export default function MedicationsTable({ patientId }: MedicationsTableProps) {
  const [showForm, setShowForm] = useState(false);
  const [newMedication, setNewMedication] = useState<Partial<MedicationCreate> & { medication_id?: number }>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState<number | null>(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState<number | null>(null);
  const { addNotification } = useUIStore();
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  // Fetch token once
  useEffect(() => {
    const fetchAuthToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchAuthToken();
  }, [getToken]);

  // SWR Data Fetching
  const apiUrl = token ? `/api/patients/${patientId}/medications` : null;
  const { 
      data: medications, 
      error: fetchError, 
      isLoading: isFetchingLoading, 
      mutate
  } = useSWR<Medication[]>(
      apiUrl ? [apiUrl, token] : null, 
      fetcher, 
      {
          revalidateOnFocus: false, 
          onError: (err) => {
               console.error("SWR Fetch Error:", err);
               toast.error("Erro ao buscar medicações", { description: err.message });
          }
      }
  );

  const isLoading = isFetchingLoading || (token === null);
  const error = fetchError?.message || null;

  const resetFormState = () => {
    setNewMedication({
      name: '',
      dosage: '',
      frequency: MedicationFrequency.DAILY,
      route: MedicationRoute.ORAL,
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: null,
      status: MedicationStatus.ACTIVE,
      notes: '',
    });
    setEditingId(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewMedication(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSelectChange = (name: keyof MedicationCreate, value: string) => {
       setNewMedication(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const currentToken = await getToken();
    if (!currentToken) {
      toast.error("Erro de Autenticação");
      setIsSubmitting(false);
      return;
    }

    const toastId = toast.loading(editingId ? "Atualizando medicação..." : "Adicionando medicação...");

    const payload: MedicationUpdate | Omit<MedicationCreate, 'patient_id'> = {
        name: newMedication.name || '',
        dosage: newMedication.dosage || '',
        route: newMedication.route || MedicationRoute.OTHER,
        frequency: newMedication.frequency || MedicationFrequency.OTHER,
        raw_frequency: newMedication.raw_frequency,
        start_date: newMedication.start_date ? new Date(newMedication.start_date).toISOString() : new Date().toISOString(),
        end_date: newMedication.end_date ? new Date(newMedication.end_date).toISOString() : null,
        status: newMedication.status || MedicationStatus.ACTIVE,
        notes: newMedication.notes,
    };
    
    if (!editingId && (!payload.name || !payload.start_date || !payload.dosage || !payload.frequency || !payload.route || !payload.status)) {
         toast.error("Campos obrigatórios faltando", {id: toastId});
         setIsSubmitting(false);
         return;
    }

    try {
        let result;
        if (editingId) {
            result = await medicationService.updateMedication(editingId, payload as MedicationUpdate, currentToken);
            toast.success("Medicação Atualizada", { id: toastId, description: result.name });
        } else {
            result = await medicationService.createPatientMedication(patientId, payload as Omit<MedicationCreate, 'patient_id'>, currentToken);
            toast.success("Medicação Adicionada", { id: toastId, description: result.name });
        }
        mutate();
        setShowForm(false);
        resetFormState();
    } catch (error: any) {
        console.error("Error submitting medication:", error);
        toast.error("Erro ao Salvar", { id: toastId, description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteMedication = async (medicationId: number) => {
    setIsDeleting(medicationId);
    const currentToken = await getToken();
     if (!currentToken) {
      toast.error("Erro de Autenticação");
      setIsDeleting(null);
      return;
    }
    
    const toastId = toast.loading("Excluindo medicação...");

    try {
        await medicationService.deleteMedication(medicationId, currentToken);
        toast.success("Medicação Excluída", { id: toastId });
        mutate();
    } catch (error: any) {
        console.error("Error deleting medication:", error);
        toast.error("Erro ao Excluir", { id: toastId, description: error.message });
    } finally {
        setIsDeleting(null);
    }
  };

  const handleEditMedication = (medication: Medication) => {
    setNewMedication({
        ...medication,
        start_date: medication.start_date ? format(parseISO(medication.start_date), 'yyyy-MM-dd') : '',
        end_date: medication.end_date ? format(parseISO(medication.end_date), 'yyyy-MM-dd') : null,
    });
    setEditingId(medication.medication_id);
    setShowForm(true);
  };

  const handleToggleStatus = async (medication: Medication) => {
    if (!medication.medication_id) return;
    setIsTogglingStatus(medication.medication_id);
    const currentToken = await getToken();
     if (!currentToken) {
      toast.error("Erro de Autenticação");
      setIsTogglingStatus(null);
      return;
    }
    
    const toastId = toast.loading("Atualizando status...");

    try {
      const updatedStatus = medication.status === MedicationStatus.ACTIVE 
        ? MedicationStatus.SUSPENDED 
        : MedicationStatus.ACTIVE;
        
      const updatedMedication = await medicationService.updateMedication(
          medication.medication_id, 
          { status: updatedStatus }, 
          currentToken
      );
            
      toast.success("Status Atualizado", { 
          id: toastId, 
          description: `${updatedMedication.name}: ${statusLabels[updatedMedication.status]}` 
      });
      mutate();
    } catch (error: any) {
      console.error('Error updating medication status:', error);
      toast.error("Erro ao Atualizar Status", { id: toastId, description: error.message });
    } finally {
        setIsTogglingStatus(null);
    }
  };

  const getStatusBadgeVariant = (status: MedicationStatus): "default" | "secondary" | "outline" | "destructive" => {
      switch (status) {
          case MedicationStatus.ACTIVE:
              return "default";
          case MedicationStatus.COMPLETED:
              return "outline";
          case MedicationStatus.CANCELLED:
              return "destructive";
          case MedicationStatus.SUSPENDED:
              return "secondary";
          default:
              return "secondary";
      }
  };

  if (isLoading) {
    return (
        <div className="flex items-center justify-center p-10">
            <Spinner size="lg" />
        </div>
    );
  }
  
  if (error) {
      return <div className="text-destructive p-4">Erro ao carregar medicações: {error}</div>;
  }

  return (
    <div className="space-y-4">
      {medications && medications.length === 0 && !showForm ? (
        <div className="text-center p-8">
          <p className="text-muted-foreground mb-4">No medications registered for this patient.</p>
          <Button onClick={() => { setShowForm(true); resetFormState(); }}>
             <Plus className="mr-2 h-4 w-4" /> Add Medication
          </Button>
        </div>
      ) : (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Medicações Prescritas</CardTitle>
            {!showForm && (
              <Button size="sm" onClick={() => { setShowForm(true); resetFormState(); }}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar
              </Button>
            )}
          </CardHeader>
          <CardContent>
             {showForm && (
                <form onSubmit={handleFormSubmit} className="space-y-4 p-4 border rounded-md mb-6 bg-muted/50">
                   <h3 className="text-lg font-semibold">{editingId ? 'Editar Medicação' : 'Adicionar Nova Medicação'}</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div>
                            <Label htmlFor="medName">Nome*</Label>
                            <Input 
                                id="medName"
                                name="name"
                                value={newMedication.name || ''}
                                onChange={handleInputChange}
                                required
                            />
                       </div>
                       <div>
                           <Label htmlFor="medDosage">Dosagem*</Label>
                           <Input 
                                id="medDosage"
                                name="dosage"
                                value={newMedication.dosage || ''}
                                onChange={handleInputChange}
                                required
                            />
                       </div>
                       <div>
                           <Label htmlFor="medRoute">Via*</Label>
                           <Select
                                value={newMedication.route}
                                onValueChange={(value) => handleSelectChange('route', value as MedicationRoute)}
                                name="route"
                           >
                                <SelectTrigger id="medRoute"><SelectValue placeholder="Selecionar via" /></SelectTrigger>
                                <SelectContent>
                                {Object.values(MedicationRoute).map((route) => (
                                    <SelectItem key={route} value={route}>{routeLabels[route]}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                       </div>
                       <div>
                            <Label htmlFor="medFrequency">Frequência*</Label>
                           <Select
                                value={newMedication.frequency}
                                onValueChange={(value) => handleSelectChange('frequency', value as MedicationFrequency)}
                                name="frequency"
                           >
                                <SelectTrigger id="medFrequency" disabled={isSubmitting}>
                                    <SelectValue placeholder="Frequência" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(Object.keys(frequencyLabels) as Array<keyof typeof frequencyLabels>).map((freqKey) => (
                                        <SelectItem key={freqKey} value={freqKey}>{frequencyLabels[freqKey]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                       </div>
                       <div>
                            <Label htmlFor="medStartDate">Data Início*</Label>
                            <Input 
                                id="medStartDate"
                                name="start_date"
                                type="date"
                                value={newMedication.start_date || ''}
                                onChange={handleInputChange}
                                required
                            />
                       </div>
                       <div>
                            <Label htmlFor="medEndDate">Data Fim (opcional)</Label>
                            <Input 
                                id="medEndDate"
                                name="end_date"
                                type="date"
                                value={newMedication.end_date || ''}
                                onChange={handleInputChange}
                            />
                       </div>
                       <div className="md:col-span-2">
                            <Label htmlFor="medStatus">Status*</Label>
                           <Select
                                value={newMedication.status}
                                onValueChange={(value) => handleSelectChange('status', value as MedicationStatus)}
                                name="status"
                           >
                                <SelectTrigger id="medStatus"><SelectValue placeholder="Selecionar status" /></SelectTrigger>
                                <SelectContent>
                                {Object.values(MedicationStatus).map((status) => (
                                    <SelectItem key={status} value={status}>{statusLabels[status]}</SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                       </div>
                       <div className="md:col-span-2">
                            <Label htmlFor="notes">Observações</Label>
                            <Textarea 
                                id="notes" 
                                name="notes" 
                                value={newMedication.notes || ''} 
                                onChange={handleInputChange} 
                                rows={3}
                                placeholder="Instruções adicionais, motivo da prescrição, etc."
                            />
                        </div>
                   </div>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetFormState(); }}>Cancelar</Button>
                        <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Spinner size="sm" className="mr-2"/> : null}
                        {editingId ? 'Salvar Alterações' : 'Adicionar Medicação'}
                        </Button>
                    </div>
                </form>
             )}

            {medications && medications.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Dose</TableHead>
                      <TableHead>Frequência</TableHead>
                      <TableHead>Via</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medications.map((med) => (
                      <TableRow key={med.medication_id} data-state={med.status !== MedicationStatus.ACTIVE ? 'inactive' : 'active'} className="data-[state=inactive]:opacity-60">
                        <TableCell className="font-medium">{med.name}</TableCell>
                        <TableCell>{med.dosage}</TableCell>
                        <TableCell>
                          {frequencyLabels[med.frequency as keyof typeof frequencyLabels] 
                            ? frequencyLabels[med.frequency as keyof typeof frequencyLabels] 
                            : med.frequency} 
                          {med.raw_frequency && med.raw_frequency !== med.frequency ? ` (${med.raw_frequency})` : ''} 
                        </TableCell>
                        <TableCell>
                          {routeLabels[med.route as keyof typeof routeLabels]
                            ? routeLabels[med.route as keyof typeof routeLabels]
                            : med.route}
                        </TableCell>
                        <TableCell>{format(parseISO(med.start_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{med.end_date ? format(parseISO(med.end_date), 'dd/MM/yyyy') : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(med.status)}>
                             {statusLabels[med.status as keyof typeof statusLabels]
                               ? statusLabels[med.status as keyof typeof statusLabels]
                               : med.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={med.notes || ''}>{med.notes || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleEditMedication(med)} disabled={isSubmitting || isDeleting !== null || isTogglingStatus !== null}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleToggleStatus(med)} 
                            disabled={isSubmitting || isDeleting !== null || isTogglingStatus === med.medication_id} 
                            title={med.status === MedicationStatus.ACTIVE ? "Suspender" : "Reativar"}
                          >
                            {isTogglingStatus === med.medication_id ? <Spinner size="sm" /> : (med.status === MedicationStatus.ACTIVE ? <PowerOff className="h-4 w-4 text-yellow-600"/> : <Power className="h-4 w-4 text-green-600" />)}
                          </Button>
                           <AlertDialog>
                               <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10" 
                                    disabled={isSubmitting || isDeleting === med.medication_id || isTogglingStatus !== null}
                                  >
                                    {isDeleting === med.medication_id ? <Spinner size="sm" /> : <Trash className="h-4 w-4" />}
                                  </Button>
                               </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                        <AlertDialogDescription>
                                         Tem certeza que deseja excluir o medicamento &quot;{med.name}&quot;?
                                         Esta ação não pode ser desfeita.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteMedication(med.medication_id)} className="bg-destructive hover:bg-destructive/90">
                                        Excluir Permanentemente
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 