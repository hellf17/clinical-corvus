"use client";

import React, { useState, useEffect } from "react";
import useSWR from "swr";
import { useParams } from "next/navigation";
import { useAuth } from '@clerk/nextjs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert";
import { AlertTriangle } from 'lucide-react';
import { EnhancedPatientDataChart } from '@/components/charts/EnhancedPatientDataChart';

type Vital = {
  timestamp: string;
  heart_rate: number;
  systolic_bp: number;
  diastolic_bp: number;
  temperature: number;
  spo2: number;
};

// Fetcher with authentication
const fetcher = async ([url, token]: [string, string | null]) => {
  if (!token) {
    throw new Error('Authentication token is not available.');
  }
  
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    cache: 'no-store'
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
  }
  
  return res.json();
};

export default function VitalsPage() {
  const params = useParams();
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const fetchedToken = await getToken();
      setToken(fetchedToken);
    };
    fetchToken();
  }, [getToken]);

  const { data, error, isLoading } = useSWR<Vital[]>(
    token ? [`/api/patients/${params?.id}/vitals`, token] : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-32 w-full mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <Alert className="text-destructive border-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao carregar sinais vitais</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-4">
        <Card>
          <CardHeader>
            <CardTitle>Sinais Vitais</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Nenhum dado de sinais vitais disponível.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latest = data[data.length - 1];
  
  // Transform data for EnhancedPatientDataChart
  const transformedVitals = data.map(vital => ({
    vital_id: Date.parse(vital.timestamp), // Using timestamp as ID
    patient_id: parseInt(params?.id as string),
    timestamp: vital.timestamp,
    heart_rate: vital.heart_rate,
    systolic_bp: vital.systolic_bp,
    diastolic_bp: vital.diastolic_bp,
    temperature: vital.temperature,
    oxygen_saturation: vital.spo2,
  }));

  return (
    <div className="space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Sinais Vitais Recentes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Frequência Cardíaca</p>
            <p className="text-xl font-bold">{latest.heart_rate} bpm</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pressão Arterial</p>
            <p className="text-xl font-bold">
              {latest.systolic_bp}/{latest.diastolic_bp} mmHg
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Temperatura</p>
            <p className="text-xl font-bold">{latest.temperature} °C</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Saturação O₂</p>
            <p className="text-xl font-bold">{latest.spo2}%</p>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Charts Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="detailed">Detalhado</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolução de Sinais Vitais</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedPatientDataChart 
                vitals={transformedVitals as any} 
                labs={[]} 
                title="Evolução de Sinais Vitais"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="detailed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados Detalhados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-border">
                  <thead>
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Data/Hora</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">FC (bpm)</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">PA (mmHg)</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">Temp (°C)</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">SpO₂ (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data.map((vital, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm">
                          {new Date(vital.timestamp).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium">
                          {vital.heart_rate}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium">
                          {vital.systolic_bp}/{vital.diastolic_bp}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium">
                          {vital.temperature}
                        </td>
                        <td className="px-4 py-2 text-sm font-medium">
                          {vital.spo2}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}