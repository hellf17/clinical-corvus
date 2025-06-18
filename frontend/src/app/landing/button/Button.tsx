import type { ReactNode } from 'react';

// Basic styling, can be aligned more closely with the template's demo if needed.
// Assuming primary colors are set up in Tailwind config (e.g., primary-500, primary-600)

type IButtonProps = {
  children: ReactNode;
  xl?: boolean;
  // You can add other props if needed, like onClick, type, etc.
  // For <Link> usage, this button would be a child, or it could be an <a> tag styled as a button.
};

const Button = (props: IButtonProps) => {
  const baseClasses = 'font-semibold rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2';
  const themeClasses = 'bg-primary-500 hover:bg-primary-600 focus:ring-primary-500'; // Example theme
  const sizeClass = props.xl
    ? 'px-8 py-3 text-lg' // xl size
    : 'px-5 py-2 text-base'; // default size

  return (
    <button
      type="button" // Default type, can be overridden by spreading props
      className={`${baseClasses} ${themeClasses} ${sizeClass}`}
    >
      {props.children}
    </button>
  );
};

export { Button }; 