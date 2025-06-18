// import { auth } from "@clerk/nextjs/server"; // REMOVED: This makes the module server-only
import { Patient, PatientSummary, PatientListResponse, PatientCreate } from "@/types/patient";
import { LabResult, PaginatedLabResultsResponse, ManualLabResultInput, VitalSign, VitalSignCreateInput, CalculatedScoresResponse } from "@/types/health";
import { API_URL } from "@/lib/config";
import { Exam } from "@/types/patient";

/**
 * Fetches a paginated list of patients, with optional search filter.
 * Calls the backend GET /api/patients endpoint.
 * Requires authentication (token is attached).
 */
export async function getPatientsClient(
  { page = 1, limit = 10, search = '' }: 
  { page?: number; limit?: number; search?: string } = {},
  token: string | null // Client must provide token
): Promise<PatientListResponse> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('getPatientsClient called without a token.');
    // Depending on API, this might fail or return public data.
    // For protected routes, backend should deny.
  }
  const skip = (page - 1) * limit;
  const queryParams = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
  if (search) queryParams.append('search', search);
  const endpoint = `${API_URL}/api/patients?${queryParams.toString()}`;
  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (getPatientsClient): ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API error: ${response.statusText} (${response.status}) - ${errorText}`);
    }
    const result: PatientListResponse = await response.json();
    return result && Array.isArray(result.items) ? result : { items: [], total: 0 }; 
  } catch (error) {
    console.error('Error in getPatientsClient:', error);
    throw error; 
  }
}

/**
 * Fetches the profile for the currently logged-in patient user.
 * Uses Clerk token for authentication.
 * Calls GET /api/me/patient
 */
export async function getMyPatientProfile(token: string | null): Promise<Patient | null> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.warn('getMyPatientProfile called without a token.');
    // Backend will handle auth if token is missing for protected endpoint
  }
  const endpoint = `${API_URL}/api/me/patient`;
  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      if (response.status === 404) {
        console.warn('No patient profile found for current user (404).');
        return null;
      }
      const errorText = await response.text();
      console.error(`API error (getMyPatientProfile): ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API error: ${response.statusText} (${response.status}) - ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error in getMyPatientProfile:', error);
    throw error;
  }
}

/**
 * Creates a new patient record.
 * Calls the backend POST /api/patients endpoint.
 * Requires authentication token passed from the client.
 */
export async function createPatient(patientData: PatientCreate, token: string): Promise<Patient> {
    if (!token) {
        console.error("createPatient: Authentication token is required.");
        throw new Error("Authentication failed: Token not provided.");
    }

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };

    const endpoint = `${API_URL}/api/patients`;
    const body = JSON.stringify(patientData);

    console.log(`Attempting to create patient at ${endpoint}...`);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body,
        });

        if (!response.ok) {
            let errorMsg = `API error creating patient: ${response.status} ${response.statusText}`;
            try {
                const errorBody = await response.json();
                // Attempt to extract FastAPI/Pydantic validation errors
                if (errorBody.detail && Array.isArray(errorBody.detail)) {
                   errorMsg += ` - Details: ${errorBody.detail.map((e: any) => `${e.loc?.join('.')} -> ${e.msg}`).join('; ')}`;
                } else if (errorBody.detail) {
                    errorMsg += ` - ${JSON.stringify(errorBody.detail)}`;
                } else {
                    errorMsg += ` - ${await response.text()}` // Fallback to raw text
                }
            } catch (jsonError) {
                 // If response is not JSON, use text
                 errorMsg += ` - ${await response.text()}`;
            }
            console.error(errorMsg);
            throw new Error(errorMsg); // Throw detailed error
        }

        // Assuming the backend returns the created patient object on success (status 201)
        const newPatient: Patient = await response.json();
        console.log(`Patient "${newPatient.name}" created successfully with ID ${newPatient.patient_id}.`);
        return newPatient;

    } catch (error) {
        console.error('Error in createPatient:', error);
        // Ensure the thrown error is an Error object
        if (error instanceof Error) {
             throw error;
        } else {
             throw new Error(String(error));
        }
    }
}

/**
 * Deletes a specific patient by their ID.
 * Calls the backend DELETE /api/patients/{id} endpoint.
 * Requires authentication (token attached).
 * NOTE: This function is intended to be called from CLIENT-SIDE components 
 *       as it relies on the browser's fetch and Clerk's client-side token.
 *       The getClerkAuthToken() helper is for server-side use.
 *       You'll need to adapt this or use Clerk's client-side hooks for the token.
 */
export async function deletePatient(patientId: number | string, token: string): Promise<void> {
    if (!token) {
        throw new Error("Authentication token not provided.");
    }
    const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
    };
    const endpoint = `${API_URL}/api/patients/${patientId}`;
    try {
        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers,
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API error deleting patient ${patientId}: ${response.status} ${response.statusText} - ${errorText}`);
        }
    } catch (error) {
        console.error('Error in deletePatient:', error);
        if (error instanceof Error) throw error;
        throw new Error(String(error));
    }
}

/**
 * Fetches paginated lab results for a specific patient.
 * Calls backend GET /api/patients/{patient_id}/lab_results.
 * Requires authentication token.
 */
export async function getPatientLabResults(
  patientId: number | string,
  token: string,
  { page = 1, limit = 1000 }: { page?: number; limit?: number } = {}
): Promise<PaginatedLabResultsResponse> {
  if (!token) throw new Error("Token is required for fetching lab results.");
  const headers: HeadersInit = { 'Authorization': `Bearer ${token}` }; 
  const queryParams = new URLSearchParams({
      skip: ((page - 1) * limit).toString(),
      limit: limit.toString(),
  });
  const endpoint = `${API_URL}/api/patients/${patientId}/lab_results?${queryParams.toString()}`;
  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching patient lab results:', error);
    throw error;
  }
}

/**
 * Adds a single, manually entered lab result for a specific patient.
 * Calls backend POST /api/patients/{patient_id}/lab_results.
 * Requires authentication token.
 */
export async function addManualLabResult(
  patientId: number | string,
  labData: ManualLabResultInput,
  token: string
): Promise<LabResult> {
  if (!token) throw new Error("Token is required for adding lab result.");
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  const endpoint = `${API_URL}/api/patients/${patientId}/lab_results`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(labData),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(`API Error (${response.status}): ${JSON.stringify(errorBody.detail)}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding manual lab result:', error);
    throw error;
  }
}

/**
 * Adds a new vital sign record for a specific patient.
 * Calls backend POST /api/patients/{patient_id}/vital_signs.
 * Requires authentication token.
 */
export async function addVitalSign(
  patientId: number | string,
  vitalData: VitalSignCreateInput,
  token: string
): Promise<VitalSign> {
  if (!token) throw new Error("Token is required for adding vital sign.");
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  const endpoint = `${API_URL}/api/patients/${patientId}/vital_signs`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(vitalData),
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(`API Error (${response.status}): ${JSON.stringify(errorBody.detail)}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding vital sign:', error);
    throw error;
  }
}

/**
 * Fetches calculated severity scores for a specific patient.
 * Calls backend GET /api/patients/{patient_id}/scores.
 * Requires authentication token.
 */
export async function getPatientScores(
  patientId: number | string,
  token: string
): Promise<CalculatedScoresResponse> {
  if (!token) throw new Error("Token is required for fetching scores.");
  const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };
  const endpoint = `${API_URL}/api/scores/patient/${patientId}`;
  try {
    const response = await fetch(endpoint, { headers });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(`API Error (${response.status}): ${JSON.stringify(errorBody.detail)}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching patient scores:', error);
    throw error;
  }
}

/**
 * Updates a patient record.
 * Calls the backend PATCH /api/patients/{patient_id} endpoint.
 * Requires authentication token passed from the client.
 */
export async function updatePatient(
  patient_id: number,
  data: Partial<Omit<Patient, 'patient_id' | 'exams' | 'vitalSigns' | 'lab_results' | 'age'>>,
  token: string
): Promise<Patient> {
  if (!token) throw new Error("Token is required for updating patient.");
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  const endpoint = `${API_URL}/api/patients/${patient_id}`;
  try {
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(`API Error (${response.status}): ${JSON.stringify(errorBody.detail)}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating patient:', error);
    throw error;
  }
}

/**
 * Adds a new exam for a specific patient.
 * Calls backend POST /api/patients/{patient_id}/exams.
 * Requires authentication token.
 */
export async function addExam(
  patientId: number | string,
  examData: Omit<Exam, 'exam_id' | 'patient_id'>,
  token: string
): Promise<Exam> {
  if (!token) throw new Error("Token is required for adding exam.");
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  const endpoint = `${API_URL}/api/patients/${patientId}/exams`;
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(examData),
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(`API Error (${response.status}): ${JSON.stringify(errorBody.detail)}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error adding exam:', error);
    throw error;
  }
}

/**
 * Deletes an exam for a specific patient.
 * Calls backend DELETE /api/patients/{patient_id}/exams/{exam_id}.
 * Requires authentication token.
 */
export async function deleteExam(
  patientId: number | string,
  examId: number | string,
  token: string
): Promise<void> {
  if (!token) throw new Error("Token is required for deleting exam.");
  const headers: HeadersInit = { 'Authorization': `Bearer ${token}` };
  const endpoint = `${API_URL}/api/patients/${patientId}/exams/${examId}`;
  try {
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers,
    });
    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(`API Error (${response.status}): ${JSON.stringify(errorBody.detail)}`);
    }
  } catch (error) {
    console.error('Error deleting exam:', error);
    throw error;
  }
}

// Removed unused getAllPatients placeholder 