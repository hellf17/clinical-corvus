import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Diagnóstico Diferencial - Academia Clínica Dr. Corvus',
  description: 'Aprimore sua capacidade de gerar e expandir diagnósticos diferenciais',
};

export default function DifferentialDiagnosisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
} 