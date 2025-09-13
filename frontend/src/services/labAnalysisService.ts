import { LabAnalysisResult } from '@/types/labAnalysis';

export const analyzeLabFile = async (formData: FormData): Promise<LabAnalysisResult> => {
  try {
    const response = await fetch('/api/lab-analysis', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to analyze file');
    }

    return response.json();
  } catch (error) {
    console.error('Error analyzing lab file:', error);
    throw error;
  }
};