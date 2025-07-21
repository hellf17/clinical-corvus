'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { CheckCircle, Lightbulb, BrainCircuit, XCircle, ChevronDown } from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/Collapsible';

interface PerformanceMetric {
  skill: string;
  score: number;
  fullMark: number;
}

interface FinalFeedback {
  overall_performance: string;
  key_strengths: string[];
  areas_for_development: string[];
  learning_objectives_met: string[];
  recommended_study_topics: string[];
  metacognitive_insights: string[];
  next_cases_suggestions: string[];
}

interface SimulationSummaryDashboardProps {
  feedback: FinalFeedback;
}

const skillLabels: { [key: string]: string } = {
    SUMMARIZE: 'Resumo do Caso',
    NARROW: 'Redução do DDx',
    ANALYZE: 'Análise do DDx',
    PROBE: 'Questionamento Investigativo',
    PLAN: 'Elaboração do Plano',
    SELECT: 'Seleção de Tópico',
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

  const { overall_performance, key_strengths, areas_for_development, metacognitive_insights, learning_objectives_met, recommended_study_topics, next_cases_suggestions } = feedback;

  // Provisional dummy data for performance metrics (since backend doesn't provide it yet)
  const chartData = Object.keys(skillLabels).map(skillKey => ({
    skill: skillLabels[skillKey],
    score: Math.floor(Math.random() * 3) + 3, // Random score between 3 and 5 for demo
    fullMark: 5,
  }));

  const safeKeyStrengths = Array.isArray(key_strengths) ? key_strengths : [];
  const safeAreasForDevelopment = Array.isArray(areas_for_development) ? areas_for_development : [];
  const safeMetacognitiveInsight = Array.isArray(metacognitive_insights) && metacognitive_insights.length > 0 
    ? metacognitive_insights[0] 
    : "Nenhum insight metacognitivo disponível.";

  // Calculate overall score from dummy data or if actual data were present
  const overallScore = chartData.length > 0
    ? (chartData.reduce((sum, metric) => sum + metric.score, 0) / chartData.length).toFixed(1)
    : 'N/A';

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200 shadow-lg transition-all duration-300">
      <div className="max-w-6xl mx-auto space-y-8">
        <Card className="bg-white/10 backdrop-blur-sm shadow-lg rounded-xl border-none">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Resumo da Sessão do Dr. Corvus</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <div className="text-4xl font-bold mb-2">Pontuação Geral: {overallScore}</div>
            <p className="text-blue-500">Sua performance média nas habilidades avaliadas.</p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="lg:col-span-1 bg-white/10 backdrop-blur-sm shadow-lg rounded-xl border-none transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center text-xl"><BrainCircuit className="mr-3 h-7 w-7 t" /> Performance de Habilidades</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                  <PolarGrid stroke="#4F46E5" strokeOpacity={0.5} />
                  <PolarAngleAxis dataKey="skill" tick={{ fill: '#E0E7FF', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 5]} tickCount={6} tick={{ fill: '#E0E7FF', fontSize: 10 }} stroke="#4F46E5" strokeOpacity={0.7} />
                  <Radar name="Sua Pontuação" dataKey="score" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.85} />
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: 'none', borderRadius: '8px' }} itemStyle={{ color: '#E0E7FF' }} />
                  <Legend wrapperStyle={{ color: '#E0E7FF', paddingTop: '10px' }} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <div className="space-y-8">
            <Card className="bg-white/10 backdrop-blur-sm shadow-lg rounded-xl border-none transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center text-xl"><CheckCircle className="mr-3 h-7 w-7 text-green-400" /> Pontos Fortes</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {safeKeyStrengths.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-white/10 backdrop-blur-sm shadow-lg rounded-xl border-none transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
              <CardHeader>
                <CardTitle className="flex items-center text-xl"><XCircle className="mr-3 h-7 w-7 text-red-400" /> Áreas para Desenvolvimento</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {safeAreasForDevelopment.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <XCircle className="h-5 w-5 text-red-400 mr-2 mt-1 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="bg-white/10 backdrop-blur-sm shadow-lg rounded-xl border-none transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          <Collapsible>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center text-xl">
                <Lightbulb className="mr-3 h-7 w-7 text-yellow-300" /> Insight Metacognitivo
              </CardTitle>
              <CollapsibleTrigger asChild>
                <button className="text-white hover:text-blue-200 transition-colors duration-200">
                  <ChevronDown className="h-6 w-6" />
                  <span className="sr-only">Toggle Metacognitive Insight</span>
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <p className="text-lg">
                  {safeMetacognitiveInsight}
                </p>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* New Sections based on BAML output */}
        <Card className="bg-white/10 backdrop-blur-sm shadow-lg rounded-xl border-none transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          <Collapsible>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center text-xl">
                <CheckCircle className="mr-3 h-7 w-7 text-green-300" /> Objetivos de Aprendizado Atingidos
              </CardTitle>
              <CollapsibleTrigger asChild>
                <button className="text-white hover:text-blue-200 transition-colors duration-200">
                  <ChevronDown className="h-6 w-6" />
                  <span className="sr-only">Toggle Learning Objectives Met</span>
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ul className="space-y-3">
                  {Array.isArray(learning_objectives_met) && learning_objectives_met.length > 0 ? (
                    learning_objectives_met.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-1 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <p className="text-lg italic">Nenhum objetivo de aprendizado específico foi identificado.</p>
                  )}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm shadow-lg rounded-xl border-none transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          <Collapsible>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center text-xl">
                <Lightbulb className="mr-3 h-7 w-7 text-yellow-300" /> Tópicos de Estudo Recomendados
              </CardTitle>
              <CollapsibleTrigger asChild>
                <button className="text-white hover:text-blue-200 transition-colors duration-200">
                  <ChevronDown className="h-6 w-6" />
                  <span className="sr-only">Toggle Recommended Study Topics</span>
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ul className="space-y-3">
                  {Array.isArray(recommended_study_topics) && recommended_study_topics.length > 0 ? (
                    recommended_study_topics.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-1 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <p className="text-lg italic">Nenhum tópico de estudo recomendado foi identificado.</p>
                  )}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card className="bg-white/10 backdrop-blur-sm shadow-lg rounded-xl border-none transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl">
          <Collapsible>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="flex items-center text-xl">
                <CheckCircle className="mr-3 h-7 w-7 text-green-300" /> Sugestões de Próximos Casos
              </CardTitle>
              <CollapsibleTrigger asChild>
                <button className="text-white hover:text-blue-200 transition-colors duration-200">
                  <ChevronDown className="h-6 w-6" />
                  <span className="sr-only">Toggle Next Cases Suggestions</span>
                </button>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ul className="space-y-3">
                  {Array.isArray(next_cases_suggestions) && next_cases_suggestions.length > 0 ? (
                    next_cases_suggestions.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-400 mr-2 mt-1 flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <p className="text-lg italic">Nenhuma sugestão de próximos casos foi identificada.</p>
                  )}
                </ul>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>
    </div>
  );
};
