import { useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';

export interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const useToast = () => {
  const addNotification = useUIStore((state) => state.addNotification);
  const removeNotification = useUIStore((state) => state.removeNotification);

  const toast = useCallback(
    ({ title, description, variant = 'default', duration = 5000 }: ToastOptions) => {
      const typeMap = {
        default: 'info',
        destructive: 'error',
        success: 'success',
        warning: 'warning',
        info: 'info',
      } as const;

      const notification = {
        type: typeMap[variant],
        title,
        message: description || '',
        duration,
      };

      return addNotification(notification);
    },
    [addNotification]
  );

  const toastPromise = useCallback(
    <T,>(
      promise: Promise<T>,
      options: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((error: unknown) => string);
      }
    ) => {
      const id = addNotification({
        type: 'info',
        title: 'Carregando...',
        message: options.loading,
        duration: 0, // Don't auto-close loading toast
      });

      promise
        .then((data) => {
          removeNotification(id);
          const successMessage =
            typeof options.success === 'function' ? options.success(data) : options.success;
          addNotification({
            type: 'success',
            title: 'Sucesso',
            message: successMessage,
          });
        })
        .catch((error) => {
          removeNotification(id);
          const errorMessage =
            typeof options.error === 'function' ? options.error(error) : options.error;
          addNotification({
            type: 'error',
            title: 'Erro',
            message: errorMessage,
          });
        });

      return id;
    },
    [addNotification, removeNotification]
  );

  return {
    toast,
    toastPromise,
    dismiss: removeNotification,
  };
};