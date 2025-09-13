import api from '@/lib/api';
import {
  GroupInvitation,
  GroupInvitationCreate,
  GroupInvitationUpdate,
  GroupInvitationAccept,
  GroupInvitationDecline,
  GroupInvitationRevoke,
  GroupInvitationListResponse
} from '@/types/groupInvitation';

const API_BASE_URL = '/api/groups';

// Helper function to handle API errors
const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
  }
  return response;
};

// Group Invitation operations
export const createGroupInvitation = async (invitationData: GroupInvitationCreate): Promise<GroupInvitation> => {
  try {
    const response = await api.post(`${API_BASE_URL}/${invitationData.group_id}/invitations`, invitationData);
    return response.data;
  } catch (error) {
    console.error('Error creating group invitation:', error);
    throw error;
  }
};

export const listUserInvitations = async (skip = 0, limit = 100): Promise<GroupInvitationListResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    const response = await api.get(`/api/user/invitations?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error listing user invitations:', error);
    throw error;
  }
};

export const listGroupInvitations = async (groupId: number, skip = 0, limit = 100): Promise<GroupInvitationListResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    const response = await api.get(`${API_BASE_URL}/${groupId}/invitations?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error listing group invitations:', error);
    throw error;
  }
};

export const updateGroupInvitation = async (groupId: number, invitationId: number, invitationData: GroupInvitationUpdate): Promise<GroupInvitation> => {
  try {
    const response = await api.put(`${API_BASE_URL}/${groupId}/invitations/${invitationId}`, invitationData);
    return response.data;
  } catch (error) {
    console.error('Error updating group invitation:', error);
    throw error;
  }
};

export const revokeGroupInvitation = async (groupId: number, invitationId: number): Promise<void> => {
  try {
    await api.delete(`${API_BASE_URL}/${groupId}/invitations/${invitationId}`);
  } catch (error) {
    console.error('Error revoking group invitation:', error);
    throw error;
  }
};

export const acceptGroupInvitation = async (invitationData: GroupInvitationAccept): Promise<GroupInvitation> => {
  try {
    const response = await api.post(`${API_BASE_URL}/invitations/accept`, invitationData);
    return response.data;
  } catch (error) {
    console.error('Error accepting group invitation:', error);
    throw error;
  }
};

export const declineGroupInvitation = async (invitationData: GroupInvitationDecline): Promise<GroupInvitation> => {
  try {
    const response = await api.post(`${API_BASE_URL}/invitations/decline`, invitationData);
    return response.data;
  } catch (error) {
    console.error('Error declining group invitation:', error);
    throw error;
  }
};