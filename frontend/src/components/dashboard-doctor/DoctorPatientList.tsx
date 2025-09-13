'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useDebounce } from 'use-debounce';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/Pagination";
import { getPatientsClient } from '@/services/patientService.client';
import { listGroups } from '@/services/groupService';
import { Spinner } from '@/components/ui/Spinner';
import { AlertCircle, Users, Search, Filter, MessageSquare } from 'lucide-react';
import { PatientSummary, PatientListResponse } from "@/types/patient";
import { Group, GroupListResponse } from "@/types/group";
import NewPatientModal from '@/components/dashboard-doctor/NewPatientModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";
import QuickChatPanel from '@/components/dashboard-doctor/QuickChatPanel';

export default function DoctorPatientList() {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
    const [selectedGroupId, setSelectedGroupId] = React.useState<number | undefined>(undefined);
    const [currentPage, setCurrentPage] = React.useState(1);
    const [patientsData, setPatientsData] = React.useState<PatientListResponse>({ items: [], total: 0 });
    const [groups, setGroups] = React.useState<Group[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isGroupsLoading, setIsGroupsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [groupsError, setGroupsError] = React.useState<string | null>(null);
    
    const ITEMS_PER_PAGE = 5;
    const { getToken } = useAuth();

    // Fetch groups for filter dropdown
    React.useEffect(() => {
        const fetchGroups = async () => {
            try {
                setIsGroupsLoading(true);
                setGroupsError(null);
                const response: GroupListResponse = await listGroups();
                setGroups(response.items);
            } catch (err: any) {
                console.error("Error fetching groups:", err);
                setGroupsError(err.message || "Falha ao buscar grupos.");
            } finally {
                setIsGroupsLoading(false);
            }
        };
        fetchGroups();
    }, []);

    // Fetch patients based on filters
    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams();
                if (currentPage) params.append('page', currentPage.toString());
                if (ITEMS_PER_PAGE) params.append('limit', ITEMS_PER_PAGE.toString());
                if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
                if (selectedGroupId) params.append('group_id', selectedGroupId.toString());
                
                const response = await fetch(`/api/patients?${params.toString()}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.detail || `Failed to fetch patients: ${response.statusText}`);
                }
                
                const data: PatientListResponse = await response.json();
                setPatientsData(data);
            } catch (err: any) {
                console.error("Error fetching patients:", err);
                setError(err.message || "Falha ao buscar pacientes.");
                setPatientsData({ items: [], total: 0 });
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [currentPage, debouncedSearchTerm, selectedGroupId]);

    const totalPages = Math.ceil(patientsData.total / ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };
    
    const displayPatients = patientsData.items;

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg sm:text-xl">Pacientes</CardTitle>
                <div className="flex space-x-2">
                  <NewPatientModal onPatientCreated={() => {
                    // Reset filters and refresh patient list
                    setSearchTerm('');
                    setSelectedGroupId(undefined);
                    setCurrentPage(1);
                  }} />
                </div>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
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
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>
                        
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Select 
                                value={selectedGroupId?.toString() || 'all'} 
                                onValueChange={(value) => {
                                    setSelectedGroupId(value === 'all' ? undefined : parseInt(value));
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="pl-10 w-full sm:w-48">
                                    <SelectValue placeholder="Todos os grupos" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os grupos</SelectItem>
                                    {groups.map((group) => (
                                        <SelectItem key={group.id} value={group.id.toString()}>
                                            {group.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Loading and Error States */}
                    {isGroupsLoading && (
                        <div className="flex items-center text-sm text-muted-foreground">
                            <Spinner className="h-4 w-4 mr-2" />
                            Carregando grupos...
                        </div>
                    )}

                    {groupsError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erro</AlertTitle>
                            <AlertDescription>{groupsError}</AlertDescription>
                        </Alert>
                    )}
                </div>

                <div className="flex-grow mt-4">
                  {isLoading ? (
                      <div className="text-center py-6"><Spinner /></div>
                  ) : error ? (
                      <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Erro</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                      </Alert>
                  ) : displayPatients.length > 0 ? (
                      <div className="divide-y divide-border">
                          {displayPatients.map((patient: PatientSummary) => (
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
                                <Link href={`/dashboard-doctor/patients/${patient.patient_id}/overview`} className="inline-block">
                                  <Button size="sm" variant="outline" className="text-xs sm:text-sm">
                                      Detalhes
                                  </Button>
                                </Link>
                              </div>
                          ))}
                      </div>
                  ) : (
                      <div className="text-center py-6">
                          <p className="text-sm text-muted-foreground">
                              {searchTerm || selectedGroupId ? 'Nenhum paciente encontrado.' : (patientsData.total === 0 ? 'Nenhum paciente cadastrado.' : 'Nenhum paciente corresponde à busca.')}
                          </p>
                      </div>
                  )}
                </div>
                 
                 {totalPages > 1 && (
                     <Pagination className="mt-4">
                        <PaginationContent>
                            <PaginationItem>
                              <PaginationPrevious
                                  href="#"
                                  onClick={(e: React.MouseEvent) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                                  aria-disabled={currentPage === 1}
                                  className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                              />
                            </PaginationItem>
                            {[...Array(totalPages)].map((_, i) => (
                                <PaginationItem key={i}>
                                  <PaginationLink
                                      href="#"
                                      isActive={currentPage === i + 1}
                                      onClick={(e: React.MouseEvent) => { e.preventDefault(); handlePageChange(i + 1); }}>
                                      {i + 1}
                                  </PaginationLink>
                                </PaginationItem>
                            ))}
                            <PaginationItem>
                              <PaginationNext
                                  href="#"
                                  onClick={(e: React.MouseEvent) => { e.preventDefault(); handlePageChange(currentPage + 1); }}
                                  aria-disabled={currentPage === totalPages}
                                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                              />
                            </PaginationItem>
                        </PaginationContent>
                        </Pagination>
                 )}
                 <p className="text-xs text-muted-foreground text-center mt-2">
                      Exibindo {displayPatients.length} de {patientsData.total} pacientes {searchTerm || selectedGroupId ? 'encontrados' : 'totais'}.
                 </p>
        </CardContent>
      </Card>
    );
}