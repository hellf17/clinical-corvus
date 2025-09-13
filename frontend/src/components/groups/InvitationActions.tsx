'use client';

import React, { useState } from 'react';
import { GroupInvitation } from '@/types/groupInvitation';
import { acceptGroupInvitation, declineGroupInvitation } from '@/services/groupInvitationService';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/Dialog';
import { Check, X, AlertCircle } from 'lucide-react';

interface InvitationActionsProps {
  invitation: GroupInvitation;
  onActionComplete?: () => void;
}

export const InvitationActions: React.FC<InvitationActionsProps> = ({ invitation, onActionComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeclineDialog, setShowDeclineDialog] = useState(false);

  const handleAccept = async () => {
    try {
      setLoading(true);
      setError(null);
      await acceptGroupInvitation({ token: invitation.token });
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err) {
      setError('Failed to accept invitation');
      console.error('Error accepting invitation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    try {
      setLoading(true);
      setError(null);
      await declineGroupInvitation({ token: invitation.token });
      setShowDeclineDialog(false);
      
      if (onActionComplete) {
        onActionComplete();
      }
    } catch (err) {
      setError('Failed to decline invitation');
      console.error('Error declining invitation:', err);
    } finally {
      setLoading(false);
    }
  };

  // Check if invitation is still valid
  const isExpired = new Date(invitation.expires_at) < new Date();
  const isAccepted = invitation.accepted_at !== null;
  const isDeclined = invitation.declined_at !== null;
  const isRevoked = invitation.revoked_at !== null;
  const isPending = !isAccepted && !isDeclined && !isRevoked && !isExpired;

  if (!isPending) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <Alert variant="destructive" className="mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        size="sm" 
        onClick={handleAccept}
        disabled={loading}
        className="flex items-center gap-1"
      >
        {loading ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-transparent" />
        ) : (
          <Check className="h-4 w-4" />
        )}
        Accept
      </Button>
      
      <Dialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={loading}
            className="flex items-center gap-1"
          >
            {loading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-transparent" />
            ) : (
              <X className="h-4 w-4" />
            )}
            Decline
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to decline the invitation to join {(invitation as any).group?.name || 'this group'}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeclineDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDecline} disabled={loading}>
              {loading ? 'Declining...' : 'Decline Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};