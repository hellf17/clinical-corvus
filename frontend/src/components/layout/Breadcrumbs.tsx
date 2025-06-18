'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/Breadcrumb"

// Map routes to friendly names (can be expanded)
const routeMap: Record<string, string> = {
  '/': 'Início',
  '/dashboard': 'Dashboard',
  '/dashboard/doctor': 'Pacientes',
  '/dashboard/patient': 'Meu Resumo',
  '/patients': 'Pacientes',
  '/patients/new': 'Cadastrar Paciente',
  '/upload': 'Upload de Exames',
  '/risk-scores': 'Escores de Risco',
  '/chat': 'Chat IA',
  '/my-exams': 'Meus Exames',
  '/analysis': 'Análises',
  // Dinâmicas
  '/patients/[id]/overview': 'Resumo',
  '/patients/[id]/notes': 'Notas Clínicas',
  '/patients/[id]/medications': 'Medicações',
  '/patients/[id]/labs': 'Análise Laboratorial',
  '/patients/[id]/charts': 'Visualização Gráfica',
};

function getBreadcrumbs(pathname: string) {
  // Split and accumulate paths for breadcrumbs
  const segments = pathname.split('/').filter(Boolean);
  const crumbs = [];
  let path = '';
  for (let i = 0; i < segments.length; i++) {
    path += '/' + segments[i];
    const defaultLabel = routeMap[path] || decodeURIComponent(segments[i]);
    const label = /\/patients\/[^/]+\/overview/.test(path) ? 'Resumo' : defaultLabel;
    crumbs.push({ href: path, label });
  }
  return crumbs;
}

const Breadcrumbs = () => {
  const pathname = usePathname() || '/';
  const breadcrumbs = getBreadcrumbs(pathname);

  if (breadcrumbs.length <= 1) return null;

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Início</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.href}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
            {idx === breadcrumbs.length - 1 ? (
                <BreadcrumbPage className="font-medium">{crumb.label}</BreadcrumbPage>
            ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
            )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
};

export default Breadcrumbs;
