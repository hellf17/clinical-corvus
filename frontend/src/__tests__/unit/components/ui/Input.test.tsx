import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Input } from '@/components/ui/Input';

describe('Input component', () => {
  it('renders basic input correctly', () => {
    render(<Input placeholder="Type here" />);
    const input = screen.getByPlaceholderText('Type here');
    
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('px-3', 'py-2', 'border', 'rounded-md');
  });

  it('renders with label when provided', () => {
    render(<Input id="name" label="Name" />);
    
    const label = screen.getByText('Name');
    expect(label).toBeInTheDocument();
    expect(label).toHaveClass('text-sm', 'font-medium');
    expect(label).toHaveAttribute('for', 'name');
  });

  it('shows error message when error prop is provided', () => {
    const errorMessage = 'This field is required';
    render(<Input error={errorMessage} />);
    
    const error = screen.getByText(errorMessage);
    expect(error).toBeInTheDocument();
    expect(error).toHaveClass('text-red-500');
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('border-red-500');
  });

  it('applies full width when fullWidth prop is true', () => {
    render(<Input fullWidth />);
    
    const container = screen.getByRole('textbox').parentElement;
    expect(container).toHaveClass('w-full');
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('w-full');
  });

  it('forwards additional props to the input element', () => {
    render(
      <Input 
        type="email" 
        name="email" 
        required
        disabled
        maxLength={50} 
      />
    );
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toHaveAttribute('required');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('maxlength', '50');
  });

  it('applies custom className', () => {
    render(<Input className="custom-class" />);
    
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('custom-class');
    // Should also keep default classes
    expect(input).toHaveClass('px-3', 'py-2');
  });

  it('handles user input correctly', async () => {
    render(<Input />);
    
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'Hello world');
    
    expect(input).toHaveValue('Hello world');
  });
}); 