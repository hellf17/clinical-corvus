import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Badge } from '@/components/ui/Badge';

describe('Badge component', () => {
  it('renders with default variant correctly', () => {
    render(<Badge data-testid="test-badge">Test Badge</Badge>);
    
    const badge = screen.getByTestId('test-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-primary', 'text-primary-foreground');
    expect(badge).toHaveTextContent('Test Badge');
  });

  it('renders with secondary variant correctly', () => {
    render(<Badge data-testid="test-badge" variant="secondary">Secondary Badge</Badge>);
    
    const badge = screen.getByTestId('test-badge');
    expect(badge).toHaveClass('bg-secondary', 'text-secondary-foreground');
  });

  it('renders with destructive variant correctly', () => {
    render(<Badge data-testid="test-badge" variant="destructive">Destructive Badge</Badge>);
    
    const badge = screen.getByTestId('test-badge');
    expect(badge).toHaveClass('bg-destructive', 'text-destructive-foreground');
  });

  it('renders with outline variant correctly', () => {
    render(<Badge data-testid="test-badge" variant="outline">Outline Badge</Badge>);
    
    const badge = screen.getByTestId('test-badge');
    expect(badge).toHaveClass('text-foreground', 'border', 'border-input');
  });

  it('applies custom className', () => {
    render(<Badge data-testid="test-badge" className="custom-badge">Custom Badge</Badge>);
    
    const badge = screen.getByTestId('test-badge');
    expect(badge).toHaveClass('custom-badge');
    // Should also keep default classes
    expect(badge).toHaveClass('bg-primary', 'text-primary-foreground');
  });

  it('passes additional props to the component', () => {
    render(
      <Badge 
        data-testid="test-badge" 
        aria-label="badge label"
        role="status"
        id="custom-id"
      >
        Props Badge
      </Badge>
    );
    
    const badge = screen.getByTestId('test-badge');
    expect(badge).toHaveAttribute('aria-label', 'badge label');
    expect(badge).toHaveAttribute('role', 'status');
    expect(badge).toHaveAttribute('id', 'custom-id');
  });
}); 