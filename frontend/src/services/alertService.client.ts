import { Alert, AlertListResponse } from "@/types/alerts";
import { API_URL } from '@/lib/config';

export async function getAlertsClient(
  { status, page = 1, limit = 10 }: { status: 'read' | 'unread'; page?: number; limit?: number; },
  token: string
): Promise<AlertListResponse> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  const skip = (page - 1) * limit;
  const queryParams = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });
  const endpoint = `${API_URL}/api/alerts/by-status/${status}?${queryParams.toString()}`;
  const response = await fetch(endpoint, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.statusText} (Status: ${response.status}) - ${errorText}`);
  }
  return await response.json();
}

export async function markAlertAsReadClient(alertId: number, token: string): Promise<Alert> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  const endpoint = `${API_URL}/api/alerts/${alertId}/read`;
  const response = await fetch(endpoint, { method: 'PUT', headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error marking alert as read: ${response.statusText} - ${errorText}`);
  }
  return await response.json();
} 