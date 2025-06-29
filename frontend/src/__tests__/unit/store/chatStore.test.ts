import { useChatStore } from '@/store/chatStore';
import { act } from 'react';

// Mock the API correctly
jest.mock('@/lib/api', () => {
  return {
    __esModule: true,
    default: {
      post: jest.fn()
    }
  };
});

// Import the mocked module
import api from '@/lib/api';

describe('chatStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the store to initial state instead of calling reset()
    useChatStore.setState({
      conversations: [],
      currentConversationId: null,
      currentPatientId: null,
      showContextPanel: false,
      useWebSearch: false,
      enableTools: true,
      isLoading: false,
      error: null,
      settings: {
        detailedMode: false,
        webSearch: false
      }
    });
  });

  describe('initialization', () => {
    it('should initialize with empty messages', () => {
      const state = useChatStore.getState();
      expect(state.conversations).toEqual([]);
      expect(state.isLoading).toBe(false);
    });
  });

  describe('conversation management', () => {
    it('should create a new conversation', () => {
      act(() => {
        useChatStore.getState().createConversation('Test Conversation');
      });
      
      const { conversations } = useChatStore.getState();
      expect(conversations.length).toBe(1);
      expect(conversations[0].title).toBe('Test Conversation');
      expect(conversations[0].messages).toEqual([]);
    });
    
    it('should select a conversation', () => {
      // Create conversations
      act(() => {
        useChatStore.getState().createConversation('Conversation 1');
        useChatStore.getState().createConversation('Conversation 2');
      });
      
      const { conversations } = useChatStore.getState();
      const secondConversationId = conversations[1].id;
      
      // Select the second conversation
      act(() => {
        useChatStore.getState().selectConversation(secondConversationId);
      });
      
      expect(useChatStore.getState().currentConversationId).toBe(secondConversationId);
    });
    
    it('should delete a conversation', () => {
      // Create conversations
      act(() => {
        useChatStore.getState().createConversation('Conversation 1');
        useChatStore.getState().createConversation('Conversation 2');
      });
      
      const { conversations } = useChatStore.getState();
      // Get the ID of the first conversation (which should be Conversation 2)
      // since createConversation adds to the beginning of the array
      const firstConversationId = conversations[0].id;
      
      // Delete the first conversation (which should be Conversation 2)
      act(() => {
        useChatStore.getState().deleteConversation(firstConversationId);
      });
      
      expect(useChatStore.getState().conversations.length).toBe(1);
      expect(useChatStore.getState().conversations[0].title).toBe('Conversation 1');
    });
  });
  
  describe('message handling', () => {
    it('should send a message and receive a response', async () => {
      // Create a conversation first
      act(() => {
        useChatStore.getState().createConversation('Test Chat');
      });
      
      const { conversations } = useChatStore.getState();
      const conversationId = conversations[0].id;
      
      // Set up mock API response
      const mockResponse = {
        data: {
          assistant_response: {
            id: 'resp1',
            role: 'assistant',
            content: 'This is a test response',
            timestamp: Date.now()
          }
        }
      };
      
      // Mock the API response
      (api.post as jest.Mock).mockResolvedValue(mockResponse);
      
      // Send a message
      await act(async () => {
        await useChatStore.getState().sendMessage('Hello, Dr. Corvus!');
      });
      
      // Verify message was added and response received
      const conversation = useChatStore.getState().conversations.find(c => c.id === conversationId);
      expect(conversation?.messages.length).toBe(2);
      expect(conversation?.messages[0].content).toBe('Hello, Dr. Corvus!');
      expect(conversation?.messages[0].role).toBe('user');
      expect(conversation?.messages[1].content).toBe('This is a test response');
      expect(conversation?.messages[1].role).toBe('assistant');
    });
    
    it('should handle API errors gracefully', async () => {
      // Create a conversation first
      act(() => {
        useChatStore.getState().createConversation('Test Chat');
      });
      
      const { conversations } = useChatStore.getState();
      const conversationId = conversations[0].id;
      
      // Mock API error
      (api.post as jest.Mock).mockRejectedValue(new Error('API Error'));
      
      // Send a message
      await act(async () => {
        await useChatStore.getState().sendMessage('Hello, Dr. Corvus!');
      });
      
      // Verify message was added and fallback error response received
      const conversation = useChatStore.getState().conversations.find(c => c.id === conversationId);
      expect(conversation?.messages.length).toBe(2);
      expect(conversation?.messages[0].content).toBe('Hello, Dr. Corvus!');
      expect(conversation?.messages[0].role).toBe('user');
      expect(conversation?.messages[1].role).toBe('assistant');
      expect(conversation?.messages[1].content).toContain('Desculpe, ocorreu um erro');
    });
  });

  describe('settings and UI state', () => {
    it('should toggle context panel', () => {
      const initialState = useChatStore.getState();
      expect(initialState.showContextPanel).toBe(false);

      act(() => {
        useChatStore.getState().toggleContextPanel();
      });

      expect(useChatStore.getState().showContextPanel).toBe(true);

      act(() => {
        useChatStore.getState().toggleContextPanel();
      });

      expect(useChatStore.getState().showContextPanel).toBe(false);
    });

    it('should toggle web search', () => {
      const initialState = useChatStore.getState();
      expect(initialState.useWebSearch).toBe(false);

      act(() => {
        useChatStore.getState().toggleWebSearch();
      });

      expect(useChatStore.getState().useWebSearch).toBe(true);

      act(() => {
        useChatStore.getState().toggleWebSearch();
      });

      expect(useChatStore.getState().useWebSearch).toBe(false);
    });

    it('should toggle tools', () => {
      const initialState = useChatStore.getState();
      expect(initialState.enableTools).toBe(true);

      act(() => {
        useChatStore.getState().toggleTools();
      });

      expect(useChatStore.getState().enableTools).toBe(false);

      act(() => {
        useChatStore.getState().toggleTools();
      });

      expect(useChatStore.getState().enableTools).toBe(true);
    });

    it('should update settings', () => {
      const newSettings = {
        detailedMode: true,
        webSearch: true,
      };

      act(() => {
        useChatStore.getState().updateSettings(newSettings);
      });

      const state = useChatStore.getState();
      expect(state.settings).toEqual(newSettings);
    });
  });

  describe('patient context', () => {
    it('should set current patient', () => {
      const patientId = 'patient-123';

      act(() => {
        useChatStore.getState().setCurrentPatient(patientId);
      });

      expect(useChatStore.getState().currentPatientId).toBe(patientId);
    });

    it('should clear current patient', () => {
      const patientId = 'patient-123';

      act(() => {
        useChatStore.getState().setCurrentPatient(patientId);
        useChatStore.getState().setCurrentPatient(null);
      });

      expect(useChatStore.getState().currentPatientId).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should clear error', () => {
      // Set an error
      act(() => {
        useChatStore.setState({ error: 'Test error' });
      });
      
      expect(useChatStore.getState().error).toBe('Test error');
      
      act(() => {
        useChatStore.getState().clearError();
      });
      
      expect(useChatStore.getState().error).toBeNull();
    });
  });
  
  describe('reset functionality', () => {
    it('should reset the store to initial state', () => {
      // Mock localStorage
      const mockLocalStorageSetItem = jest.spyOn(Storage.prototype, 'setItem');
      
      // Set up multiple things that should be reset
      act(() => {
        useChatStore.getState().createConversation('Test Conversation');
        useChatStore.getState().setCurrentPatient('patient-123');
        useChatStore.getState().toggleContextPanel(); // Should be true after toggle
        useChatStore.getState().toggleWebSearch(); // Should be true after toggle
        useChatStore.getState().updateSettings({ 
          detailedMode: true, 
          webSearch: true 
        });
        useChatStore.setState({ error: 'Test error' });
      });
      
      // Verify state has been modified
      const stateBefore = useChatStore.getState();
      expect(stateBefore.conversations.length).toBe(1);
      expect(stateBefore.currentPatientId).toBe('patient-123');
      expect(stateBefore.showContextPanel).toBe(true);
      expect(stateBefore.useWebSearch).toBe(true);
      expect(stateBefore.settings.detailedMode).toBe(true);
      expect(stateBefore.error).toBe('Test error');
      
      // Reset the store
      act(() => {
        useChatStore.getState().reset();
      });
      
      // Verify reset worked
      const stateAfter = useChatStore.getState();
      expect(stateAfter.conversations).toEqual([]);
      expect(stateAfter.currentConversationId).toBeNull();
      expect(stateAfter.currentPatientId).toBeNull();
      expect(stateAfter.showContextPanel).toBe(false);
      expect(stateAfter.useWebSearch).toBe(false);
      expect(stateAfter.enableTools).toBe(true);
      expect(stateAfter.isLoading).toBe(false);
      expect(stateAfter.error).toBeNull();
      expect(stateAfter.settings).toEqual({
        detailedMode: false,
        webSearch: false
      });
      
      // Verify localStorage was updated
      expect(mockLocalStorageSetItem).toHaveBeenCalledWith(
        'clinical-helper-chat',
        expect.stringContaining('"conversations":[]')
      );
      
      // Clean up mock
      mockLocalStorageSetItem.mockRestore();
    });
  });
}); 