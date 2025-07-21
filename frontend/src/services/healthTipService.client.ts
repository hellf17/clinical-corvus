// Client-side service for health tip interactions
import { API_URL } from '@/lib/config'; // Import centralized API_URL
import { HealthTip } from '@/types/healthTip'; // Import type from central location

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'; // Removed local definition

/**
 * Fetches general health tips.
 * Calls backend GET /api/me/health-tips.
 * Uses Clerk session cookies for authentication.
 * Returns Promise<HealthTip[]> using the type from @/types/healthTip
 */
export async function getHealthTips(): Promise<HealthTip[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const endpoint = `${API_URL}/api/me/health-tips`;

  try {
    const response = await fetch(endpoint, {
      headers,
      credentials: 'include' // Include credentials for CORS - this sends Clerk session cookies
    });
    
    if (!response.ok) {
      console.error(`Health tips API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    return data || [];
    
  } catch (error) {
    console.error('Error fetching health tips:', error);
    return [];
  }
}