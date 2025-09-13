import { Patient, PatientCreate, PatientListResponse, PatientSummary, Exam } from '@/types/patient';
import { assignPatientToGroup } from './groupService'; // Import group service function

/**
 * Creates a new patient using Next.js proxy route.
 *
 * @param patientData The data for the new patient.
 * @returns The created patient data.
 * @throws Error if the creation fails.
 */
export async function createPatientClient(patientData: PatientCreate): Promise<Patient> {
  const url = `/api/patients`;
  console.log(`Creating patient at: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
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

/**
 * Creates a new patient and optionally assigns them to a group using Next.js proxy route.
 *
 * @param patientData The data for the new patient.
 * @param groupId Optional group ID to assign the patient to.
 * @returns The created patient data.
 * @throws Error if the creation fails.
 */
export async function createPatientWithGroupAssignment(patientData: PatientCreate, groupId?: number): Promise<Patient> {
  const url = `/api/patients`;
  console.log(`Creating patient at: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
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
    
    // If a group ID was provided, assign the patient to that group
    if (groupId) {
      try {
        await assignPatientToGroup(groupId, { patient_id: createdPatient.patient_id });
        console.log(`Patient assigned to group ${groupId} successfully.`);
      } catch (groupError: any) {
        console.error(`Failed to assign patient to group ${groupId}:`, groupError);
        // We don't throw this error as the patient was created successfully
        // The group assignment failure is logged but doesn't prevent patient creation
      }
    }
    
    return createdPatient;

  } catch (error: any) {
    console.error("Network or other error creating patient:", error);
    // Re-throw the error for the form to catch and display
    throw error;
  }
}





/**
 * Updates an existing patient using Next.js proxy route.
 *
 * @param patientId The ID of the patient to update.
 * @param patientData The updated patient data.
 * @param groupId Optional group ID to assign the patient to.
 * @returns The updated patient data.
 * @throws Error if the update fails.
 */
export async function updatePatientClient(patientId: number, patientData: Partial<Patient>, groupId?: number): Promise<Patient> {
  const url = `/api/patients/${patientId}`;
  console.log(`Updating patient at: ${url}`);

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(patientData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // Try to parse error details
      console.error(`API error updating patient: ${response.status} ${response.statusText}`, errorData);
      throw new Error(errorData.detail || `Failed to update patient: ${response.statusText}`);
    }

    const updatedPatient: Patient = await response.json();
    console.log("Patient updated successfully:", updatedPatient);
    
    // If a group ID was provided, assign the patient to that group
    if (groupId !== undefined) {
      try {
        // First, remove patient from current group if any
        // Then, assign patient to new group if provided
        if (groupId) {
          await assignPatientToGroup(groupId, { patient_id: patientId });
          console.log(`Patient assigned to group ${groupId} successfully.`);
        }
      } catch (groupError: any) {
        console.error(`Failed to assign patient to group ${groupId}:`, groupError);
        // We don't throw this error as the patient was updated successfully
        // The group assignment failure is logged but doesn't prevent patient update
      }
    }
    
    return updatedPatient;

  } catch (error: any) {
    console.error("Network or other error updating patient:", error);
    // Re-throw the error for the form to catch and display
    throw error;
  }
}

export async function deletePatientClient(patientId: number | string): Promise<void> {
  const endpoint = `/api/patients/${patientId}`;
  const response = await fetch(endpoint, { method: 'DELETE' });
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
  groupId?: number; // Add group filter
  // Add other potential filters like status, doctorId, etc.
}

/**
 * Fetches a list of patients using Next.js proxy route.
 *
 * @param params Query parameters for pagination, search, filtering.
 * @returns A promise resolving to the paginated list of patients.
 */
export async function getPatientsClient(params: GetPatientsParams): Promise<PatientListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.groupId) query.append('group_id', params.groupId.toString()); // Add group filter
    // Append other filters as needed

    const url = `/api/patients?${query.toString()}`;
    console.log(`Fetching patients (client-side) from: ${url}`);

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
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
  const endpoint = `/api/patients/${patientId}`;
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
  { page = 1, limit = 1000 }: { page?: number; limit?: number } = {}
): Promise<{ items: any[]; total: number }> {
  const skip = (page - 1) * limit;
  const queryParams = new URLSearchParams({
    skip: skip.toString(),
    limit: limit.toString(),
  });
  const endpoint = `/api/patients/${patientId}/labs?${queryParams.toString()}`;
  const response = await fetch(endpoint, {
    headers: { 'Content-Type': 'application/json' }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error fetching lab results: ${response.statusText} - ${errorText}`);
  }
  return await response.json();
}

export async function addManualLabResultClient(
  patientId: number | string,
  inputData: any
): Promise<any> {
  const endpoint = `/api/patients/${patientId}/labs`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  apiData: any
): Promise<any> {
  const endpoint = `/api/patients/${patientId}/vitals`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  examData: Omit<Exam, 'exam_id' | 'patient_id'>
): Promise<Exam> {
  const endpoint = `/api/patients/${patientId}/exams`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
  examId: number | string
): Promise<void> {
  const endpoint = `/api/patients/${patientId}/exams/${examId}`;
  const response = await fetch(endpoint, { method: 'DELETE' });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error deleting exam: ${response.statusText} - ${errorText}`);
  }
}