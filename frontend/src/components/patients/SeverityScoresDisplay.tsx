"use client";

import React from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';

import { CalculatedScoresResponse } from '@/types/health';
import { 
    Card, 
    CardContent, 
    CardHeader, 
    CardTitle, 
    CardDescription 
} from '@/components/ui/Card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/Table";
import { Badge } from '@/components/ui/Badge';

interface SeverityScoresDisplayProps {
  scoresData: CalculatedScoresResponse | null | undefined;
  isLoading: boolean;
  error: Error | null;
  patientId: number | string;
}

// Helper function to format score components
const renderScoreComponents = (components?: Record<string, number>) => {
  if (!components) return <TableCell colSpan={2}>N/A</TableCell>;

  const entries = Object.entries(components).filter(([, points]) => points > 0);
  if (entries.length === 0) {
      return <TableCell colSpan={2}>Nenhum componente com pontuação.</TableCell>;
  }

  return (
    <TableCell colSpan={2}>
        <ul className="list-disc list-inside space-y-1 text-sm">
            {entries.map(([key, value]) => (
                 <li key={key}><span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span> {value} pts</li>
            ))}
        </ul>
    </TableCell>
  );
};

export function SeverityScoresDisplay({ scoresData, isLoading, error, patientId }: SeverityScoresDisplayProps) {

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scores de Gravidade</CardTitle>
          <CardDescription>Calculando scores clínicos...</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Erro ao Calcular Scores</CardTitle>
          <CardDescription className="text-destructive">
            Não foi possível buscar ou calcular os scores para o paciente {patientId}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive-foreground bg-destructive/20 p-3 rounded-md">
            {error.message || "Ocorreu um erro desconhecido."} 
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!scoresData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Scores de Gravidade</CardTitle>
          <CardDescription>Dados de score não disponíveis.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Não foram encontrados dados para calcular os scores.</p>
        </CardContent>
      </Card>
    );
  }

  // Format the calculation timestamp
  const calculationTime = scoresData.calculated_at 
    ? format(parseISO(scoresData.calculated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
    : 'N/A';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scores de Gravidade</CardTitle>
        <CardDescription>
          Calculado em: {calculationTime}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          {/* <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">Score</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Detalhes / Interpretação</TableHead>
            </TableRow>
          </TableHeader> */}
          <TableBody>
            {/* SOFA */}
            <TableRow>
              <TableHead className="font-semibold">SOFA</TableHead>
              {scoresData.sofa ? (
                <>
                  <TableCell className="text-lg font-bold text-center">{scoresData.sofa.score ?? 'N/A'}</TableCell>
                  <TableCell>{scoresData.sofa.interpretation?.join(" ") || 'Interpretação não disponível'}</TableCell>
                </>
              ) : (
                <TableCell colSpan={2} className="text-muted-foreground italic">Não calculado</TableCell>
              )}
            </TableRow>
            {scoresData.sofa?.components && Object.keys(scoresData.sofa.components).length > 0 && (
                 <TableRow className="bg-muted/50">
                    <TableCell className="pl-8 text-sm font-medium text-muted-foreground">Componentes SOFA:</TableCell>
                    {renderScoreComponents(scoresData.sofa.components)}
                </TableRow>
            )}

            {/* qSOFA */}
            <TableRow>
              <TableHead className="font-semibold">qSOFA</TableHead>
              {scoresData.qsofa ? (
                <>
                  <TableCell className="text-lg font-bold text-center">{scoresData.qsofa.score ?? 'N/A'}</TableCell>
                  <TableCell>{scoresData.qsofa.interpretation?.join(" ") || 'Interpretação não disponível'}</TableCell>
                </>
              ) : (
                <TableCell colSpan={2} className="text-muted-foreground italic">Não calculado</TableCell>
              )}
            </TableRow>

             {/* APACHE II */}
            <TableRow>
              <TableHead className="font-semibold">APACHE II</TableHead>
              {scoresData.apache_ii ? (
                <>
                  <TableCell className="text-lg font-bold text-center">{scoresData.apache_ii.score ?? 'N/A'}</TableCell>
                  <TableCell>
                     {scoresData.apache_ii.interpretation?.join(" ") || 'Interpretação não disponível'}
                     {scoresData.apache_ii.estimated_mortality !== undefined && (
                        <Badge variant="outline" className="ml-2">
                            Mortalidade Estimada: {(scoresData.apache_ii.estimated_mortality * 100).toFixed(1)}%
                        </Badge>
                     )}
                  </TableCell>
                </>
              ) : (
                <TableCell colSpan={2} className="text-muted-foreground italic">Não calculado</TableCell>
              )}
            </TableRow>
             {scoresData.apache_ii?.components && Object.keys(scoresData.apache_ii.components).length > 0 && (
                 <TableRow className="bg-muted/50">
                    <TableCell className="pl-8 text-sm font-medium text-muted-foreground">Componentes APACHE II:</TableCell>
                     {renderScoreComponents(scoresData.apache_ii.components)}
                </TableRow>
            )}

            {/* GFR (CKD-EPI) */}
            <TableRow>
              <TableHead className="font-semibold">GFR (CKD-EPI)</TableHead>
              {scoresData.gfr_ckd_epi ? (
                <>
                  <TableCell className="text-lg font-bold text-center">
                    {scoresData.gfr_ckd_epi.tfg_ml_min_173m2 !== null && scoresData.gfr_ckd_epi.tfg_ml_min_173m2 !== undefined
                        ? `${scoresData.gfr_ckd_epi.tfg_ml_min_173m2.toFixed(1)}` 
                        : 'N/A'}
                    <span className="text-xs text-muted-foreground ml-1">mL/min/1.73m²</span>
                  </TableCell>
                  <TableCell>{scoresData.gfr_ckd_epi.classification_kdigo || 'Classificação não disponível'}</TableCell>
                </>
              ) : (
                <TableCell colSpan={2} className="text-muted-foreground italic">Não calculado</TableCell>
              )}
            </TableRow>

            {/* NEWS2 */}
            <TableRow>
              <TableHead className="font-semibold">NEWS2</TableHead>
              {scoresData.news2 ? (
                <>
                  <TableCell className="text-lg font-bold text-center">{scoresData.news2.score ?? 'N/A'}</TableCell>
                  <TableCell>{scoresData.news2.interpretation?.join(" ") || 'Interpretação não disponível'}</TableCell>
                </>
              ) : (
                <TableCell colSpan={2} className="text-muted-foreground italic">Não calculado</TableCell>
              )}
            </TableRow>
            {scoresData.news2?.components && Object.keys(scoresData.news2.components).length > 0 && (
                 <TableRow className="bg-muted/50">
                    <TableCell className="pl-8 text-sm font-medium text-muted-foreground">Componentes NEWS2:</TableCell>
                    {renderScoreComponents(scoresData.news2.components)}
                </TableRow>
            )}

          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
} 