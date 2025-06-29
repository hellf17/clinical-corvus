import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button } from '@/components/ui/Button';

// Mock next/link
jest.mock('next/link', () => {
  const MockNextLink = ({ href, children, className }: { href: string; children: React.ReactNode; className: string }) => {
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };
  MockNextLink.displayName = 'MockNextLink';
  return MockNextLink;
});

// Mock the Slot component from Radix UI
jest.mock('@radix-ui/react-slot', () => ({
  Slot: ({ children, className, ...props }: { children: React.ReactNode, className?: string }) => {
    // Pass the className prop through to make the test work correctly
    return (
      <div data-testid="slot-wrapper" className={className} {...props}>
        {children}
      </div>
    );
  }
}));

describe('Button', () => {
  it('renders a button with default styling', () => {
    render(<Button>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary');
    expect(button).not.toHaveAttribute('href');
  });

  it('renders different variants', () => {
    const { rerender } = render(<Button variant="destructive">Destructive</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
    
    rerender(<Button variant="outline">Outline</Button>);
    expect(screen.getByRole('button')).toHaveClass('border-input');
    
    rerender(<Button variant="secondary">Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-secondary');
    
    rerender(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('hover:bg-accent');
    
    rerender(<Button variant="link">Link</Button>);
    expect(screen.getByRole('button')).toHaveClass('text-primary');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-9');
    
    rerender(<Button size="default">Default</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-10');
    
    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('h-11');
    
    rerender(<Button size="icon">Icon</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-10');
  });

  it('renders as a link when href is provided', () => {
    render(<Button href="/dashboard">Go to Dashboard</Button>);
    
    const link = screen.getByRole('link', { name: /go to dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard');
    expect(link).toHaveClass('bg-primary');
  });

  it('applies custom class name', () => {
    render(<Button className="custom-class">Custom</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('bg-primary'); // Should still have default classes
  });

  it('passes and handles onClick events', () => {
    const handleClick = jest.fn();
    
    render(<Button onClick={handleClick}>Click me</Button>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('can be disabled', () => {
    const handleClick = jest.fn();
    
    render(<Button disabled onClick={handleClick}>Disabled</Button>);
    
    const button = screen.getByRole('button', { name: /disabled/i });
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders with correct type attribute', () => {
    const { rerender } = render(<Button type="submit">Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    
    rerender(<Button type="button">Button</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    
    rerender(<Button type="reset">Reset</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
  });

  it('applies button styles when asChild is true', () => {
    render(
      <Button asChild>
        <span>Child Component</span>
      </Button>
    );
    
    // With our simplified mock, we expect a div with the slot-wrapper testid
    const wrapper = screen.getByTestId('slot-wrapper');
    expect(wrapper).toBeInTheDocument();
    // Instead of checking for 'slot-wrapper' class, check for the button's default classes
    expect(wrapper).toHaveClass('bg-primary');
    expect(wrapper).toHaveClass('text-primary-foreground');
    expect(screen.getByText('Child Component')).toBeInTheDocument();
  });
}); 