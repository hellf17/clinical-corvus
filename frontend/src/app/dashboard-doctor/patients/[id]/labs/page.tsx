'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import useSWRInfinite from 'swr/infinite';
import { useAuth } from '@clerk/nextjs';
import { Skeleton } from '@/components/ui/Skeleton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { PlusCircle, Users } from 'lucide-react';
import { ManualLabEntryForm } from '@/components/patients/ManualLabEntryForm';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/Table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { AlertTriangle } from 'lucide-react';
import { EnhancedResultsTimelineChart } from '@/components/charts/EnhancedResultsTimelineChart';
import { EnhancedMultiParameterComparisonChart } from '@/components/charts/EnhancedMultiParameterComparisonChart';
import { EnhancedCorrelationMatrixChart } from '@/components/charts/EnhancedCorrelationMatrixChart';
import { EnhancedScatterPlotChart } from '@/components/charts/EnhancedScatterPlotChart';
import { LabResult } from '@/types/health';
import { Badge } from '@/components/ui/Badge';
import { GroupPatient } from '@/types/group';

// Fetcher function for SWR with authentication
const fetcher = async ([url, token]: [string, string | null]) => {
  if (!token) {
    throw new Error('Authentication token is not available.');
  }
  
  const res = await fetch(url, {
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }
  
  return res.json();
};

export default function PatientLabsPage() {
  const params = useParams();
  const patientId = parseInt(params.id as string, 10);
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [groups, setGroups] = useState<GroupPatient[]>([]);

  // Fetch token on mount
  React.useEffect(() => {
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
              const patientInGroup = patientsData.items?.find((p: GroupPatient) => p.patient_id === patientId);
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

  // Fetch lab results using SWRInfinite
  const getKey = (pageIndex: number, previousPageData: LabResult[] | null) => {
    if (previousPageData && !previousPageData.length) return null; // reached the end
    if (!token) return null;
    return [`/api/patients/${patientId}/lab_results?skip=${pageIndex * 20}&limit=20`, token];
  };

  const {
    data,
    error,
    isLoading,
    size,
    setSize,
    isValidating,
  } = useSWRInfinite<LabResult[]>(getKey, fetcher, { revalidateOnFocus: true });

  const labResults = data ? data.flat() : [];
  const isLoadingMore =
    isLoading || (size > 0 && data && typeof data[size - 1] === "undefined");
  const isEmpty = data?.[0]?.length === 0;
  const isReachingEnd =
    isEmpty || (data && data[data.length - 1]?.length < 20);

  // Handle refresh after manual entry
  const handleRefreshResults = useCallback(() => {
    console.log("Refreshing lab results display...");
    setRefreshKey(prevKey => prevKey + 1);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <Alert className="text-destructive border-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar exames laboratoriais</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="space-y-6 p-6">
        <div className="text-center py-12 bg-card text-card-foreground rounded-lg">
          <h3 className="text-lg font-medium mb-2">
            Sem resultados de exames disponíveis
          </h3>
          <p className="text-muted-foreground mb-4">
            Faça upload de exames ou adicione resultados manualmente.
          </p>
          <Button onClick={() => setShowForm(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Resultado Manualmente
          </Button>
        </div>
      </div>
    );
  }

  // Sort results by date (newest first)
  const sortedResults = [...labResults].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // Transform lab results into exam format for charts
  const examFormatResults = labResults.map(result => ({
    exam_id: result.result_id,
    patient_id: result.patient_id,
    exam_timestamp: result.timestamp,
    lab_results: [result]
  }));

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">Resultados Laboratoriais</h1>
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
        <Button onClick={() => setShowForm(true)} variant="outline">
          <PlusCircle className="mr-2 h-4 w-4" />
          Adicionar Resultado Manualmente
        </Button>
      </div>

      {/* Manual Entry Form */}
      {showForm && (
        <ManualLabEntryForm 
          patientId={patientId} 
          onResultAdded={() => {
            handleRefreshResults();
            setShowForm(false);
          }} 
        />
      )}

      {/* Enhanced Charts Section */}
      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Linha do Tempo</TabsTrigger>
          <TabsTrigger value="comparison">Comparação</TabsTrigger>
          <TabsTrigger value="correlation">Correlação</TabsTrigger>
          <TabsTrigger value="scatter">Dispersão</TabsTrigger>
        </TabsList>
        
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução Laboratorial</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedResultsTimelineChart 
                results={labResults} 
                title="Evolução Laboratorial"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comparação de Múltiplos Parâmetros</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedMultiParameterComparisonChart 
                exams={examFormatResults} 
                title="Comparação de Múltiplos Parâmetros"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="correlation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Correlação</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedCorrelationMatrixChart 
                exams={examFormatResults} 
                title="Matriz de Correlação"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scatter" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gráfico de Dispersão</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedScatterPlotChart 
                exams={examFormatResults} 
                title="Gráfico de Dispersão"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Todos os Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-left">Data</TableHead>
                  <TableHead className="text-left">Exame</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Unidade</TableHead>
                  <TableHead className="text-right">Intervalo de Referência</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedResults.map((result) => (
                  <TableRow key={result.result_id}>
                    <TableCell className="text-left">
                      {new Date(result.timestamp).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-left font-medium">
                      {result.test_name}
                    </TableCell>
                    <TableCell className={`text-right ${
                      result.is_abnormal ? 'text-destructive font-semibold' : ''
                    }`}>
                      {result.value_numeric !== null && result.value_numeric !== undefined
                        ? result.value_numeric
                        : result.value_text || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {result.unit || '-'}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {result.reference_range_low !== null && result.reference_range_high !== null
                        ? `${result.reference_range_low} - ${result.reference_range_high}`
                        : result.reference_text || '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {result.is_abnormal ? (
                        <span className="text-destructive font-semibold">Alterado</span>
                      ) : (
                        <span className="text-green-600 font-semibold">Normal</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!isReachingEnd && (
            <div className="text-center mt-6">
              <Button
                onClick={() => setSize(size + 1)}
                disabled={isLoadingMore}
                variant="outline"
              >
                {isLoadingMore ? 'Carregando...' : 'Carregar mais'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}