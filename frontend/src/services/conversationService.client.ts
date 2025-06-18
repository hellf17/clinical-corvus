// Client-side service for conversation interactions
import { API_URL } from '@/lib/config'; // Import centralized API_URL

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'; // Removed local definition

// TODO: Replace with actual Conversation Summary type from backend/types
export interface ConversationSummary {
  id: string;
  title: string | null;
  lastMessageSnippet?: string;
  updatedAt: string; // ISO timestamp string
  patientId?: string;
  patientName?: string;
}

/**
 * Fetches recent conversation summaries using a provided auth token.
 * This function is intended for use in Client Components.
 */
export async function getRecentConversations(token: string | null): Promise<ConversationSummary[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    // Handle case where token is missing - maybe throw error or return empty?
    console.warn("getRecentConversations called without auth token.");
    // Depending on backend policy, you might still proceed or throw:
    // throw new Error("Authentication token is required to fetch conversations.");
    // Or return empty array if public access is sometimes allowed (unlikely for conversations)
    // return []; 
  }

  const endpoint = `${API_URL}/api/conversations?limit=5&sort=updatedAt:desc`; // Assumed endpoint

  console.log(`Fetching recent conversations from ${endpoint}...`);

  try {
    const response = await fetch(endpoint, { headers });

    if (!response.ok) {
        let errorMsg = `API error fetching recent conversations: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            errorMsg += ` - ${JSON.stringify(errorBody.detail || errorBody)}`;
        } catch (jsonError) { 
            errorMsg += ` - ${await response.text()}`;
        }
        throw new Error(errorMsg);
    }
    
    const data = await response.json();
    // TODO: Validate the structure of 'data' against ConversationSummary[]
    return data.items || data; // Adjust based on actual API response structure (e.g., if it's { items: [...] })

    // --- Remove Placeholder Logic ---
    // console.log("RETURNING PLACEHOLDER CONVERSATION DATA - API CALL DISABLED");
    // await new Promise(resolve => setTimeout(resolve, 900)); 
    // const placeholderData: ConversationSummary[] = [...];
    // console.log("Returning placeholder conversation summary data.");
    // return placeholderData;

  } catch (error) {
    console.error('Error in getRecentConversations (client):', error);
    throw error; // Re-throw for component-level handling
  }
} 