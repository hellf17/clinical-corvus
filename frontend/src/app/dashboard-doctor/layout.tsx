'use client';

import { ReactNode } from 'react';
import { UserButton, useUser, SignedIn, SignedOut, SignInButton, SignUpButton } from '@clerk/nextjs';
import Link from 'next/link';
import { MessageSquare, Plus, Home, FlaskConical, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import QuickChatPanel from '@/components/dashboard-doctor/QuickChatPanel';
import NewPatientModal from '@/components/dashboard-doctor/NewPatientModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/Dialog";


// Dynamically import ChatFloatingButton with ssr disabled
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user } = useUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo and Navigation */}
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-2">
                <img
                  src="/Icon.png"
                  alt="Clinical Corvus"
                  className="h-8 w-8 rounded-full"
                />
                <span className="text-xl font-semibold text-gray-900">Clinical Corvus</span>
              </Link>
              
              <nav className="flex items-center space-x-6">
                <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors font-medium flex items-center">
                  <Home className="w-4 h-4 mr-1" />
                  Home
                </Link>
                <Link href="/analysis" className="text-gray-600 hover:text-blue-600 transition-colors font-medium flex items-center">
                  <FlaskConical className="w-4 h-4 mr-1" />
                  Análise
                </Link>
                <Link href="/academy" className="text-gray-600 hover:text-blue-600 transition-colors font-medium flex items-center">
                  <BookOpen className="w-4 h-4 mr-1" />
                  Academia
                </Link>
              </nav>
            </div>

            {/* Authentication Section */}
            <div className="flex items-center space-x-3">
              <SignedIn>
                <UserButton
                  afterSignOutUrl="/"
                  userProfileMode="navigation"
                  userProfileUrl="/dashboard-doctor/settings"
                  showName={true}
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-8 h-8",
                      userButtonPopoverCard: "bg-background border border-border",
                      userButtonPopoverActionButton: "text-foreground hover:bg-accent",
                    }
                  }}
                />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <Button size="sm" variant="outline">Entrar</Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm" className="bg-blue-600 hover:bg-blue-700">Cadastrar</Button>
                </SignUpButton>
              </SignedOut>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 md:p-8 space-y-12">
        <section className="text-center py-10 academy-gradient-header rounded-xl border border-primary/20 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white flex items-center justify-center mb-4">
                Dashboard Clínico
              </h1>
              <p className="mt-2 text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                Bem-vindo(a), <span className="font-semibold">{user?.firstName || 'Doutor(a)'}</span>!
              </p>
            </div>
          </div>
          
            {/* Status Indicators */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2"></span>
                Sistema Ativo
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
                <MessageSquare className="w-3 h-3 mr-1" />
                Comunicação Direta
              </div>
              <div className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm flex items-center">
                <Plus className="w-3 h-3 mr-1" />
                Gerenciamento Ativo
              </div>
            </div>

            <SignedIn>
              <div className="mt-6 flex justify-center items-center space-x-4">
                <NewPatientModal />
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-white text-white hover:bg-white/10"
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Chat Rápido
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Chat Rápido com Dr. Corvus</DialogTitle>
                      <DialogDescription>
                        Inicie uma conversa rápida com o assistente de IA.
                      </DialogDescription>
                    </DialogHeader>
                    <QuickChatPanel />
                  </DialogContent>
                </Dialog>
              </div>
            </SignedIn>

            <SignedOut>
              <div className="mt-6 flex justify-center items-center space-x-4">
                <p className="text-white/90 text-lg">Faça login para acessar todas as funcionalidades do Dashboard Clínico</p>
              </div>
            </SignedOut>
        </section>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}