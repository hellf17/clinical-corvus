'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
// import { motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { Spinner } from '@/components/ui/Spinner';
import { AlertCircle, Loader2 } from 'lucide-react';
import FileUploadComponent from '@/components/FileUploadComponent';
import { Separator } from "@/components/ui/Separator";
import PatientAlertsSummary from '@/components/dashboard/PatientAlertsSummary';
import AIChat from '@/components/patients/AIChat';
import { useRouter } from 'next/navigation';

// Doctor Specific Components
import DoctorPatientList from '@/components/dashboard/DoctorPatientList';
import DoctorRecentConversations from '@/components/dashboard/DoctorRecentConversations';
import DoctorAlertsPanel from '@/components/dashboard/DoctorAlertsPanel'; 
// import DashboardStats from '@/components/dashboard/DashboardStats'; 
import PatientOverview from '@/components/dashboard/PatientOverview';
// Patient Specific Components
import HealthDiaryPanel from '@/components/dashboard/HealthDiaryPanel'; 
import HealthTipsComponent from '@/components/dashboard/HealthTipsComponent'; 
import PatientLabChart from '@/components/dashboard/PatientLabChart'; 

// Common/Shared Panels
import RiskOverviewPanel from '@/components/dashboard/RiskOverviewPanel'; 
import QuickActionsPanel from '@/components/dashboard/QuickActionsPanel'; 

// Types and Services
import { Patient } from "@/types/patient";
import { HealthTip } from '@/types/healthTip';
import { getMyPatientProfile } from '@/services/patientService';
import { getHealthTips } from '@/services/healthTipService.client';

export default function DashboardPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { sessionClaims, getToken } = useAuth();
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  const [patientProfile, setPatientProfile] = useState<Patient | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [patientProfileError, setPatientProfileError] = useState<string | null>(null);

  const [healthTips, setHealthTips] = useState<HealthTip[]>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(false);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      const role = sessionClaims?.metadata?.role as string | undefined;
      setUserRole(role || null);
    } else if (isLoaded && !isSignedIn) {
      setUserRole(null);
    }
    if (isLoaded) {
      setIsLoadingUser(false);
    }
  }, [isLoaded, isSignedIn, sessionClaims]);

  useEffect(() => {
    if (userRole === 'patient') {
      const fetchPatientProfile = async () => {
        setIsLoadingProfile(true);
        setPatientProfileError(null);
        try {
          const token = await getToken();
          if (!token) throw new Error("Authentication token not available.");
          const profile = await getMyPatientProfile(token);
          setPatientProfile(profile);
        } catch (error: any) {
          console.error("Error fetching patient profile:", error);
          setPatientProfileError(error.message || "Falha ao carregar perfil do paciente.");
        }
        setIsLoadingProfile(false);
      };
      fetchPatientProfile();
    }
  }, [userRole, getToken]);

  useEffect(() => {
    const fetchTips = async () => {
      setIsLoadingTips(true);
      try {
        const token = await getToken();
        if (!token) throw new Error("Authentication token not available.");
        const tips = await getHealthTips(token);
        setHealthTips(tips);
      } catch (error) {
        console.error("Error fetching health tips:", error);
      }
      setIsLoadingTips(false);
    };
    fetchTips();
  }, [getToken, userRole]);

  // Future patient support (commented out for now)
  // if (isLoadingUser || (userRole === 'patient' && isLoadingProfile)) {
  if (isLoadingUser) {
    return <div className="text-center py-8"><Spinner size="lg" /></div>; // Simplified loading display
  }

  if (!isSignedIn) {
    return (
      <div className="text-center py-8">
        <Alert className="max-w-md mx-auto border-destructive text-destructive dark:text-destructive-foreground dark:border-destructive [&>svg]:text-destructive dark:[&>svg]:text-destructive-foreground">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Acesso Negado</AlertTitle>
          <AlertDescription>
            Você precisa estar logado para acessar o dashboard.
            <Link href="/sign-in" className="ml-2 font-semibold text-primary hover:underline">
              Fazer Login
            </Link>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Future patient support (commented out for now)
  // if (userRole === 'patient' && isLoadingProfile) {
  //   return (
  //     <div className="flex justify-center items-center min-h-screen">
  //       <Card className="w-full max-w-md mx-auto">
  //         <CardHeader className="space-y-4">
  //           <div className="flex justify-center">
  //             <Loader2 className="h-12 w-12 animate-spin text-primary" />
  //           </div>
  //           <CardTitle className="text-center">Carregando Perfil</CardTitle>
  //           <CardDescription className="text-center">
  //             Aguarde enquanto carregamos suas informações...
  //           </CardDescription>
  //         </CardHeader>
  //       </Card>
  //     </div>
  //   );
  // }

  // if (userRole === 'patient' && patientProfileError) {
  //   return (
  //     <div className="py-8">
  //       <Alert className="max-w-lg mx-auto border-destructive text-destructive dark:text-destructive-foreground dark:border-destructive [&>svg]:text-destructive dark:[&>svg]:text-destructive-foreground">
  //         <AlertCircle className="h-4 w-4" />
  //         <AlertTitle>Erro ao Carregar Perfil</AlertTitle>
  //         <AlertDescription>{patientProfileError}</AlertDescription>
  //       </Alert>
  //     </div>
  //   );
  // }
  
  // Future patient support (commented out for now) - only allow doctor role
  if (userRole && userRole !== 'doctor') {
    return (
      <div className="text-center py-8">
        <Alert className="max-w-md mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Acesso Restrito</AlertTitle>
            <AlertDescription>
                Esta página é restrita para profissionais de saúde. 
                <Link href="/choose-role" className="font-semibold text-primary hover:underline ml-1">Selecione seu perfil</Link>.
            </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!userRole && !isLoadingUser) {
    return (
      <div className="text-center py-8">
        <Card className="max-w-lg mx-auto">
          <CardHeader>
            <CardTitle>Complete seu Cadastro</CardTitle>
            <CardContent className="pt-4">
              <p className="text-muted-foreground mb-4">
                Para acessar o painel, por favor, complete seu cadastro selecionando sua função.
              </p>
              <Link href="/choose-role">
                <Button>Selecionar Função</Button>
              </Link>
            </CardContent>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // const panelVariants = {
  //   hidden: { opacity: 0, y: 20 },
  //   visible: { opacity: 1, y: 0 }
  // };
  
  // const staggerContainerVariants = {
  //   hidden: {},
  //   visible: {}
  // };
  
  return (
    // <motion.div 
    //   className="space-y-6 lg:space-y-8"
    //   variants={staggerContainerVariants}
    //   initial="hidden"
    //   animate="visible"
    //   transition={{ staggerChildren: 0.1 }}
    // >
    <div className="space-y-6 lg:space-y-8">
      {userRole === 'doctor' && (
        <>
          {/* Doctor specific layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* <motion.div className="lg:col-span-2" variants={panelVariants}><DashboardStats /></motion.div> */}
            {/* {patientProfile && <motion.div className="lg:col-span-2" variants={panelVariants}><PatientOverview patient={patientProfile} /></motion.div>} */}
            {patientProfile && <div className="lg:col-span-2"><PatientOverview patient={patientProfile} /></div>}
            {/* <motion.div variants={panelVariants}><DoctorAlertsPanel /></motion.div> */}
            <div><DoctorAlertsPanel /></div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {/* <motion.div className="lg:col-span-2" variants={panelVariants}><DoctorPatientList /></motion.div> */}
            <div className="lg:col-span-2"><DoctorPatientList /></div>
            {/* <motion.div variants={panelVariants}><DoctorRecentConversations /></motion.div> */}
            <div><DoctorRecentConversations /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {/* <motion.div variants={panelVariants}><QuickActionsPanel role="doctor" /></motion.div> */}
              <div><QuickActionsPanel role="doctor" /></div>
              {/* <motion.div variants={panelVariants}><RiskOverviewPanel role="doctor" /></motion.div>  */}
              <div><RiskOverviewPanel role="doctor" /></div> 
              {/* <motion.div variants={panelVariants}><HealthTipsComponent tips={healthTips} isLoading={isLoadingTips} /></motion.div> */}
              <div><HealthTipsComponent tips={healthTips} isLoading={isLoadingTips} /></div>
          </div>
        </>
      )}

      {userRole === 'patient' && patientProfile && (
        <>
          <div className="lg:col-span-2">
            <PatientOverview patient={patientProfile} />
          </div>

          <div>
            <QuickActionsPanel role="patient" />
          </div>
          
          <div className="lg:col-span-3">
            <Card>
              <CardHeader><CardTitle>Meus Alertas Recentes</CardTitle></CardHeader>
              <CardContent>
                <PatientAlertsSummary patientId={String(patientProfile.patient_id)} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-3">
            <Card>
              <CardHeader><CardTitle>Adicionar Meu Exame (PDF)</CardTitle></CardHeader>
              <FileUploadComponent patientId={String(patientProfile.patient_id)} onSuccess={() => { router.refresh(); }} />
            </Card>
          </div>

          <div>
            <HealthDiaryPanel patientId={patientProfile.patient_id} />
          </div>

          <div>
            <PatientLabChart patientId={patientProfile.patient_id} />
          </div>

          <div>
            <Card>
              <CardHeader><CardTitle>Meus Sinais Vitais</CardTitle></CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Acompanhe seus sinais vitais recentes. Para uma visão detalhada, acesse a página de métricas de saúde.</p>
                <Link href={`/dashboard-paciente/health-metrics`} className="inline-block w-full mt-2">
                  <Button variant="outline" className="w-full">
                    Ver Detalhes dos Sinais Vitais
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-1 lg:col-span-1">
            <RiskOverviewPanel role="patient" patientId={patientProfile.patient_id} />
          </div>

          <div className="md:col-span-1 lg:col-span-2">
            <HealthTipsComponent tips={healthTips} isLoading={isLoadingTips} />
          </div>
          
          <div className="lg:col-span-3 mt-6">
            <Card>
              <CardHeader><CardTitle>Assistente Virtual IA</CardTitle></CardHeader>
              <CardContent>
                <AIChat patientId={String(patientProfile.patient_id)} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    {/* </motion.div> */}
    </div>
  );
}