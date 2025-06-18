import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type Language = 'pt-BR' | 'en-US';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  title?: string;
  autoClose?: boolean;
  duration?: number; // in milliseconds
  createdAt: number;
}

interface UIState {
  theme: Theme;
  language: Language;
  notifications: Notification[];
  isSidebarOpen: boolean;
  isMobileMenuOpen: boolean;
  
  // Actions
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  toggleMobileMenu: () => void;
  setMobileMenuOpen: (isOpen: boolean) => void;
}

// Generate a random ID
const generateId = () => Math.random().toString(36).substring(2, 11);

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      language: 'pt-BR',
      notifications: [],
      isSidebarOpen: true,
      isMobileMenuOpen: false,
      
      setTheme: (theme) => {
        set({ theme });
        
        // Apply theme to document
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (theme === 'light') {
          document.documentElement.classList.remove('dark');
        } else {
          // System preference
          if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }
        }
      },
      
      setLanguage: (language) => set({ language }),
      
      addNotification: (notification) => {
        const id = generateId();
        const { notifications } = get();
        
        const newNotification: Notification = {
          ...notification,
          id,
          createdAt: Date.now(),
          autoClose: notification.autoClose ?? true,
          duration: notification.duration ?? 5000
        };
        
        set({ notifications: [...notifications, newNotification] });
        
        // Auto close logic
        if (newNotification.autoClose) {
          setTimeout(() => {
            const { notifications } = get();
            // Only remove if it's still there
            if (notifications.some(n => n.id === id)) {
              set({ 
                notifications: notifications.filter(n => n.id !== id) 
              });
            }
          }, newNotification.duration);
        }
        
        return id;
      },
      
      removeNotification: (id) => {
        const { notifications } = get();
        set({ notifications: notifications.filter(n => n.id !== id) });
      },
      
      clearAllNotifications: () => set({ notifications: [] }),
      
      toggleSidebar: () => {
        const { isSidebarOpen } = get();
        set({ isSidebarOpen: !isSidebarOpen });
      },
      
      setSidebarOpen: (isOpen) => set({ isSidebarOpen: isOpen }),
      
      toggleMobileMenu: () => {
        const { isMobileMenuOpen } = get();
        set({ isMobileMenuOpen: !isMobileMenuOpen });
      },
      
      setMobileMenuOpen: (isOpen) => set({ isMobileMenuOpen: isOpen })
    }),
    {
      name: 'clinical-helper-ui',
      // Don't persist notifications
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        isSidebarOpen: state.isSidebarOpen
      })
    }
  )
); 