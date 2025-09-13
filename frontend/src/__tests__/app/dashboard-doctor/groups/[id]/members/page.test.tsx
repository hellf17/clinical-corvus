import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GroupMembersPage from '@/app/dashboard-doctor/groups/[id]/members/page';

// Mock all child components to avoid complex dependencies
jest.mock('@/components/groups/MemberList', () => ({
  MemberList: () => <div data-testid="member-list">Member List</div>,
}));

jest.mock('@/components/groups/MemberInviteForm', () => ({
  MemberInviteForm: () => <div data-testid="member-invite-form">Member Invite Form</div>,
}));

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className} data-testid="card-content">{children}</div>,
  CardHeader: ({ children, className }: any) => <div className={className} data-testid="card-header">{children}</div>,
  CardTitle: ({ children, className }: any) => <div className={className} data-testid="card-title">{children}</div>,
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, className, variant }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      className={className} 
      data-testid="button"
      data-variant={variant}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/Spinner', () => ({
  Spinner: () => <div data-testid="spinner">Loading...</div>,
}));

jest.mock('@/components/ui/Alert', () => ({
  Alert: ({ children, variant }: any) => <div data-testid="alert" data-variant={variant}>{children}</div>,
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Users: () => <div data-testid="users-icon" />,
}));

// Mock Clerk hooks
jest.mock('@clerk/nextjs', () => ({
  useAuth: () => ({
    getToken: jest.fn(),
    userId: 'test-user-id',
  }),
}));

// Mock permissions utility
jest.mock('@/utils/groupPermissions', () => ({
  canUserInviteMembers: () => true,
}));

// Mock group service
jest.mock('@/services/groupService', () => ({
  listGroupMembers: jest.fn(),
}));

describe('Group Members Page', () => {
  const { listGroupMembers } = require('@/services/groupService');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Mock the service to not resolve immediately
    listGroupMembers.mockImplementation(() => new Promise(() => {}));
    
    render(<GroupMembersPage params={{ id: '1' }} />);
    
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders member list when data is loaded', async () => {
    // Mock the listGroupMembers service to resolve immediately
    listGroupMembers.mockResolvedValue({ items: [] });
    
    render(<GroupMembersPage params={{ id: '1' }} />);
    
    // Wait for the loading to finish and card to appear
    expect(await screen.findByText('Gerenciar Membros')).toBeInTheDocument();
    
    expect(screen.getByText('Gerenciar Membros')).toBeInTheDocument();
    expect(screen.getByText('Adicione ou remova membros do grupo')).toBeInTheDocument();
    expect(screen.getByTestId('member-list')).toBeInTheDocument();
  });

  it('shows error state when loading fails', async () => {
    // Mock the listGroupMembers service to reject
    listGroupMembers.mockRejectedValue(new Error('Failed to load'));
    
    render(<GroupMembersPage params={{ id: '1' }} />);
    
    // Wait for the error to appear
    expect(await screen.findByTestId('alert')).toBeInTheDocument();
    
    expect(screen.getByTestId('alert')).toBeInTheDocument();
    expect(screen.getByTestId('alert-description')).toHaveTextContent('Failed to load group members');
  });

  it('shows invite form when invite button is clicked', async () => {
    // Mock the listGroupMembers service to resolve immediately
    listGroupMembers.mockResolvedValue({ items: [] });
    
    render(<GroupMembersPage params={{ id: '1' }} />);
    
    // Wait for the loading to finish
    expect(await screen.findByText('Gerenciar Membros')).toBeInTheDocument();
    
    // Initially, the invite form should not be visible
    expect(screen.queryByTestId('member-invite-form')).not.toBeInTheDocument();
    
    // Click the invite button
    const inviteButton = screen.getByText('Convidar Membro');
    fireEvent.click(inviteButton);
    
    // The invite form should now be visible
    expect(await screen.findByTestId('member-invite-form')).toBeInTheDocument();
  });

  it('shows error message for invalid group ID', () => {
    render(<GroupMembersPage params={{ id: 'invalid' }} />);
    
    expect(screen.getByText('Grupo não encontrado.')).toBeInTheDocument();
  });
});