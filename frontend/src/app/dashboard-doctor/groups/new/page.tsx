'use client';

import React from 'react';
import { GroupForm } from '@/components/groups/GroupForm';
import Breadcrumbs from '@/components/layout/Breadcrumbs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function NewGroupPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs />
      
      <Card>
        <CardHeader>
          <CardTitle>Criar Novo Grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <GroupForm />
        </CardContent>
      </Card>
    </div>
  );
}