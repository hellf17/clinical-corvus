import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  Tooltip, 
  TooltipTrigger, 
  TooltipContent, 
  TooltipProvider 
} from '@/components/ui/Tooltip';
import { renderWithUIProviders } from '@/__tests__/utils/test-wrappers';

// Mock Radix UI tooltip components
jest.mock('@radix-ui/react-tooltip', () => ({
  Root: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-root" {...props}>
      {children}
    </div>
  ),
  Trigger: ({ children, asChild, ...props }: { children: React.ReactNode; asChild?: boolean; disabled?: boolean }) => (
    <button data-testid="tooltip-trigger" disabled={props.disabled} {...props}>
      {children}
    </button>
  ),
  Content: ({ children, className, sideOffset, ...props }: { children: React.ReactNode; className?: string; sideOffset?: number }) => {
    // Don't pass sideOffset to the DOM element to avoid the React warning
    return (
      <div data-testid="tooltip-content" className={className} {...props}>
        {children}
      </div>
    );
  },
  Portal: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-portal" {...props}>
      {children}
    </div>
  ),
  Provider: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-provider" {...props}>
      {children}
    </div>
  ),
}));

describe('Tooltip', () => {
  it('renders with basic content', () => {
    renderWithUIProviders(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover Me</TooltipTrigger>
          <TooltipContent>Tooltip Content</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    
    // Trigger should be rendered
    const trigger = screen.getByText('Hover Me');
    expect(trigger).toBeInTheDocument();
    
    // Content should be rendered in our mock implementation
    const content = screen.getByText('Tooltip Content');
    expect(content).toBeInTheDocument();
  });

  it('applies custom className to tooltip content', () => {
    renderWithUIProviders(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover Me</TooltipTrigger>
          <TooltipContent className="custom-tooltip">
            Tooltip Content
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    
    // Content should have custom class
    const content = screen.getByTestId('tooltip-content');
    expect(content).toHaveClass('custom-tooltip');
  });

  it('renders tooltip with custom side offset', () => {
    renderWithUIProviders(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover Me</TooltipTrigger>
          <TooltipContent sideOffset={10}>
            Offset Tooltip
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    
    // Tooltip with offset should be rendered
    expect(screen.getByText('Offset Tooltip')).toBeInTheDocument();
  });

  it('renders with disabled trigger button', () => {
    renderWithUIProviders(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger disabled>Disabled Button</TooltipTrigger>
          <TooltipContent>
            Disabled Button Tooltip
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    
    // Disabled button should be rendered and have disabled attribute
    const button = screen.getByText('Disabled Button');
    expect(button).toBeDisabled();
  });

  it('renders with custom trigger and content components', () => {
    renderWithUIProviders(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div data-testid="custom-trigger">Custom Trigger</div>
          </TooltipTrigger>
          <TooltipContent>
            <div data-testid="custom-content">Custom Content</div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    
    // Custom components should be rendered
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
    expect(screen.getByTestId('custom-content')).toBeInTheDocument();
  });

  it('works with different sides', () => {
    renderWithUIProviders(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover Me</TooltipTrigger>
          <TooltipContent side="top">Top Tooltip</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
    
    // Top tooltip should be rendered
    expect(screen.getByText('Top Tooltip')).toBeInTheDocument();
  });
}); 