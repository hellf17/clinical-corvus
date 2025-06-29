'use client';

import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@clerk/nextjs';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

interface PatientAlert {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string; // ISO date string
  type: string; // e.g., 'medication_reminder', 'critical_lab_value', 'appointment_reminder'
  ctaLink?: string; // Optional call to action link
  ctaText?: string; // Optional call to action text
}

interface PatientAlertsSummaryProps {
  patientId: string;
}

const fetcher = async ([url, token]: [string, string | null]) => {
  if (!token) {
    throw new Error('Authentication token is not available.');
  }
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + token },
  });
  if (!res.ok) {
    const errorInfo = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(`API Error: ${res.status} - ${errorInfo.detail || 'Failed to fetch alerts'}`);
  }
  return res.json();
};

const getSeverityIcon = (severity: PatientAlert['severity']) => {
  switch (severity) {
    case 'critical':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'high':
      return <AlertTriangle className="h-5 w-5 text-orange-500" />;
    case 'medium':
      return <Info className="h-5 w-5 text-yellow-500" />;
    case 'low':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    default:
      return <Info className="h-5 w-5 text-gray-500" />;
  }
};

const getSeverityBadgeVariant = (severity: PatientAlert['severity']): "default" | "destructive" | "outline" | "secondary" => {
  switch (severity) {
    case 'critical':
      return "destructive";
    case 'high':
      return "destructive";
    case 'medium':
      return "default"; // Or a custom yellow/orange
    case 'low':
      return "secondary";
    default:
      return "outline";
  }
};

export default function PatientAlertsSummary({ patientId }: PatientAlertsSummaryProps) {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);

  const apiUrl = patientId && token ? [`/api/patients/${patientId}/alerts`, token] : null;

  const { data: alerts, error, isLoading } = useSWR<PatientAlert[]>(apiUrl, fetcher, {
    refreshInterval: 60000, // Refresh every 60 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spinner size="sm" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando alertas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600">
        <AlertTriangle className="inline h-4 w-4 mr-1" />
        Erro ao carregar alertas: {error.message}
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return <p className="text-sm text-muted-foreground p-4">Você não tem novos alertas no momento.</p>;
  }

  // Sort alerts: critical/high first, then by timestamp
  const sortedAlerts = [...alerts].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });

  return (
    <div className="space-y-3 p-1">
      {sortedAlerts.slice(0, 5).map((alert) => ( // Show top 5 for summary
        <div key={alert.id} className="p-3 border rounded-lg bg-card hover:shadow-md transition-shadow">
          <div className="flex items-start space-x-3">
            <span className="flex-shrink-0">{getSeverityIcon(alert.severity)}</span>
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium">{alert.message}</p>
                <Badge variant={getSeverityBadgeVariant(alert.severity)} className="capitalize text-xs">
                  {alert.severity}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date(alert.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                {' - '} {alert.type}
              </p>
              {alert.ctaLink && alert.ctaText && (
                <Link href={alert.ctaLink} className="text-xs text-primary hover:underline mt-1 block">
                  {alert.ctaText}
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}
      {alerts.length > 5 && (
        <Link href="/dashboard-paciente/alerts" className="text-sm text-primary hover:underline p-4 block text-center">
          Ver todos os alertas ({alerts.length})
        </Link>
      )}
    </div>
  );
} 