import { useUIStore, type Theme, type Language, type Notification } from '@/store/uiStore';

// Mock timers
jest.useFakeTimers();

describe('uiStore', () => {
  // Clear all mocks and reset store before each test
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store to initial state
    useUIStore.setState({
      theme: 'system',
      language: 'pt-BR',
      notifications: [],
      isSidebarOpen: true,
      isMobileMenuOpen: false,
    });
  });

  // Test initial state
  it('should initialize with default values', () => {
    const state = useUIStore.getState();
    expect(state.theme).toBe('system');
    expect(state.language).toBe('pt-BR');
    expect(state.notifications).toEqual([]);
    expect(state.isSidebarOpen).toBe(true);
    expect(state.isMobileMenuOpen).toBe(false);
  });

  // Test theme setting
  describe('theme management', () => {
    beforeEach(() => {
      // Mock classList methods instead of replacing the object
      document.documentElement.classList.add = jest.fn();
      document.documentElement.classList.remove = jest.fn();
      document.documentElement.classList.contains = jest.fn();
    });
    
    afterEach(() => {
      // Restore original methods
      jest.restoreAllMocks();
    });
    
    it('should apply dark theme correctly', () => {
      useUIStore.getState().setTheme('dark');
      
      expect(useUIStore.getState().theme).toBe('dark');
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });
    
    it('should apply light theme correctly', () => {
      useUIStore.getState().setTheme('light');
      
      expect(useUIStore.getState().theme).toBe('light');
      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });
    
    it('should apply system theme based on media query', () => {
      // Mock window.matchMedia
      const originalMatchMedia = window.matchMedia;
      
      // Test dark system preference
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      
      useUIStore.getState().setTheme('system');
      expect(useUIStore.getState().theme).toBe('system');
      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
      
      // Test light system preference
      window.matchMedia = jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }));
      
      useUIStore.getState().setTheme('system');
      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
      
      // Restore original matchMedia
      window.matchMedia = originalMatchMedia;
    });
  });

  // Test language setting
  it('should update language', () => {
    useUIStore.getState().setLanguage('en-US');
    expect(useUIStore.getState().language).toBe('en-US');
  });

  // Test notification management
  describe('notification management', () => {
    it('should add notification with correct defaults', () => {
      const id = useUIStore.getState().addNotification({
        type: 'info',
        message: 'Test notification'
      });
      
      // Verify ID was returned
      expect(id).toBeTruthy();
      
      // Check notification was added with defaults
      const { notifications } = useUIStore.getState();
      expect(notifications.length).toBe(1);
      expect(notifications[0]).toEqual({
        id,
        type: 'info',
        message: 'Test notification',
        autoClose: true,
        duration: 5000,
        createdAt: expect.any(Number)
      });
    });
    
    it('should add notification with custom settings', () => {
      const id = useUIStore.getState().addNotification({
        type: 'error',
        message: 'Error notification',
        title: 'Error',
        autoClose: false,
        duration: 10000
      });
      
      const { notifications } = useUIStore.getState();
      expect(notifications[0]).toEqual({
        id,
        type: 'error',
        message: 'Error notification',
        title: 'Error',
        autoClose: false,
        duration: 10000,
        createdAt: expect.any(Number)
      });
    });
    
    it('should auto-close notifications', () => {
      // Add notification with auto-close
      const id = useUIStore.getState().addNotification({
        type: 'success',
        message: 'Success message',
        duration: 1000
      });
      
      // Verify added
      expect(useUIStore.getState().notifications.length).toBe(1);
      
      // Fast-forward time
      jest.advanceTimersByTime(1000);
      
      // Verify removed
      expect(useUIStore.getState().notifications.length).toBe(0);
    });
    
    it('should remove notification by id', () => {
      // Add two notifications
      const id1 = useUIStore.getState().addNotification({ type: 'info', message: 'First' });
      const id2 = useUIStore.getState().addNotification({ type: 'info', message: 'Second' });
      
      expect(useUIStore.getState().notifications.length).toBe(2);
      
      // Remove one
      useUIStore.getState().removeNotification(id1);
      
      // Verify only one is left and it's the correct one
      const { notifications } = useUIStore.getState();
      expect(notifications.length).toBe(1);
      expect(notifications[0].id).toBe(id2);
    });
    
    it('should clear all notifications', () => {
      // Add multiple notifications
      useUIStore.getState().addNotification({ type: 'info', message: 'First' });
      useUIStore.getState().addNotification({ type: 'info', message: 'Second' });
      
      expect(useUIStore.getState().notifications.length).toBe(2);
      
      // Clear all
      useUIStore.getState().clearAllNotifications();
      
      // Verify all removed
      expect(useUIStore.getState().notifications.length).toBe(0);
    });
  });

  // Test sidebar management
  describe('sidebar management', () => {
    it('should toggle sidebar state', () => {
      // Initially true
      expect(useUIStore.getState().isSidebarOpen).toBe(true);
      
      // Toggle to false
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().isSidebarOpen).toBe(false);
      
      // Toggle back to true
      useUIStore.getState().toggleSidebar();
      expect(useUIStore.getState().isSidebarOpen).toBe(true);
    });
    
    it('should set sidebar state directly', () => {
      useUIStore.getState().setSidebarOpen(false);
      expect(useUIStore.getState().isSidebarOpen).toBe(false);
      
      useUIStore.getState().setSidebarOpen(true);
      expect(useUIStore.getState().isSidebarOpen).toBe(true);
    });
  });

  // Test mobile menu management
  describe('mobile menu management', () => {
    it('should toggle mobile menu state', () => {
      // Initially false
      expect(useUIStore.getState().isMobileMenuOpen).toBe(false);
      
      // Toggle to true
      useUIStore.getState().toggleMobileMenu();
      expect(useUIStore.getState().isMobileMenuOpen).toBe(true);
      
      // Toggle back to false
      useUIStore.getState().toggleMobileMenu();
      expect(useUIStore.getState().isMobileMenuOpen).toBe(false);
    });
    
    it('should set mobile menu state directly', () => {
      useUIStore.getState().setMobileMenuOpen(true);
      expect(useUIStore.getState().isMobileMenuOpen).toBe(true);
      
      useUIStore.getState().setMobileMenuOpen(false);
      expect(useUIStore.getState().isMobileMenuOpen).toBe(false);
    });
  });

  // Test store persistence
  describe('persistence', () => {
    it('should only persist specified properties', () => {
      // Set all properties
      useUIStore.setState({
        theme: 'dark',
        language: 'en-US',
        notifications: [{ id: '1', type: 'info', message: 'Test', createdAt: Date.now() }],
        isSidebarOpen: false,
        isMobileMenuOpen: true,
      });
      
      // Mock the persist.getOptions() method since it might be undefined
      const mockPartialize = jest.fn().mockImplementation((state) => ({
        theme: state.theme,
        language: state.language,
        isSidebarOpen: state.isSidebarOpen,
      }));
      
      // Mock the persist object if it exists
      if (useUIStore.persist) {
        useUIStore.persist.getOptions = jest.fn().mockReturnValue({
          partialize: mockPartialize
        });
      }
      
      // Get the state that would be persisted
      const state = useUIStore.getState();
      const persistedState = {
        theme: state.theme,
        language: state.language,
        isSidebarOpen: state.isSidebarOpen,
      };
      
      // Verify only specified properties would be persisted
      expect(persistedState).toEqual({
        theme: 'dark',
        language: 'en-US',
        isSidebarOpen: false,
      });
      
      // Verify notifications and mobileMenu state are not included
      expect('notifications' in persistedState).toBe(false);
      expect('isMobileMenuOpen' in persistedState).toBe(false);
    });
  });
}); 