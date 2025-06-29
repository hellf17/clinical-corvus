'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import useSWR from 'swr';

import type { Patient, Exam as PatientExamType } from '@/types/patient';
import type { ClinicalNote } from '@/types/clinical_note';
import type { LabResult, CalculatedScoresResponse, VitalSign } from '@/types/health';
import PatientCard from '@/components/patients/PatientCard';
import RiskScoresDashboard from '@/components/RiskScoresDashboard';
import ExamResultsDashboard from '@/components/ExamResultsDashboard';
import SystemExamsViewer from '@/components/SystemExamsViewer';
import { ConsolidatedTimelineChart } from '@/components/charts/ConsolidatedTimelineChart';
import { PatientDataChart } from '@/components/charts/PatientDataChart';
import AIChat from '@/components/patients/AIChat';
import { SeverityScoresDisplay } from '@/components/patients/SeverityScoresDisplay';
import { Switch } from "@/components/ui/Switch";
import { Label } from "@/components/ui/Label";
import { toast } from "sonner";
import { deletePatientClient as deletePatientService } from '@/services/patientService.client';
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/AlertDialog"
import ResultsTimelineChart from '@/components/charts/ResultsTimelineChart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Skeleton } from "@/components/ui/Skeleton";
import MultiParameterComparisonChart from '@/components/charts/MultiParameterComparisonChart';
import { CorrelationMatrixChart } from '@/components/charts/CorrelationMatrixChart';
import ScatterPlotChart from '@/components/charts/ScatterPlotChart';
import { SeverityScoresChart } from '@/components/charts/SeverityScoresChart';
import FileUploadComponent from '@/components/FileUploadComponent';
import { Separator } from "@/components/ui/Separator";

interface PatientOverviewClientProps {
  patient: Patient | null;
  clinicalNotes: ClinicalNote[];
  vitalSigns: VitalSign[];
  exams: PatientExamType[];
}

interface ScoreResult { score?: number; components?: Record<string, number>; interpretation?: string[]; estimated_mortality?: number; }
interface ClinicalScore { score_type: string; value: number; timestamp: string; }

const fetcher = async ([url, token]: [string, string | null]) => {
    if (!token) {
      throw new Error('Authentication token is not available.');
    }
    const res = await fetch(url, { 
        headers: { 'Authorization': `Bearer ${token}` },
        cache: 'no-store'
    });
    if (!res.ok) {
        let errorMsg = `API error fetching scores: ${res.status} ${res.statusText}`;
        try {
            const errorBody = await res.json();
            errorMsg += ` - ${JSON.stringify(errorBody.detail || errorBody)}`;
        } catch (jsonError) {
            errorMsg += ` - ${await res.text()}`;
        }
        throw new Error(errorMsg);
    }
    return res.json();
};

export default function PatientOverviewClient({ 
    patient, 
    clinicalNotes, 
    vitalSigns, 
    exams 
}: PatientOverviewClientProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [compareMode, setCompareMode] = React.useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);

  const scoresApiUrl = patient?.patient_id ? `/api/patients/${patient.patient_id}/scores` : null;

  const { 
      data: scoresData, 
      error: scoresError, 
      isLoading: scoresLoading 
  } = useSWR<CalculatedScoresResponse>(
      scoresApiUrl && token ? [scoresApiUrl, token] : null, 
      fetcher, 
      { 
          revalidateOnFocus: false,
      }
  );

  const transformedClinicalScores = useMemo(() => {
    if (!scoresData) return [];
    const scores: ClinicalScore[] = [];
    const calculatedAt = scoresData.calculated_at;

    const scoreKeys: (keyof CalculatedScoresResponse)[] = ['sofa', 'qsofa', 'apache_ii', 'news2'];

    scoreKeys.forEach(key => {
      const scoreResult = scoresData[key] as ScoreResult | null | undefined;
      if (scoreResult && typeof scoreResult.score === 'number') {
        scores.push({
          score_type: key.toUpperCase().replace('_', ' '),
          value: scoreResult.score,
          timestamp: calculatedAt,
        });
      }
    });
    return scores;
  }, [scoresData]);

  const patientExams = useMemo(() => {
    return patient?.exams || exams || [];
  }, [patient?.exams, exams]);

  const allLabResults = useMemo(() => {
    if (!patientExams) return [];
    return patientExams.flatMap(exam => exam.lab_results || []);
  }, [patientExams]);

  const patientForChildren = useMemo(() => {
    if (!patient) return null;
    return {
      ...patient, 
      gender: patient.gender || 'other', 
      exams: patientExams,
      vitalSigns: patient.vitalSigns || [] 
    };
  }, [patient, patientExams]);

  const handleDelete = async () => {
    if (!patient) return;
    const currentToken = await getToken();
    if (!currentToken) {
      toast.error("Erro de Autenticação", { description: "Não foi possível obter token." });
      return;
    }

    const toastId = toast.loading(`Excluindo paciente ${patient.name}...`);
    try {
      await deletePatientService(patient.patient_id, currentToken);
      toast.success("Paciente excluído", {
        id: toastId,
        description: `Paciente ${patient.name} foi removido.`, 
      });
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      console.error("Failed to delete patient:", error);
      toast.error("Erro ao excluir", {
        id: toastId,
        description: error instanceof Error ? error.message : "Não foi possível remover o paciente.",
      });
    }
  };

  if (!patient) {
    return (
      <Card>
        <CardHeader><CardTitle>Erro</CardTitle></CardHeader>
        <CardContent><p className="text-destructive">Não foi possível carregar os dados do paciente.</p></CardContent>
      </Card>
    );
  }

  const medications = patient.medications || [];

  return (
    <div className="space-y-6">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="float-right">Excluir Paciente</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o paciente {patient.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {patientForChildren && <PatientCard 
            patient={patientForChildren}
            onDelete={() => {}}
            onSelect={() => {}}
       />}
      
      <Tabs defaultValue="main" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 mb-4">
          <TabsTrigger value="main">Visão Geral</TabsTrigger>
          <TabsTrigger value="analytics">Análises Avançadas</TabsTrigger>
          {/* <TabsTrigger value="labs">Laboratório Detalhado</TabsTrigger> */}
        </TabsList>

        <TabsContent value="main" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Novo Exame (PDF)</CardTitle>
            </CardHeader>
            <FileUploadComponent patientId={String(patient.patient_id)} onSuccess={() => { router.refresh(); /* consider more targeted refresh */ }} />
          </Card>
          <Separator />
          <SeverityScoresDisplay 
            scoresData={scoresData}
            isLoading={scoresLoading}
            error={scoresError}
            patientId={patient.patient_id}
          />
          <PatientDataChart 
            vitals={vitalSigns} 
            labs={allLabResults} 
            title="Evolução de Sinais Vitais e Exames Chave"
          />
          {patientForChildren && <ConsolidatedTimelineChart 
            patient={patientForChildren} 
            clinicalNotes={clinicalNotes} 
            exams={patientExams}
            medications={medications}
            title="Linha do Tempo Consolidada"
          />}
          {/* ResultsTimelineChart is good here for a quick overview of all lab trends */}
          <ResultsTimelineChart 
            results={allLabResults} 
            title="Evolução Laboratorial Geral"
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <Card>
                    <CardHeader><CardTitle>Comparação Multi-Parâmetros</CardTitle></CardHeader>
                    <CardContent><MultiParameterComparisonChart exams={patientExams} /></CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader><CardTitle>Matriz de Correlação</CardTitle></CardHeader>
                    <CardContent><CorrelationMatrixChart exams={patientExams} /></CardContent>
                </Card>
            </div>
            <div>
                <Card>
                    <CardHeader><CardTitle>Dispersão (Scatter Plot)</CardTitle></CardHeader>
                    <CardContent><ScatterPlotChart exams={patientExams} /></CardContent>
                </Card>
            </div>
            <div>
                 <Card>
                    <CardHeader><CardTitle>Escores de Severidade (Gráfico)</CardTitle></CardHeader>
                    <CardContent><SeverityScoresChart clinicalScores={transformedClinicalScores} loading={scoresLoading} /></CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Card>
                    <CardHeader><CardTitle>Resultados Detalhados por Categoria</CardTitle></CardHeader>
                    <CardContent><ExamResultsDashboard patientId={patient.patient_id} /></CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                 <Card>
                    <CardHeader><CardTitle>Exames Agrupados por Sistema Corporal</CardTitle></CardHeader>
                    <CardContent><SystemExamsViewer patientId={patient.patient_id} /></CardContent>
                </Card>
            </div>
          </div>
        </TabsContent>

        {/* <TabsContent value="labs" className="space-y-6">
            <ExamResultsDashboard patientId={patient.patient_id} />
            <SystemExamsViewer patientId={patient.patient_id} />
        </TabsContent> */}
      </Tabs>

      <div className="mt-8">
        <AIChat patientId={String(patient.patient_id)} />
      </div>
    </div>
  );
} 