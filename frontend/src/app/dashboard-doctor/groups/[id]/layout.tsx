'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getGroup } from '@/services/groupService';
import { GroupWithMembersAndPatients } from '@/types/group';
import { Spinner } from '@/components/ui/Spinner';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  Users,
  FileText,
  Settings,
  ArrowLeft,
  UserPlus,
  FilePlus
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';

export default function GroupLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { getToken } = useAuth();
  const groupId = parseInt(params.id);
  const [group, setGroup] = useState<GroupWithMembersAndPatients | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroup = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const groupData = await getGroup(groupId);
      setGroup(groupData);
    } catch (err) {
      setError('Failed to load group details');
      console.error('Error fetching group:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (!isNaN(groupId)) {
      fetchGroup();
    }
  }, [groupId, fetchGroup]);

  if (isNaN(groupId)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            onClick={() => router.push('/dashboard-doctor/groups')} 
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grupo não encontrado</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>Grupo não encontrado.</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            onClick={() => router.push('/dashboard-doctor/groups')} 
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Erro ao carregar grupo</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            onClick={() => router.push('/dashboard-doctor/groups')} 
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Grupo não encontrado</h1>
        </div>
        <Alert variant="destructive">
          <AlertDescription>Grupo não encontrado.</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Navigation items
  const navItems = [
    {
      name: 'Visão Geral',
      href: `/dashboard-doctor/groups/${groupId}`,
      icon: Users,
      active: pathname === `/dashboard-doctor/groups/${groupId}` || pathname === `/dashboard-doctor/groups/${groupId}/`,
    },
    {
      name: 'Membros',
      href: `/dashboard-doctor/groups/${groupId}/members`,
      icon: UserPlus,
      active: pathname.startsWith(`/dashboard-doctor/groups/${groupId}/members`),
    },
    {
      name: 'Pacientes',
      href: `/dashboard-doctor/groups/${groupId}/patients`,
      icon: FileText,
      active: pathname.startsWith(`/dashboard-doctor/groups/${groupId}/patients`),
    },
    {
      name: 'Configurações',
      href: `/dashboard-doctor/groups/${groupId}/settings`,
      icon: Settings,
      active: pathname.startsWith(`/dashboard-doctor/groups/${groupId}/settings`),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with back button and group name */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={() => router.push('/dashboard-doctor/groups')} 
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{group.name}</h1>
            {group.description && (
              <p className="text-gray-600 dark:text-gray-300 text-sm">{group.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{group.members.length} membros</span>
          <FileText className="h-4 w-4 ml-2" />
          <span>{group.patients.length} pacientes</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Card>
        <CardContent className="p-0">
          <div className="flex flex-wrap border-b">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                    item.active
                      ? 'border-b-2 border-primary text-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Page Content */}
      {children}
    </div>
  );
}