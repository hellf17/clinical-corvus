"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import MedicationCard from '@/components/dashboard-doctor/MedicationCard';
import MedicationForm from '@/components/dashboard-doctor/MedicationForm';
import { Medication, MedicationCreate } from '@/types/medication';
import { MedicationStatus, MedicationRoute } from '@/types/enums';
import { Plus, Search, Filter, Pill, AlertCircle, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { EnhancedConsolidatedTimelineChart } from '@/components/charts/EnhancedConsolidatedTimelineChart';
import { GroupPatient } from '@/types/group';

const MedicationsPage = () => {
  const params = useParams();
  const patientId = params.id as string;
  const { getToken } = useAuth();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [filteredMedications, setFilteredMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupPatient[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [routeFilter, setRouteFilter] = useState('all');

  const fetchMedications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/patients/${patientId}/medications`);
      setMedications(response.data);
    } catch (error) {
      console.error('Error fetching medications:', error);
      toast.error('Erro ao carregar medicações');
      setMedications([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchMedications();
  }, [fetchMedications]);

  // Fetch token on mount
  useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);

  // Fetch groups for this patient
  useEffect(() => {
    const fetchPatientGroups = async () => {
      try {
        // Fetch all groups and check which ones this patient belongs to
        // This is a simplified approach - in a production environment,
        // you would want a more efficient backend endpoint
        if (!token) return;
        
        // First, get all groups the current user belongs to
        const groupsResponse = await fetch('/api/groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!groupsResponse.ok) {
          throw new Error('Failed to fetch groups');
        }
        
        const groupsData = await groupsResponse.json();
        const userGroups = groupsData.items || [];
        
        // For each group, check if this patient is assigned to it
        const patientGroups: GroupPatient[] = [];
        for (const group of userGroups) {
          try {
            const patientsResponse = await fetch(`/api/groups/${group.id}/patients`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (patientsResponse.ok) {
              const patientsData = await patientsResponse.json();
              const patientInGroup = patientsData.items?.find((p: GroupPatient) => p.patient_id === parseInt(patientId));
              if (patientInGroup) {
                patientGroups.push(patientInGroup);
              }
            }
          } catch (err) {
            console.warn(`Failed to check group ${group.id} for patient assignment`, err);
          }
        }
        
        setGroups(patientGroups);
      } catch (error) {
        console.error('Error fetching patient groups:', error);
      }
    };

    if (token) {
      fetchPatientGroups();
    }
  }, [token, patientId]);

  const filterMedications = useCallback(() => {
    let filtered = [...medications];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(med =>
        med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.prescriber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        med.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(med => med.status === statusFilter);
    }

    // Route filter
    if (routeFilter !== 'all') {
      filtered = filtered.filter(med => med.route === routeFilter);
    }

    // Sort by status (active first) and then by name
    filtered.sort((a, b) => {
      if (a.status === MedicationStatus.ACTIVE && b.status !== MedicationStatus.ACTIVE) return -1;
      if (b.status === MedicationStatus.ACTIVE && a.status !== MedicationStatus.ACTIVE) return 1;
      return a.name.localeCompare(b.name);
    });

    setFilteredMedications(filtered);
  }, [medications, searchTerm, statusFilter, routeFilter]);

  useEffect(() => {
    filterMedications();
  }, [filterMedications]);

  const handleSaveMedication = async (medicationData: Partial<MedicationCreate>) => {
    try {
      if (editingMedication) {
        // Update existing medication
        const response = await axios.put(
          `/api/patients/${patientId}/medications/${editingMedication.medication_id}`,
          medicationData
        );
        setMedications(prev =>
          prev.map(med =>
            med.medication_id === editingMedication.medication_id ? response.data : med
          )
        );
      } else {
        // Create new medication
        const response = await axios.post(
          `/api/patients/${patientId}/medications`,
          medicationData
        );
        setMedications(prev => [...prev, response.data]);
      }
      
      setShowForm(false);
      setEditingMedication(null);
    } catch (error: any) {
      console.error('Error saving medication:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao salvar medicação';
      toast.error(errorMessage);
      throw error;
    }
  };

  const handleEditMedication = (medication: Medication) => {
    setEditingMedication(medication);
    setShowForm(true);
  };

  const handleDeleteMedication = async (medicationId: number) => {
    try {
      await axios.delete(`/api/patients/${patientId}/medications/${medicationId}`);
      setMedications(prev => prev.filter(med => med.medication_id !== medicationId));
      toast.success('Medicação removida com sucesso');
    } catch (error: any) {
      console.error('Error deleting medication:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao remover medicação';
      toast.error(errorMessage);
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingMedication(null);
  };

  const getStatusCounts = () => {
    const counts = {
      active: medications.filter(med => med.status === MedicationStatus.ACTIVE).length,
      suspended: medications.filter(med => med.status === MedicationStatus.SUSPENDED).length,
      completed: medications.filter(med => med.status === MedicationStatus.COMPLETED).length,
      cancelled: medications.filter(med => med.status === MedicationStatus.CANCELLED).length,
    };
    return counts;
  };

  const getRouteOptions = () => {
    const routes = [...new Set(medications.map(med => med.route).filter(Boolean))];
    return routes.sort();
  };

  const statusCounts = getStatusCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando medicações...</span>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-800">
            {editingMedication ? 'Editar Medicação' : 'Nova Medicação'}
          </h1>
        </div>
        <MedicationForm
          medication={editingMedication}
          patientId={patientId}
          onSave={handleSaveMedication}
          onCancel={handleCancelForm}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Pill className="h-7 w-7 text-blue-600" />
            Medicações
          </h1>
          <p className="text-slate-600 mt-1">
            Gerencie as medicações do paciente
          </p>
          {groups.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {groups.slice(0, 3).map((group) => (
                <Badge key={group.id} variant="secondary" className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Grupo #{group.group_id}
                </Badge>
              ))}
              {groups.length > 3 && (
                <Badge variant="secondary">+{groups.length - 3} mais</Badge>
              )}
            </div>
          )}
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nova Medicação
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total</p>
                <p className="text-2xl font-bold text-slate-800">{medications.length}</p>
              </div>
              <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.active}</p>
              </div>
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Suspensos</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.suspended}</p>
              </div>
              <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Concluídos</p>
                <p className="text-2xl font-bold text-blue-600">{statusCounts.completed}</p>
              </div>
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Visão Geral das Medicações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Distribution Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição por Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Ativas</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-green-600 h-2 rounded-full" 
                              style={{ width: `${(statusCounts.active / medications.length) * 100 || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm w-8">{statusCounts.active}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Suspensas</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-yellow-600 h-2 rounded-full" 
                              style={{ width: `${(statusCounts.suspended / medications.length) * 100 || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm w-8">{statusCounts.suspended}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Concluídas</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-slate-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full" 
                              style={{ width: `${(statusCounts.completed / medications.length) * 100 || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-sm w-8">{statusCounts.completed}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Routes Distribution Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribuição por Via de Administração</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getRouteOptions().slice(0, 5).map(route => {
                        const count = medications.filter(med => med.route === route).length;
                        return (
                          <div key={route} className="flex items-center justify-between">
                            <span className="text-sm capitalize">{route}</span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-slate-200 rounded-full h-2">
                                <div 
                                  className="bg-purple-600 h-2 rounded-full" 
                                  style={{ width: `${(count / medications.length) * 100 || 0}%` }}
                                ></div>
                              </div>
                              <span className="text-sm w-8">{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linha do Tempo de Medicações</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedConsolidatedTimelineChart 
                patient={{
                  patient_id: parseInt(patientId),
                  name: 'Paciente',
                  age: 0,
                  gender: 'other' as const,
                  created_at: '',
                  updated_at: ''
                } as any}
                medications={medications}
                title="Linha do Tempo de Medicações"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar por nome, médico ou observações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value={MedicationStatus.ACTIVE}>Ativo</SelectItem>
                <SelectItem value={MedicationStatus.SUSPENDED}>Suspenso</SelectItem>
                <SelectItem value={MedicationStatus.COMPLETED}>Concluído</SelectItem>
                <SelectItem value={MedicationStatus.CANCELLED}>Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Via de administração" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Vias</SelectItem>
                {getRouteOptions().map(route => (
                  <SelectItem key={route} value={route}>
                    {route.charAt(0).toUpperCase() + route.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Medications List */}
      {filteredMedications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                <Pill className="h-8 w-8 text-slate-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-medium text-slate-800">
                  {searchTerm || statusFilter !== 'all' || routeFilter !== 'all' 
                    ? 'Nenhuma medicação encontrada'
                    : 'Nenhuma medicação cadastrada'
                  }
                </h3>
                <p className="text-slate-600">
                  {searchTerm || statusFilter !== 'all' || routeFilter !== 'all'
                    ? 'Tente ajustar os filtros de busca.'
                    : 'Adicione a primeira medicação do paciente.'
                  }
                </p>
              </div>
              {!searchTerm && statusFilter === 'all' && routeFilter === 'all' && (
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar Medicação
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredMedications.map((medication) => (
            <MedicationCard
              key={medication.medication_id}
              medication={medication}
              onEdit={handleEditMedication}
              onDelete={handleDeleteMedication}
            />
          ))}
        </div>
      )}

      {/* Search Results Info */}
      {(searchTerm || statusFilter !== 'all' || routeFilter !== 'all') && filteredMedications.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Search className="h-4 w-4" />
          <span>
            Encontradas {filteredMedications.length} medicação(ões) de {medications.length} total
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setRouteFilter('all');
            }}
            className="text-xs"
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
};

export default MedicationsPage;