import { clerkMiddleware, type ClerkMiddlewareAuth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from 'next/server';

// Define routes that should be publicly accessible
const publicRoutes = [
  '/', // Landing page is public
  '/sign-in(.*)', // Clerk auth routes
  '/sign-up(.*)',
  '/api/webhooks/(.*)', // Public webhooks
  '/analysis(.*)', // Make analysis page public
  // Add other public pages like /about, /pricing if they exist
];

export default clerkMiddleware(async (auth: ClerkMiddlewareAuth, req: NextRequest) => {
  // Correctly call and await auth() to get the userId and sessionClaims
  const { userId, sessionClaims } = await auth();
  const url = req.nextUrl;

  const isPublic = publicRoutes.some(path => new RegExp(`^${path.replace('(.*)', '.*')}$`).test(url.pathname));

  if (isPublic) {
    return NextResponse.next(); // Allow access to public routes
  }

  // If not a public route, user must be authenticated. 
  // clerkMiddleware should handle the redirect to sign-in if userId is null by default.
  // This is an additional safeguard for our logic.
  if (!userId) {
    // For API routes, returning 401 might be more appropriate than redirecting.
    if (url.pathname.startsWith('/api')) {
        // It's possible Clerk already handled this and this won't be reached for API routes
        // if they are not in publicRoutes and no user is found.
        return new Response("Unauthorized: userId is null after auth() call in middleware", { status: 401 });
    }
    // For non-API routes, redirect to sign-in.
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', url.pathname + url.search); // Pass the original path and query to redirect back
    return NextResponse.redirect(signInUrl);
  }

  // User is authenticated (userId is present)

  // Allow direct access to the API route for setting the role
  if (url.pathname === '/api/user/set-role') {
    return NextResponse.next();
  }

  // Allow access to the choose-role page itself
  if (url.pathname === '/choose-role') {
    return NextResponse.next();
  }

  // User is authenticated, check for role
  const publicMetadata = sessionClaims?.publicMetadata as { role?: string } | undefined;
  const userRole = publicMetadata?.role;

  if (!userRole) {
    // If it's an API call that is explicitly allowed for authenticated users without a role, let it pass.
    if (url.pathname.startsWith('/api/lab-analysis/file') || url.pathname.startsWith('/api/lab-analysis/manual')) {
      console.log(`Middleware: User ${userId} has no role, but path ${url.pathname} is allowed without role. Proceeding.`);
      return NextResponse.next(); // Allow these specific analysis API calls
    }
    
    // For other API calls that might require a role (but the user doesn't have one)
    // This includes /api/lab-analysis/generate-dr-corvus-insights if it's not handled above and needs a role.
    if (url.pathname.startsWith('/api/')) {
        console.log(`Middleware: User ${userId} has no role, API access denied for ${url.pathname}. Full sessionClaims:`, JSON.stringify(sessionClaims));
        return new NextResponse(JSON.stringify({ error: "Access Denied: Role required for this API endpoint." }), { 
            status: 403, 
            headers: { 'Content-Type': 'application/json' } 
        });
    }

    // If it's a page navigation (not an API call listed above, not /choose-role, not /api/user/set-role) 
    // and the user has no role, redirect to /choose-role.
    console.log(`Middleware: User ${userId} has no role, redirecting to /choose-role from ${url.pathname}`);
    return NextResponse.redirect(new URL('/choose-role', req.url));
  }
  
  // Role-Based Access Control for dashboard-doctor routes
  if (url.pathname.startsWith('/dashboard-doctor')) {
    if (userRole !== 'doctor') {
      // User is not a doctor, redirect to unauthorized page
      const unauthorizedUrl = new URL('/unauthorized', req.url);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // Feature-gate: Clinical Validation program (selected testers only)
  if (url.pathname.startsWith('/dashboard-doctor/clinical-validation')) {
    const isTester = Boolean((sessionClaims?.publicMetadata as any)?.clinicalValidation === true 
      || (sessionClaims?.publicMetadata as any)?.betaTester === true);
    if (!isTester) {
      const unauthorizedUrl = new URL('/unauthorized', req.url);
      return NextResponse.redirect(unauthorizedUrl);
    }
  }

  // Group-Based Access Control for group routes
  if (url.pathname.startsWith('/dashboard-doctor/groups')) {
    // Extract group ID from the URL path
    const groupPathRegex = /^\/dashboard-doctor\/groups\/(\d+)/;
    const match = url.pathname.match(groupPathRegex);
    
    if (match) {
      const groupId = match[1];
      // In a real implementation, we would check if the user has access to this group
      // For now, we'll allow access to all groups for doctors
      // This should be replaced with an actual group membership check
      console.log(`Middleware: Checking group access for user ${userId} to group ${groupId}`);
    }
  }

  // Additional role-based access control can be added here
  /*
  if (userRole === 'patient' && !url.pathname.startsWith('/dashboard-patient')) {
       const unauthorizedUrl = new URL('/unauthorized', req.url);
       return NextResponse.redirect(unauthorizedUrl);
  }
  */

  // User has a role and is accessing an allowed page
  // Forward the authorization header to the backend
  const newHeaders = new Headers(req.headers);
  newHeaders.set('Authorization', req.headers.get('Authorization') || '');

  return NextResponse.next({
    request: {
      headers: newHeaders,
    },
  });
});

export const config = {
  matcher: [
    // Match all routes except static files and specific Next.js internals
    '/((?!.+\\.[\\w]+$|_next).*)', 
    '/', 
    '/(api|trpc)(.*)'
  ],
};
