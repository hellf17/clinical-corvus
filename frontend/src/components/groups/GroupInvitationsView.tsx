'use client';

import React, { useState } from 'react';
import { InvitationForm } from '@/components/groups/InvitationForm';
import { InvitationList } from '@/components/groups/InvitationList';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/Dialog';
import { Plus } from 'lucide-react';

interface GroupInvitationsViewProps {
  groupId: number;
}

export const GroupInvitationsView: React.FC<GroupInvitationsViewProps> = ({ groupId }) => {
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleInvitationSent = () => {
    setShowInviteForm(false);
    // Trigger a refresh of the invitation list
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Group Invitations</h2>
        <Dialog open={showInviteForm} onOpenChange={setShowInviteForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Member to Group</DialogTitle>
            </DialogHeader>
            <InvitationForm 
              groupId={groupId} 
              onSuccess={handleInvitationSent}
              onCancel={() => setShowInviteForm(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <InvitationList 
        key={refreshKey}
        groupId={groupId} 
        onInvitationChange={() => setRefreshKey(prev => prev + 1)}
      />
    </div>
  );
};