"use client";
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useUser, SignOutButton, SignInButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button';
import { Patient, usePatientStore } from '@/store/patientStore'; // Importa store global de pacientes
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuBadge,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarHeader
} from '@/components/ui/Sidebar';
import {
  Users, UserPlus, Upload, BarChart3, MessageSquare, Watch, LogOut,
  LayoutDashboard, HeartPulse, FileText, FileUp, BarChartHorizontal,
  Settings,
  BookOpen,
  LineChart,
  Stethoscope,
  Home,
  LogIn,
  FileBadge,
  BrainCircuit,
  NotebookPen
} from 'lucide-react';

// Helper type for menu items with optional icons
type MenuItem = {
  label: string;
  href?: string;
  icon?: React.ElementType;
  disabled?: boolean;
  soon?: boolean;
  action?: 'login';
  children?: MenuItem[];
};

// Logo component for sidebar
const SidebarLogo = () => (
  <Link href="/" className="flex items-center p-2 hover:bg-sidebar-accent rounded-md transition-colors">
    <Image
      src="/Icon.png"
      alt="Clinical Corvus logo"
      width={32}
      height={32}
      className="mr-2 rounded-full object-cover"
    />
    <span className="font-semibold text-lg text-sidebar-foreground">Clinical Corvus</span>
  </Link>
);

const AppSidebar = () => {
  const { user, isLoaded } = useUser();
  const role = user?.publicMetadata?.role as 'doctor' | /* 'patient' | */ undefined;

  // Obtenção do paciente selecionado via store global
  const { selectedPatientId, patients } = usePatientStore();
  const selectedPatient = patients.find((p: Patient) => p.patient_id === selectedPatientId) || null;

  // Items for logged-out users
  const loggedOutItems: MenuItem[] = [
    { label: 'Análise Rápida', href: '/analysis', icon: FileBadge },
    { label: 'Academia Clínica', href: '/academy', icon: BrainCircuit }, // LIMITED ACCESS FOR NON SIGNED IN USERS FOR DEMONSTRATION PURPOSES
    { label: 'Documentação', href: '/docs', icon: BookOpen },
    { label: 'Login', icon: LogIn, action: 'login' },
  ];

  // Itens para médicos estudantes
  const doctorItems: MenuItem[] = [
    {
      label: 'Dashboard geral',
      href: '/dashboard-doctor',
      icon: LayoutDashboard,
      children: [
        { label: 'Grupos', href: '/dashboard-doctor/groups', icon: Users },
      ]
    },
    { label: 'Análise Laboratorial', href: '/analysis', icon: Upload },
    { label: 'Academia Clínica', href: '/academy', icon: BrainCircuit },
    { label: 'Chat Dr. Corvus', href: '/chat', icon: MessageSquare, disabled: true, soon: true },
    { label: 'Configurações', href: '/dashboard-doctor/settings', icon: Settings },
    { label: 'Documentação', href: '/docs', icon: BookOpen },
  ];

  // Submenu contextual para médicos (quando paciente selecionado)
  const patientContextItems: MenuItem[] = selectedPatient ? [
    { label: 'Resumo', href: `/patients/${selectedPatient.patient_id}/overview`, icon: LayoutDashboard, },
    { label: 'Notas Clínicas', href: `/patients/${selectedPatient.patient_id}/notes`, icon: FileText },
    { label: 'Medicações', href: `/patients/${selectedPatient.patient_id}/medications`, icon: HeartPulse },
    { label: 'Análise Laboratorial', href: `/patients/${selectedPatient.patient_id}/labs`, icon: FileUp },
    { label: 'Visualização Gráfica', href: `/patients/${selectedPatient.patient_id}/charts`, icon: BarChartHorizontal },
    { label: 'Escores de Risco', href: `/patients/${selectedPatient.patient_id}/risk-scores`, icon: BarChart3 },
    { label: 'Chat Dr. Corvus', href: `/patients/${selectedPatient.patient_id}/chat`, icon: MessageSquare },
  ] : [];

  // Future patient support (commented out for now)
  /*
  // Itens para pacientes
  const patientItems: MenuItem[] = [
    { label: 'Visão Geral', href: '/dashboard-patient', icon: LayoutDashboard, disabled: true, soon: true },
    { label: 'Meu Diário', href: '/dashboard-patient/diary', icon: BookOpen, disabled: true, soon: true }, 
    { label: 'Métricas de Saúde', href: '/dashboard-patient/health-metrics', icon: LineChart, disabled: true, soon: true },
    { label: 'Health Tips', href: '/dashboard-patient/health-tips', icon: Stethoscope, disabled: true, soon: true },
    { label: 'Meus Exames', href: '/dashboard-patient/my-exams', icon: FileText }, // TODO: Add link to analysis page
    { label: 'Aprenda sobre Saúde com Dr. Corvus', href: '/dashboard-patient/learn', icon: NotebookPen },
    { label: 'Chat Dr. Corvus', href: '/chat', icon: MessageSquare, disabled: true, soon: true },
    { label: 'Conectar Smartwatch', href: '#', icon: Watch, disabled: true, soon: true },
    { label: 'Configurações', href: '/dashboard-patient/settings', icon: Settings },
  ];
  */

  // Escolha dos itens principais
  let items: MenuItem[];
  let sidebarLabel: string;

  if (!user && isLoaded) {
    items = loggedOutItems;
    sidebarLabel = 'Menu Principal';
  } else if (role === 'doctor') {
    items = doctorItems;
    sidebarLabel = 'Menu Médico';
  } 
  // Future patient support (commented out for now)
  // else if (role === 'patient') {
  //   items = patientItems;
  //   sidebarLabel = 'Menu Paciente';
  // } 
  else {
    items = [];
    sidebarLabel = 'Carregando...';
  }

  // Render Menu Function
  const renderMenuItems = (menuItems: MenuItem[]) => (
    <SidebarMenu>
      {menuItems.map((item) => (
        <SidebarMenuItem key={item.label}>
          {item.action === 'login' ? (
            <SignInButton mode="modal">
              <SidebarMenuButton
                disabled={item.disabled}
                className={item.disabled ? 'cursor-not-allowed opacity-60 w-full' : 'w-full'}
                aria-disabled={item.disabled}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                <span>{item.label}</span>
                {item.soon && <SidebarMenuBadge>Breve</SidebarMenuBadge>}
              </SidebarMenuButton>
            </SignInButton>
          ) : (
            <>
              <SidebarMenuButton
                asChild
                disabled={item.disabled}
                className={item.disabled ? 'cursor-not-allowed opacity-60' : ''}
                aria-disabled={item.disabled}
                onClick={(e) => item.disabled && e.preventDefault()}
              >
                <Link href={item.href || '#'}>
                  {item.icon && <item.icon className="h-4 w-4" />}
                  <span>{item.label}</span>
                  {item.soon && <SidebarMenuBadge>Breve</SidebarMenuBadge>}
                </Link>
              </SidebarMenuButton>
              {item.children && item.children.length > 0 && (
                <SidebarMenuSub>
                  {item.children.map((child) => (
                    <SidebarMenuSubItem key={child.label}>
                      <SidebarMenuSubButton
                        asChild
                        disabled={child.disabled}
                        className={child.disabled ? 'cursor-not-allowed opacity-60' : ''}
                        aria-disabled={child.disabled}
                        onClick={(e) => child.disabled && e.preventDefault()}
                      >
                        <Link href={child.href || '#'}>
                          {child.icon && <child.icon className="h-4 w-4" />}
                          <span>{child.label}</span>
                          {child.soon && <SidebarMenuBadge>Breve</SidebarMenuBadge>}
                        </Link>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  ))}
                </SidebarMenuSub>
              )}
            </>
          )}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  const handleLogout = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (isLoaded) {

    }
  };

  if (!isLoaded) {
    return null;
  }

  return (
    <Sidebar className="sticky top-0 h-screen">
      {/* Header with logo */}
      <SidebarHeader className="border-b border-sidebar-border p-3">
        <SidebarLogo />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{sidebarLabel}</SidebarGroupLabel>
          <SidebarGroupContent>
            {renderMenuItems(items)}
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Submenu contextual para médicos */}
        {role === 'doctor' && selectedPatient && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel>Paciente: {selectedPatient.name}</SidebarGroupLabel>
            <SidebarGroupContent>
              {renderMenuItems(patientContextItems)}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {user && isLoaded && (
        <SidebarFooter className="mt-auto p-4 border-t border-sidebar-border">
          <SignOutButton redirectUrl="/">
            <Button
              variant="default"
              size="sm"
              className="w-full"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </SignOutButton>
        </SidebarFooter>
      )}
    </Sidebar>
  );
};

export default AppSidebar;