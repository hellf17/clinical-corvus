export {}; // This ensures the file is treated as a module.

declare global {
  interface CustomJwtSessionClaims {
    email?: string;         // From your template: "{{user.primary_email_address}}"
    username?: string;      // From your template: "{{user.username}}"
    publicMetadata?: {      // From your template: "{{user.public_metadata}}"
      role?: string;
      // You can add any other fields you expect to be in user.public_metadata here
    };
    // Add any other top-level custom claims you have defined in your JWT template
  }
} 