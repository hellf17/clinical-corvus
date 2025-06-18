import { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';

export const metadata: Metadata = {
  title: 'Academia Clínica Dr. Corvus',
  description: 'Aprimore seu raciocínio clínico com o Dr. Corvus',
};

export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
      </div>
    </ClerkProvider>
  );
} 