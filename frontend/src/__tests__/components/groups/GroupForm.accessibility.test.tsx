import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { GroupForm } from '@/components/groups/GroupForm';
import { Group } from '@/types/group';

// Extend Jest with axe matchers
expect.extend(toHaveNoViolations);

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('GroupForm Accessibility Tests', () => {
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

  it('should have no accessibility violations for create form', async () => {
    const { container } = render(<GroupForm />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have no accessibility violations for edit form', async () => {
    const { container } = render(<GroupForm group={mockGroup} />);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper form structure', async () => {
    const { container, getByRole } = render(<GroupForm />);
    
    // Check for form element
    const form = getByRole('form');
    expect(form).toBeInTheDocument();
    
    // Check for form fields with proper labels
    expect(getByRole('textbox', { name: 'Nome do Grupo *' })).toBeInTheDocument();
    expect(getByRole('textbox', { name: 'Descrição' })).toBeInTheDocument();
    expect(getByRole('spinbutton', { name: 'Máximo de Pacientes' })).toBeInTheDocument();
    expect(getByRole('spinbutton', { name: 'Máximo de Membros' })).toBeInTheDocument();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper button accessibility', async () => {
    const { container, getByRole } = render(<GroupForm />);
    
    // Check for submit button
    const submitButton = getByRole('button', { name: 'Criar Grupo' });
    expect(submitButton).toBeInTheDocument();
    expect(submitButton).toHaveAttribute('type', 'submit');
    
    // Check for cancel button
    const cancelButton = getByRole('button', { name: 'Cancelar' });
    expect(cancelButton).toBeInTheDocument();
    expect(cancelButton).toHaveAttribute('type', 'button');
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper error handling accessibility', async () => {
    const { container, getByText } = render(<GroupForm initialError="This is an error message" />);
    
    // Check for error message
    const errorMessage = getByText('This is an error message');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveAttribute('role', 'alert');
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper loading state accessibility', async () => {
    const { container, getByRole } = render(<GroupForm isLoading={true} />);
    
    // Check for loading indicator
    const loadingIndicator = getByRole('status');
    expect(loadingIndicator).toBeInTheDocument();
    expect(loadingIndicator).toHaveAttribute('aria-label', 'Carregando');
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper success state accessibility', async () => {
    const { container, getByText } = render(<GroupForm isSuccess={true} successMessage="Operation successful!" />);
    
    // Check for success message
    const successMessage = getByText('Operation successful!');
    expect(successMessage).toBeInTheDocument();
    expect(successMessage).toHaveAttribute('role', 'status');
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper focus management', async () => {
    const { container, getByRole } = render(<GroupForm />);
    
    // Check that form fields are focusable
    const nameInput = getByRole('textbox', { name: 'Nome do Grupo *' });
    expect(nameInput).toHaveAttribute('tabIndex', '0');
    
    const descriptionInput = getByRole('textbox', { name: 'Descrição' });
    expect(descriptionInput).toHaveAttribute('tabIndex', '0');
    
    // Check that buttons are focusable
    const submitButton = getByRole('button', { name: 'Criar Grupo' });
    expect(submitButton).toHaveAttribute('tabIndex', '0');
    
    const cancelButton = getByRole('button', { name: 'Cancelar' });
    expect(cancelButton).toHaveAttribute('tabIndex', '0');
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper keyboard navigation', async () => {
    const { container } = render(<GroupForm />);
    
    // Check that elements can be navigated with keyboard
    const focusableElements = container.querySelectorAll('button, input, textarea, [tabindex]:not([tabindex="-1"])');
    
    focusableElements.forEach(element => {
      // Check that focusable elements have proper attributes
      expect(element).toHaveAttribute('tabIndex');
    });
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper form field labeling', async () => {
    const { container, getByLabelText } = render(<GroupForm />);
    
    // Check that all form fields have proper labels
    expect(getByLabelText('Nome do Grupo *')).toBeInTheDocument();
    expect(getByLabelText('Descrição')).toBeInTheDocument();
    expect(getByLabelText('Máximo de Pacientes')).toBeInTheDocument();
    expect(getByLabelText('Máximo de Membros')).toBeInTheDocument();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper required field indicators', async () => {
    const { container, getByLabelText } = render(<GroupForm />);
    
    // Check that required fields are properly indicated
    const nameLabel = getByLabelText('Nome do Grupo *');
    expect(nameLabel).toBeInTheDocument();
    expect(nameLabel).toHaveAttribute('required');
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper input field accessibility', async () => {
    const { container, getByRole } = render(<GroupForm group={mockGroup} />);
    
    // Check text input fields
    const nameInput = getByRole('textbox', { name: 'Nome do Grupo *' });
    expect(nameInput).toHaveAttribute('type', 'text');
    expect(nameInput).toHaveValue('Test Group');
    
    const descriptionInput = getByRole('textbox', { name: 'Descrição' });
    expect(descriptionInput).toHaveAttribute('type', 'text');
    expect(descriptionInput).toHaveValue('Test group description');
    
    // Check number input fields
    const patientsInput = getByRole('spinbutton', { name: 'Máximo de Pacientes' });
    expect(patientsInput).toHaveAttribute('type', 'number');
    expect(patientsInput).toHaveValue(100); // Default value
    
    const membersInput = getByRole('spinbutton', { name: 'Máximo de Membros' });
    expect(membersInput).toHaveAttribute('type', 'number');
    expect(membersInput).toHaveValue(10); // Default value
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should maintain accessibility during form submission', async () => {
    const mockOnSuccess = jest.fn();
    const { container, getByRole } = render(<GroupForm onSuccess={mockOnSuccess} />);
    
    // Fill in form fields
    const nameInput = getByRole('textbox', { name: 'Nome do Grupo *' });
    fireEvent.change(nameInput, { target: { value: 'New Test Group' } });
    
    // Submit form
    const submitButton = getByRole('button', { name: 'Criar Grupo' });
    fireEvent.click(submitButton);
    
    // Check that form maintains accessibility during submission
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper color contrast', async () => {
    const { container } = render(<GroupForm />);
    
    // axe will automatically check color contrast
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper text alternatives', async () => {
    const { container, getByText } = render(<GroupForm />);
    
    // Check that text content is present and meaningful
    expect(getByText('Nome do Grupo')).toBeInTheDocument();
    expect(getByText('Descrição')).toBeInTheDocument();
    expect(getByText('Máximo de Pacientes')).toBeInTheDocument();
    expect(getByText('Máximo de Membros')).toBeInTheDocument();
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});