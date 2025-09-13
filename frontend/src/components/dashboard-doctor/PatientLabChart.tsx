'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { PatientDataChart } from '@/components/charts/PatientDataChart';
import { getVitalSigns } from '@/services/vitalSignsService';
import { getPatientLabResultsClient } from '@/services/patientService.client';
import { VitalSign, LabResult } from '@/types/health';
import { Spinner } from '@/components/ui/Spinner';

interface PatientLabChartProps {
  patientId: number;
}

const PatientLabChart: React.FC<PatientLabChartProps> = ({ patientId }) => {
  const { getToken } = useAuth();
  const [vitals, setVitals] = useState<VitalSign[]>([]);
  const [labs, setLabs] = useState<LabResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);
    Promise.all([
      getVitalSigns(patientId),
      (async () => {
        try {
          const token = await getToken();
          if (!token) throw new Error('Token não disponível');
          const result = await getPatientLabResultsClient(patientId, { limit: 1000 });
          return result.items || [];
        } catch (err: any) {
          setError(err.message || 'Erro ao buscar exames laboratoriais');
          return [];
        }
      })()
    ]).then(([vitalsData, labsData]) => {
      if (!isMounted) return;
      setVitals(vitalsData);
      setLabs(labsData);
      setIsLoading(false);
    }).catch((err) => {
      if (!isMounted) return;
      setError(err.message || 'Erro ao buscar dados do paciente');
      setIsLoading(false);
    });
    return () => { isMounted = false; };
  }, [patientId, getToken]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Gráfico de Exames Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center"><Spinner /></div>
        ) : error ? (
          <div className="h-48 flex items-center justify-center text-destructive">{error}</div>
        ) : (
          <PatientDataChart vitals={vitals} labs={labs} title="Evolução de Sinais Vitais e Exames" />
        )}
      </CardContent>
    </Card>
  );
};

export default PatientLabChart; 