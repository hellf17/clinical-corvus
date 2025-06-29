'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/Pagination";
import { getPatientsClient } from '@/services/patientService.client';
import { Spinner } from '@/components/ui/Spinner';
import { AlertCircle, Users, Search } from 'lucide-react';
import { PatientSummary, PatientListResponse } from "@/types/patient";

export default function DoctorPatientList() {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [currentPage, setCurrentPage] = React.useState(1);
    const [patientsData, setPatientsData] = React.useState<PatientListResponse>({ items: [], total: 0 });
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    
    const ITEMS_PER_PAGE = 5;
    const { getToken } = useAuth();

    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const token = await getToken();
                if (!token) {
                    throw new Error('Authentication token not available.');
                }
                const data = await getPatientsClient(
                    { page: currentPage, limit: ITEMS_PER_PAGE, search: searchTerm },
                    token
                );
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
    }, [currentPage, searchTerm, getToken]);

    const totalPages = Math.ceil(patientsData.total / ITEMS_PER_PAGE);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };
    
    const displayPatients = patientsData.items;

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle>Pacientes</CardTitle>
                <Link href="/patients/new" className="inline-block">
                    <Button size="sm" className="flex items-center">
                        <Users className="mr-2 h-4 w-4" />
                        Adicionar Paciente
                    </Button>
                </Link>
          </CardHeader>
          <CardContent>
                <div className="relative mb-4">
                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                     <Input
                        type="search"
                        placeholder="Buscar paciente por nome..."
                        className="pl-8 w-full"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
      </div>
      
                {isLoading ? (
                    <div className="text-center py-6"><Spinner /></div>
                ) : error ? (
                    <Alert className="text-destructive border-destructive dark:border-destructive [&>svg]:text-destructive">
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
                    <div className="font-medium text-foreground">{patient.name}</div>
                    <div className="text-sm text-muted-foreground">
                                        {patient.diagnostico || 'Sem diagnóstico'}
                    </div>
                  </div>
                  <Link href={`/patients/${patient.patient_id}`} className="inline-block">
                    <Button size="sm" variant="outline">
                        Ver Detalhes
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
                        <p className="text-muted-foreground">
                            {searchTerm ? 'Nenhum paciente encontrado.' : (patientsData.total === 0 ? 'Nenhum paciente cadastrado.' : 'Nenhum paciente corresponde à busca.')}
              </p>
                        {!searchTerm && patientsData.total === 0 && (
                            <Link href="/patients/new" className="inline-block">
                                <Button size="sm" variant="outline">
                                    Adicionar Primeiro Paciente
                                </Button>
                            </Link>
                        )}
            </div>
          )}
                 
                 {totalPages > 1 && (
                     <Pagination className="mt-4">
                        <PaginationContent>
                            <PaginationItem>
                            <PaginationPrevious
                                href="#"
                                onClick={(e: React.MouseEvent) => { e.preventDefault(); handlePageChange(currentPage - 1); }}
                                aria-disabled={currentPage === 1}
                                className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined} />
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
                                className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined} />
                            </PaginationItem>
                        </PaginationContent>
                        </Pagination>
                 )}
                 <p className="text-xs text-muted-foreground text-center mt-2">
                      Exibindo {displayPatients.length} de {patientsData.total} pacientes {searchTerm ? 'encontrados' : 'totais'}.
                 </p>
        </CardContent>
      </Card>
    );
} 