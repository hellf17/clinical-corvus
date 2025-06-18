import { LabResult, PaginatedLabResultsResponse } from '@/types/health';
import { auth } from '@clerk/nextjs/server';
import { API_URL } from '@/lib/config'; // Import centralized API_URL
// Assuming types exist
import { LabSummary } from "@/types/labSummary"; 

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'; // Removed local definition

export interface LabDataPoint {
    name: string; // e.g., date
    [key: string]: any; // Allow dynamic keys like Glicemia, HbA1c etc.
}

async function getClerkAuthToken(): Promise<string | null> {
    try {
      const { getToken } = await auth();
      const token = await getToken();
      return token;
    } catch (error) {
        console.error('Error retrieving Clerk auth token for labs:', error);
        return null;
    }
}

/**
 * Fetches summarized lab data with trends for the logged-in user (patient).
 * Calls backend GET /api/me/labs/summary
 */
export async function getLabSummary(): Promise<LabSummary | null> {
  const token = await getClerkAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const endpoint = `${API_URL}/api/me/labs/summary`;

  console.log(`Fetching lab summary from ${endpoint}...`);

  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      if (response.status === 404) {
          // Handle case where patient profile/data isn't found gracefully
          console.warn('Lab summary not found (404). Patient profile might be missing.');
          return null; 
      }
      console.error(`API error fetching lab summary: ${response.status} ${response.statusText}`);
      throw new Error(`API error fetching lab summary: ${response.statusText}`);
    }
    const data: LabSummary = await response.json();
    console.log("Successfully fetched lab summary.");
    return data;

  } catch (error) {
    console.error('Error in getLabSummary:', error);
    // Return null or re-throw depending on desired error handling in components
    // Returning null might be better for optional display sections
    // throw error; 
    return null;
  }
}

// Remove old getLabSummaryForUser function (renamed)
// export async function getLabSummaryForUser(): Promise<LabDataPoint[]> { ... } 