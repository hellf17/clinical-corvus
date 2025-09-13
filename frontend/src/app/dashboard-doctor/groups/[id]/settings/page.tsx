'use client';

import React from 'react';
import { GroupForm } from '@/components/groups/GroupForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

export default function GroupSettingsPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const groupId = parseInt(params.id);

  const handleSave = () => {
    // Refresh the page to show updated data
    router.refresh();
  };

  const handleCancel = () => {
    router.back();
  };

  if (isNaN(groupId)) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          Grupo não encontrado.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupForm 
            onSuccess={handleSave} 
            onCancel={handleCancel} 
          />
        </CardContent>
      </Card>
    </div>
  );
}