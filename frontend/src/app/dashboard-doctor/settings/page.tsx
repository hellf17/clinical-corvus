'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { UserProfile } from '@clerk/nextjs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Settings, User, Shield, CreditCard, Bell } from 'lucide-react';
import Link from 'next/link';
import { Footer } from '../../landing/templates/Footer';

export default function DoctorSettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const userProfileRouterBasePath = '/dashboard-doctor/settings';

  let activeTabValue = 'account';
  const pathSegments = pathname.split('/');
  const lastSegment = pathSegments[pathSegments.length -1];

  if (pathname.startsWith(userProfileRouterBasePath) && lastSegment && lastSegment !== 'settings') {
    if (['security', 'subscription', 'notifications'].includes(lastSegment)) {
      activeTabValue = lastSegment;
    }
  } else if (pathname === userProfileRouterBasePath) {
    activeTabValue = 'account';
  }
  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">      
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back Button */}
        <div className="mb-8">
          <Link href="/dashboard-doctor">
            <Button variant="default" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
        </div>

        {/* Centered Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary flex items-center justify-center gap-3 mb-4">
            <Settings className="w-10 h-10 text-blue-600" />
            Configurações da Conta
          </h1>
          <p className="text-xl text-slate-700 max-w-2xl mx-auto">
            Gerencie suas informações pessoais, segurança e preferências da conta
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <Tabs 
              value={activeTabValue} 
              onValueChange={(value) => {
                const newPath = value === 'account' ? userProfileRouterBasePath : `${userProfileRouterBasePath}/${value}`;
                router.push(newPath);
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
                <TabsTrigger value="account">Perfil</TabsTrigger>
                <TabsTrigger value="security">Segurança</TabsTrigger>
                <TabsTrigger value="subscription">Assinatura</TabsTrigger>
                <TabsTrigger value="notifications">Notificações</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Main Settings Panel */}
          <div>
            <Card className="h-full shadow-xl border-0 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-0">
                {/* Clerk UserProfile Component */}
                <div className="w-full">
                  <UserProfile 
                    path={userProfileRouterBasePath}
                    routing="path"
                    appearance={{
                      elements: {
                        rootBox: "w-full",
                        card: "shadow-none border-0 w-full",
                        navbar: "hidden", // Hide default navbar since we have our own
                        pageScrollBox: "p-6", // Keep padding for content within UserProfile
                        profileSectionPrimaryButton: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                        formButtonPrimary: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700",
                        footerActionLink: "text-blue-600 hover:text-blue-700"
                      },
                      layout: {
                        socialButtonsPlacement: "bottom",
                        showOptionalFields: true
                      }
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Support Card Only */}
        <div className="mt-12 max-w-md mx-auto">
          <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-center text-primary">Suporte e Ajuda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-slate-600 text-center">
                <p className="mb-4">
                  Precisa de ajuda com suas configurações?
                </p>
                <div className="space-y-2">
                  <Button variant="default" size="sm" className="w-full justify-center">
                    <Link href="/docs" className="flex items-center">
                      Documentação
                    </Link>
                  </Button>
                  <Button variant="default" size="sm" className="w-full justify-center">
                    <Link href="/support" className="flex items-center">
                      Contatar Suporte
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer from Landing Page */}
      <Footer />
    </div>
  );
} 