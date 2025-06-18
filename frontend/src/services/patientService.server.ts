'use server'; 

import { auth } from '@clerk/nextjs/server';
import { Patient, PatientListResponse } from "@/types/patient";
import { API_URL } from "@/lib/config";

export async function getClerkAuthToken(): Promise<string | null> {
  try {
    const { getToken } = await auth();
    const token = await getToken();
    if (!token) {
        console.warn('getClerkAuthToken: Clerk token not found.');
    }
    return token;
  } catch (error) {
      console.error('Error retrieving Clerk auth token:', error);
      return null; 
  }
}

/**
 * Fetches a specific patient by their ID from the backend API.
 * SERVER-SIDE USE ONLY.
 * Includes authorization via Clerk server-side auth.
 * 
 * @param id The ID of the patient to fetch.
 * @returns The patient data or null if not found.
 * @throws Error if the fetch fails or authorization issues occur (e.g., 403, 500).
 */
export async function getPatientById(id: string): Promise<Patient | null> {
  const { getToken } = await auth(); // Get server-side token helper
  const token = await getToken();

  if (!token) {
    // This case should ideally be handled by Clerk middleware protecting the route/page
    // calling this function. If called without auth context, it will throw here.
    console.error('getPatientById (server): Authentication token not available server-side.');
    throw new Error('Authentication token not available server-side.');
  }

  const url = `${API_URL}/api/patients/${id}`;
  // console.log(`Fetching patient data from: ${url} (server-side)`); // Optional: server-side log

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Ensure fresh data is fetched for server components
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Patient with ID ${id} not found (404) (server-side).`);
        return null; // Return null for not found
      } else if (response.status === 403) {
         console.warn(`Forbidden (403) fetching patient ${id} (server-side).`);
         // Re-throw specific error for layout/page to catch and handle (e.g., notFound() or redirect)
         throw new Error('403 Forbidden'); 
      } else {
        // Handle other errors (e.g., 500)
        const errorText = await response.text();
        console.error(`API error fetching patient ${id} (server-side): ${response.status} ${response.statusText}`, errorText);
        throw new Error(`API error (server): ${response.statusText} - ${errorText}`);
      }
    }

    const patient: Patient = await response.json();
    return patient;

  } catch (error) {
    console.error(`Network or other error fetching patient by ID ${id} (server-side):`, error);
    // Re-throw the error so the calling component (layout/page) can handle it
    throw error; 
  }
}

export async function getPatientsServer(
  { page = 1, limit = 10, search = '' }: 
  { page?: number; limit?: number; search?: string } = {}
): Promise<PatientListResponse> {
  const token = await getClerkAuthToken();
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  // If no token for a server component, the API itself should ideally handle auth 
  // or this function could throw if a token is always expected for this operation.

  const skip = (page - 1) * limit;
  const queryParams = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
  if (search) {
    queryParams.append('search', search);
  }
  const endpoint = `${API_URL}/api/patients?${queryParams.toString()}`;

  try {
    console.log(`Fetching patients server-side from ${endpoint}`);
    const response = await fetch(endpoint, { headers, cache: 'no-store' }); // no-store for server-side fetches for freshness

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error fetching patients (server-side): ${response.status} ${response.statusText}`, errorText);
      throw new Error(`API error (getPatientsServer): ${response.statusText} (Status: ${response.status}) - ${errorText}`);
    }

    const result: PatientListResponse = await response.json();
    return result && Array.isArray(result.items) ? result : { items: [], total: 0 }; 

  } catch (error) {
    console.error('Error in getPatientsServer:', error);
    throw error; 
  }
} 