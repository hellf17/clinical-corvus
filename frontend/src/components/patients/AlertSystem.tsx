import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Bell, BellOff, X, Clock, AlertTriangle, Info, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import useSWR from 'swr';

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
  action?: {
    label: string;
    url?: string;
    callback?: () => void;
  };
}

interface AlertSystemProps {
  patientId: string;
  className?: string;
}

const fetcher = async ([url, token]: [string, string | null]) => {
  if (!token) {
    throw new Error('Authentication token is not available.');
  }
  
  const response = await fetch(url, {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
    case 'warning': return <AlertTriangle className="h-5 w-5 text-orange-600" />;
    case 'info': return <Info className="h-5 w-5 text-blue-600" />;
    default: return <Info className="h-5 w-5 text-gray-600" />;
  }
};

const getAlertColor = (type: string) => {
  switch (type) {
    case 'critical': return 'border-red-200 bg-red-50';
    case 'warning': return 'border-orange-200 bg-orange-50';
    case 'info': return 'border-blue-200 bg-blue-50';
    default: return 'border-gray-200 bg-gray-50';
  }
};

const getAlertBadgeColor = (type: string) => {
  switch (type) {
    case 'critical': return 'bg-red-100 text-red-800';
    case 'warning': return 'bg-orange-100 text-orange-800';
    case 'info': return 'bg-blue-100 text-blue-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default function AlertSystem({ patientId, className }: AlertSystemProps) {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);

  const { data: alerts, error, isLoading, mutate } = useSWR<Alert[]>(
    token ? [`/api/patients/${patientId}/alerts`, token] : null, 
    fetcher,
    { revalidateOnFocus: false }
  );

  const handleAcknowledge = async (alertId: string) => {
    try {
      const freshToken = await getToken();
      const response = await fetch(`/api/patients/${patientId}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${freshToken}`
        }
      });
      
      if (response.ok) {
        mutate();
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleDismiss = async (alertId: string) => {
    try {
      const freshToken = await getToken();
      const response = await fetch(`/api/patients/${patientId}/alerts/${alertId}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${freshToken}`
        }
      });
      
      if (response.ok) {
        mutate();
      }
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const handleAction = (action: any) => {
    if (action.url) {
      window.open(action.url, '_blank');
    } else if (action.callback) {
      action.callback();
    }
  };

  const filteredAlerts = alerts?.filter(alert => 
    !showCriticalOnly || alert.type === 'critical'
  ) || [];

  const criticalCount = alerts?.filter(alert => 
    alert.type === 'critical' && !alert.acknowledged
  ).length || 0;

  if (error) {
    return (
      <div className={`p-4 ${className}`}>
        <Alert className="text-destructive border-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar alertas</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Bell className="h-6 w-6 text-gray-600" />
            {criticalCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {criticalCount}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-xl font-semibold">Sistema de Alertas</h2>
            <p className="text-sm text-muted-foreground">
              {criticalCount} alertas críticos não resolvidos
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={showCriticalOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowCriticalOnly(!showCriticalOnly)}
          >
            {showCriticalOnly ? 'Todos' : 'Críticos'}
          </Button>
          <Button
            variant={isMuted ? "default" : "outline"}
            size="sm"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <BellOff className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Critical Alert Banner */}
      {criticalCount > 0 && !isMuted && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Alerta Crítico</AlertTitle>
          <AlertDescription className="text-red-700">
            Existem {criticalCount} alertas críticos que requerem atenção imediata.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">
                {showCriticalOnly ? 'Nenhum alerta crítico' : 'Nenhum alerta ativo'}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <Card 
              key={alert.id} 
              className={`${getAlertColor(alert.type)} ${alert.acknowledged ? 'opacity-60' : ''}`}
            >
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="font-semibold">{alert.title}</h3>
                        <Badge className={getAlertBadgeColor(alert.type)}>
                          {alert.type === 'critical' && 'Crítico'}
                          {alert.type === 'warning' && 'Aviso'}
                          {alert.type === 'info' && 'Informação'}
                        </Badge>
                        {alert.acknowledged && (
                          <Badge variant="outline" className="text-xs">
                            Resolvido
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {alert.description}
                      </p>
                      
                      <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(alert.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      {alert.action && (
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAction(alert.action)}
                            className="text-xs"
                          >
                            {alert.action.label}
                            {alert.action.url && <ExternalLink className="h-3 w-3 ml-1" />}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {!alert.acknowledged && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAcknowledge(alert.id)}
                        className="h-8 w-8 p-0"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismiss(alert.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Alert Statistics */}
      {alerts && alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Estatísticas de Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
                <p className="text-xs text-muted-foreground">Críticos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {alerts.filter(a => a.type === 'warning' && !a.acknowledged).length}
                </p>
                <p className="text-xs text-muted-foreground">Avisos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {alerts.filter(a => a.type === 'info' && !a.acknowledged).length}
                </p>
                <p className="text-xs text-muted-foreground">Informações</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}