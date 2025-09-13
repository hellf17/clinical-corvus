'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Users, UserPlus, FileText, AlertCircle } from 'lucide-react';
import { listGroups } from '@/services/groupService';
import { Group } from '@/types/group';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';

interface GroupOverviewCardProps {
  onViewAll?: () => void;
  onCreateGroup?: () => void;
}

export default function GroupOverviewCard({ onViewAll, onCreateGroup }: GroupOverviewCardProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getToken } = useAuth();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await listGroups(undefined, 0, 5);
        setGroups(response.items);
      } catch (err) {
        setError('Failed to load groups');
        console.error('Error fetching groups:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Grupos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
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
          <CardTitle className="text-sm font-medium">Grupos</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Grupos</CardTitle>
        <Users className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {groups.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{group.name}</p>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <UserPlus className="h-3 w-3 mr-1" />
                      <span className="mr-2">{(group as any).members?.length || 0} membros</span>
                      <FileText className="h-3 w-3 mr-1" />
                      <span>{(group as any).patients?.length || 0} pacientes</span>
                    </div>
                  </div>
                  <Link href={`/dashboard-doctor/groups/${group.id}`}>
                    <Button variant="outline" size="sm" className="ml-2">
                      Ver
                    </Button>
                  </Link>
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
                  Ver todos os grupos
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              Você ainda não tem grupos.
            </p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onCreateGroup}>
              Criar seu primeiro grupo
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}