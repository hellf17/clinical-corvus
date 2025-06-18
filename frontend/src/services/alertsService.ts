import { API_BASE_URL } from '@/lib/config';
import { fetchWithAuth } from '@/lib/fetchWithAuth'; // Use fetchWithAuth helper
import { Alert as AlertType, AlertListResponse } from '@/types/alerts'; // Import frontend types

// Define frontend type based on schema (adjust if needed)
export type { Alert as AlertType, AlertListResponse } from '@/types/alerts';

/**
 * Fetches alerts for a specific patient.
 */
async function getPatientAlerts(
    patientId: number | string,
    token: string,
    options: { onlyActive?: boolean; page?: number; limit?: number } = {}
): Promise<AlertListResponse> {
    const { onlyActive = true, page = 1, limit = 50 } = options;
    const skip = (page - 1) * limit;
    
    const queryParams = new URLSearchParams({
        only_active: String(onlyActive),
        skip: skip.toString(),
        limit: limit.toString(),
    });

    const endpoint = `/alerts/patient/${patientId}?${queryParams.toString()}`;
    
    try {
        const response = await fetchWithAuth(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ detail: 'Failed to fetch alerts' }));
             throw new Error(errorData.detail || `Failed to fetch alerts (${response.status})`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error fetching patient alerts:", error);
        throw error; // Re-throw the error for handling in the component
    }
}

/**
 * Updates an alert's status (e.g., mark as read).
 */
async function updateAlertStatus(
    alertId: number,
    updateData: { is_read?: boolean; status?: string },
    token: string
): Promise<AlertType> {
    const endpoint = `/alerts/${alertId}`;
    
    try {
        const response = await fetchWithAuth(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(updateData),
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
             const errorData = await response.json().catch(() => ({ detail: 'Failed to update alert' }));
            throw new Error(errorData.detail || `Failed to update alert (${response.status})`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error updating alert ${alertId}:`, error);
        throw error;
    }
}

export const alertsService = {
    getPatientAlerts,
    updateAlertStatus,
    // Placeholder for potentially getting alert summary/count
    // getAlertSummary: async (patientId: string, token: string) => { ... }
}; 