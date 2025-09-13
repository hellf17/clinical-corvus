import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GroupsPage from '@/app/dashboard-doctor/groups/page';

// Mock all child components to avoid complex dependencies
jest.mock('@/components/groups/GroupList', () => ({
  GroupList: ({ selectedGroupId, onGroupSelect, onCreateGroup }: any) => (
    <div data-testid="group-list">
      <button onClick={() => onGroupSelect && onGroupSelect('1')}>Select Group 1</button>
      <button onClick={() => onCreateGroup && onCreateGroup()}>Create Group</button>
    </div>
  ),
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

jest.mock('@/components/ui/Dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
}));

jest.mock('@/components/groups/GroupForm', () => ({
  GroupForm: () => <div data-testid="group-form">Group Form</div>,
}));

// Mock icons
jest.mock('lucide-react', () => ({
  Users: () => <div data-testid="users-icon" />,
  UserPlus: () => <div data-testid="user-plus-icon" />,
  FileText: () => <div data-testid="file-text-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Plus: () => <div data-testid="plus-icon" />,
}));

describe('Groups Page', () => {
  it('renders without crashing', () => {
    render(<GroupsPage />);
    
    expect(screen.getByText('Ações Rápidas')).toBeInTheDocument();
    expect(screen.getByText('Dicas de Uso')).toBeInTheDocument();
  });

  it('renders group list component', () => {
    render(<GroupsPage />);
    
    expect(screen.getByTestId('group-list')).toBeInTheDocument();
  });

  it('opens create group modal when create button is clicked', () => {
    render(<GroupsPage />);
    
    // Initially, the dialog should not be visible
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
    
    // Click the create group button in the group list
    const createButton = screen.getByText('Create Group');
    fireEvent.click(createButton);
    
    // The dialog should now be visible
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('dialog-title')).toHaveTextContent('Criar Novo Grupo');
  });

  it('selects a group and enables quick actions', () => {
    render(<GroupsPage />);
    
    // Initially, there should be two elements with the disabled text
    const disabledTextElements = screen.getAllByText('Selecione um grupo primeiro');
    expect(disabledTextElements).toHaveLength(2);
    
    // Select a group
    const selectButton = screen.getByText('Select Group 1');
    fireEvent.click(selectButton);
    
    // After selecting a group, the disabled text should no longer be present
    expect(screen.queryByText('Selecione um grupo primeiro')).not.toBeInTheDocument();
    
    // Instead, we should see the enabled text
    expect(screen.getByText('Adicionar ou remover membros')).toBeInTheDocument();
    expect(screen.getByText('Associar pacientes aos grupos')).toBeInTheDocument();
  });
});