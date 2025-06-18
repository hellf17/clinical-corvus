import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Textarea } from '@/components/ui/Textarea';

describe('Textarea component', () => {
  it('renders basic textarea correctly', () => {
    render(<Textarea placeholder="Enter text here" />);
    
    const textarea = screen.getByPlaceholderText('Enter text here');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass('min-h-[80px]', 'w-full', 'rounded-md', 'border');
  });

  it('applies custom className', () => {
    render(<Textarea className="custom-class" data-testid="test-textarea" />);
    
    const textarea = screen.getByTestId('test-textarea');
    expect(textarea).toHaveClass('custom-class');
    // Should also keep default classes
    expect(textarea).toHaveClass('min-h-[80px]', 'rounded-md');
  });

  it('handles user input correctly', async () => {
    render(<Textarea data-testid="test-textarea" />);
    
    const textarea = screen.getByTestId('test-textarea');
    await userEvent.type(textarea, 'Hello world');
    
    expect(textarea).toHaveValue('Hello world');
  });

  it('forwards additional props to the textarea element', () => {
    render(
      <Textarea 
        name="description" 
        required
        disabled
        maxLength={200}
        data-testid="test-textarea"
      />
    );
    
    const textarea = screen.getByTestId('test-textarea');
    expect(textarea).toHaveAttribute('name', 'description');
    expect(textarea).toHaveAttribute('required');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveAttribute('maxlength', '200');
  });

  it('applies disabled styling', () => {
    render(<Textarea disabled data-testid="test-textarea" />);
    
    const textarea = screen.getByTestId('test-textarea');
    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
  });

  it('properly forwards ref to the textarea element', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} data-testid="test-textarea" />);
    
    expect(ref.current).not.toBeNull();
    expect(ref.current).toEqual(screen.getByTestId('test-textarea'));
  });
}); 