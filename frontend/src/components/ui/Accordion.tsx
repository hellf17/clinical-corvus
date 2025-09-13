import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface AccordionProps {
  type?: 'single' | 'multiple';
  className?: string;
  defaultValue?: string[];
  children: React.ReactNode;
}

interface AccordionItemProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

interface AccordionTriggerProps {
  className?: string;
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  'aria-expanded'?: boolean;
}

interface AccordionContentProps {
  className?: string;
  children: React.ReactNode;
}

// Create a context to share state between Accordion and its children
interface AccordionContextProps {
  openItems: string[];
  toggleItem: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextProps | undefined>(undefined);

export const Accordion: React.FC<AccordionProps> = ({
  type = 'single',
  className = '',
  defaultValue = [],
  children
}) => {
  const [openItems, setOpenItems] = useState<string[]>(defaultValue);

  const toggleItem = (value: string) => {
    if (type === 'single') {
      setOpenItems(openItems.includes(value) ? [] : [value]);
    } else {
      setOpenItems(
        openItems.includes(value)
          ? openItems.filter(item => item !== value)
          : [...openItems, value]
      );
    }
  };

  return (
    <AccordionContext.Provider value={{ openItems, toggleItem }}>
      <div className={`divide-y divide-border ${className}`}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
};

export const AccordionItem: React.FC<AccordionItemProps> = ({ 
  value, 
  className = '', 
  children 
}) => {
  const context = React.useContext(AccordionContext);
  if (!context) {
    throw new Error('AccordionItem must be used within an Accordion');
  }

  const { openItems } = context;
  const isOpen = openItems.includes(value);

  return (
    <div 
      className={`py-2 ${className}`} 
      data-state={isOpen ? "open" : "closed"}
      data-value={value}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === AccordionTrigger) {
            return React.cloneElement(child as React.ReactElement<AccordionTriggerProps>, {
              onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
                context.toggleItem(value);
                const onClick = (child.props as AccordionTriggerProps).onClick;
                if (onClick) {
                  onClick(e);
                }
              },
              'aria-expanded': isOpen,
            });
          }
          if (child.type === AccordionContent) {
            return isOpen ? child : null;
          }
        }
        return child;
      })}
    </div>
  );
};

export const AccordionTrigger: React.FC<AccordionTriggerProps> = ({ 
  className = '', 
  children,
  ...props
}) => {
  return (
    <Button 
      className={`flex justify-between w-full items-center py-2 text-left focus:outline-none ${className}`}
      {...props}
    >
      {children}
      <svg 
        className="w-4 h-4 transition-transform" 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </Button>
  );
};

export const AccordionContent: React.FC<AccordionContentProps> = ({ 
  className = '', 
  children 
}) => {
  return (
    <div className={`py-2 ${className}`}>
      {children}
    </div>
  );
};

export default Accordion; 