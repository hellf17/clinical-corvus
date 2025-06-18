import { auth } from '@clerk/nextjs/server';
// Assuming types exist
import { Alert, AlertListResponse } from "@/types/alerts"; 
import { API_URL } from '@/lib/config'; // Import centralized API_URL

// const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'; // Removed local definition

async function getClerkAuthToken(): Promise<string | null> {
    try {
      const { getToken } = await auth();
      const token = await getToken();
      return token;
    } catch (error) {
        console.error('Error retrieving Clerk auth token for alerts:', error);
        return null;
    }
}

/**
 * Fetches alerts for the currently logged-in user (doctor) by status.
 * Calls backend GET /api/alerts/by-status/{status}
 */
export async function getAlerts(
  { status, page = 1, limit = 10 }: 
  { status: 'read' | 'unread'; page?: number; limit?: number; }
): Promise<AlertListResponse> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  const token = await getClerkAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const skip = (page - 1) * limit;
  const queryParams = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });

  const endpoint = `${API_URL}/api/alerts/by-status/${status}?${queryParams.toString()}`;

  console.log(`Fetching ${status} alerts from ${endpoint}...`);

  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      console.error(`API error fetching ${status} alerts: ${response.status} ${response.statusText}`);
      throw new Error(`API error: ${response.statusText} (Status: ${response.status})`);
    }
    const data: AlertListResponse = await response.json();
    console.log(`Successfully fetched ${data?.items?.length || 0} ${status} alerts (Total: ${data?.total || 0}).`);
    return data || { items: [], total: 0 };

  } catch (error) {
    console.error(`Error in getAlerts (status: ${status}):`, error);
    throw error;
  }
}

/**
 * Marks an alert as read.
 * Calls backend PUT /api/alerts/{alertId}/read
 */
export async function markAlertAsRead(alertId: number): Promise<Alert> {
  const token = await getClerkAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const endpoint = `${API_URL}/api/alerts/${alertId}/read`;

  console.log(`Marking alert ${alertId} as read at ${endpoint}...`);

  try {
    const response = await fetch(endpoint, { method: 'PUT', headers });
    if (!response.ok) {
      console.error(`API error marking alert ${alertId} as read: ${response.status} ${response.statusText}`);
      throw new Error(`API error marking alert as read: ${response.statusText}`);
    }
    const updatedAlert: Alert = await response.json();
    console.log(`Alert ${alertId} marked as read.`);
    return updatedAlert;

  } catch (error) {
    console.error(`Error marking alert ${alertId} as read:`, error);
    throw error; 
  }
}

// TODO: Implement functions for acknowledging/dismissing alerts if required by workflow.
// export async function acknowledgeAlert(alertId: number): Promise<void> { ... }
// export async function dismissAlert(alertId: number): Promise<void> { ... } 