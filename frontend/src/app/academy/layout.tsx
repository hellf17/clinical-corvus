'use client';

import { Metadata } from 'next';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Home, FlaskConical, BookOpen } from 'lucide-react';

export default function AcademyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <div className="min-h-screen bg-gray-50">
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
                  <Link href="/academy" className="text-blue-600 font-semibold flex items-center">
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

        {/* Main Content */}
        <main>
          {children}
        </main>
      </div>
    </ClerkProvider>
  );
}