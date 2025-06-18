// This declaration file augments Clerk's types to include our custom metadata.

import { UserPublicMetadata } from "@clerk/types";

// Using module augmentation to add custom properties to Clerk interfaces
declare module '@clerk/types' {
  export interface UserPublicMetadata {
    role?: 'doctor' | 'patient';
  }

  export interface CustomJwtSessionClaims {
    metadata: {
      role?: 'doctor' | 'patient';
    };
  }
}

// Ensure this file is treated as a module.
export {}; 