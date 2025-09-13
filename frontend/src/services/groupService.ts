import api from '@/lib/api';
import {
  Group,
  GroupCreate,
  GroupUpdate,
  GroupWithMembersAndPatients,
  GroupMembership,
  GroupMembershipCreate,
  GroupMembershipUpdate,
  GroupPatient,
  GroupPatientCreate,
  GroupListResponse,
  GroupMembershipListResponse,
  GroupPatientListResponse,
  GroupWithCounts,
  GroupWithCountsListResponse
} from '@/types/group';
import { PatientSummary } from '@/types/patient';

const API_BASE_URL = '/api/groups';



// Group CRUD operations
export const createGroup = async (groupData: GroupCreate): Promise<Group> => {
  try {
    const response = await api.post(API_BASE_URL, groupData);
    return response.data;
  } catch (error) {
    console.error('Error creating group:', error);
    throw error;
  }
};

export const listGroups = async (search?: string, skip = 0, limit = 100): Promise<GroupWithCountsListResponse> => {
  try {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());
    params.append('include_counts', 'true');

    const response = await api.get(`${API_BASE_URL}?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error listing groups:', error);
    throw error;
  }
};

export const getGroup = async (groupId: number): Promise<GroupWithMembersAndPatients> => {
  try {
    const response = await api.get(`${API_BASE_URL}/${groupId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting group:', error);
    throw error;
  }
};

export const updateGroup = async (groupId: number, groupData: GroupUpdate): Promise<Group> => {
  try {
    const response = await api.put(`${API_BASE_URL}/${groupId}`, groupData);
    return response.data;
  } catch (error) {
    console.error('Error updating group:', error);
    throw error;
  }
};

export const deleteGroup = async (groupId: number): Promise<void> => {
  try {
    await api.delete(`${API_BASE_URL}/${groupId}`);
  } catch (error) {
    console.error('Error deleting group:', error);
    throw error;
  }
};

// Group Membership operations
export const inviteUserToGroup = async (groupId: number, membershipData: GroupMembershipCreate): Promise<GroupMembership> => {
  try {
    const response = await api.post(`${API_BASE_URL}/${groupId}/members`, membershipData);
    return response.data;
  } catch (error) {
    console.error('Error inviting user to group:', error);
    throw error;
  }
};

export const listGroupMembers = async (groupId: number, skip = 0, limit = 100): Promise<GroupMembershipListResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    const response = await api.get(`${API_BASE_URL}/${groupId}/members?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error listing group members:', error);
    throw error;
  }
};

export const updateGroupMemberRole = async (groupId: number, userId: number, membershipData: GroupMembershipUpdate): Promise<GroupMembership> => {
  try {
    const response = await api.put(`${API_BASE_URL}/${groupId}/members/${userId}`, membershipData);
    return response.data;
  } catch (error) {
    console.error('Error updating group member role:', error);
    throw error;
  }
};

export const removeUserFromGroup = async (groupId: number, userId: number): Promise<void> => {
  try {
    await api.delete(`${API_BASE_URL}/${groupId}/members/${userId}`);
  } catch (error) {
    console.error('Error removing user from group:', error);
    throw error;
  }
};

// Group Patient Assignment operations
export const assignPatientToGroup = async (groupId: number, assignmentData: GroupPatientCreate): Promise<GroupPatient> => {
  try {
    const response = await api.post(`${API_BASE_URL}/${groupId}/patients`, assignmentData);
    return response.data;
  } catch (error) {
    console.error('Error assigning patient to group:', error);
    throw error;
  }
};

export const listGroupPatients = async (groupId: number, skip = 0, limit = 100): Promise<GroupPatientListResponse> => {
  try {
    const params = new URLSearchParams();
    params.append('skip', skip.toString());
    params.append('limit', limit.toString());

    const response = await api.get(`${API_BASE_URL}/${groupId}/patients?${params.toString()}`);
    return response.data;
  } catch (error) {
    console.error('Error listing group patients:', error);
    throw error;
  }
};

export const removePatientFromGroup = async (groupId: number, patientId: number): Promise<void> => {
  try {
    await api.delete(`${API_BASE_URL}/${groupId}/patients/${patientId}`);
  } catch (error) {
    console.error('Error removing patient from group:', error);
    throw error;
  }
};