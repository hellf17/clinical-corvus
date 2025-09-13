import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { usePatientStore } from '@/store/patientStore';

export const useInitializePatients = () => {
  const { isSignedIn, getToken } = useAuth();
  const { fetchInitialPatients, isLoading } = usePatientStore();

  useEffect(() => {
    if (isSignedIn && !isLoading) {
      // Initialize patients when user is authenticated
      const initPatients = async () => {
        try {
          const token = await getToken();
          if (token) {
            // Update the store to use the token properly
            fetchInitialPatients();
          }
        } catch (error) {
          console.error('Failed to initialize patients:', error);
        }
      };

      initPatients();
    }
  }, [isSignedIn, getToken, fetchInitialPatients, isLoading]);
};