// Client-side service for health tip interactions
import { API_URL } from '@/lib/config'; // Import centralized API_URL
import { HealthTip } from '@/types/healthTip'; // Import type from central location

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'; // Removed local definition

/**
 * Fetches general health tips.
 * Calls backend GET /api/me/health-tips.
 * Accepts optional auth token, but the current endpoint might not require it.
 * Returns Promise<HealthTip[]> using the type from @/types/healthTip
 */
export async function getHealthTips(token: string | null = null): Promise<HealthTip[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  // Include Authorization header only if a token is provided
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log("Fetching health tips with auth token.");
  } else {
    console.log("Fetching health tips without auth token.");
  }

  // Endpoint might be /api/health-tips for general tips, 
  // or /api/me/health-tips if it requires authentication for personalization
  const endpoint = `${API_URL}/api/me/health-tips`; // Adjust endpoint if needed

  console.log(`Fetching health tips from ${endpoint}...`);

  try {
    const response = await fetch(endpoint, { headers });
    
    if (!response.ok) {
        let errorMsg = `API error fetching health tips: ${response.status} ${response.statusText}`;
        try {
            const errorBody = await response.json();
            errorMsg += ` - ${JSON.stringify(errorBody.detail || errorBody)}`;
        } catch (jsonError) {
            errorMsg += ` - ${await response.text()}`;
        }
        console.error(errorMsg); // Log the detailed error
        throw new Error(errorMsg);
    }
    
    // Expecting backend to return { tips: HealthTip[] }
    // Type assertion might be needed if fetch returns raw data
    const data = await response.json(); 
    console.log(`Successfully fetched ${data?.tips?.length || 0} health tips.`);
    // Ensure the returned data matches the imported HealthTip structure
    return (data?.tips || []) as HealthTip[]; // Return the array of tips, assert type if needed

  } catch (error) {
    console.error('Error in getHealthTips (client):', error);
    // Avoid throwing generic error, let specific error propagate if needed
    // or return empty array to prevent crashing UI
    // throw new Error("Failed to fetch health tips.");
    return []; // Return empty array on error to allow UI to render
  }
} 