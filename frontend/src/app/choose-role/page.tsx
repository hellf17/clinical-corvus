'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Loader2, User, Stethoscope, GraduationCap, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function ChooseRolePage() {
  const [selectedRole, setSelectedRole] = useState<'doctor' | 'patient' | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<'professional' | 'medical_student' | /* 'patient' | */ null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { session } = useClerk();

  const handleProfileSelect = (profile: 'professional' | 'medical_student' /* | 'patient' */) => {
    setSelectedProfile(profile);
    // Map both professional and medical_student to 'doctor' role internally
    if (profile === 'professional' || profile === 'medical_student') {
      setSelectedRole('doctor');
    } 
    // Future patient support (commented out for now)
    // else {
    //   setSelectedRole('patient');
    // }
  };

  const handleConfirm = async () => {
    if (!selectedRole || !selectedProfile) {
        toast.error("Seleção inválida", { description: "Por favor, selecione um perfil."} );
        return;
    }
    setLoading(true);
    try {
      const response = await fetch('/api/user/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: selectedRole,
          profile: selectedProfile // Send additional profile info
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Falha ao atualizar perfil.' }));
        setLoading(false);
        throw new Error(errorData.message || 'Falha ao atualizar perfil.');
      }

      toast.success("Perfil salvo!", { description: "Aguarde, atualizando sua sessão..."});
      
      await session?.reload();
      setLoading(false);

      // After successful role set, force a redirect and full page refresh.
      // Use selectedRole directly as user.publicMetadata might be stale immediately after update.
      if (selectedRole === 'doctor') {
        window.location.href = '/dashboard-doctor';
      } 
      // Future patient support (commented out for now)
      // else if (selectedRole === 'patient') {
      //   window.location.href = '/dashboard-patient';
      // } 
      else {
        // This case should not be reached if selectedRole is always set before confirm
        window.location.href = '/'; 
      }
    } catch (error: any) {
      console.error("Error saving role:", error);
      toast.error('Erro ao salvar perfil', { description: error.message || 'Não foi possível atualizar seu perfil. Tente novamente.'});
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && user) {
      const role = user.publicMetadata?.role as string | undefined;
      console.log("ChooseRolePage useEffect - User loaded. Role:", role);
      if (role === 'doctor') {
        console.log("Redirecting to /dashboard-doctor");
        router.replace('/dashboard-doctor');
      } 
      // Future patient support (commented out for now)
      // else if (role === 'patient') {
      //   console.log("Redirecting to /dashboard-paciente");
      //   router.replace('/dashboard-paciente');
      // }
    } else if (isLoaded && !user) {
      console.log("ChooseRolePage useEffect - User loaded but no user object. Redirecting to sign-in.");
      toast.error("Sessão não encontrada, redirecionando para login.");
      router.replace('/sign-in');
    }
  }, [user, isLoaded, router]);

  if (!isLoaded) {
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-16 w-16 animate-spin text-primary" /></div>;
  }
  
  if (!user) {
    console.log("ChooseRolePage render - No user object after isLoaded. Should be caught by useEffect or middleware.");
    return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="max-w-4xl mx-auto w-full">
        <Card className="max-w-2xl w-full shadow-xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Bem-vindo(a) ao Clinical Corvus!</CardTitle>
            <CardDescription>Para otimizar sua experiência, por favor, selecione seu perfil de uso.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button 
                variant={selectedProfile === 'professional' ? 'default' : 'outline'} 
                className="h-28 text-lg flex flex-col gap-2 items-center justify-center p-4" 
                onClick={() => handleProfileSelect('professional')}
                disabled={loading}
              >
                <Stethoscope className="h-8 w-8 mb-1" />
                <span className="text-center">Profissional de Saúde</span>
                <span className="text-xs text-muted-foreground">Médicos, enfermeiros, etc.</span>
              </Button>
              
              <Button 
                variant={selectedProfile === 'medical_student' ? 'default' : 'outline'} 
                className="h-28 text-lg flex flex-col gap-2 items-center justify-center p-4" 
                onClick={() => handleProfileSelect('medical_student')}
                disabled={loading}
              >
                <GraduationCap className="h-8 w-8 mb-1" />
                <span className="text-center">Estudante/Residente</span>
                <span className="text-xs text-muted-foreground">Medicina, residência</span>
              </Button>
              
              {/* Future patient option (commented out for now) */}
              {/* 
              <Button 
                variant={selectedProfile === 'patient' ? 'default' : 'outline'}
                className="h-28 text-lg flex flex-col gap-2 items-center justify-center p-4"
                onClick={() => handleProfileSelect('patient')}
                disabled={loading}
              >
                <User className="h-8 w-8 mb-1" />
                <span className="text-center">Paciente</span>
                <span className="text-xs text-muted-foreground">Usuário geral</span>
              </Button>
              */}
            </div>
            
            {selectedProfile && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center">
                  {selectedProfile === 'professional' && <><Stethoscope className="h-4 w-4 mr-2" />Profissional de Saúde</>}
                  {selectedProfile === 'medical_student' && <><GraduationCap className="h-4 w-4 mr-2" />Estudante/Residente</>}
                  {/* {selectedProfile === 'patient' && <><User className="h-4 w-4 mr-2" />Paciente</>} */}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {selectedProfile === 'professional' && 
                    "Acesso completo ao Dr. Corvus Insights, análise laboratorial avançada, gestão de pacientes e todas as ferramentas profissionais."}
                  {selectedProfile === 'medical_student' && 
                    "Acesso à Academia Clínica, Dr. Corvus Insights para aprendizado, simulações clínicas e ferramentas educacionais avançadas."}
                  {/* {selectedProfile === 'patient' && 
                    "Acesso ao diário de saúde, análise de exames pessoais, chat educacional e ferramentas de acompanhamento."} */}
                </p>
              </div>
            )}
            
            <Button
              className="w-full mt-4 text-base py-3"
              onClick={handleConfirm}
              disabled={!selectedProfile || loading}
            >
              {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Confirmar e Continuar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
