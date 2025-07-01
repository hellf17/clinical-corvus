// Configuração mínima de exemplo
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Configuration settings for the frontend application

// Read the API URL from environment variables
// Ensure NEXT_PUBLIC_ prefix is used for client-side accessibility
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Add other shared configuration variables here if needed
// export const SOME_OTHER_CONFIG = process.env.NEXT_PUBLIC_SOME_OTHER_CONFIG || 'default_value'; 