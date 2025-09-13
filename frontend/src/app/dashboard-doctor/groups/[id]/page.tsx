'use client';

import React from 'react';
import { GroupDetail } from '@/components/groups/GroupDetail';

export default function GroupDetailPage({ params }: { params: { id: string } }) {
  const groupId = parseInt(params.id);

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
      <GroupDetail groupId={groupId} />
    </div>
  );
}