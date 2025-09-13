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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            Clinical Corvus
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Seu assistente clínico inteligente para decisões baseadas em evidências
          </p>
        </div>

        {/* Main Card */}
        <Card className="max-w-4xl w-full shadow-2xl border-0 bg-white/80 backdrop-blur-sm mx-auto">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
              Bem-vindo(a)!
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Escolha seu perfil para personalizar sua experiência
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Button
                variant={selectedProfile === 'professional' ? 'default' : 'outline'}
                className={`h-40 text-xl flex flex-col gap-4 items-center justify-center p-6 transition-all duration-300 ${
                  selectedProfile === 'professional'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg transform scale-105'
                    : 'hover:shadow-lg hover:scale-105 border-2 border-blue-200 hover:border-blue-400'
                }`}
                onClick={() => handleProfileSelect('professional')}
                disabled={loading}
              >
                <div className={`p-3 rounded-full ${selectedProfile === 'professional' ? 'bg-white/20' : 'bg-blue-100'}`}>
                  <Stethoscope className={`h-10 w-10 ${selectedProfile === 'professional' ? 'text-white' : 'text-blue-600'}`} />
                </div>
                <div className="text-center">
                  <span className={`font-semibold ${selectedProfile === 'professional' ? 'text-white' : 'text-gray-800'}`}>
                    Médico
                  </span>
                  <p className={`text-sm mt-1 ${selectedProfile === 'professional' ? 'text-blue-100' : 'text-gray-500'}`}>
                    Profissional de saúde
                  </p>
                </div>
              </Button>

              <Button
                variant={selectedProfile === 'medical_student' ? 'default' : 'outline'}
                className={`h-40 text-xl flex flex-col gap-4 items-center justify-center p-6 transition-all duration-300 ${
                  selectedProfile === 'medical_student'
                    ? 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg transform scale-105'
                    : 'hover:shadow-lg hover:scale-105 border-2 border-purple-200 hover:border-purple-400'
                }`}
                onClick={() => handleProfileSelect('medical_student')}
                disabled={loading}
              >
                <div className={`p-3 rounded-full ${selectedProfile === 'medical_student' ? 'bg-white/20' : 'bg-purple-100'}`}>
                  <GraduationCap className={`h-10 w-10 ${selectedProfile === 'medical_student' ? 'text-white' : 'text-purple-600'}`} />
                </div>
                <div className="text-center">
                  <span className={`font-semibold ${selectedProfile === 'medical_student' ? 'text-white' : 'text-gray-800'}`}>
                    Estudante
                  </span>
                  <p className={`text-sm mt-1 ${selectedProfile === 'medical_student' ? 'text-purple-100' : 'text-gray-500'}`}>
                    Estudante de medicina
                  </p>
                </div>
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
              <div className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                selectedProfile === 'professional'
                  ? 'bg-blue-50 border-blue-200 shadow-blue-100 shadow-lg'
                  : 'bg-purple-50 border-purple-200 shadow-purple-100 shadow-lg'
              }`}>
                <div className="flex items-center mb-3">
                  {selectedProfile === 'professional' ? (
                    <Stethoscope className="h-6 w-6 text-blue-600 mr-3" />
                  ) : (
                    <GraduationCap className="h-6 w-6 text-purple-600 mr-3" />
                  )}
                  <h3 className={`text-xl font-bold ${
                    selectedProfile === 'professional' ? 'text-blue-800' : 'text-purple-800'
                  }`}>
                    {selectedProfile === 'professional' ? 'Perfil Médico' : 'Perfil Estudante'}
                  </h3>
                </div>
                <p className={`text-base leading-relaxed ${
                  selectedProfile === 'professional' ? 'text-blue-700' : 'text-purple-700'
                }`}>
                  {selectedProfile === 'professional' &&
                    "Acesso completo ao Dr. Corvus, análise laboratorial avançada, gestão de pacientes e todas as ferramentas profissionais para otimizar seu trabalho clínico."}
                  {selectedProfile === 'medical_student' &&
                    "Acesso à Academia Clínica, ferramentas educacionais avançadas, simulações clínicas e Dr. Corvus para acelerar seu aprendizado médico."}
                </p>
              </div>
            )}

            <Button
              className={`w-full mt-6 text-lg py-4 font-semibold transition-all duration-300 ${
                selectedProfile
                  ? selectedProfile === 'professional'
                    ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                    : 'bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
              onClick={handleConfirm}
              disabled={!selectedProfile || loading}
            >
              {loading ? (
                <div className="flex items-center">
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Configurando seu perfil...
                </div>
              ) : (
                'Confirmar e Começar'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
