"use client";
import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Notification as NotificationType } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/store/uiStore';

interface ToastProps {
  notification: NotificationType;
  onClose: () => void;
}

const getIconByType = (type: NotificationType['type']) => {
  switch (type) {
    case 'success':
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'error':
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'warning':
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    case 'info':
    default:
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
      );
  }
};

const getBgColorByType = (type: NotificationType['type']) => {
  switch (type) {
    case 'success':
      return 'bg-card border-success/50 dark:border-success/70';
    case 'error':
      return 'bg-card border-destructive/50 dark:border-destructive/70';
    case 'warning':
      return 'bg-card border-secondary/50 dark:border-secondary/70';
    case 'info':
    default:
      return 'bg-card border-primary/50 dark:border-primary/70';
  }
};

const getTextColorByType = (type: NotificationType['type']) => {
  switch (type) {
    case 'success':
      return 'text-success';
    case 'error':
      return 'text-destructive';
    case 'warning':
      return 'text-secondary-foreground';
    case 'info':
    default:
      return 'text-primary';
  }
};

const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      const closeTimer = setTimeout(onClose, 300); // Wait for exit animation
      return () => clearTimeout(closeTimer);
    }, notification.duration || 5000);

    return () => clearTimeout(timer);
  }, [notification.duration, onClose]);

  return (
    <div
      className={cn(
        'relative transition-all duration-300 ease-out transform',
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0',
        'max-w-sm w-full rounded-lg shadow-lg border pointer-events-auto overflow-hidden',
        getBgColorByType(notification.type)
      )}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className={cn('flex-shrink-0', getTextColorByType(notification.type))}>
            {getIconByType(notification.type)}
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            {notification.title && (
              <p className="text-sm font-medium text-foreground dark:text-foreground">
                {notification.title}
              </p>
            )}
            <p className="mt-1 text-sm text-foreground dark:text-foreground">
              {notification.message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
            >
              <span className="sr-only">Fechar</span>
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ToastContainer = () => {
  const { notifications, removeNotification } = useUIStore();

  return (
    <div className="fixed inset-0 flex flex-col items-end px-4 py-6 pointer-events-none sm:p-6 z-50 space-y-4">
      {notifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export { Toast, ToastContainer }; 