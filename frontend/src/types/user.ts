// Defines the possible roles a user can have within the application
export type UserRole = 'doctor' | 'patient' | 'admin' | 'guest';

// Optional: Add other user-related types if needed
export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  // Add other relevant profile fields
} 