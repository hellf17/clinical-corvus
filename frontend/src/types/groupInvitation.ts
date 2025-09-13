export interface GroupInvitationBase {
  group_id: number;
  email: string;
  role: string;
}

export interface GroupInvitationCreate extends GroupInvitationBase {
}

export interface GroupInvitationUpdate {
  role?: string;
}

export interface GroupInvitationAccept {
  token: string;
}

export interface GroupInvitationDecline {
  token: string;
}

export interface GroupInvitationRevoke {
  id: number;
}

export interface GroupInvitation extends GroupInvitationBase {
  id: number;
  invited_by_user_id: number;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  declined_at: string | null;
  revoked_at: string | null;
  created_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'revoked' | 'expired';
}

export interface GroupInvitationListResponse {
  items: GroupInvitation[];
  total: number;
}