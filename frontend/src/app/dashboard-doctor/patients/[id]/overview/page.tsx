'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import Link from 'next/link';
import { EnhancedPatientDataChart } from '@/components/charts/EnhancedPatientDataChart';
import { EnhancedSeverityScoresChart } from '@/components/charts/EnhancedSeverityScoresChart';
import { EnhancedResultsTimelineChart } from '@/components/charts/EnhancedResultsTimelineChart';
import { EnhancedConsolidatedTimelineChart } from '@/components/charts/EnhancedConsolidatedTimelineChart';
import { EnhancedMultiParameterComparisonChart } from '@/components/charts/EnhancedMultiParameterComparisonChart';
import { EnhancedCorrelationMatrixChart } from '@/components/charts/EnhancedCorrelationMatrixChart';
import { EnhancedScatterPlotChart } from '@/components/charts/EnhancedScatterPlotChart';
import { listGroupPatients } from '@/services/groupService';
import { GroupPatient } from '@/types/group';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Users, Edit, AlertTriangle, Stethoscope, BookOpen, ExternalLink, CheckCircle } from 'lucide-react';
import { Patient as StorePatient } from '@/store/patientStore';

// Fetcher function for SWR
const fetcher = async ([url, token]: [string, string | null]) => {
  if (!token) {
    throw new Error('Authentication token is not available.');
  }
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${token}` },
    cache: 'no-store'
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }
  
  return res.json();
};

interface PatientSummary {
  patient_id: number;
  name: string;
  age: number;
  gender: string;
  status: string;
  primary_diagnosis?: string;
  risk_score: string;
  last_updated: string;
 summary: string;
}

interface Patient {
  patient_id: number;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  status: string;
  primary_diagnosis?: string;
  risk_score?: string;
  birthDate?: string;
  created_at: string;
  updated_at: string;
  vitalSigns: any[];
  lab_results: any[];
  exams: any[];
  medications: any[];
  clinicalNotes: any[];
}

interface ClinicalScore {
  score_type: string;
  value: number;
  timestamp: string;
}

// Helper function to convert API patient to store patient
const convertToStorePatient = (apiPatient: Patient): StorePatient => {
  return {
    patient_id: apiPatient.patient_id,
    name: apiPatient.name,
    email: undefined,
    birthDate: apiPatient.birthDate || '',
    gender: apiPatient.gender,
    phone: undefined,
    address: undefined,
    city: undefined,
    state: undefined,
    zipCode: undefined,
    documentNumber: undefined,
    patientNumber: undefined,
    insuranceProvider: undefined,
    insuranceNumber: undefined,
    emergencyContact: undefined,
    createdAt: apiPatient.created_at,
    updatedAt: apiPatient.updated_at,
    medicalRecord: undefined,
    hospital: undefined,
    admissionDate: undefined,
    anamnesis: undefined,
    physicalExamFindings: undefined,
    diagnosticHypotheses: undefined,
    primary_diagnosis: apiPatient.primary_diagnosis,
    exams: apiPatient.exams || [],
    vitalSigns: apiPatient.vitalSigns || [],
    age: apiPatient.age,
    lab_results: apiPatient.lab_results || [],
    user_id: null
  };
};

export default function PatientOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  
  const { getToken } = require('@clerk/nextjs').useAuth();
  const [token, setToken] = React.useState<string | null>(null);
  const [groups, setGroups] = useState<GroupPatient[]>([]);

  React.useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);

  // Fetch patient demographics
  const {
    data: patient,
    error: patientError,
    isLoading: patientLoading
  } = useSWR<Patient>(
    token ? [`/api/patients/${id}`, token] : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  // Fetch patient summary
  const {
    data: summary,
    error: summaryError,
    isLoading: summaryLoading
  } = useSWR<PatientSummary>(
    token ? [`/api/clinical/patient-summary/${id}`, token] : null,
    fetcher,
    { revalidateOnFocus: true }
  );
  
  // Fetch clinical scores
  const {
    data: scoresData,
    error: scoresError,
    isLoading: scoresLoading
  } = useSWR<ClinicalScore[]>(
    token ? [`/api/patients/${id}/scores`, token] : null,
    fetcher,
    { revalidateOnFocus: true }
  );

  // Fetch groups for this patient
  useEffect(() => {
    const fetchPatientGroups = async () => {
      try {
        // Fetch all groups and check which ones this patient belongs to
        // This is a simplified approach - in a production environment,
        // you would want a more efficient backend endpoint
        if (!token) return;
        
        // First, get all groups the current user belongs to
        const groupsResponse = await fetch('/api/groups', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!groupsResponse.ok) {
          throw new Error('Failed to fetch groups');
        }
        
        const groupsData = await groupsResponse.json();
        const userGroups = groupsData.items || [];
        
        // For each group, check if this patient is assigned to it
        const patientGroups: GroupPatient[] = [];
        for (const group of userGroups) {
          try {
            const patientsResponse = await fetch(`/api/groups/${group.id}/patients`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (patientsResponse.ok) {
              const patientsData = await patientsResponse.json();
              const patientInGroup = patientsData.items?.find((p: GroupPatient) => p.patient_id === parseInt(id));
              if (patientInGroup) {
                patientGroups.push(patientInGroup);
              }
            }
          } catch (err) {
            console.warn(`Failed to check group ${group.id} for patient assignment`, err);
          }
        }
        
        setGroups(patientGroups);
      } catch (error) {
        console.error('Error fetching patient groups:', error);
      }
    };

    if (patient && token) {
      fetchPatientGroups();
    }
  }, [patient, token, id]);

  // Combined loading state
  const isLoading = patientLoading || summaryLoading || scoresLoading;
  
 // Combined error state
  const error = patientError || summaryError || scoresError;

  // Compact AI insight widgets state
  const [cdLoading, setCdLoading] = useState(false);
  const [cdResult, setCdResult] = useState<any | null>(null);
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchResult, setResearchResult] = useState<any | null>(null);
  const [showCdRaw, setShowCdRaw] = useState(false);
  const [showResearchRaw, setShowResearchRaw] = useState(false);

  const runClinicalInsights = async () => {
    try {
      setCdLoading(true);
      setCdResult(null);
      const res = await fetch('/api/mvp-agents/clinical-discussion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_description: 'Provide quick differential diagnoses, likely red flags, and immediate considerations for this patient.',
          include_patient_context: true,
          patient_id: id,
        }),
      });
      const data = await res.json();
      setCdResult(data);
    } catch (e) {
      console.error('Clinical insights error', e);
    } finally {
      setCdLoading(false);
    }
  };

  const runResearchInsights = async () => {
    try {
      setResearchLoading(true);
      setResearchResult(null);
      const query = patient?.primary_diagnosis
        ? `Up-to-date management guidance (key guidelines, first-line options, monitoring) for ${patient.primary_diagnosis}.`
        : 'Up-to-date management guidance (guidelines, first-line options, monitoring) for the most likely diagnosis considering this patient context.';
      const res = await fetch('/api/mvp-agents/clinical-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          include_patient_context: true,
          patient_id: id,
        }),
      });
      const data = await res.json();
      setResearchResult(data);
    } catch (e) {
      console.error('Research insights error', e);
    } finally {
      setResearchLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">Erro ao carregar dados do paciente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient || !summary) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">Paciente não encontrado.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Convert patient to store patient type for chart components
  const storePatient = convertToStorePatient(patient);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Patient Demographics Section */}
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-start">
          <h1 className="text-xl md:text-2xl font-bold mb-4">Visão Geral do Paciente</h1>
          <div className="flex flex-wrap gap-2">
            {groups.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {groups.slice(0, 3).map((group) => (
                  <Badge key={group.id} variant="secondary" className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Grupo #{group.group_id}
                  </Badge>
                ))}
                {groups.length > 3 && (
                  <Badge variant="secondary">+{groups.length - 3} mais</Badge>
                )}
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/dashboard-doctor/patients/${id}/edit`)}
              className="flex items-center gap-1"
            >
              <Edit className="h-4 w-4" />
              Editar
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Nome</h3>
            <p className="text-lg font-semibold">{patient.name}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Idade</h3>
            <p className="text-lg font-semibold">{patient.age} anos</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Gênero</h3>
            <p className="text-lg font-semibold">{patient.gender}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
            <p className={`text-lg font-semibold ${
              patient.status === 'ativo' ? 'text-green-600' : 
              patient.status === 'inativo' ? 'text-red-600' : 
              'text-yellow-600'
            }`}>
              {patient.status}
            </p>
          </div>
        </div>
      </div>

      {/* Quick CTA to Chat */}
      <div className="flex justify-end">
        <Link href={`/dashboard-doctor/patients/${id}/chat`} className="inline-block">
          <Button variant="outline">Perguntar ao Dr. Corvus sobre este paciente</Button>
        </Link>
      </div>

      {/* Compact AI Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Clinical Insights</CardTitle>
            <CardDescription>Gerar diferenciais, red flags e próximos passos.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Button size="sm" onClick={runClinicalInsights} disabled={cdLoading}>
                {cdLoading ? 'Gerando…' : 'Gerar Insights'}
              </Button>
              {cdResult && (
                <Button size="sm" variant="outline" onClick={() => setShowCdRaw(v => !v)}>
                  {showCdRaw ? 'Ocultar JSON' : 'Ver JSON'}
                </Button>
              )}
            </div>

            {/* Styled insights */}
            {cdResult && !showCdRaw && (() => {
              const cd: any = (cdResult as any)?.result ?? cdResult;
              const caseSummary: string | undefined = cd?.case_summary?.summary;
              const diffs: any[] = cd?.differential_diagnosis?.top_differentials || [];
              const immediate: string[] = cd?.management_plan?.immediate_actions || [];
              const redFlags: string[] = cd?.assessment?.red_flags_detected || [];
              return (
                <div className="space-y-3 text-sm">
                  {caseSummary && (
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        Resumo do Caso
                      </div>
                      <p className="mt-1 text-muted-foreground">{caseSummary}</p>
                    </div>
                  )}

                  {diffs.length > 0 && (
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <Stethoscope className="h-4 w-4" />
                        Principais Diferenciais
                      </div>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        {diffs.slice(0, 4).map((d, idx) => (
                          <li key={idx}>
                            <span className="font-semibold">{d?.condition || 'Diagnóstico'}</span>
                            {d?.distinguishing_features?.length ? (
                              <span className="text-muted-foreground"> — {d.distinguishing_features.slice(0,2).join('; ')}</span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {immediate.length > 0 && (
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Ações Imediatas (sugestões)
                      </div>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        {immediate.slice(0, 5).map((it, idx) => (
                          <li key={idx}>{it}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {redFlags.length > 0 && (
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        Red Flags Detectados
                      </div>
                      <ul className="mt-1 space-y-1 list-disc list-inside text-amber-800">
                        {redFlags.slice(0, 5).map((rf, idx) => (
                          <li key={idx}>{rf}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}

            {cdResult && showCdRaw && (
              <div className="text-xs p-3 bg-muted rounded border max-h-48 overflow-auto">
                <pre className="whitespace-pre-wrap">{JSON.stringify((cdResult as any)?.result ?? cdResult, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Research Update</CardTitle>
            <CardDescription>Atualização de evidências para conduta atual.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Button size="sm" onClick={runResearchInsights} disabled={researchLoading}>
                {researchLoading ? 'Buscando…' : 'Buscar Atualizações'}
              </Button>
              {researchResult && (
                <Button size="sm" variant="outline" onClick={() => setShowResearchRaw(v => !v)}>
                  {showResearchRaw ? 'Ocultar JSON' : 'Ver JSON'}
                </Button>
              )}
            </div>

            {/* Styled research */}
            {researchResult && !showResearchRaw && (() => {
              const rr: any = (researchResult as any)?.result ?? researchResult;
              const summary: string | undefined = rr?.executive_summary || rr?.detailed_results;
              const findings: any[] = rr?.key_findings_by_theme || [];
              const refs: any[] = rr?.relevant_references || [];
              return (
                <div className="space-y-3 text-sm">
                  {summary && (
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Resumo Executivo
                      </div>
                      <p className="mt-1 text-muted-foreground line-clamp-5">{summary}</p>
                    </div>
                  )}

                  {findings.length > 0 && (
                    <div>
                      <div className="font-medium">Principais Achados</div>
                      <ul className="mt-1 space-y-1 list-disc list-inside">
                        {findings.slice(0, 3).map((f, idx) => (
                          <li key={idx}>
                            <span className="font-semibold">{f?.theme_name || 'Tema'}</span>{' '}
                            <span className="text-muted-foreground">— {(f?.key_findings || []).slice(0,1).join(' ')}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {refs.length > 0 && (
                    <div>
                      <div className="font-medium">Referências</div>
                      <ul className="mt-1 space-y-1 text-xs">
                        {refs.slice(0, 4).map((r, idx) => {
                          const href = r?.url || (r?.doi ? `https://doi.org/${r.doi}` : undefined);
                          const label = `${r?.title || 'Título'} — ${r?.journal || 'Jornal'} ${r?.year || ''}`;
                          return (
                            <li key={idx} className="flex items-start gap-2">
                              <ExternalLink className="h-3.5 w-3.5 mt-0.5 text-muted-foreground" />
                              {href ? (
                                <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                                  {label}
                                </a>
                              ) : (
                                <span>{label}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}

            {researchResult && showResearchRaw && (
              <div className="text-xs p-3 bg-muted rounded border max-h-48 overflow-auto">
                <pre className="whitespace-pre-wrap">{JSON.stringify((researchResult as any)?.result ?? researchResult, null, 2)}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Patient Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo do Paciente</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Diagnóstico Principal</h4>
              <p className="text-sm">{patient.primary_diagnosis || 'Não informado'}</p>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Escore de Risco</h4>
              <p className="text-sm font-semibold">{summary.risk_score}</p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Última Atualização</h4>
            <p className="text-sm">{new Date(summary.last_updated).toLocaleDateString('pt-BR')}</p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Descrição</h4>
            <p className="text-sm leading-relaxed">{summary.summary}</p>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section */}
      <Tabs defaultValue="vitals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="vitals">Sinais Vitais</TabsTrigger>
          <TabsTrigger value="scores">Escore de Gravidade</TabsTrigger>
          <TabsTrigger value="labs">Laboratório</TabsTrigger>
          <TabsTrigger value="medications">Medicações</TabsTrigger>
          <TabsTrigger value="exams">Exames</TabsTrigger>
          <TabsTrigger value="timeline">Linha do Tempo Consolidada</TabsTrigger>
        </TabsList>
        
        <TabsContent value="vitals" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Sinais Vitais e Parâmetros Laboratoriais</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedPatientDataChart 
                vitals={patient.vitalSigns || []} 
                labs={patient.lab_results || []} 
                title="Evolução de Sinais Vitais e Parâmetros Laboratoriais"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="scores" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Escores de Gravidade</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedSeverityScoresChart 
                clinicalScores={scoresData || []} 
                title="Evolução de Escores de Gravidade"
                loading={scoresLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="labs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução Laboratorial</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedResultsTimelineChart 
                results={patient.lab_results || []} 
                title="Evolução Laboratorial"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linha do Tempo de Medicações</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedConsolidatedTimelineChart 
                patient={storePatient}
                medications={patient.medications || []}
                title="Linha do Tempo de Medicações"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Comparação de Exames</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedMultiParameterComparisonChart 
                exams={patient.exams || []} 
                title="Comparação de Exames"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Correlação</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedCorrelationMatrixChart 
                exams={patient.exams || []} 
                title="Matriz de Correlação"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Gráfico de Dispersão</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedScatterPlotChart 
                exams={patient.exams || []} 
                title="Gráfico de Dispersão"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Linha do Tempo Consolidada do Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedConsolidatedTimelineChart 
                patient={storePatient}
                exams={patient.exams || []}
                medications={patient.medications || []}
                clinicalNotes={patient.clinicalNotes || []}
                clinicalScores={scoresData || []}
                title="Linha do Tempo Consolidada do Paciente"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional Patient Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações Demográficas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID do Paciente:</span>
              <span className="font-medium">{patient.patient_id}</span>
            </div>
            {patient.birthDate && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data de Nascimento:</span>
                <span className="font-medium">
                  {new Date(patient.birthDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data de Cadastro:</span>
              <span className="font-medium">
                {new Date(patient.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informações Clínicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status Clínico:</span>
              <span className={`font-medium ${
                patient.status === 'ativo' ? 'text-green-600' : 
                patient.status === 'inativo' ? 'text-red-600' : 
                'text-yellow-600'
              }`}>
                {patient.status}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Diagnóstico:</span>
              <span className="font-medium">
                {patient.primary_diagnosis || 'Aguardando diagnóstico'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Nível de Risco:</span>
              <span className="font-semibold">{summary.risk_score}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
 
