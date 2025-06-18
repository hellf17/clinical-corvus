'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Users, MessageSquare, Stethoscope, LineChart, BookOpen, Settings, LogOut, X } from 'lucide-react'; // Added X icon
import { useClerk } from '@clerk/nextjs';
import { Button } from '@/components/ui/Button'; // For the close button

// Define navigation items based on role
const doctorNavItems = [
  { href: '/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/dashboard/patients', label: 'Pacientes', icon: Users },
  { href: '/chat', label: 'Chat IA', icon: MessageSquare },
  { href: '/dashboard/settings', label: 'Configurações', icon: Settings },
];

const patientNavItems = [
  { href: '/dashboard-paciente', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/dashboard-paciente/diario', label: 'Meu Diário', icon: BookOpen },
  { href: '/dashboard-paciente/health-metrics', label: 'Métricas de Saúde', icon: LineChart },
  { href: '/chat', label: 'Falar com IA', icon: MessageSquare },
  { href: '/dashboard-paciente/health-tips', label: 'Dicas de Saúde', icon: Stethoscope },
  { href: '/dashboard-paciente/settings', label: 'Configurações', icon: Settings },
];

interface SidebarProps {
  userRole?: 'doctor' | 'patient';
  isOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ userRole, isOpen, toggleSidebar }) => {
  const pathname = usePathname();
  const { signOut } = useClerk();

  const navItems = userRole === 'doctor' ? doctorNavItems : patientNavItems;

  const handleLinkClick = () => {
    if (isOpen) {
      toggleSidebar(); // Close sidebar on link click on mobile
    }
  };

  return (
    <>
      {/* Overlay for mobile, shown when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <aside 
        className={cn(
          "bg-card border-r flex flex-col h-full fixed lg:static inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "lg:translate-x-0 lg:h-auto lg:border-r"
        )}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <Link href={userRole === 'doctor' ? "/dashboard" : "/dashboard-paciente"} onClick={handleLinkClick}>
            <h2 className="text-2xl font-semibold text-primary">Dr. Corvus</h2>
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={toggleSidebar}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-grow p-4 space-y-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} passHref onClick={handleLinkClick}>
              <div
                className={cn(
                  'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.label}
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t mt-auto">
          <button
            onClick={() => {
              handleLinkClick(); // Close sidebar first
              signOut({ redirectUrl: '/' });
            }}
            className={cn(
              'flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full',
              'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
