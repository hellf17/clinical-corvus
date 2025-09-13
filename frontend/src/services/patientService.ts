import { Patient } from '@/types/patient';
import { LabAnalysisResult } from '@/types/labAnalysis';
import { assignPatientToGroup } from './groupService'; // Import group service function

export const createPatient = async (patientData: Omit<Patient, 'patient_id'>, groupId?: number): Promise<Patient> => {
  try {
    const response = await fetch('/api/patients', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...patientData, group_id: groupId }),
    });

    if (!response.ok) {
      throw new Error('Failed to create patient');
    }

    const createdPatient: Patient = await response.json();
    
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
  } catch (error) {
    console.error('Error creating patient:', error);
    throw error;
  }
};

export const linkAnalysisToPatient = async (patientId: string, analysisData: LabAnalysisResult): Promise<void> => {
  try {
    const response = await fetch(`/api/patients/${patientId}/lab-results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisData),
    });

    if (!response.ok) {
      throw new Error('Failed to link analysis to patient');
    }
  } catch (error) {
    console.error('Error linking analysis to patient:', error);
    throw error;
  }
};