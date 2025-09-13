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
import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select';

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
  const [prefs, setPrefs] = useState<{ notifications: { emailClinicalAlerts: boolean; emailGroupUpdates: boolean; productUpdates: boolean }, language?: 'pt-BR' | 'en-US', timezone?: string } | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);

  React.useEffect(() => {
    if (activeTabValue === 'notifications') {
      (async () => {
        try {
          setLoadingPrefs(true);
          const res = await fetch('/api/user/preferences');
          if (res.ok) {
            const data = await res.json();
            setPrefs(data);
          }
        } catch (e) {
          console.warn('Failed to load preferences', e);
        } finally {
          setLoadingPrefs(false);
        }
      })();
    }
  }, [activeTabValue]);

  const savePrefs = async () => {
    if (!prefs) return;
    try {
      setSavingPrefs(true);
      const res = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prefs),
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Preferências salvas');
    } catch (e:any) {
      toast.error('Falha ao salvar preferências', { description: e.message || '' });
    } finally {
      setSavingPrefs(false);
    }
  };

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
                <TabsTrigger value="subscription">Assinatura (em breve)</TabsTrigger>
                <TabsTrigger value="notifications">Notificações</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Main Settings Panel */}
          <div>
            <Card className="h-full shadow-xl border-0 bg-white/95 backdrop-blur-sm">
              <CardContent className="p-0">
                {activeTabValue === 'account' || activeTabValue === 'security' ? (
                  <div className="w-full">
                    <UserProfile 
                      path={userProfileRouterBasePath}
                      routing="path"
                      appearance={{
                        elements: {
                          rootBox: "w-full",
                          card: "shadow-none border-0 w-full",
                          navbar: "hidden",
                          pageScrollBox: "p-6",
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
                ) : null}

                {activeTabValue === 'subscription' ? (
                  <div className="p-6 space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle>Plano de Assinatura</CardTitle>
                        <CardDescription>Gerencie seu plano e faturamento.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Plano atual</span>
                          <span className="font-medium">Free</span>
                        </div>
                        <div className="flex gap-2">
                          <Button disabled>Gerenciar Faturamento (em breve)</Button>
                          <Link href="/support" className="inline-block"><Button variant="outline">Contatar Suporte</Button></Link>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}

                {activeTabValue === 'notifications' ? (
                  <div className="p-6 space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Notificações</CardTitle>
                        <CardDescription>Escolha como deseja ser notificado.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Idioma do Aplicativo</Label>
                            <p className="text-xs text-muted-foreground">Selecione o idioma da interface.</p>
                          </div>
                          <Select
                            value={prefs?.language || 'pt-BR'}
                            onValueChange={(v) => setPrefs(p => p ? ({ ...p, language: v as 'pt-BR' | 'en-US' }) : p)}
                            disabled={loadingPrefs || savingPrefs || !prefs}
                          >
                            <SelectTrigger className="w-44">
                              <SelectValue placeholder="Idioma" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                              <SelectItem value="en-US">English (US)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Fuso Horário</Label>
                            <p className="text-xs text-muted-foreground">Selecione seu fuso horário para horários e alertas.</p>
                          </div>
                          <Select
                            value={prefs?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'}
                            onValueChange={(v) => setPrefs(p => p ? ({ ...p, timezone: v }) : p)}
                            disabled={loadingPrefs || savingPrefs || !prefs}
                          >
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Fuso horário" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UTC">UTC</SelectItem>
                              <SelectItem value="America/Sao_Paulo">America/Sao_Paulo</SelectItem>
                              <SelectItem value="America/New_York">America/New_York</SelectItem>
                              <SelectItem value="Europe/London">Europe/London</SelectItem>
                              <SelectItem value="Europe/Berlin">Europe/Berlin</SelectItem>
                              <SelectItem value="Asia/Tokyo">Asia/Tokyo</SelectItem>
                              <SelectItem value="Asia/Shanghai">Asia/Shanghai</SelectItem>
                              <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Alertas Clínicos por E‑mail</Label>
                            <p className="text-xs text-muted-foreground">Receba alertas de pacientes e eventos críticos.</p>
                          </div>
                          <Switch
                            checked={!!prefs?.notifications?.emailClinicalAlerts}
                            onCheckedChange={(v) => setPrefs(p => p ? ({ ...p, notifications: { ...p.notifications, emailClinicalAlerts: !!v } }) : p)}
                            disabled={loadingPrefs || savingPrefs || !prefs}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Atualizações de Grupos</Label>
                            <p className="text-xs text-muted-foreground">Convites, mudanças de membros e atribuições.</p>
                          </div>
                          <Switch
                            checked={!!prefs?.notifications?.emailGroupUpdates}
                            onCheckedChange={(v) => setPrefs(p => p ? ({ ...p, notifications: { ...p.notifications, emailGroupUpdates: !!v } }) : p)}
                            disabled={loadingPrefs || savingPrefs || !prefs}
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <Label>Novidades do Produto</Label>
                            <p className="text-xs text-muted-foreground">Receba novidades ocasionais por e‑mail.</p>
                          </div>
                          <Switch
                            checked={!!prefs?.notifications?.productUpdates}
                            onCheckedChange={(v) => setPrefs(p => p ? ({ ...p, notifications: { ...p.notifications, productUpdates: !!v } }) : p)}
                            disabled={loadingPrefs || savingPrefs || !prefs}
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button onClick={savePrefs} disabled={savingPrefs || !prefs}>{savingPrefs ? 'Salvando…' : 'Salvar Preferências'}</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
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
