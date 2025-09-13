import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { GroupDetail } from '@/components/groups/GroupDetail';
import { GroupWithMembersAndPatients } from '@/types/group';

// Extend Jest with axe matchers
expect.extend(toHaveNoViolations);

// Mock the group service
jest.mock('@/services/groupService', () => ({
  getGroup: jest.fn(),
}));

// Mock child components with proper accessibility attributes
jest.mock('@/components/groups/MemberList', () => ({
  MemberList: () => (
    <div 
      role="region" 
      aria-labelledby="members-heading"
      data-testid="member-list-mock"
    >
      <h2 id="members-heading">Membros</h2>
      <p>Mock Member List Content</p>
    </div>
  ),
}));

jest.mock('@/components/groups/PatientAssignmentList', () => ({
  PatientAssignmentList: () => (
    <div 
      role="region" 
      aria-labelledby="patients-heading"
      data-testid="patient-list-mock"
    >
      <h2 id="patients-heading">Pacientes</h2>
      <p>Mock Patient List Content</p>
    </div>
  ),
}));

jest.mock('@/components/groups/InvitationList', () => ({
  InvitationList: () => (
    <div 
      role="region" 
      aria-labelledby="invitations-heading"
      data-testid="invitation-list-mock"
    >
      <h2 id="invitations-heading">Convites</h2>
      <p>Mock Invitation List Content</p>
    </div>
  ),
}));

describe('GroupDetail Accessibility Tests', () => {
  const mockGroup: GroupWithMembersAndPatients = {
    id: 1,
    name: 'Test Group',
    description: 'Test group description',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    members: [
      {
        id: 1,
        group_id: 1,
        user_id: 1,
        role: 'admin',
        joined_at: '2023-01-01T00:00:00Z',
      },
    ],
    patients: [
      {
        id: 1,
        group_id: 1,
        patient_id: 1,
        assigned_at: '2023-01-01T00:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have no accessibility violations with group details', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(mockGroup);
    
    const { container } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations while loading', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(mockGroup);
    
    const { container } = render(<GroupDetail groupId={1} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with error state', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockRejectedValue(new Error('Failed to load group'));
    
    const { container } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to handle the error
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading structure', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(mockGroup);
    
    const { container, getByRole } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check for main heading
    expect(getByRole('heading', { level: 1, name: 'Test Group' })).toBeInTheDocument();
    
    // Check for section headings
    expect(getByRole('heading', { level: 2, name: 'Membros' })).toBeInTheDocument();
    expect(getByRole('heading', { level: 2, name: 'Pacientes' })).toBeInTheDocument();
    expect(getByRole('heading', { level: 2, name: 'Convites' })).toBeInTheDocument();
    
    // Check that the document has a valid heading structure
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper landmark regions', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(mockGroup);
    
    const { container, getByRole } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check for main landmark
    expect(getByRole('main')).toBeInTheDocument();
    
    // Check for region landmarks
    expect(getByRole('region', { name: 'Membros' })).toBeInTheDocument();
    expect(getByRole('region', { name: 'Pacientes' })).toBeInTheDocument();
    expect(getByRole('region', { name: 'Convites' })).toBeInTheDocument();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper tab navigation', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(mockGroup);
    
    const { container, getByRole } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check for tablist role
    const tablist = getByRole('tablist');
    expect(tablist).toBeInTheDocument();
    
    // Check for tab roles
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs).toHaveLength(3); // Members, Patients, Invitations
    
    // Check that tabs are keyboard accessible
    tabs.forEach(tab => {
      expect(tab).toHaveAttribute('tabIndex');
      expect(tab).toHaveAttribute('aria-selected');
      expect(tab).toHaveAttribute('aria-controls');
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper focus management', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(mockGroup);
    
    const { container, getByRole } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check that interactive elements are focusable
    const tabButtons = container.querySelectorAll('[role="tab"]');
    tabButtons.forEach(button => {
      expect(button).toHaveAttribute('tabIndex');
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper color contrast', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(mockGroup);
    
    const { container } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // axe will automatically check color contrast
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper text alternatives for non-text content', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(mockGroup);
    
    const { container, getByText } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check that text content is present and meaningful
    expect(getByText('Test Group')).toBeInTheDocument();
    expect(getByText('Test group description')).toBeInTheDocument();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper keyboard navigation', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(mockGroup);
    
    const { container } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check that elements can be navigated with keyboard
    const focusableElements = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    
    focusableElements.forEach(element => {
      // Check that focusable elements have proper attributes
      expect(element).not.toHaveAttribute('disabled');
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should maintain accessibility when switching tabs', async () => {
    const { getGroup } = require('@/services/groupService');
    getGroup.mockResolvedValue(mockGroup);
    
    const { container, getByRole } = render(<GroupDetail groupId={1} />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Simulate tab switching
    const membersTab = getByRole('tab', { name: 'Membros' });
    membersTab.click();
    
    // Check that the correct panel is shown
    expect(getByRole('region', { name: 'Membros' })).toBeVisible();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});