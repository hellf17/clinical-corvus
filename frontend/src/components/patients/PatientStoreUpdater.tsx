'use client';

import { useEffect } from 'react';
import { usePatientStore } from '@/store/patientStore';

interface PatientStoreUpdaterProps {
  patientId: string | number | null;
}

const PatientStoreUpdater: React.FC<PatientStoreUpdaterProps> = ({ patientId }) => {
  const { selectPatient } = usePatientStore();

  useEffect(() => {
    // Update the Zustand store with the current patient ID from the layout
    // This will allow AppSidebar's patientContextItems to react.
    if (patientId !== undefined && patientId !== null) { // Check if patientId is provided and not null
      const idToSet = typeof patientId === 'string' ? parseInt(patientId, 10) : patientId;
      if (!isNaN(idToSet)) { // Ensure conversion was successful if it was a string
        console.log(`PatientStoreUpdater: Setting selected patient ID in Zustand store to: ${idToSet}`);
        selectPatient(idToSet);
      } else if (typeof patientId === 'string') {
        console.warn(`PatientStoreUpdater: patientId string '${patientId}' could not be parsed to a number.`);
        selectPatient(null); // Or handle error appropriately
      }
    } else if (patientId === null) {
      console.log(`PatientStoreUpdater: patientId is null, setting selected patient ID in Zustand store to null.`);
      selectPatient(null);
    }

    // Optional: Clear the selected patient ID when the component unmounts
    // or when navigating away from a specific patient page where this updater is used.
    // This might be useful if AppSidebar should not show a context menu when on general pages.
    // return () => {
    //   console.log("PatientStoreUpdater: Clearing selected patient ID on unmount/navigation.");
    //   selectPatient(null); 
    // };
  }, [patientId, selectPatient]);

  return null; // This component does not render anything
};

export default PatientStoreUpdater; 