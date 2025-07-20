// Convert to Server Component if possible, or keep as Client Component if interactions require it.
// For now, assume it can be a Server Component receiving data via props.
// 'use client'; // Remove if converting to Server Component

import React from 'react';
// import { useParams, useRouter } from 'next/navigation'; // Remove if Server Component
// import { usePatientStore } from '@/store/patientStore'; // Remove store dependency
import PatientCard from '@/components/patients/PatientCard';
import RiskScoresDashboard from '@/components/RiskScoresDashboard';
import ExamResultsDashboard from '@/components/ExamResultsDashboard';
import SystemExamsViewer from '@/components/SystemExamsViewer';
import ResultsTimelineChart from '@/components/charts/ResultsTimelineChart';
import AIChat from '@/components/patients/AIChat';
import { Switch } from "@/components/ui/Switch";
import { Label } from "@/components/ui/Label";
import { toast } from "@/components/ui/use-toast"; 
// import { Patient } from '@/types/patient'; // Import Patient type - REMOVED as it's re-imported below
import { getPatientById } from '@/services/patientService.server'; // CORRECTED IMPORT
import { clinicalNoteService } from '@/services/clinicalNoteService'; // Import the service object
import { getVitalSigns } from '@/services/vitalSignsService'; // Import named function
import { notFound } from 'next/navigation';
// Import components needed only on client-side separately if converting
import PatientOverviewClient from '@/components/patients/PatientOverviewClient';
// Correct Type Imports
import type { ClinicalNote, ClinicalNoteList } from '@/types/clinical_note'; // Import type
import type { VitalSign } from '@/types/health'; // Import type
// Use the Exam type from @/types/patient
import type { Patient, Exam as PatientExamType } from '@/types/patient';

interface PatientOverviewPageProps {
  params: { id: string };
  // We expect Next.js to make data fetched in layout available, 
  // but the mechanism isn't clear. Let's explicitly fetch here for now.
}

// This page is now a Server Component that fetches data and passes it to the Client Component.
export default async function PatientOverviewPage({ params }: PatientOverviewPageProps) {
  const { id } = params;
  
  // Fetch patient data, notes, vitals, and labs concurrently (Server Component)
  // NOTE: Services need auth handling if required (e.g., fetching a service token or using cookies)
  // For now, assume services can be called server-side without explicit token passing.
  // Adjust if auth is needed (might require moving fetching to Client Component with useAuth).
  const [patient, notesResult, vitalsResult]: [ 
    Patient | null, 
    ClinicalNoteList | null, 
    VitalSign[] | null 
    // labsResult removed
  ] = await Promise.all([
    getPatientById(id),
    clinicalNoteService.getNotes(id), 
    getVitalSigns(id)
    // getLabResults(id) removed
  ]).catch(error => {
    console.error(`Error fetching data for patient ${id} in overview:`, error);
    return [null, null, null]; // Adjusted for removed labsResult
  });

  if (!patient) {
    console.error(`Patient data could not be fetched or is null for id: ${id}.`);
    // Consider calling notFound() here if patient is critical for the page
    // For now, we allow passing null to the client component to handle it.
    // notFound(); // Uncomment if patient MUST exist
  }

  const clinicalNotes: ClinicalNote[] = notesResult?.notes || []; 
  const vitalSigns: VitalSign[] = vitalsResult || [];
  
  // Populate exams from the patient object, which should now include them with lab_results
  const exams_for_prop: PatientExamType[] = patient?.exams || [];

  return (
    <PatientOverviewClient 
        patient={patient} 
        clinicalNotes={clinicalNotes} 
        vitalSigns={vitalSigns} 
        exams={exams_for_prop} // Pass correctly populated exams
    />
  );
}