'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Bell, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { listGroups } from '@/services/groupService';
import { Group } from '@/types/group';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import Link from 'next/link';

interface GroupAlertsCardProps {
  onViewAll?: () => void;
}

export default function GroupAlertsCard({ onViewAll }: GroupAlertsCardProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listGroups(undefined, 0, 5); // Get first 5 groups
      setGroups(response.items);
    } catch (err) {
      setError('Failed to load group alerts');
      console.error('Error fetching group alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  // Generate mock alerts based on groups
  const generateGroupAlerts = () => {
    const alerts = [];
    for (let i = 0; i < Math.min(3, groups.length); i++) {
      const group = groups[i];
      // Mock alerts - in a real implementation, these would come from the backend
      if (i % 3 === 0) {
        alerts.push({
          id: `group-${group.id}-1`,
          type: 'info',
          message: `Novo membro convidado para o grupo ${group.name}`,
          groupId: group.id,
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 1000)).toISOString()
        });
      } else if (i % 3 === 1) {
        alerts.push({
          id: `group-${group.id}-2`,
          type: 'warning',
          message: `Paciente atribuído ao grupo ${group.name}`,
          groupId: group.id,
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString()
        });
      } else {
        alerts.push({
          id: `group-${group.id}-3`,
          type: 'success',
          message: `Grupo ${group.name} atualizado`,
          groupId: group.id,
          timestamp: new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString()
        });
      }
    }
    return alerts;
  };

  const alerts = generateGroupAlerts();

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas de Grupos</CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <Spinner className="h-6 w-6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Alertas de Grupos</CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Alertas de Grupos</CardTitle>
        <Bell className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {alerts.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  {alert.type === 'warning' ? (
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 mr-2 flex-shrink-0" />
                  ) : alert.type === 'success' ? (
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                  ) : (
                    <Bell className="h-4 w-4 text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(alert.timestamp).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t">
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={onViewAll}
                asChild
              >
                <Link href="/dashboard-doctor/groups">
                  Ver todos os alertas
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhum alerta de grupo recente
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}