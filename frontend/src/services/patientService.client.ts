import { Patient, PatientCreate, PatientListResponse, PatientSummary, Exam } from '@/types/patient';
import { API_URL } from '@/lib/config';

/**
 * Creates a new patient using a client-side fetch call.
 * 
 * @param patientData The data for the new patient.
 * @param token The authentication token obtained from useAuth().getToken().
 * @returns The created patient data.
 * @throws Error if the creation fails.
 */
export async function createPatientClient(patientData: PatientCreate, token: string): Promise<Patient> {
  if (!token) {
    throw new Error("Authentication token is required to create a patient.");
  }

  const url = `${API_URL}/api/patients/`;
  console.log(`Creating patient at: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patientData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Try to parse error details
      console.error(`API error creating patient: ${response.status} ${response.statusText}`, errorData);
      throw new Error(errorData.detail || `Failed to create patient: ${response.statusText}`);
    }

    const createdPatient: Patient = await response.json();
    console.log("Patient created successfully:", createdPatient);
    return createdPatient;

  } catch (error: any) {
    console.error("Network or other error creating patient:", error);
    // Re-throw the error for the form to catch and display
    throw error; 
  }
}

export async function deletePatientClient(patientId: number | string, token: string): Promise<void> {
  if (!token) throw new Error('Token de autenticação não fornecido.');
  const headers: HeadersInit = {
    'Authorization': `Bearer ${token}`,
  };
  const endpoint = `${API_URL}/api/patients/${patientId}`;
  const response = await fetch(endpoint, { method: 'DELETE', headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro ao deletar paciente: ${response.status} - ${errorText}`);
  }
}

// Interface for query parameters for fetching patients client-side
interface GetPatientsParams {
  page?: number;
  limit?: number;
  search?: string;
  // Add other potential filters like status, doctorId, etc.
}

/**
 * Fetches a list of patients from the backend API (client-side).
 * Requires authentication token.
 * 
 * @param params Query parameters for pagination, search, filtering.
 * @param token Authentication token.
 * @returns A promise resolving to the paginated list of patients.
 */
export async function getPatientsClient(params: GetPatientsParams, token: string): Promise<PatientListResponse> {
     if (!token) {
    throw new Error("Authentication token is required to fetch patients.");
  }

    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    // Append other filters as needed

    const url = `${API_URL}/api/patients/?${query.toString()}`;
    console.log(`Fetching patients (client-side) from: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store', // Often want fresh patient lists
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error(`API error fetching patients: ${response.status} ${response.statusText}`, errorData);
            throw new Error(errorData.detail || `Failed to fetch patients: ${response.statusText}`);
        }

        const data: PatientListResponse = await response.json();
        // Basic validation
        if (!data || !Array.isArray(data.items) || typeof data.total !== 'number') {
            console.error('Invalid patient list response format:', data);
            throw new Error('Received invalid data format for patient list.');
        }
        return data;

    } catch (error: any) {
        console.error("Network or other error fetching patients:", error);
        throw error; // Re-throw for the component to handle
    }
}

export async function getPatientByIdClient(patientId: string): Promise<Patient | null> {
  const endpoint = `${API_URL}/api/patients/${patientId}`;
  const response = await fetch(endpoint, { headers: { 'Content-Type': 'application/json' } });
  if (!response.ok) {
    if (response.status === 404) return null;
    const errorText = await response.text();
    throw new Error(`Erro ao buscar paciente: ${response.status} - ${errorText}`);
  }
  return await response.json();
}

export async function getPatientLabResultsClient(
  patientId: number | string,
  token: string,
  { page = 1, limit = 1000 }: { page?: number; limit?: number } = {}
): Promise<{ items: any[]; total: number }> {
  if (!token) {
    throw new Error('Authentication token not provided.');
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  const skip = (page - 1) * limit;
  const queryParams = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });
  const endpoint = `${API_URL}/api/patients/${patientId}/lab_results?${queryParams.toString()}`;
  const response = await fetch(endpoint, { headers });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error fetching lab results: ${response.statusText} - ${errorText}`);
  }
  return await response.json();
}

export async function addManualLabResultClient(
  patientId: number | string,
  inputData: any,
  token: string
): Promise<any> {
  if (!token) throw new Error('Authentication token not provided.');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  const endpoint = `${API_URL}/api/patients/${patientId}/lab_results`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(inputData),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error adding manual lab result: ${response.statusText} - ${errorText}`);
  }
  return await response.json();
}

export async function addVitalSignClient(
  patientId: number | string,
  apiData: any,
  token: string
): Promise<any> {
  if (!token) throw new Error('Authentication token not provided.');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  const endpoint = `${API_URL}/api/patients/${patientId}/vital_signs`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(apiData),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error adding vital sign: ${response.statusText} - ${errorText}`);
  }
  return await response.json();
}

export async function addExamClient(
  patientId: number | string,
  examData: Omit<Exam, 'exam_id' | 'patient_id'>,
  token: string
): Promise<Exam> {
  if (!token) throw new Error('Authentication token not provided.');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
  const endpoint = `${API_URL}/api/patients/${patientId}/exams`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(examData),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error adding exam: ${response.statusText} - ${errorText}`);
  }
  return await response.json();
}

export async function deleteExamClient(
  patientId: number | string,
  examId: number | string,
  token: string
): Promise<void> {
  if (!token) throw new Error('Authentication token not provided.');
  const headers: HeadersInit = {
    'Authorization': `Bearer ${token}`,
  };
  const endpoint = `${API_URL}/api/patients/${patientId}/exams/${examId}`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error deleting exam: ${response.statusText} - ${errorText}`);
  }
} 