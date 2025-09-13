'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Bell, Search, Filter, Plus, Clock, AlertTriangle, CheckCircle, XCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { GroupPatient } from '@/types/group';

interface Alert {
  alert_id: number;
  patient_id: number;
  user_id: number;
  alert_type: string;
  message: string;
  severity: string;
  is_read: boolean;
  details: any;
  created_at: string;
  updated_at: string;
  parameter?: string;
  category?: string;
  value?: number;
  reference?: string;
  status?: string;
  interpretation?: string;
  recommendation?: string;
  acknowledged_by?: string;
  acknowledged_at?: string;
}

const AlertsPage = () => {
  const params = useParams();
  const patientId = params.id as string;
  const { getToken } = useAuth();

  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<GroupPatient[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/patients/${patientId}/alerts`);
      setAlerts(response.data);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Erro ao carregar alertas');
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

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

  const filterAlerts = useCallback(() => {
    let filtered = [...alerts];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(alert =>
        alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        alert.alert_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (alert.parameter && alert.parameter.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === severityFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'unread') {
        filtered = filtered.filter(alert => !alert.is_read);
      } else if (statusFilter === 'read') {
        filtered = filtered.filter(alert => alert.is_read);
      }
    }

    setFilteredAlerts(filtered);
  }, [alerts, searchTerm, severityFilter, statusFilter]);

  useEffect(() => {
    filterAlerts();
  }, [filterAlerts]);

  const handleMarkAsRead = async (alertId: number) => {
    try {
      await axios.post(`/api/patients/${patientId}/alerts/${alertId}/acknowledge`);
      setAlerts(prev => prev.map(alert => 
        alert.alert_id === alertId ? { ...alert, is_read: true } : alert
      ));
      toast.success('Alerta marcado como lido');
    } catch (error) {
      console.error('Error marking alert as read:', error);
      toast.error('Erro ao marcar alerta como lido');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <AlertTriangle className="h-4 w-4" />;
      case 'low': return <CheckCircle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-600">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-600 border-t-transparent"></div>
          <span>Carregando alertas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Bell className="h-7 w-7 text-orange-600" />
            Alertas do Paciente
          </h1>
          <p className="text-slate-600 mt-1">
            Monitore e gerencie os alertas clínicos do paciente
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
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Novo Alerta
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total</p>
                <p className="text-2xl font-bold text-slate-800">{alerts.length}</p>
              </div>
              <Bell className="h-6 w-6 text-slate-400" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Alta</p>
                <p className="text-2xl font-bold text-red-600">
                  {alerts.filter(a => a.severity === 'high').length}
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Média</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {alerts.filter(a => a.severity === 'medium').length}
                </p>
              </div>
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Baixa</p>
                <p className="text-2xl font-bold text-green-600">
                  {alerts.filter(a => a.severity === 'low').length}
                </p>
              </div>
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Charts Section */}
      <Tabs defaultValue="alerts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="alerts">Lista de Alertas</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
        </TabsList>
        
        <TabsContent value="alerts" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por mensagem, tipo ou parâmetro..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Severidades</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="unread">Não Lidos</SelectItem>
                    <SelectItem value="read">Lidos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Alerts List */}
          {filteredAlerts.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                    <Bell className="h-8 w-8 text-slate-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-slate-800">
                      {searchTerm || severityFilter !== 'all' || statusFilter !== 'all' 
                        ? 'Nenhum alerta encontrado'
                        : 'Nenhum alerta disponível'
                      }
                    </h3>
                    <p className="text-slate-600">
                      {searchTerm || severityFilter !== 'all' || statusFilter !== 'all'
                        ? 'Tente ajustar os filtros de busca.'
                        : 'Não há alertas registrados para este paciente.'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredAlerts.map((alert) => (
                <Card key={alert.alert_id} className={!alert.is_read ? 'border-orange-200 bg-orange-50' : ''}>
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-shrink-0">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getSeverityColor(alert.severity)}`}>
                          {getSeverityIcon(alert.severity)}
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <h3 className="text-lg font-semibold text-slate-800 truncate">
                            {alert.alert_type}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={getSeverityColor(alert.severity)}>
                              {alert.severity === 'high' ? 'Alta' : 
                               alert.severity === 'medium' ? 'Média' : 
                               alert.severity === 'low' ? 'Baixa' : alert.severity}
                            </Badge>
                            {!alert.is_read && (
                              <Badge variant="destructive">Novo</Badge>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-slate-600 mt-1">
                          {alert.message}
                        </p>
                        
                        {alert.parameter && (
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Parâmetro:</span>
                              <span>{alert.parameter}</span>
                            </div>
                            {alert.value !== undefined && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Valor:</span>
                                <span>{alert.value}</span>
                              </div>
                            )}
                            {alert.reference && (
                              <div className="flex items-center gap-1">
                                <span className="font-medium">Referência:</span>
                                <span>{alert.reference}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {alert.interpretation && (
                          <div className="mt-2 p-2 bg-slate-50 rounded text-sm">
                            <span className="font-medium">Interpretação:</span> {alert.interpretation}
                          </div>
                        )}
                        
                        {alert.recommendation && (
                          <div className="mt-2 p-2 bg-blue-50 rounded text-sm">
                            <span className="font-medium">Recomendação:</span> {alert.recommendation}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <div className="text-sm text-slate-500 whitespace-nowrap">
                          <Clock className="inline h-4 w-4 mr-1" />
                          {new Date(alert.created_at).toLocaleDateString('pt-BR')} {new Date(alert.created_at).toLocaleTimeString('pt-BR')}
                        </div>
                        {!alert.is_read && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleMarkAsRead(alert.alert_id)}
                          >
                            Marcar como Lido
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linha do Tempo de Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-slate-500">
                <Bell className="h-12 w-12 mx-auto text-slate-300 mb-4" />
                <p>Visualização da linha do tempo de alertas em desenvolvimento</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AlertsPage;