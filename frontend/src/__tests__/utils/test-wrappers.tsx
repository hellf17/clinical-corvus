import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// This is for Radix UI components that need a direction provider
const DirectionProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-direction="ltr">
      {children}
    </div>
  );
};

// Mock tooltip provider
const TooltipProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <div data-testid="tooltip-provider">
      {children}
    </div>
  );
};

// Comprehensive wrapper with all providers needed for UI components
export const UIProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <DirectionProvider>
      <TooltipProvider>
        {children}
      </TooltipProvider>
    </DirectionProvider>
  );
};

// Wrapper specifically for Tabs component tests
export const TabsProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <DirectionProvider>
      {children}
    </DirectionProvider>
  );
};

// Helper function to render with all UI providers
export const renderWithUIProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { 
    wrapper: UIProviders,
    ...options 
  });
};

// Helper function to render with Tabs provider
export const renderWithTabsProvider = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { 
    wrapper: TabsProvider,
    ...options 
  });
};

// Add a simple test to make Jest happy with this file
test('UIProviders renders children correctly', () => {
  const { getByText } = render(
    <UIProviders>
      <div>Test content</div>
    </UIProviders>
  );
  expect(getByText('Test content')).toBeInTheDocument();
}); 