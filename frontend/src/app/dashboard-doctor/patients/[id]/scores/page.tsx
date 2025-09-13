'use client';

import React, { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import RiskScoreCard from '@/components/patients/RiskScoreCard';
import ScoreParameterBreakdown from '@/components/patients/ScoreParameterBreakdown';
import ScoreTrendChart from '@/components/patients/ScoreTrendChart';
import AlertSystem from '@/components/patients/AlertSystem';
import ClinicalDecisionSupport from '@/components/patients/ClinicalDecisionSupport';
import { EnhancedSeverityScoresChart } from '@/components/charts/EnhancedSeverityScoresChart';

// Mock data for demonstration - replace with actual API responses
const mockMELDScores = [
  { date: '2025-08-20', score: 18, maxScore: 40, severity: 'high' as const },
  { date: '2025-08-21', score: 20, maxScore: 40, severity: 'high' as const },
  { date: '2025-08-22', score: 22, maxScore: 40, severity: 'high' as const },
  { date: '2025-08-23', score: 19, maxScore: 40, severity: 'high' as const },
];

const mockChildPughScores = [
  { date: '2025-08-20', score: 8, maxScore: 15, severity: 'medium' as const },
  { date: '2025-08-21', score: 9, maxScore: 15, severity: 'medium' as const },
  { date: '2025-08-22', score: 8, maxScore: 15, severity: 'medium' as const },
  { date: '2025-08-23', score: 7, maxScore: 15, severity: 'medium' as const },
];

const mockCKDEPIScores = [
  { date: '2025-08-20', score: 35, maxScore: 100, severity: 'high' as const },
  { date: '2025-08-21', score: 33, maxScore: 100, severity: 'high' as const },
  { date: '2025-08-22', score: 32, maxScore: 100, severity: 'high' as const },
  { date: '2025-08-23', score: 30, maxScore: 100, severity: 'high' as const },
];

interface RiskScoresResponse {
  scores: Array<{
    name: string;
    value: number;
    max: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: number;
  }>;
}

interface ScoreDetailsResponse {
  meld: {
    totalScore: number;
    parameters: Array<{
      name: string;
      value: number | string;
      normalRange?: [number, number];
      unit?: string;
      status: 'normal' | 'abnormal' | 'critical';
      contribution: number;
    }>;
  };
  childPugh: {
    totalScore: number;
    parameters: Array<{
      name: string;
      value: number | string;
      normalRange?: [number, number];
      unit?: string;
      status: 'normal' | 'abnormal' | 'critical';
      contribution: number;
    }>;
  };
  ckdEpi: {
    totalScore: number;
    parameters: Array<{
      name: string;
      value: number | string;
      normalRange?: [number, number];
      unit?: string;
      status: 'normal' | 'abnormal' | 'critical';
      contribution: number;
    }>;
  };
}

interface ClinicalScore {
  score_type: string;
  value: number;
  timestamp: string;
}

const fetcher = async ([url, token]: [string, string | null]) => {
  if (!token) {
    throw new Error('Authentication token is not available.');
  }
  
  const response = await fetch(url, {
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    cache: 'no-store'
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  
  return response.json();
};

export default function PatientScoresPage() {
  const params = useParams();
  const id = params.id as string;
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);

  // Fetch risk scores
  const { 
    data: scoresData, 
    error: scoresError, 
    isLoading: scoresLoading 
  } = useSWR<RiskScoresResponse>(
    token ? [`/api/patients/${id}/scores`, token] : null, 
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch score details
  const { 
    data: detailsData, 
    error: detailsError, 
    isLoading: detailsLoading 
  } = useSWR<ScoreDetailsResponse>(
    token ? [`/api/patients/${id}/score-details`, token] : null, 
    fetcher,
    { revalidateOnFocus: false }
  );
  
  // Fetch clinical scores for enhanced chart
  const { 
    data: clinicalScoresData, 
    error: clinicalScoresError, 
    isLoading: clinicalScoresLoading 
  } = useSWR<ClinicalScore[]>(
    token ? [`/api/patients/${id}/clinical-scores`, token] : null, 
    fetcher,
    { revalidateOnFocus: false }
  );

  const isLoading = scoresLoading || detailsLoading || clinicalScoresLoading;
  const error = scoresError || detailsError || clinicalScoresError;

  // Mock data for demonstration
  const mockScores: RiskScoresResponse['scores'] = [
    {
      name: 'MELD',
      value: 19,
      max: 40,
      severity: 'high',
      description: 'Model for End-Stage Liver Disease',
      trend: 'down',
      trendValue: -5
    },
    {
      name: 'Child-Pugh',
      value: 7,
      max: 15,
      severity: 'medium',
      description: 'Classificação de gravidade de doença hepática',
      trend: 'stable',
      trendValue: 0
    },
    {
      name: 'CKD-EPI',
      value: 30,
      max: 100,
      severity: 'high',
      description: 'Estimativa de taxa de filtração glomerular',
      trend: 'down',
      trendValue: -3
    }
  ];

  const mockDetails: ScoreDetailsResponse = {
    meld: {
      totalScore: 19,
      parameters: [
        { name: 'Bilirrubina', value: 3.2, normalRange: [0.2, 1.2], unit: 'mg/dL', status: 'abnormal', contribution: 30 },
        { name: 'INR', value: 1.8, normalRange: [0.8, 1.2], unit: '', status: 'abnormal', contribution: 25 },
        { name: 'Creatinina', value: 1.5, normalRange: [0.6, 1.2], unit: 'mg/dL', status: 'abnormal', contribution: 20 },
        { name: 'Sódio', value: 135, normalRange: [135, 145], unit: 'mEq/L', status: 'normal', contribution: 15 },
        { name: 'Causa principal', value: 'Alcoólica', unit: '', status: 'normal', contribution: 10 }
      ]
    },
    childPugh: {
      totalScore: 7,
      parameters: [
        { name: 'Bilirrubina', value: 3.2, normalRange: [0.2, 1.2], unit: 'mg/dL', status: 'abnormal', contribution: 25 },
        { name: 'Albumina', value: 2.8, normalRange: [3.5, 5.0], unit: 'g/dL', status: 'abnormal', contribution: 20 },
        { name: 'INR', value: 1.8, normalRange: [0.8, 1.2], unit: '', status: 'abnormal', contribution: 20 },
        { name: 'Ascite', value: 'Moderada', unit: '', status: 'abnormal', contribution: 20 },
        { name: 'Encefalopatia', value: 'Grau 1', unit: '', status: 'normal', contribution: 15 }
      ]
    },
    ckdEpi: {
      totalScore: 30,
      parameters: [
        { name: 'Creatinina', value: 1.5, normalRange: [0.6, 1.2], unit: 'mg/dL', status: 'abnormal', contribution: 40 },
        { name: 'Idade', value: 65, normalRange: [18, 70], unit: 'anos', status: 'normal', contribution: 20 },
        { name: 'Gênero', value: 'Masculino', unit: '', status: 'normal', contribution: 15 },
        { name: 'Raça', value: 'Branca', unit: '', status: 'normal', contribution: 15 },
        { name: 'Fator de correção', value: 0.942, unit: '', status: 'normal', contribution: 10 }
      ]
    }
  };

  const scores = scoresData?.scores || mockScores;
  const details = detailsData || mockDetails;
  const clinicalScores = clinicalScoresData || [];

  if (error) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-red-600">Erro ao carregar pontuações de risco</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 md:px-6 py-8">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="trends">Evoluções</TabsTrigger>
          <TabsTrigger value="enhanced">Gráficos Avançados</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="support">Suporte Clínico</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <RiskScoreCard scores={scores} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScoreParameterBreakdown
              scoreName="MELD"
              parameters={details.meld.parameters}
              totalScore={details.meld.totalScore}
              maxScore={40}
            />
            <ScoreParameterBreakdown
              scoreName="Child-Pugh"
              parameters={details.childPugh.parameters}
              totalScore={details.childPugh.totalScore}
              maxScore={15}
            />
          </div>

          <ScoreParameterBreakdown
            scoreName="CKD-EPI"
            parameters={details.ckdEpi.parameters}
            totalScore={details.ckdEpi.totalScore}
            maxScore={100}
          />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ScoreTrendChart
              scoreName="MELD"
              data={mockMELDScores}
            />
            <ScoreTrendChart
              scoreName="Child-Pugh"
              data={mockChildPughScores}
            />
            <ScoreTrendChart
              scoreName="CKD-EPI"
              data={mockCKDEPIScores}
            />
          </div>
        </TabsContent>

        {/* Enhanced Charts Tab */}
        <TabsContent value="enhanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Escores de Gravidade</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedSeverityScoresChart 
                clinicalScores={clinicalScores} 
                title="Evolução de Escores de Gravidade"
                loading={clinicalScoresLoading}
              />
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Interpretação Clínica dos Escores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">MELD (Model for End-Stage Liver Disease)</h3>
                    <p className="text-sm text-muted-foreground">
                      O escore MELD é utilizado para avaliar a gravidade da doença hepática e priorizar transplantes.
                      Um escore mais alto indica maior risco de morte a curto prazo.
                    </p>
                    <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                      <li>Pontuação 6-19: Risco moderado</li>
                      <li>Pontuação 20-39: Risco alto</li>
                      <li>Pontuação ≥40: Risco muito alto</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Child-Pugh</h3>
                    <p className="text-sm text-muted-foreground">
                      Classificação da gravidade da doença hepática baseada em cinco parâmetros clínicos e laboratoriais.
                    </p>
                    <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                      <li>Classe A (5-6 pontos): Compensada</li>
                      <li>Classe B (7-9 pontos): Subcompensada</li>
                      <li>Classe C (10-15 pontos): Descompensada</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold text-lg mb-2">CKD-EPI</h3>
                    <p className="text-sm text-muted-foreground">
                      Estimativa da taxa de filtração glomerular (TFG) para avaliar a função renal.
                    </p>
                    <ul className="mt-2 text-sm list-disc list-inside space-y-1">
                      <li>Estágio 1 (≥90 mL/min): Dano renal com função normal</li>
                      <li>Estágio 2 (60-89 mL/min): Dano renal com função diminuída</li>
                      <li>Estágio 3a (45-59 mL/min): Doença renal moderada</li>
                      <li>Estágio 3b (30-44 mL/min): Doença renal moderada a grave</li>
                      <li>Estágio 4 (15-29 mL/min): Doença renal grave</li>
                      <li>Estágio 5 (&lt;15 mL/min): Insuficiência renal</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recomendações Baseadas nos Escores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-semibold text-blue-800">Para MELD ≥15</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Considerar encaminhamento para avaliação de transplante hepático.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h4 className="font-semibold text-yellow-800">Para Child-Pugh Classe B/C</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Monitoramento intensivo necessário. Considerar internação se houver descompensação.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h4 className="font-semibold text-purple-800">Para CKD-EPI Estágio 4/5</h4>
                    <p className="text-sm text-purple-700 mt-1">
                      Encaminhar para nefrologista. Preparar para terapia de substituição renal.
                    </p>
                  </div>
                  
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h4 className="font-semibold text-green-800">Monitoramento</h4>
                    <p className="text-sm text-green-700 mt-1">
                      Avaliar evolução dos escores mensalmente. Ajustar tratamento conforme necessário.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <AlertSystem patientId={id} />
        </TabsContent>

        {/* Clinical Support Tab */}
        <TabsContent value="support">
          <ClinicalDecisionSupport patientId={id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}