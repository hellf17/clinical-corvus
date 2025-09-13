'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GroupInvitation } from '@/types/groupInvitation';
import { listGroupInvitations, revokeGroupInvitation } from '@/services/groupInvitationService';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/Table';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/Dialog';
import { Trash2, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

interface InvitationListProps {
  groupId: number;
  onInvitationChange?: () => void;
}

export const InvitationList: React.FC<InvitationListProps> = ({ groupId, onInvitationChange }) => {
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [invitationToRevoke, setInvitationToRevoke] = useState<GroupInvitation | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listGroupInvitations(groupId);
      setInvitations(response.items);
      setError(null);
    } catch (err) {
      setError('Failed to load invitations');
      console.error('Error loading invitations:', err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchInvitations();
    
    // Set up polling for real-time updates
    pollIntervalRef.current = setInterval(fetchInvitations, 30000); // Poll every 30 seconds
    
    return () => {
      // Clean up interval on component unmount
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
 }, [groupId, fetchInvitations]);

  const handleRevokeClick = (invitation: GroupInvitation) => {
    setInvitationToRevoke(invitation);
    setShowRevokeDialog(true);
  };

  const handleRevokeConfirm = async () => {
    if (!invitationToRevoke) return;
    
    try {
      setRevokingId(invitationToRevoke.id);
      await revokeGroupInvitation(groupId, invitationToRevoke.id);
      setShowRevokeDialog(false);
      setInvitationToRevoke(null);
      
      // Refresh the list
      fetchInvitations();
      
      if (onInvitationChange) {
        onInvitationChange();
      }
    } catch (err) {
      setError('Failed to revoke invitation');
      console.error('Error revoking invitation:', err);
    } finally {
      setRevokingId(null);
    }
  };

  const getStatusBadge = (invitation: GroupInvitation) => {
    if (invitation.accepted_at) {
      return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Accepted</Badge>;
    }
    if (invitation.declined_at) {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
    }
    if (invitation.revoked_at) {
      return <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Revoked</Badge>;
    }
    if (new Date(invitation.expires_at) < new Date()) {
      return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Expired</Badge>;
    }
    return <Badge variant="default"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
 };

  if (loading) {
    return <div>Loading invitations...</div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Invitations</h3>
        <Button variant="outline" onClick={fetchInvitations}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {invitations.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No invitations found
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell>{invitation.email}</TableCell>
                  <TableCell>
                    <Badge variant={invitation.role === 'admin' ? 'default' : 'secondary'}>
                      {invitation.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(invitation)}</TableCell>
                  <TableCell>
                    {format(new Date(invitation.created_at), 'PP', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {format(new Date(invitation.expires_at), 'PP', { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {!invitation.accepted_at && !invitation.declined_at && !invitation.revoked_at && 
                     new Date(invitation.expires_at) >= new Date() && (
                      <Dialog open={showRevokeDialog && invitationToRevoke?.id === invitation.id} onOpenChange={setShowRevokeDialog}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleRevokeClick(invitation)}
                            disabled={revokingId === invitation.id}
                          >
                            {revokingId === invitation.id ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-transparent" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Revoke Invitation</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to revoke the invitation for {invitation.email}? 
                              This action cannot be undone.
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
                              Cancel
                            </Button>
                            <Button variant="destructive" onClick={handleRevokeConfirm}>
                              Revoke Invitation
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};