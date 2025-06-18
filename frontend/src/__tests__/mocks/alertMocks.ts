import { Alert } from '../../types/alerts';

export const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    category: 'vital-signs',
    parameter: 'blood-pressure',
    message: 'Critical blood pressure reading',
    value: '180/120',
    reference: '90/60-120/80',
    severity: 'critical',
    interpretation: 'Dangerously high blood pressure requiring immediate attention',
    recommendation: 'Immediate medical intervention required',
    date: '2023-10-10T10:00:00Z'
  },
  {
    id: 'alert-2',
    category: 'vital-signs',
    parameter: 'heart-rate',
    message: 'Elevated heart rate',
    value: 130,
    reference: '60-100',
    severity: 'severe',
    interpretation: 'Significantly elevated heart rate',
    recommendation: 'Urgent assessment needed',
    date: '2023-10-10T10:05:00Z'
  },
  {
    id: 'alert-3',
    category: 'lab-result',
    parameter: 'platelets',
    message: 'Abnormal platelet count',
    value: 90,
    reference: '150-450',
    severity: 'moderate',
    interpretation: 'Thrombocytopenia may indicate underlying condition',
    recommendation: 'Follow-up testing recommended',
    date: '2023-10-10T09:45:00Z'
  },
  {
    id: 'alert-4',
    category: 'lab-result',
    parameter: 'potassium',
    message: 'Low potassium level',
    value: 3.1,
    reference: '3.5-5.0',
    severity: 'warning',
    interpretation: 'Mild hypokalemia',
    recommendation: 'Consider dietary supplementation',
    date: '2023-10-09T14:30:00Z'
  },
  {
    id: 'alert-5',
    category: 'medication',
    parameter: 'prescription',
    message: 'New medication order requires review',
    value: 'Lisinopril',
    severity: 'info',
    interpretation: 'Standard review required',
    recommendation: 'Review medication interactions',
    date: '2023-10-10T08:15:00Z'
  }
]; 