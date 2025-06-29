import { LabSummary } from "@/types/labSummary";
import { API_URL } from '@/lib/config';

export async function getLabSummaryClient(
  token: string | null, 
  patientId?: number 
): Promise<LabSummary[]> { // Expect an array for the chart
  if (!token) {
    console.warn("getLabSummaryClient called without a token. Endpoint may be protected.");
    // Depending on backend, might still allow unauthenticated access to a general summary
    // or this will result in an auth error from fetch if endpoint is protected.
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) { // Only add auth header if token is present
    headers['Authorization'] = `Bearer ${token}`;
  }

  let endpoint = `${API_URL}/api/me/labs/summary`; // Default for "my" summary
  if (patientId) {
    endpoint = `${API_URL}/api/patients/${patientId}/labs/summary`; // Endpoint for specific patient
  }

  console.log(`Fetching lab summary from: ${endpoint}`);

  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Lab summary not found for endpoint: ${endpoint}`);
        return []; // Return empty array for 404
      }
      const errorText = await response.text();
      throw new Error(`API error fetching lab summary (${endpoint}): ${response.statusText} - ${errorText}`);
    }
    // The chart expects an array of data points.
    // Assuming the API returns the array directly or a structure like { items: [...] } or { data: [...] }
    const data = await response.json(); 
    if (Array.isArray(data)) {
        return data as LabSummary[];
    } else if (data && Array.isArray(data.items)) { // Common pattern for paginated/structured responses
        return data.items as LabSummary[];
    } else if (data && Array.isArray(data.data)) { // Another common pattern
        return data.data as LabSummary[];
    }
    // If data is not in expected array format, or if it's a single object when an array is needed for a specific patient summary for the chart
    console.warn("Lab summary data is not in expected array format, returning empty. Data:", data);
    return []; // Default to empty array if data format is unexpected

  } catch (error) {
    console.error(`Error in getLabSummaryClient (${endpoint}):`, error);
    return []; // Return empty array on error to prevent UI crash
  }
}

// Removing unused getLabSummariesClient for now
// export async function getLabSummariesClient(token: string): Promise<any[]> {
//   // TODO: Implement this function or remove if unused
//   return [];
// } 