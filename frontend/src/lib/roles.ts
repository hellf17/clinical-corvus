import { clerkClient } from '@clerk/nextjs/server';

export type UserRole = 'doctor' | 'patient' | null; // Define possible roles

/**
 * Fetches the user's role from Clerk metadata.
 * Ensure you have configured 'role' in Clerk's public metadata for users.
 * @param userId The ID of the user.
 * @returns The user's role ('doctor', 'patient') or null if not found or error.
 */
export async function getUserRole(userId: string): Promise<UserRole> {
  if (!userId) {
    console.warn("getUserRole called with no userId");
    return null;
  }
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    // Access publicMetadata for the role
    const role = user?.publicMetadata?.role; 
    
    if (role === 'doctor' || role === 'patient') {
      return role;
    } else {
        console.warn(`User ${userId} has unexpected role in metadata: ${role}`);
        return null; // Return null if role is not doctor or patient
    }
    
  } catch (error) {
    console.error(`Error fetching user role for ${userId}:`, error);
    // Handle specific errors? e.g., user not found
    return null; // Return null on error
  }
}

// Ensure UserRole type is defined, e.g., in src/types/user.ts
/* Example src/types/user.ts:
export type UserRole = 'doctor' | 'patient' | 'admin' | 'guest'; 
*/ 