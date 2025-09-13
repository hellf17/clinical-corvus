import React from 'react';
import { render } from '@testing-library/react';
import { GroupForm } from '@/components/groups/GroupForm';
import { Group } from '@/types/group';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('GroupForm Snapshot Tests', () => {
  const mockGroup: Group = {
    id: 1,
    name: 'Test Group',
    description: 'Test group description',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('matches snapshot for create form', () => {
    const { asFragment } = render(<GroupForm />);
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot for edit form', () => {
    const { asFragment } = render(<GroupForm group={mockGroup} />);
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with custom submit text', () => {
    const { asFragment } = render(<GroupForm submitText="Custom Submit" />);
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with custom cancel text', () => {
    const { asFragment } = render(<GroupForm cancelText="Custom Cancel" />);
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with all custom texts', () => {
    const { asFragment } = render(
      <GroupForm 
        submitText="Save Changes" 
        cancelText="Discard Changes" 
      />
    );
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with error state', () => {
    const { asFragment } = render(<GroupForm initialError="This is an error message" />);
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with loading state', () => {
    const { asFragment } = render(<GroupForm isLoading={true} />);
    
    expect(asFragment()).toMatchSnapshot();
  });

  it('matches snapshot with success state', () => {
    const { asFragment } = render(<GroupForm isSuccess={true} successMessage="Operation successful!" />);
    
    expect(asFragment()).toMatchSnapshot();
  });
});