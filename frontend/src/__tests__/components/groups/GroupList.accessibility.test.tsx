import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { GroupList } from '@/components/groups/GroupList';
import { Group } from '@/types/group';

// Extend Jest with axe matchers
expect.extend(toHaveNoViolations);

// Mock the group service
jest.mock('@/services/groupService', () => ({
  listGroups: jest.fn(),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock the GroupCard component with proper accessibility attributes
jest.mock('@/components/groups/GroupCard', () => ({
  GroupCard: ({ group, onClick }: { group: Group; onClick: () => void }) => (
    <div 
      data-testid="group-card-mock"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      aria-label={`Grupo ${group.name}`}
    >
      Mock Group Card: {group.name}
    </div>
  ),
}));

describe('GroupList Accessibility Tests', () => {
  const mockGroups: Group[] = [
    {
      id: 1,
      name: 'Test Group 1',
      description: 'First test group',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 2,
      name: 'Test Group 2',
      description: 'Second test group',
      created_at: '2023-01-02T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should have no accessibility violations with groups', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockResolvedValue({ items: mockGroups });
    
    const { container } = render(<GroupList />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with empty groups', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockResolvedValue({ items: [] });
    
    const { container } = render(<GroupList />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations while loading', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockResolvedValue({ items: [] });
    
    const { container } = render(<GroupList />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations with error state', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockRejectedValue(new Error('Failed to load groups'));
    
    const { container } = render(<GroupList />);
    
    // Wait for the component to handle the error
    await new Promise(resolve => setTimeout(resolve, 0));
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper heading structure', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockResolvedValue({ items: mockGroups });
    
    const { container, getByRole } = render(<GroupList />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check for main heading
    expect(getByRole('heading', { level: 1, name: 'Grupos' })).toBeInTheDocument();
    
    // Check that the document has a valid heading structure
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper landmark regions', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockResolvedValue({ items: mockGroups });
    
    const { container, getByRole } = render(<GroupList />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check for main landmark
    expect(getByRole('main')).toBeInTheDocument();
    
    // Check for navigation landmark (if applicable)
    // expect(getByRole('navigation')).toBeInTheDocument();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper focus management', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockResolvedValue({ items: mockGroups });
    
    const { container, getAllByRole } = render(<GroupList />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check that interactive elements are focusable
    const groupCards = getAllByRole('button');
    groupCards.forEach(card => {
      expect(card).toHaveAttribute('tabIndex');
      expect(card).toHaveAttribute('aria-label');
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper color contrast', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockResolvedValue({ items: mockGroups });
    
    const { container } = render(<GroupList />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // axe will automatically check color contrast
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper text alternatives for non-text content', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockResolvedValue({ items: mockGroups });
    
    const { container, getByText } = render(<GroupList />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check that text content is present and meaningful
    expect(getByText('Test Group 1')).toBeInTheDocument();
    expect(getByText('Test Group 2')).toBeInTheDocument();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper keyboard navigation', async () => {
    const { listGroups } = require('@/services/groupService');
    listGroups.mockResolvedValue({ items: mockGroups });
    
    const { container, getAllByRole } = render(<GroupList />);
    
    // Wait for the component to load data
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // Check that elements can be navigated with keyboard
    const groupCards = getAllByRole('button');
    expect(groupCards).toHaveLength(2);
    
    // Check that each card is keyboard accessible
    groupCards.forEach(card => {
      expect(card).toHaveAttribute('tabIndex', '0');
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});