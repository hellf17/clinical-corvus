import { SelectedPatientProvider } from '@/context/SelectedPatientContext';
import PatientHeader from '@/components/patients/PatientHeader'; 
import { getPatientById } from '@/services/patientService.server'; 
import { notFound, redirect } from 'next/navigation'; // For handling errors/not found
import { currentUser } from '@clerk/nextjs/server'; // For auth check
import { getUserRole } from '@/lib/roles'; // For role check
import { Patient } from '@/types/patient';
// import PatientDetailLayout from '@/components/layout/PatientDetailLayout'; // Likely unused if we restructure
import React from 'react';
import { Separator } from "@/components/ui/Separator";
import { AlertsPanel } from '@/components/patients/AlertsPanel';
// UserNav might be part of AppSidebar or a main header, ensure no duplication if AppSidebar is added.
// import { UserNav } from '@/components/layout/UserNav'; 
// import { SidebarSeparator } from '@/components/ui/Sidebar'; // Likely part of AppSidebar's structure

import AppSidebar from '@/components/layout/Sidebar'; // Import AppSidebar
import PatientStoreUpdater from '@/components/patients/PatientStoreUpdater'; // Import the updater

interface PatientLayoutProps {
  children: React.ReactNode;
  params: { id: string }; // Get id from params prop
}

// This layout handles fetching a specific patient and setting up context
export default async function PatientLayout({ children, params }: PatientLayoutProps) {
  const { id } = params;
  const user = await currentUser();
  const userRole = user ? await getUserRole(user.id) : null;

  // --- Auth Checks ---
  if (!user) {
    redirect('/sign-in');
  }
  if (!userRole || !['doctor', 'patient'].includes(userRole)) { 
      redirect('/unauthorized');
  }

  let patient: Patient | null = null;

  try {
    // Simplified logic: getPatientById should handle auth or throw an error that leads to notFound/redirect
    patient = await getPatientById(id); 
    
    // If user is a patient, Clerk session already implies their ID. 
    // The API at getPatientById (e.g., /api/patients/{id}) MUST verify 
    // if the authenticated user (if role 'patient') is the owner of the record.
    // Or if role 'doctor', that the doctor is authorized for this patient.
    // This layout shouldn't re-implement complex auth checks already (or that *should be*) in the API.

  } catch (error: any) {
    console.error(`PatientLayout: Error fetching patient ${id}:`, error.message);
    if (error.message?.includes('403') || error.message?.includes('Unauthorized')) {
         redirect('/unauthorized');
    } else if (error.message?.includes('404') || error.message?.includes('Not found')) {
       notFound(); 
    } else {
        // Generic error, could be network, API down, etc.
        // Consider a more user-friendly error page for these cases.
        // For now, treating as 'not found' or 'unauthorized' for simplicity.
        console.error("PatientLayout: Unhandled error type during patient fetch. Defaulting to notFound.");
        notFound(); 
    }
  }

  if (!patient) {
    // This should ideally be caught by the error handling above, but as a fallback.
    console.warn(`PatientLayout: Patient ${id} is null after fetch and error handling. Triggering notFound.`);
    notFound();
  }
  
  const patientIdNum = parseInt(id, 10); // Renamed to avoid conflict if patient.id is string
  if (isNaN(patientIdNum)) {
    console.warn(`PatientLayout: Invalid patient ID format: ${id}. Triggering notFound.`);
    notFound();
  }
  
  // patientData is 'patient' fetched above.
  // const patientNavItems = [ ... ]; // REMOVED as AppSidebar will handle this

  return (
    <SelectedPatientProvider>
      {/* Update Zustand store with the current patient ID */}
      <PatientStoreUpdater patientId={patient.patient_id} /> 
      <div className="min-h-screen flex flex-col bg-muted/40"> {/* Ensure this is the outermost div if it dictates page bg */}
        <div className="flex flex-1 min-h-0"> {/* This flex container is key */}
          <AppSidebar /> {/* Main application sidebar */}
          
          <div className="flex flex-col flex-1 min-w-0"> {/* This flex container takes remaining space */}
            {/* A main header could go here if needed, above the patient-specific content */}
            {/* e.g., <MainApplicationHeader user={user} /> */}

            <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8 overflow-y-auto"> {/* Added overflow-y-auto */}
              {/* Patient-specific header */}
              <div className="my-4">
                <PatientHeader patient={patient} /> {/* patient object is already fetched and validated */}
              </div>
              
              {/* Container for the main content of the patient section */}
              <div className="container mx-auto p-0 md:p-2 lg:p-4"> {/* Adjusted padding for better nesting */}
                <div className="space-y-0.5 mb-6">
                  {/* Title now uses patient.name directly */}
                  <h2 className="text-2xl font-bold tracking-tight">Paciente: {patient.name}</h2> 
                  <p className="text-muted-foreground">
                    Gerencie as informações clínicas e laboratoriais do paciente.
                  </p>
                </div>
                <Separator className="my-6" />
                
                {/* Main content area for patient sub-pages */}
                {/* The <aside> for local navigation is removed. AppSidebar provides patient context nav. */}
                <div className="flex-1 space-y-6"> {/* Removed lg:max-w-4xl to allow full use of space by children */}
                     <AlertsPanel patientId={patientIdNum} initialLoad={true} /> 
                     <Separator /> 
                    {children}
                  </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </SelectedPatientProvider>
  );
}

// The TODO for getPatientById should already be addressed in '@/services/patientService.server.ts'
// Ensure that service correctly handles API calls, errors, and authorization.

// TODO: Implement getPatientById(id: string): Promise<Patient | null> in '@/services/patientService.ts'
/* Example structure in src/services/patientService.ts:
import { Patient } from "@/types"; // Assuming Patient type definition
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://backend-api:8000'; // Adjust as needed

export async function getPatientById(id: string): Promise<Patient | null> {
  try {
    const response = await fetch(`${API_URL}/patients/${id}`); // Use your actual API endpoint
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Patient not found
      }
      throw new Error(`API error: ${response.statusText}`);
    }
    const patient: Patient = await response.json();
    return patient;
  } catch (error) {
    console.error('Error fetching patient by ID:', error);
    throw error; // Re-throw or handle as appropriate (e.g., return null)
  }
}
*/ 