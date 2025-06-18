import { HealthDiaryEntry, HealthDiaryEntryCreate } from "@/types/health";
import { API_URL } from '@/lib/config'; // Import centralized API_URL

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'; // Removed local definition

export interface DiaryEntry {
    entry_id: number;
    content: string;
    created_at: string;
}

// Define the expected response structure for paginated entries
export interface PaginatedDiaryEntries {
    items: HealthDiaryEntry[];
    total: number;
}

/**
 * Fetches recent diary entries for the currently logged-in user (patient).
 * Calls backend GET /api/me/diary with pagination.
 * Requires client-side obtained token.
 */
export async function getDiaryEntries(
  token: string | null,
  { page = 1, limit = 10 }: 
  { page?: number; limit?: number; } = {},
  patientId?: number // Added patientId
): Promise<PaginatedDiaryEntries> {
  if (!token && patientId) { // If fetching for a specific patient, token is usually required by backend
    console.warn("getDiaryEntries: Auth token might be required when fetching for a specific patient.");
    // Depending on backend, this might proceed and be caught by API auth, or we could throw here.
  } else if (!token && !patientId) { // Fetching "my" entries requires a token
    console.error("getDiaryEntries: Auth token is required when patientId is not specified.");
    throw new Error("Authentication failed: Token not provided.");
  }
  
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const skip = (page - 1) * limit;
  const queryParams = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });

  let endpoint = `${API_URL}/api/me/diary-entries?${queryParams.toString()}`; // Default to /me/diary-entries
  if (patientId) {
    endpoint = `${API_URL}/api/patients/${patientId}/diary-entries?${queryParams.toString()}`; // Patient-specific endpoint
  }

  // console.log(`Fetching diary entries from ${endpoint}...`);

  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error fetching diary entries (${endpoint}): ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API error fetching diary entries (${endpoint}): ${response.statusText} - ${errorText}`);
    }
    // Expect backend to return { items: HealthDiaryEntry[], total: number }
    const data: PaginatedDiaryEntries = await response.json();
    // console.log(`Successfully fetched ${data?.items?.length || 0} of ${data?.total || 0} diary entries.`);
    // Return default structure if backend response is malformed
    return data || { items: [], total: 0 }; 

  } catch (error) {
    console.error(`Error in getDiaryEntries (${endpoint}):`, error);
    // Re-throw to be handled by the calling component
    if (error instanceof Error) throw error; 
    throw new Error(String(error));
  }
}

/**
 * Saves a new diary entry for the currently logged-in user.
 * Calls backend POST /api/me/diary.
 * Requires client-side obtained token.
 */
export async function addDiaryEntry(
    token: string | null,
    entryData: HealthDiaryEntryCreate,
    patientId?: number // Added patientId
): Promise<DiaryEntry> {
  if (!token) {
    console.error("addDiaryEntry: Auth token is required.");
    throw new Error("Authentication failed: Token not provided.");
  }

  const headers: HeadersInit = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  let endpoint = `${API_URL}/api/me/diary-entries`; // Default to /me/diary-entries
  if (patientId) {
    endpoint = `${API_URL}/api/patients/${patientId}/diary-entries`; // Patient-specific endpoint
  }
  const body = JSON.stringify(entryData);

  console.log(`Saving diary entry to ${endpoint}...`);

  try {
    const response = await fetch(endpoint, { method: 'POST', headers, body });
    if (!response.ok) {
      let errorMsg = `API error saving diary entry (${endpoint}): ${response.statusText}`;
      try {
         const errorBody = await response.json();
         if (errorBody.detail) errorMsg += ` - ${JSON.stringify(errorBody.detail)}`;
         else errorMsg += ` - ${await response.text()}`;
      } catch { 
          errorMsg += ` - ${await response.text()}`;
      }
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    // Assuming backend returns the created entry matching DiaryEntry
    const newEntry: DiaryEntry = await response.json(); 
    console.log("Diary entry saved successfully.");
    return newEntry;

  } catch (error) {
    console.error(`Error in addDiaryEntry (${endpoint}):`, error);
    if (error instanceof Error) throw error; 
    throw new Error(String(error));
  }
}

// Remove old saveDiaryEntry function if renamed
// export async function saveDiaryEntry(content: string): Promise<DiaryEntry> { ... } 

// Remove or comment out the incomplete getAuthHeaders function to fix the build error.
// async function getAuthHeaders(): Promise<HeadersInit> {
//   // ... rest of file ...
// }

export type { HealthDiaryEntryCreate }; 