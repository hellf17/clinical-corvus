'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
// import { useAuthStore } from '@/store/authStore'; // Remove Zustand store
import { useAuth, useUser } from '@clerk/nextjs'; // Import Clerk hooks
import { Spinner } from '@/components/ui/Spinner'; // Assuming Spinner is used for loading

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: Array<'doctor' | 'guest'>; // Future patient support (commented out for now)
}

export default function AuthGuard({ 
  children, 
  allowedRoles = ['doctor'] // Default allowed roles (patient support commented out for now)
}: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, userId } = useAuth(); // Use Clerk's loading state and userId
  const { user } = useUser(); // Get user details, including metadata

  // Determine user role from Clerk metadata
  // Assumes role is stored in publicMetadata: { role: 'doctor' }
  const userRole = user?.publicMetadata?.role as 'doctor' | 'guest' | undefined;

  useEffect(() => {
    // Wait until Clerk is loaded and user data is available
    if (isLoaded) {
      // Middleware handles redirecting unauthenticated users, so we only check roles here.
      // If user is loaded (implies authenticated via middleware) but no role is set...
      if (userId && !userRole) {
        // Allow access to role selection page
        if (pathname !== '/choose-role') { 
          console.log('AuthGuard: Redirecting to /choose-role (no role found)');
          router.push('/choose-role');
        }
        return; // Stop further checks if redirecting to role selection
      }

      // If user is loaded and has a role, check if it's allowed for the current route
      if (userId && userRole && !allowedRoles.includes(userRole)) {
        // Allow access to unauthorized page itself
        if (pathname !== '/unauthorized') {
          console.log(`AuthGuard: Redirecting to /unauthorized (Role '${userRole}' not in [${allowedRoles.join(', ')}])`);
          router.push('/unauthorized');
        }
        return; // Stop further checks if redirecting to unauthorized
      }
      
      // Special case: Guest role handling (if needed)
      // If the guest role is explicitly allowed, let them through.
      // If guest role is NOT explicitly allowed, and user has guest role, redirect?
      // Current logic: If 'guest' is not in allowedRoles, the previous check handles redirection.
      // If 'guest' IS in allowedRoles, they pass through.
    }
  }, [isLoaded, userId, userRole, router, pathname, allowedRoles]);

  // Show loading spinner while Clerk is initializing
  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  // If Clerk is loaded, and the user is authenticated (implied by middleware),
  // and checks above passed (or are pending redirection), render children.
  // The redirection logic in useEffect will handle unauthorized access.
  // We only render children if the user *should* be allowed access *or* 
  // is on the page they are being redirected to (avoids flicker).
  if (userId && userRole && allowedRoles.includes(userRole)) {
     return <>{children}</>;
  } 
  // Allow rendering if on the target redirect pages while checks run
  if (userId && !userRole && pathname === '/choose-role') {
    return <>{children}</>;
  }
  if (userId && userRole && !allowedRoles.includes(userRole) && pathname === '/unauthorized') {
    return <>{children}</>;
  }
  // If clerk is loaded but userId is null, middleware should have redirected,
  // but return loading/null state as a fallback while redirect happens.
  if (isLoaded && !userId && pathname !== '/') { // Allow landing page for unauthenticated
     return (
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      );
  }
  
  // Render children on landing page if Clerk is loaded (auth handled by SignedIn/Out)
  if (isLoaded && pathname === '/'){
      return <>{children}</>;
  }

  // Fallback loading state while redirection occurs
  return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );

} 