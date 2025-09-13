/**
 * Configurações globais da aplicação
 */

// URL base da API
// Always use Docker Compose service name for internal API calls
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://backend-api:8000/api';

// Outras configurações
export const APP_NAME = 'Clinical Corvus';
export const DEFAULT_PAGINATION_LIMIT = 20;

// Security settings
export const SECURE_COOKIE = false;

// Try to use the Docker service name 'backend' if we're in a dockerized environment
export const getAPIUrl = () => {
  if (typeof window === 'undefined') { // Server-side
    // When running server-side (e.g., in Next.js API routes),
    // use the internal Docker service name or a specific internal URL.
    const serverUrl = process.env.INTERNAL_API_URL || 'http://backend-api:8000/api';
    console.log(`getAPIUrl: Server-side, using internal URL for backend: ${serverUrl}`);
    return serverUrl;
  } else { // Client-side
    // When running in the browser, API calls should be relative to the current host,
    // so they go to the Next.js server which then proxies to the backend.
    // process.env.NEXT_PUBLIC_API_URL could be used if the client needs to call an API directly
    // that is publicly accessible and different from the Next.js host, but that's not our case here.
    console.log(`getAPIUrl: Client-side, returning empty string for relative API paths.`);
    return ''; // Return empty string to make API calls relative, e.g., /api/endpoint
  }
};