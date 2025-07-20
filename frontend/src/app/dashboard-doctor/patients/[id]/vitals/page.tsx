"use client"; // This page needs client-side interaction for the form

import React from 'react';
import { useParams } from 'next/navigation'; // Hook to get dynamic route parameters

import { VitalSignsEntryForm } from '@/components/patients/VitalSignsEntryForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";

export default function PatientVitalsPage() {
  const params = useParams();
  const patientId = params.id as string; // Get patient ID from URL

  if (!patientId) {
    // Handle case where ID might not be available initially or is invalid
    // This might happen during SSR/hydration, though unlikely with useParams
    return <div>Loading patient details...</div>; 
  }

  const handleSuccess = () => {
    // Optional: Add logic here if needed after successful save,
    // like redirecting or refreshing a list (if displaying history on this page later)
    console.log("Vitals saved successfully for patient:", patientId);
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Record Vital Signs</CardTitle>
          <CardDescription>
            Enter the latest vital signs measurements for the patient.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VitalSignsEntryForm patientId={patientId} onSuccess={handleSuccess} />
        </CardContent>
      </Card>

      {/* Placeholder for future: Display historical vital signs chart/table */}
    </div>
  );
} 