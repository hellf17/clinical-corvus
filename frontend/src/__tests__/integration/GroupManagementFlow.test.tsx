import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupManagementFlow } from '../test-wrappers/GroupManagementFlow';
import * as groupService from '@/services/groupService';
import * as groupInvitationService from '@/services/groupInvitationService';
import { Group, GroupCreate, GroupMembership, GroupPatient } from '@/types/group';
import { GroupInvitation } from '@/types/groupInvitation';

// Mock the services
jest.mock('@/services/groupService', () => ({
  createGroup: jest.fn(),
  listGroups: jest.fn(),
  getGroup: jest.fn(),
  updateGroup: jest.fn(),
  deleteGroup: jest.fn(),
  listGroupMembers: jest.fn(),
  assignPatientToGroup: jest.fn(),
  listGroupPatients: jest.fn(),
  removePatientFromGroup: jest.fn(),
  inviteUserToGroup: jest.fn(),
  removeUserFromGroup: jest.fn(),
}));

jest.mock('@/services/groupInvitationService', () => ({
  createGroupInvitation: jest.fn(),
  listGroupInvitations: jest.fn(),
  revokeGroupInvitation: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
  useParams: () => ({ id: '1' }),
}));

// Mock authentication
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: jest.fn().mockResolvedValue('mock-token'),
  }),
  useUser: () => ({
    user: { id: '1', emailAddresses: [{ emailAddress: 'admin@example.com' }] },
  }),
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Group Management Integration Flow', () => {
  const mockGroupData: GroupCreate = {
    name: 'Integration Test Group',
    description: 'A test group for integration testing',
    max_patients: 100,
    max_members: 10,
  };

  const mockCreatedGroup: Group = {
    id: 1,
    ...mockGroupData,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const mockMembership: GroupMembership = {
    id: 1,
    group_id: 1,
    user_id: 1,
    role: 'admin',
    joined_at: '2023-01-01T00:00:00Z',
  };

  const mockGroupPatient: GroupPatient = {
    id: 1,
    group_id: 1,
    patient_id: 1,
    assigned_at: '2023-01-01T00:00:00Z',
  };

  const mockInvitation: GroupInvitation = {
    id: 1,
    group_id: 1,
    email: 'invitee@example.com',
    role: 'member',
    expires_at: '2023-02-01T00:00:00Z',
    created_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock responses
    (groupService.listGroups as jest.Mock).mockResolvedValue({
      items: [mockCreatedGroup],
      total: 1,
    });
    (groupService.createGroup as jest.Mock).mockResolvedValue(mockCreatedGroup);
    (groupService.getGroup as jest.Mock).mockResolvedValue({
      ...mockCreatedGroup,
      members: [mockMembership],
      patients: [mockGroupPatient],
    });
    (groupService.listGroupMembers as jest.Mock).mockResolvedValue({
      items: [mockMembership],
      total: 1,
    });
    (groupService.listGroupPatients as jest.Mock).mockResolvedValue({
      items: [mockGroupPatient],
      total: 1,
    });
    (groupInvitationService.listGroupInvitations as jest.Mock).mockResolvedValue({
      items: [mockInvitation],
      total: 1,
    });
  });

  it('completes the full group creation and management workflow', async () => {
    const user = userEvent.setup();
    
    render(<GroupManagementFlow />);

    // STEP 1: Navigate to group creation
    const createGroupButton = await screen.findByRole('button', { name: /criar grupo/i });
    await user.click(createGroupButton);

    // STEP 2: Fill out group form
    const nameInput = await screen.findByLabelText(/nome do grupo/i);
    await user.type(nameInput, mockGroupData.name);

    const descriptionInput = screen.getByLabelText(/descrição/i);
    await user.type(descriptionInput, mockGroupData.description || '');

    // STEP 3: Submit form
    const submitButton = screen.getByRole('button', { name: /salvar grupo/i });
    await user.click(submitButton);

    // STEP 4: Verify group creation API call
    await waitFor(() => {
      expect(groupService.createGroup).toHaveBeenCalledWith(
        expect.objectContaining({
          name: mockGroupData.name,
          description: mockGroupData.description,
        })
      );
    });

    // STEP 5: Navigate to group list and verify new group appears
    const groupListButton = await screen.findByRole('button', { name: /lista de grupos/i });
    await user.click(groupListButton);

    await waitFor(() => {
      expect(screen.getByText(mockGroupData.name)).toBeInTheDocument();
    });

    // STEP 6: View group details
    const groupCard = screen.getByText(mockGroupData.name).closest('[role="button"]');
    if (groupCard) {
      await user.click(groupCard);
    }

    // STEP 7: Verify group details load
    await waitFor(() => {
      expect(groupService.getGroup).toHaveBeenCalledWith(1);
    });

    // STEP 8: Navigate to members tab
    const membersTab = await screen.findByRole('tab', { name: /membros/i });
    await user.click(membersTab);

    // STEP 9: Verify members are loaded
    await waitFor(() => {
      expect(groupService.listGroupMembers).toHaveBeenCalledWith(1);
    });
  });

  it('handles member invitation workflow', async () => {
    const user = userEvent.setup();
    
    render(<GroupManagementFlow initialGroupId="1" />);

    // Wait for group to load
    await waitFor(() => {
      expect(screen.getByText(mockGroupData.name)).toBeInTheDocument();
    });

    // Navigate to members tab
    const membersTab = await screen.findByRole('tab', { name: /membros/i });
    await user.click(membersTab);

    // Click invite member button
    const inviteButton = await screen.findByRole('button', { name: /convidar membro/i });
    await user.click(inviteButton);

    // Fill invitation form
    const emailInput = await screen.findByLabelText(/email/i);
    await user.type(emailInput, 'newmember@example.com');

    const roleSelect = screen.getByRole('combobox', { name: /função/i });
    await user.click(roleSelect);
    
    const memberOption = await screen.findByRole('option', { name: /membro/i });
    await user.click(memberOption);

    // Submit invitation
    const sendInviteButton = screen.getByRole('button', { name: /enviar convite/i });
    await user.click(sendInviteButton);

    // Verify invitation API call
    await waitFor(() => {
      expect(groupInvitationService.createGroupInvitation).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          email: 'newmember@example.com',
          role: 'member',
        })
      );
    });
  });

  it('handles patient assignment workflow', async () => {
    const user = userEvent.setup();
    
    render(<GroupManagementFlow initialGroupId="1" />);

    // Wait for group to load
    await waitFor(() => {
      expect(screen.getByText(mockGroupData.name)).toBeInTheDocument();
    });

    // Navigate to patients tab
    const patientsTab = await screen.findByRole('tab', { name: /pacientes/i });
    await user.click(patientsTab);

    // Click assign patient button
    const assignButton = await screen.findByRole('button', { name: /atribuir paciente/i });
    await user.click(assignButton);

    // Select patient from dropdown
    const patientSelect = screen.getByRole('combobox', { name: /paciente/i });
    await user.click(patientSelect);
    
    const patientOption = await screen.findByRole('option', { name: /patient 1/i });
    await user.click(patientOption);

    // Confirm assignment
    const confirmButton = screen.getByRole('button', { name: /atribuir/i });
    await user.click(confirmButton);

    // Verify assignment API call
    await waitFor(() => {
      expect(groupService.assignPatientToGroup).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          patient_id: 1,
        })
      );
    });
  });

  it('handles group update workflow', async () => {
    const user = userEvent.setup();
    const updatedGroup = {
      ...mockCreatedGroup,
      name: 'Updated Group Name',
      description: 'Updated description',
    };

    (groupService.updateGroup as jest.Mock).mockResolvedValue(updatedGroup);
    
    render(<GroupManagementFlow initialGroupId="1" />);

    // Wait for group to load
    await waitFor(() => {
      expect(screen.getByText(mockCreatedGroup.name)).toBeInTheDocument();
    });

    // Navigate to edit form
    const editButton = await screen.findByRole('button', { name: /editar grupo/i });
    await user.click(editButton);

    // Update group information
    const nameInput = screen.getByDisplayValue(mockCreatedGroup.name);
    await user.clear(nameInput);
    await user.type(nameInput, updatedGroup.name);

    const descriptionInput = screen.getByDisplayValue(mockCreatedGroup.description || '');
    await user.clear(descriptionInput);
    await user.type(descriptionInput, updatedGroup.description || '');

    // Submit update
    const saveButton = screen.getByRole('button', { name: /salvar alterações/i });
    await user.click(saveButton);

    // Verify update API call
    await waitFor(() => {
      expect(groupService.updateGroup).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: updatedGroup.name,
          description: updatedGroup.description,
        })
      );
    });
  });

  it('handles member removal workflow', async () => {
    const user = userEvent.setup();
    
    (groupService.removeUserFromGroup as jest.Mock).mockResolvedValue(undefined);
    
    render(<GroupManagementFlow initialGroupId="1" />);

    // Wait for group to load
    await waitFor(() => {
      expect(screen.getByText(mockCreatedGroup.name)).toBeInTheDocument();
    });

    // Navigate to members tab
    const membersTab = await screen.findByRole('tab', { name: /membros/i });
    await user.click(membersTab);

    // Mock confirmation dialog
    window.confirm = jest.fn(() => true);

    // Remove member
    const removeButton = await screen.findByRole('button', { name: /remover/i });
    await user.click(removeButton);

    // Verify removal API call
    await waitFor(() => {
      expect(groupService.removeUserFromGroup).toHaveBeenCalledWith(1, mockMembership.user_id);
    });

    expect(window.confirm).toHaveBeenCalledWith(
      'Tem certeza que deseja remover este membro do grupo?'
    );
  });

  it('handles patient removal from group', async () => {
    const user = userEvent.setup();
    
    (groupService.removePatientFromGroup as jest.Mock).mockResolvedValue(undefined);
    
    render(<GroupManagementFlow initialGroupId="1" />);

    // Navigate to patients tab
    const patientsTab = await screen.findByRole('tab', { name: /pacientes/i });
    await user.click(patientsTab);

    // Mock confirmation dialog
    window.confirm = jest.fn(() => true);

    // Remove patient
    const removeButton = await screen.findByRole('button', { name: /remover paciente/i });
    await user.click(removeButton);

    // Verify removal API call
    await waitFor(() => {
      expect(groupService.removePatientFromGroup).toHaveBeenCalledWith(1, mockGroupPatient.patient_id);
    });
  });

  it('handles invitation revocation', async () => {
    const user = userEvent.setup();
    
    (groupInvitationService.revokeGroupInvitation as jest.Mock).mockResolvedValue(undefined);
    
    render(<GroupManagementFlow initialGroupId="1" />);

    // Navigate to invitations section
    const invitationsButton = await screen.findByRole('button', { name: /convites/i });
    await user.click(invitationsButton);

    // Mock confirmation dialog
    window.confirm = jest.fn(() => true);

    // Revoke invitation
    const revokeButton = await screen.findByRole('button', { name: /revogar/i });
    await user.click(revokeButton);

    // Verify revocation API call
    await waitFor(() => {
      expect(groupInvitationService.revokeGroupInvitation).toHaveBeenCalledWith(1, mockInvitation.id);
    });
  });

  it('handles error states appropriately', async () => {
    // Mock API failure
    (groupService.createGroup as jest.Mock).mockRejectedValue(
      new Error('Failed to create group')
    );

    const user = userEvent.setup();
    
    render(<GroupManagementFlow />);

    // Fill out and submit form
    const createGroupButton = await screen.findByRole('button', { name: /criar grupo/i });
    await user.click(createGroupButton);

    const nameInput = await screen.findByLabelText(/nome do grupo/i);
    await user.type(nameInput, 'Test Group');

    const submitButton = screen.getByRole('button', { name: /salvar grupo/i });
    await user.click(submitButton);

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/erro ao criar grupo/i)).toBeInTheDocument();
    });
  });

  it('validates group form inputs correctly', async () => {
    const user = userEvent.setup();
    
    render(<GroupManagementFlow />);

    const createGroupButton = await screen.findByRole('button', { name: /criar grupo/i });
    await user.click(createGroupButton);

    // Try to submit empty form
    const submitButton = screen.getByRole('button', { name: /salvar grupo/i });
    await user.click(submitButton);

    // Verify validation errors
    await waitFor(() => {
      expect(screen.getByText(/nome do grupo é obrigatório/i)).toBeInTheDocument();
    });

    // Verify API is not called with invalid data
    expect(groupService.createGroup).not.toHaveBeenCalled();
  });

  it('handles group permissions correctly', async () => {
    const memberUser = {
      id: '2',
      emailAddresses: [{ emailAddress: 'member@example.com' }],
    };

    // Mock as regular member instead of admin
    require('@clerk/nextjs').useUser.mockReturnValue({
      user: memberUser,
    });

    const memberMembership = {
      ...mockMembership,
      user_id: 2,
      role: 'member',
    };

    (groupService.listGroupMembers as jest.Mock).mockResolvedValue({
      items: [memberMembership],
      total: 1,
    });

    render(<GroupManagementFlow initialGroupId="1" />);

    // Wait for group to load
    await waitFor(() => {
      expect(screen.getByText(mockCreatedGroup.name)).toBeInTheDocument();
    });

    // Verify that edit and admin actions are not available
    expect(screen.queryByRole('button', { name: /editar grupo/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /convidar membro/i })).not.toBeInTheDocument();
  });
});