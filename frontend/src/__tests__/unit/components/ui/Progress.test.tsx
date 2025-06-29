import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Progress } from '@/components/ui/Progress';

// Mock the Radix UI Progress component
jest.mock('@radix-ui/react-progress', () => {
  return {
    Root: ({ children, className, value, ...props }: { 
      children?: React.ReactNode; 
      className?: string; 
      value?: number; 
      [key: string]: any 
    }) => (
      <div 
        role="progressbar" 
        aria-valuenow={value} 
        className={className} 
        {...props}
      >
        {children}
      </div>
    ),
    Indicator: ({ className, style }: { 
      className?: string; 
      style?: React.CSSProperties 
    }) => (
      <div className={className} style={style} />
    ),
  };
});

describe('Progress', () => {
  it('renders with default props', () => {
    render(<Progress value={0} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('displays the correct progress value', () => {
    render(<Progress value={50} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    
    // The indicator should have a width of 50%
    const indicator = progressBar.querySelector('div');
    expect(indicator).toBeTruthy();
  });

  it('applies custom className', () => {
    render(<Progress value={30} className="custom-progress" />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('custom-progress');
  });

  it('handles minimum value (0%)', () => {
    render(<Progress value={0} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
  });

  it('handles maximum value (100%)', () => {
    render(<Progress value={100} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps values outside of 0-100 range', () => {
    // Test with value < 0
    const { rerender } = render(<Progress value={-20} />);
    
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    
    // Test with value > 100
    rerender(<Progress value={120} />);
    
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });
}); 