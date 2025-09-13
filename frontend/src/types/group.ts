/**
 * Types for group management
 */

export type GroupRole = 'admin' | 'member';

export interface Group {
  id: number;
  name: string;
  description?: string;
  max_patients?: number;
  max_members?: number;
  created_at: string;
  updated_at: string;
}

export interface GroupMembership {
  id: number;
  group_id: number;
  user_id: number;
  role: GroupRole;
  joined_at: string;
  invited_by?: number;
}

export interface GroupPatient {
  id: number;
  group_id: number;
  patient_id: number;
  assigned_at: string;
  assigned_by?: number;
}

export interface GroupWithMembersAndPatients extends Group {
  members: GroupMembership[];
  patients: GroupPatient[];
}

export interface GroupCreate {
  name: string;
  description?: string;
  max_patients?: number;
  max_members?: number;
}

export interface GroupUpdate {
  name?: string;
  description?: string;
  max_patients?: number;
  max_members?: number;
}

export interface GroupMembershipCreate {
  user_id: number;
  role: GroupRole;
}

export interface GroupMembershipUpdate {
  role: GroupRole;
}

export interface GroupPatientCreate {
  patient_id: number;
}

export interface GroupWithCounts extends Group {
  member_count?: number;
  patient_count?: number;
}

export interface GroupListResponse {
  items: Group[];
  total: number;
}

export interface GroupWithCountsListResponse {
  items: GroupWithCounts[];
  total: number;
}

export interface GroupMembershipListResponse {
 items: GroupMembership[];
  total: number;
}

export interface GroupPatientListResponse {
  items: GroupPatient[];
  total: number;
}