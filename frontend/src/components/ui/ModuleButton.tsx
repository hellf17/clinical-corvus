import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ModuleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
}

const ModuleButton = forwardRef<HTMLButtonElement, ModuleButtonProps>(
  ({ className, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(
          'relative inline-flex items-center justify-center',
          'px-8 py-3 w-full',
          'bg-secondary hover:bg-primary',
          'text-primary-foreground hover:text-secondary-foreground',
          'border border-primary',
          'rounded-md',
          'transition-all duration-200',
          'hover:translate-x-[-0.25rem] hover:translate-y-[-0.25rem]',
          'hover:shadow-[0.35rem_0.35rem_var(--secondary-foreground)]',
          'active:translate-x-0 active:translate-y-0 active:shadow-none',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'disabled:hover:translate-x-0 disabled:hover:translate-y-0 disabled:hover:shadow-none',
          className
        )}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ModuleButton.displayName = 'ModuleButton';

export { ModuleButton }; 