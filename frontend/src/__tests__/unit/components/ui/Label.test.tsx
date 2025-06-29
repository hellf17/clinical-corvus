import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Label } from '@/components/ui/Label';

// Mock Radix UI Label primitive
jest.mock('@radix-ui/react-label', () => {
  const MockRadixLabel = React.forwardRef((props: any, ref: any) => (
      <label {...props} ref={ref} />
  ));
  MockRadixLabel.displayName = 'MockRadixLabel';
  return {
    Root: MockRadixLabel
  };
});

describe('Label component', () => {
  it('renders with text content correctly', () => {
    render(<Label htmlFor="test-input">Username</Label>);
    
    const label = screen.getByText('Username');
    expect(label).toBeInTheDocument();
    expect(label).toHaveAttribute('for', 'test-input');
    expect(label).toHaveClass('text-sm', 'font-medium');
  });

  it('applies custom className', () => {
    render(<Label className="custom-label" data-testid="test-label">Email</Label>);
    
    const label = screen.getByTestId('test-label');
    expect(label).toHaveClass('custom-label');
    // Should also keep default classes
    expect(label).toHaveClass('text-sm', 'font-medium');
  });

  it('forwards additional props to the label element', () => {
    render(
      <Label 
        htmlFor="test-input"
        data-testid="test-label"
        id="custom-id"
        aria-label="input label"
      >
        Password
      </Label>
    );
    
    const label = screen.getByTestId('test-label');
    expect(label).toHaveAttribute('for', 'test-input');
    expect(label).toHaveAttribute('id', 'custom-id');
    expect(label).toHaveAttribute('aria-label', 'input label');
  });

  it('properly forwards ref to the label element', () => {
    const ref = React.createRef<HTMLLabelElement>();
    render(<Label ref={ref} data-testid="test-label">Test Label</Label>);
    
    expect(ref.current).not.toBeNull();
    expect(ref.current).toEqual(screen.getByTestId('test-label'));
  });

  it('works with form elements', () => {
    render(
      <div>
        <Label htmlFor="test-input">Test Input</Label>
        <input id="test-input" data-testid="test-input" />
      </div>
    );
    
    const label = screen.getByText('Test Input');
    const input = screen.getByTestId('test-input');
    
    expect(label).toHaveAttribute('for', 'test-input');
    expect(input).toHaveAttribute('id', 'test-input');
  });
}); 