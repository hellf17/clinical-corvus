import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface ScoreDataPoint {
  date: string;
  score: number;
  maxScore: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface ScoreTrendChartProps {
  scoreName: string;
  data: ScoreDataPoint[];
  className?: string;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'low': return '#10b981';
    case 'medium': return '#f59e0b';
    case 'high': return '#f97316';
    case 'critical': return '#ef4444';
    default: return '#6b7280';
  }
};

const getSeverityThresholds = (maxScore: number) => {
  return {
    low: maxScore * 0.3,
    medium: maxScore * 0.6,
    critical: maxScore
  };
};

const getTrendIcon = (data: ScoreDataPoint[]) => {
  if (data.length < 2) return null;
  
  const recent = data[data.length - 1];
  const previous = data[data.length - 2];
  const change = ((recent.score - previous.score) / previous.score) * 100;
  
  if (Math.abs(change) < 1) {
    return { icon: <Minus className="h-4 w-4" />, color: 'text-gray-500', text: 'Estável' };
  } else if (change > 0) {
    return { icon: <TrendingUp className="h-4 w-4" />, color: 'text-red-500', text: `↑${Math.abs(change).toFixed(1)}%` };
  } else {
    return { icon: <TrendingDown className="h-4 w-4" />, color: 'text-green-500', text: `↓${Math.abs(change).toFixed(1)}%` };
  }
};

export default function ScoreTrendChart({ scoreName, data, className }: ScoreTrendChartProps) {
  const thresholds = getSeverityThresholds(data[0]?.maxScore || 40);
  const trend = getTrendIcon(data);

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-semibold">{new Date(label).toLocaleDateString('pt-BR')}</p>
          <p className="text-sm">
            <span className="text-muted-foreground">Pontuação: </span>
            <span className="font-semibold">{data.score}/{data.maxScore}</span>
          </p>
          <p className="text-sm">
            <span className="text-muted-foreground">Risco: </span>
            <Badge 
              className={
                data.severity === 'low' ? 'bg-green-100 text-green-800' :
                data.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                data.severity === 'high' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
              }
            >
              {data.severity === 'low' && 'Baixo'}
              {data.severity === 'medium' && 'Médio'}
              {data.severity === 'high' && 'Alto'}
              {data.severity === 'critical' && 'Crítico'}
            </Badge>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Evolução do {scoreName}</CardTitle>
          {trend && (
            <div className="flex items-center space-x-2">
              {trend.icon}
              <span className={`text-sm font-medium ${trend.color}`}>
                {trend.text}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis}
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                domain={[0, data[0]?.maxScore || 40]}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference lines for severity thresholds */}
              <ReferenceLine 
                y={thresholds.low} 
                stroke="#10b981" 
                strokeDasharray="5 5" 
                strokeWidth={1}
                label={{ value: 'Baixo', position: 'insideTop', fill: '#10b981', fontSize: 10 }}
              />
              <ReferenceLine 
                y={thresholds.medium} 
                stroke="#f59e0b" 
                strokeDasharray="5 5" 
                strokeWidth={1}
                label={{ value: 'Médio', position: 'insideTop', fill: '#f59e0b', fontSize: 10 }}
              />
              <ReferenceLine 
                y={thresholds.critical}
                stroke="#f97316" 
                strokeDasharray="5 5" 
                strokeWidth={1}
                label={{ value: 'Crítico', position: 'insideTop', fill: '#f97316', fontSize: 10 }}
              />
              
              <Line
                type="monotone"
                dataKey="score"
                stroke={getSeverityColor(data[data.length - 1]?.severity || 'low')}
                strokeWidth={3}
                dot={{ 
                  fill: getSeverityColor(data[data.length - 1]?.severity || 'low'),
                  strokeWidth: 2,
                  r: 4
                }}
                activeDot={{ r: 6, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center space-x-6 mt-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-xs text-muted-foreground">Baixo Risco</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <span className="text-xs text-muted-foreground">Médio Risco</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span className="text-xs text-muted-foreground">Alto Risco</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span className="text-xs text-muted-foreground">Crítico</span>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Média</p>
            <p className="text-lg font-semibold">
              {(data.reduce((sum, point) => sum + point.score, 0) / data.length).toFixed(1)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Máximo</p>
            <p className="text-lg font-semibold">
              {Math.max(...data.map(point => point.score))}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Mínimo</p>
            <p className="text-lg font-semibold">
              {Math.min(...data.map(point => point.score))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}