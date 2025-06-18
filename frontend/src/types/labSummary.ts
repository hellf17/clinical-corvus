// Represents a single data point for the lab summary chart
// Keys like 'Glicemia', 'HbA1c' should match backend response
export interface LabTrendItem {
  name: string; // Typically the date or label for the x-axis
  [key: string]: string | number | undefined; // Allows for dynamic lab result keys (e.g., Glicemia, HbA1c)
}

// Represents the overall structure returned by the lab summary endpoint
// Assuming it's an array of trend items for now
export type LabSummary = LabTrendItem[]; 