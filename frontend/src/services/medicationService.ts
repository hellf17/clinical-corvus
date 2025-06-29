import { Medication, MedicationCreate, MedicationUpdate } from '../types/medication';
import { MedicationStatus } from "../types/enums";
import { API_URL } from "@/lib/config"; // Use shared config

// Define response type for list operations (adjust if backend doesn't return total)
interface MedicationListResponse {
    items: Medication[];
    // total: number; // Backend doesn't seem to return total for this endpoint
}

// --- Medication Service Functions ---

/**
 * Fetches medications for a specific patient.
 * Calls backend GET /api/patients/{patient_id}/medications
 * Requires authentication token.
 */
async function getPatientMedications(
    patientId: number | string, 
    token: string, 
    status?: MedicationStatus | null, 
    skip: number = 0, 
    limit: number = 100,
    sortBy: string = 'start_date',
    sortOrder: string = 'desc'
): Promise<Medication[]> { // Returns array directly based on backend response
    if (!token) {
        console.error("getPatientMedications: Auth token is required.");
        throw new Error("Authentication failed: Token not provided.");
    }

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const queryParams = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
        sort_by: sortBy,
        sort_order: sortOrder
    });
    if (status) {
        queryParams.append('status', status);
    }

    const endpoint = `${API_URL}/api/patients/${patientId}/medications?${queryParams.toString()}`;

    try {
        const response = await fetch(endpoint, { headers, cache: 'no-store' });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API error fetching medications for patient ${patientId}: ${response.status} ${response.statusText}`, errorText);
            throw new Error(`API error fetching medications: ${response.statusText} - ${errorText}`);
        }

        const data: Medication[] = await response.json(); // Expects an array of Medication
        return data || []; // Return empty array if data is null/undefined

    } catch (error) {
        console.error(`Error in getPatientMedications for patient ${patientId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error(String(error));
    }
}

/**
 * Creates a new medication for a patient.
 * Calls backend POST /api/patients/{patient_id}/medications
 * Requires authentication token.
 */
async function createPatientMedication(
    patientId: number | string,
    medicationData: Omit<MedicationCreate, 'patient_id'>, // Use Omit as patient_id comes from path
    token: string
): Promise<Medication> {
    if (!token) {
        console.error("createPatientMedication: Auth token is required.");
        throw new Error("Authentication failed: Token not provided.");
    }

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const endpoint = `${API_URL}/api/patients/${patientId}/medications`;
    const body = JSON.stringify(medicationData);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body,
        });

        if (!response.ok) {
            let errorMsg = `API error creating medication: ${response.status} ${response.statusText}`;
            try {
                const errorBody = await response.json();
                 errorMsg += ` - ${JSON.stringify(errorBody.detail || errorBody)}`;
            } catch (jsonError) {
                 errorMsg += ` - ${await response.text()}`;
            }
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        const newMedication: Medication = await response.json();
        return newMedication;

    } catch (error) {
        console.error('Error in createPatientMedication:', error);
        if (error instanceof Error) throw error;
        throw new Error(String(error));
    }
}

/**
 * Updates an existing medication.
 * Calls backend PATCH /api/medications/{medication_id}
 * Requires authentication token.
 */
async function updateMedication(
    medicationId: number | string,
    medicationUpdateData: MedicationUpdate,
    token: string
): Promise<Medication> {
     if (!token) {
        console.error("updateMedication: Auth token is required.");
        throw new Error("Authentication failed: Token not provided.");
    }

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const endpoint = `${API_URL}/api/medications/${medicationId}`;
    const body = JSON.stringify(medicationUpdateData);

    try {
        const response = await fetch(endpoint, {
            method: 'PATCH', // Use PATCH for partial updates
            headers,
            body,
        });

        if (!response.ok) {
            let errorMsg = `API error updating medication ${medicationId}: ${response.status} ${response.statusText}`;
            try {
                const errorBody = await response.json();
                 errorMsg += ` - ${JSON.stringify(errorBody.detail || errorBody)}`;
            } catch (jsonError) {
                 errorMsg += ` - ${await response.text()}`;
            }
            console.error(errorMsg);
            throw new Error(errorMsg);
        }

        const updatedMedication: Medication = await response.json();
        return updatedMedication;

    } catch (error) {
        console.error(`Error updating medication ${medicationId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error(String(error));
    }
}

/**
 * Deletes a medication.
 * Calls backend DELETE /api/medications/{medication_id}
 * Requires authentication token.
 */
async function deleteMedication(
    medicationId: number | string,
    token: string
): Promise<void> {
    if (!token) {
        console.error("deleteMedication: Auth token is required.");
        throw new Error("Authentication failed: Token not provided.");
    }

    const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
    };

    const endpoint = `${API_URL}/api/medications/${medicationId}`;

    try {
        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers,
        });

        if (!response.ok) {
             let errorMsg = `API error deleting medication ${medicationId}: ${response.status} ${response.statusText}`;
            try {
                const errorBody = await response.json();
                 errorMsg += ` - ${JSON.stringify(errorBody.detail || errorBody)}`;
            } catch (jsonError) {
                 errorMsg += ` - ${await response.text()}`;
            }
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
        // No content expected on successful DELETE (204)
        
    } catch (error) {
        console.error(`Error deleting medication ${medicationId}:`, error);
        if (error instanceof Error) throw error;
        throw new Error(String(error));
    }
}

// Export functions individually or as an object
export const medicationService = {
    getPatientMedications,
    createPatientMedication,
    updateMedication,
    deleteMedication,
}; 