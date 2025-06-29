'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4">Acesso Não Autorizado</h1>
      <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
        Você não tem permissão para acessar esta página.
      </p>
      <div className="flex gap-4">
        <Link href="/dashboard" className="inline-block">
          <Button>
            Ir para o Dashboard
          </Button>
        </Link>
        <Link href="/" className="inline-block">
          <Button variant="outline">
            Voltar para a Página Inicial
          </Button>
        </Link>
      </div>
    </div>
  );
} 