import React from 'react';
import { currentUser } from '@clerk/nextjs/server'; // Use server-side auth check
import { redirect } from 'next/navigation';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/Sidebar";
import AuthGuard from '@/components/providers/AuthGuard'; // Keep AuthGuard for client-side role checks if needed
import { getUserRole } from '@/lib/roles'; // Assuming a helper to get role


interface DashboardLayoutProps {
  children: React.ReactNode;
}

// This layout wraps protected dashboard sections (dashboard, analysis, etc.)
export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const user = await currentUser();

  // --- Server-Side Authentication Check ---
  if (!user) {
    // Not logged in, redirect to sign-in
    redirect('/sign-in');
  }

  // --- Server-Side Role Check (Example - adjust as needed) ---
  // Define roles allowed for this layout section
  const allowedRoles: Array<'doctor'> = ['doctor'];
  const userRole = await getUserRole(user.id); // Fetch user role (implement this)

  if (!userRole || !allowedRoles.includes(userRole as ('doctor'))) {
     // Redirect if user doesn't have the required role
     // Note: AuthGuard component might handle finer-grained client-side checks later
     redirect('/unauthorized'); // Or to a more appropriate page
  }

  // --- Layout Structure ---
  return (
    <AuthGuard allowedRoles={allowedRoles}>
      <SidebarProvider>
        <div className="min-h-screen flex flex-col bg-muted/40">
          <div className="flex flex-1 min-h-0">
            <div className="flex flex-col flex-1 min-w-0">
              <main className="flex-1 p-4 sm:px-6 sm:py-0 md:gap-8">
                <div className="flex items-center gap-4 mb-4 pt-4">
                  <SidebarTrigger className="lg:hidden" />
                </div>
                {children}
              </main>
            </div>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}