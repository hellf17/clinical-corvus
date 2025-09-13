import { Card } from "@/components/ui/Card";
import { AlertCircle } from "lucide-react";
import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';

interface Alert {
  alert_id: number;
  patient_id: number;
  patient_name: string;
  message: string;
  severity: 'critical' | 'high' | 'moderate' | 'low';
  created_at: string;
  is_read: boolean;
}

interface AlertListResponse {
  items: Alert[];
  total: number;
}

const fetcher = async ([url, token]: [string, string | null]) => {
  if (!token) {
    throw new Error('Authentication token is not available.');
  }
  const res = await fetch(url, {
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Sessão expirada. Por favor, faça login novamente.');
    }
    const errorInfo = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`API Error: ${res.status} - ${errorInfo.detail || errorInfo.error || 'Failed to fetch alerts'}`);
  }
  return res.json();
};

export default function CriticalAlertsCard({
  onViewAll,
  onAlertClick
}: {
  onViewAll: () => void;
  onAlertClick: (id: number) => void;
}) {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [pulsate, setPulsate] = useState(true);

  useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);

  const apiUrl = token ? [`/api/alerts`, token] : null;
  
  const { data: alertsData, error, isLoading } = useSWR<AlertListResponse>(apiUrl, fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  });

  const alerts = alertsData?.items || [];

  useEffect(() => {
    // Stop pulsating after 10 seconds
    const timer = setTimeout(() => setPulsate(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <Card className="border rounded-lg p-4 bg-gradient-to-br from-red-50 to-red-100 h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 mr-3 mt-0.5 text-gray-400" />
            <div>
              <h3 className="font-semibold">Alertas Críticos</h3>
              <p className="text-lg text-gray-500">Carregando...</p>
              <p className="text-sm text-gray-500 mt-1">Resultados críticos e tarefas urgentes</p>
            </div>
          </div>
          <button
            onClick={onViewAll}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Ver todos
          </button>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border rounded-lg p-4 bg-gradient-to-br from-red-50 to-red-100 h-full">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start">
            <AlertCircle className="h-6 w-6 mr-3 mt-0.5 text-gray-400" />
            <div>
              <h3 className="font-semibold">Alertas Críticos</h3>
              <p className="text-lg text-red-500">Erro ao carregar</p>
              <p className="text-sm text-gray-500 mt-1">Resultados críticos e tarefas urgentes</p>
            </div>
          </div>
          <button
            onClick={onViewAll}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Ver todos
          </button>
        </div>
        <div className="text-sm text-red-600">
          {error instanceof Error ? error.message : 'Erro ao carregar alertas'}
        </div>
      </Card>
    );
  }

  return (
    <Card className={`
      border rounded-lg p-4 sm:p-6 bg-gradient-to-br from-red-50 to-red-100 transition-all duration-200 h-full
      ${pulsate && alerts.length > 0 ? 'animate-pulse border-red-500' : ''}
      ${alerts.length > 0 ? 'border-red-300' : 'border-gray-200'}
      hover:shadow-lg hover:border-blue-500
    `}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start">
          <AlertCircle className={`h-6 w-6 mr-3 mt-0.5 ${alerts.length > 0 ? 'text-red-500' : 'text-gray-400'}`} />
          <div>
            <h3 className="font-semibold text-base sm:text-lg">Alertas Críticos</h3>
            <p className={`text-lg ${alerts.length > 0 ? 'text-red-500' : 'text-gray-500'}`}>
              {alerts.length} {alerts.length === 1 ? 'Alerta Crítico' : 'Alertas Críticos'}
            </p>
            <p className="text-sm text-gray-500 mt-1">Resultados críticos e tarefas urgentes</p>
          </div>
        </div>
        <button
          onClick={onViewAll}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        >
          Ver todos
        </button>
      </div>
      
      <div className="space-y-3">
        {alerts.slice(0, 3).map((alert) => (
          <div
            key={alert.alert_id}
            className="p-3 bg-red-50 rounded-lg border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
            onClick={() => onAlertClick(alert.alert_id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onAlertClick(alert.alert_id)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-red-800">{alert.message}</p>
                <p className="text-sm text-red-600 mt-1">Paciente: {alert.patient_name}</p>
              </div>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
          </div>
        ))}
        
        {alerts.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p>Nenhum alerta crítico no momento</p>
          </div>
        )}
      </div>
    </Card>
  );
}