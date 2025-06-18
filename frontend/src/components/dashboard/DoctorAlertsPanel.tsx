'use client'; // Mark as client component

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"
import { Badge } from "@/components/ui/Badge";
import { Spinner } from '@/components/ui/Spinner';
import { Activity, AlertCircle, CheckCircle, Eye } from 'lucide-react';
import { getAlertsClient, markAlertAsReadClient } from '@/services/alertService.client';
import { Alert as AlertType, AlertListResponse } from "@/types/alerts"; 
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/Pagination";
import { useAuth } from '@clerk/nextjs';

const ITEMS_PER_PAGE = 5; // Number of alerts per page

export default function DoctorAlertsPanel() {
  const { getToken } = useAuth();
  const [alertsData, setAlertsData] = useState<AlertListResponse>({ items: [], total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingAlertId, setUpdatingAlertId] = useState<number | null>(null); // Use number for ID

  const fetchUnreadAlerts = useCallback(async (page: number) => {
    setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token not found.');
      const data = await getAlertsClient({ status: 'unread', page, limit: ITEMS_PER_PAGE }, token);
      setAlertsData(data);
    } catch (err: any) {
      setError(err.message || "Erro ao buscar alertas.");
      setAlertsData({ items: [], total: 0 }); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchUnreadAlerts(currentPage);
  }, [fetchUnreadAlerts, currentPage]); // Refetch when currentPage changes

  const handleMarkAsRead = async (alertId: number) => { // Use number for ID
    setUpdatingAlertId(alertId);
    try {
      const token = await getToken();
      if (!token) throw new Error('Authentication token not found.');
      await markAlertAsReadClient(alertId, token); 
      toast.success("Alerta marcado como lido.");
      // Refetch current page to update the list
      fetchUnreadAlerts(currentPage); 
    } catch (error: any) {
        toast.error("Falha ao marcar alerta como lido", { description: error.message });
    } finally {
        setUpdatingAlertId(null);
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(alertsData.total / ITEMS_PER_PAGE);
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
    }
  };

  // Helper to format timestamp
  const formatTimeAgo = (timestamp: string): string => {
      try {
        return formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: ptBR });
      } catch (e) {
          return "Data inválida";
      }
  };

  const displayAlerts = alertsData.items;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-destructive"/>
            Alertas Pendentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
            <div className="flex justify-center items-center h-20">
                <Spinner />
            </div>
        ) : error ? (
             <Alert className="text-destructive border-destructive dark:border-destructive [&>svg]:text-destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
             </Alert>
        ) : displayAlerts.length > 0 ? (
          <ul className="space-y-3">
            {displayAlerts.map((alert: AlertType) => ( // Use AlertType
              <li key={alert.alert_id} className="flex items-start space-x-3 group"> {/* Use alert_id */}
                {/* Severity Indicator */}
                <div className={`mt-1.5 flex-shrink-0 w-2 h-2 rounded-full ${
                  (alert.severity === 'critical' || alert.severity === 'severe') ? 'bg-destructive' 
                  : alert.severity === 'moderate' ? 'bg-yellow-500' 
                  : 'bg-green-500' // Consider 'warning' as yellow too? Adjust as needed.
                }`} />
                <div className="flex-1 min-w-0">
                  <Link href={`/patients/${alert.patient_id}`} className="text-sm font-medium hover:underline">
                       {alert.patient_name || `Paciente ID: ${alert.patient_id}`} 
                  </Link> 
                  <p className="text-sm text-muted-foreground truncate">{alert.message}</p>
                  <p className="text-xs text-muted-foreground/80">{formatTimeAgo(alert.created_at)}</p> {/* Use created_at */}
                </div>
                 <Button 
                    variant="outline" 
                    size="sm" 
                    className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity h-7 px-2 ml-auto"
                    onClick={() => handleMarkAsRead(alert.alert_id)} // Use alert_id
                    disabled={updatingAlertId === alert.alert_id}
                    aria-label={`Marcar alerta como lido`}
                  >
                   {updatingAlertId === alert.alert_id ? (
                       <Spinner size="sm" className="h-3 w-3"/>
                   ) : (
                       <CheckCircle className="h-3 w-3" />
                   )}
                  </Button>
              </li>
            ))}
          </ul>
        ) : (
            <Alert className="border-none bg-transparent shadow-none">
                <Activity className="h-4 w-4" />
                <AlertTitle>Tudo em ordem!</AlertTitle>
                <AlertDescription>
                    Nenhum alerta pendente no momento.
                </AlertDescription>
            </Alert>
        )}
         
         {/* Pagination Controls */} 
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
             Exibindo {displayAlerts.length} de {alertsData.total} alertas pendentes.
         </p>
      </CardContent>
    </Card>
  );
} 