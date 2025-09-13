'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Group, GroupMembership } from '@/types/group';

// Define the group context type
interface GroupContextType {
  currentGroup: Group | null;
  userGroups: GroupMembership[];
  loading: boolean;
  error: string | null;
  setCurrentGroup: (group: Group | null) => void;
  fetchUserGroups: () => Promise<void>;
  clearGroupContext: () => void;
  updateGroupMembership: (membership: GroupMembership) => void;
  removeGroupMembership: (groupId: number) => void;
}

// Create the context with default values
const GroupContext = createContext<GroupContextType>({
  currentGroup: null,
  userGroups: [],
  loading: false,
  error: null,
  setCurrentGroup: () => {},
  fetchUserGroups: async () => {},
  clearGroupContext: () => {},
  updateGroupMembership: () => {},
  removeGroupMembership: () => {}
});

// Custom hook to use the group context
export const useGroupContext = () => {
  const context = useContext(GroupContext);
  if (!context) {
    throw new Error('useGroupContext must be used within a GroupProvider');
  }
  return context;
};

// Group provider component props
interface GroupProviderProps {
  children: ReactNode;
}

// Group provider component
export const GroupProvider: React.FC<GroupProviderProps> = ({ children }) => {
  const [currentGroup, setCurrentGroup] = useState<Group | null>(null);
  const [userGroups, setUserGroups] = useState<GroupMembership[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { isLoaded, userId } = useAuth();

  // Fetch user's groups from the backend
  const fetchUserGroups = useCallback(async () => {
    if (!isLoaded || !userId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/groups', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch user groups: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setUserGroups(data.items || []);
    } catch (err) {
      console.error('Error fetching user groups:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      
      // Log error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('GroupContext fetchUserGroups error details:', {
          error: err,
          userId,
          timestamp: new Date().toISOString()
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isLoaded, userId]);

  // Clear group context
  const clearGroupContext = () => {
    setCurrentGroup(null);
    setUserGroups([]);
    setError(null);
  };

  // Update a group membership
  const updateGroupMembership = (membership: GroupMembership) => {
    setUserGroups(prevGroups => {
      const existingIndex = prevGroups.findIndex(g => g.group_id === membership.group_id);
      if (existingIndex >= 0) {
        // Update existing membership
        const updatedGroups = [...prevGroups];
        updatedGroups[existingIndex] = membership;
        return updatedGroups;
      } else {
        // Add new membership
        return [...prevGroups, membership];
      }
    });
    
    // If this is the current group, update it
    if (currentGroup && currentGroup.id === membership.group_id) {
      // Fetch updated group details
      fetchGroupDetails(membership.group_id);
    }
  };

  // Remove a group membership
  const removeGroupMembership = (groupId: number) => {
    setUserGroups(prevGroups => prevGroups.filter(g => g.group_id !== groupId));
    
    // If this was the current group, clear it
    if (currentGroup && currentGroup.id === groupId) {
      setCurrentGroup(null);
    }
  };

  // Fetch group details
  const fetchGroupDetails = async (groupId: number) => {
    try {
      const response = await fetch(`/api/groups/${groupId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch group details: ${response.status} ${response.statusText}`);
      }

      const groupData = await response.json();
      setCurrentGroup(groupData);
    } catch (err) {
      console.error('Error fetching group details:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      
      // Log error for debugging
      if (process.env.NODE_ENV === 'development') {
        console.error('GroupContext fetchGroupDetails error details:', {
          error: err,
          groupId,
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  // Fetch user groups when auth state changes
  useEffect(() => {
    if (isLoaded && userId) {
      fetchUserGroups();
    }
  }, [isLoaded, userId, fetchUserGroups]);

  // Context value
  const contextValue: GroupContextType = {
    currentGroup,
    userGroups,
    loading,
    error,
    setCurrentGroup,
    fetchUserGroups,
    clearGroupContext,
    updateGroupMembership,
    removeGroupMembership
  };

  return (
    <GroupContext.Provider value={contextValue}>
      {children}
    </GroupContext.Provider>
  );
};

export default GroupContext;