import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';

interface RiskScoreCardProps {
  title: string;
  value: number;
  interpretation: string;
  trend?: 'up' | 'down' | 'stable';
  lastUpdated: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
}

export function RiskScoreCard({ 
  title, 
  value, 
  interpretation, 
  trend, 
  lastUpdated,
  severity 
}: RiskScoreCardProps) {
  const severityColors = {
    low: 'text-green-600',
    moderate: 'text-yellow-600',
    high: 'text-orange-600',
    critical: 'text-red-600'
  };

  const severityIcons = {
    low: null,
    moderate: null,
    high: <AlertCircle className="h-5 w-5 text-orange-500" />,
    critical: <AlertCircle className="h-5 w-5 text-red-500" />
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">{title}</CardTitle>
          {severityIcons[severity]}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="space-y-1">
            <div className={`text-3xl font-bold ${severityColors[severity]}`}>
              {value}
              {trend === 'up' && (
                <TrendingUp className="inline-block ml-2 text-red-500" size={20} />
              )}
              {trend === 'down' && (
                <TrendingDown className="inline-block ml-2 text-green-500" size={20} />
              )}
            </div>
            <p className="text-sm text-muted-foreground">{interpretation}</p>
          </div>
          <div className="text-xs text-muted-foreground">
            Updated: {new Date(lastUpdated).toLocaleDateString('pt-BR')}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}