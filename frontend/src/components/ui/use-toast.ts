import { toast as sonnerToast } from "sonner"

export type ToastProps = {
  title?: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: "default" | "destructive"
}

export const useToast = () => {
  const toast = ({ title, description, action, variant = "default" }: ToastProps) => {
    if (variant === "destructive") {
      sonnerToast.error(title, {
        description,
        action: action ? {
          label: action.label,
          onClick: action.onClick,
        } : undefined,
      })
    } else {
      sonnerToast.success(title, {
        description,
        action: action ? {
          label: action.label,
          onClick: action.onClick,
        } : undefined,
      })
    }
  }

  return { toast }
}

export { sonnerToast as Toaster }