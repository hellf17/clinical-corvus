'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select";
import { toast } from 'sonner';
import { Loader2, Users, Search, Filter } from 'lucide-react';
import { PatientCreate, Patient, PatientListResponse, PatientSummary } from "@/types/patient";
import { Group, GroupListResponse, GroupPatientCreate } from "@/types/group";
import { createPatientClient, getPatientsClient } from "@/services/patientService.client";
import { listGroups, assignPatientToGroup } from "@/services/groupService";
import { useRouter } from 'next/navigation';

export const GroupPatientWorkflow = () => {
  const router = useRouter();
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  
  // Patient form state
  const [patientData, setPatientData] = useState<Omit<PatientCreate, 'group_id'>>({
    name: '',
    email: '',
    birthDate: '',
    gender: 'male',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    documentNumber: '',
    patientNumber: '',
    insuranceProvider: '',
    insuranceNumber: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    }
  });
  
  // Group assignment state
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  
  // Patient list state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientSummary[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupIdFilter, setGroupIdFilter] = useState<number | undefined>(undefined);
  
  // Loading states
  const [isCreatingPatient, setIsCreatingPatient] = useState(false);
  const [patientError, setPatientError] = useState<string | null>(null);
  
  // Fetch token on mount
  useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);
  
  // Fetch groups for selection
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setGroupsLoading(true);
        setGroupsError(null);
        const response: GroupListResponse = await listGroups();
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
  
  // Fetch patients based on filters
  useEffect(() => {
    const fetchData = async () => {
      setPatientsLoading(true);
      setPatientsError(null);
      try {
        if (!token) return;
        
        const data: PatientListResponse = await getPatientsClient(
          { 
            page: 1, 
            limit: 100, 
            search: searchTerm,
            groupId: groupIdFilter
          },
          token
        );
        setPatients(data.items);
        setFilteredPatients(data.items);
      } catch (err: any) {
        console.error("Error fetching patients:", err);
        setPatientsError(err.message || "Falha ao buscar pacientes.");
        setPatients([]);
        setFilteredPatients([]);
      } finally {
        setPatientsLoading(false);
      }
    };
    
    if (token) {
      fetchData();
    }
  }, [token, searchTerm, groupIdFilter]);
  
  // Handle patient form changes
  const handlePatientInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setPatientData(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle emergency contact changes
  const handleEmergencyContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPatientData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [name]: value
      }
    }));
  };
  
  // Handle patient creation
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Erro de Autenticação", { description: "Não foi possível obter o token de autenticação. Faça login novamente." });
      return;
    }
    
    setIsCreatingPatient(true);
    setPatientError(null);
    
    try {
      // Create patient data with optional group assignment
      const patientCreateData: PatientCreate = {
        ...patientData,
        gender: patientData.gender,
        insuranceProvider: patientData.insuranceProvider || undefined,
        insuranceNumber: patientData.insuranceNumber || undefined,
        group_id: selectedGroupId || undefined
      };
      
      const newPatient: Patient = await createPatientClient(patientCreateData, token);
      
      // If a group was selected, assign the patient to that group
      if (selectedGroupId) {
        try {
          await assignPatientToGroup(selectedGroupId, { patient_id: newPatient.patient_id });
          toast.success(`Paciente "${newPatient.name}" criado e atribuído ao grupo com sucesso!`);
        } catch (groupError: any) {
          console.error("Failed to assign patient to group:", groupError);
          toast.error("Paciente criado, mas falha ao atribuir ao grupo", {
            description: groupError.message || 'Erro ao atribuir paciente ao grupo.'
          });
        }
      } else {
        toast.success(`Paciente "${newPatient.name}" criado com sucesso!`);
      }
      
      // Reset form
      setPatientData({
        name: '',
        email: '',
        birthDate: '',
        gender: 'male',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        documentNumber: '',
        patientNumber: '',
        insuranceProvider: '',
        insuranceNumber: '',
        emergencyContact: {
          name: '',
          relationship: '',
          phone: ''
        }
      });
      setSelectedGroupId(null);
      
      // Navigate to patient detail page
      router.push(`/dashboard-doctor/patients/${newPatient.patient_id}/overview`);
    } catch (error: any) {
      console.error("Failed to create patient:", error);
      setPatientError(error.message || "Falha ao criar paciente.");
      toast.error("Falha ao Criar Paciente", { description: error.message || 'Erro desconhecido ao salvar paciente.' });
    } finally {
      setIsCreatingPatient(false);
    }
  };
  
  return (
    <div className="container mx-auto max-w-3xl py-8 space-y-8">
      <h1 className="text-2xl font-bold">Fluxo de Trabalho de Grupo e Paciente</h1>
      
      {/* Patient Creation Form */}
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Paciente</CardTitle>
        </CardHeader>
        <form onSubmit={handleCreatePatient}>
          <CardContent className="space-y-6">
            {patientError && (
              <div className="text-sm text-destructive">{patientError}</div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientName">Nome Completo</Label>
                <Input
                  id="patientName"
                  name="name"
                  value={patientData.name}
                  onChange={handlePatientInputChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="patientEmail">Email</Label>
                <Input
                  id="patientEmail"
                  name="email"
                  type="email"
                  value={patientData.email}
                  onChange={handlePatientInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientBirthDate">Data de Nascimento</Label>
                <Input
                  id="patientBirthDate"
                  name="birthDate"
                  type="date"
                  value={patientData.birthDate}
                  onChange={handlePatientInputChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="patientGender">Gênero</Label>
                <Select
                  name="gender"
                  value={patientData.gender}
                  onValueChange={(value) => setPatientData(prev => ({ ...prev, gender: value as 'male' | 'female' | 'other' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Masculino</SelectItem>
                    <SelectItem value="female">Feminino</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientPhone">Telefone</Label>
                <Input
                  id="patientPhone"
                  name="phone"
                  value={patientData.phone}
                  onChange={handlePatientInputChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="patientDocumentNumber">Documento (CPF/RG)</Label>
                <Input
                  id="patientDocumentNumber"
                  name="documentNumber"
                  value={patientData.documentNumber}
                  onChange={handlePatientInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientPatientNumber">Número do Paciente (Prontuário)</Label>
                <Input
                  id="patientPatientNumber"
                  name="patientNumber"
                  value={patientData.patientNumber}
                  onChange={handlePatientInputChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="patientGroup">Grupo (Opcional)</Label>
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
            
            <div>
              <Label htmlFor="patientAddress">Logradouro</Label>
              <Input
                id="patientAddress"
                name="address"
                value={patientData.address}
                onChange={handlePatientInputChange}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="patientCity">Cidade</Label>
                <Input
                  id="patientCity"
                  name="city"
                  value={patientData.city}
                  onChange={handlePatientInputChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="patientState">Estado</Label>
                <Input
                  id="patientState"
                  name="state"
                  value={patientData.state}
                  onChange={handlePatientInputChange}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="patientZipCode">CEP</Label>
                <Input
                  id="patientZipCode"
                  name="zipCode"
                  value={patientData.zipCode}
                  onChange={handlePatientInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="insuranceProvider">Nome do Convênio</Label>
                <Input
                  id="insuranceProvider"
                  name="insuranceProvider"
                  value={patientData.insuranceProvider || ''}
                  onChange={handlePatientInputChange}
                />
              </div>
              
              <div>
                <Label htmlFor="insuranceNumber">Número da Carteirinha</Label>
                <Input
                  id="insuranceNumber"
                  name="insuranceNumber"
                  value={patientData.insuranceNumber || ''}
                  onChange={handlePatientInputChange}
                />
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold border-b pb-2 mt-6 mb-4">Contato de Emergência</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="emergencyContactName">Nome</Label>
                  <Input
                    id="emergencyContactName"
                    name="name"
                    value={patientData.emergencyContact.name}
                    onChange={handleEmergencyContactChange}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="emergencyContactRelationship">Parentesco</Label>
                  <Input
                    id="emergencyContactRelationship"
                    name="relationship"
                    value={patientData.emergencyContact.relationship}
                    onChange={handleEmergencyContactChange}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="emergencyContactPhone">Telefone</Label>
                  <Input
                    id="emergencyContactPhone"
                    name="phone"
                    value={patientData.emergencyContact.phone}
                    onChange={handleEmergencyContactChange}
                    required
                  />
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-end gap-2 border-t pt-6">
            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isCreatingPatient}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreatingPatient || !patientData.name || !patientData.email}>
              {isCreatingPatient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Paciente
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      {/* Patient List with Group Filtering */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Pacientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar paciente..."
                  className="pl-10 w-full"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); }}
                />
              </div>
              
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Select 
                  value={groupIdFilter?.toString() || ''} 
                  onValueChange={(value) => {
                    setGroupIdFilter(value ? parseInt(value) : undefined);
                  }}
                >
                  <SelectTrigger className="pl-10 w-full sm:w-48">
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos os grupos</SelectItem>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            
            {/* Loading and Error States */}
            {groupsLoading && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Carregando grupos...
              </div>
            )}
            
            {groupsError && (
              <div className="text-sm text-destructive">{groupsError}</div>
            )}
          </div>
          
          <div className="flex-grow mt-4">
            {patientsLoading ? (
              <div className="text-center py-6"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
            ) : patientsError ? (
              <div className="text-destructive text-center py-4">{patientsError}</div>
            ) : filteredPatients.length > 0 ? (
              <div className="divide-y divide-border">
                {filteredPatients.map((patient: PatientSummary) => (
                  <div
                    key={patient.patient_id}
                    className="py-3 flex justify-between items-center"
                  >
                    <div>
                      <div className="font-medium text-sm sm:text-base text-foreground">{patient.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {patient.diagnostico || 'Sem diagnóstico'}
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-xs sm:text-sm"
                      onClick={() => router.push(`/dashboard-doctor/patients/${patient.patient_id}/overview`)}
                    >
                      Detalhes
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  {searchTerm || groupIdFilter ? 'Nenhum paciente encontrado.' : (patients.length === 0 ? 'Nenhum paciente cadastrado.' : 'Nenhum paciente corresponde à busca.')}
                </p>
                {!(searchTerm || groupIdFilter) && patients.length === 0 && (
                  <Button 
                    onClick={() => router.push('/dashboard-doctor/patients/new')} 
                    className="mt-2"
                    variant="outline"
                  >
                    Adicionar Primeiro Paciente
                  </Button>
                )}
              </div>
            )}
          </div>
          </div>
           
          <p className="text-xs text-muted-foreground text-center mt-2">
            Exibindo {filteredPatients.length} de {patients.length} pacientes {searchTerm || groupIdFilter ? 'encontrados' : 'totais'}.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};