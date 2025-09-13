'use client';

import React, { useState, useEffect, useRef } from 'react';
import { GroupInvitation } from '@/types/groupInvitation';
import { listUserInvitations } from '@/services/groupInvitationService';
import { InvitationActions } from '@/components/groups/InvitationActions';
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
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface UserInvitationsProps {
  onInvitationAction?: () => void;
}

export const UserInvitations: React.FC<UserInvitationsProps> = ({ onInvitationAction }) => {
  const [invitations, setInvitations] = useState<GroupInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await listUserInvitations();
      setInvitations(response.items);
      setError(null);
    } catch (err) {
      setError('Failed to load invitations');
      console.error('Error loading invitations:', err);
    } finally {
      setLoading(false);
    }
  };

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
  }, []);

  const handleActionComplete = () => {
    fetchInvitations();
    if (onInvitationAction) {
      onInvitationAction();
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

  const pendingInvitations = invitations.filter(invitation => 
    !invitation.accepted_at && 
    !invitation.declined_at && 
    !invitation.revoked_at && 
    new Date(invitation.expires_at) >= new Date()
  );

  if (pendingInvitations.length === 0) {
    return null; // Don't show anything if there are no pending invitations
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Group Invitations</h3>
      
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead>Invited By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingInvitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell>{(invitation as any).group?.name || 'Unknown Group'}</TableCell>
                <TableCell>{(invitation as any).invited_by?.name || 'Unknown User'}</TableCell>
                <TableCell>{getStatusBadge(invitation)}</TableCell>
                <TableCell>
                  {format(new Date(invitation.created_at), 'PP', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {format(new Date(invitation.expires_at), 'PP', { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <InvitationActions 
                    invitation={invitation} 
                    onActionComplete={handleActionComplete} 
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};