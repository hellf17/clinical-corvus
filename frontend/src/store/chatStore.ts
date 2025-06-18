import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// import api from '@/lib/api'; // Remove api import if sendMessage is removed

// Keep Annotation type if used elsewhere, otherwise potentially remove
export interface Annotation {
  type: string;
  url?: string;
  title?: string;
  startIndex?: number;
  endIndex?: number;
}

// Keep Message type if used elsewhere, but note CoreMessage from 'ai/react' is primary now
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  annotations?: Annotation[];
}

// Keep Conversation type if used elsewhere
export interface Conversation {
  id: string;
  title: string;
  messages: Message[]; // Consider removing messages if not used globally
  createdAt: number;
  updatedAt: number;
  patientId?: string | null;
}

// Keep ChatSettings
export interface ChatSettings {
  detailedMode: boolean;
  webSearch: boolean;
}

interface ChatState {
  // Remove conversation and message state
  // conversations: Conversation[];
  // currentConversationId: string | null;
  // currentPatientId: string | null; // Keep if needed globally, otherwise remove
  // showContextPanel: boolean; // Keep if used for UI toggle
  // isLoading: boolean; // Remove - handled by useChat
  // error: string; // Remove - handled by useChat

  // Keep settings
  settings: ChatSettings;
  
  // Actions
  // Remove message/conversation actions handled elsewhere
  // sendMessage: (content: string) => Promise<void>;
  // createConversation: (title?: string, patientId?: string | null) => void;
  // deleteConversation: (id: string) => void;
  // selectConversation: (id: string) => void;
  // clearConversations: () => void;
  // updateConversationTitle: (id: string, title: string) => void;
  // setCurrentPatient: (patientId: string | null) => void;
  // toggleContextPanel: () => void;
  // clearError: () => void;
  
  // Keep settings actions
  updateSettings: (settings: Partial<ChatSettings>) => void; // Allow partial updates
  // Keep toggleWebSearch/toggleTools if they directly modify settings
  toggleWebSearch: () => void;
  toggleDetailedMode: () => void; // Renamed from toggleTools potentially
  resetSettings: () => void; // Renamed from reset
}

// // Generate a random ID - remove if not needed
// const generateId = () => Math.random().toString(36).substring(2, 11);

const initialSettings: ChatSettings = {
  detailedMode: false,
  webSearch: false,
};

// Initial state definition for reuse in reset function
const initialStoreState = {
  settings: initialSettings,
  // Initialize other kept state here if any
};

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // Initial state
      ...initialStoreState,

      // Remove sendMessage logic
      // sendMessage: async (content: string) => { ... },

      // Remove conversation management logic
      // createConversation: (title = 'Nova conversa', patientId = null) => { ... },
      // deleteConversation: (id) => { ... },
      // selectConversation: (id) => { ... },
      // clearConversations: () => { ... },
      // updateConversationTitle: (id, title) => { ... },
      // setCurrentPatient: (patientId) => { ... },
      // toggleContextPanel: () => { ... },
      // clearError: () => set({ error: '' }),
      
      // Keep settings actions
      updateSettings: (newSettings) => {
        set((state) => ({ settings: { ...state.settings, ...newSettings } }));
      },
      
      toggleWebSearch: () => {
        set((state) => ({ settings: { ...state.settings, webSearch: !state.settings.webSearch } }));
      },
      
      toggleDetailedMode: () => {
        set((state) => ({ settings: { ...state.settings, detailedMode: !state.settings.detailedMode } }));
      },
      
      // Renamed reset to only reset settings
      resetSettings: () => set({ settings: initialSettings }),

      // Remove original reset if it cleared everything
      // reset: () => set(initialState)
    }),
    {
      name: 'chat-storage', // name of the item in the storage (must be unique)
      // storage: createJSONStorage(() => sessionStorage), // (optional) by default, 'localStorage' is used
       partialize: (state) => ({ settings: state.settings }), // Only persist settings
    }
  )
); 