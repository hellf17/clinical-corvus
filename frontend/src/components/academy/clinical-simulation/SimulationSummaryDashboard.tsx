'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { CheckCircle, Lightbulb, BrainCircuit } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PerformanceMetric {
  skill: string;
  score: number;
  fullMark: number;
}

interface FinalFeedback {
  key_strengths: string[];
  areas_for_development: string[];
  metacognitive_insight: string;
  performance_metrics: PerformanceMetric[];
}

interface SimulationSummaryDashboardProps {
  feedback: FinalFeedback;
}

const skillLabels: { [key: string]: string } = {
    SUMMARIZE: 'Summarize',
    NARROW: 'Narrow DDx',
    ANALYZE: 'Analyze DDx',
    PROBE: 'Probe',
    PLAN: 'Plan',
    SELECT: 'Select Topic',
};

export const SimulationSummaryDashboard: React.FC<SimulationSummaryDashboardProps> = ({ feedback }) => {
  if (!feedback) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análise Final Indisponível</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Não foi possível carregar o resumo da sua performance.</p>
        </CardContent>
      </Card>
    );
  }

  const { key_strengths, areas_for_development, metacognitive_insight, performance_metrics } = feedback;

  const chartData = Array.isArray(performance_metrics)
    ? performance_metrics.map(metric => ({
        ...metric,
        skill: skillLabels[metric.skill] || metric.skill,
      }))
    : [];

  const safeKeyStrengths = Array.isArray(key_strengths) ? key_strengths : [];
  const safeAreasForDevelopment = Array.isArray(areas_for_development) ? areas_for_development : [];

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Dashboard de Performance da Simulação</CardTitle>
          <CardDescription className="text-center">Análise do seu raciocínio clínico no modelo SNAPPS.</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center"><BrainCircuit className="mr-2 h-6 w-6 text-blue-500" /> Performance de Habilidades</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" />
                <PolarRadiusAxis angle={30} domain={[0, 5]} />
                <Radar name="Sua Pontuação" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><CheckCircle className="mr-2 h-6 w-6 text-green-500" /> Pontos Fortes</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc list-inside space-y-2">
                        {safeKeyStrengths.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Lightbulb className="mr-2 h-6 w-6 text-yellow-500" /> Áreas para Desenvolvimento</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="list-disc list-inside space-y-2">
                        {safeAreasForDevelopment.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </CardContent>
            </Card>
        </div>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center"><BrainCircuit className="mr-2 h-6 w-6 text-blue-600" /> Insight Metacognitivo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-lg italic">
            {metacognitive_insight ? `"${metacognitive_insight}"` : "Nenhum insight metacognitivo disponível."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
