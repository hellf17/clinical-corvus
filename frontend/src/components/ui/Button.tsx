import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
  asChild?: boolean;
}

const buttonVariants = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "bg-secondary hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "border border-input hover:bg-accent hover:text-accent-foreground",
  link: "bg-primary underline-offset-4 hover:underline text-primary",
};

const sizeVariants = {
  default: "h-10 py-2 px-4",
  sm: "h-9 px-3 rounded-md",
  lg: "h-20 px-5 rounded-md",
  icon: "h-10 w-10 p-0 rounded-full",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant = "default", size = "default", isLoading, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  
  // When using asChild with Slot, we need to ensure only one child element
  const children = isLoading && !asChild ? (
    <>
      <svg className="animate-spin mr-2 h-4 w-4" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      {props.children}
    </>
  ) : props.children;
  
  return (
    <Comp
      className={cn(
        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
        buttonVariants[variant] || buttonVariants.default,
        sizeVariants[size],
        className
      )}
      ref={ref}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {children}
    </Comp>
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
export default Button; 