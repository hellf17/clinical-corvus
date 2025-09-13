import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface ScoreParameterBreakdownProps {
  scoreName: string;
  parameters: any[];
  totalScore: number;
  maxScore: number;
  className?: string;
}

export default function ScoreParameterBreakdown({ 
  scoreName, 
  parameters, 
  totalScore, 
  maxScore, 
  className 
}: ScoreParameterBreakdownProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Detalhamento do {scoreName}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{totalScore}/{maxScore}</p>
      </CardContent>
    </Card>
  );
}