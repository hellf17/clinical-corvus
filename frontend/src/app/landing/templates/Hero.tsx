'use client'; // Make this a Client Component for Clerk

import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { Background } from '../background/Background';
import { HeroAnalysisButton, HeroAcademyButton } from '../hero/HeroOneButton';
import { Section } from '../layout/Section';
import { Button as UiButton } from '@/components/ui/Button';

const Hero = () => (
  <Background color="bg-transparent">
    <Section yPadding="py-0">
      {/* Custom navbar with everything aligned to the right */}
      <div className="flex justify-end items-center py-4">
        <div className="flex items-center space-x-6">
          {/* Navigation Links */}
          <nav className="flex items-center space-x-6">
            <Link href="/" className="text-slate-700 hover:text-blue-600 transition-colors font-medium text-xl">
              Home
            </Link>
            <Link href="/dashboard" className="text-slate-700 hover:text-blue-600 transition-colors font-medium text-xl">
              Dashboard
            </Link>
            <Link href="/analysis" className="text-slate-700 hover:text-blue-600 transition-colors font-medium text-xl">
              Análise Rápida
            </Link>
          </nav>
          
          {/* Auth Section */}
          <div className="flex items-center space-x-3 ml-4">
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
                <UiButton size="sm" variant="outline">Entrar</UiButton>
              </SignInButton>
              <SignUpButton mode="modal">
                <UiButton size="sm" variant="ghost">Cadastrar</UiButton>
              </SignUpButton>
            </SignedOut>
          </div>
        </div>
      </div>
    </Section>

    <Section yPadding="pt-10 pb-6">
      {/* Main title spanning both columns */}
      <div className="w-full text-center mb-8">
        <h1 className="mb-6 whitespace-pre-line text-4xl font-bold leading-hero">
          {'Clinical Corvus: Seu Assistente Clínico Inteligente'}
        </h1>
        <h2 className="mb-8 whitespace-pre-line text-xl text-neutral-100 leading-relaxed max-w-4xl mx-auto">
          {'Capacitando médicos e futuros médicos com insights de IA, ferramentas de análise de ponta e uma academia clínica inovadora.'}
        </h2>
      </div>

      {/* Action buttons in two columns */}
      <div className="flex justify-center space-x-4 w-full max-w-4xl mx-auto">
        <div className="flex-1 max-w-md">
          <HeroAnalysisButton
            title={ 
              <>
                {'Análise Laboratorial Avançada com auxílio de IA'}
              </>
            }
            description="Transforme dados laboratoriais em decisões clínicas de precisão com nossa IA especializada."
          />
        </div>
        <div className="flex-1 max-w-md">
          <HeroAcademyButton
            title={ 
              <>
                {'Academia Clínica: Desenvolva seu Raciocínio Diagnóstico e melhore sua prática clínica'}
              </>
            }
            description="Eleve seu raciocínio médico à excelência com módulos interativos em MBE e metacognição."
          />
        </div>
      </div>
    </Section>
  </Background>
);

export { Hero }; 