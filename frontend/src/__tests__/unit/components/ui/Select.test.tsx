import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { 
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/Select';

// Precisamos criar um mock para os componentes do Radix UI
jest.mock('@radix-ui/react-select', () => {
  const SelectContextMock = React.createContext({});
  
  return {
    Root: ({ children, disabled, ...props }: { children: React.ReactNode, disabled?: boolean, [key: string]: any }) => (
      <SelectContextMock.Provider value={{ disabled, ...props }}>
        <div data-testid="select-root" aria-disabled={disabled}>{children}</div>
      </SelectContextMock.Provider>
    ),
    Trigger: ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => {
      // Aqui pegamos o contexto para aplicar propriedades do Root (como disabled)
      return (
        <button 
          data-testid="select-trigger" 
          disabled={props.disabled}
          {...props}
        >
          {children}
        </button>
      );
    },
    Value: ({ children, placeholder, ...props }: { children?: React.ReactNode, placeholder?: string, [key: string]: any }) => (
      <span data-testid="select-value" {...props}>
        {children || placeholder}
      </span>
    ),
    Portal: ({ children }: { children: React.ReactNode }) => <div data-testid="select-portal">{children}</div>,
    Content: ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => (
      <div data-testid="select-content" {...props}>
        {children}
      </div>
    ),
    Viewport: ({ children }: { children: React.ReactNode }) => <div data-testid="select-viewport">{children}</div>,
    Item: ({ children, value, disabled, ...props }: { children: React.ReactNode, value?: string, disabled?: boolean, [key: string]: any }) => (
      <div 
        data-testid="select-item" 
        data-value={value} 
        data-disabled={disabled} 
        {...props}
      >
        {children}
      </div>
    ),
    ItemText: ({ children }: { children: React.ReactNode }) => <span data-testid="select-item-text">{children}</span>,
    ItemIndicator: ({ children }: { children: React.ReactNode }) => <span data-testid="select-item-indicator">{children}</span>,
    Icon: ({ children }: { children: React.ReactNode }) => <span data-testid="select-icon">{children}</span>,
    Group: ({ children }: { children: React.ReactNode }) => <div data-testid="select-group">{children}</div>,
    Label: ({ children }: { children: React.ReactNode }) => <span data-testid="select-label">{children}</span>,
    Separator: () => <div data-testid="select-separator" />,
    ScrollUpButton: ({ children }: { children: React.ReactNode }) => <div data-testid="select-scroll-up">{children}</div>,
    ScrollDownButton: ({ children }: { children: React.ReactNode }) => <div data-testid="select-scroll-down">{children}</div>,
  };
});

describe('Select component', () => {
  
  it('renders basic select correctly', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );
    
    expect(screen.getByTestId('select-root')).toBeInTheDocument();
    expect(screen.getByTestId('select-trigger')).toBeInTheDocument();
    expect(screen.getByText('Select option')).toBeInTheDocument();
  });

  it('applies custom className to trigger', () => {
    render(
      <Select>
        <SelectTrigger className="custom-class">
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByTestId('select-trigger');
    expect(trigger).toHaveClass('custom-class');
  });

  it('renders disabled state correctly', () => {
    render(
      <Select disabled>
        <SelectTrigger disabled>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
      </Select>
    );
    
    const trigger = screen.getByTestId('select-trigger');
    expect(trigger).toHaveAttribute('disabled');
  });

  it('renders select items correctly', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2">Option 2</SelectItem>
        </SelectContent>
      </Select>
    );
    
    // Verificamos que os SelectItems foram renderizados
    expect(screen.getAllByTestId('select-item')).toHaveLength(2);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('renders a disabled select item correctly', () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select option" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="option1">Option 1</SelectItem>
          <SelectItem value="option2" disabled>
            Disabled Option
          </SelectItem>
        </SelectContent>
      </Select>
    );
    
    // Encontramos o item desabilitado
    const items = screen.getAllByTestId('select-item');
    const disabledItem = items.find(item => item.textContent === 'Disabled Option');
    
    expect(disabledItem).toBeInTheDocument();
    expect(disabledItem).toHaveAttribute('data-disabled');
  });
}); 