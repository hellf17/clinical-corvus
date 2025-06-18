import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Alert } from '@/types/alerts';

// Estendendo a interface Alert para garantir que tenha uma propriedade de ID
interface AlertWithId extends Alert {
  id: string;
}

interface AlertContextType {
  alerts: AlertWithId[];
  addAlert: (alert: Alert) => void;
  removeAlert: (alertId: string) => void;
  acknowledgeAlert: (alertId: string) => void;
  bulkAcknowledge: (alertIds: string[]) => void;
  clearAlerts: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alerts, setAlerts] = useState<AlertWithId[]>([]);

  const addAlert = (alert: Alert) => {
    // Gerar um ID único
    const alertWithId: AlertWithId = {
      ...alert,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setAlerts((prev) => [...prev, alertWithId]);
  };

  const removeAlert = (alertId: string) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  };

  const acknowledgeAlert = (alertId: string) => {
    // In a real application, we might want to mark as acknowledged rather than remove
    removeAlert(alertId);
  };

  const bulkAcknowledge = (alertIds: string[]) => {
    setAlerts((prev) => prev.filter((alert) => !alertIds.includes(alert.id)));
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  return (
    <AlertContext.Provider
      value={{
        alerts,
        addAlert,
        removeAlert,
        acknowledgeAlert,
        bulkAcknowledge,
        clearAlerts,
      }}
    >
      {children}
    </AlertContext.Provider>
  );
}; 