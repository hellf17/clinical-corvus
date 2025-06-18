'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { alertsService, AlertType } from '@/services/alertsService';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { AlertTriangle, CheckCircle, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AlertsPanelProps {
  patientId: number | string;
  initialLoad?: boolean; // Optional: Set to true to load on mount
}

const SEVERITY_MAP: Record<string, { color: string; icon: React.ElementType }> = {
  critical: { color: 'bg-red-500', icon: AlertTriangle },
  high: { color: 'bg-orange-500', icon: AlertTriangle },
  warning: { color: 'bg-yellow-500', icon: AlertTriangle },
  medium: { color: 'bg-yellow-500', icon: AlertTriangle },
  info: { color: 'bg-blue-500', icon: Bell },
  low: { color: 'bg-blue-500', icon: Bell },
  normal: { color: 'bg-green-500', icon: CheckCircle },
};

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ patientId, initialLoad = true }) => {
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [isLoading, setIsLoading] = useState(initialLoad);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  const fetchAlerts = useCallback(async () => {
      setIsLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication failed: Token not provided.");
      
      // Fetch only active alerts initially, limit to e.g. 20
      const response = await alertsService.getPatientAlerts(patientId, token, {
        onlyActive: true, 
        limit: 20 
      });
      setAlerts(response.items);
      
    } catch (err: any) {
      console.error("Failed to fetch alerts:", err);
      setError(err.message || "Erro ao buscar alertas.");
      setAlerts([]);
      } finally {
        setIsLoading(false);
      }
  }, [patientId, getToken]);
    
  useEffect(() => {
    if (initialLoad && patientId) {
    fetchAlerts();
    }
  }, [initialLoad, patientId, fetchAlerts]);

  const handleMarkAsRead = async (alertId: number) => {
    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication failed: Token not provided.");

      // Optimistic UI update
      setAlerts(prevAlerts => prevAlerts.filter(a => a.alert_id !== alertId));
      
      await alertsService.updateAlertStatus(alertId, { is_read: true, status: 'acknowledged' }, token);
      toast.success("Alerta marcado como lido.");
      // No need to re-fetch here due to optimistic update, unless confirmation is desired

    } catch (err: any) {
      console.error(`Failed to mark alert ${alertId} as read:`, err);
      toast.error("Erro ao marcar alerta como lido", { description: err.message });
      // Revert optimistic update on error
      fetchAlerts(); // Re-fetch to get actual state
    }
  };

  const getSeverityStyle = (severity: string) => {
    return SEVERITY_MAP[severity?.toLowerCase()] || { color: 'bg-gray-400', icon: Bell };
  };

      return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Alertas Ativos</CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchAlerts} disabled={isLoading}>
          {isLoading ? <Spinner size="sm"/> : 'Atualizar'}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="flex justify-center p-4"><Spinner /></div>}
        {error && <p className="text-center text-destructive p-4">{error}</p>}
        {!isLoading && !error && alerts.length === 0 && (
          <p className="text-center text-muted-foreground p-4">Nenhum alerta ativo no momento.</p>
        )}
        {!isLoading && !error && alerts.length > 0 && (
          <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {alerts.map((alert) => {
              const { icon: Icon, color } = getSeverityStyle(alert.severity);
      return (
                <li key={alert.alert_id} className="flex items-start space-x-3 p-3 border rounded-md bg-card hover:bg-muted/50 transition-colors">
                  <span className={cn("flex h-2 w-2 translate-y-1 rounded-full", color)} />
                  <div className="flex-1 space-y-1">
                     <div className="flex items-center justify-between">
                       <p className="text-sm font-medium leading-none">
                         {alert.parameter || 'Alerta'}
                       </p>
                       <p className="text-xs text-muted-foreground">
                         {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true, locale: ptBR })}
                       </p>
        </div>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                     {alert.value !== null && alert.value !== undefined && (
                         <p className="text-xs text-muted-foreground">
                             Valor: {alert.value} {alert.reference ? `(Ref: ${alert.reference})` : ''}
                         </p>
                  )}
                  </div>
            <Button 
                      variant="outline" 
              size="sm" 
                      className="ml-auto shrink-0 h-7 px-2 py-1 text-xs" 
                      onClick={() => handleMarkAsRead(alert.alert_id)}
                      title="Marcar como lido"
            >
                     <CheckCircle className="h-3.5 w-3.5" />
            </Button>
                </li>
    );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}; 