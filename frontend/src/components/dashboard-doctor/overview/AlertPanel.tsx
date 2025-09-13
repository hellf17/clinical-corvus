import React from 'react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { AlertCircle, BellRing, CheckCircle, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/Button";

interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  acknowledged: boolean;
}

interface AlertPanelProps {
  alerts: AlertItem[];
  onAcknowledge: (id: string) => void;
  onViewAll: () => void;
}

export function AlertPanel({ alerts, onAcknowledge, onViewAll }: AlertPanelProps) {
  const severityIcons = {
    low: <BellRing className="h-4 w-4 text-blue-500" />,
    medium: <AlertCircle className="h-4 w-4 text-yellow-500" />,
    high: <AlertCircle className="h-4 w-4 text-orange-500" />,
    critical: <AlertCircle className="h-4 w-4 text-red-500" />
  };

  const severityTitles = {
    low: 'Informação',
    medium: 'Atenção',
    high: 'Importante',
    critical: 'Crítico'
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 flex justify-between items-center">
        <h3 className="font-semibold flex items-center gap-2">
          <BellRing className="h-5 w-5 text-blue-600" />
          Alertas do Paciente
        </h3>
        <Button variant="ghost" size="sm" onClick={onViewAll}>
          Ver todos
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
      
      <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            Nenhum alerta ativo para este paciente
          </div>
        ) : (
          alerts.map((alert) => (
            <Alert 
              key={alert.id} 
              className={`
                ${alert.acknowledged ? 'opacity-70' : ''}
                ${alert.severity === 'critical' ? 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10' : ''}
                ${alert.severity === 'high' ? 'border-orange-200 bg-orange-50 dark:border-orange-900/50 dark:bg-orange-900/10' : ''}
                ${alert.severity === 'medium' ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900/50 dark:bg-yellow-900/10' : ''}
                ${alert.severity === 'low' ? 'border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-900/10' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {severityIcons[alert.severity]}
                </div>
                <div className="flex-1">
                  <AlertTitle className="flex justify-between">
                    <span>
                      {severityTitles[alert.severity]}: {alert.title}
                    </span>
                    {alert.acknowledged && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                  </AlertTitle>
                  <AlertDescription className="mt-1">
                    {alert.description}
                  </AlertDescription>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(alert.timestamp).toLocaleString('pt-BR')}
                  </div>
                </div>
                {!alert.acknowledged && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onAcknowledge(alert.id)}
                  >
                    Marcar como lido
                  </Button>
                )}
              </div>
            </Alert>
          ))
        )}
      </div>
    </div>
  );
}