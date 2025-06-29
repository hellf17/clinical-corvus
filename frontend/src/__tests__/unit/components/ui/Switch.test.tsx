import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Switch } from '@/components/ui/Switch';

// Mock Radix UI Switch primitive
jest.mock('@radix-ui/react-switch', () => {
  const MockRadixSwitchRoot = React.forwardRef(({ checked, onCheckedChange, disabled, className, ...props }: any, ref: any) => (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      className={className}
      onClick={() => onCheckedChange?.(!checked)}
      ref={ref}
      data-state={checked ? 'checked' : 'unchecked'}
      {...props}
    />
  ));
  MockRadixSwitchRoot.displayName = 'MockRadixSwitchRoot';

  const MockRadixSwitchThumb = React.forwardRef(({ className, ...props }: any, ref: any) => (
    <span className={className} ref={ref} {...props} />
  ));
  MockRadixSwitchThumb.displayName = 'MockRadixSwitchThumb';

  return {
    Root: MockRadixSwitchRoot,
    Thumb: MockRadixSwitchThumb
  };
});

describe('Switch component', () => {
  it('renders in unchecked state by default', () => {
    render(<Switch data-testid="test-switch" />);
    
    const switchElement = screen.getByTestId('test-switch');
    expect(switchElement).toBeInTheDocument();
    // Instead of checking for aria-checked, check for data-state attribute
    expect(switchElement).toHaveAttribute('data-state', 'unchecked');
    expect(switchElement).not.toBeDisabled();
  });

  it('renders in checked state when checked prop is true', () => {
    render(<Switch checked={true} data-testid="test-switch" />);
    
    const switchElement = screen.getByTestId('test-switch');
    expect(switchElement).toHaveAttribute('aria-checked', 'true');
    expect(switchElement).toHaveAttribute('data-state', 'checked');
  });

  it('renders in disabled state when disabled prop is true', () => {
    render(<Switch disabled data-testid="test-switch" />);
    
    const switchElement = screen.getByTestId('test-switch');
    expect(switchElement).toBeDisabled();
  });

  it('applies custom className', () => {
    render(<Switch className="custom-switch" data-testid="test-switch" />);
    
    const switchElement = screen.getByTestId('test-switch');
    expect(switchElement).toHaveClass('custom-switch');
  });

  it('calls onCheckedChange when clicked', () => {
    const handleChange = jest.fn();
    render(<Switch onCheckedChange={handleChange} data-testid="test-switch" />);
    
    const switchElement = screen.getByTestId('test-switch');
    fireEvent.click(switchElement);
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('does not call onCheckedChange when disabled', () => {
    const handleChange = jest.fn();
    render(
      <Switch 
        onCheckedChange={handleChange} 
        disabled 
        data-testid="test-switch" 
      />
    );
    
    const switchElement = screen.getByTestId('test-switch');
    fireEvent.click(switchElement);
    
    expect(handleChange).not.toHaveBeenCalled();
  });

  it('properly forwards ref to the switch element', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Switch ref={ref} data-testid="test-switch" />);
    
    expect(ref.current).not.toBeNull();
    expect(ref.current).toEqual(screen.getByTestId('test-switch'));
  });
}); 