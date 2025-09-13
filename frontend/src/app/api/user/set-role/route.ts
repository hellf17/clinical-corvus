import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server'; // Ensure this line is present
import { clerkClient, getAuth } from '@clerk/nextjs/server';

export async function POST(req: NextRequest) { // Ensure req is NextRequest
  try {
    const { userId, sessionClaims } = getAuth(req);

    if (!userId) {
      const headersObject = Object.fromEntries(req.headers.entries());
      console.error("API Route /api/user/set-role: No userId found by getAuth(req). Request headers:", JSON.stringify(headersObject));
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Retrieve current user data to check existing role
    const user = await (await clerkClient()).users.getUser(userId);
    const existingRole = user.publicMetadata?.role as string | undefined;

    // For development, we can allow role change if a query param like ?force=true is passed
    // In production, this check should be more robust or rely on admin privileges.
    const allowRoleChange = req.nextUrl.searchParams.get('force') === 'true'; 

    const isAdmin = sessionClaims?.metadata?.role?.includes('admin_role_management');

    if (existingRole && !allowRoleChange) { // Modified condition
      console.log(`User ${userId} already has role '${existingRole}'. Role change denied.`);
      return NextResponse.json({ error: 'Role already set. Users cannot change their role.' }, { status: 403 });
    }

    const { role, profile } = await req.json();

    // Only allow doctor role for now (patient support commented out for future use)
    if (!role || role !== 'doctor') {
      return NextResponse.json({ error: 'Invalid role specified. Currently only "doctor" role is supported.' }, { status: 400 });
    }

    // Validate profile - only allow professional and medical_student profiles
    if (profile && !['professional', 'medical_student'].includes(profile)) {
      return NextResponse.json({ error: 'Invalid profile specified. Must be "professional" or "medical_student".' }, { status: 400 });
    }

    // Future patient support (commented out for now)
    // if (!role || (role !== 'doctor' && role !== 'patient')) {
    //   return NextResponse.json({ error: 'Invalid role specified. Must be "doctor" or "patient".' }, { status: 400 });
    // }

    // Validate profile if provided
    // if (profile && !['professional', 'medical_student', 'patient'].includes(profile)) {
    //   return NextResponse.json({ error: 'Invalid profile specified. Must be "professional", "medical_student", or "patient".' }, { status: 400 });
    // }

    // If we are forcing a change, or if no role existed, update it.
    console.log(`Setting role for user ${userId} to '${role}' with profile '${profile}'. Existing role was: '${existingRole || 'none'}'. Forced: ${allowRoleChange}`);
    
    const updatedMetadata: Record<string, any> = {
      ...(user.publicMetadata as Record<string, any>), // Use fetched user.publicMetadata
      role: role
    };

    // Add profile to metadata if provided
    if (profile) {
      updatedMetadata.profile = profile;
    }

    await (await clerkClient()).users.updateUserMetadata(userId, {
      publicMetadata: updatedMetadata
    });

    return NextResponse.json({ success: true, userId, role, profile });

  } catch (error: any) {
    console.error("Error in /api/user/set-role:", error);
    let errorMessage = 'Failed to set user role.';
    let statusCode = 500;

    if (error.message?.includes('Invalid role') || error.message?.includes('Invalid profile')) {
        errorMessage = error.message;
        statusCode = 400;
    } else if (error.status === 403) { // Catch specific 403 if thrown by Clerk for some reason
        errorMessage = error.message || 'Permission denied.';
        statusCode = 403;
    }
    return NextResponse.json({ error: errorMessage, details: error.message || 'No additional details' }, { status: statusCode });
  }
}