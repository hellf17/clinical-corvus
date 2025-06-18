export type AlertSeverity = 'critical' | 'severe' | 'moderate' | 'warning' | 'info' | 'normal' | 'low' ;

export interface Alert {
  alert_id: number;
  patient_id: number;
  patient_name?: string;
  category: string;
  parameter: string;
  message: string;
  value?: string | number;
  reference?: string;
  severity: AlertSeverity;
  interpretation?: string;
  recommendation?: string;
  created_at: string;
  status?: 'read' | 'unread';
}

export interface AlertSummary {
  by_severity: {
    critical: number;
    severe: number;
    moderate: number;
    warning: number;
    info: number;
    normal: number;
  };
  by_category: Record<string, number>;
  total: number;
  patient_id: string;
}

export interface AlertListResponse {
  items: Alert[];
  total: number;
} 