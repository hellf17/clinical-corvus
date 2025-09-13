/**
 * Utility functions for group-based permissions in Clinical Corvus.
 * This module provides functions to check user permissions within groups on the frontend.
 */

import { GroupMembership, GroupRole } from '@/types/group';

/**
 * Check if a user is an admin of a specific group.
 * 
 * @param memberships - Array of group memberships for the user
 * @param groupId - Group ID to check
 * @returns boolean - True if user is an admin of the group, False otherwise
 */
export function isUserAdminOfGroup(memberships: GroupMembership[], groupId: number): boolean {
  const membership = memberships.find(m => m.group_id === groupId && m.role === 'admin');
  return membership !== undefined;
}

/**
 * Check if a user is a member of a specific group.
 * 
 * @param memberships - Array of group memberships for the user
 * @param groupId - Group ID to check
 * @returns boolean - True if user is a member of the group, False otherwise
 */
export function isUserMemberOfGroup(memberships: GroupMembership[], groupId: number): boolean {
  const membership = memberships.find(m => m.group_id === groupId);
  return membership !== undefined;
}

/**
 * Get the role of a user in a specific group.
 * 
 * @param memberships - Array of group memberships for the user
 * @param groupId - Group ID to check
 * @returns GroupRole or null - Role of the user in the group, or null if not a member
 */
export function getUserGroupRole(memberships: GroupMembership[], groupId: number): GroupRole | null {
  const membership = memberships.find(m => m.group_id === groupId);
  return membership ? membership.role : null;
}

/**
 * Check if a user can manage a group (i.e., is an admin).
 * 
 * @param memberships - Array of group memberships for the user
 * @param groupId - Group ID to check
 * @returns boolean - True if user can manage the group, False otherwise
 */
export function canUserManageGroup(memberships: GroupMembership[], groupId: number): boolean {
  return isUserAdminOfGroup(memberships, groupId);
}

/**
 * Check if a user can invite members to a group.
 * 
 * @param memberships - Array of group memberships for the user
 * @param groupId - Group ID to check
 * @returns boolean - True if user can invite members, False otherwise
 */
export function canUserInviteMembers(memberships: GroupMembership[], groupId: number): boolean {
  return isUserAdminOfGroup(memberships, groupId);
}

/**
 * Check if a user can remove members from a group.
 * 
 * @param memberships - Array of group memberships for the user
 * @param groupId - Group ID to check
 * @param targetUserId - User ID of the member to be removed
 * @param currentUserId - Current user's ID
 * @returns boolean - True if user can remove the member, False otherwise
 */
export function canUserRemoveMembers(
  memberships: GroupMembership[], 
  groupId: number, 
  targetUserId: number,
  currentUserId: number
): boolean {
  // User must be a member of the group
  if (!isUserMemberOfGroup(memberships, groupId)) {
    return false;
  }
  
  // Admins can remove any member
  if (isUserAdminOfGroup(memberships, groupId)) {
    return true;
  }
  
  // Members can remove themselves
  if (currentUserId === targetUserId) {
    return true;
  }
  
  return false;
}

/**
 * Check if a user can change another member's role in a group.
 * 
 * @param memberships - Array of group memberships for the user
 * @param groupId - Group ID to check
 * @param targetUserId - User ID of the member whose role is to be changed
 * @param currentUserId - Current user's ID
 * @returns boolean - True if user can change the member's role, False otherwise
 */
export function canUserChangeMemberRole(
  memberships: GroupMembership[], 
  groupId: number, 
  targetUserId: number,
  currentUserId: number
): boolean {
  // User must be a member of the group
  if (!isUserMemberOfGroup(memberships, groupId)) {
    return false;
  }
  
  // Only admins can change member roles
  if (!isUserAdminOfGroup(memberships, groupId)) {
    return false;
  }
  
  // Admins cannot change their own role
  if (currentUserId === targetUserId) {
    return false;
  }
  
  return true;
}

/**
 * Check if a user can assign patients to a group.
 * 
 * @param memberships - Array of group memberships for the user
 * @param groupId - Group ID to check
 * @returns boolean - True if user can assign patients, False otherwise
 */
export function canUserAssignPatients(memberships: GroupMembership[], groupId: number): boolean {
  return isUserAdminOfGroup(memberships, groupId);
}

/**
 * Check if a user can remove patients from a group.
 * 
 * @param memberships - Array of group memberships for the user
 * @param groupId - Group ID to check
 * @returns boolean - True if user can remove patients, False otherwise
 */
export function canUserRemovePatients(memberships: GroupMembership[], groupId: number): boolean {
  return isUserAdminOfGroup(memberships, groupId);
}