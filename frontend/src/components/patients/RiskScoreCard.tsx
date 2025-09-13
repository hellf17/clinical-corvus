import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { AlertTriangle, TrendingUp, Activity, Heart, Brain, Droplets } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface RiskScore {
  name: string;
  value: number;
  max: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

interface RiskScoreCardProps {
  scores: RiskScore[];
  className?: string;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'low': return 'bg-green-100 text-green-800';
    case 'medium': return 'bg-yellow-100 text-yellow-800';
    case 'high': return 'bg-orange-100 text-orange-800';
    case 'critical': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getScoreIcon = (name: string) => {
  switch (name.toLowerCase()) {
    case 'meld': return <Heart className="h-4 w-4" />;
    case 'child-pugh': return <Brain className="h-4 w-4" />;
    case 'ckd-epi': return <Droplets className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
};

const getScorePercentage = (value: number, max: number) => {
  return Math.min((value / max) * 100, 100);
};

export default function RiskScoreCard({ scores, className }: RiskScoreCardProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Pontos de Risco Clínico</h2>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Activity className="h-4 w-4" />
          <span>Última atualização: {new Date().toLocaleString('pt-BR')}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {scores.map((score, index) => (
          <Card key={index} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getScoreIcon(score.name)}
                  <CardTitle className="text-lg font-medium">
                    {score.name}
                  </CardTitle>
                </div>
                <Badge className={getSeverityColor(score.severity)}>
                  {score.severity === 'low' && 'Baixo'}
                  {score.severity === 'medium' && 'Médio'}
                  {score.severity === 'high' && 'Alto'}
                  {score.severity === 'critical' && 'Crítico'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-3xl font-bold">
                    {score.value}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    / {score.max}
                  </span>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      score.severity === 'low' ? 'bg-green-500' :
                      score.severity === 'medium' ? 'bg-yellow-500' :
                      score.severity === 'high' ? 'bg-orange-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${getScorePercentage(score.value, score.max)}%` }}
                  />
                </div>

                {score.trend && (
                  <div className="flex items-center space-x-2 text-sm">
                    <TrendingUp className={`h-4 w-4 ${
                      score.trend === 'up' ? 'text-red-500' :
                      score.trend === 'down' ? 'text-green-500' : 'text-gray-500'
                    }`} />
                    <span className={score.trend === 'up' ? 'text-red-500' : score.trend === 'down' ? 'text-green-500' : 'text-gray-500'}>
                      {score.trend === 'up' ? '↑' : score.trend === 'down' ? '↓' : '→'} 
                      {score.trendValue}%
                    </span>
                  </div>
                )}

                <p className="text-sm text-muted-foreground">
                  {score.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Critical Alerts */}
      {scores.some(score => score.severity === 'critical') && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">Alerta Crítico</h3>
                <p className="text-sm text-red-700">
                  Paciente apresenta risco crítico. Reavaliação clínica imediata necessária.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}