import React from 'react';
import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import AuthGuard from '@/components/providers/AuthGuard';
import { getUserRole } from '@/lib/roles';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

// Custom layout for settings page that bypasses the dashboard-doctor layout
// to prevent duplicate sidebars while maintaining auth and role checks
export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  const user = await currentUser();

  // --- Server-Side Authentication Check ---
  if (!user) {
    redirect('/sign-in');
  }

  // --- Server-Side Role Check ---
  const allowedRoles: Array<'doctor'> = ['doctor'];
  const userRole = await getUserRole(user.id);

  if (!userRole || !allowedRoles.includes(userRole as ('doctor'))) {
    redirect('/unauthorized');
  }

  // Return just the children without additional sidebar wrapper
  // The root layout already provides the sidebar
  return (
    <AuthGuard allowedRoles={allowedRoles}>
      {children}
    </AuthGuard>
  );
} 