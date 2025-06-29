'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Future patient support (commented out for now)
// This entire page functionality is preserved for future patient implementation
// The original PatientSettingsPage with UserProfile, cards, and all features
// will be restored when patient access is re-enabled

export default function PatientSettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to choose-role since patient access is currently disabled
    router.replace('/choose-role');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="mt-2 text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
} 